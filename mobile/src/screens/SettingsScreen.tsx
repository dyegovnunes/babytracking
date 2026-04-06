import { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useAppState, useAppDispatch, updateIntervals } from '../contexts/AppContext'
import type { IntervalConfig } from '../types'
import Toast from '../components/ui/Toast'

const CATEGORIES = [
  { key: 'feed', label: 'Mamadas', emoji: '🤱', description: 'Intervalo entre amamentações' },
  { key: 'diaper', label: 'Fraldas', emoji: '💧', description: 'Intervalo entre trocas' },
  { key: 'sleep', label: 'Sono', emoji: '🌙', description: 'Intervalo entre sonecas' },
  { key: 'bath', label: 'Banho', emoji: '🛁', description: 'Intervalo entre banhos' },
]

const PRESETS: Record<string, { label: string; minutes: number; warn: number }[]> = {
  feed: [
    { label: 'A cada 2h', minutes: 120, warn: 100 },
    { label: 'A cada 2h30', minutes: 150, warn: 120 },
    { label: 'A cada 3h', minutes: 180, warn: 150 },
    { label: 'A cada 4h', minutes: 240, warn: 200 },
  ],
  diaper: [
    { label: 'A cada 1h30', minutes: 90, warn: 70 },
    { label: 'A cada 2h', minutes: 120, warn: 90 },
    { label: 'A cada 3h', minutes: 180, warn: 150 },
  ],
  sleep: [
    { label: 'A cada 1h', minutes: 60, warn: 45 },
    { label: 'A cada 1h30', minutes: 90, warn: 60 },
    { label: 'A cada 2h', minutes: 120, warn: 90 },
  ],
  bath: [
    { label: 'Diário', minutes: 1440, warn: 1200 },
    { label: 'A cada 2 dias', minutes: 2880, warn: 2400 },
    { label: 'A cada 3 dias', minutes: 4320, warn: 3600 },
  ],
}

function minutesToDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return d === 1 ? 'Diário' : `A cada ${d} dias`
  }
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

export default function SettingsScreen() {
  const { intervals, baby } = useAppState()
  const dispatch = useAppDispatch()
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleSelect = useCallback(
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

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Intervalos */}
        <View className="px-5 pt-6 pb-2">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Configurações
          </Text>
          <Text className="font-label text-sm text-on-surface-variant">
            Personalize os intervalos e alertas
          </Text>
        </View>

        <View className="px-5 mt-4">
          <View className="bg-surface-container rounded-xl overflow-hidden">
            <View className="flex-row items-center gap-3 p-4 pb-2">
              <Text className="text-xl">⏱️</Text>
              <Text className="text-on-surface font-headline text-sm font-bold">
                Intervalos esperados
              </Text>
            </View>
            <Text className="px-4 pb-3 font-label text-xs text-on-surface-variant">
              Te avisamos quando estiver perto da hora
            </Text>

            <View className="px-4 pb-4 gap-1">
              {CATEGORIES.map(({ key, label, emoji }) => {
                const config = intervals[key]
                if (!config) return null
                const isExpanded = expandedCat === key
                const presets = PRESETS[key] ?? []

                return (
                  <View key={key}>
                    <Pressable
                      onPress={() => setExpandedCat(isExpanded ? null : key)}
                      className="flex-row items-center gap-3 py-3 px-2 rounded-lg active:opacity-70"
                    >
                      <Text className="text-lg">{emoji}</Text>
                      <Text className="flex-1 font-body text-sm text-on-surface">
                        {label}
                      </Text>
                      <Text className="font-label text-sm text-primary font-semibold">
                        {minutesToDisplay(config.minutes)}
                      </Text>
                      <Text
                        className="text-on-surface-variant text-lg"
                        style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                      >
                        ▼
                      </Text>
                    </Pressable>

                    {isExpanded && (
                      <View className="pl-10 pr-2 pb-3 flex-row flex-wrap gap-2">
                        {presets.map((preset) => {
                          const isActive = config.minutes === preset.minutes
                          return (
                            <Pressable
                              key={preset.minutes}
                              onPress={() => handleSelect(key, preset)}
                              className="px-3 py-1.5 rounded-full"
                              style={{
                                backgroundColor: isActive ? '#b79fff' : '#2a2650',
                              }}
                            >
                              <Text
                                className="font-label text-xs font-medium"
                                style={{ color: isActive ? '#0d0a27' : '#aca7cc' }}
                              >
                                {preset.label}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* Push notifications - placeholder */}
        <View className="px-5 mt-4">
          <View className="bg-surface-container rounded-xl p-4">
            <View className="flex-row items-center gap-3 mb-2">
              <Text className="text-xl">🔔</Text>
              <Text className="text-on-surface font-headline text-sm font-bold">
                Notificações
              </Text>
            </View>
            <Text className="font-label text-xs text-on-surface-variant">
              Em breve: receba alertas quando estiver perto da hora de mamada, troca ou soninho.
            </Text>
          </View>
        </View>
      </ScrollView>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
