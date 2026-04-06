import { useEffect } from 'react'
import { useAppState } from '../contexts/AppContext'
import { rescheduleAllNotifications } from '../lib/notifications'
import { DEFAULT_EVENTS } from '../lib/constants'

export function useNotificationSync() {
  const { logs, intervals } = useAppState()

  useEffect(() => {
    rescheduleAllNotifications(logs, intervals, DEFAULT_EVENTS)
  }, [logs, intervals])
}
