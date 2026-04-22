import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  checkIsPremium,
  getSubscriptionInfo,
  initializePurchases,
  purchasePackage,
  restorePurchases,
  type PlanType,
  type SubscriptionInfo,
} from '../lib/purchases';
import { useAuth } from './AuthContext';
import { useAppState } from './AppContext';
import { initAdMob } from '../lib/admob';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const TEST_ACCOUNT_EMAIL = 'teste@yayababy.app';

interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscriptionPlan: PlanType | null;
  subscriptionExpiresAt: Date | null;
  subscriptionStatus: SubscriptionInfo['status'];
  purchase: (planType: PlanType) => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: false,
  isLoading: true,
  subscriptionPlan: null,
  subscriptionExpiresAt: null,
  subscriptionStatus: 'free',
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
});

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { baby } = useAppState();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionInfo['status']>('free');

  const isTestAccount = user?.email?.toLowerCase() === TEST_ACCOUNT_EMAIL;
  const lastRefreshRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (isTestAccount) {
      setIsPremium(true);
      setSubscriptionPlan('lifetime');
      setSubscriptionStatus('active');
      return;
    }
    const premium = await checkIsPremium(baby?.id);
    setIsPremium(premium);

    const info = await getSubscriptionInfo();
    setSubscriptionPlan(info.plan);
    setSubscriptionExpiresAt(info.expiresAt);
    setSubscriptionStatus(info.status);
    lastRefreshRef.current = Date.now();
  }, [isTestAccount, baby?.id]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        // SEMPRE inicializa os SDKs nativos (RevenueCat + AdMob) em
        // dispositivo, mesmo na conta de teste. Antes tinha early
        // return que pulava essa parte pra teste@yayababy.app —
        // resultado: SDKs nunca iniciavam, nenhum ad carregava,
        // paywall não tinha offerings. Esse early return era o
        // motivo de "AdMob/IAP não funcionam no iOS" nos testes.
        if (Capacitor.getPlatform() !== 'web') {
          try { await initializePurchases(user.id); } catch (e) { console.error('[RC init] fail', e); }
          try { await initAdMob(); } catch (e) { console.error('[AdMob init] fail', e); }
        }

        // Depois da init, aplica o override de conta de teste se for o caso.
        // Mantém a conveniência de testar features premium sem IAP real,
        // mas os SDKs estão prontos pra exibir paywall/ads pro reviewer.
        if (isTestAccount) {
          setIsPremium(true);
          setSubscriptionPlan('lifetime');
          setSubscriptionStatus('active');
        } else {
          await refresh();
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id, baby?.id]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    if (!user || isTestAccount) return;
    const interval = setInterval(() => {
      refresh().catch(() => {});
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [user?.id, isTestAccount, refresh]);

  // Refresh when app returns to foreground
  useEffect(() => {
    if (!user || isTestAccount || !Capacitor.isNativePlatform()) return;
    let listener: { remove: () => void } | undefined;

    CapApp.addListener('appStateChange', (state: any) => {
      if (state.isActive && Date.now() - lastRefreshRef.current > 60_000) {
        refresh().catch(() => {});
      }
    }).then((l) => { listener = l });

    return () => { listener?.remove() };
  }, [user?.id, isTestAccount, refresh]);

  const purchase = async (planType: PlanType): Promise<boolean> => {
    const success = await purchasePackage(planType);
    if (success) await refresh();
    return success;
  };

  const restore = async (): Promise<boolean> => {
    const success = await restorePurchases();
    if (success) await refresh();
    return success;
  };

  return (
    <PurchaseContext.Provider value={{
      isPremium,
      isLoading,
      subscriptionPlan,
      subscriptionExpiresAt,
      subscriptionStatus,
      purchase,
      restore,
      refresh,
    }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export const usePurchase = () => useContext(PurchaseContext);
