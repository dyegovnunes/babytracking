import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { LogEntry, IntervalConfig, EventType } from '../types'

// One notification ID per category (so we can cancel/replace)
const NOTIFICATION_IDS = {
  feed: 'bt_feed',
  diaper: 'bt_diaper',
  sleep: 'bt_sleep',
  bath: 'bt_bath',
} as const

type NotifCategory = keyof typeof NOTIFICATION_IDS

// Show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// ── Request permission ──────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('babytracking', {
      name: 'BabyTracking',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#b79fff',
      sound: 'default',
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ── Schedule a notification (replaces existing for same id) ─────────
async function scheduleNotif(
  identifier: string,
  title: string,
  body: string,
  triggerDate: Date,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})

  const secondsFromNow = Math.floor((triggerDate.getTime() - Date.now()) / 1000)
  if (secondsFromNow <= 0) return

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
      repeats: false,
    },
  })
}

// ── Cancel all notifications ────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// ── Reschedule all categories based on logs + intervals ─────────────
export async function rescheduleAllNotifications(
  logs: LogEntry[],
  intervals: Record<string, IntervalConfig>,
  events: EventType[],
): Promise<void> {
  const meta: Record<NotifCategory, { title: string; emoji: string }> = {
    feed: { title: 'Hora da mamada!', emoji: '🤱' },
    diaper: { title: 'Hora de trocar a fralda!', emoji: '💧' },
    sleep: { title: 'Hora do soninho!', emoji: '🌙' },
    bath: { title: 'Hora do banho!', emoji: '🛁' },
  }

  for (const [category, m] of Object.entries(meta) as [NotifCategory, { title: string; emoji: string }][]) {
    const interval = intervals[category]
    if (!interval) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS[category]).catch(() => {})
      continue
    }

    // Find most recent log for this category
    const categoryLogs = logs
      .filter((l) => {
        const event = events.find((e) => e.id === l.eventId)
        return event?.category === category
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    if (categoryLogs.length === 0) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS[category]).catch(() => {})
      continue
    }

    const lastLog = categoryLogs[0]
    const warnTime = new Date(lastLog.timestamp + interval.warn * 60 * 1000)
    const nextTime = new Date(lastLog.timestamp + interval.minutes * 60 * 1000)
    const now = Date.now()

    // Warning notification
    if (warnTime.getTime() > now) {
      await scheduleNotif(
        `${NOTIFICATION_IDS[category]}_warn`,
        `${m.emoji} Em breve: ${interval.label}`,
        `Faltam ${interval.minutes - interval.warn} min`,
        warnTime,
      )
    }

    // Main notification
    if (nextTime.getTime() > now) {
      await scheduleNotif(
        NOTIFICATION_IDS[category],
        `${m.emoji} ${m.title}`,
        `Já passou ${interval.minutes} min desde o último registro`,
        nextTime,
      )
    }
  }
}
