import { View, Text, Pressable } from 'react-native'
import type { EventType, LogEntry } from '../../types'
import { timeSince } from '../../lib/formatters'

interface Props {
  event: EventType
  lastLog?: LogEntry
  onPress: () => void
}

export default function ActivityButton({ event, lastLog, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-col items-center gap-1.5 p-3 rounded-lg bg-surface-container-high active:opacity-70"
      style={{ height: 108, justifyContent: 'center' }}
    >
      <View className="relative">
        <View className="w-12 h-12 rounded-full items-center justify-center bg-primary-container/20">
          <Text className="text-2xl leading-none">{event.emoji ?? '•'}</Text>
        </View>
        {event.badge && (
          <View className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center bg-primary px-1">
            <Text className="font-label text-[9px] font-bold text-surface">
              {event.badge}
            </Text>
          </View>
        )}
      </View>
      <Text className="font-label text-[11px] font-medium text-on-surface text-center leading-tight">
        {event.label}
      </Text>
      <Text className="font-label text-[9px] text-on-surface-variant h-3">
        {lastLog ? timeSince(lastLog.timestamp) : ''}
      </Text>
    </Pressable>
  )
}
