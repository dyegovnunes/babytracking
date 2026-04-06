import { useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import { useAuth, signOut } from '../contexts/AuthContext'
import { useState, useCallback, useEffect } from 'react'
import Toast from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

// ========== PRESETS ==========

const FEED_PRESETS = [
  { label: '2h', minutes: 120, warn: 100 },
  { label: '2h30', minutes: 150, warn: 120 },
  { label: '3h', minutes: 180, warn: 150 },
  { label: '4h', minutes: 240, warn: 200 },
]

const DIAPER_PRESETS = [
  { label: '1h30', minutes: 90, warn: 70 },
  { label: '2h', minutes: 120, warn: 90 },
  { label: '3h', minutes: 180, warn: 150 },
]

const SLEEP_NAP_PRESETS = [
  { label: '30min', minutes: 30, warn: 25 },
  { label: '45min', minutes: 45, warn: 35 },
  { label: '1h', minutes: 60, warn: 50 },
  { label: '1h30', minutes: 90, warn: 75 },
  { label: '2h', minutes: 120, warn: 100 },
]

const SLEEP_AWAKE_PRESETS = [
  { label: '1h', minutes: 60, warn: 45 },
  { label: '1h30', minutes: 90, warn: 70 },
  { label: '2h', minutes: 120, warn: 100 },
  { label: '2h30', minutes: 150, warn: 120 },
  { label: '3h', minutes: 180, warn: 150 },
]

const BATH_COUNTS = [1, 2, 3]
const BATH_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i)

// ========== HELPERS ==========

interface NotificationPrefs {
  enabled: boolean
  categories: { feed: boolean; diaper: boolean; sleep: boolean; bath: boolean }
  quietHours: { enabled: boolean; start: number; end: number }
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  categories: { feed: true, diaper: true, sleep: true, bath: true },
  quietHours: { enabled: false, start: 22, end: 7 },
}

function minutesToDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

