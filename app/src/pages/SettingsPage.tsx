import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/ui/Toast'
import { getAvailablePackages, getLastOfferingsDiagnostic } from '../lib/purchases'
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
  // Easter egg: 7 taps no título "Configurações" revela modo debug.
  // Usado pra ligar "test ads" (Google test IDs em vez dos prod IDs) e
  // verificar que a integração AdMob tá funcionando mesmo quando o
  // inventário real não fila. Desligar antes de submeter à loja.
  const [debugTaps, setDebugTaps] = useState(0)
  const [testAdsOn, setTestAdsOn] = useState(() => {
    try { return localStorage.getItem('yaya_test_ads') === '1' } catch { return false }
  })
  const showDebug = debugTaps >= 7 || testAdsOn
  function handleTitleTap() {
    setDebugTaps((n) => n + 1)
  }
  function toggleTestAds() {
    const next = !testAdsOn
    try {
      if (next) localStorage.setItem('yaya_test_ads', '1')
      else localStorage.removeItem('yaya_test_ads')
    } catch { /* ignore */ }
    setTestAdsOn(next)
    setToast(next ? 'Test ads ON — reinicie o app' : 'Test ads OFF — reinicie o app')
  }
  const [rcDiag, setRcDiag] = useState<string | null>(null)
  async function testRevenueCat() {
    setRcDiag('Consultando...')
    await getAvailablePackages().catch(() => {})
    const d = getLastOfferingsDiagnostic()
    if (!d) { setRcDiag('Sem diagnóstico disponível.'); return }
    setRcDiag(
      `platform: ${d.platform}\n` +
      `key: ${d.keyPrefix}...\n` +
      `current: ${d.currentOfferingId ?? 'null'}\n` +
      `offerings: ${d.allOfferingIds.join(', ') || '(vazio)'}\n` +
      `packages: ${d.currentPackageIds.join(', ') || '(vazio)'}\n` +
      `monthly: ${d.hasMonthly ? '✓' : '✗'}  annual: ${d.hasAnnual ? '✓' : '✗'}  lifetime: ${d.hasLifetime ? '✓' : '✗'}\n` +
      `error: ${d.error ?? '(nenhum)'}`
    )
  }

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
          <h1
            onClick={handleTitleTap}
            className="font-headline text-2xl font-bold text-on-surface cursor-pointer select-none"
          >
            Configurações
          </h1>
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

        {showDebug && (
          <div className="bg-surface-container rounded-md p-4 border border-primary/20 space-y-3">
            <p className="font-label text-xs font-bold text-primary uppercase tracking-wider">
              Debug (interno)
            </p>
            <div>
              <button
                onClick={toggleTestAds}
                className={`w-full py-2.5 rounded-md font-label text-sm font-semibold ${
                  testAdsOn
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface'
                }`}
              >
                {testAdsOn ? '✓ Test ads ON' : 'Test ads OFF'}
              </button>
              <p className="text-[10px] text-on-surface/50 mt-2 leading-relaxed">
                Usa IDs de teste do Google (fill 100%). Quando ON, banner aparece
                mesmo pra premium. <strong>Reinicie o app após alternar.</strong>
                Desligar antes de submeter à loja.
              </p>
            </div>

            <div>
              <button
                onClick={testRevenueCat}
                className="w-full py-2.5 rounded-md font-label text-sm font-semibold bg-surface-container-high text-on-surface"
              >
                Testar RevenueCat
              </button>
              {rcDiag && (
                <pre className="text-[10px] text-on-surface/70 mt-2 bg-surface rounded-md p-2 whitespace-pre-wrap break-all">
{rcDiag}
                </pre>
              )}
            </div>
          </div>
        )}

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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
