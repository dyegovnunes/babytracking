import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePremium } from '../../hooks/usePremium'
import { getLocalDateString } from '../../lib/formatters'
import {
  getMedicationDayStatus,
  getHomeAlerts,
  type MedicationHomeAlert,
} from './medicationUtils'
import type {
  CreateMedicationInput,
  Medication,
  MedicationDayStatus,
  MedicationLog,
} from './medicationData'

// -------------------------------------------------------------------------
// Row types (snake_case do Supabase)
// -------------------------------------------------------------------------

interface MedicationRow {
  id: string
  baby_id: string
  name: string
  dosage: string
  frequency_hours: number
  schedule_times: string[]
  duration_type: 'continuous' | 'fixed'
  start_date: string
  end_date: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface MedicationLogRow {
  id: string
  medication_id: string
  baby_id: string
  administered_at: string
  administered_by: string | null
  notes: string | null
  created_at: string
}

function mapMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    babyId: row.baby_id,
    name: row.name,
    dosage: row.dosage,
    frequencyHours: Number(row.frequency_hours),
    // Postgres TIME[] volta como "HH:mm:ss" — normalizamos para "HH:mm"
    scheduleTimes: (row.schedule_times || []).map((t) => t.slice(0, 5)),
    durationType: row.duration_type,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLog(row: MedicationLogRow): MedicationLog {
  return {
    id: row.id,
    medicationId: row.medication_id,
    babyId: row.baby_id,
    administeredAt: row.administered_at,
    administeredBy: row.administered_by,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

// -------------------------------------------------------------------------
// Result types
// -------------------------------------------------------------------------

export interface AddMedicationResult {
  ok: boolean
  error?: 'not_premium_limit' | 'no_baby' | 'db_error' | 'invalid'
  medication?: Medication
}

export interface AdministerResult {
  ok: boolean
  error?: 'no_baby' | 'db_error'
  log?: MedicationLog
}

export interface MutationResult {
  ok: boolean
  error?: 'db_error' | 'no_baby'
}

// -------------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------------

/**
 * Carrega medicamentos ativos + logs do dia e expõe mutations.
 *
 * Auto-encerramento: ao receber a lista, medicamentos `fixed` com
 * `end_date < hoje` são desativados automaticamente (fire-and-forget).
 *
 * Paywall: se `!isPremium` e já existe 1 ativo, `addMedication` retorna
 * `{ ok: false, error: 'not_premium_limit' }`.
 */
export function useMedications(
  babyId: string | undefined,
  membersById: Record<string, string>,
  now: Date = new Date(),
) {
  const [activeMedications, setActiveMedications] = useState<Medication[]>([])
  const [archivedMedications, setArchivedMedications] = useState<Medication[]>(
    [],
  )
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const { isPremium } = usePremium()

  // Reload trigger para forçar refetch após mutations
  const [reloadTick, setReloadTick] = useState(0)
  const reload = useCallback(() => setReloadTick((t) => t + 1), [])

  // -----------------------------------------------------------------------
  // Fetch inicial (+ auto-encerramento)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!babyId) {
      setActiveMedications([])
      setArchivedMedications([])
      setTodayLogs([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    const today = getLocalDateString(new Date())

    async function run() {
      // 1. Medicamentos (todos, ativos ou não — separamos depois)
      const { data: medRows, error: medError } = await supabase
        .from('medications')
        .select(
          'id, baby_id, name, dosage, frequency_hours, schedule_times, duration_type, start_date, end_date, notes, is_active, created_by, created_at, updated_at',
        )
        .eq('baby_id', babyId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (medError || !medRows) {
        setActiveMedications([])
        setArchivedMedications([])
        setTodayLogs([])
        setLoading(false)
        return
      }

      const meds = (medRows as MedicationRow[]).map(mapMedication)

      // 2. Auto-encerramento: fixed com end_date < today → is_active=false
      const toExpire = meds.filter(
        (m) =>
          m.isActive &&
          m.durationType === 'fixed' &&
          m.endDate &&
          m.endDate < today,
      )
      if (toExpire.length > 0) {
        const ids = toExpire.map((m) => m.id)
        // fire-and-forget; se falhar, só fica ativo mesmo
        await supabase
          .from('medications')
          .update({ is_active: false })
          .in('id', ids)
        // Aplicamos localmente também
        for (const id of ids) {
          const idx = meds.findIndex((m) => m.id === id)
          if (idx >= 0) meds[idx] = { ...meds[idx], isActive: false }
        }
      }

      const active = meds.filter((m) => m.isActive)
      const archived = meds.filter((m) => !m.isActive)
      setActiveMedications(active)
      setArchivedMedications(archived)

      // 3. Logs do dia — pega só do dia de hoje (local) para todos os
      //    medicamentos ativos (+ arquivados de hoje), usando janela larga
      //    (00:00 local → 23:59 local) em ISO.
      const now = new Date()
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      )
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      )

      const { data: logRows, error: logError } = await supabase
        .from('medication_logs')
        .select(
          'id, medication_id, baby_id, administered_at, administered_by, notes, created_at',
        )
        .eq('baby_id', babyId)
        .gte('administered_at', startOfDay.toISOString())
        .lte('administered_at', endOfDay.toISOString())
        .order('administered_at', { ascending: true })

      if (cancelled) return
      if (!logError && logRows) {
        setTodayLogs((logRows as MedicationLogRow[]).map(mapLog))
      } else {
        setTodayLogs([])
      }
      setLoading(false)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [babyId, reloadTick])

  // -----------------------------------------------------------------------
  // Day statuses (reavalia quando o `now` do consumer muda)
  // -----------------------------------------------------------------------
  const dayStatuses: MedicationDayStatus[] = useMemo(() => {
    return activeMedications.map((m) =>
      getMedicationDayStatus(m, todayLogs, now, membersById),
    )
  }, [activeMedications, todayLogs, now, membersById])

  const homeAlerts: MedicationHomeAlert[] = useMemo(
    () => getHomeAlerts(dayStatuses),
    [dayStatuses],
  )

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  const addMedication = useCallback(
    async (
      input: CreateMedicationInput,
      userId?: string,
    ): Promise<AddMedicationResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      if (!input.name.trim() || !input.dosage.trim()) {
        return { ok: false, error: 'invalid' }
      }
      if (input.scheduleTimes.length === 0) {
        return { ok: false, error: 'invalid' }
      }
      // Paywall: free = só 1 ativo
      if (!isPremium && activeMedications.length >= 1) {
        return { ok: false, error: 'not_premium_limit' }
      }

      const { data, error } = await supabase
        .from('medications')
        .insert({
          baby_id: babyId,
          name: input.name.trim(),
          dosage: input.dosage.trim(),
          frequency_hours: input.frequencyHours,
          // Postgres aceita "HH:mm" ou "HH:mm:ss" pra TIME[]
          schedule_times: input.scheduleTimes,
          duration_type: input.durationType,
          start_date: input.startDate,
          end_date:
            input.durationType === 'fixed' ? input.endDate ?? null : null,
          notes: input.notes?.trim() || null,
          is_active: true,
          created_by: userId ?? null,
        })
        .select(
          'id, baby_id, name, dosage, frequency_hours, schedule_times, duration_type, start_date, end_date, notes, is_active, created_by, created_at, updated_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }

      const med = mapMedication(data as MedicationRow)
      setActiveMedications((prev) => [...prev, med])
      return { ok: true, medication: med }
    },
    [babyId, isPremium, activeMedications.length],
  )

  const updateMedication = useCallback(
    async (
      medicationId: string,
      input: CreateMedicationInput,
    ): Promise<AddMedicationResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      if (!input.name.trim() || !input.dosage.trim()) {
        return { ok: false, error: 'invalid' }
      }
      if (input.scheduleTimes.length === 0) {
        return { ok: false, error: 'invalid' }
      }

      const { data, error } = await supabase
        .from('medications')
        .update({
          name: input.name.trim(),
          dosage: input.dosage.trim(),
          frequency_hours: input.frequencyHours,
          schedule_times: input.scheduleTimes,
          duration_type: input.durationType,
          start_date: input.startDate,
          end_date:
            input.durationType === 'fixed' ? input.endDate ?? null : null,
          notes: input.notes?.trim() || null,
        })
        .eq('id', medicationId)
        .select(
          'id, baby_id, name, dosage, frequency_hours, schedule_times, duration_type, start_date, end_date, notes, is_active, created_by, created_at, updated_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }

      const med = mapMedication(data as MedicationRow)
      setActiveMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? med : m)),
      )
      setArchivedMedications((prev) =>
        prev.map((m) => (m.id === medicationId ? med : m)),
      )
      return { ok: true, medication: med }
    },
    [babyId],
  )

  const administerDose = useCallback(
    async (
      medicationId: string,
      administeredAt: Date | null,
      userId?: string,
    ): Promise<AdministerResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      const when = administeredAt ?? new Date()
      const { data, error } = await supabase
        .from('medication_logs')
        .insert({
          medication_id: medicationId,
          baby_id: babyId,
          administered_at: when.toISOString(),
          administered_by: userId ?? null,
        })
        .select(
          'id, medication_id, baby_id, administered_at, administered_by, notes, created_at',
        )
        .single()

      if (error || !data) return { ok: false, error: 'db_error' }
      const log = mapLog(data as MedicationLogRow)

      // Só adiciona ao state se foi hoje (senão filtragem do getDayStatus ignora)
      const today = getLocalDateString(new Date())
      if (getLocalDateString(new Date(log.administeredAt)) === today) {
        setTodayLogs((prev) => [...prev, log])
      }
      return { ok: true, log }
    },
    [babyId],
  )

