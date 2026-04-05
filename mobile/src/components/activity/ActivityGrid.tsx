import { View } from 'react-native'
import type { EventType, LogEntry } from '../../types'
import ActivityButton from './ActivityButton'

interface Props {
  events: EventType[]
  logs: LogEntry[]
  onLog: (eventId: string) => void
}

export default function ActivityGrid({ events, logs, onLog }: Props) {
  function getLastLog(eventId: string): LogEntry | undefined {
    return [...logs]
      .filter((l) => l.eventId === eventId)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
  }

  return (
    <View className="px-5">
      <View className="flex-row flex-wrap gap-3">
        {events.map((event) => (
          <View key={event.id} style={{ width: '31%' }}>
            <ActivityButton
              event={event}
              lastLog={getLastLog(event.id)}
              onPress={() => onLog(event.id)}
            />
          </View>
        ))}
      </View>
    </View>
  )
}
