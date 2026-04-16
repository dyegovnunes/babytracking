import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { DEVELOPMENT_LEAPS, type DevelopmentLeap } from './developmentLeaps'
import { contractionDe } from '../../lib/genderUtils'
import { maybeShowInterstitialOncePerDay } from '../../lib/admob'
import { AdBanner } from '../../components/ui/AdBanner'
import LeapTimeline from './components/LeapTimeline'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

const MS_PER_WEEK = 7 * 86400000

function getLeapStatus(birthDate: string, leap: DevelopmentLeap): LeapStatus {
  const birthMs = new Date(birthDate).getTime()
  const now = Date.now()
  const leapStartMs = birthMs + leap.weekStart * MS_PER_WEEK
  const leapEndMs = birthMs + (leap.weekEnd + 1) * MS_PER_WEEK

  if (now >= leapEndMs) return 'past'
  if (now >= leapStartMs && now < leapEndMs) return 'active'
  // Próximo se faltam 2 semanas ou menos
  if (leapStartMs - now <= 2 * MS_PER_WEEK) return 'upcoming'
  return 'future'
}

function getLeapEstimatedDate(birthDate: string, weekStart: number): Date {
  return new Date(new Date(birthDate).getTime() + weekStart * MS_PER_WEEK)
}

export default function LeapsPage() {
  const navigate = useNavigate()
  const { baby, logs } = useAppState()
  const isPremium = useBabyPremium()

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const hasInteracted = useRef(false)

  // Interstitial skippable na primeira visita do dia (só free)
  useEffect(() => {
    if (!isPremium) {
      maybeShowInterstitialOncePerDay('leaps').catch(() => {})
    }
  }, [isPremium])

  const leapsWithStatus = useMemo(() => {
    if (!baby?.birthDate) return []
    return DEVELOPMENT_LEAPS.map(leap => {
      const status = getLeapStatus(baby.birthDate, leap)
      const estimatedDate = getLeapEstimatedDate(baby.birthDate, leap.weekStart)
      return { leap, status, estimatedDate }
    })
  }, [baby?.birthDate])

  // Auto-expand the active leap only until user interacts
  const activeLeapEntry = leapsWithStatus.find(l => l.status === 'active')

  const effectiveExpanded = hasInteracted.current
    ? expandedId
    : (activeLeapEntry?.leap.id ?? null)

  function handleToggle(id: number) {
    hasInteracted.current = true
    setExpandedId(prev => (prev === id ? null : id))
  }

  if (!baby) return null

  const de = contractionDe(baby.gender)

  // Stats para o header
  const pastCount = leapsWithStatus.filter(l => l.status === 'past').length
  const totalCount = DEVELOPMENT_LEAPS.length

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 rounded-md active:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface">
              arrow_back
            </span>
          </button>
          <div className="flex-1">
            <h1 className="text-on-surface font-headline text-lg font-bold">
              Saltos {de} {baby.name}
            </h1>
            <p className="text-on-surface-variant font-label text-xs">
              Jornada de desenvolvimento
            </p>
          </div>
          <span className="text-on-surface-variant font-label text-xs bg-surface-container px-2 py-1 rounded-md">
            {pastCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Conteudo */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Timeline completa */}
        <LeapTimeline
          leaps={leapsWithStatus}
          expandedId={effectiveExpanded}
          onToggle={handleToggle}
          birthDate={baby.birthDate}
          babyName={baby.name}
          babyGender={baby.gender as 'boy' | 'girl' | undefined}
          babyId={baby.id}
          logs={logs}
          isPremium={isPremium}
        />
      </div>

      <AdBanner />
    </div>
  )
}
