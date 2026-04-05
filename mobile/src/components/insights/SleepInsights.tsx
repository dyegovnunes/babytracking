import { View, Text } from 'react-native'
import type { SleepPattern } from '../../hooks/useInsights'

interface Props {
  pattern: SleepPattern
}

function formatMinutes(min: number): string {
  if (min === 0) return '0min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

export default function SleepInsights({ pattern }: Props) {
  const sleepPct = Math.min((pattern.totalMinutes / 1440) * 100, 100)
  const awakePct = 100 - sleepPct

  return (
    <View className="bg-surface-container rounded-xl p-4">
      <Text className="font-headline text-sm font-bold text-on-surface mb-3">
        🌙 Sono
      </Text>

      <View className="flex-row items-baseline gap-2 mb-3">
        <Text className="font-headline text-3xl font-extrabold text-on-surface">
          {formatMinutes(pattern.totalMinutes)}
        </Text>
        <Text className="font-label text-xs text-on-surface-variant">
          de sono hoje
        </Text>
      </View>

      <View className="flex-row gap-2 mb-4">
        <View className="flex-1">
          <Text className="font-label text-[10px] text-on-surface-variant">Cochilos</Text>
          <Text className="font-headline text-lg font-bold text-on-surface">
            {pattern.napCount}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-label text-[10px] text-on-surface-variant">Média</Text>
          <Text className="font-headline text-lg font-bold text-on-surface">
            {pattern.avgNapMinutes > 0 ? formatMinutes(pattern.avgNapMinutes) : '—'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-label text-[10px] text-on-surface-variant">Maior</Text>
          <Text className="font-headline text-lg font-bold text-on-surface">
            {pattern.longestNapMinutes > 0 ? formatMinutes(pattern.longestNapMinutes) : '—'}
          </Text>
        </View>
      </View>

      {pattern.totalMinutes > 0 && (
        <View>
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="font-label text-[10px] text-on-surface-variant">
              Dormindo
            </Text>
            <Text className="font-label text-[10px] text-on-surface-variant">
              Acordado
            </Text>
          </View>
          <View className="h-2.5 rounded-full bg-surface-container-high overflow-hidden flex-row">
            <View
              className="rounded-l-full"
              style={{ width: `${sleepPct}%`, backgroundColor: '#b79fff' }}
            />
            <View
              className="rounded-r-full"
              style={{ width: `${awakePct}%`, backgroundColor: '#1e1a38' }}
            />
          </View>
        </View>
      )}
    </View>
  )
}
