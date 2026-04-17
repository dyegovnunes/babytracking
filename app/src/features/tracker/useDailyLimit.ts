import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { useBabyPremium } from '../../hooks/useBabyPremium';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDailyBonusRecords } from '../referral/useReferral';

const DAILY_LIMIT = 5;
const BONUS_PER_AD = 2;

function countToday(logs: { timestamp: number }[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  return logs.filter((l) => l.timestamp >= todayMs).length;
}

/**
 * Limite diário de registros. Regra "premium por bebê": se o bebê ativo é
 * premium, não há limite.
 *
 * Free tem 3 fontes de registros:
 * 1. Limite diário base (DAILY_LIMIT=5)
 * 2. Bônus por rewarded ad (sessão atual, 2 por ad — volta a 0 no próximo dia)
 * 3. Bônus MGM: 30 × número de indicações ativadas (reseta diariamente, o
 *    backend retorna o valor atualizado via get_my_referral_rewards)
 */
export function useDailyLimit() {
  const { logs } = useAppState();
  const { user } = useAuth();
  const isPremium = useBabyPremium();
  const isLoading = false;
  const [bonusRecords, setBonusRecords] = useState(0);
  // Bônus MGM buscado do banco. É derivado (30 × activated_referrals), não
  // saldo consumível — apenas aumenta o limite diário.
  const [referralBonus, setReferralBonus] = useState(0);

  useEffect(() => {
    if (!user || isPremium) {
      setReferralBonus(0);
      return;
    }
    let cancelled = false;
    fetchDailyBonusRecords()
      .then((value) => {
        if (!cancelled) setReferralBonus(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, isPremium]);

  const recordsToday = useMemo(() => countToday(logs), [logs]);

  const pendingAddsRef = useRef(0);
  const lastLogsLenRef = useRef(logs.length);
  if (logs.length !== lastLogsLenRef.current) {
    pendingAddsRef.current = 0;
    lastLogsLenRef.current = logs.length;
  }

  const effectiveLimit = DAILY_LIMIT + bonusRecords + referralBonus;
  const canRecord = isLoading || isPremium || recordsToday < effectiveLimit;

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
    referralBonus,
  };
}
