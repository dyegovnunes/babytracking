import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export const ENTITLEMENT_YAYA_PLUS = 'yaya_plus';

export async function initializePurchases(userId: string) {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') return; // RevenueCat não funciona na web

  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey });
  await Purchases.logIn({ appUserID: userId });
}

export async function checkIsPremium(): Promise<boolean> {
  // On web, check Supabase profiles table
  if (Capacitor.getPlatform() === 'web') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      return data?.is_premium === true;
    } catch {
      return false;
    }
  }

  // On native, check RevenueCat first, fallback to Supabase
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    if (customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined) return true;
  } catch {
    // fallback below
  }

  // Fallback: check Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
    return data?.is_premium === true;
  } catch {
    return false;
  }
}

export async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  try {
    const { current } = await Purchases.getOfferings();
    return current?.lifetime ?? null;
  } catch {
    return null;
  }
}

export async function purchaseYayaPlus(): Promise<boolean> {
  try {
    const pkg = await getLifetimePackage();
    if (!pkg) throw new Error('Package not found');

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch (error: any) {
    if (error?.code === 'PURCHASE_CANCELLED') return false;
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch {
    return false;
  }
}
