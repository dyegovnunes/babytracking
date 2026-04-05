import { View, Text, Pressable } from 'react-native'
import type { LogEntry, Member } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface Props {
  log: LogEntry
  members: Record<string, Member>
  onEdit: (log: LogEntry) => void
}

const dotColorMap: Record<string, string> = {
  tertiary: '#ff96b9',
  primary: '#b79fff',
  secondary: '#d0c5fb',
}

export default function TimelineEntry({ log, members, onEdit }: Props) {
  const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
  if (!event) return null

  const dotColor = dotColorMap[event.color] ?? '#b79fff'
  const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

  return (
    <Pressable
      onPress={() => onEdit(log)}
      className="flex-row items-center gap-3 py-3 px-4 rounded-lg bg-surface-container active:opacity-70"
    >
      <View className="items-center gap-1 w-10">
        <Text className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(new Date(log.timestamp))}
        </Text>
        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
      </View>

      <View className="w-9 h-9 rounded-full items-center justify-center bg-primary/15">
        <Text className="text-lg leading-none">{event.emoji ?? '•'}</Text>
      </View>

      <View className="flex-1">
        <Text className="font-body text-sm font-medium text-on-surface">
          {event.label}
        </Text>
        {log.ml ? (
          <Text className="font-label text-xs text-primary">{log.ml} ml</Text>
        ) : null}
        {log.notes ? (
          <Text className="font-label text-xs text-on-surface-variant" numberOfLines={1}>
            {log.notes}
          </Text>
        ) : null}
        {memberName ? (
          <Text className="font-label text-[10px] text-on-surface-variant/60">
            por {memberName}
          </Text>
        ) : null}
      </View>

      <Text className="text-on-surface-variant/50 text-base">✏️</Text>
    </Pressable>
  )
}
