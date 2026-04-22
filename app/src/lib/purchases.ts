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

// Estado do último fetch de offerings — exposto pro PaywallModal mostrar
// "Debug info" quando a compra falha. Essencial pra debugar TestFlight
// sem Safari Web Inspector.
export interface OfferingsDiagnostic {
  platform: string;
  keyPrefix: string;
  currentOfferingId: string | null;
  allOfferingIds: string[];
  currentPackageIds: string[];
  /** Detalhe por package: identifier:type:productId — mostra tudo o que o RC devolveu. */
  packageDetails: string[];
  hasMonthly: boolean;
  hasAnnual: boolean;
  hasLifetime: boolean;
  error: string | null;
}

let lastDiagnostic: OfferingsDiagnostic | null = null;

export function getLastOfferingsDiagnostic(): OfferingsDiagnostic | null {
  return lastDiagnostic;
}

export async function getAvailablePackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
}> {
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
  const keyPrefix = apiKey ? String(apiKey).slice(0, 8) : 'UNDEFINED';

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const allIds = Object.keys(offerings.all || {});

    if (!current) {
      lastDiagnostic = {
        platform,
        keyPrefix,
        currentOfferingId: null,
        allOfferingIds: allIds,
        currentPackageIds: [],
        packageDetails: [],
        hasMonthly: false,
        hasAnnual: false,
        hasLifetime: false,
        error: 'No current offering (products provavelmente não carregaram do StoreKit)',
      };
      // eslint-disable-next-line no-console
      console.warn('[RC] diagnostic', lastDiagnostic);
      return { monthly: null, annual: null, lifetime: null };
    }

    const packages = current.availablePackages ?? [];
    const packageIds = packages.map((p) => p.identifier);

    // Fallback multi-strategy: além dos getters current.monthly/annual/lifetime
    // (que só funcionam se o offering no RC usar identifiers $rc_monthly/annual/lifetime),
    // procura também por:
    //  a) packageType === MONTHLY/ANNUAL/LIFETIME (funciona mesmo com custom identifiers)
    //  b) product identifier batendo com os IDs do App Store Connect / Play Console
    //
    // Isso protege de configurações do RC onde os packages foram criados com
    // identifiers custom (sem o prefixo $rc_*), o que é comum.
    const findByType = (typeStr: string, productIdContains: string): PurchasesPackage | null => {
      return (
        packages.find((p) => String(p.packageType) === typeStr) ??
        packages.find((p) => p.product?.identifier?.includes(productIdContains)) ??
        null
      );
    };

    const monthly = current.monthly ?? findByType('MONTHLY', '.monthly');
    const annual = current.annual ?? findByType('ANNUAL', '.annual');
    const lifetime = current.lifetime ?? findByType('LIFETIME', '.lifetime');

    lastDiagnostic = {
      platform,
      keyPrefix,
      currentOfferingId: current.identifier,
      allOfferingIds: allIds,
      currentPackageIds: packageIds,
      packageDetails: packages.map(p => `${p.identifier}:${p.packageType}:${p.product?.identifier ?? '?'}`),
      hasMonthly: !!monthly,
      hasAnnual: !!annual,
      hasLifetime: !!lifetime,
      error: null,
    };
    // eslint-disable-next-line no-console
    console.log('[RC] diagnostic', lastDiagnostic, 'types=', packages.map(p => `${p.identifier}:${p.packageType}:${p.product?.identifier}`));
    return { monthly, annual, lifetime };
  } catch (err: any) {
    lastDiagnostic = {
      platform,
      keyPrefix,
      currentOfferingId: null,
      allOfferingIds: [],
      currentPackageIds: [],
      packageDetails: [],
      hasMonthly: false,
      hasAnnual: false,
      hasLifetime: false,
      error: err?.message || String(err),
    };
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
