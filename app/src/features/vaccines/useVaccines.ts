import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import {
  VACCINES,
  getVaccineStatus,
  type BabyVaccine,
  type BabyVaccineStatus,
  type Vaccine,
  type VaccineStatus,
} from './vaccineData'

interface BabyVaccineRow {
  id: string
  baby_id: string
  vaccine_id: string
  applied_at: string | null
  status: BabyVaccineStatus
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
    status: row.status,
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
  error?: 'not_premium' | 'no_baby' | 'not_found' | 'db_error'
}

export function useVaccines(
  babyId: string | undefined,
  birthDate: string | undefined,
) {
  const [records, setRecords] = useState<BabyVaccine[]>([])
  const [loading, setLoading] = useState(true)
  const isPremium = useBabyPremium()

  const ageDays = useMemo(() => {
    if (!birthDate) return 0
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  }, [birthDate])

  useEffect(() => {
    if (!babyId) {
      setRecords([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('baby_vaccines')
      .select(
        'id, baby_id, vaccine_id, applied_at, status, location, batch_number, recorded_by, created_at, vaccines(code)',
      )
      .eq('baby_id', babyId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          setRecords((data as unknown as BabyVaccineRow[]).map(mapRow))
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [babyId])

  const appliedCodes = useMemo(
    () =>
      new Set(
        records.filter((r) => r.status === 'applied').map((r) => r.vaccineCode),
      ),
    [records],
  )

  const skippedCodes = useMemo(
    () =>
      new Set(
        records.filter((r) => r.status === 'skipped').map((r) => r.vaccineCode),
      ),
    [records],
  )

  /** Tabela de status por código, calculada uma vez por ciclo. */
  const statusByCode = useMemo(() => {
    const map = new Map<string, VaccineStatus>()
    for (const v of VACCINES) {
      map.set(
        v.code,
        getVaccineStatus(ageDays, v.recommendedAgeDays, {
          applied: appliedCodes.has(v.code),
          skipped: skippedCodes.has(v.code),
        }),
      )
    }
    return map
  }, [ageDays, appliedCodes, skippedCodes])

  const counts = useMemo(() => {
    let overdue = 0
    let canTake = 0
    let appliedN = 0
    let skippedN = 0
    let future = 0
    for (const status of statusByCode.values()) {
      if (status === 'overdue') overdue++
      else if (status === 'can_take') canTake++
      else if (status === 'applied') appliedN++
      else if (status === 'skipped') skippedN++
      else future++
    }
    return {
      overdue,
      canTake,
      applied: appliedN,
      skipped: skippedN,
      future,
      total: VACCINES.length,
    }
  }, [statusByCode])

  /** Resolve vaccine UUID via tabela de referência (uma query por código). */
  const resolveVaccineId = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from('vaccines')
      .select('id')
      .eq('code', code)
      .single()
    if (error || !data) return null
    return data.id as string
  }, [])

  /** Upsert aplicado: insere novo ou atualiza se existir registro `skipped`. */
  const applyVaccine = useCallback(
    async (
      code: string,
      input: ApplyVaccineInput,
      userId?: string,
    ): Promise<ApplyVaccineResult> => {
      if (!isPremium) return { ok: false, error: 'not_premium' }
      if (!babyId) return { ok: false, error: 'no_baby' }

      const vaccineId = await resolveVaccineId(code)
      if (!vaccineId) return { ok: false, error: 'not_found' }

      const { data, error } = await supabase
        .from('baby_vaccines')
        .upsert(
          {
            baby_id: babyId,
            vaccine_id: vaccineId,
            applied_at: input.date,
            status: 'applied',
            location: input.location?.trim() || null,
            batch_number: input.batchNumber?.trim() || null,
            recorded_by: userId || null,
          },
          { onConflict: 'baby_id,vaccine_id' },
        )
        .select(
          'id, baby_id, vaccine_id, applied_at, status, location, batch_number, recorded_by, created_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }

      const newEntry: BabyVaccine = {
        id: data.id,
        babyId: data.baby_id,
        vaccineId: data.vaccine_id,
        vaccineCode: code,
        appliedAt: data.applied_at,
        status: 'applied',
        location: data.location,
        batchNumber: data.batch_number,
        recordedBy: data.recorded_by,
        createdAt: data.created_at,
      }

      setRecords((prev) => {
        const filtered = prev.filter((r) => r.vaccineCode !== code)
        return [...filtered, newEntry]
      })
      return { ok: true }
    },
    [babyId, isPremium, resolveVaccineId],
  )

  /** Marca uma vacina como "não vou aplicar" (ex: SBP opcional). */
  const skipVaccine = useCallback(
    async (code: string, userId?: string): Promise<ApplyVaccineResult> => {
      if (!isPremium) return { ok: false, error: 'not_premium' }
      if (!babyId) return { ok: false, error: 'no_baby' }

      const vaccineId = await resolveVaccineId(code)
      if (!vaccineId) return { ok: false, error: 'not_found' }

      const { data, error } = await supabase
        .from('baby_vaccines')
        .upsert(
          {
            baby_id: babyId,
            vaccine_id: vaccineId,
            applied_at: null,
            status: 'skipped',
            location: null,
            batch_number: null,
            recorded_by: userId || null,
          },
          { onConflict: 'baby_id,vaccine_id' },
        )
        .select(
          'id, baby_id, vaccine_id, applied_at, status, location, batch_number, recorded_by, created_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }

      const newEntry: BabyVaccine = {
        id: data.id,
        babyId: data.baby_id,
        vaccineId: data.vaccine_id,
        vaccineCode: code,
        appliedAt: data.applied_at,
        status: 'skipped',
        location: null,
        batchNumber: null,
        recordedBy: data.recorded_by,
        createdAt: data.created_at,
      }

      setRecords((prev) => {
        const filtered = prev.filter((r) => r.vaccineCode !== code)
        return [...filtered, newEntry]
      })
      return { ok: true }
    },
    [babyId, isPremium, resolveVaccineId],
  )

  /** Remove qualquer marcação (applied ou skipped) — usuário mudou de ideia. */
  const clearRecord = useCallback(
    async (code: string): Promise<boolean> => {
      if (!babyId) return false
      const existing = records.find((r) => r.vaccineCode === code)
      if (!existing) return true // já não tinha
      const { error } = await supabase
        .from('baby_vaccines')
        .delete()
        .eq('id', existing.id)
      if (error) return false
      setRecords((prev) => prev.filter((r) => r.vaccineCode !== code))
      return true
    },
    [babyId, records],
  )

  const getStatusFor = useCallback(
    (vaccine: Vaccine): VaccineStatus =>
      statusByCode.get(vaccine.code) ?? 'future',
    [statusByCode],
  )

  return {
    allVaccines: VACCINES,
    records,
    appliedCodes,
    skippedCodes,
    statusByCode,
    counts,
    ageDays,
    loading,
    applyVaccine,
    skipVaccine,
    clearRecord,
    getStatusFor,
  }
}
