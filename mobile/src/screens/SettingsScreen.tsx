import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Switch, TextInput, Modal } from 'react-native'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import { requestNotificationPermission, rescheduleAllNotifications, cancelAllNotifications } from '../lib/notifications'
import { loadNotificationPrefs, saveNotificationPrefs, DEFAULT_PREFS, type NotificationPrefs } from '../lib/notificationPrefs'
import { DEFAULT_EVENTS } from '../lib/constants'
import Toast from '../components/ui/Toast'

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

function mToStr(m: number): string {
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h${r}min` : `${h}h`
}
function padH(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

export default function SettingsScreen() {
  const { intervals, logs, baby } = useAppState()
  const dispatch = useAppDispatch()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customH, setCustomH] = useState('')
  const [customM, setCustomM] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)
  const [infoModal, setInfoModal] = useState<'sleep' | 'notifications' | null>(null)

  useEffect(() => { loadNotificationPrefs().then(setPrefs) }, [])

  const updatePrefs = useCallback(async (updated: NotificationPrefs) => {
    setPrefs(updated)
    await saveNotificationPrefs(updated)
    if (updated.enabled) await rescheduleAllNotifications(logs, intervals, DEFAULT_EVENTS)
    else await cancelAllNotifications()
  }, [logs, intervals])

  const handleGlobalToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) return
      await updatePrefs({ ...prefs, enabled: true })
      setToast('Notificações ativadas!')
    } else {
      await updatePrefs({ ...prefs, enabled: false })
      setToast('Notificações desativadas')
    }
  }, [prefs, updatePrefs])

  const handlePreset = useCallback(async (cat: string, p: { minutes: number; warn: number }) => {
    if (!baby) return
    const updated = { ...intervals, [cat]: { ...intervals[cat], minutes: p.minutes, warn: p.warn } }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) { setToast('Atualizado!'); await rescheduleAllNotifications(logs, updated, DEFAULT_EVENTS) }
  }, [intervals, baby, dispatch, logs])

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
    if (ok) { setToast('Intervalo salvo!'); await rescheduleAllNotifications(logs, updated, DEFAULT_EVENTS) }
    setCustomModal(null)
  }, [customModal, customH, customM, intervals, baby, dispatch, logs])

  // Bath
  const bathHours = intervals['bath']?.scheduledHours ?? [18]
  const setBathHours = useCallback(async (newHours: number[]) => {
    if (!baby) return
    const sorted = [...newHours].sort((a, b) => a - b)
    await updateIntervals(dispatch, baby.id, { ...intervals, bath: { ...intervals['bath'], mode: 'scheduled' as const, scheduledHours: sorted } })
  }, [intervals, baby, dispatch])

  const handleBathCount = useCallback(async (count: number) => {
    let h = [...bathHours]; const defaults = [7, 12, 18]
    while (h.length < count) { const next = defaults.find(x => !h.includes(x)) ?? h[h.length - 1] + 4; h.push(next) }
    h = h.slice(0, count); await setBathHours(h); setToast('Atualizado!')
  }, [bathHours, setBathHours])

  const togglePauseDuringSleep = useCallback(async () => {
    const updated = { ...prefs, pauseDuringSleep: !prefs.pauseDuringSleep }
    await updatePrefs(updated)
    setToast(updated.pauseDuringSleep ? 'Alertas pausados durante sono' : 'Alertas ativos durante sono')
  }, [prefs, updatePrefs])

  // Interval row component
  function IRow({ cat, emoji, label, desc, presets }: { cat: string; emoji: string; label: string; desc: string; presets: { label: string; minutes: number; warn: number }[] }) {
    const config = intervals[cat]
    if (!config) return null
    const isOpen = expanded === cat
    return (
      <View className="bg-surface-container rounded-xl overflow-hidden">
        <Pressable onPress={() => setExpanded(isOpen ? null : cat)} className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70">
          <Text className="text-base">{emoji}</Text>
          <View className="flex-1">
            <Text className="font-body text-sm text-on-surface">{label}</Text>
            <Text className="font-label text-[11px] text-on-surface-variant">{desc}</Text>
          </View>
          <Text className="font-label text-sm text-primary font-semibold">{mToStr(config.minutes)}</Text>
          <Text className="text-on-surface-variant text-xs" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>▼</Text>
        </Pressable>
        {isOpen && (
          <View className="px-4 pb-3">
            <View className="flex-row flex-wrap gap-2 mb-2">
              {presets.map(p => (
                <Pressable key={p.minutes} onPress={() => handlePreset(cat, p)} className="px-3.5 py-1.5 rounded-lg" style={{ backgroundColor: config.minutes === p.minutes ? '#b79fff' : '#2a2650' }}>
                  <Text className="font-label text-sm font-medium" style={{ color: config.minutes === p.minutes ? '#0d0a27' : '#aca7cc' }}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => openCustom(cat)} className="flex-row items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 active:opacity-70">
              <Text className="text-xs">✏️</Text>
              <Text className="font-label text-xs text-primary font-medium">Personalizar</Text>
            </Pressable>
          </View>
        )}
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>

        {/* SEÇÃO 1: INTERVALOS */}
        <View className="px-5 pt-6 pb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">⏱</Text>
            <Text className="font-headline text-sm font-bold text-on-surface">Intervalos e horários</Text>
          </View>
        </View>

        <View className="px-5 mt-2 gap-2">
          <IRow cat="feed" emoji="🤱" label="Mamadas" desc="Intervalo entre mamadas" presets={FEED_PRESETS} />
          <IRow cat="diaper" emoji="💧" label="Fraldas" desc="Intervalo entre trocas" presets={DIAPER_PRESETS} />

          {/* Sono sub-header */}
          <View className="flex-row items-center gap-2 pt-2">
            <Text className="text-sm">🌙</Text>
            <Text className="font-label text-xs text-on-surface-variant font-semibold flex-1">Sono</Text>
            <Pressable onPress={() => setInfoModal('sleep')} className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary text-xs font-bold">i</Text>
            </Pressable>
          </View>

          <IRow cat="sleep_nap" emoji="🌙" label="Duração da soneca" desc="Quanto tempo o bebê dorme" presets={SLEEP_NAP_PRESETS} />
          <IRow cat="sleep_awake" emoji="☀️" label="Janela de sono" desc="Tempo máximo acordado" presets={SLEEP_AWAKE_PRESETS} />

          {/* Pausar durante sono */}
          <View className="bg-surface-container rounded-xl px-4 py-3.5 flex-row items-center gap-3">
            <Text className="text-base">⏸</Text>
            <View className="flex-1">
              <Text className="font-body text-sm text-on-surface">Pausar alertas durante sono</Text>
              <Text className="font-label text-[11px] text-on-surface-variant">Mamada e fralda não alertam enquanto dorme</Text>
            </View>
            <Switch value={prefs.pauseDuringSleep} onValueChange={togglePauseDuringSleep}
              trackColor={{ false: '#2a2650', true: '#b79fff50' }} thumbColor={prefs.pauseDuringSleep ? '#b79fff' : '#aca7cc'} />
          </View>

          {/* Banho */}
          <View className="flex-row items-center gap-2 pt-2">
            <Text className="text-sm">🛁</Text>
            <Text className="font-label text-xs text-on-surface-variant font-semibold">Banho</Text>
          </View>

          <View className="bg-surface-container rounded-xl p-4 gap-3">
            <View className="flex-row gap-2">
              {BATH_COUNTS.map(c => (
                <Pressable key={c} onPress={() => handleBathCount(c)} className="flex-1 py-2 rounded-lg items-center"
                  style={{ backgroundColor: bathHours.length === c ? '#b79fff' : '#2a2650' }}>
                  <Text className="font-label text-sm font-semibold" style={{ color: bathHours.length === c ? '#0d0a27' : '#aca7cc' }}>{c}x</Text>
                </Pressable>
              ))}
            </View>
            {bathHours.map(h => (
              <View key={h} className="flex-row items-center justify-between bg-surface-container-low rounded-lg px-4 py-2.5">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm">⏰</Text>
                  <Text className="font-headline text-sm text-on-surface font-bold">{padH(h)}</Text>
                </View>
                {bathHours.length > 1 && (
                  <Pressable onPress={() => { const nh = bathHours.filter(x => x !== h); setBathHours(nh); setToast('Removido!') }} className="active:opacity-50">
                    <Text className="text-error text-lg">✕</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={() => setPickingBathHour(true)} className="py-2 rounded-lg bg-primary/10 items-center active:opacity-70">
              <Text className="font-label text-xs text-primary font-semibold">Alterar horário</Text>
            </Pressable>
            <Text className="font-label text-[11px] text-on-surface-variant text-center">Aviso 15 min antes</Text>
          </View>
        </View>

        {/* SEÇÃO 2: NOTIFICAÇÕES */}
        <View className="px-5 pt-8 pb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🔔</Text>
            <Text className="font-headline text-sm font-bold text-on-surface flex-1">Notificações</Text>
            <Pressable onPress={() => setInfoModal('notifications')} className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary text-xs font-bold">i</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-5 mt-2 gap-2">
          <View className="bg-surface-container rounded-xl px-4 py-3.5 flex-row items-center gap-3">
            <Text className="text-lg">🔔</Text>
            <Text className="flex-1 font-body text-sm text-on-surface">Ativar notificações</Text>
            <Switch value={prefs.enabled} onValueChange={handleGlobalToggle}
              trackColor={{ false: '#2a2650', true: '#b79fff50' }} thumbColor={prefs.enabled ? '#b79fff' : '#aca7cc'} />
          </View>

          {prefs.enabled && (
            <View className="bg-surface-container rounded-xl overflow-hidden">
              {[
                { key: 'feed', label: 'Mamadas', emoji: '🤱' },
                { key: 'diaper', label: 'Fraldas', emoji: '💧' },
                { key: 'sleep', label: 'Sono', emoji: '🌙' },
                { key: 'bath', label: 'Banho', emoji: '🛁' },
              ].map(({ key, label, emoji }, i) => (
                <View key={key} className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}>
                  <Text className="text-base">{emoji}</Text>
                  <Text className="flex-1 font-body text-sm text-on-surface">{label}</Text>
                  <Switch value={prefs.categories[key as keyof typeof prefs.categories]}
                    onValueChange={() => updatePrefs({ ...prefs, categories: { ...prefs.categories, [key]: !prefs.categories[key as keyof typeof prefs.categories] } })}
                    trackColor={{ false: '#2a2650', true: '#b79fff50' }} thumbColor={prefs.categories[key as keyof typeof prefs.categories] ? '#b79fff' : '#aca7cc'} />
                </View>
              ))}
            </View>
          )}

          {prefs.enabled && (
            <View className="bg-surface-container rounded-xl px-4 py-3.5">
              <View className="flex-row items-center gap-3">
                <Text className="text-lg">🌙</Text>
                <View className="flex-1">
                  <Text className="font-body text-sm text-on-surface">Horário silencioso</Text>
                  <Text className="font-label text-[11px] text-on-surface-variant">Ideal para sono noturno</Text>
                </View>
                <Switch value={prefs.quietHours.enabled}
                  onValueChange={() => updatePrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: !prefs.quietHours.enabled } })}
                  trackColor={{ false: '#2a2650', true: '#b79fff50' }} thumbColor={prefs.quietHours.enabled ? '#b79fff' : '#aca7cc'} />
              </View>
              {prefs.quietHours.enabled && (
                <View className="flex-row items-center gap-3 mt-3 ml-9">
                  <Pressable onPress={() => setPickingQuietHour('start')} className="px-3.5 py-1.5 rounded-lg bg-surface-container-low active:opacity-70">
                    <Text className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.start)}</Text>
                  </Pressable>
                  <Text className="font-label text-xs text-on-surface-variant">até</Text>
                  <Pressable onPress={() => setPickingQuietHour('end')} className="px-3.5 py-1.5 rounded-lg bg-surface-container-low active:opacity-70">
                    <Text className="font-headline text-sm text-on-surface font-bold">{padH(prefs.quietHours.end)}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAIS */}

      {/* Custom interval */}
      <Modal visible={customModal !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-6">
            <Text className="font-headline text-lg font-bold text-on-surface mb-4">Personalizar</Text>
            <View className="flex-row items-center gap-4 justify-center mb-6">
              <View className="items-center">
                <Text className="font-label text-xs text-on-surface-variant mb-1">Horas</Text>
                <TextInput value={customH} onChangeText={t => setCustomH(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="0" placeholderTextColor="#aca7cc"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center" />
              </View>
              <Text className="font-headline text-2xl text-on-surface-variant mt-5">:</Text>
              <View className="items-center">
                <Text className="font-label text-xs text-on-surface-variant mb-1">Min</Text>
                <TextInput value={customM} onChangeText={t => setCustomM(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor="#aca7cc"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setCustomModal(null)} className="flex-1 py-3 rounded-xl bg-surface-variant items-center">
                <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
              </Pressable>
              <Pressable onPress={saveCustom} className="flex-1 py-3 rounded-xl bg-primary items-center">
                <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quiet hour picker */}
      <Modal visible={pickingQuietHour !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-5" style={{ maxHeight: 420 }}>
            <Text className="font-headline text-lg font-bold text-on-surface mb-3">
              {pickingQuietHour === 'start' ? 'Início do silêncio' : 'Fim do silêncio'}
            </Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {HOURS_24.map(h => {
                  const isActive = pickingQuietHour === 'start' ? prefs.quietHours.start === h : prefs.quietHours.end === h
                  return (
                    <Pressable key={h} onPress={() => { setPickingQuietHour(null); updatePrefs({ ...prefs, quietHours: { ...prefs.quietHours, [pickingQuietHour!]: h } }) }}
                      className="w-16 py-2 rounded-lg items-center" style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}>
                      <Text className="font-label text-sm font-medium" style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}>{padH(h)}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
            <Pressable onPress={() => setPickingQuietHour(null)} className="mt-4 py-2.5 rounded-xl bg-surface-variant items-center">
              <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Bath hour picker */}
      <Modal visible={pickingBathHour} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-5" style={{ maxHeight: 420 }}>
            <Text className="font-headline text-lg font-bold text-on-surface mb-3">Horário do banho</Text>
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {BATH_HOURS.map(h => {
                  const isActive = bathHours.includes(h)
                  return (
                    <Pressable key={h} onPress={() => {
                      if (isActive) { const nh = bathHours.filter(x => x !== h); if (nh.length > 0) { setBathHours(nh); setToast('Removido!') } }
                      else { setBathHours([...bathHours, h]); setPickingBathHour(false); setToast('Adicionado!') }
                    }} className="w-16 py-2 rounded-lg items-center" style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}>
                      <Text className="font-label text-sm font-medium" style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}>{padH(h)}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
            <Pressable onPress={() => setPickingBathHour(false)} className="mt-4 py-2.5 rounded-xl bg-surface-variant items-center">
              <Text className="text-on-surface-variant font-label font-semibold text-sm">Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Info: Sleep */}
      <Modal visible={infoModal === 'sleep'} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-end" onPress={() => setInfoModal(null)}>
          <View className="bg-surface-container w-full rounded-t-2xl p-5">
            <Text className="font-headline text-lg font-bold text-on-surface mb-3">🌙 Como funciona o sono</Text>
            <Text className="font-body text-sm text-on-surface-variant leading-6 mb-1">
              1. Ao registrar "Dormiu", calculamos quando o bebê deve acordar.{'\n\n'}
              2. Ao registrar "Acordou", calculamos quando deve dormir.{'\n\n'}
              3. À noite, ative o horário silencioso para pausar os alertas.
            </Text>
            <Pressable onPress={() => setInfoModal(null)} className="mt-4 py-2.5 rounded-xl bg-primary items-center">
              <Text className="text-on-primary font-label font-semibold text-sm">Entendi</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Info: Notifications */}
      <Modal visible={infoModal === 'notifications'} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-end" onPress={() => setInfoModal(null)}>
          <View className="bg-surface-container w-full rounded-t-2xl p-5">
            <Text className="font-headline text-lg font-bold text-on-surface mb-3">🔔 Como funcionam</Text>
            <Text className="font-body text-sm text-on-surface-variant leading-6 mb-1">
              <Text className="text-primary font-semibold">Mamada e Fralda:</Text> Alerta quando o intervalo está acabando (80%) e quando já passou.{'\n\n'}
              <Text className="text-primary font-semibold">Banho:</Text> Alerta único 15 min antes do horário agendado.{'\n\n'}
              <Text className="text-primary font-semibold">Silêncio:</Text> Nenhum alerta durante o período configurado.
            </Text>
            <Pressable onPress={() => setInfoModal(null)} className="mt-4 py-2.5 rounded-xl bg-primary items-center">
              <Text className="text-on-primary font-label font-semibold text-sm">Entendi</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
