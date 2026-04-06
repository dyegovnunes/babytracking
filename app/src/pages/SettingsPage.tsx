import { useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import { useAuth, signOut } from '../contexts/AuthContext'
import { useState, useCallback, useEffect } from 'react'
import Toast from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'feed', label: 'Mamadas', icon: 'breastfeeding' },
  { key: 'diaper', label: 'Fraldas', icon: 'water_drop' },
  { key: 'sleep', label: 'Sono', icon: 'bedtime' },
  { key: 'bath', label: 'Banho', icon: 'bathtub' },
] as const

const PRESETS: Record<string, { label: string; minutes: number; warn: number }[]> = {
  feed: [
    { label: '2h', minutes: 120, warn: 100 },
    { label: '2h30', minutes: 150, warn: 120 },
    { label: '3h', minutes: 180, warn: 150 },
    { label: '4h', minutes: 240, warn: 200 },
  ],
  diaper: [
    { label: '1h30', minutes: 90, warn: 70 },
    { label: '2h', minutes: 120, warn: 90 },
    { label: '3h', minutes: 180, warn: 150 },
  ],
  sleep: [
    { label: '1h', minutes: 60, warn: 45 },
    { label: '1h30', minutes: 90, warn: 60 },
    { label: '2h', minutes: 120, warn: 90 },
  ],
  bath: [
    { label: 'Diário', minutes: 1440, warn: 1200 },
    { label: '2 dias', minutes: 2880, warn: 2400 },
    { label: '3 dias', minutes: 4320, warn: 3600 },
  ],
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

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
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return d === 1 ? 'Diário' : `${d} dias`
  }
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

function padHour(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

export default function SettingsPage() {
  const { baby, intervals } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)

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

  const handlePresetSelect = useCallback(
    async (cat: string, preset: { minutes: number; warn: number }) => {
      if (!baby) return
      const updated = {
        ...intervals,
        [cat]: { ...intervals[cat], minutes: preset.minutes, warn: preset.warn },
      }
      const ok = await updateIntervals(dispatch, baby.id, updated)
      if (ok) setToast('Intervalo atualizado!')
      setExpandedCat(null)
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
    setExpandedCat(null)
  }, [customModal, customHours, customMinutes, intervals, baby, dispatch])

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
        {/* ===== INTERVALOS ===== */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-xl">timer</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Intervalos esperados</h3>
          </div>
          <p className="font-label text-xs text-on-surface-variant mb-3">
            Defina o tempo esperado entre cada atividade
          </p>

          <div className="space-y-2">
            {CATEGORIES.map(({ key, label, icon }) => {
              const config = intervals[key]
              if (!config) return null
              const isExpanded = expandedCat === key
              const presets = PRESETS[key] ?? []

              return (
                <div key={key} className="bg-surface-container rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCat(isExpanded ? null : key)}
                    className="w-full flex items-center gap-3 p-4 active:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
                    <span className="flex-1 text-left font-body text-sm text-on-surface font-medium">{label}</span>
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
                              onClick={() => handlePresetSelect(key, preset)}
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
                        onClick={() => handleCustomOpen(key)}
                        className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 active:bg-primary/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-primary text-base">edit</span>
                        <span className="font-label text-xs text-primary font-medium">Personalizar intervalo</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== NOTIFICAÇÕES ===== */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-xl">notifications</span>
            <h3 className="text-on-surface font-headline text-sm font-bold">Notificações</h3>
          </div>
          <p className="font-label text-xs text-on-surface-variant mb-3">
            Escolha quando e como receber alertas
          </p>

          <div className="space-y-2">
            {/* Global toggle */}
            <div className="bg-surface-container rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications_active</span>
                  <div>
                    <p className="font-body text-sm text-on-surface font-medium">Ativar notificações</p>
                    <p className="font-label text-xs text-on-surface-variant">Receber alertas quando for hora de cada atividade</p>
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
                  Notificar por categoria
                </p>
                {CATEGORIES.map(({ key, label, icon }, i) => (
                  <div key={key} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
                      <span className="font-body text-sm text-on-surface">{label}</span>
                    </div>
                    <button
                      onClick={() => savePrefs({
                        ...prefs,
                        categories: { ...prefs.categories, [key]: !prefs.categories[key as keyof typeof prefs.categories] },
                      })}
                      className={`w-11 h-6 rounded-full relative transition-colors ${prefs.categories[key as keyof typeof prefs.categories] ? 'bg-primary/40' : 'bg-surface-variant'}`}
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
                      <p className="font-label text-xs text-on-surface-variant">Sem notificações nesse período</p>
                    </div>
                  </div>
                  <button
                    onClick={() => savePrefs({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled },
                    })}
                    className={`w-11 h-6 rounded-full relative transition-colors ${prefs.quietHours.enabled ? 'bg-primary/40' : 'bg-surface-variant'}`}
                  >
                    <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${prefs.quietHours.enabled ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`} />
                  </button>
                </div>

                {prefs.quietHours.enabled && (
                  <div className="flex items-center gap-3 mt-3 ml-9">
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
                )}
              </div>
            )}
          </div>
        </div>

        {/* Conta */}
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
            <p className="font-label text-xs text-on-surface-variant mb-5">Defina o tempo exato entre registros</p>

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
                {HOURS.map((h) => {
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
