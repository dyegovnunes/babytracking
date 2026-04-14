import { useMemo, useState, useRef, useCallback } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { usePremium } from '../../hooks/usePremium';

const DAILY_LIMIT = 5;
const BONUS_PER_AD = 2;

function countToday(logs: { timestamp: number }[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  return logs.filter((l) => l.timestamp >= todayMs).length;
}

export function useDailyLimit() {
  const { logs } = useAppState();
  const { isPremium, isLoading } = usePremium();
  const [bonusRecords, setBonusRecords] = useState(0);

  const recordsToday = useMemo(() => countToday(logs), [logs]);

  // Track a pending count that increments immediately on each add,
  // before React re-renders with the new logs array.
  const pendingAddsRef = useRef(0);

  // Reset pending count whenever logs actually updates (render caught up)
  const lastLogsLenRef = useRef(logs.length);
  if (logs.length !== lastLogsLenRef.current) {
    pendingAddsRef.current = 0;
    lastLogsLenRef.current = logs.length;
  }

  const effectiveLimit = DAILY_LIMIT + bonusRecords;
  // Allow recording while purchase status is loading to avoid blocking the first click
  const canRecord = isLoading || isPremium || recordsToday < effectiveLimit;

  /**
   * Check at click-time whether the user can still record.
   * This uses the rendered recordsToday PLUS any pending adds
   * that haven't been reflected in state yet.
   * Returns true if recording should proceed.
   */
  const checkAndRecord = useCallback((): boolean => {
    if (isLoading || isPremium) return true;
    const currentCount = countToday(logs) + pendingAddsRef.current;
    if (currentCount >= effectiveLimit) return false;
    pendingAddsRef.current += 1;
    return true;
  }, [logs, isPremium, isLoading, effectiveLimit]);

  const grantBonusRecords = () => {
    setBonusRecords((prev) => prev + BONUS_PER_AD);
  };

  return {
    canRecord,
    checkAndRecord,
    recordsToday,
    dailyLimit: effectiveLimit,
    isPremium,
    grantBonusRecords,
  };
}
