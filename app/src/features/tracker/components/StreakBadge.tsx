import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getCurrentBadge, STREAK_BADGES, type StreakData } from '../../../lib/streak';
import { getLocalDateString } from '../../../lib/formatters';
import { useSheetBackClose } from '../../../hooks/useSheetBackClose';
import { hapticSuccess } from '../../../lib/haptics';

/** Milestones em que o streak dispara brilho radial dourado. */
const STREAK_GLOW_MILESTONES = [7, 14, 30, 60, 100];
const GLOW_STORAGE_KEY = 'yaya_streak_glow_last_shown';

interface StreakBadgeProps {
  streak: StreakData;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [glowing, setGlowing] = useState(false);
  useSheetBackClose(showDetail, () => setShowDetail(false));

  // Brilho radial uma única vez quando o streak cruza um milestone
  // (7/14/30/60/100). localStorage evita re-trigger em re-montagens no
  // mesmo dia. Haptic success sincronizado com o brilho.
  useEffect(() => {
    const current = streak.currentStreak;
    if (!STREAK_GLOW_MILESTONES.includes(current)) return;
    let lastShown = 0;
    try {
      lastShown = parseInt(localStorage.getItem(GLOW_STORAGE_KEY) || '0', 10);
    } catch {
      /* ignore */
    }
    if (lastShown >= current) return;
    setGlowing(true);
    hapticSuccess();
    try {
      localStorage.setItem(GLOW_STORAGE_KEY, String(current));
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setGlowing(false), 1400);
    return () => clearTimeout(t);
  }, [streak.currentStreak]);

  if (streak.currentStreak === 0) return null;

  const badge = getCurrentBadge(streak.currentStreak);
  const nextBadge = STREAK_BADGES.find(b => streak.currentStreak < b.days);

  // Check if streak is at risk (no log today after 20h LOCAL time)
  const now = new Date();
  const today = getLocalDateString(now);
  const isAtRisk = streak.lastActiveDate !== today && now.getHours() >= 20;

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] text-sm font-bold ${
          isAtRisk ? 'animate-pulse text-amber-400' : 'text-on-surface'
        }`}
      >
        {/* Brilho radial dourado — pulso único quando cruza milestone */}
        <AnimatePresence>
          {glowing && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.6, 2.2, 2.8] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,214,102,0.75) 0%, rgba(255,180,60,0.35) 40%, transparent 70%)',
                filter: 'blur(6px)',
              }}
            />
          )}
        </AnimatePresence>
        <motion.span
          className="text-base relative"
          animate={glowing ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          🔥
        </motion.span>
        <span className="relative">{streak.currentStreak}</span>
        {badge && <span className="text-xs relative">{badge.emoji}</span>}
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
