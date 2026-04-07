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

// ========== TYPES ==========

interface NotifPrefs {
  enabled: boolean
  categories: { feed: boolean; diaper: boolean; sleep: boolean; bath: boolean }
  quietHours: { enabled: boolean; start: number; end: number }
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  categories: { feed: true, diaper: true, sleep: true, bath: true },
  quietHours: { enabled: false, start: 22, end: 7 },
}

// ========== HELPERS ==========

function mToStr(m: number): string {
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h${r}min` : `${h}h`
}

function padH(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

// ========== COMPONENT ==========

export default function SettingsPage() {
  const { baby, intervals, pauseDuringSleep } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  // UI state
  const [expanded, setExpanded] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customH, setCustomH] = useState('')
  const [customM, setCustomM] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)
  const [infoModal, setInfoModal] = useState<'sleep' | 'notifications' | null>(null)

  // Load prefs
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
            categories: { feed: data.cat_feed, diaper: data.cat_diaper, sleep: data.cat_sleep, bath: data.cat_bath },
            quietHours: { enabled: data.quiet_enabled, start: data.quiet_start, end: data.quiet_end },
          })
        }
      })
  }, [user, baby])

  const savePrefs = useCallback(async (updated: NotifPrefs) => {
    setPrefs(updated)
    if (!user || !baby) return
    const { error } = await supabase.from('notification_prefs').upsert({
      user_id: user.id, baby_id: baby.id,
      enabled: updated.enabled,
      cat_feed: updated.categories.feed, cat_diaper: updated.categories.diaper,
      cat_sleep: updated.categories.sleep, cat_bath: updated.categories.bath,
      quiet_enabled: updated.quietHours.enabled,
      quiet_start: updated.quietHours.start, quiet_end: updated.quietHours.end,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,baby_id' })
    if (error) {
      setToast('Erro ao salvar preferências')
    } else {
      dispatch({ type: 'SET_QUIET_HOURS', value: updated.quietHours })
    }
  }, [user, baby, dispatch])

  // ===== INTERVAL HANDLERS =====

  const handlePreset = useCallback(async (cat: string, p: { minutes: number; warn: number }) => {
    if (!baby) return
    const updated = { ...intervals, [cat]: { ...intervals[cat], minutes: p.minutes, warn: p.warn } }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Atualizado!')
  }, [intervals, baby, dispatch])

  const openCustom = useCallback((cat: string) => {
    const c = intervals[cat]
    if (c) { setCustomH(Math.floor(c.minutes / 60) > 0 ? Math.floor(c.minutes / 60).toString() : ''); setCustomM(c.minutes % 60 > 0 ? (c.minutes % 60).toString() : '') }
    setCustomModal(cat)
  }, [intervals])

  const saveCustom = useCallback(async () => {
    if (!customModal || !baby) return
    const total = (parseInt(customH) || 0) * 60 + (parseInt(customM) || 0)
    if (total <= 0) return
    const updated = { ...intervals, [customModal]: { ...intervals[customModal], minutes: total, warn: Math.max(1, Math.floor(total * 0.8)) } }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) setToast('Intervalo salvo!')
    setCustomModal(null)
  }, [customModal, customH, customM, intervals, baby, dispatch])

  // ===== BATH HANDLERS =====

  const bathHours = intervals['bath']?.scheduledHours ?? [18]

  const setBathHours = useCallback(async (newHours: number[]) => {
    if (!baby || newHours.length === 0) return
    const sorted = [...newHours].sort((a, b) => a - b)
    const updated = { ...intervals, bath: { ...intervals['bath'], mode: 'scheduled' as const, scheduledHours: sorted } }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (!ok) setToast('Erro ao salvar')
  }, [intervals, baby, dispatch])

  const handleBathCount = useCallback(async (count: number) => {
    let h = [...bathHours]
    const defaults = [7, 12, 18]
    while (h.length < count) { const next = defaults.find(x => !h.includes(x)) ?? h[h.length - 1] + 4; h.push(next) }
    h = h.slice(0, count)
    await setBathHours(h)
    setToast('Atualizado!')
  }, [bathHours, setBathHours])

  const addBathHour = useCallback(async (hour: number) => {
    if (bathHours.includes(hour)) return
    await setBathHours([...bathHours, hour])
    setPickingBathHour(false)
    setToast('Horário adicionado!')
  }, [bathHours, setBathHours])

  const removeBathHour = useCallback(async (hour: number) => {
    if (bathHours.length <= 1) return
    await setBathHours(bathHours.filter(h => h !== hour))
    setToast('Horário removido!')
  }, [bathHours, setBathHours])

  // ===== PAUSE DURING SLEEP =====

  const togglePauseDuringSleep = useCallback(async () => {
    if (!user || !baby) return
    const newVal = !pauseDuringSleep
    const { error } = await supabase.from('notification_prefs').upsert({
      user_id: user.id, baby_id: baby.id, pause_during_sleep: newVal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,baby_id' })
    if (error) { setToast('Erro ao salvar'); return }
    dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: newVal })
    setToast(newVal ? 'Alertas pausados durante sono' : 'Alertas ativos durante sono')
  }, [pauseDuringSleep, user, baby, dispatch])

  // ===== RENDER: INTERVAL ROW =====

  function IntervalRow({ cat, icon, label, presets }: { cat: string; icon: string; label: string; presets: { label: string; minutes: number; warn: number }[] }) {
    const config = intervals[cat]
    if (!config) return null
    const isOpen = expanded === cat

    return (
      <div className="bg-surface-container rounded-xl overflow-hidden">
        <button onClick={() => setExpanded(isOpen ? null : cat)} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
          <span className="flex-1 text-left font-body text-sm text-on-surface">{label}</span>
          <span className="font-label text-sm text-primary font-semibold">{mToStr(config.minutes)}</span>
          <span className={`material-symbols-outlined text-on-surface-variant text-base transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
        {isOpen && (
          <div className="px-4 pb-3 animate-fade-in">
            <div className="flex flex-wrap gap-2 mb-2">
              {presets.map(p => (
                <button key={p.minutes} onClick={() => handlePreset(cat, p)}
                  className={`px-3.5 py-1.5 rounded-lg font-label text-sm font-medium transition-colors ${config.minutes === p.minutes ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => openCustom(cat)} className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 active:bg-primary/20">
              <span className="material-symbols-outlined text-primary text-sm">edit</span>
              <span className="font-label text-xs text-primary font-medium">Personalizar</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ===== RENDER: TOGGLE ROW =====

  function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
    return (
      <button onClick={onChange} className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${value ? 'bg-primary/40' : 'bg-surface-variant'}`}>
        <div className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${value ? 'right-0.5 bg-primary' : 'left-0.5 bg-on-surface-variant/50'}`} />
      </button>
    )
  }

  // ===== MAIN RENDER =====

  return (
    <div className="pb-4 page-enter">
      {/* Header */}
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-xl">arrow_back</span>
          </button>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Configurações</h1>
        </div>
      </section>

      <div className="px-5 space-y-5">

        {/* ================================================ */}
        {/* SEÇÃO 1: INTERVALOS E HORÁRIOS                   */}
        {/* ================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-lg">timer</span>
            <h2 className="font-headline text-sm font-bold text-on-surface">Intervalos e horários</h2>
          </div>

          <div className="space-y-2">
            <IntervalRow cat="feed" icon="breastfeeding" label="Mamadas" presets={FEED_PRESETS} />
            <IntervalRow cat="diaper" icon="water_drop" label="Fraldas" presets={DIAPER_PRESETS} />

            {/* Sono header com info icon */}
            <div className="flex items-center gap-2 pt-2">
              <span className="material-symbols-outlined text-on-surface-variant text-base">bedtime</span>
              <span className="font-label text-xs text-on-surface-variant font-semibold flex-1">Sono</span>
              <button onClick={() => setInfoModal('sleep')} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-sm">info</span>
              </button>
            </div>

            <IntervalRow cat="sleep_nap" icon="nights_stay" label="Duração da soneca" presets={SLEEP_NAP_PRESETS} />
            <IntervalRow cat="sleep_awake" icon="wb_sunny" label="Janela de sono" presets={SLEEP_AWAKE_PRESETS} />

            {/* Pausar durante sono */}
            <div className="bg-surface-container rounded-xl px-4 py-3.5 flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">pause_circle</span>
              <div className="flex-1">
                <p className="font-body text-sm text-on-surface">Pausar alertas durante sono</p>
                <p className="font-label text-[11px] text-on-surface-variant">Mamada e fralda não alertam enquanto dorme</p>
              </div>
              <Toggle value={pauseDuringSleep} onChange={togglePauseDuringSleep} />
            </div>

            {/* Banho header */}
            <div className="flex items-center gap-2 pt-2">
              <span className="material-symbols-outlined text-on-surface-variant text-base">bathtub</span>
              <span className="font-label text-xs text-on-surface-variant font-semibold">Banho</span>
            </div>

            {/* Banho count + times */}
            <div className="bg-surface-container rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {BATH_COUNTS.map(c => (
                  <button key={c} onClick={() => handleBathCount(c)}
                    className={`flex-1 py-2 rounded-lg font-label text-sm font-semibold transition-colors ${bathHours.length === c ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                    {c}x
                  </button>
                ))}
              </div>

              {bathHours.map(h => (
                <div key={h} className="flex items-center justify-between bg-surface-container-low rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">schedule</span>
                    <span className="font-headline text-sm text-on-surface font-bold">{padH(h)}</span>
                  </div>
                  {bathHours.length > 1 && (
                    <button onClick={() => removeBathHour(h)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-error/10">
                      <span className="material-symbols-outlined text-error text-base">close</span>
                    </button>
                  )}
                </div>
              ))}

              <button onClick={() => setPickingBathHour(true)}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary font-label font-semibold text-xs flex items-center justify-center gap-1.5 active:bg-primary/20">
                <span className="material-symbols-outlined text-sm">edit</span>
                Alterar horário
              </button>

              <p className="font-label text-[11px] text-on-surface-variant text-center">
                Aviso 15 min antes do horário agendado
              </p>
            </div>
          </div>
        </section>

        {/* ================================================ */}
        {/* SEÇÃO 2: NOTIFICAÇÕES                            */}
        {/* ================================================ */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-lg">notifications</span>
            <h2 className="font-headline text-sm font-bold text-on-surface flex-1">Notificações</h2>
            <button onClick={() => setInfoModal('notifications')} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm">info</span>
            </button>
          </div>

          <div className="space-y-2">
            {/* Global */}
            <div className="bg-surface-container rounded-xl px-4 py-3.5 flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">notifications_active</span>
              <span className="flex-1 font-body text-sm text-on-surface">Ativar notificações</span>
              <Toggle value={prefs.enabled} onChange={() => savePrefs({ ...prefs, enabled: !prefs.enabled })} />
            </div>

            {/* Per category */}
            {prefs.enabled && (
              <div className="bg-surface-container rounded-xl overflow-hidden">
                {[
                  { key: 'feed', label: 'Mamadas', icon: 'breastfeeding', desc: `A cada ${mToStr(intervals['feed']?.minutes ?? 180)}` },
                  { key: 'diaper', label: 'Fraldas', icon: 'water_drop', desc: `A cada ${mToStr(intervals['diaper']?.minutes ?? 120)}` },
                  { key: 'sleep', label: 'Sono', icon: 'bedtime', desc: 'Soneca e janela de sono' },
                  { key: 'bath', label: 'Banho', icon: 'bathtub', desc: '15min antes do horário' },
                ].map(({ key, label, icon, desc }, i) => (
                  <div key={key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}>
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-on-surface">{label}</p>
                      <p className="font-label text-[11px] text-on-surface-variant">{desc}</p>
                    </div>
                    <Toggle
                      value={prefs.categories[key as keyof typeof prefs.categories]}
                      onChange={() => savePrefs({ ...prefs, categories: { ...prefs.categories, [key]: !prefs.categories[key as keyof typeof prefs.categories] } })}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Quiet hours */}
            {prefs.enabled && (
              <div className="bg-surface-container rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">dark_mode</span>
                  <div className="flex-1">
                    <p className="font-body text-sm text-on-surface">Horário silencioso</p>
                    <p className="font-label text-[11px] text-on-surface-variant">Ideal para o sono noturno</p>
                  </div>
                  <Toggle
                    value={prefs.quietHours.enabled}
                    onChange={() => savePrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled } })}
                  />
                </div>
                {prefs.quietHours.enabled && (
                  <div className="flex items-center gap-3 mt-3 ml-9">
                    <button onClick={() => setPickingQuietHour('start')} className="px-3.5 py-1.5 rounded-lg bg-surface-container-low active:bg-surface-container-high">
                      <span className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.start)}</span>
                    </button>
                    <span className="font-label text-xs text-on-surface-variant">até</span>
                    <button onClick={() => setPickingQuietHour('end')} className="px-3.5 py-1.5 rounded-lg bg-surface-container-low active:bg-surface-container-high">
                      <span className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.end)}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ================================================ */}
        {/* CONTA                                            */}
        {/* ================================================ */}
        <section className="bg-surface-container rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">account_circle</span>
            <p className="text-on-surface font-body text-sm truncate flex-1">{user?.email}</p>
          </div>
          <button onClick={signOut} className="w-full py-2.5 rounded-xl bg-error/10 text-error font-label font-semibold text-sm">
            Sair da conta
          </button>
        </section>

        <p className="text-center font-label text-[10px] text-on-surface-variant/50 pt-1">Yaya v1.0.0</p>
      </div>

      {/* ================================================ */}
      {/* MODAIS                                           */}
      {/* ================================================ */}

      {/* Custom interval */}
      {customModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 sm:mx-4">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Personalizar</h3>
            <div className="flex items-center gap-4 justify-center mb-6">
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1 block">Horas</label>
                <input type="number" min="0" max="99" value={customH} onChange={e => setCustomH(e.target.value.replace(/\D/g, ''))} placeholder="0"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <span className="font-headline text-2xl text-on-surface-variant mt-5">:</span>
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1 block">Min</label>
                <input type="number" min="0" max="59" value={customM} onChange={e => setCustomM(e.target.value.replace(/\D/g, ''))} placeholder="00"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCustomModal(null)} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">Cancelar</button>
              <button onClick={saveCustom} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Quiet hour picker */}
      {pickingQuietHour && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:mx-4">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-3">
              {pickingQuietHour === 'start' ? 'Início do silêncio' : 'Fim do silêncio'}
            </h3>
            <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto">
              {HOURS_24.map(h => {
                const isActive = pickingQuietHour === 'start' ? prefs.quietHours.start === h : prefs.quietHours.end === h
                return (
                  <button key={h} onClick={() => { setPickingQuietHour(null); savePrefs({ ...prefs, quietHours: { ...prefs.quietHours, [pickingQuietHour]: h } }) }}
                    className={`w-16 py-2 rounded-lg font-label text-sm font-medium ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                    {padH(h)}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPickingQuietHour(null)} className="mt-4 w-full py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Bath hour picker */}
      {pickingBathHour && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:mx-4">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-3">Horário do banho</h3>
            <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto">
              {BATH_HOURS.map(h => {
                const isActive = bathHours.includes(h)
                return (
                  <button key={h} onClick={() => isActive ? removeBathHour(h) : addBathHour(h)}
                    className={`w-16 py-2 rounded-lg font-label text-sm font-medium ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                    {padH(h)}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPickingBathHour(false)} className="mt-4 w-full py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">Fechar</button>
          </div>
        </div>
      )}

      {/* Info modal - Sleep */}
      {infoModal === 'sleep' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-xl">bedtime</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Como funciona o sono</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-label text-xs text-primary font-bold">1</span>
                </span>
                <p className="font-body text-sm text-on-surface-variant">
                  Ao registrar <strong className="text-on-surface">"Dormiu"</strong>, calculamos quando o bebê deve acordar (duração da soneca).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-label text-xs text-primary font-bold">2</span>
                </span>
                <p className="font-body text-sm text-on-surface-variant">
                  Ao registrar <strong className="text-on-surface">"Acordou"</strong>, calculamos quando deve dormir novamente (janela de sono).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="font-label text-xs text-primary font-bold">3</span>
                </span>
                <p className="font-body text-sm text-on-surface-variant">
                  À noite, ative o <strong className="text-on-surface">horário silencioso</strong> para pausar os alertas de sono noturno.
                </p>
              </div>
            </div>
            <button onClick={() => setInfoModal(null)} className="mt-5 w-full py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm">Entendi</button>
          </div>
        </div>
      )}

      {/* Info modal - Notifications */}
      {infoModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-xl">notifications</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Como funcionam</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-label text-xs text-primary font-semibold mb-1">Mamada e Fralda</p>
                <p className="font-body text-sm text-on-surface-variant">
                  Você recebe um alerta quando o intervalo está acabando (80%) e outro quando já passou.
                </p>
                <div className="bg-surface-container-low rounded-lg p-2.5 mt-2 flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">breastfeeding</span>
                  <div>
                    <p className="font-body text-xs text-on-surface font-semibold">Hora da mamada!</p>
                    <p className="font-label text-[11px] text-on-surface-variant">Última mamada foi há {mToStr(intervals['feed']?.minutes ?? 180)}.</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-label text-xs text-primary font-semibold mb-1">Banho</p>
                <p className="font-body text-sm text-on-surface-variant">
                  Alerta único 15 minutos antes do horário agendado.
                </p>
              </div>
              <div>
                <p className="font-label text-xs text-primary font-semibold mb-1">Horário silencioso</p>
                <p className="font-body text-sm text-on-surface-variant">
                  Nenhum alerta durante o período configurado. Ideal para o sono noturno.
                </p>
              </div>
            </div>
            <button onClick={() => setInfoModal(null)} className="mt-5 w-full py-2.5 rounded-xl bg-primary text-on-primary font-label font-semibold text-sm">Entendi</button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
