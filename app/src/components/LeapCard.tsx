import { useState, useEffect } from 'react';
import type { DevelopmentLeap } from '../lib/developmentLeaps';

interface LeapCardProps {
  leap: DevelopmentLeap;
  babyName: string;
  isUpcoming?: boolean;
  weeksUntil?: number;
}

export default function LeapCard({ leap, babyName, isUpcoming, weeksUntil }: LeapCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Check localStorage for dismissal
  const dismissKey = `leap_dismissed_${leap.id}`;
  useEffect(() => {
    const d = localStorage.getItem(dismissKey);
    if (d) {
      const ts = parseInt(d);
      // Re-show after 7 days
      if (Date.now() - ts < 7 * 86400000) setDismissed(true);
    }
  }, [dismissKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, Date.now().toString());
    setDismissed(true);
  };

  return (
    <>
      <div className="rounded-xl bg-gradient-to-r from-[#7C4DFF]/10 to-[#b79fff]/10 border border-[#b79fff]/15 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C4DFF]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#e7e2ff]">
              {isUpcoming
                ? `Salto ${leap.id} em ${weeksUntil} semana${weeksUntil! > 1 ? 's' : ''}`
                : `Salto ${leap.id} — ${leap.name}`
              }
            </h4>
            <p className="text-xs text-[#e7e2ff]/60 mt-0.5">
              {isUpcoming
                ? `${leap.subtitle} (semanas ${leap.weekStart}-${leap.weekEnd})`
                : `${babyName} pode estar mais agitado. Normal!`
              }
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowDetail(true)}
                className="text-xs font-semibold text-[#b79fff]"
              >
                Saiba mais
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-[#e7e2ff]/30"
              >
                Dispensar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <LeapDetail leap={leap} babyName={babyName} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

function LeapDetail({ leap, onClose }: { leap: DevelopmentLeap; babyName?: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-[#0d0a27] border border-[#b79fff]/20 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-base font-bold text-[#e7e2ff]">
              Salto {leap.id} — {leap.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#e7e2ff]/40">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-sm text-[#e7e2ff]/70 mb-4">
          {leap.description}
        </p>

        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[#b79fff] uppercase tracking-wider mb-2">
            O que esperar
          </h4>
          <ul className="space-y-1.5">
            {leap.whatToExpect.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#e7e2ff]/80">
                <span className="text-[#b79fff] mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[#b79fff] uppercase tracking-wider mb-2">
            Dicas
          </h4>
          <ul className="space-y-1.5">
            {leap.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#e7e2ff]/80">
                <span className="material-symbols-outlined text-sm text-[#b79fff] mt-0.5">lightbulb</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/[0.04] rounded-lg p-3 mb-4">
          <h4 className="text-xs font-semibold text-[#b79fff] mb-1">
            Impacto nos registros
          </h4>
          <p className="text-xs text-[#e7e2ff]/60">{leap.registroImpact}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#b79fff]/10 text-[#b79fff] font-semibold text-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
