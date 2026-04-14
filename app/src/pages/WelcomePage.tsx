import { getAgeBand, getWelcomeContent } from '../lib/ageUtils'
import { getActiveLeap, getUpcomingLeap } from '../features/milestones'

interface Props {
  onComplete: () => void
  baby: { name: string; gender?: 'boy' | 'girl'; birthDate: string }
}

const BAND_EMOJI: Record<string, string> = {
  newborn: '👶',
  early: '🌱',
  growing: '🌿',
  weaning: '🍎',
  active: '🏃',
  toddler_early: '🎯',
  toddler: '🌟',
  beyond: '✨',
}

function getAgeLabel(birthDate: string): string {
  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  if (days < 7) return `${days} dias`
  if (days < 30) return `${Math.floor(days / 7)} semanas`
  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months}m`
  return `${Math.floor(months / 12)} anos`
}

export default function WelcomePage({ onComplete, baby }: Props) {
  const gender = baby.gender ?? 'boy'
  const band = getAgeBand(baby.birthDate)
  const content = getWelcomeContent(band, baby.name, gender)
  const greeting = gender === 'girl' ? 'Bem-vinda' : 'Bem-vindo'

  const activeLeap = getActiveLeap(baby.birthDate)
  const upcomingLeap = getUpcomingLeap(baby.birthDate)
  const leapEmoji = activeLeap ? '🧠' : BAND_EMOJI[band] ?? '✨'
  const ageLabel = getAgeLabel(baby.birthDate)

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 py-12 page-enter relative overflow-hidden">
      {/* Glow background */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Animated ring with emoji */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, var(--color-primary), var(--color-tertiary), var(--color-primary))',
                opacity: 0.3,
                animation: 'welcome-ring-pulse 3s ease-in-out infinite',
              }}
            />
            <div className="absolute inset-[3px] rounded-full bg-surface" />
            <span className="relative text-4xl">{leapEmoji}</span>
          </div>
        </div>

        {/* Brand label */}
        <p className="font-headline text-[11px] font-bold text-primary uppercase tracking-[3px] mb-3">
          Yaya Baby
        </p>

        {/* Greeting */}
        <h1 className="font-headline text-2xl font-bold text-on-surface text-center mb-3">
          {greeting} ao Yaya!
        </h1>

        {/* Name pill */}
        <div className="bg-surface-container rounded-full px-4 py-1.5 mb-6">
          <span className="font-label text-sm text-on-surface-variant">
            {baby.name} · {ageLabel}
          </span>
        </div>

        {/* Contextual paragraph */}
        <p className="font-body text-sm text-on-surface-variant text-center leading-relaxed mb-8 px-2">
          {content.paragraph}
        </p>

        {/* Feature rows */}
        <div className="w-full space-y-3 mb-10">
          {content.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-4 bg-surface-container rounded-xl px-4 py-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{feature.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm text-on-surface font-semibold">{feature.title}</p>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-label font-bold text-base text-white transition-all active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #5b3db5, #b79fff)',
            boxShadow: '0 8px 28px rgba(91,61,181,0.45)',
          }}
        >
          Vamos la
        </button>

        {/* Leap info if active */}
        {activeLeap && (
          <p className="font-label text-[11px] text-on-surface-variant text-center mt-4 opacity-60">
            Salto {activeLeap.id}: {activeLeap.name}
          </p>
        )}
        {!activeLeap && upcomingLeap && upcomingLeap.weeksUntil <= 2 && (
          <p className="font-label text-[11px] text-on-surface-variant text-center mt-4 opacity-60">
            Salto {upcomingLeap.leap.id} se aproximando
          </p>
        )}
      </div>

      <style>{`
        @keyframes welcome-ring-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
