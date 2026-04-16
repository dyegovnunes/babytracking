import { useEffect } from 'react';
import { useBabyPremium } from '../../hooks/useBabyPremium';
import { showBanner, hideBanner } from '../../lib/admob';

/**
 * Banner AdMob. Segue a regra "premium por bebê":
 * se o bebê ativo é premium (qualquer parent paga), o banner é escondido
 * mesmo para cuidadores free do grupo.
 *
 * Montado UMA VEZ no AppShell. Não deve ser colocado em páginas individuais
 * (navegação causava crash por race show/hide no plugin AdMob).
 */
export function AdBanner() {
  const isPremium = useBabyPremium();

  useEffect(() => {
    if (isPremium) {
      hideBanner();
    } else {
      showBanner();
    }
    // Sem cleanup: o banner vive com o AppShell. Cleanup só no unmount final
    // (logout), onde a tela já muda de qualquer forma.
  }, [isPremium]);

  // Banner é nativo (overlay). Sem elemento DOM.
  return null;
}
