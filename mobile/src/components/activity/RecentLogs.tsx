import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { LogEntry, Member } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface Props {
  logs: LogEntry[]
  members: Record<string, Member>
}

const dotColorMap: Record<string, string> = {
  tertiary: '#ff96b9',
  primary: '#b79fff',
  secondary: '#d0c5fb',
}

export default function RecentLogs({ logs, members }: Props) {
  const navigation = useNavigation<any>()
  const recent = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

  if (recent.length === 0) {
    return (
      <View className="px-5 mt-6">
        <Text className="text-center text-on-surface-variant font-label text-sm py-8">
          Nenhum registro ainda. Toque nos botões acima para começar.
        </Text>
      </View>
    )
  }

  return (
    <View className="px-5 mt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-headline text-base font-bold text-on-surface">
          Últimos registros
        </Text>
        <Pressable onPress={() => navigation.navigate('Histórico')}>
          <Text className="font-label text-xs text-primary font-medium">
            Ver tudo →
          </Text>
        </Pressable>
      </View>

      <View className="gap-1">
        {recent.map((log) => {
          const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
          if (!event) return null
          const dotColor = dotColorMap[event.color] ?? '#b79fff'
          const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

          return (
            <View
              key={log.id}
              className="flex-row items-center gap-3 py-2.5 px-3 rounded-lg bg-surface-container"
            >
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
              <Text className="text-base leading-none">{event.emoji ?? '•'}</Text>
              <View className="flex-1">
                <Text className="font-body text-sm text-on-surface">
                  {event.label}
                  {log.ml ? ` — ${log.ml}ml` : ''}
                </Text>
                {memberName && (
                  <Text className="font-label text-[10px] text-on-surface-variant/60">
                    por {memberName}
                  </Text>
                )}
              </View>
              <Text className="font-label text-xs text-on-surface-variant">
                {formatTime(new Date(log.timestamp))}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
