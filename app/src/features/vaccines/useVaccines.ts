import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { usePremium } from '../../hooks/usePremium'
import {
  VACCINES,
  getVaccineStatus,
  type BabyVaccine,
  type Vaccine,
  type VaccineStatus,
} from './vaccineData'

interface BabyVaccineRow {
  id: string
  baby_id: string
  vaccine_id: string
  applied_at: string
  location: string | null
  batch_number: string | null
  recorded_by: string | null
  created_at: string
  vaccines: { code: string } | { code: string }[] | null
}

function mapRow(row: BabyVaccineRow): BabyVaccine {
  const v = row.vaccines
  const code = Array.isArray(v) ? v[0]?.code ?? '' : v?.code ?? ''
  return {
    id: row.id,
    babyId: row.baby_id,
    vaccineId: row.vaccine_id,
    vaccineCode: code,
    appliedAt: row.applied_at,
    location: row.location,
    batchNumber: row.batch_number,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  }
}

export interface ApplyVaccineInput {
  date: string
  location?: string
  batchNumber?: string
}

export interface ApplyVaccineResult {
  ok: boolean
  /** Erro amigável para exibir no UI quando `ok=false`. */
  error?: 'not_premium' | 'no_baby' | 'not_found' | 'db_error'
}

export function useVaccines(
  babyId: string | undefined,
  birthDate: string | undefined,
) {
  const [applied, setApplied] = useState<BabyVaccine[]>([])
  const [loading, setLoading] = useState(true)
  const { isPremium } = usePremium()

  const ageDays = useMemo(() => {
    if (!birthDate) return 0
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  }, [birthDate])

  useEffect(() => {
    if (!babyId) {
      setApplied([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('baby_vaccines')
      .select(
        'id, baby_id, vaccine_id, applied_at, location, batch_number, recorded_by, created_at, vaccines(code)',
      )
      .eq('baby_id', babyId)
      .order('applied_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          setApplied((data as unknown as BabyVaccineRow[]).map(mapRow))
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [babyId])

  const appliedCodes = useMemo(
    () => new Set(applied.map((a) => a.vaccineCode)),
    [applied],
  )

  /**
   * Tabela de status por código, calculada uma vez por ciclo.
   * Usado para contar atrasadas, filtrar, e colorir a lista sem refazer
   * a conta em cada VaccineRow.
   */
  const statusByCode = useMemo(() => {
    const map = new Map<string, VaccineStatus>()
    for (const v of VACCINES) {
      map.set(
        v.code,
        getVaccineStatus(ageDays, v.recommendedAgeDays, appliedCodes.has(v.code)),
      )
    }
    return map
  }, [ageDays, appliedCodes])

  /**
   * Contagens úteis para o subtítulo do botão na ProfilePage.
   */
  const counts = useMemo(() => {
    let overdue = 0
    let canTake = 0
    let appliedN = 0
    let future = 0
    for (const status of statusByCode.values()) {
      if (status === 'overdue') overdue++
      else if (status === 'can_take') canTake++
      else if (status === 'applied') appliedN++
      else future++
    }
    return { overdue, canTake, applied: appliedN, future, total: VACCINES.length }
  }, [statusByCode])

  const applyVaccine = useCallback(
    async (
      code: string,
      input: ApplyVaccineInput,
      userId?: string,
    ): Promise<ApplyVaccineResult> => {
      if (!isPremium) return { ok: false, error: 'not_premium' }
      if (!babyId) return { ok: false, error: 'no_baby' }

      // Resolve vaccine id pelo code (tabela de referência)
      const { data: vData, error: vErr } = await supabase
        .from('vaccines')
        .select('id')
        .eq('code', code)
        .single()

      if (vErr || !vData) return { ok: false, error: 'not_found' }

      const { data, error } = await supabase
        .from('baby_vaccines')
        .insert({
          baby_id: babyId,
          vaccine_id: vData.id,
          applied_at: input.date,
          location: input.location?.trim() || null,
          batch_number: input.batchNumber?.trim() || null,
          recorded_by: userId || null,
        })
        .select(
          'id, baby_id, vaccine_id, applied_at, location, batch_number, recorded_by, created_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }

      const newEntry: BabyVaccine = {
        id: data.id,
        babyId: data.baby_id,
        vaccineId: data.vaccine_id,
        vaccineCode: code,
        appliedAt: data.applied_at,
        location: data.location,
        batchNumber: data.batch_number,
        recordedBy: data.recorded_by,
        createdAt: data.created_at,
      }

      setApplied((prev) =>
        [...prev, newEntry].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt)),
      )
      return { ok: true }
    },
    [babyId, isPremium],
  )

  const deleteApplied = useCallback(async (id: string) => {
    const { error } = await supabase.from('baby_vaccines').delete().eq('id', id)
    if (!error) {
      setApplied((prev) => prev.filter((a) => a.id !== id))
      return true
    }
    return false
  }, [])

  const getStatusFor = useCallback(
    (vaccine: Vaccine): VaccineStatus =>
      statusByCode.get(vaccine.code) ?? 'future',
    [statusByCode],
  )

  return {
    allVaccines: VACCINES,
    applied,
    appliedCodes,
    statusByCode,
    counts,
    ageDays,
    loading,
    applyVaccine,
    deleteApplied,
    getStatusFor,
  }
}
