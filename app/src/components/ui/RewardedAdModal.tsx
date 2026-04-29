import { useState } from 'react';
import { showRewardedAd } from '../../lib/admob';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
  onUpgrade: () => void;
  /** Usado no mode "daily_limit" para exibir "X de Y registros". */
  recordsToday?: number;
  dailyLimit?: number;
  /**
   * Override completo do conteúdo. Quando presente, ignora recordsToday/dailyLimit
   * e usa os textos fornecidos. Permite reusar o modal pra qualquer feature
   * que o free pode desbloquear temporariamente com ad.
   */
  title?: string;
  description?: string;
  adButtonLabel?: string;
  upgradeButtonLabel?: string;
  icon?: string;
}

export function RewardedAdModal({
  isOpen,
  onClose,
  onAdCompleted,
  onUpgrade,
  recordsToday,
  dailyLimit,
  title,
  description,
  adButtonLabel,
  upgradeButtonLabel,
  icon = 'videocam',
}: Props) {
  const [watching, setWatching] = useState(false);
  useSheetBackClose(isOpen, onClose);

  if (!isOpen) return null;

  const resolvedTitle = title ?? 'Limite de registros';
  const resolvedDescription = description ??
    `Você já fez ${recordsToday ?? 0} de ${dailyLimit ?? 5} registros hoje. Assista um vídeo curto para liberar mais 2.`;
  const resolvedAdLabel = adButtonLabel ?? 'Assistir vídeo (+2 registros)';
  const resolvedUpgradeLabel = upgradeButtonLabel ?? 'Conhecer Yaya+: Registros ilimitados';

  const handleWatchAd = async () => {
    setWatching(true);
    const rewarded = await showRewardedAd();
    setWatching(false);
    if (rewarded) {
      onAdCompleted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[calc(100%-2.5rem)] max-w-sm rounded-md bg-surface-container border border-outline-variant/50 p-6 animate-fade-in">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-1">{resolvedTitle}</h3>
          <p className="text-sm text-on-surface/60">
            {resolvedDescription}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleWatchAd}
            disabled={watching}
            className="w-full py-3.5 rounded-md bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">play_circle</span>
            {watching ? 'Carregando anúncio...' : resolvedAdLabel}
          </button>

          <button
            onClick={() => {
              // Fecha esse modal primeiro e agenda o paywall num próximo tick.
              // Sem o delay, o useSheetBackClose do modal que está fechando
              // chama history.back() async, que dispara um popstate ouvido
              // pelo PaywallModal que acabou de abrir — resultando em "abriu
              // e fechou instantaneamente". O setTimeout garante que o
              // popstate drene antes do paywall registrar o listener.
              onClose();
              setTimeout(() => onUpgrade(), 100);
            }}
            className="w-full py-3.5 rounded-md bg-primary text-on-primary font-bold text-sm"
          >
            {resolvedUpgradeLabel}
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-on-surface/40 hover:text-on-surface/70 py-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
