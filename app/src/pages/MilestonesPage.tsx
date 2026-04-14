import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { usePremium } from '../hooks/usePremium'
import { useMilestones } from '../hooks/useMilestones'
import {
  MILESTONES,
  AGE_BAND_ORDER,
  AGE_BAND_LABEL,
  CATEGORY_LABEL,
  formatAgeAtDate,
  type Milestone,
  type BabyMilestone,
} from '../lib/milestoneData'
import type { AgeBand } from '../lib/ageUtils'
import { DEVELOPMENT_LEAPS } from '../lib/developmentLeaps'
import MilestoneRegister from '../components/milestones/MilestoneRegister'
import MilestoneCelebration from '../components/milestones/MilestoneCelebration'
import MilestoneShareImage from '../components/milestones/MilestoneShareImage'
import { PaywallModal } from '../components/ui/PaywallModal'
import Toast from '../components/ui/Toast'
import { hapticLight } from '../lib/haptics'
import { contractionDe } from '../lib/genderUtils'

type FilterMode = 'all' | 'achieved' | 'pending'

function getLeapAtDate(
  birthDate: string,
  achievedAt: string,
): string | null {
  const birth = new Date(birthDate)
  const achieved = new Date(achievedAt + 'T12:00:00')
  const ageWeeks = Math.floor(
    (achieved.getTime() - birth.getTime()) / (7 * 86400000),
  )
  const leap = DEVELOPMENT_LEAPS.find(
    (l) => ageWeeks >= l.weekStart && ageWeeks <= l.weekEnd,
  )
  return leap ? `Durante o Salto ${leap.id}: ${leap.name}` : null
}

