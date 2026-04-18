import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { useMyRole } from '../../hooks/useMyRole'
import { useMyCaregiverPermissions } from '../../hooks/useMyCaregiverPermissions'
import { useVaccines } from './useVaccines'
import {
  VACCINES,
  groupVaccinesByAge,
  type Vaccine,
  type VaccineStatus,
} from './vaccineData'
import { contractionDe } from '../../lib/genderUtils'
import { hapticLight, hapticSuccess } from '../../lib/haptics'
import { PaywallModal } from '../../components/ui/PaywallModal'
import Toast from '../../components/ui/Toast'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { useVaccineUnlock } from './useVaccineUnlock'
import VaccineRow from './components/VaccineRow'
import VaccineDetailSheet from './components/VaccineDetailSheet'
import VaccineApplySheet from './components/VaccineApplySheet'
import { VaccinesSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'

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
  const isPremium = useBabyPremium()
  const myRole = useMyRole()
  const perms = useMyCaregiverPermissions()
  const readOnly = myRole === 'caregiver'

  // Redireciona caregiver sem permissão
  useEffect(() => {
    if (myRole === 'caregiver' && !perms.show_vaccines) {
      navigate('/', { replace: true })
    }
  }, [myRole, perms.show_vaccines, navigate])
  const {
    records,
    statusByCode,
    counts,
    applyVaccine,
    skipVaccine,
    clearRecord,
    quickToggle,
    loading,
  } = useVaccines(baby?.id, baby?.birthDate)

  // Modal de boas-vindas: aparece só na primeira visita à página quando há
  // vacinas auto-registradas (bebê adicionado com idade > 0)
  const autoRegisteredCount = useMemo(
    () => records.filter((r) => r.autoRegistered).length,
    [records],
  )
  // Chave global por user (não por bebê): a explicação sobre auto-registro
  // é idêntica pra qualquer bebê. Mostrar toda vez que troca de bebê era bug.
  const welcomeKey = 'yaya_vaccines_welcome_seen'
  const [welcomeOpen, setWelcomeOpen] = useState(false)

  // Abre quando detecta auto-registradas e ainda não viu
  useEffect(() => {
    if (!welcomeKey || loading) return
    if (autoRegisteredCount === 0) return
    if (localStorage.getItem(welcomeKey) === '1') return
    setWelcomeOpen(true)
  }, [loading, autoRegisteredCount, welcomeKey])

  function dismissWelcome() {
    if (welcomeKey) localStorage.setItem(welcomeKey, '1')
    setWelcomeOpen(false)
  }

  useSheetBackClose(welcomeOpen, dismissWelcome)

  const [filter, setFilter] = useState<FilterMode>('all')
  const [selected, setSelected] = useState<Vaccine | null>(null)
  const [applySheetFor, setApplySheetFor] = useState<Vaccine | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const { ensureUnlocked } = useVaccineUnlock(baby?.id)
  const [toast, setToast] = useState<string | null>(null)

  // Deep link: ?edit=CODE abre o detail sheet direto.
  // Usado pela timeline unificada pra levar o pai pra edição.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const code = searchParams.get('edit')
    if (!code) return
    const v = VACCINES.find((vv) => vv.code === code)
    if (v) setSelected(v)
    // Limpa o queryparam pra não reabrir em próximas renders/back
    searchParams.delete('edit')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Filtra vacinas segundo o chip ativo.
  // Vacinas "skipped" só aparecem na aba "Todas" (e ainda assim no final).
  const filtered = useMemo(() => {
    if (filter === 'all') return VACCINES
    return VACCINES.filter((v) => statusByCode.get(v.code) === filter)
  }, [filter, statusByCode])

  const grouped = useMemo(() => groupVaccinesByAge(filtered), [filtered])

  // Mapa rápido para achar registro (applied ou skipped) pela row/detail
  const recordByCode = useMemo(() => {
    const map = new Map<string, (typeof records)[number]>()
    for (const r of records) map.set(r.vaccineCode, r)
    return map
  }, [records])

  if (!baby || loading) {
    return <VaccinesSkeleton />
  }

  const handleRowTap = (v: Vaccine) => {
    setSelected(v)
  }

  const handleMarkApplied = async () => {
    if (readOnly) return
    if (!selected) return
    // Premium passa direto, free precisa ver rewarded ad (desbloqueia 10min)
    if (!isPremium) {
      const unlocked = await ensureUnlocked()
      if (!unlocked) return
    }
    // Fecha o detail sheet primeiro, depois abre o apply sheet em um novo
    // tick. Isso evita o conflito do `useSheetBackClose` — quando dois
    // sheets se trocam no mesmo ciclo de render, o `history.back()` do
    // cleanup do detail sheet dispara um popstate que o listener do apply
    // sheet (recém montado) captura e fecha tudo.
    const v = selected
    setSelected(null)
    setTimeout(() => setApplySheetFor(v), 0)
  }

  /**
   * Toggle rápido do checkbox: marca/desmarca sem modal, sem data.
   * Se quiser registrar data/local/lote, o user abre a linha.
   */
  const handleCheckboxTap = async (vaccine: Vaccine) => {
    if (readOnly) return
    if (!isPremium) {
      const unlocked = await ensureUnlocked()
      if (!unlocked) return
    }
    hapticLight()
    const wasApplied = statusByCode.get(vaccine.code) === 'applied'
    const ok = await quickToggle(vaccine.code, user?.id)
    if (ok) {
      hapticSuccess()
      setToast(wasApplied ? `${vaccine.name} desmarcada` : `${vaccine.name} marcada como aplicada`)
    }
  }

  const handleSkip = async () => {
    if (readOnly) return
    if (!selected) return
    if (!isPremium) {
      const unlocked = await ensureUnlocked()
      if (!unlocked) return
    }
    const name = selected.name
    const result = await skipVaccine(selected.code, user?.id)
    setSelected(null)
    if (result.ok) {
      setToast(`${name} marcada como "não será aplicada"`)
    }
  }

  const handleReconsider = async () => {
    if (readOnly) return
    if (!selected) return
    const name = selected.name
    const ok = await clearRecord(selected.code)
    setSelected(null)
    if (ok) {
      setToast(`Registro de ${name} removido`)
    }
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
          {(counts.overdue > 0 || counts.canTake > 0 || counts.skipped > 0) && (
            <p className="font-label text-[11px] text-on-surface-variant mt-2">
              {counts.overdue > 0 &&
                `${counts.overdue} ${counts.overdue === 1 ? 'atrasada' : 'atrasadas'}`}
              {counts.overdue > 0 && counts.canTake > 0 && ' · '}
              {counts.canTake > 0 &&
                `${counts.canTake} ${counts.canTake === 1 ? 'pode tomar' : 'podem tomar'}`}
              {(counts.overdue > 0 || counts.canTake > 0) && counts.skipped > 0 && ' · '}
              {counts.skipped > 0 && `${counts.skipped} dispensadas`}
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
          <EmptyState
            emoji="💉"
            title="Nada nesta categoria"
            description="Tente outro filtro pra ver vacinas aplicadas, pendentes ou ainda futuras."
            size="compact"
          />
        )}
        {grouped.map((group) => (
          <div key={group.ageDays}>
            <h2 className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.vaccines.map((v) => {
                const status: VaccineStatus = statusByCode.get(v.code) ?? 'future'
                const record = recordByCode.get(v.code)
                return (
                  <VaccineRow
                    key={v.code}
                    vaccine={v}
                    status={status}
                    appliedAt={record?.appliedAt}
                    autoRegistered={record?.autoRegistered ?? false}
                    onTap={() => handleRowTap(v)}
                    onCheckboxTap={() => handleCheckboxTap(v)}
                    readOnly={readOnly}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Sheets */}
      {selected && (
        <VaccineDetailSheet
          vaccine={selected}
          status={statusByCode.get(selected.code) ?? 'future'}
          record={recordByCode.get(selected.code)}
          isPremium={isPremium}
          onClose={() => setSelected(null)}
          onMarkApplied={handleMarkApplied}
          onSkip={handleSkip}
          onReconsider={handleReconsider}
          readOnly={readOnly}
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
        trigger="generic"
      />

      {/* Welcome modal — primeira visita quando há vacinas auto-registradas */}
      {welcomeOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-6"
          onClick={(e) => e.target === e.currentTarget && dismissWelcome()}
        >
          <div className="w-full max-w-md bg-surface-container-highest rounded-md p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>vaccines</span>
              </span>
              <h3 className="font-headline text-lg font-bold text-on-surface leading-tight">
                Caderneta {contractionDe(baby.gender)} {baby.name}
              </h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-4">
              Marcamos automaticamente as <strong className="text-on-surface">{autoRegisteredCount}</strong> {autoRegisteredCount === 1 ? 'vacina obrigatória (PNI) que provavelmente já foi aplicada' : 'vacinas obrigatórias (PNI) que provavelmente já foram aplicadas'}, com base na idade.
            </p>
            <p className="font-body text-xs text-on-surface-variant/80 leading-relaxed mb-5">
              Revise a lista e desmarque caso alguma não tenha sido aplicada. Você pode tocar na linha para adicionar data, local e lote.
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
