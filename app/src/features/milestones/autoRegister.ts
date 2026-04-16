import { supabase } from '../../lib/supabase'
import { MILESTONES } from './milestoneData'

const MS_PER_DAY = 86400000
const AGE_THRESHOLD_DAYS = 14   // Só marca auto se bebê tem mais que isso
const BUFFER_DAYS = 10          // Marcos até (idade - 10d) são assumidos como atingidos

/**
 * Marca automaticamente como atingidos os marcos cuja faixa de idade típica
 * já terminou — com uma margem de 10 dias antes da idade atual.
 *
 * Exemplo: bebê com 6m (180 dias). Todos os marcos com `typicalAgeDaysMax < 170`
 * ficam marcados como `auto_registered=true, achieved_at=null`.
 *
 * Usado quando o pai cadastra um bebê que já tem idade (ex: entra no app com
 * bebê de 6 meses). Evita a fricção de marcar tudo manualmente.
 *
 * Só executa se o bebê tem mais de 14 dias (recém-nascidos não precisam).
 *
 * @returns número de marcos registrados automaticamente (0 se nada foi feito)
 */
export async function autoRegisterPastMilestones(
  babyId: string,
  birthDate: string,
): Promise<number> {
  const birthMs = new Date(birthDate).getTime()
  const ageDays = Math.floor((Date.now() - birthMs) / MS_PER_DAY)

  if (ageDays <= AGE_THRESHOLD_DAYS) return 0

  const cutoffDays = ageDays - BUFFER_DAYS
  const codesToMark = MILESTONES
    .filter(m => m.typicalAgeDaysMax < cutoffDays)
    .map(m => m.code)

  if (codesToMark.length === 0) return 0

  // Buscar os IDs dos marcos no catálogo `milestones`
  const { data: catalogRows, error: catalogErr } = await supabase
    .from('milestones')
    .select('id, code')
    .in('code', codesToMark)

  if (catalogErr || !catalogRows || catalogRows.length === 0) return 0

  // Buscar quem o user é (recorded_by) — pode ser null mesmo assim
  const { data: userData } = await supabase.auth.getUser()
  const recordedBy = userData?.user?.id ?? null

  // Montar batch de inserts
  const rows = catalogRows.map(r => ({
    baby_id: babyId,
    milestone_id: r.id,
    achieved_at: null,
    auto_registered: true,
    recorded_by: recordedBy,
  }))

  // Upsert para ignorar duplicatas se por algum motivo a função for chamada 2x
  // (ex: usuário cadastra bebê, deleta, e cria outro igual)
  const { error: insertErr } = await supabase
    .from('baby_milestones')
    .upsert(rows, { onConflict: 'baby_id,milestone_id', ignoreDuplicates: true })

  if (insertErr) return 0

  return rows.length
}
