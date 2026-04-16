import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { usePremium } from '../../hooks/usePremium'
import { useLeapNotes } from './useLeapNotes'
import { DEVELOPMENT_LEAPS, type DevelopmentLeap } from './developmentLeaps'
import { contractionDe } from '../../lib/genderUtils'
import LeapTimeline from './components/LeapTimeline'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

const MS_PER_WEEK = 7 * 86400000

function getLeapStatus(birthDate: string, leap: DevelopmentLeap): LeapStatus {
  const ageWeeks = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / MS_PER_WEEK,
  )
  if (ageWeeks > leap.weekEnd + 1) return 'past'
  if (ageWeeks >= leap.weekStart - 1 && ageWeeks <= leap.weekEnd + 1)
    return 'active'
  if (leap.weekStart - ageWeeks <= 2) return 'upcoming'
  return 'future'
}

function getLeapEstimatedDate(birthDate: string, weekStart: number): Date {
  return new Date(new Date(birthDate).getTime() + weekStart * MS_PER_WEEK)
}

export default function LeapsPage() {
  const navigate = useNavigate()
  const { baby, logs } = useAppState()
  const { isPremium } = usePremium()
  const { notes, saveNote } = useLeapNotes(baby?.id)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const leapsWithStatus = useMemo(() => {
    if (!baby?.birthDate) return []
    return DEVELOPMENT_LEAPS.map(leap => {
      const status = getLeapStatus(baby.birthDate, leap)
      const estimatedDate = getLeapEstimatedDate(baby.birthDate, leap.weekStart)
      return { leap, status, estimatedDate }
    })
  }, [baby?.birthDate])

  // Auto-expandir o salto ativo
  const activeLeap = leapsWithStatus.find(l => l.status === 'active')

  // Se não expandiu nada ainda e há salto ativo, mostrar ele
  const effectiveExpanded =
    expandedId ?? (activeLeap ? activeLeap.leap.id : null)

  function handleToggle(id: number) {
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

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Card do salto ativo */}
        {activeLeap && (
          <div className="mb-4 bg-primary/8 border border-primary/20 rounded-md p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <div>
                <h2 className="text-on-surface font-headline text-sm font-bold">
                  Salto {activeLeap.leap.id}: {activeLeap.leap.name}
                </h2>
                <p className="text-on-surface-variant font-label text-xs">
                  {activeLeap.leap.subtitle}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            {(() => {
              const birthMs = new Date(baby.birthDate).getTime()
              const startMs =
                birthMs + activeLeap.leap.weekStart * MS_PER_WEEK
              const endMs =
                birthMs + (activeLeap.leap.weekEnd + 1) * MS_PER_WEEK
              const now = Date.now()
              const progress = Math.min(
                1,
                Math.max(0, (now - startMs) / (endMs - startMs)),
              )
              const weeksIn = Math.max(
                1,
                Math.ceil((now - startMs) / MS_PER_WEEK),
              )
              const totalWeeks =
                activeLeap.leap.weekEnd - activeLeap.leap.weekStart + 1

              return (
                <div>
                  <div className="flex justify-between text-xs text-on-surface-variant font-label mb-1">
                    <span>
                      Semana {Math.min(weeksIn, totalWeeks)} de {totalWeeks}
                    </span>
                    <span>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-2 bg-primary/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            <button
              onClick={() => handleToggle(activeLeap.leap.id)}
              className="mt-3 text-primary font-label text-xs font-medium"
            >
              {effectiveExpanded === activeLeap.leap.id
                ? 'Recolher detalhes'
                : 'Ver detalhes'}
            </button>
          </div>
        )}

        {/* Timeline completa */}
        <LeapTimeline
          leaps={leapsWithStatus}
          expandedId={effectiveExpanded}
          onToggle={handleToggle}
          birthDate={baby.birthDate}
          logs={logs}
          notes={notes}
          onSaveNote={saveNote}
          isPremium={isPremium}
        />
      </div>
    </div>
  )
}
