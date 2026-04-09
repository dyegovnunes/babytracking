import { usePremium } from '../../hooks/usePremium';

export function AdBanner() {
  const { isPremium } = usePremium();

  if (isPremium) return null;

  // TODO: Replace with real AdMob banner integration
  return (
    <div className="w-full h-14 bg-surface-container-low border-t border-outline-variant/10 flex items-center justify-center">
      <span className="font-label text-xs text-on-surface-variant/40">Ad Space</span>
    </div>
  );
}
