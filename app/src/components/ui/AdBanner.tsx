import { useEffect } from 'react';
import { useBabyPremium } from '../../hooks/useBabyPremium';
import { showBanner, hideBanner } from '../../lib/admob';

/**
 * Banner AdMob. Segue a regra "premium por bebê":
 * se o bebê ativo é premium (qualquer parent paga), o banner é escondido
 * mesmo para cuidadores free do grupo.
 */
export function AdBanner() {
  const isPremium = useBabyPremium();

  useEffect(() => {
    if (isPremium) {
      hideBanner();
      return;
    }

    showBanner();
    return () => { hideBanner(); };
  }, [isPremium]);

  // Native banner is rendered by the plugin overlay — no DOM element needed
  // Keep a spacer so content doesn't get hidden behind the banner
  if (isPremium) return null;

  return <div className="w-full h-14 shrink-0" />;
}
