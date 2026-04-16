import { supabase } from '../../lib/supabase'
import { VACCINES } from './vaccineData'

const MS_PER_DAY = 86400000
const AGE_THRESHOLD_DAYS = 1 // Basicamente qualquer idade. BCG e HepB são ao nascer.

/**
 * Marca automaticamente como aplicadas as vacinas obrigatórias (PNI) cuja
 * idade recomendada já passou — sem data (`applied_at=null`).
 *
 * Filtra apenas vacinas com `isMandatory=true`, garantindo que o auto-registro
 * siga estritamente o calendário oficial do Ministério da Saúde (PNI). Vacinas
 * opcionais da SBP ficam de fora e o pai decide se quer marcar.
 *
 * Usado quando o pai cadastra um bebê que já tem idade (ex: entra no app com
 * bebê de 6 meses) — evita ter que marcar tudo manualmente.
 *
 * @returns número de vacinas registradas automaticamente (0 se nada foi feito)
 */
export async function autoRegisterPastVaccines(
  babyId: string,
  birthDate: string,
): Promise<number> {
  // Auto-registro é feature premium (vacinas é feature premium)
  const { data: babyRow } = await supabase
    .from('babies')
    .select('is_premium')
    .eq('id', babyId)
    .single()
  if (!babyRow?.is_premium) return 0

  const birthMs = new Date(birthDate).getTime()
  const ageDays = Math.floor((Date.now() - birthMs) / MS_PER_DAY)

  if (ageDays < AGE_THRESHOLD_DAYS) return 0

  const codesToMark = VACCINES
    .filter(v => v.isMandatory && v.recommendedAgeDays <= ageDays)
    .map(v => v.code)

  if (codesToMark.length === 0) return 0

  // Buscar UUIDs no catálogo `vaccines`
  const { data: catalogRows, error: catalogErr } = await supabase
    .from('vaccines')
    .select('id, code')
    .in('code', codesToMark)

  if (catalogErr || !catalogRows || catalogRows.length === 0) return 0

  const { data: userData } = await supabase.auth.getUser()
  const recordedBy = userData?.user?.id ?? null

  const rows = catalogRows.map(r => ({
    baby_id: babyId,
    vaccine_id: r.id,
    applied_at: null,
    status: 'applied',
    auto_registered: true,
    recorded_by: recordedBy,
  }))

  // ignoreDuplicates: evita reescrever em casos raros onde a função roda 2x
  const { error: insertErr } = await supabase
    .from('baby_vaccines')
    .upsert(rows, { onConflict: 'baby_id,vaccine_id', ignoreDuplicates: true })

  if (insertErr) return 0

  return rows.length
}
