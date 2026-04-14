import { useState } from 'react';
import { showRewardedAd } from '../../lib/admob';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
  onUpgrade: () => void;
  recordsToday: number;
  dailyLimit: number;
}

export function RewardedAdModal({ isOpen, onClose, onAdCompleted, onUpgrade, recordsToday, dailyLimit }: Props) {
  const [watching, setWatching] = useState(false);
  useSheetBackClose(isOpen, onClose);

  if (!isOpen) return null;

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
      <div className="w-[calc(100%-2.5rem)] max-w-sm rounded-3xl bg-[#181538] border border-[#474464]/50 p-6 animate-fade-in">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-[#b79fff]/10 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[#b79fff] text-2xl">videocam</span>
          </div>
          <h3 className="text-lg font-bold text-[#e7e2ff] mb-1">Limite de registros</h3>
          <p className="text-sm text-[#e7e2ff]/60">
            Você já fez {recordsToday} de {dailyLimit} registros hoje. Assista um vídeo curto para liberar mais 2.
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleWatchAd}
            disabled={watching}
            className="w-full py-3.5 rounded-2xl bg-[#b79fff]/15 text-[#b79fff] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">play_circle</span>
            {watching ? 'Carregando anúncio...' : 'Assistir vídeo (+2 registros)'}
          </button>

          <button
            onClick={() => { onClose(); onUpgrade(); }}
            className="w-full py-3.5 rounded-2xl bg-[#b79fff] text-[#0d0a27] font-bold text-sm"
          >
            Conhecer Yaya+ — Registros ilimitados
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-[#e7e2ff]/40 hover:text-[#e7e2ff]/70 py-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
