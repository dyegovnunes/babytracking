import Purchases, { PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const ENTITLEMENT_YAYA_PLUS = 'yaya_plus';

export type PlanType = 'monthly' | 'annual' | 'lifetime';

export interface SubscriptionInfo {
  isPremium: boolean;
  plan: PlanType | null;
  expiresAt: Date | null;
  status: 'free' | 'active' | 'cancelled' | 'expired' | 'grace_period';
}

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export async function initializePurchases(userId: string) {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) return;
  await Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
}

export async function checkIsPremium(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined) return true;
  } catch {
    // fallback below
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
    return data?.is_premium === true;
  } catch {
    return false;
  }
}

export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isPremium: false, plan: null, expiresAt: null, status: 'free' };
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, subscription_status, subscription_plan, subscription_expires_at')
      .eq('id', user.id)
      .single();
    if (!data) return { isPremium: false, plan: null, expiresAt: null, status: 'free' };
    return {
      isPremium: data.is_premium === true,
      plan: data.subscription_plan ?? null,
      expiresAt: data.subscription_expires_at ? new Date(data.subscription_expires_at) : null,
      status: data.subscription_status ?? 'free',
    };
  } catch {
    return { isPremium: false, plan: null, expiresAt: null, status: 'free' };
  }
}

export async function getAvailablePackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}> {
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return {
      monthly: current?.monthly ?? null,
      annual: current?.annual ?? null,
      lifetime: current?.lifetime ?? null,
    };
  } catch {
    return { monthly: null, annual: null, lifetime: null };
  }
}

export async function purchasePackage(planType: PlanType): Promise<boolean> {
  try {
    const packages = await getAvailablePackages();
    const pkg = packages[planType];
    if (!pkg) throw new Error(`Package ${planType} not available`);
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch (error: any) {
    if (error?.userCancelled) return false;
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined;
  } catch {
    return false;
  }
}
