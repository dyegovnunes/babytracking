import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useVaccines } from './useVaccines'
import {
  VACCINES,
  groupVaccinesByAge,
  type Vaccine,
  type VaccineStatus,
} from './vaccineData'
import { contractionDe } from '../../lib/genderUtils'
import { hapticLight } from '../../lib/haptics'
import { PaywallModal } from '../../components/ui/PaywallModal'
import Toast from '../../components/ui/Toast'
import VaccineRow from './components/VaccineRow'
import VaccineDetailSheet from './components/VaccineDetailSheet'
import VaccineApplySheet from './components/VaccineApplySheet'

type FilterMode = 'all' | 'can_take' | 'overdue' | 'applied'

const FILTER_LABEL: Record<FilterMode, string> = {
  all: 'Todas',
  can_take: 'Pode tomar',
  overdue: 'Atrasadas',
  applied: 'Aplicadas',
}

const DISCLAIMER =
  'Este calendário é baseado no PNI (SUS) e nas recomendações da SBP. Serve como apoio para organização da rotina. Consulte sempre o pediatra do seu bebê antes de vacinar.'

export default function VaccinesPage() {
  const navigate = useNavigate()
  const { baby } = useAppState()
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const {
    applied,
    statusByCode,
    counts,
    applyVaccine,
    loading,
  } = useVaccines(baby?.id, baby?.birthDate)

  const [filter, setFilter] = useState<FilterMode>('all')
  const [selected, setSelected] = useState<Vaccine | null>(null)
  const [applySheetFor, setApplySheetFor] = useState<Vaccine | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Filtra vacinas segundo o chip ativo
  const filtered = useMemo(() => {
    if (filter === 'all') return VACCINES
    return VACCINES.filter((v) => statusByCode.get(v.code) === filter)
  }, [filter, statusByCode])

  const grouped = useMemo(() => groupVaccinesByAge(filtered), [filtered])

  // Mapa rápido para achar registro aplicado (para mostrar data na row e no detail)
  const appliedByCode = useMemo(() => {
    const map = new Map<string, (typeof applied)[number]>()
    for (const a of applied) map.set(a.vaccineCode, a)
    return map
  }, [applied])

  if (!baby) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  const handleRowTap = (v: Vaccine) => {
    setSelected(v)
  }

  const handleMarkApplied = () => {
    if (!selected) return
    if (!isPremium) {
      setSelected(null)
      setShowPaywall(true)
      return
    }
    setApplySheetFor(selected)
    setSelected(null)
  }

  return (
    <div className="pb-28 page-enter">
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
            Caderneta {contractionDe(baby.gender)} {baby.name}
          </h1>
          <p className="font-label text-xs text-on-surface-variant">
            Calendário de vacinas PNI + SBP
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="px-5 mb-4">
        <div className="p-3 rounded-md bg-surface-container border border-primary/15">
          <div className="flex gap-2 items-start">
            <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">
              info
            </span>
            <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
              {DISCLAIMER}
            </p>
          </div>
        </div>
      </section>

      {/* Progresso */}
      <section className="px-5 mb-4">
        <div className="bg-surface-container rounded-md p-4">
          <div className="flex items-end justify-between mb-2">
            <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
              Aplicadas
            </span>
            <span className="font-headline text-sm font-bold text-on-surface">
              {counts.applied}/{counts.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-tertiary transition-all"
              style={{
                width: `${counts.total === 0 ? 0 : (counts.applied / counts.total) * 100}%`,
              }}
            />
          </div>
          {(counts.overdue > 0 || counts.canTake > 0) && (
            <p className="font-label text-[11px] text-on-surface-variant mt-2">
              {counts.overdue > 0 &&
                `${counts.overdue} ${counts.overdue === 1 ? 'atrasada' : 'atrasadas'}`}
              {counts.overdue > 0 && counts.canTake > 0 && ' · '}
              {counts.canTake > 0 &&
                `${counts.canTake} ${counts.canTake === 1 ? 'pode tomar' : 'podem tomar'}`}
            </p>
          )}
        </div>
      </section>

      {/* Filtros */}
      <section className="px-5 mb-3 flex gap-2 overflow-x-auto scrollbar-none">
        {(['all', 'can_take', 'overdue', 'applied'] as FilterMode[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              hapticLight()
              setFilter(f)
            }}
            className={`px-4 py-2 rounded-full font-label text-xs font-semibold transition-colors whitespace-nowrap ${
              filter === f
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
            }`}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </section>

      {/* Lista agrupada */}
      <section className="px-5 space-y-5">
        {grouped.length === 0 && (
          <div className="py-10 text-center">
            <p className="font-body text-sm text-on-surface-variant">
              Nenhuma vacina nesta categoria.
            </p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.ageDays}>
            <h2 className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.vaccines.map((v) => {
                const status: VaccineStatus = statusByCode.get(v.code) ?? 'future'
                const appliedRecord = appliedByCode.get(v.code)
                return (
                  <VaccineRow
                    key={v.code}
                    vaccine={v}
                    status={status}
                    appliedAt={appliedRecord?.appliedAt}
                    onTap={() => handleRowTap(v)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Banner paywall (free) */}
      {!isPremium && (
        <section className="px-5 mt-6">
          <button
            type="button"
            onClick={() => {
              hapticLight()
              setShowPaywall(true)
            }}
            className="w-full p-4 rounded-md bg-gradient-to-br from-primary/15 to-tertiary/10 border border-primary/25 text-left active:opacity-90"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">
                lock_open
              </span>
              <span className="font-headline text-sm font-bold text-on-surface">
                Yaya+
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Marque vacinas como aplicadas e receba lembretes para nunca atrasar
              o calendário do seu bebê.
            </p>
          </button>
        </section>
      )}

      {/* Sheets */}
      {selected && (
        <VaccineDetailSheet
          vaccine={selected}
          status={statusByCode.get(selected.code) ?? 'future'}
          applied={appliedByCode.get(selected.code)}
          isPremium={isPremium}
          onClose={() => setSelected(null)}
          onMarkApplied={handleMarkApplied}
        />
      )}

      {applySheetFor && baby.birthDate && (
        <VaccineApplySheet
          vaccine={applySheetFor}
          birthDate={baby.birthDate}
          onClose={() => setApplySheetFor(null)}
          onSave={async (input) => {
            const result = await applyVaccine(
              applySheetFor.code,
              input,
              user?.id,
            )
            if (result.ok) {
              setToast(`${applySheetFor.name} marcada como aplicada`)
            }
            return result
          }}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="vaccines"
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
