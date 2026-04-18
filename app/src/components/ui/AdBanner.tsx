import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useBabyPremium } from '../../hooks/useBabyPremium';
import { showBanner, hideBanner } from '../../lib/admob';

/**
 * Altura estimada do banner adaptive. Real varia 50-60dp mas usamos 60 como
 * conservador — melhor banner com respiro do que cortado.
 */
const AD_BANNER_HEIGHT_PX = 60;

/**
 * Banner AdMob. Premium escondido; free vê.
 *
 * IMPORTANTE: o plugin tem bug em Android 15+ que ignora a option `margin`
 * (vide src/lib/admob.ts). Pra bottom nav do app não ficar tampada, esse
 * componente seta uma CSS custom property `--yaya-ad-offset` no root que
 * a BottomNav e o AppShell leem pra somar ao seu próprio `bottom` /
 * `padding-bottom`.
 *
 * Montado UMA VEZ no AppShell. Não deve ser colocado em páginas individuais
 * (navegação causava crash por race show/hide no plugin AdMob).
 */
export function AdBanner() {
  const isPremium = useBabyPremium();

  useEffect(() => {
    const root = document.documentElement;

    if (isPremium || !Capacitor.isNativePlatform()) {
      hideBanner();
      root.style.removeProperty('--yaya-ad-offset');
      return;
    }

    showBanner();
    root.style.setProperty('--yaya-ad-offset', `${AD_BANNER_HEIGHT_PX}px`);
    // Sem cleanup: o banner vive com o AppShell até premium mudar/logout.
  }, [isPremium]);

  return null;
}
