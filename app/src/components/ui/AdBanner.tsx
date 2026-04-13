import { useEffect } from 'react';
import { usePremium } from '../../hooks/usePremium';
import { showBanner, hideBanner } from '../../lib/admob';

export function AdBanner() {
  const { isPremium } = usePremium();

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
