import { useState } from 'react';
import { getCurrentBadge, STREAK_BADGES, type StreakData } from '../lib/streak';

interface StreakBadgeProps {
  streak: StreakData;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (streak.currentStreak === 0) return null;

  const badge = getCurrentBadge(streak.currentStreak);
  const nextBadge = STREAK_BADGES.find(b => streak.currentStreak < b.days);

  // Check if streak is at risk (no log today after 20h)
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const isAtRisk = streak.lastActiveDate !== today && now.getHours() >= 20;

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] text-sm font-bold ${
          isAtRisk ? 'animate-pulse text-amber-400' : 'text-on-surface'
        }`}
      >
        <span className="text-base">🔥</span>
        <span>{streak.currentStreak}</span>
        {badge && <span className="text-xs">{badge.emoji}</span>}
      </button>

      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="w-[85%] max-w-sm rounded-2xl bg-[#0d0a27] border border-[#b79fff]/20 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔥</div>
              <h3 className="text-lg font-bold text-[#e7e2ff]">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'} seguidos
              </h3>
              {badge && (
                <span className="inline-block mt-1 text-xs font-semibold bg-[#b79fff]/20 text-[#b79fff] px-2 py-0.5 rounded-full">
                  {badge.emoji} {badge.label}
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#e7e2ff]/60">Recorde pessoal</span>
                <span className="text-[#e7e2ff] font-semibold">{streak.longestStreak} dias</span>
              </div>

              {nextBadge && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#e7e2ff]/60">Próxima conquista</span>
                    <span className="text-[#e7e2ff] font-semibold">{nextBadge.emoji} {nextBadge.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#b79fff] rounded-full transition-all"
                      style={{ width: `${Math.min((streak.currentStreak / nextBadge.days) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#e7e2ff]/40 mt-0.5">
                    Faltam {nextBadge.days - streak.currentStreak} dias
                  </p>
                </div>
              )}

              {isAtRisk && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-400 font-medium">
                    Registre algo hoje para manter seu streak!
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetail(false)}
              className="w-full py-2.5 rounded-xl bg-[#b79fff]/10 text-[#b79fff] font-semibold text-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
