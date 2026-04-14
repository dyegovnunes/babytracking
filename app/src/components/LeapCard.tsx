import { useState, useEffect, useMemo } from 'react';
import type { DevelopmentLeap } from '../lib/developmentLeaps';
import { DEVELOPMENT_LEAPS } from '../lib/developmentLeaps';

function weekToDate(birthDate: string, week: number): Date {
  const birth = new Date(birthDate);
  return new Date(birth.getTime() + week * 7 * 86400000);
}

function formatDDMM(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface LeapCardProps {
  leap: DevelopmentLeap;
  babyName: string;
  babyGender?: 'boy' | 'girl';
  birthDate: string;
  isUpcoming?: boolean;
  weeksUntil?: number;
}

export default function LeapCard({ leap, babyName, babyGender, birthDate, isUpcoming }: LeapCardProps) {
  const adjAgitado = babyGender === 'girl' ? 'agitada' : 'agitado';
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

  // Calculate baby age in weeks
  const babyAgeWeeks = useMemo(() => {
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getTime() - birth.getTime()) / (7 * 86400000);
  }, [birthDate]);

  return (
    <>
      <div className="rounded-md bg-gradient-to-r from-[#7C4DFF]/10 to-[#b79fff]/10 border border-[#b79fff]/15 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-[#7C4DFF]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-base">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#e7e2ff]">
              {isUpcoming
                ? `Salto ${leap.id} a partir de ${formatDDMM(weekToDate(birthDate, leap.weekStart))}`
                : `Salto ${leap.id} — ${leap.name}`
              }
            </h4>
            <p className="text-xs text-[#e7e2ff]/60 mt-0.5">
              {isUpcoming
                ? `${leap.subtitle} (${formatDDMM(weekToDate(birthDate, leap.weekStart))} — ${formatDDMM(weekToDate(birthDate, leap.weekEnd))})`
                : `${babyName} pode estar mais ${adjAgitado}. Normal!`
              }
            </p>

            {/* Mini timeline */}
            <LeapTimeline currentLeapId={leap.id} babyAgeWeeks={babyAgeWeeks} birthDate={birthDate} />

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
        <LeapDetail leap={leap} babyName={babyName} birthDate={birthDate} babyAgeWeeks={babyAgeWeeks} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

/** Mini timeline showing nearby leaps */
function LeapTimeline({ currentLeapId, babyAgeWeeks, birthDate }: { currentLeapId: number; babyAgeWeeks: number; birthDate: string }) {
  // Show current leap and 1 before + 2 after for context
  const visibleLeaps = DEVELOPMENT_LEAPS.filter(
    (l) => l.id >= currentLeapId - 1 && l.id <= currentLeapId + 2
  );

  if (visibleLeaps.length === 0) return null;

  const minWeek = Math.max(0, visibleLeaps[0].weekStart - 2);
  const maxWeek = visibleLeaps[visibleLeaps.length - 1].weekEnd + 2;
  const range = maxWeek - minWeek;

  const toPercent = (week: number) => ((week - minWeek) / range) * 100;
  const babyPos = Math.max(0, Math.min(100, toPercent(babyAgeWeeks)));

  return (
    <div className="mt-2.5 mb-1">
      <div className="relative h-5">
        {/* Base line */}
        <div className="absolute top-[9px] left-0 right-0 h-[2px] bg-white/10 rounded-full" />

        {/* Leap blocks */}
        {visibleLeaps.map((l) => {
          const left = toPercent(l.weekStart);
          const width = toPercent(l.weekEnd) - left;
          const isCurrent = l.id === currentLeapId;
          const isPast = l.weekEnd < babyAgeWeeks;

          return (
            <div
              key={l.id}
              className={`absolute top-[5px] h-[10px] rounded-full ${
                isCurrent
                  ? 'bg-[#b79fff]'
                  : isPast
                    ? 'bg-[#b79fff]/30'
                    : 'bg-white/15'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
            >
              <span className={`absolute -top-[11px] left-1/2 -translate-x-1/2 text-[8px] font-bold ${
                isCurrent ? 'text-[#b79fff]' : 'text-[#e7e2ff]/30'
              }`}>
                {l.id}
              </span>
            </div>
          );
        })}

        {/* Baby position marker */}
        <div
          className="absolute top-[3px] w-3.5 h-3.5 -translate-x-1/2 z-10"
          style={{ left: `${babyPos}%` }}
        >
          <div className="w-full h-full rounded-full bg-[#e7e2ff] border-2 border-[#0d0a27] shadow-sm" />
        </div>
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-[#e7e2ff]/25">{formatDDMM(weekToDate(birthDate, minWeek))}</span>
        <span className="text-[8px] text-[#e7e2ff]/25">{formatDDMM(weekToDate(birthDate, maxWeek))}</span>
      </div>
    </div>
  );
}

function LeapDetail({ leap, onClose, birthDate, babyAgeWeeks }: { leap: DevelopmentLeap; babyName?: string; birthDate: string; babyAgeWeeks: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-[#0d0a27] border border-[#b79fff]/20 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
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

        {/* Full timeline of all leaps */}
        <FullLeapTimeline currentLeapId={leap.id} babyAgeWeeks={babyAgeWeeks} birthDate={birthDate} />

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

        <div className="bg-white/[0.04] rounded-md p-3 mb-4">
          <h4 className="text-xs font-semibold text-[#b79fff] mb-1">
            Impacto nos registros
          </h4>
          <p className="text-xs text-[#e7e2ff]/60">{leap.registroImpact}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-md bg-[#b79fff]/10 text-[#b79fff] font-semibold text-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

/** Full timeline of all 10 leaps for the detail modal */
function FullLeapTimeline({ currentLeapId, babyAgeWeeks, birthDate }: { currentLeapId: number; babyAgeWeeks: number; birthDate: string }) {
  return (
    <div className="bg-white/[0.03] rounded-md p-3 mb-4">
      <p className="text-[10px] text-[#e7e2ff]/40 uppercase tracking-wider mb-2">Linha do tempo dos saltos</p>
      <div className="space-y-1">
        {DEVELOPMENT_LEAPS.map((l) => {
          const isCurrent = l.id === currentLeapId;
          const isPast = l.weekEnd < babyAgeWeeks;
          const isFuture = l.weekStart > babyAgeWeeks;
          return (
            <div key={l.id} className="flex items-center gap-2">
              {/* Leap number */}
              <span className={`w-4 text-[9px] font-bold text-right flex-shrink-0 ${
                isCurrent ? 'text-[#b79fff]' : isPast ? 'text-[#e7e2ff]/30' : 'text-[#e7e2ff]/20'
              }`}>
                {l.id}
              </span>

              {/* Bar */}
              <div className="flex-1 h-4 relative">
                <div
                  className={`h-full rounded-sm flex items-center px-1.5 ${
                    isCurrent
                      ? 'bg-[#b79fff] shadow-sm shadow-[#b79fff]/30'
                      : isPast
                        ? 'bg-[#b79fff]/20'
                        : 'bg-white/[0.06]'
                  }`}
                >
                  <span className={`text-[8px] font-semibold truncate ${
                    isCurrent ? 'text-[#0d0a27]' : isPast ? 'text-[#e7e2ff]/40' : 'text-[#e7e2ff]/25'
                  }`}>
                    {l.name}
                  </span>
                </div>

                {/* Baby marker on current leap */}
                {isCurrent && babyAgeWeeks >= l.weekStart && babyAgeWeeks <= l.weekEnd && (
                  <div
                    className="absolute top-0 w-0.5 h-full bg-[#e7e2ff] rounded-full"
                    style={{
                      left: `${((babyAgeWeeks - l.weekStart) / (l.weekEnd - l.weekStart)) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Dates */}
              <span className={`text-[8px] flex-shrink-0 w-[72px] text-right ${
                isCurrent ? 'text-[#e7e2ff]/70' : 'text-[#e7e2ff]/20'
              }`}>
                {isFuture
                  ? `a partir ${formatDDMM(weekToDate(birthDate, l.weekStart))}`
                  : `${formatDDMM(weekToDate(birthDate, l.weekStart))} — ${formatDDMM(weekToDate(birthDate, l.weekEnd))}`
                }
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#b79fff]" />
          <span className="text-[8px] text-[#e7e2ff]/40">Atual</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#b79fff]/20" />
          <span className="text-[8px] text-[#e7e2ff]/40">Passou</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-white/[0.06]" />
          <span className="text-[8px] text-[#e7e2ff]/40">Futuro</span>
        </div>
      </div>
    </div>
  );
}
