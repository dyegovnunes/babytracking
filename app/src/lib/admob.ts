import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { BannerAdOptions, RewardAdOptions, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const AD_IDS = Capacitor.getPlatform() === 'ios'
  ? {
      banner: 'ca-app-pub-5445931232409285/8485808958',
      rewarded: 'ca-app-pub-5445931232409285/6609011699',
    }
  : {
      banner: 'ca-app-pub-5445931232409285/7747442352',
      rewarded: 'ca-app-pub-5445931232409285/4421832054',
    };

let initialized = false;
// Estado do banner para evitar chamadas duplicadas (show/hide em sequência
// muito rápida já causou crash de race condition no plugin AdMob).
let bannerVisible = false;
let bannerCall: Promise<void> | null = null;

export async function initAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform() || initialized) return;

  await AdMob.initialize({});
  initialized = true;
}

/**
 * Mostra o banner nativo. Idempotente via bannerCall + bannerVisible.
 * Serializa chamadas (show/hide) para evitar race no plugin.
 */
export async function showBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // Aguarda qualquer operação de banner em andamento
  if (bannerCall) await bannerCall.catch(() => {});
  if (bannerVisible) return;

  // BUG DESCOBERTO no plugin @capacitor-community/admob (Android 15+):
  //
  // O plugin registra um setOnApplyWindowInsetsListener em
  // BannerExecutor.java:109 que SOBRESCREVE o `margin` pra apenas o
  // bottomInset do sistema (barra de navegação do Android), ignorando
  // o valor que passamos. Por isso nenhum valor de margin (110, 200,
  // 300, 500) consegue empurrar o banner acima da bottom nav do app —
  // o plugin reseta a cada rendering insets.
  //
  // Solução arquitetural: deixamos o banner onde o plugin quiser
  // (margin=0, encostado no system bar) e subimos a BottomNav do app
  // via CSS usando a variável --yaya-ad-offset. Veja BottomNav.tsx +
  // AdBanner.tsx.
  const options: BannerAdOptions = {
    adId: AD_IDS.banner,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
  };

  bannerCall = (async () => {
    try {
      // Defensivo: tenta remover qualquer banner pré-existente (ex: AAB antigo
      // que setou margin diferente). Ignora erro se não havia nada.
      try { await AdMob.removeBanner(); } catch { /* no-op */ }
      await AdMob.showBanner(options);
      bannerVisible = true;
    } catch {
      bannerVisible = false;
    }
  })();
  await bannerCall;
  bannerCall = null;
}

export async function hideBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (bannerCall) await bannerCall.catch(() => {});
  if (!bannerVisible) return;

  bannerCall = (async () => {
    try {
      await AdMob.removeBanner();
    } catch {
      // Banner pode não estar visível mais — ignora
    } finally {
      bannerVisible = false;
    }
  })();
  await bannerCall;
  bannerCall = null;
}

/**
 * Mostra um interstitial pulável (3s, skippable) na primeira vez do dia
 * para uma chave específica. A chave permite controlar o cadenciamento
 * por feature: 'milestones', 'leaps', etc.
 *
 * No momento usamos rewarded como fallback (garante experiência similar
 * de "ad de ~3s que pode fechar"). TODO: criar um interstitial dedicado
 * no AdMob quando o inventário estiver configurado.
 */
export async function maybeShowInterstitialOncePerDay(key: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const storageKey = `yaya_ad_${key}_${today}`
  if (typeof localStorage === 'undefined') return
  if (localStorage.getItem(storageKey) === '1') return
  localStorage.setItem(storageKey, '1')

  if (!Capacitor.isNativePlatform()) return // web: no-op

  // Usa rewarded como stub para ad pulável; resultado ignorado (sem reward)
  try {
    await showRewardedAd()
  } catch {
    // swallow — não queremos bloquear a navegação se o ad falhar
  }
}

export async function showRewardedAd(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: simulate ad
    await new Promise((r) => setTimeout(r, 1500));
    return true;
  }

  const options: RewardAdOptions = {
    adId: AD_IDS.rewarded,
  };

  return new Promise<boolean>(async (resolve) => {
    // Listen for reward
    const rewardListener = await AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      (_reward: AdMobRewardItem) => {
        rewardListener.remove();
        resolve(true);
      }
    );

    // Listen for dismiss without reward
    const dismissListener = await AdMob.addListener(
      RewardAdPluginEvents.Dismissed,
      () => {
        dismissListener.remove();
        // Small delay to let reward fire first if it will
        setTimeout(() => resolve(false), 200);
      }
    );

    // Listen for load failure
    const failListener = await AdMob.addListener(
      RewardAdPluginEvents.FailedToLoad,
      () => {
        failListener.remove();
        rewardListener.remove();
        dismissListener.remove();
        resolve(false);
      }
    );

    try {
      await AdMob.prepareRewardVideoAd(options);
      await AdMob.showRewardVideoAd();
    } catch {
      rewardListener.remove();
      dismissListener.remove();
      failListener.remove();
      resolve(false);
    }
  });
}
