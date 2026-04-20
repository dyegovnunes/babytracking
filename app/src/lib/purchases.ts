import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export const ENTITLEMENT_YAYA_PLUS = 'yaya_plus';

export type PlanType = 'monthly' | 'annual' | 'lifetime';

export interface SubscriptionInfo {
  isPremium: boolean;
  plan: PlanType | null;
  expiresAt: Date | null;
  status: 'free' | 'active' | 'cancelled' | 'expired' | 'grace_period';
}

export async function initializePurchases(userId: string) {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') return; // RevenueCat não funciona na web

  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

  // Log instrumentado pra diagnosticar chave errada/ausente no build.
  // Mostra só prefixo — chaves públicas do RevenueCat começam com `appl_`
  // (iOS) ou `goog_` (Android). Se aparecer `undefined`, o grupo de vars
  // do Codemagic não está injetando. Remover esse log depois de confirmar.
  // eslint-disable-next-line no-console
  console.log('[RC] platform=', platform, 'key prefix=', apiKey ? apiKey.slice(0, 8) : 'UNDEFINED');

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey });
  await Purchases.logIn({ appUserID: userId });
}

export async function checkIsPremium(babyId?: string): Promise<boolean> {
  // Check if any member of the baby's group is premium
  if (babyId) {
    try {
      const { data: members } = await supabase
        .from('baby_members')
        .select('user_id')
        .eq('baby_id', babyId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('is_premium')
          .in('id', userIds)
          .eq('is_premium', true)
          .limit(1);

        if (profiles && profiles.length > 0) return true;
      }
    } catch {
      // fallback to individual check below
    }
  }

  // On native, check RevenueCat first
  if (Capacitor.getPlatform() !== 'web') {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      if (customerInfo.entitlements.active[ENTITLEMENT_YAYA_PLUS] !== undefined) return true;
    } catch {
      // fallback below
    }
  }

  // Fallback: check individual user profile
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
    if (!current) {
      // eslint-disable-next-line no-console
      console.warn('[RC] No current offering. All offering ids:', Object.keys(offerings.all || {}));
      return { monthly: null, annual: null, lifetime: null };
    }
    // eslint-disable-next-line no-console
    console.log('[RC] current offering=', current.identifier, 'packages=', current.availablePackages?.map((p) => p.identifier));
    return {
      monthly: current.monthly ?? null,
      annual: current.annual ?? null,
      lifetime: current.lifetime ?? null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[RC] getOfferings failed:', err);
    return { monthly: null, annual: null, lifetime: null };
  }
}

export async function purchasePackage(planType: PlanType): Promise<boolean> {
  try {
    const packages = await getAvailablePackages();
    const pkg = packages[planType];
    if (!pkg) {
      // Mensagem mais descritiva pro usuário quando offerings não carregam.
      // Em sandbox costuma ser StoreKit ainda não sincronizado, conta
      // sandbox inválida ou chave RevenueCat errada.
      throw new Error(`Plano "${planType}" indisponível. Feche o app e reabra, ou verifique sua conta Apple ID.`);
    }

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
