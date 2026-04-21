import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { useMyRole } from '../../hooks/useMyRole'
import { useMyCaregiverPermissions } from '../../hooks/useMyCaregiverPermissions'
import { useMilestones } from './useMilestones'
import {
  MILESTONES,
  AGE_BAND_ORDER,
  AGE_BAND_LABEL,
  CATEGORY_LABEL,
  CATEGORY_CHIP_CLASS,
  formatAgeAtDate,
  type Milestone,
  type BabyMilestone,
} from './milestoneData'
import type { AgeBand } from '../../lib/ageUtils'
import { DEVELOPMENT_LEAPS } from './developmentLeaps'
import MilestoneCelebration from './components/MilestoneCelebration'
import { PaywallModal } from '../../components/ui/PaywallModal'
import Toast from '../../components/ui/Toast'
import { hapticLight } from '../../lib/haptics'
import { contractionDe } from '../../lib/genderUtils'
import { maybeShowInterstitialOncePerDay } from '../../lib/admob'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { MilestonesSkeleton } from '../../components/ui/Skeleton'
import { motion } from 'framer-motion'
import { spring as motionSpring, triggerPreset } from '../../lib/motion'

const springDelight = motionSpring.delight

type FilterMode = 'all' | 'achieved' | 'pending'

function getLeapAtDate(
  birthDate: string,
  achievedAt: string | null,
): string | null {
  if (!achievedAt) return null
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
  const isPremium = useBabyPremium()
  const myRole = useMyRole()
  const perms = useMyCaregiverPermissions()
  const readOnly = myRole === 'caregiver'
  const {
    achieved,
    achievedCodes,
    ageDays,
    currentBand,
    registerMilestone,
    deleteMilestone,
    quickToggle,
    loading,
  } = useMilestones(baby?.id, baby?.birthDate)

  // Redireciona caregiver sem permissão (acesso via URL direto)
  useEffect(() => {
    if (myRole === 'caregiver' && !perms.show_milestones) {
      navigate('/', { replace: true })
    }
  }, [myRole, perms.show_milestones, navigate])

  const [filter, setFilter] = useState<FilterMode>('all')
  const [celebrationData, setCelebrationData] = useState<{
    milestone: Milestone
    entry: BabyMilestone
  } | null>(null)
  // Detail modal aceita entry opcional — quando não tem entry (marco ainda
  // não registrado), mostra info do marco + botão "Marcar como concluído".
  const [detailEntry, setDetailEntry] = useState<{
    milestone: Milestone
    entry: BabyMilestone | null
  } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Interstitial skippable na primeira visita do dia (só free)
  useEffect(() => {
    if (!isPremium) {
      maybeShowInterstitialOncePerDay('milestones').catch(() => {})
    }
  }, [isPremium])

  // Open detail from query param (?register=code) — mantido pra retrocompat
  // de deeplinks. Abre o detail com entry=null (não registrado).
  useEffect(() => {
    const code = searchParams.get('register')
    if (code) {
      const m = MILESTONES.find((x) => x.code === code)
      if (m) setDetailEntry({ milestone: m, entry: null })
      searchParams.delete('register')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Open detail modal from query param (?edit=code). Usado pela timeline
  // unificada pra levar o pai direto à edição do marco registrado.
  useEffect(() => {
    const code = searchParams.get('edit')
    if (!code) return
    const m = MILESTONES.find((x) => x.code === code)
    const entry = achieved.find((a) => a.milestoneCode === code)
    if (m && entry) {
      setDetailEntry({ milestone: m, entry })
    }
    searchParams.delete('edit')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, achieved])


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

  // Contagem de marcos auto-registrados (para o banner informativo)
  const autoRegisteredCount = useMemo(
    () => achieved.filter((a) => a.autoRegistered).length,
    [achieved],
  )

  // Modal de boas-vindas: aparece só na primeira visita à página quando há
  // marcos auto-registrados (bebê adicionado com idade > 14 dias).
  // Chave POR BEBÊ pra evitar reaparecer ao trocar bebê e pra ser resiliente
  // a limpezas parciais de localStorage. Se não há baby ainda, não mostra.
  const welcomeKey = baby?.id ? `yaya_milestones_welcome_seen_${baby.id}` : null
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  useEffect(() => {
    if (!welcomeKey || loading) return
    if (autoRegisteredCount === 0) return
    if (localStorage.getItem(welcomeKey) === '1') return
    // Limpa flag antigo global pra não pular welcome legítimo de outro bebê
    try { localStorage.removeItem('yaya_milestones_welcome_seen') } catch { /* ignore */ }
    setWelcomeOpen(true)
  }, [loading, autoRegisteredCount, welcomeKey])

  function dismissWelcome() {
    if (welcomeKey) localStorage.setItem(welcomeKey, '1')
    setWelcomeOpen(false)
  }
  useSheetBackClose(welcomeOpen, dismissWelcome)

  // "Esperados agora": marcos não registrados da faixa atual + próxima faixa
  const expectedNow = useMemo(() => {
    const idx = AGE_BAND_ORDER.indexOf(currentBand)
    const relevantBands = new Set([
      currentBand,
      AGE_BAND_ORDER[idx + 1],
    ].filter(Boolean) as AgeBand[])
    return MILESTONES.filter(
      (m) => relevantBands.has(m.ageBand) && !achievedCodes.has(m.code),
    ).slice(0, 6)
  }, [currentBand, achievedCodes])

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
      // "Esperados" = não registrado E na faixa de tempo relevante (até idade+60d)
      if (filter === 'pending') {
        if (achievedCodes.has(m.code)) return
        if (m.typicalAgeDaysMin > ageDays + 60) return
      }
      g[m.ageBand].push(m)
    })
    return g
  }, [filter, achievedCodes, ageDays])

  // Marca o marco como concluído a partir do detail modal (versão sem
  // entry). Usa registerMilestone com achievedAt = hoje — pai pode
  // ajustar depois abrindo o detail. Esse fluxo substitui o antigo
  // MilestoneRegister (que pedia data + foto + nota num form).
  const handleRegisterFromDetail = async (m: Milestone) => {
    const today = new Date()
    const y = today.getFullYear()
    const mo = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const entry = await registerMilestone(
      m.code,
      `${y}-${mo}-${d}`,
      undefined,
      undefined,
      user?.id,
    )
    if (entry) {
      setCelebrationData({ milestone: m, entry })
      setDetailEntry(null)
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

  // Toggle simples do checkbox — marca sem data ou desmarca
  // hapticMedium sincronizado com o spring delight do checkbox.
  const handleCheckboxTap = async (code: string, isAchieved: boolean) => {
    triggerPreset('delight')
    const ok = await quickToggle(code, user?.id)
    if (ok) setToast(isAchieved ? 'Marco desmarcado' : 'Marco registrado')
  }

  if (loading || !baby) {
    return <MilestonesSkeleton />
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
            {f === 'pending' && 'Esperados'}
          </button>
        ))}
      </section>

      {/* Esperados agora — marcos da faixa atual e próxima ainda não registrados */}
      {filter === 'all' && expectedNow.length > 0 && (
        <section className="px-5 mb-5">
          <h3 className="font-headline text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">visibility</span>
            Esperados agora
          </h3>
          <div className="space-y-2">
            {expectedNow.map((m) => (
              <MilestoneRow
                key={`expected-${m.code}`}
                milestone={m}
                entry={undefined}
                birthDate={baby.birthDate}
                isAchieved={false}
                isFuture={false}
                onRowClick={() => {
                  hapticLight()
                  setDetailEntry({ milestone: m, entry: null })
                }}
                onCheckboxClick={() => {
                  if (readOnly) return
                  handleCheckboxTap(m.code, false)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <div className="px-5 space-y-5">
        {AGE_BAND_ORDER.map((band) => {
          const items = grouped[band]
          if (items.length === 0) return null

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
                        onRowClick={() => {
                          hapticLight()
                          // Sempre abre o detail — com entry se já registrado,
                          // sem entry se ainda não registrado. A ação de
                          // marcar/desmarcar fica só no checkbox da linha.
                          setDetailEntry({
                            milestone: m,
                            entry: isAchieved && entry ? entry : null,
                          })
                        }}
                        onCheckboxClick={() => {
                          if (readOnly) return
                          handleCheckboxTap(m.code, isAchieved)
                        }}
                      />
                    )
                  })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Register modal removido — ação de marcar fica no checkbox da
          linha ou no botão "Marcar como concluído" dentro do detail. */}

      {/* Celebration — share desativado temporariamente (image gen não
          confiável em iOS; voltar depois do lançamento). */}
      {celebrationData && (
        <MilestoneCelebration
          milestone={celebrationData.milestone}
          babyName={baby.name}
          achievedAt={celebrationData.entry.achievedAt ?? ''}
          birthDate={baby.birthDate}
          photoUrl={celebrationData.entry.photoUrl}
          note={celebrationData.entry.note}
          onClose={() => setCelebrationData(null)}
        />
      )}

      {/* Detail modal — share desativado junto com celebration.
          Quando entry é null, modal mostra info do marco + botão
          "Marcar como concluído". Quando tem entry, mostra os dados
          completos (data, idade, leap info, nota, delete). */}
      {detailEntry && (
        <MilestoneDetailModal
          milestone={detailEntry.milestone}
          entry={detailEntry.entry}
          birthDate={baby.birthDate}
          onClose={() => setDetailEntry(null)}
          onDelete={detailEntry.entry ? () => handleDelete(detailEntry.entry!) : undefined}
          onRegister={!detailEntry.entry ? () => handleRegisterFromDetail(detailEntry.milestone) : undefined}
          readOnly={readOnly}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="generic"
      />

      {/* Welcome modal — primeira visita quando há marcos auto-registrados */}
      {welcomeOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
          onClick={(e) => e.target === e.currentTarget && dismissWelcome()}
        >
          <div className="w-full max-w-md bg-surface-container-highest rounded-md p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
              </span>
              <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">
                Marcos {contractionDe(baby.gender)} {baby.name}
              </h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-4">
              Marcamos automaticamente <strong className="text-on-surface">{autoRegisteredCount}</strong> {autoRegisteredCount === 1 ? 'marco que o bebê provavelmente já atingiu' : 'marcos que o bebê provavelmente já atingiu'} com base na idade.
            </p>
            <p className="font-body text-xs text-on-surface-variant/80 leading-relaxed mb-5">
              Revise a lista e desmarque caso algum não tenha acontecido. Toque na linha para adicionar data, foto ou nota — ótimo para guardar a lembrança.
            </p>
            <button
              type="button"
              onClick={() => { hapticLight(); dismissWelcome() }}
              className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

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
  onRowClick,
  onCheckboxClick,
}: {
  milestone: Milestone
  entry?: BabyMilestone
  birthDate: string
  isAchieved: boolean
  isFuture: boolean
  onRowClick: () => void
  onCheckboxClick: () => void
}) {
  const isAutoRegistered = isAchieved && entry?.autoRegistered === true

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRowClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick() } }}
      className={`w-full flex items-start gap-3 p-3 rounded-md text-left cursor-pointer active:scale-[0.99] transition-transform ${
        isAchieved
          ? 'bg-primary/[0.05] border border-primary/15'
          : isFuture
            ? 'bg-surface-container/40 border border-white/5'
            : 'bg-surface-container border border-primary/15'
      }`}
    >
      <span className="text-xl leading-none mt-0.5 flex-shrink-0">{milestone.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={`font-headline text-sm font-bold ${
              isAchieved ? 'text-on-surface' : isFuture ? 'text-on-surface/60' : 'text-on-surface'
            }`}
          >
            {milestone.name}
          </h4>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_CHIP_CLASS[milestone.category]}`}>
            {CATEGORY_LABEL[milestone.category]}
          </span>
          {isAchieved && entry?.achievedAt && (
            <span className="font-label text-[10px] text-primary flex-shrink-0">
              {formatAgeAtDate(birthDate, entry.achievedAt)}
            </span>
          )}
        </div>
        {isAchieved && entry ? (
          entry.achievedAt ? (
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              {new Date(entry.achievedAt + 'T12:00:00').toLocaleDateString(
                'pt-BR',
                { day: '2-digit', month: '2-digit', year: '2-digit' },
              )}
            </p>
          ) : isAutoRegistered ? (
            <p className="font-label text-[10px] text-on-surface-variant/60 italic mt-0.5">
              Marcado automaticamente
            </p>
          ) : null
        ) : (
          <p className="font-label text-xs text-on-surface-variant/70 leading-snug mt-0.5 truncate">
            {milestone.description}
          </p>
        )}
      </div>
      {isAchieved && entry?.photoUrl && (
        <img
          src={entry.photoUrl}
          alt=""
          className="w-10 h-10 rounded-md object-cover flex-shrink-0"
        />
      )}
      {/* Checkbox à direita — spring delight ao alternar, hapticMedium */}
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCheckboxClick() }}
        aria-label={isAchieved ? 'Desmarcar' : 'Marcar como alcançado'}
        whileTap={{ scale: 0.85 }}
        transition={springDelight}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isFuture ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <motion.span
          key={isAchieved ? 'on' : 'off'}
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={springDelight}
          className={`material-symbols-outlined text-[28px] ${
            isAchieved ? 'text-primary' : 'text-on-surface-variant/40'
          }`}
          style={isAchieved ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {isAchieved ? 'check_circle' : 'radio_button_unchecked'}
        </motion.span>
      </motion.button>
    </div>
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
  onRegister,
  readOnly = false,
}: {
  milestone: Milestone
  entry: BabyMilestone | null
  birthDate: string
  onClose: () => void
  onDelete?: () => void
  onShare?: () => void
  /** Quando entry é null, mostra botão "Marcar como concluído". */
  onRegister?: () => void
  readOnly?: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [registering, setRegistering] = useState(false)
  useSheetBackClose(true, onClose)
  const leapInfo = entry ? getLeapAtDate(birthDate, entry.achievedAt) : null
  const dateLabel = entry?.achievedAt
    ? new Date(entry.achievedAt + 'T12:00:00').toLocaleDateString(
        'pt-BR',
        { day: '2-digit', month: 'long', year: 'numeric' },
      )
    : null

  // Faixa etária típica quando não tem entry — ajuda o pai a saber
  // quando o marco costuma aparecer.
  const typicalAgeLabel = (() => {
    const min = milestone.typicalAgeDaysMin
    const max = milestone.typicalAgeDaysMax
    const toMonths = (d: number) => Math.round(d / 30)
    if (min < 30 && max < 30) return `típico: ${min}-${max} dias`
    return `típico: ${toMonths(min)}-${toMonths(max)} meses`
  })()

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-sheet max-h-[92vh] overflow-y-auto animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl">{milestone.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">
                {milestone.name}
              </h3>
              <p className="font-label text-xs text-tertiary">
                {entry
                  ? (entry.achievedAt && dateLabel
                      ? `${formatAgeAtDate(birthDate, entry.achievedAt)} · ${dateLabel}`
                      : 'Data não informada')
                  : typicalAgeLabel}
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

        {entry?.photoUrl && (
          <img
            src={entry.photoUrl}
            alt={milestone.name}
            className="w-full aspect-square object-cover rounded-md mb-4"
          />
        )}

        <p className="font-label text-sm text-on-surface-variant leading-relaxed mb-3">
          {milestone.description}
        </p>

        {entry?.note && (
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
          {/* Marco não registrado: botão principal "Marcar como concluído" */}
          {!entry && onRegister && !readOnly && (
            <button
              type="button"
              disabled={registering}
              onClick={async () => {
                setRegistering(true)
                try { await onRegister() } finally { setRegistering(false) }
              }}
              className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              {registering ? 'Registrando...' : 'Marcar como concluído'}
            </button>
          )}
          {/* Marco registrado: share (desativado) + delete */}
          {entry && onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">share</span>
              Compartilhar
            </button>
          )}
          {entry && !readOnly && onDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-12 h-12 rounded-md bg-error/10 text-error flex items-center justify-center"
              aria-label="Excluir"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
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
                onClick={() => onDelete?.()}
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
