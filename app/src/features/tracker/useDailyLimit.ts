import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '../../contexts/AppContext';
import { useBabyPremium } from '../../hooks/useBabyPremium';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { consumeActivityCredit } from '../referral/useReferral';

const DAILY_LIMIT = 5;
const BONUS_PER_AD = 2;

function countToday(logs: { timestamp: number }[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  return logs.filter((l) => l.timestamp >= todayMs).length;
}

/**
 * Limite diário de registros. Regra "premium por bebê": se o bebê ativo
 * é premium (qualquer parent paga), não há limite — mesmo que o usuário
 * logado seja um caregiver free.
 *
 * Free tem 3 fontes de registros:
 * 1. Limite diário base (DAILY_LIMIT=5)
 * 2. Bônus por rewarded ad (sessão atual, 2 por ad)
 * 3. activity_credits persistidos (MGM: +30 por indicação ativada)
 */
export function useDailyLimit() {
  const { logs } = useAppState();
  const { user } = useAuth();
  const isPremium = useBabyPremium();
  const isLoading = false;
  const [bonusRecords, setBonusRecords] = useState(0);
  // Saldo persistido de créditos do MGM. Carregado no mount; atualizado
  // otimisticamente a cada consumo (RPC confirma no banco em background).
  const [activityCredits, setActivityCredits] = useState(0);

  // Busca activity_credits do profile — só pra free (premium não usa).
  useEffect(() => {
    if (!user || isPremium) {
      setActivityCredits(0);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('activity_credits')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setActivityCredits(data.activity_credits ?? 0);
        }
      });
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

  const normalLimit = DAILY_LIMIT + bonusRecords;
  // "Efetivo" inclui créditos permanentes do MGM (pra UI mostrar total
  // disponível). Mas consumo só acontece depois do normalLimit.
  const effectiveLimit = normalLimit + activityCredits;
  const withinNormal = recordsToday < normalLimit;
  const canUseCredit = !withinNormal && activityCredits > 0;
  const canRecord = isLoading || isPremium || withinNormal || canUseCredit;

  /**
   * Check at click-time. Ordem:
   *   1. Premium/loading → sempre permite
   *   2. Dentro do limite normal (5 + ad bonus) → permite
   *   3. Tem crédito MGM → consome 1 crédito (otimista + RPC async)
   *   4. Sem saída → bloqueia (UI mostra modal de ad/paywall)
   */
  const checkAndRecord = useCallback((): boolean => {
    if (isLoading || isPremium) return true;
    const currentCount = countToday(logs) + pendingAddsRef.current;
    if (currentCount < normalLimit) {
      pendingAddsRef.current += 1;
      return true;
    }
    if (activityCredits > 0) {
      pendingAddsRef.current += 1;
      // Otimista — decrementa local primeiro
      setActivityCredits((c) => Math.max(0, c - 1));
      // RPC em background; se falhar a UI mostra o saldo real no próximo refresh
      consumeActivityCredit().catch(() => {});
      return true;
    }
    return false;
  }, [logs, isPremium, isLoading, normalLimit, activityCredits]);

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
    activityCredits,
  };
}
