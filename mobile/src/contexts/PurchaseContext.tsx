import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  checkIsPremium,
  getSubscriptionInfo,
  purchasePackage,
  restorePurchases,
  type PlanType,
  type SubscriptionInfo,
} from '../lib/purchases';
import { useAuth } from './AuthContext';

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
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionPlan, setSubscriptionPlan] = useState<PlanType | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionInfo['status']>('free');

  const isTestAccount = user?.email?.toLowerCase() === TEST_ACCOUNT_EMAIL;

  const refresh = async () => {
    if (isTestAccount) {
      setIsPremium(true);
      setSubscriptionPlan('lifetime');
      setSubscriptionStatus('active');
      return;
    }
    const premium = await checkIsPremium();
    setIsPremium(premium);
    const info = await getSubscriptionInfo();
    setSubscriptionPlan(info.plan);
    setSubscriptionExpiresAt(info.expiresAt);
    setSubscriptionStatus(info.status);
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (isTestAccount) {
      setIsPremium(true);
      setSubscriptionPlan('lifetime');
      setSubscriptionStatus('active');
      setIsLoading(false);
      return;
    }
    const init = async () => {
      setIsLoading(true);
      try {
        await refresh();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [user?.id]);

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
      isPremium, isLoading, subscriptionPlan, subscriptionExpiresAt, subscriptionStatus,
      purchase, restore, refresh,
    }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export const usePurchase = () => useContext(PurchaseContext);
