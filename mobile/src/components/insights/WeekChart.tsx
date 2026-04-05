import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import type { DayTrend } from '../../hooks/useInsights'

interface Props {
  trends: DayTrend[]
}

type Metric = 'feeds' | 'diapers' | 'sleepMinutes'

const metrics: { key: Metric; label: string; emoji: string }[] = [
  { key: 'feeds', label: 'Mamadas', emoji: '🤱' },
  { key: 'diapers', label: 'Fraldas', emoji: '💧' },
  { key: 'sleepMinutes', label: 'Sono', emoji: '🌙' },
]

export default function WeekChart({ trends }: Props) {
  const [metric, setMetric] = useState<Metric>('feeds')

  const values = trends.map((t) => t[metric])
  const max = Math.max(...values, 1)

  return (
    <View className="bg-surface-container rounded-xl p-4">
      <Text className="font-headline text-sm font-bold text-on-surface mb-3">
        Últimos 7 dias
      </Text>

      <View className="flex-row gap-1.5 mb-4">
        {metrics.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setMetric(m.key)}
            className="flex-1 py-1.5 rounded-lg items-center"
            style={{
              backgroundColor: metric === m.key ? 'rgba(183,159,255,0.2)' : '#1e1a38',
            }}
          >
            <Text
              className="font-label text-[10px] font-semibold"
              style={{ color: metric === m.key ? '#b79fff' : '#aca7cc' }}
            >
              {m.emoji} {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row items-end justify-between gap-1.5" style={{ height: 112 }}>
        {trends.map((day, i) => {
          const value = day[metric]
          const pct = max > 0 ? (value / max) * 100 : 0
          const isToday = i === trends.length - 1

          return (
            <View key={day.date} className="flex-1 items-center gap-1" style={{ height: '100%' }}>
              <Text className="font-label text-[9px] text-on-surface-variant font-semibold">
                {value > 0 ? value : ''}
              </Text>
              <View className="flex-1 w-full justify-end">
                <View
                  className="w-full rounded-t-md"
                  style={{
                    height: pct > 0 ? `${Math.max(pct, 8)}%` : '0%',
                    backgroundColor: isToday ? '#b79fff' : 'rgba(183,159,255,0.4)',
                  }}
                />
              </View>
              <Text
                className="font-label text-[9px]"
                style={{
                  color: isToday ? '#b79fff' : '#aca7cc',
                  fontWeight: isToday ? '700' : '400',
                }}
              >
                {day.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
