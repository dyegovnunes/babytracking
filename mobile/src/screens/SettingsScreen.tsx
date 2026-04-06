import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Switch, TextInput, Modal } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import { requestNotificationPermission, rescheduleAllNotifications, cancelAllNotifications } from '../lib/notifications'
import { loadNotificationPrefs, saveNotificationPrefs, DEFAULT_PREFS, type NotificationPrefs } from '../lib/notificationPrefs'
import { DEFAULT_EVENTS } from '../lib/constants'
import type { IntervalConfig } from '../types'
import Toast from '../components/ui/Toast'

const CATEGORIES = [
  { key: 'feed', label: 'Mamadas', emoji: '🤱' },
  { key: 'diaper', label: 'Fraldas', emoji: '💧' },
  { key: 'sleep', label: 'Sono', emoji: '🌙' },
  { key: 'bath', label: 'Banho', emoji: '🛁' },
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

export default function SettingsScreen() {
  const { intervals, logs, baby } = useAppState()
  const dispatch = useAppDispatch()
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Notification prefs
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  // Custom interval modal
  const [customModal, setCustomModal] = useState<string | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')

  // Quiet hours picker
  const [pickingQuietHour, setPickingQuietHour] = useState<'start' | 'end' | null>(null)

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
      const updated = { ...prefs, enabled: true }
      await updatePrefs(updated)
      setToast('Notificações ativadas!')
    } else {
      const updated = { ...prefs, enabled: false }
      await updatePrefs(updated)
      setToast('Notificações desativadas')
    }
  }, [prefs, updatePrefs])

  const handleCategoryToggle = useCallback(async (cat: string, value: boolean) => {
    const updated = {
      ...prefs,
      categories: { ...prefs.categories, [cat]: value },
    }
    await updatePrefs(updated)
  }, [prefs, updatePrefs])

  const handleQuietToggle = useCallback(async (value: boolean) => {
    const updated = {
      ...prefs,
      quietHours: { ...prefs.quietHours, enabled: value },
    }
    await updatePrefs(updated)
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
      setExpandedCat(null)
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
    setExpandedCat(null)
  }, [customModal, customHours, customMinutes, intervals, baby, dispatch, logs])

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ===== INTERVALOS ===== */}
        <View className="px-5 pt-6 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Intervalos
          </Text>
          <Text className="font-label text-xs text-on-surface-variant mt-1">
            Defina o tempo esperado entre cada atividade
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {CATEGORIES.map(({ key, label, emoji }) => {
            const config = intervals[key]
            if (!config) return null
            const isExpanded = expandedCat === key
            const presets = PRESETS[key] ?? []

            return (
              <View key={key} className="bg-surface-container rounded-xl overflow-hidden">
                <Pressable
                  onPress={() => setExpandedCat(isExpanded ? null : key)}
                  className="flex-row items-center gap-3 p-4 active:opacity-70"
                >
                  <Text className="text-lg">{emoji}</Text>
                  <Text className="flex-1 font-body text-sm text-on-surface font-medium">
                    {label}
                  </Text>
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
                    {/* Presets */}
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {presets.map((preset) => {
                        const isActive = config.minutes === preset.minutes
                        return (
                          <Pressable
                            key={preset.minutes}
                            onPress={() => handlePresetSelect(key, preset)}
                            className="px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: isActive ? '#b79fff' : '#2a2650',
                            }}
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

                    {/* Custom button */}
                    <Pressable
                      onPress={() => handleCustomOpen(key)}
                      className="flex-row items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 active:opacity-70"
                    >
                      <Text className="text-sm">✏️</Text>
                      <Text className="font-label text-xs text-primary font-medium">
                        Personalizar intervalo
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* ===== NOTIFICAÇÕES ===== */}
        <View className="px-5 pt-8 pb-2">
          <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider">
            Notificações
          </Text>
          <Text className="font-label text-xs text-on-surface-variant mt-1">
            Escolha quando e como receber alertas
          </Text>
        </View>

        <View className="px-5 mt-2 gap-2">
          {/* Global toggle */}
          <View className="bg-surface-container rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-lg">🔔</Text>
                <View className="flex-1">
                  <Text className="text-on-surface font-body text-sm font-medium">
                    Ativar notificações
                  </Text>
                  <Text className="font-label text-xs text-on-surface-variant mt-0.5">
                    Receber alertas quando for hora de cada atividade
                  </Text>
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
                <Text className="font-label text-xs text-on-surface-variant font-semibold">
                  Notificar por categoria
                </Text>
              </View>
              {CATEGORIES.map(({ key, label, emoji }, i) => (
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
                    <Text className="text-on-surface font-body text-sm font-medium">
                      Horário silencioso
                    </Text>
                    <Text className="font-label text-xs text-on-surface-variant mt-0.5">
                      Sem notificações nesse período
                    </Text>
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
            <Text className="font-headline text-lg font-bold text-on-surface mb-1">
              Personalizar intervalo
            </Text>
            <Text className="font-label text-xs text-on-surface-variant mb-5">
              Defina o tempo exato entre registros
            </Text>

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
              <Pressable
                onPress={() => setCustomModal(null)}
                className="flex-1 py-3 rounded-xl bg-surface-variant items-center"
              >
                <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleCustomSave}
                className="flex-1 py-3 rounded-xl bg-primary items-center"
              >
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
            <Text className="font-label text-xs text-on-surface-variant mb-4">
              Selecione o horário
            </Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {HOURS.map((h) => {
                  const isActive = pickingQuietHour === 'start'
                    ? prefs.quietHours.start === h
                    : prefs.quietHours.end === h
                  return (
                    <Pressable
                      key={h}
                      onPress={() => handleQuietHourSelect(h)}
                      className="w-16 py-2.5 rounded-lg items-center"
                      style={{
                        backgroundColor: isActive ? '#b79fff' : '#2a2650',
                      }}
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
