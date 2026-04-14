import { useCallback } from 'react'
import { useAppState, useAppDispatch, updateIntervals } from '../../contexts/AppContext'
import { MAX_BATH_HOURS } from './constants'

/**
 * Manages the list of scheduled bath hours stored in `intervals.bath`.
 * Returns the current hours plus helpers to add / remove / rename entries.
 * Each mutator returns a boolean so the caller can show a toast on failure.
 */
export function useBathHours() {
  const { baby, intervals } = useAppState()
  const dispatch = useAppDispatch()
  const bathHours = intervals['bath']?.scheduledHours ?? [18]

  const setBathHours = useCallback(
    async (newHours: number[]): Promise<boolean> => {
      if (!baby || newHours.length === 0) return false
      const sorted = [...newHours].sort((a, b) => a - b)
      const updated = {
        ...intervals,
        bath: {
          ...intervals['bath'],
          mode: 'scheduled' as const,
          scheduledHours: sorted,
        },
      }
      return await updateIntervals(dispatch, baby.id, updated)
    },
    [baby, intervals, dispatch],
  )

  const addBathHour = useCallback(
    async (hour: number): Promise<'ok' | 'duplicate' | 'max' | 'error'> => {
      if (bathHours.includes(hour)) return 'duplicate'
      if (bathHours.length >= MAX_BATH_HOURS) return 'max'
      const ok = await setBathHours([...bathHours, hour])
      return ok ? 'ok' : 'error'
    },
    [bathHours, setBathHours],
  )

  const removeBathHour = useCallback(
    async (hour: number): Promise<boolean> => {
      if (bathHours.length <= 1) return false
      return await setBathHours(bathHours.filter((h) => h !== hour))
    },
    [bathHours, setBathHours],
  )

  const renameBathHour = useCallback(
    async (
      from: number,
      to: number,
    ): Promise<'ok' | 'duplicate' | 'noop' | 'error'> => {
      if (from === to) return 'noop'
      if (bathHours.includes(to)) return 'duplicate'
      const updated = bathHours.map((x) => (x === from ? to : x))
      const ok = await setBathHours(updated)
      return ok ? 'ok' : 'error'
    },
    [bathHours, setBathHours],
  )

  return { bathHours, addBathHour, removeBathHour, renameBathHour }
}
