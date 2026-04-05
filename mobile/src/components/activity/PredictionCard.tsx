import { View, Text } from 'react-native'
import type { Projection } from '../../types'
import { formatTime, timeSince } from '../../lib/formatters'

interface Props {
  projection: Projection
}

export default function PredictionCard({ projection }: Props) {
  const isOverdue = projection.isOverdue
  const isWarning = projection.isWarning

  const statusColor = isOverdue ? '#ff6e84' : isWarning ? '#ff96b9' : '#b79fff'

  const statusLabel = isOverdue
    ? 'Atrasado'
    : isWarning
      ? 'Em breve'
      : formatTime(projection.time)

  return (
    <View
      className="rounded-lg p-4 flex-row items-center gap-3"
      style={{ backgroundColor: isOverdue ? 'rgba(255,110,132,0.1)' : isWarning ? 'rgba(255,150,185,0.1)' : 'rgba(183,159,255,0.1)' }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: isOverdue ? 'rgba(255,110,132,0.15)' : isWarning ? 'rgba(255,150,185,0.15)' : 'rgba(183,159,255,0.15)' }}
      >
        <Text className="text-xl">⏰</Text>
      </View>
      <View className="flex-1">
        <Text className="font-label text-xs text-on-surface-variant capitalize">
          {projection.label}
        </Text>
        <Text className="font-headline text-sm font-bold" style={{ color: statusColor }}>
          {statusLabel}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-label text-[10px] text-on-surface-variant">
          Último: {projection.lastEvent}
        </Text>
        <Text className="font-label text-[10px] text-on-surface-variant">
          {timeSince(projection.lastTime.getTime())}
        </Text>
      </View>
    </View>
  )
}