export default function MilestonesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { baby } = useAppState()
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const {
    achieved,
    achievedCodes,
    ageDays,
    currentBand,
    registerMilestone,
    deleteMilestone,
    loading,
  } = useMilestones(baby?.id, baby?.birthDate)

  const [filter, setFilter] = useState<FilterMode>('all')
  const [registerTarget, setRegisterTarget] = useState<Milestone | null>(null)
  const [celebrationData, setCelebrationData] = useState<{
    milestone: Milestone
    entry: BabyMilestone
  } | null>(null)
  const [shareData, setShareData] = useState<{
    milestone: Milestone
    entry: BabyMilestone
  } | null>(null)
  const [detailEntry, setDetailEntry] = useState<{
    milestone: Milestone
    entry: BabyMilestone
  } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Open register flow from query param (?register=code)
  useEffect(() => {
    const code = searchParams.get('register')
    if (code) {
      const m = MILESTONES.find((x) => x.code === code)
      if (m) setRegisterTarget(m)
      // remove param
      searchParams.delete('register')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const currentBandIdx = AGE_BAND_ORDER.indexOf(currentBand)

  // Progress bar: achieved vs total up to current age (+30 days grace)
  const totalForAge = useMemo(
    () => MILESTONES.filter((m) => m.typicalAgeDaysMin <= ageDays + 30).length,
    [ageDays],
  )
  const achievedWithinAge = useMemo(
    () =>
      achieved.filter((a) => {
        const m = MILESTONES.find((x) => x.code === a.milestoneCode)
        return m && m.typicalAgeDaysMin <= ageDays + 30
      }).length,
    [achieved, ageDays],
  )

  const achievedByCode = useMemo(() => {
    const map = new Map<string, BabyMilestone>()
    achieved.forEach((a) => map.set(a.milestoneCode, a))
    return map
  }, [achieved])

  // Group milestones by age band
  const grouped = useMemo(() => {
    const g: Record<AgeBand, Milestone[]> = {
      newborn: [],
      early: [],
      growing: [],
      weaning: [],
      active: [],
      toddler_early: [],
      toddler: [],
      beyond: [],
    }
    MILESTONES.forEach((m) => {
      if (filter === 'achieved' && !achievedCodes.has(m.code)) return
      if (filter === 'pending' && achievedCodes.has(m.code)) return
      g[m.ageBand].push(m)
    })
    return g
  }, [filter, achievedCodes])

  const handleRegister = async (args: {
    achievedAt: string
    photoDataUrl?: string
    note?: string
  }) => {
    if (!registerTarget) return
    const entry = await registerMilestone(
      registerTarget.code,
      args.achievedAt,
      args.photoDataUrl,
      args.note,
      user?.id,
    )
    if (entry) {
      setCelebrationData({ milestone: registerTarget, entry })
      setRegisterTarget(null)
    } else {
      setToast('Não foi possível salvar. Tente novamente.')
    }
  }

  const handleDelete = async (entry: BabyMilestone) => {
    const ok = await deleteMilestone(entry.id)
    if (ok) {
      setToast('Marco removido')
      setDetailEntry(null)
    }
  }

  if (loading || !baby) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  return (
    <div className="pb-8 page-enter">
      {/* Header */}
      <section className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:bg-surface-container-high"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-xl font-bold text-on-surface truncate">
            Marcos {contractionDe(baby.gender)} {baby.name}
          </h1>
          <p className="font-label text-xs text-on-surface-variant">
            Evoluções do desenvolvimento
          </p>
        </div>
      </section>

      {/* Progress */}
      <section className="px-5 mb-4">
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-end justify-between mb-2">
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
              Progresso até {AGE_BAND_LABEL[currentBand]}
            </span>
            <span className="font-headline text-sm font-bold text-on-surface">
              {achievedWithinAge}/{totalForAge}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-tertiary transition-all"
              style={{
                width: `${totalForAge === 0 ? 0 : (achievedWithinAge / totalForAge) * 100}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-5 mb-3 flex gap-2">
        {(['all', 'achieved', 'pending'] as FilterMode[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              hapticLight()
              setFilter(f)
            }}
            className={`px-4 py-2 rounded-full font-label text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {f === 'all' && 'Todos'}
            {f === 'achieved' && 'Registrados'}
            {f === 'pending' && 'Pendentes'}
          </button>
        ))}
      </section>

      {/* Timeline */}
      <div className="px-5 space-y-5">
        {AGE_BAND_ORDER.map((band, idx) => {
          const items = grouped[band]
          if (items.length === 0) return null
          const isLocked = !isPremium && idx > currentBandIdx

          return (
            <section key={band}>
              <h3 className="font-headline text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>{AGE_BAND_LABEL[band]}</span>
                {band === currentBand && (
                  <span className="font-label text-[9px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full normal-case">
                    Fase atual
                  </span>
                )}
              </h3>

              {isLocked ? (
                <button
                  type="button"
                  onClick={() => setShowPaywall(true)}
                  className="w-full rounded-md p-4 text-left border border-primary/20 bg-primary/[0.04] active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-xl">
                      lock
                    </span>
                    <div className="flex-1">
                      <p className="font-label text-sm text-on-surface">
                        {items.length} marcos nesta fase
                      </p>
                      <p className="font-label text-xs text-primary font-semibold">
                        Desbloquear com Yaya+
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary">
                      chevron_right
                    </span>
                  </div>
                </button>
              ) : (
                <div className="space-y-2">
                  {items.map((m) => {
                    const entry = achievedByCode.get(m.code)
                    const isAchieved = !!entry
                    const isFuture = m.typicalAgeDaysMin > ageDays + 60
                    return (
                      <MilestoneRow
                        key={m.code}
                        milestone={m}
                        entry={entry}
                        birthDate={baby.birthDate}
                        isAchieved={isAchieved}
                        isFuture={isFuture}
                        onClick={() => {
                          hapticLight()
                          if (isAchieved && entry) {
                            setDetailEntry({ milestone: m, entry })
                          } else {
                            setRegisterTarget(m)
                          }
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Register modal */}
      {registerTarget && (
        <MilestoneRegister
          milestone={registerTarget}
          birthDate={baby.birthDate}
          onCancel={() => setRegisterTarget(null)}
          onSave={handleRegister}
        />
      )}

      {/* Celebration */}
      {celebrationData && (
        <MilestoneCelebration
          milestone={celebrationData.milestone}
          babyName={baby.name}
          achievedAt={celebrationData.entry.achievedAt}
          birthDate={baby.birthDate}
          photoUrl={celebrationData.entry.photoUrl}
          note={celebrationData.entry.note}
          onClose={() => setCelebrationData(null)}
          onShare={() => {
            setShareData(celebrationData)
          }}
        />
      )}

      {/* Share image */}
      {shareData && (
        <MilestoneShareImage
          milestone={shareData.milestone}
          babyName={baby.name}
          achievedAt={shareData.entry.achievedAt}
          birthDate={baby.birthDate}
          photoUrl={shareData.entry.photoUrl}
          note={shareData.entry.note}
          onClose={() => setShareData(null)}
        />
      )}

      {/* Detail modal */}
      {detailEntry && (
        <MilestoneDetailModal
          milestone={detailEntry.milestone}
          entry={detailEntry.entry}
          birthDate={baby.birthDate}
          onClose={() => setDetailEntry(null)}
          onDelete={() => handleDelete(detailEntry.entry)}
          onShare={() => {
            setShareData(detailEntry)
            setDetailEntry(null)
          }}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="milestones"
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// ---------- Row ----------

function MilestoneRow({
  milestone,
  entry,
  birthDate,
  isAchieved,
  isFuture,
  onClick,
}: {
  milestone: Milestone
  entry?: BabyMilestone
  birthDate: string
  isAchieved: boolean
  isFuture: boolean
  onClick: () => void
}) {
  const dotClass = isAchieved
    ? 'bg-tertiary border-tertiary'
    : isFuture
      ? 'bg-transparent border-white/15'
      : 'bg-primary/20 border-primary animate-pulse-soft'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-md text-left active:scale-[0.99] transition-transform ${
        isAchieved
          ? 'bg-tertiary/[0.05] border border-tertiary/15'
          : isFuture
            ? 'bg-surface-container/40 border border-white/5'
            : 'bg-surface-container border border-primary/15'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 mt-1.5 flex-shrink-0 ${dotClass}`}
      />
      <span className="text-xl leading-none mt-0.5">{milestone.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h4
            className={`font-headline text-sm font-bold truncate ${
              isAchieved ? 'text-on-surface' : isFuture ? 'text-on-surface/60' : 'text-on-surface'
            }`}
          >
            {milestone.name}
          </h4>
          {isAchieved && entry && (
            <span className="font-label text-[10px] text-tertiary flex-shrink-0">
              {formatAgeAtDate(birthDate, entry.achievedAt)}
            </span>
          )}
        </div>
        <p className="font-label text-xs text-on-surface-variant leading-snug truncate">
          {CATEGORY_LABEL[milestone.category]}
          {isAchieved && entry && (
            <>
              {' · '}
              {new Date(entry.achievedAt + 'T12:00:00').toLocaleDateString(
                'pt-BR',
                { day: '2-digit', month: '2-digit', year: '2-digit' },
              )}
            </>
          )}
        </p>
      </div>
      {isAchieved && entry?.photoUrl && (
        <img
          src={entry.photoUrl}
          alt=""
          className="w-10 h-10 rounded-md object-cover flex-shrink-0"
        />
      )}
      {!isAchieved && !isFuture && (
        <span className="material-symbols-outlined text-on-surface-variant/60 text-base mt-1">
          add_circle
        </span>
      )}
    </button>
  )
}

// ---------- Detail Modal ----------

function MilestoneDetailModal({
  milestone,
  entry,
  birthDate,
  onClose,
  onDelete,
  onShare,
}: {
  milestone: Milestone
  entry: BabyMilestone
  birthDate: string
  onClose: () => void
  onDelete: () => void
  onShare: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const leapInfo = getLeapAtDate(birthDate, entry.achievedAt)
  const dateLabel = new Date(entry.achievedAt + 'T12:00:00').toLocaleDateString(
    'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' },
  )

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl">{milestone.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">
                {milestone.name}
              </h3>
              <p className="font-label text-xs text-tertiary">
                {formatAgeAtDate(birthDate, entry.achievedAt)} · {dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant ml-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {entry.photoUrl && (
          <img
            src={entry.photoUrl}
            alt={milestone.name}
            className="w-full aspect-square object-cover rounded-md mb-4"
          />
        )}

        <p className="font-label text-sm text-on-surface-variant leading-relaxed mb-3">
          {milestone.description}
        </p>

        {entry.note && (
          <div className="bg-white/[0.03] rounded-md p-3 mb-3">
            <p className="font-label text-[10px] text-on-surface-variant/60 uppercase tracking-wider mb-1">
              Nota
            </p>
            <p className="font-body italic text-sm text-on-surface/90 leading-relaxed">
              “{entry.note}”
            </p>
          </div>
        )}

        {leapInfo && (
          <div className="bg-primary/[0.06] border border-primary/15 rounded-md p-3 mb-4 flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">⚡</span>
            <p className="font-label text-xs text-on-surface-variant leading-relaxed">
              {leapInfo}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onShare}
            className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">share</span>
            Compartilhar
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-12 h-12 rounded-md bg-error/10 text-error flex items-center justify-center"
            aria-label="Excluir"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>

        {confirmDelete && (
          <div className="mt-4 bg-error/5 border border-error/20 rounded-md p-4">
            <p className="font-label text-sm text-on-surface mb-3">
              Excluir esse registro de marco? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-md bg-surface-variant text-on-surface-variant font-label text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 py-2 rounded-md bg-error text-on-error font-label text-xs font-semibold"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
