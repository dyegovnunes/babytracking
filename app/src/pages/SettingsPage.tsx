import { useNavigate } from 'react-router-dom'
import { useAppState, useAppDispatch, updateIntervals, clearAllLogs } from '../contexts/AppContext'
import { useAuth, signOut } from '../contexts/AuthContext'
import { useState, useCallback, useEffect } from 'react'
import Toast from '../components/ui/Toast'
import { AdBanner } from '../components/ui/AdBanner'
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
  const [confirmClear, setConfirmClear] = useState(false)

  // UI state
  const [expanded, setExpanded] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customH, setCustomH] = useState('')
  const [customM, setCustomM] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)
  const [editingBathIdx, setEditingBathIdx] = useState<number | null>(null)
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
      <div className="bg-surface-container rounded-md overflow-hidden">
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
                  className={`px-3.5 py-1.5 rounded-md font-label text-sm font-medium transition-colors ${config.minutes === p.minutes ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => openCustom(cat)} className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-md bg-primary/10 active:bg-primary/20 min-h-[44px]">
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
            <IntervalRow cat="feed" icon="breastfeeding" label="Amamentação" presets={FEED_PRESETS} />
            <IntervalRow cat="diaper" icon="water_drop" label="Fraldas" presets={DIAPER_PRESETS} />

            {/* Sono header com info icon */}
            <div className="flex items-center gap-2 pt-2">
              <span className="material-symbols-outlined text-on-surface-variant text-base">bedtime</span>
              <span className="font-label text-xs text-on-surface-variant font-semibold flex-1">Sono</span>
              <button onClick={() => setInfoModal('sleep')} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center active:bg-primary/20">
                <span className="material-symbols-outlined text-primary text-sm">info</span>
              </button>
            </div>

            <IntervalRow cat="sleep_nap" icon="nights_stay" label="Duração da soneca" presets={SLEEP_NAP_PRESETS} />
            <IntervalRow cat="sleep_awake" icon="wb_sunny" label="Janela de sono" presets={SLEEP_AWAKE_PRESETS} />

            {/* Pausar durante sono */}
            <div className="bg-surface-container rounded-md px-4 py-3.5 flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">pause_circle</span>
              <div className="flex-1">
                <p className="font-body text-sm text-on-surface">Pausar alertas durante sono</p>
                <p className="font-label text-[11px] text-on-surface-variant">Amamentação e fralda não alertam enquanto dorme</p>
              </div>
              <Toggle value={pauseDuringSleep} onChange={togglePauseDuringSleep} />
            </div>

            {/* Horário de sono noturno (moved from Notifications) */}
            <div className="bg-surface-container rounded-md px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">dark_mode</span>
                <div className="flex-1">
                  <p className="font-body text-sm text-on-surface">Horário de sono noturno</p>
                  <p className="font-label text-[11px] text-on-surface-variant">Notificações pausadas neste período</p>
                </div>
                <Toggle
                  value={prefs.quietHours.enabled}
                  onChange={() => savePrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled } })}
                />
              </div>
              {prefs.quietHours.enabled && (
                <div className="flex items-center gap-3 mt-3 ml-9">
                  <button onClick={() => setPickingQuietHour('start')} className="px-4 py-2.5 rounded-md bg-surface-container-low active:bg-surface-container-high min-h-[44px]">
                    <span className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.start)}</span>
                  </button>
                  <span className="font-label text-xs text-on-surface-variant">até</span>
                  <button onClick={() => setPickingQuietHour('end')} className="px-4 py-2.5 rounded-md bg-surface-container-low active:bg-surface-container-high min-h-[44px]">
                    <span className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.end)}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================ */}
        {/* SEÇÃO BANHO                                      */}
        {/* ================================================ */}
        <section>
          <div className="bg-surface-container rounded-md p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-primary text-lg">bathtub</span>
              <div className="flex-1">
                <h2 className="font-headline text-sm font-bold text-on-surface">Banho</h2>
                <p className="font-label text-[11px] text-on-surface-variant">Aviso 15 min antes · máx. 4 horários</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {[...bathHours].sort((a, b) => a - b).map((h, idx) => (
                <div key={h} className="flex items-center gap-1 bg-surface-container-low rounded-md pl-1 pr-1 py-1">
                  {editingBathIdx === idx ? (
                    <input
                      type="time"
                      autoFocus
                      defaultValue={padH(h)}
                      onBlur={(e) => {
                        const newH = parseInt(e.target.value.split(':')[0], 10)
                        setEditingBathIdx(null)
                        if (isNaN(newH) || newH === h) return
                        if (bathHours.includes(newH)) { setToast('Horário já existe'); return }
                        const updated = bathHours.map(x => x === h ? newH : x)
                        setBathHours(updated)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      }}
                      className="w-20 bg-transparent text-on-surface font-headline text-sm font-bold text-center outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingBathIdx(idx)}
                      className="px-2.5 py-1.5 rounded-md active:bg-surface-container-high min-h-[36px]"
                    >
                      <span className="font-headline text-sm text-on-surface font-bold">{padH(h)}</span>
                    </button>
                  )}
                  {bathHours.length > 1 && (
                    <button onClick={() => removeBathHour(h)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-error/10">
                      <span className="material-symbols-outlined text-error/60 text-sm">close</span>
                    </button>
                  )}
                </div>
              ))}

              {bathHours.length < 4 && (
                <button
                  onClick={() => {
                    if (bathHours.length >= 4) { setToast('Máximo de 4 horários'); return }
                    setPickingBathHour(true)
                  }}
                  className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center active:bg-primary/20"
                >
                  <span className="material-symbols-outlined text-primary text-lg">add</span>
                </button>
              )}
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
            <button onClick={() => setInfoModal('notifications')} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center active:bg-primary/20">
              <span className="material-symbols-outlined text-primary text-sm">info</span>
            </button>
          </div>

          <div className="space-y-2">
            {/* Global */}
            <div className={`rounded-md px-4 py-4 flex items-center gap-3 transition-colors ${prefs.enabled ? 'bg-primary/15 border border-primary/30' : 'bg-tertiary/10 border border-tertiary/30'}`}>
              <span className={`material-symbols-outlined text-lg ${prefs.enabled ? 'text-primary' : 'text-tertiary'}`} style={prefs.enabled ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {prefs.enabled ? 'notifications_active' : 'notifications_off'}
              </span>
              <div className="flex-1">
                <span className={`font-body text-sm font-semibold ${prefs.enabled ? 'text-primary' : 'text-tertiary'}`}>
                  {prefs.enabled ? 'Notificações ativas' : 'Notificações desativadas'}
                </span>
              </div>
              <Toggle value={prefs.enabled} onChange={() => savePrefs({ ...prefs, enabled: !prefs.enabled })} />
            </div>

            {/* Per category */}
            {prefs.enabled && (
              <div className="bg-surface-container rounded-md overflow-hidden">
                {[
                  { key: 'feed', label: 'Amamentação', icon: 'breastfeeding', desc: `A cada ${mToStr(intervals['feed']?.minutes ?? 180)}` },
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

          </div>
        </section>

        {/* ================================================ */}
        {/* CONTA                                            */}
        {/* ================================================ */}
        <section className="bg-surface-container rounded-md p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">account_circle</span>
            <p className="text-on-surface font-body text-sm truncate flex-1">{user?.email}</p>
          </div>
          <button onClick={signOut} className="w-full py-2.5 rounded-md bg-error/10 text-error font-label font-semibold text-sm">
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-6 sm:mx-4">
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Personalizar</h3>
            <div className="flex items-center gap-4 justify-center mb-6">
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1 block">Horas</label>
                <input type="number" min="0" max="99" value={customH} onChange={e => setCustomH(e.target.value.replace(/\D/g, ''))} placeholder="0"
                  className="w-20 bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <span className="font-headline text-2xl text-on-surface-variant mt-5">:</span>
              <div className="text-center">
                <label className="font-label text-xs text-on-surface-variant mb-1 block">Min</label>
                <input type="number" min="0" max="59" value={customM} onChange={e => setCustomM(e.target.value.replace(/\D/g, ''))} placeholder="00"
                  className="w-20 bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCustomModal(null)} className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">Cancelar</button>
              <button onClick={saveCustom} className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Quiet hour picker */}
      {pickingQuietHour && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPickingQuietHour(null)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4">
              {pickingQuietHour === 'start' ? 'Início do sono noturno' : 'Fim do sono noturno'}
            </h3>
            <div className="flex justify-center mb-5">
              <input
                type="time"
                value={padH(pickingQuietHour === 'start' ? prefs.quietHours.start : prefs.quietHours.end)}
                onChange={e => {
                  const h = parseInt(e.target.value.split(':')[0], 10)
                  if (!isNaN(h)) {
                    savePrefs({ ...prefs, quietHours: { ...prefs.quietHours, [pickingQuietHour!]: h } })
                  }
                }}
                className="bg-surface-container-low rounded-md px-6 py-4 text-on-surface font-headline text-3xl text-center outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button onClick={() => setPickingQuietHour(null)} className="w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm">OK</button>
          </div>
        </div>
      )}

      {/* Bath hour picker */}
      {pickingBathHour && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPickingBathHour(false)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Adicionar horário</h3>
            <div className="flex justify-center mb-5">
              <input
                type="time"
                defaultValue="12:00"
                onChange={e => {
                  const h = parseInt(e.target.value.split(':')[0], 10)
                  if (!isNaN(h)) {
                    if (bathHours.includes(h)) {
                      setToast('Horário já existe')
                      return
                    }
                    if (bathHours.length >= 4) {
                      setToast('Máximo de 4 horários')
                      return
                    }
                    addBathHour(h)
                  }
                }}
                className="bg-surface-container-low rounded-md px-6 py-4 text-on-surface font-headline text-3xl text-center outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button onClick={() => setPickingBathHour(false)} className="w-full py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Info modal - Sleep */}
      {infoModal === 'sleep' && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
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
                  À noite, ative o <strong className="text-on-surface">horário de sono noturno</strong> para pausar os alertas automaticamente.
                </p>
              </div>
            </div>
            <button onClick={() => setInfoModal(null)} className="mt-5 w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm">Entendi</button>
          </div>
        </div>
      )}

      {/* Info modal - Notifications */}
      {infoModal === 'notifications' && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}>
          <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-xl">notifications</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Como funcionam</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-label text-xs text-primary font-semibold mb-1">Amamentação e Fralda</p>
                <p className="font-body text-sm text-on-surface-variant">
                  Você recebe um alerta quando o intervalo está acabando (80%) e outro quando já passou.
                </p>
                <div className="bg-surface-container-low rounded-md p-2.5 mt-2 flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary text-sm mt-0.5">breastfeeding</span>
                  <div>
                    <p className="font-body text-xs text-on-surface font-semibold">Hora da amamentação!</p>
                    <p className="font-label text-[11px] text-on-surface-variant">Última amamentação foi há {mToStr(intervals['feed']?.minutes ?? 180)}.</p>
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
                <p className="font-label text-xs text-primary font-semibold mb-1">Horário de sono noturno</p>
                <p className="font-body text-sm text-on-surface-variant">
                  Nenhum alerta durante o período configurado. Configure na seção de sono.
                </p>
              </div>
            </div>
            <button onClick={() => setInfoModal(null)} className="mt-5 w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm">Entendi</button>
          </div>
        </div>
      )}

      {/* ===== LIMPAR HISTÓRICO ===== */}
      <div className="px-5 mt-6">
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-error text-xl">delete_sweep</span>
            <div className="flex-1 text-left">
              <p className="text-on-surface font-body text-sm font-medium">Limpar histórico</p>
              <p className="text-on-surface-variant font-label text-xs">Remove todos os registros</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-xl">chevron_right</span>
          </button>
        ) : (
          <div className="bg-error/10 rounded-md p-4">
            <p className="text-error font-body text-sm font-medium mb-3">
              Tem certeza? Isso apagará todos os registros.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (baby) {
                    const ok = await clearAllLogs(dispatch, baby.id)
                    if (ok) setToast('Histórico limpo!')
                  }
                  setConfirmClear(false)
                }}
                className="flex-1 py-2.5 rounded-md bg-gradient-to-br from-error-dim to-error text-on-error font-label font-semibold text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      <AdBanner />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
