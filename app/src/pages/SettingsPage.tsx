import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/ui/Toast'
import { AdBanner } from '../components/ui/AdBanner'
import { useBathHours } from './settings/useBathHours'
import { useNotificationPrefs } from './settings/useNotificationPrefs'
import IntervalsSection from './settings/sections/IntervalsSection'
import BathSection from './settings/sections/BathSection'
import NotificationsSection from './settings/sections/NotificationsSection'
import AccountSection from './settings/sections/AccountSection'
import ClearHistorySection from './settings/sections/ClearHistorySection'
import CustomIntervalModal from './settings/modals/CustomIntervalModal'
import QuietHourPickerModal from './settings/modals/QuietHourPickerModal'
import BathHourPickerModal from './settings/modals/BathHourPickerModal'
import InfoModals, { type InfoModalKind } from './settings/modals/InfoModals'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  // Persisted prefs
  const { prefs, savePrefs } = useNotificationPrefs()
  const { addBathHour } = useBathHours()

  // UI state: which interval row is expanded + which modal is open
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
      if (!ok) setToast('Erro ao salvar preferências')
    },
    [savePrefs],
  )

  const handlePickBathHour = useCallback(
    async (hour: number) => {
      const res = await addBathHour(hour)
      if (res === 'ok') {
        setToast('Horário adicionado!')
        setPickingBathHour(false)
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
          <h1 className="font-headline text-2xl font-bold text-on-surface">Configurações</h1>
        </div>
      </section>

      <div className="px-5 space-y-5">
        <IntervalsSection
          expanded={expanded}
          onToggleExpanded={handleToggleExpanded}
          onOpenCustom={(cat) => setCustomModal(cat)}
          onSaved={() => setToast('Atualizado!')}
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

        <NotificationsSection
          prefs={prefs}
          onSavePrefs={handleSavePrefs}
          onOpenInfo={() => setInfoModal('notifications')}
        />

        {/* Limpar histórico sobe pra ficar acima da seção de conta (evita
            que "sair da conta" + "excluir conta" fiquem isolados no final
            e dá um agrupamento mental mais limpo: conta é sempre a última). */}
        <ClearHistorySection onToast={setToast} />

        <AccountSection onToast={setToast} />

        <p className="text-center font-label text-[10px] text-on-surface-variant/50 pt-1">
          Yaya v{__APP_VERSION__}
        </p>
      </div>

      {/* ===== MODAIS ===== */}
      <CustomIntervalModal
        cat={customModal}
        onClose={() => setCustomModal(null)}
        onSaved={() => setToast('Intervalo salvo!')}
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

      <AdBanner />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
