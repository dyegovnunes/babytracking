import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  initializePurchases,
  checkIsPremium,
  purchaseYayaPlus,
  restorePurchases,
} from '../lib/purchases';
import { useAuth } from './AuthContext';

const TEST_ACCOUNT_EMAIL = 'teste@yayababy.app';

interface PurchaseContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType>({
  isPremium: false,
  isLoading: true,
  purchase: async () => false,
  restore: async () => false,
  refresh: async () => {},
});

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isTestAccount = user?.email?.toLowerCase() === TEST_ACCOUNT_EMAIL;

  const refresh = async () => {
    if (isTestAccount) {
      setIsPremium(true);
      return;
    }
    const status = await checkIsPremium();
    setIsPremium(status);
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Test account always gets premium
    if (isTestAccount) {
      setIsPremium(true);
      setIsLoading(false);
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        if (Capacitor.getPlatform() !== 'web') {
          await initializePurchases(user.id);
        }
        await refresh();
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  const purchase = async (): Promise<boolean> => {
    const success = await purchaseYayaPlus();
    if (success) await refresh();
    return success;
  };

  const restore = async (): Promise<boolean> => {
    const success = await restorePurchases();
    if (success) await refresh();
    return success;
  };

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchase, restore, refresh }}>
      {children}
    </PurchaseContext.Provider>
  );
}

export const usePurchase = () => useContext(PurchaseContext);
