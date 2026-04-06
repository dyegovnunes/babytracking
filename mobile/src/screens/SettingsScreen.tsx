import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Switch, TextInput, Modal } from 'react-native'
import * as Notifications from 'expo-notifications'
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

function minutesToDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

function padHour(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

export default function SettingsScreen() {
  const { intervals, logs, baby } = useAppState()
  const dispatch = useAppDispatch()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)
  const [pickingBathHour, setPickingBathHour] = useState(false)

  useEffect(() => {
    loadNotificationPrefs().then(setPrefs)
  }, [])

  const updatePrefs = useCallback(async (updated: NotificationPrefs) => {
    setPrefs(updated)
    await saveNotificationPrefs(updated)
    if (updated.enabled) {
      await rescheduleAllNotifications(logs, intervals, DEFAULT_EVENTS)
    } else {
      await cancelAllNotifications()
    }
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

  const handleCategoryToggle = useCallback(async (cat: string, value: boolean) => {
    await updatePrefs({
      ...prefs,
      categories: { ...prefs.categories, [cat]: value },
    })
  }, [prefs, updatePrefs])

  const handleQuietToggle = useCallback(async (value: boolean) => {
    await updatePrefs({
      ...prefs,
      quietHours: { ...prefs.quietHours, enabled: value },
    })
  }, [prefs, updatePrefs])

  const handleQuietHourSelect = useCallback(async (hour: number) => {
    if (!pickingQuietHour) return
    const updated = {
      ...prefs,
      quietHours: { ...prefs.quietHours, [pickingQuietHour]: hour },
    }
    setPickingQuietHour(null)
    await updatePrefs(updated)
  }, [prefs, pickingQuietHour, updatePrefs])

  const handlePresetSelect = useCallback(
    async (cat: string, preset: { minutes: number; warn: number }) => {
      if (!baby) return
      const updated = {
        ...intervals,
        [cat]: { ...intervals[cat], minutes: preset.minutes, warn: preset.warn },
      }
      const ok = await updateIntervals(dispatch, baby.id, updated)
      if (ok) {
        setToast('Intervalo atualizado!')
        await rescheduleAllNotifications(logs, updated, DEFAULT_EVENTS)
      }
    },
    [intervals, baby, dispatch, logs],
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
    if (ok) {
      setToast('Intervalo personalizado salvo!')
      await rescheduleAllNotifications(logs, updated, DEFAULT_EVENTS)
    }
    setCustomModal(null)
  }, [customModal, customHours, customMinutes, intervals, baby, dispatch, logs])

  // ========== BATH HANDLERS ==========
  const bathConfig = intervals['bath']
  const bathHours = bathConfig?.scheduledHours ?? [18]

  const handleBathCountChange = useCallback(async (count: number) => {
    if (!baby) return
    let newHours = [...bathHours]
    if (count > newHours.length) {
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

  // ========== RENDER HELPERS ==========

  function renderIntervalSection(
    cat: string,
    emoji: string,
    label: string,
    description: string,
    presets: { label: string; minutes: number; warn: number }[],
  ) {
    const config = intervals[cat]
    if (!config) return null
    const isExpanded = expandedSection === cat

    return (
      <View className="bg-surface-container rounded-xl overflow-hidden">
        <Pressable
          onPress={() => setExpandedSection(isExpanded ? null : cat)}
          className="flex-row items-center gap-3 p-4 active:opacity-70"
        >
          <Text className="text-lg">{emoji}</Text>
          <View className="flex-1">
            <Text className="font-body text-sm text-on-surface font-medium">{label}</Text>
            <Text className="font-label text-[11px] text-on-surface-variant">{description}</Text>
          </View>
          <Text className="font-label text-sm text-primary font-semibold">
            {minutesToDisplay(config.minutes)}
          </Text>
          <Text
            className="text-on-surface-variant text-xs"
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
          >
            ▼
          </Text>
        </Pressable>

        {isExpanded && (
          <View className="px-4 pb-4">
            <View className="flex-row flex-wrap gap-2 mb-3">
              {presets.map((preset) => {
                const isActive = config.minutes === preset.minutes
                return (
                  <Pressable
                    key={preset.minutes}
                    onPress={() => handlePresetSelect(cat, preset)}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}
                  >
                    <Text
                      className="font-label text-sm font-medium"
                      style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Pressable
              onPress={() => handleCustomOpen(cat)}
              className="flex-row items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 active:opacity-70"
            >
              <Text className="text-sm">✏️</Text>
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

        {/* ===== MAMADAS ===== */}
        <View className="px-5 pt-6 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Intervalos
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {renderIntervalSection('feed', '🤱', 'Mamadas', 'Intervalo entre mamadas', FEED_PRESETS)}
          {renderIntervalSection('diaper', '💧', 'Fraldas', 'Intervalo entre trocas', DIAPER_PRESETS)}
        </View>

        {/* ===== SONO ===== */}
        <View className="px-5 pt-6 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Sono
          </Text>
          <Text className="font-label text-xs text-on-surface-variant mt-1">
            Duração da soneca e janela de sono trabalham juntas
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {renderIntervalSection('sleep_nap', '🌙', 'Duração da soneca', 'Quanto tempo o bebê deve dormir', SLEEP_NAP_PRESETS)}
          {renderIntervalSection('sleep_awake', '☀️', 'Janela de sono', 'Tempo máximo acordado antes de dormir', SLEEP_AWAKE_PRESETS)}

          {/* How it works */}
          <View className="bg-primary/5 rounded-xl p-4">
            <Text className="font-label text-xs text-primary font-semibold mb-2">
              ℹ️ Como funciona
            </Text>
            <Text className="font-label text-xs text-on-surface-variant leading-5">
              1. Ao registrar "Dormiu", te avisamos quando o bebê deve acordar.{'\n'}
              2. Ao registrar "Acordou", te avisamos quando deve dormir.{'\n'}
              3. Alertas de sono são pausados durante o horário silencioso (sono noturno).
            </Text>
          </View>
        </View>

        {/* ===== BANHO ===== */}
        <View className="px-5 pt-6 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Banho
          </Text>
          <Text className="font-label text-xs text-on-surface-variant mt-1">
            Horários agendados para o banho
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {/* Bath count */}
          <View className="bg-surface-container rounded-xl p-4">
            <Text className="font-label text-xs text-on-surface-variant mb-3">Banhos por dia</Text>
            <View className="flex-row gap-2">
              {BATH_COUNTS.map((count) => {
                const isActive = bathHours.length === count
                return (
                  <Pressable
                    key={count}
                    onPress={() => handleBathCountChange(count)}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}
                  >
                    <Text
                      className="font-label text-sm font-semibold"
                      style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}
                    >
                      {count} {count === 1 ? 'banho' : 'banhos'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Bath times */}
          <View className="bg-surface-container rounded-xl p-4">
            <Text className="font-label text-xs text-on-surface-variant mb-3">Horários</Text>
            <View className="gap-2">
              {bathHours.map((hour) => (
                <View key={hour} className="flex-row items-center justify-between bg-surface-container-low rounded-lg px-4 py-3">
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base">⏰</Text>
                    <Text className="font-headline text-base text-on-surface font-bold">{padHour(hour)}</Text>
                  </View>
                  {bathHours.length > 1 && (
                    <Pressable onPress={() => handleRemoveBathHour(hour)} className="active:opacity-50">
                      <Text className="text-error text-lg">✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setPickingBathHour(true)}
              className="mt-3 py-2.5 rounded-lg bg-primary/10 items-center active:opacity-70"
            >
              <Text className="font-label text-sm text-primary font-semibold">+ Alterar horário</Text>
            </Pressable>
          </View>

          <View className="bg-primary/5 rounded-xl p-4">
            <Text className="font-label text-xs text-on-surface-variant">
              🔔 Você recebe o aviso 15 minutos antes do horário agendado.
            </Text>
          </View>
        </View>

        {/* ===== NOTIFICAÇÕES ===== */}
        <View className="px-5 pt-8 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Notificações
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {/* Global toggle */}
          <View className="bg-surface-container rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-lg">🔔</Text>
                <View className="flex-1">
                  <Text className="text-on-surface font-body text-sm font-medium">Ativar notificações</Text>
                  <Text className="font-label text-xs text-on-surface-variant mt-0.5">Receber alertas do app</Text>
                </View>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={handleGlobalToggle}
                trackColor={{ false: '#2a2650', true: '#b79fff50' }}
                thumbColor={prefs.enabled ? '#b79fff' : '#aca7cc'}
              />
            </View>
          </View>

          {/* Per-category toggles */}
          {prefs.enabled && (
            <View className="bg-surface-container rounded-xl overflow-hidden">
              <View className="px-4 pt-4 pb-2">
                <Text className="font-label text-xs text-on-surface-variant font-semibold">Categorias</Text>
              </View>
              {[
                { key: 'feed', label: 'Mamadas', emoji: '🤱' },
                { key: 'diaper', label: 'Fraldas', emoji: '💧' },
                { key: 'sleep', label: 'Sono', emoji: '🌙' },
                { key: 'bath', label: 'Banho', emoji: '🛁' },
              ].map(({ key, label, emoji }, i) => (
                <View
                  key={key}
                  className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base">{emoji}</Text>
                    <Text className="font-body text-sm text-on-surface">{label}</Text>
                  </View>
                  <Switch
                    value={prefs.categories[key]}
                    onValueChange={(v) => handleCategoryToggle(key, v)}
                    trackColor={{ false: '#2a2650', true: '#b79fff50' }}
                    thumbColor={prefs.categories[key] ? '#b79fff' : '#aca7cc'}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Quiet hours */}
          {prefs.enabled && (
            <View className="bg-surface-container rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-3 flex-1">
                  <Text className="text-lg">🌙</Text>
                  <View className="flex-1">
                    <Text className="text-on-surface font-body text-sm font-medium">Horário silencioso</Text>
                    <Text className="font-label text-xs text-on-surface-variant mt-0.5">Sem notificações nesse período</Text>
                  </View>
                </View>
                <Switch
                  value={prefs.quietHours.enabled}
                  onValueChange={handleQuietToggle}
                  trackColor={{ false: '#2a2650', true: '#b79fff50' }}
                  thumbColor={prefs.quietHours.enabled ? '#b79fff' : '#aca7cc'}
                />
              </View>

              {prefs.quietHours.enabled && (
                <View className="flex-row items-center gap-3 mt-3 ml-9">
                  <Pressable
                    onPress={() => setPickingQuietHour('start')}
                    className="px-4 py-2 rounded-lg bg-surface-container-low active:opacity-70"
                  >
                    <Text className="font-headline text-base text-on-surface font-bold">
                      {padHour(prefs.quietHours.start)}
                    </Text>
                  </Pressable>
                  <Text className="font-label text-sm text-on-surface-variant">até</Text>
                  <Pressable
                    onPress={() => setPickingQuietHour('end')}
                    className="px-4 py-2 rounded-lg bg-surface-container-low active:opacity-70"
                  >
                    <Text className="font-headline text-base text-on-surface font-bold">
                      {padHour(prefs.quietHours.end)}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== CUSTOM INTERVAL MODAL ===== */}
      <Modal visible={customModal !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-6">
            <Text className="font-headline text-lg font-bold text-on-surface mb-1">Personalizar</Text>
            <Text className="font-label text-xs text-on-surface-variant mb-5">Defina o tempo exato</Text>

            <View className="flex-row items-center gap-4 justify-center mb-6">
              <View className="items-center">
                <Text className="font-label text-xs text-on-surface-variant mb-1.5">Horas</Text>
                <TextInput
                  value={customHours}
                  onChangeText={(t) => setCustomHours(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="0"
                  placeholderTextColor="#aca7cc"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center"
                />
              </View>
              <Text className="font-headline text-2xl text-on-surface-variant mt-5">:</Text>
              <View className="items-center">
                <Text className="font-label text-xs text-on-surface-variant mb-1.5">Minutos</Text>
                <TextInput
                  value={customMinutes}
                  onChangeText={(t) => setCustomMinutes(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor="#aca7cc"
                  className="w-20 bg-surface-container-low rounded-xl px-4 py-3 text-on-surface font-headline text-2xl text-center"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <Pressable onPress={() => setCustomModal(null)} className="flex-1 py-3 rounded-xl bg-surface-variant items-center">
                <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleCustomSave} className="flex-1 py-3 rounded-xl bg-primary items-center">
                <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== QUIET HOUR PICKER MODAL ===== */}
      <Modal visible={pickingQuietHour !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-5" style={{ maxHeight: 420 }}>
            <Text className="font-headline text-lg font-bold text-on-surface mb-1">
              {pickingQuietHour === 'start' ? 'Início do silêncio' : 'Fim do silêncio'}
            </Text>
            <Text className="font-label text-xs text-on-surface-variant mb-4">Selecione o horário</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {HOURS_24.map((h) => {
                  const isActive = pickingQuietHour === 'start'
                    ? prefs.quietHours.start === h
                    : prefs.quietHours.end === h
                  return (
                    <Pressable
                      key={h}
                      onPress={() => handleQuietHourSelect(h)}
                      className="w-16 py-2.5 rounded-lg items-center"
                      style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}
                    >
                      <Text
                        className="font-label text-sm font-medium"
                        style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}
                      >
                        {padHour(h)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setPickingQuietHour(null)}
              className="mt-4 py-2.5 rounded-xl bg-surface-variant items-center"
            >
              <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ===== BATH HOUR PICKER MODAL ===== */}
      <Modal visible={pickingBathHour} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View className="bg-surface-container w-full rounded-2xl p-5" style={{ maxHeight: 420 }}>
            <Text className="font-headline text-lg font-bold text-on-surface mb-1">Horário do banho</Text>
            <Text className="font-label text-xs text-on-surface-variant mb-4">Selecione o horário</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {BATH_HOURS.map((h) => {
                  const isActive = bathHours.includes(h)
                  return (
                    <Pressable
                      key={h}
                      onPress={() => {
                        if (isActive) handleRemoveBathHour(h)
                        else handleAddBathHour(h)
                      }}
                      className="w-16 py-2.5 rounded-lg items-center"
                      style={{ backgroundColor: isActive ? '#b79fff' : '#2a2650' }}
                    >
                      <Text
                        className="font-label text-sm font-medium"
                        style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}
                      >
                        {padHour(h)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setPickingBathHour(false)}
              className="mt-4 py-2.5 rounded-xl bg-surface-variant items-center"
            >
              <Text className="text-on-surface-variant font-label font-semibold text-sm">Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
