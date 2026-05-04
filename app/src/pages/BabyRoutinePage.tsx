import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../contexts/AppContext'
import { setTrailKey } from '../lib/analytics'
import { useNotificationPrefs } from './settings/useNotificationPrefs'
import { useBathHours } from './settings/useBathHours'
import { useMyRole } from '../hooks/useMyRole'
import { useMyCaregiverPermissions } from '../hooks/useMyCaregiverPermissions'
import IntervalsSection from './settings/sections/IntervalsSection'
import BathSection from './settings/sections/BathSection'
import CustomIntervalModal from './settings/modals/CustomIntervalModal'
import QuietHourPickerModal from './settings/modals/QuietHourPickerModal'
import BathHourPickerModal from './settings/modals/BathHourPickerModal'
import InfoModals, { type InfoModalKind } from './settings/modals/InfoModals'
import Toast from '../components/ui/Toast'
import { contractionDe } from '../lib/genderUtils'

export default function BabyRoutinePage() {
  const navigate = useNavigate()
  const { baby } = useAppState()
  const { prefs, savePrefs } = useNotificationPrefs()
  const { addBathHour } = useBathHours()
  const myRole = useMyRole()
  const caregiverPerms = useMyCaregiverPermissions()
  const canEdit = myRole !== 'caregiver' || (caregiverPerms.edit_routine ?? false)

  const [toast, setToast] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)
  const [infoModal, setInfoModal] = useState<InfoModalKind>(null)

  const handleToggleExpanded = useCallback((cat: string) => {
    setExpanded((prev) => (prev === cat ? null : cat))
  }, [])

  const handleSavePrefs = useCallback(
    async (updated: Parameters<typeof savePrefs>[0]) => {
      const ok = await savePrefs(updated)
      if (!ok) {
        setToast('Erro ao salvar preferências')
      } else if (baby?.id) {
        setTrailKey('routine_configured', baby.id)
      }
    },
    [savePrefs, baby?.id],
  )

  const handlePickBathHour = useCallback(
    async (hour: number) => {
      const res = await addBathHour(hour)
      if (res === 'ok') {
        setToast('Horário adicionado!')
        setPickingBathHour(false)
        if (baby?.id) setTrailKey('routine_configured', baby.id)
      } else if (res === 'duplicate') {
        setToast('Horário já existe')
      } else if (res === 'max') {
        setToast('Máximo de 4 horários')
      } else {
        setToast('Erro ao salvar')
      }
    },
    [addBathHour],
  )

  if (!baby) return null

  return (
    <div className="pb-4 page-enter">
      {/* Header */}
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Rotina {contractionDe(baby.gender)} {baby.name}
          </h1>
        </div>
      </section>

      {/* Banner de restrição para caregiver sem permissão */}
      {!canEdit && (
        <div className="mx-5 mb-4 bg-surface-container rounded-md p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-xl mt-0.5">lock</span>
          <p className="font-label text-sm text-on-surface-variant leading-relaxed">
            Somente pais e responsáveis podem alterar a rotina. Peça ao responsável para liberar
            nas configurações de cuidador.
          </p>
        </div>
      )}

      <div className="px-5 space-y-5">
        {canEdit ? (
          <>
            <IntervalsSection
              expanded={expanded}
              onToggleExpanded={handleToggleExpanded}
              onOpenCustom={(cat) => setCustomModal(cat)}
              onSaved={() => { setToast('Atualizado!'); if (baby?.id) setTrailKey('routine_configured', baby.id) }}
              onError={(msg) => setToast(msg)}
              prefs={prefs}
              onSavePrefs={handleSavePrefs}
              onOpenQuietPicker={(which) => setPickingQuietHour(which)}
              onOpenInfo={() => setInfoModal('sleep')}
            />

            <BathSection
              onOpenPicker={() => setPickingBathHour(true)}
              onToast={setToast}
            />
          </>
        ) : (
          /* Modo leitura: exibir resumo dos valores sem controles de edição */
          <ReadOnlyRoutineSummary prefs={prefs} />
        )}
      </div>

      {/* Modais — só montados se canEdit */}
      {canEdit && (
        <>
          <CustomIntervalModal
            cat={customModal}
            onClose={() => setCustomModal(null)}
            onSaved={() => { setToast('Intervalo salvo!'); if (baby?.id) setTrailKey('routine_configured', baby.id) }}
          />
          <QuietHourPickerModal
            which={pickingQuietHour}
            prefs={prefs}
            onSave={handleSavePrefs}
            onClose={() => setPickingQuietHour(null)}
          />
          <BathHourPickerModal
            isOpen={pickingBathHour}
            onPick={handlePickBathHour}
            onClose={() => setPickingBathHour(false)}
          />
          <InfoModals kind={infoModal} onClose={() => setInfoModal(null)} />
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// Resumo somente-leitura para caregivers sem permissão de edição
function ReadOnlyRoutineSummary({ prefs }: { prefs: ReturnType<typeof useNotificationPrefs>['prefs'] }) {
  const { intervals } = useAppState()
  const feedMinutes = intervals['breast_left']?.minutes ?? intervals['breast_both']?.minutes ?? intervals['bottle']?.minutes ?? 180
  const diaperMinutes = intervals['diaper_wet']?.minutes ?? 120
  const napMinutes = intervals['sleep']?.minutes ?? 90
  const bathHours = intervals['bath']?.scheduledHours ?? [18]

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h${m}min` : `${h}h`
  }

  const padH = (h: number) => `${String(h).padStart(2, '0')}:00`

  return (
    <div className="space-y-3">
      <div className="bg-surface-container rounded-md p-4">
        <h2 className="font-headline text-sm font-bold text-on-surface mb-3">Intervalos</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-label text-sm text-on-surface-variant">Amamentação</span>
            <span className="font-label text-sm text-on-surface font-semibold">{formatInterval(feedMinutes)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-label text-sm text-on-surface-variant">Fralda</span>
            <span className="font-label text-sm text-on-surface font-semibold">{formatInterval(diaperMinutes)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-label text-sm text-on-surface-variant">Soneca</span>
            <span className="font-label text-sm text-on-surface font-semibold">{formatInterval(napMinutes)}</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container rounded-md p-4">
        <h2 className="font-headline text-sm font-bold text-on-surface mb-3">Banho</h2>
        <div className="flex flex-wrap gap-2">
          {[...bathHours].sort((a, b) => a - b).map((h) => (
            <span key={h} className="bg-surface-container-low rounded-md px-3 py-1.5 font-headline text-sm font-bold text-on-surface">
              {padH(h)}
            </span>
          ))}
        </div>
      </div>

      {prefs.quietHours.enabled && (
        <div className="bg-surface-container rounded-md p-4">
          <h2 className="font-headline text-sm font-bold text-on-surface mb-1">Horário noturno</h2>
          <p className="font-label text-sm text-on-surface-variant">
            {padH(prefs.quietHours.start)} – {padH(prefs.quietHours.end)}
          </p>
        </div>
      )}
    </div>
  )
}
