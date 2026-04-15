import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePremium } from '../../hooks/usePremium'
import { useTimer } from '../../hooks/useTimer'
import { useMedications } from './useMedications'
import { contractionDe } from '../../lib/genderUtils'
import { hapticLight } from '../../lib/haptics'
import { PaywallModal } from '../../components/ui/PaywallModal'
import Toast from '../../components/ui/Toast'
import MedicationCard from './components/MedicationCard'
import MedicationForm from './components/MedicationForm'
import MedicationAdminSheet from './components/MedicationAdminSheet'
import type { Medication } from './medicationData'

const DISCLAIMER =
  'O Yaya ajuda a organizar a rotina de medicamentos. Sempre siga as orientações do pediatra — dosagens, horários e duração devem ser prescritos por um profissional.'

export default function MedicationsPage() {
  const navigate = useNavigate()
  const { baby, members } = useAppState()
  const { user } = useAuth()
  const { isPremium } = usePremium()
  const now = useTimer()

  // Mapeia userId → displayName
  const membersById = useMemo(() => {
    const map: Record<string, string> = {}
    if (members) {
      for (const [uid, m] of Object.entries(members)) {
        map[uid] = m.displayName
      }
    }
    // Inclui o próprio usuário se não estiver nos members
    if (user?.id && !map[user.id]) {
      map[user.id] =
        (user as any)?.user_metadata?.full_name ||
        (user as any)?.user_metadata?.display_name ||
        'Você'
    }
    return map
  }, [members, user])

  const {
    activeMedications,
    archivedMedications,
    todayLogs,
    dayStatuses,
    loading,
    addMedication,
    administerDose,
    deleteLog,
    deactivateMedication,
  } = useMedications(baby?.id, membersById, now)

  const [formOpen, setFormOpen] = useState(false)
  const [adminFor, setAdminFor] = useState<Medication | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

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

  const handleAddPress = () => {
    hapticLight()
    if (!isPremium && activeMedications.length >= 1) {
      setShowPaywall(true)
      return
    }
    setFormOpen(true)
  }

  const handleSaveMedication = async (
    input: Parameters<typeof addMedication>[0],
  ) => {
    const result = await addMedication(input, user?.id)
    if (result.ok) {
      setToast(`${input.name} cadastrado`)
      return true
    }
    if (result.error === 'not_premium_limit') {
      setShowPaywall(true)
    }
    return false
  }

  const handleGiveNow = async (): Promise<boolean> => {
    if (!adminFor) return false
    const result = await administerDose(adminFor.id, null, user?.id)
    if (result.ok) {
      setToast(`Dose de ${adminFor.name} registrada`)
      return true
    }
    return false
  }

  const handleGiveAt = async (when: Date): Promise<boolean> => {
    if (!adminFor) return false
    const result = await administerDose(adminFor.id, when, user?.id)
    if (result.ok) {
      setToast(`Dose de ${adminFor.name} registrada`)
      return true
    }
    return false
  }

  const handleDeleteLog = async (logId: string): Promise<boolean> => {
    const result = await deleteLog(logId)
    if (result.ok) {
      setToast('Registro removido')
      return true
    }
    return false
  }

  const handleDeactivate = async (): Promise<boolean> => {
    if (!adminFor) return false
    const name = adminFor.name
    const result = await deactivateMedication(adminFor.id)
    if (result.ok) {
      setToast(`${name} encerrado`)
      return true
    }
    return false
  }

  const handleQuickApply = async (medicationId: string, medicationName: string) => {
    const result = await administerDose(medicationId, null, user?.id)
    if (result.ok) {
      setToast(`Dose de ${medicationName} registrada`)
    }
  }

  // Status do medicamento aberto (AdminSheet)
  const adminStatus = useMemo(
    () => (adminFor ? dayStatuses.find((s) => s.medication.id === adminFor.id) ?? null : null),
    [adminFor, dayStatuses],
  )

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
            Medicamentos
          </h1>
          <p className="font-label text-xs text-on-surface-variant">
            Controle o que {contractionDe(baby.gender)} {baby.name} está tomando
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

      {/* Ativos */}
      <section className="px-5 mb-4">
        <h2 className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 px-1">
          Ativos agora
        </h2>
        {activeMedications.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container mx-auto mb-3 flex items-center justify-center">
              <span className="text-3xl">💊</span>
            </div>
            <p className="font-body text-sm text-on-surface-variant mb-1">
              Nenhum medicamento ativo
            </p>
            <p className="font-label text-xs text-on-surface-variant/70">
              Cadastre remédios, vitaminas e suplementos
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayStatuses.map((status) => (
              <MedicationCard
                key={status.medication.id}
                status={status}
                onTap={() => setAdminFor(status.medication)}
                onQuickApply={() =>
                  handleQuickApply(status.medication.id, status.medication.name)
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Adicionar */}
      <section className="px-5 mb-4">
        <button
          type="button"
          onClick={handleAddPress}
          className="w-full py-3 rounded-md bg-primary/10 border border-primary/25 text-primary font-label text-xs font-bold flex items-center justify-center gap-2 active:bg-primary/15"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Adicionar medicamento
        </button>
      </section>

      {/* Encerrados (Yaya+) */}
      {archivedMedications.length > 0 && (
        <section className="px-5 mb-4">
          <button
            type="button"
            onClick={() => {
              hapticLight()
              setShowArchived((v) => !v)
            }}
            className="w-full py-2 text-left font-label text-xs font-semibold text-on-surface-variant flex items-center gap-1 active:text-on-surface"
          >
            <span className="material-symbols-outlined text-base">
              {showArchived ? 'expand_less' : 'expand_more'}
            </span>
            Ver encerrados ({archivedMedications.length})
          </button>
          {showArchived && (
            <div className="space-y-2 mt-2">
              {archivedMedications.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-md bg-surface-container/50 border border-white/5 opacity-70"
                >
                  <p className="font-headline text-sm font-bold text-on-surface">
                    {m.name}
                  </p>
                  <p className="font-body text-xs text-on-surface-variant">
                    {m.dosage} · encerrado
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Banner free */}
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
              Cadastre medicamentos ilimitados, receba lembretes de horário e
              veja o histórico completo.
            </p>
          </button>
        </section>
      )}

      {/* Form */}
      <MedicationForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveMedication}
      />

      {/* Admin sheet */}
      {adminFor && adminStatus && (
        <MedicationAdminSheet
          status={adminStatus}
          todayLogs={todayLogs}
          membersById={membersById}
          onClose={() => setAdminFor(null)}
          onGiveNow={handleGiveNow}
          onGiveAt={handleGiveAt}
          onDeleteLog={handleDeleteLog}
          onDeactivate={handleDeactivate}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="medications"
      />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
