import { useMemo, useState } from 'react';
import { useAppState } from '../contexts/AppContext';
import { usePremium } from './usePremium';

const DAILY_LIMIT = 5;
const BONUS_PER_AD = 5;

export function useDailyLimit() {
  const { logs } = useAppState();
  const { isPremium, isLoading } = usePremium();
  const [bonusRecords, setBonusRecords] = useState(0);

  const recordsToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    return logs.filter((l) => l.timestamp >= todayMs).length;
  }, [logs]);

  const effectiveLimit = DAILY_LIMIT + bonusRecords;
  // Allow recording while purchase status is loading to avoid blocking the first click
  const canRecord = isLoading || isPremium || recordsToday < effectiveLimit;

  const grantBonusRecords = () => {
    setBonusRecords((prev) => prev + BONUS_PER_AD);
  };

  return {
    canRecord,
    recordsToday,
    dailyLimit: effectiveLimit,
    isPremium,
    grantBonusRecords,
  };
}