  const deleteLog = useCallback(
    async (logId: string): Promise<MutationResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      const { error } = await supabase
        .from('medication_logs')
        .delete()
        .eq('id', logId)
      if (error) return { ok: false, error: 'db_error' }
      setTodayLogs((prev) => prev.filter((l) => l.id !== logId))
      return { ok: true }
    },
    [babyId],
  )

  const deactivateMedication = useCallback(
    async (medicationId: string): Promise<MutationResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      const { data, error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medicationId)
        .select('id')
      if (error || !data || data.length === 0) {
        return { ok: false, error: 'db_error' }
      }
      setActiveMedications((prev) => {
        const found = prev.find((m) => m.id === medicationId)
        if (!found) return prev
        setArchivedMedications((arch) => [...arch, { ...found, isActive: false }])
        return prev.filter((m) => m.id !== medicationId)
      })
      return { ok: true }
    },
    [babyId],
  )

  const reactivateMedication = useCallback(
    async (medicationId: string): Promise<MutationResult> => {
      if (!babyId) return { ok: false, error: 'no_baby' }
      // Paywall: não deixa passar se free e já há 1 ativo
      if (!isPremium && activeMedications.length >= 1) {
        return { ok: false, error: 'db_error' } // UI deve bloquear antes
      }
      const { data, error } = await supabase
        .from('medications')
        .update({ is_active: true })
        .eq('id', medicationId)
        .select('id')
      if (error || !data || data.length === 0) {
        return { ok: false, error: 'db_error' }
      }
      setArchivedMedications((prev) => {
        const found = prev.find((m) => m.id === medicationId)
        if (!found) return prev
        setActiveMedications((act) => [...act, { ...found, isActive: true }])
        return prev.filter((m) => m.id !== medicationId)
      })
      return { ok: true }
    },
    [babyId, isPremium, activeMedications.length],
  )

  return {
    activeMedications,
    archivedMedications,
    todayLogs,
    dayStatuses,
    homeAlerts,
    loading,
    addMedication,
    updateMedication,
    administerDose,
    deleteLog,
    deactivateMedication,
    reactivateMedication,
    reload,
  }
}
