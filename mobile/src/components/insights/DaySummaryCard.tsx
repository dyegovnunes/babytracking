import { View, Text } from 'react-native'
import type { DaySummary } from '../../hooks/useInsights'

interface Props {
  summary: DaySummary
}

const stats = [
  { key: 'feeds', emoji: '🤱', label: 'Mamadas', bg: 'rgba(255,150,185,0.1)' },
  { key: 'diapers', emoji: '💧', label: 'Fraldas', bg: 'rgba(208,197,251,0.1)' },
  { key: 'sleepCycles', emoji: '🌙', label: 'Sonos', bg: 'rgba(183,159,255,0.1)' },
] as const

export default function DaySummaryCard({ summary }: Props) {
  return (
    <View>
      <Text className="font-headline text-sm font-bold text-on-surface mb-3">
        Resumo de hoje
      </Text>
      <View className="flex-row gap-2.5">
        {stats.map((s) => (
          <View
            key={s.key}
            className="flex-1 rounded-xl p-3.5 items-center gap-1.5"
            style={{ backgroundColor: s.bg }}
          >
            <Text className="text-xl leading-none">{s.emoji}</Text>
            <Text className="font-headline text-2xl font-extrabold text-on-surface">
              {summary[s.key]}
            </Text>
            <Text className="font-label text-[10px] text-on-surface-variant">
              {s.label}
            </Text>
          </View>
        ))}
      </View>
      {summary.totalBottleMl > 0 && (
        <Text className="font-label text-xs text-on-surface-variant mt-2 text-center">
          🍼 {summary.totalBottleMl}ml em mamadeira hoje
        </Text>
      )}
    </View>
  )
}