function padHour(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

// ========== COMPONENT ==========

export default function SettingsPage() {
  const { baby, intervals } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  // UI states
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)

  // Load notification prefs from Supabase
  useEffect(() => {
    if (!user || !baby) return
    supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', user.id)
      .eq('baby_id', baby.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            enabled: data.enabled,
            categories: {
              feed: data.cat_feed,
              diaper: data.cat_diaper,
              sleep: data.cat_sleep,
              bath: data.cat_bath,
            },
            quietHours: {
              enabled: data.quiet_enabled,
              start: data.quiet_start,
              end: data.quiet_end,
            },
          })
        }
      })
  }, [user, baby])

  const savePrefs = useCallback(async (updated: NotificationPrefs) => {
    setPrefs(updated)
    if (!user || !baby) return
    await supabase
      .from('notification_prefs')
      .upsert({
        user_id: user.id,
        baby_id: baby.id,
        enabled: updated.enabled,
        cat_feed: updated.categories.feed,
        cat_diaper: updated.categories.diaper,
        cat_sleep: updated.categories.sleep,
        cat_bath: updated.categories.bath,
        quiet_enabled: updated.quietHours.enabled,
        quiet_start: updated.quietHours.start,
        quiet_end: updated.quietHours.end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,baby_id' })
  }, [user, baby])

  // ========== INTERVAL HANDLERS ==========

  const handlePresetSelect = useCallback(
    async (cat: string, preset: { minutes: number; warn: number }) => {
      if (!baby) return
      const updated = {
        ...intervals,
        [cat]: { ...intervals[cat], minutes: preset.minutes, warn: preset.warn },
      }
      const ok = await updateIntervals(dispatch, baby.id, updated)
      if (ok) setToast('Intervalo atualizado!')
    },
    [intervals, baby, dispatch],
  )

  const handleCustomOpen = useCallback((cat: string) => {
    const config = intervals[cat]
    if (config) {
      const h = Math.floor(config.minutes / 60)
      const m = config.minutes % 60
      setCustomHours(h > 0 ? h.toString() : '')
      setCustomMinutes(m > 0 ? m.toString() : '')
    }
    setCustomModal(cat)
  }, [intervals])

  const handleCustomSave = useCallback(async () => {
    if (!customModal || !baby) return
    const h = parseInt(customHours) || 0
    const m = parseInt(customMinutes) || 0
    const totalMinutes = h * 60 + m
    if (totalMinutes <= 0) return

    const warnMinutes = Math.max(1, Math.floor(totalMinutes * 0.8))
    const updated = {
      ...intervals,
      [customModal]: { ...intervals[customModal], minutes: totalMinutes, warn: warnMinutes },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Intervalo personalizado salvo!')
    setCustomModal(null)
  }, [customModal, customHours, customMinutes, intervals, baby, dispatch])

  // ========== BATH HANDLERS ==========

  const bathConfig = intervals['bath']
  const bathHours = bathConfig?.scheduledHours ?? [18]

  const handleBathCountChange = useCallback(async (count: number) => {
    if (!baby) return
    // Adjust hours array to match count
    let newHours = [...bathHours]
    if (count > newHours.length) {
      // Add default hours
      const defaults = [7, 12, 18]
      while (newHours.length < count) {
        const next = defaults.find(h => !newHours.includes(h)) ?? (newHours[newHours.length - 1] + 4)
        newHours.push(next)
      }
    } else {
      newHours = newHours.slice(0, count)
    }
    newHours.sort((a, b) => a - b)

    const updated = {
      ...intervals,
      bath: { ...intervals['bath'], mode: 'scheduled' as const, scheduledHours: newHours },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Banhos atualizados!')
  }, [bathHours, intervals, baby, dispatch])

  const handleAddBathHour = useCallback(async (hour: number) => {
    if (!baby || bathHours.includes(hour)) return
    const newHours = [...bathHours, hour].sort((a, b) => a - b)
    const updated = {
      ...intervals,
      bath: { ...intervals['bath'], mode: 'scheduled' as const, scheduledHours: newHours },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Horário adicionado!')
    setPickingBathHour(false)
  }, [bathHours, intervals, baby, dispatch])

  const handleRemoveBathHour = useCallback(async (hour: number) => {
    if (!baby || bathHours.length <= 1) return
    const newHours = bathHours.filter(h => h !== hour)
    const updated = {
      ...intervals,
      bath: { ...intervals['bath'], mode: 'scheduled' as const, scheduledHours: newHours },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Horário removido!')
  }, [bathHours, intervals, baby, dispatch])

  // ========== TOGGLE SECTION ==========

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  // ========== RENDER HELPERS ==========

  function renderNotificationPreview(icon: string, title: string, body: string) {
    return (
      <div className="bg-surface-container-low rounded-xl p-3 flex items-start gap-3 mt-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-primary text-base">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-label text-[10px] text-on-surface-variant">Yaya</span>
            <span className="font-label text-[10px] text-on-surface-variant/50">agora</span>
          </div>
          <p className="font-body text-xs text-on-surface font-semibold">{title}</p>
          <p className="font-label text-[11px] text-on-surface-variant">{body}</p>
        </div>
      </div>
    )
  }

  function renderIntervalSection(
    cat: string,
    icon: string,
    label: string,
    description: string,
    presets: { label: string; minutes: number; warn: number }[],
    notifPreview?: { icon: string; title: string; body: string },
  ) {
    const config = intervals[cat]
    if (!config) return null
    const isExpanded = expandedSection === cat

    return (
      <div className="bg-surface-container rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(cat)}
          className="w-full flex items-center gap-3 p-4 active:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
          <div className="flex-1 text-left">
            <span className="font-body text-sm text-on-surface font-medium block">{label}</span>
            <span className="font-label text-[11px] text-on-surface-variant">{description}</span>
          </div>
          <span className="font-label text-sm text-primary font-semibold">{minutesToDisplay(config.minutes)}</span>
          <span className={`material-symbols-outlined text-on-surface-variant text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 animate-fade-in">
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((preset) => {
                const isActive = config.minutes === preset.minutes
                return (
                  <button
                    key={preset.minutes}
                    onClick={() => handlePresetSelect(cat, preset)}
                    className={`px-4 py-2 rounded-lg font-label text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => handleCustomOpen(cat)}
              className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-base">edit</span>
              <span className="font-label text-xs text-primary font-medium">Personalizar</span>
            </button>

            {notifPreview && (
              <>
                <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mt-4 mb-1">
                  Exemplo de notificação
                </p>
                {renderNotificationPreview(notifPreview.icon, notifPreview.title, notifPreview.body)}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ========== MAIN RENDER ==========

  const feedMinutes = intervals['feed']?.minutes ?? 180
  const diaperMinutes = intervals['diaper']?.minutes ?? 120
  const sleepNapMinutes = intervals['sleep_nap']?.minutes ?? 90
  const sleepAwakeMinutes = intervals['sleep_awake']?.minutes ?? 120

  return (
    <div className="pb-4 page-enter">
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              arrow_back
            </span>
          </button>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Configurações
          </h1>
        </div>
      </section>

      <div className="px-5 space-y-4">

        {/* ========================================== */}
        {/* ===== MAMADAS ===== */}
        {/* ========================================== */}
        {renderIntervalSection(
          'feed',
          'breastfeeding',
          'Mamadas',
          'Intervalo entre mamadas',
          FEED_PRESETS,
          {
            icon: 'breastfeeding',
            title: `Hora da mamada!`,
            body: `Já faz ${minutesToDisplay(feedMinutes)} desde a última mamada.`,
          },
        )}

        {/* ========================================== */}
        {/* ===== FRALDAS ===== */}
        {/* ========================================== */}
        {renderIntervalSection(
          'diaper',
          'water_drop',
          'Fraldas',
          'Intervalo entre trocas',
          DIAPER_PRESETS,
          {
            icon: 'water_drop',
            title: `Hora de trocar a fralda!`,
            body: `Já faz ${minutesToDisplay(diaperMinutes)} desde a última troca.`,
          },
        )}

        {/* ========================================== */}
        {/* ===== SONO ===== */}
        {/* ========================================== */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-xl">bedtime</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Sono</h3>
          </div>
          <p className="font-label text-xs text-on-surface-variant mb-3">
            Duas configurações que trabalham juntas: duração da soneca e janela de sono
          </p>

          <div className="space-y-2">
            {/* Sleep Nap - Duration of nap */}
            {renderIntervalSection(
              'sleep_nap',
              'nights_stay',
              'Duração da soneca',
              'Quanto tempo o bebê deve dormir',
              SLEEP_NAP_PRESETS,
              {
                icon: 'nights_stay',
                title: `O bebê deve estar acordando!`,
                body: `Está dormindo há ${minutesToDisplay(sleepNapMinutes)}. A soneca esperada era de ${minutesToDisplay(sleepNapMinutes)}.`,
              },
            )}

            {/* Sleep Awake - Awake window */}
            {renderIntervalSection(
              'sleep_awake',
              'wb_sunny',
              'Janela de sono (acordado)',
              'Tempo máximo acordado antes de dormir',
              SLEEP_AWAKE_PRESETS,
              {
                icon: 'wb_sunny',
                title: `Hora de dormir!`,
                body: `O bebê está acordado há ${minutesToDisplay(sleepAwakeMinutes)}. A janela de sono é de ${minutesToDisplay(sleepAwakeMinutes)}.`,
              },
            )}

            {/* Nighttime note */}
            <div className="bg-surface-container rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-lg mt-0.5">dark_mode</span>
                <div>
                  <p className="font-body text-sm text-on-surface font-medium mb-1">Sono noturno</p>
                  <p className="font-label text-xs text-on-surface-variant leading-relaxed">
                    À noite o bebê dorme por mais tempo. Os alertas de sono são pausados
                    automaticamente durante o horário silencioso que você configurar abaixo
                    em "Notificações".
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How it works explanation */}
          <div className="mt-3 bg-primary/5 border border-primary/15 rounded-xl p-4">
            <p className="font-label text-xs text-primary font-semibold mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">info</span>
              Como funciona
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-label text-xs text-primary mt-0.5">1.</span>
                <p className="font-label text-xs text-on-surface-variant">
                  Ao registrar <strong className="text-on-surface">"Dormiu"</strong>, o Yaya calcula quando o bebê
                  deve acordar com base na <strong className="text-on-surface">duração da soneca</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-label text-xs text-primary mt-0.5">2.</span>
                <p className="font-label text-xs text-on-surface-variant">
                  Ao registrar <strong className="text-on-surface">"Acordou"</strong>, o Yaya calcula quando o bebê
                  deve dormir com base na <strong className="text-on-surface">janela de sono</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-label text-xs text-primary mt-0.5">3.</span>
                <p className="font-label text-xs text-on-surface-variant">
                  Você recebe uma notificação <strong className="text-on-surface">quando o tempo está acabando</strong> (antes de
                  esgotar) e outra <strong className="text-on-surface">quando já passou</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* ===== BANHO ===== */}
        {/* ========================================== */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-xl">bathtub</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Banho</h3>
          </div>
          <p className="font-label text-xs text-on-surface-variant mb-3">
            Defina quantos banhos por dia e os horários agendados
          </p>

          <div className="space-y-2">
            {/* Bath count */}
            <div className="bg-surface-container rounded-xl p-4">
              <p className="font-label text-xs text-on-surface-variant mb-3">Banhos por dia</p>
              <div className="flex gap-2">
                {BATH_COUNTS.map((count) => {
                  const isActive = bathHours.length === count
                  return (
                    <button
                      key={count}
                      onClick={() => handleBathCountChange(count)}
                      className={`flex-1 py-2.5 rounded-lg font-label text-sm font-semibold transition-colors ${
                        isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {count} {count === 1 ? 'banho' : 'banhos'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bath scheduled times */}
            <div className="bg-surface-container rounded-xl p-4">
              <p className="font-label text-xs text-on-surface-variant mb-3">Horários agendados</p>
              <div className="space-y-2">
                {bathHours.map((hour) => (
                  <div key={hour} className="flex items-center justify-between bg-surface-container-low rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                      <span className="font-headline text-base text-on-surface font-bold">{padHour(hour)}</span>
                    </div>
                    {bathHours.length > 1 && (
                      <button
                        onClick={() => handleRemoveBathHour(hour)}
                        className="w-8 h-8 rounded-full flex items-center justify-center active:bg-error/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-error text-lg">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPickingBathHour(true)}
                className="w-full mt-3 py-2.5 rounded-lg bg-primary/10 text-primary font-label font-semibold text-sm flex items-center justify-center gap-2 active:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Alterar horário
              </button>
            </div>

            {/* Bath notification preview */}
            <div className="bg-surface-container rounded-xl p-4">
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">
                Exemplo de notificação
              </p>
              {renderNotificationPreview(
                'bathtub',
                `Hora do banho!`,
                `O banho está agendado para ${padHour(bathHours[0])}. Faltam 15 minutos.`,
              )}
              <p className="font-label text-[11px] text-on-surface-variant mt-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">info</span>
                Você recebe o aviso 15 minutos antes do horário agendado.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* ===== NOTIFICAÇÕES ===== */}
        {/* ========================================== */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-xl">notifications</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Notificações</h3>
          </div>
          <p className="font-label text-xs text-on-surface-variant mb-3">
            Controle quando e quais alertas receber
          </p>

          <div className="space-y-2">
            {/* Global toggle */}
            <div className="bg-surface-container rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications_active</span>
                  <div>
                    <p className="font-body text-sm text-on-surface font-medium">Ativar notificações</p>
                    <p className="font-label text-xs text-on-surface-variant">Receber alertas do app</p>
                  </div>
                </div>
                <button
                  onClick={() => savePrefs({ ...prefs, enabled: !prefs.enabled })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${prefs.enabled ? 'bg-primary/40' : 'bg-surface-variant'}`}
                >
                  <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${prefs.enabled ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`} />
                </button>
              </div>
            </div>

            {/* Per-category toggles */}
            {prefs.enabled && (
              <div className="bg-surface-container rounded-xl overflow-hidden">
                <p className="px-4 pt-4 pb-2 font-label text-xs text-on-surface-variant font-semibold">
                  Categorias
                </p>
                {[
                  { key: 'feed', label: 'Mamadas', icon: 'breastfeeding', desc: `Avisa a cada ${minutesToDisplay(feedMinutes)}` },
                  { key: 'diaper', label: 'Fraldas', icon: 'water_drop', desc: `Avisa a cada ${minutesToDisplay(diaperMinutes)}` },
                  { key: 'sleep', label: 'Sono', icon: 'bedtime', desc: 'Avisa sobre soneca e janela de sono' },
                  { key: 'bath', label: 'Banho', icon: 'bathtub', desc: `Avisa 15min antes do horário agendado` },
                ].map(({ key, label, icon, desc }, i) => (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
                      <div>
                        <span className="font-body text-sm text-on-surface block">{label}</span>
                        <span className="font-label text-[11px] text-on-surface-variant">{desc}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => savePrefs({
                        ...prefs,
                        categories: { ...prefs.categories, [key]: !prefs.categories[key as keyof typeof prefs.categories] },
                      })}
                      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${prefs.categories[key as keyof typeof prefs.categories] ? 'bg-primary/40' : 'bg-surface-variant'}`}
                    >
                      <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${prefs.categories[key as keyof typeof prefs.categories] ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quiet hours */}
            {prefs.enabled && (
              <div className="bg-surface-container rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">dark_mode</span>
                    <div>
                      <p className="font-body text-sm text-on-surface font-medium">Horário silencioso</p>
                      <p className="font-label text-xs text-on-surface-variant">
                        Nenhuma notificação nesse período. Ideal para o sono noturno.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => savePrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled },
                    })}
                    className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${prefs.quietHours.enabled ? 'bg-primary/40' : 'bg-surface-variant'}`}
                  >
                    <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${prefs.quietHours.enabled ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`} />
                  </button>
                </div>

                {prefs.quietHours.enabled && (
                  <div className="mt-3 ml-9">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPickingQuietHour('start')}
                        className="px-4 py-2 rounded-lg bg-surface-container-low active:bg-surface-container-high transition-colors"
                      >
                        <span className="font-headline text-base text-on-surface font-bold">{padHour(prefs.quietHours.start)}</span>
                      </button>
                      <span className="font-label text-sm text-on-surface-variant">até</span>
                      <button
                        onClick={() => setPickingQuietHour('end')}
                        className="px-4 py-2 rounded-lg bg-surface-container-low active:bg-surface-container-high transition-colors"
                      >
                        <span className="font-headline text-base text-on-surface font-bold">{padHour(prefs.quietHours.end)}</span>
                      </button>
                    </div>
                    <p className="font-label text-[11px] text-on-surface-variant mt-2">
                      Alertas de sono noturno, mamadas e fraldas serão silenciados das {padHour(prefs.quietHours.start)} às {padHour(prefs.quietHours.end)}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* How notifications work */}
            {prefs.enabled && (
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <p className="font-label text-xs text-primary font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Como funcionam as notificações
                </p>
                <div className="space-y-1.5">
                  <p className="font-label text-xs text-on-surface-variant">
                    <strong className="text-on-surface">Quando:</strong> Você recebe 2 alertas — um quando o tempo está
                    acabando (80% do intervalo) e outro quando já passou.
                  </p>
                  <p className="font-label text-xs text-on-surface-variant">
                    <strong className="text-on-surface">Banho:</strong> Alerta único 15 minutos antes do horário agendado.
                  </p>
                  <p className="font-label text-xs text-on-surface-variant">
                    <strong className="text-on-surface">Silêncio:</strong> Nenhum alerta durante o horário silencioso.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== CONTA ===== */}
        <div className="bg-surface-container rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">account_circle</span>
            <p className="text-on-surface font-body text-sm font-medium truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full py-2.5 rounded-xl bg-error/10 text-error font-label font-semibold text-sm"
          >
            Sair da conta
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="font-label text-[10px] text-on-surface-variant/50">Yaya v1.0.0</p>
        </div>
      </div>

      {/* ===== CUSTOM INTERVAL MODAL ===== */}
      {customModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-2xl p-6 mx-4">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">Personalizar intervalo</h3>
            <p className="font-label text-xs text-on-surface-variant mb-5">Defina o tempo exato</p>

            <div className="flex items-center gap-4 justify-center mb-6">
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1.5 block">Horas</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <span className="font-headline text-2xl text-on-surface-variant mt-5">:</span>
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1.5 block">Minutos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value.replace(/\D/g, ''))}
                  placeholder="00"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCustomModal(null)} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">
                Cancelar
              </button>
              <button onClick={handleCustomSave} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QUIET HOUR PICKER MODAL ===== */}
      {pickingQuietHour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-2xl p-5 mx-4 max-h-[80vh] flex flex-col">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
              {pickingQuietHour === 'start' ? 'Início do silêncio' : 'Fim do silêncio'}
            </h3>
            <p className="font-label text-xs text-on-surface-variant mb-4">Selecione o horário</p>

            <div className="overflow-y-auto flex-1" style={{ maxHeight: 300 }}>
              <div className="flex flex-wrap gap-2">
                {HOURS_24.map((h) => {
                  const isActive = pickingQuietHour === 'start'
                    ? prefs.quietHours.start === h
                    : prefs.quietHours.end === h
                  return (
                    <button
                      key={h}
                      onClick={() => {
                        const updated = {
                          ...prefs,
                          quietHours: { ...prefs.quietHours, [pickingQuietHour]: h },
                        }
                        setPickingQuietHour(null)
                        savePrefs(updated)
                      }}
                      className={`w-16 py-2.5 rounded-lg font-label text-sm font-medium transition-colors ${
                        isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {padHour(h)}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => setPickingQuietHour(null)}
              className="mt-4 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm w-full"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ===== BATH HOUR PICKER MODAL ===== */}
      {pickingBathHour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-2xl p-5 mx-4 max-h-[80vh] flex flex-col">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-1">Horário do banho</h3>
            <p className="font-label text-xs text-on-surface-variant mb-4">Selecione o horário desejado</p>

            <div className="overflow-y-auto flex-1" style={{ maxHeight: 300 }}>
              <div className="flex flex-wrap gap-2">
                {BATH_HOURS.map((h) => {
                  const isActive = bathHours.includes(h)
                  return (
                    <button
                      key={h}
                      onClick={() => {
                        if (isActive) {
                          handleRemoveBathHour(h)
                        } else {
                          handleAddBathHour(h)
                        }
                      }}
                      className={`w-16 py-2.5 rounded-lg font-label text-sm font-medium transition-colors ${
                        isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                      }`}
                    >
                      {padHour(h)}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={() => setPickingBathHour(false)}
              className="mt-4 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm w-full"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
