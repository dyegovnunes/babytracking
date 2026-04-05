import { View, Text } from 'react-native'
import type { FeedingPattern } from '../../hooks/useInsights'

interface Props {
  pattern: FeedingPattern
}

function formatInterval(minutes: number): string {
  if (minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

export default function FeedingInsights({ pattern }: Props) {
  const total = pattern.breastCount + pattern.bottleCount
  const breastPct = total > 0 ? (pattern.breastCount / total) * 100 : 0
  const bottlePct = total > 0 ? (pattern.bottleCount / total) * 100 : 0

  return (
    <View className="bg-surface-container rounded-xl p-4">
      <Text className="font-headline text-sm font-bold text-on-surface mb-3">
        🤱 Alimentação
      </Text>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
            Intervalo médio
          </Text>
          <Text className="font-headline text-xl font-bold text-on-surface">
            {pattern.avgIntervalMinutes > 0
              ? `a cada ${formatInterval(pattern.avgIntervalMinutes)}`
              : '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
            Mamadeira hoje
          </Text>
          <Text className="font-headline text-xl font-bold text-on-surface">
            {pattern.totalBottleMl > 0 ? `${pattern.totalBottleMl}ml` : '—'}
          </Text>
        </View>
      </View>

      {total > 0 && (
        <View>
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="font-label text-[10px] text-on-surface-variant">
              Peito ({pattern.breastCount})
            </Text>
            <Text className="font-label text-[10px] text-on-surface-variant">
              Mamadeira ({pattern.bottleCount})
            </Text>
          </View>
          <View className="h-2.5 rounded-full bg-surface-container-high overflow-hidden flex-row">
            {breastPct > 0 && (
              <View
                className="rounded-l-full"
                style={{ width: `${breastPct}%`, backgroundColor: '#ff96b9' }}
              />
            )}
            {bottlePct > 0 && (
              <View
                className="rounded-r-full"
                style={{ width: `${bottlePct}%`, backgroundColor: '#b79fff' }}
              />
            )}
          </View>
        </View>
      )}
    </View>
  )
}
