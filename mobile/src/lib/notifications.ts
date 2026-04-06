import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { LogEntry, IntervalConfig, EventType } from '../types'
import { loadNotificationPrefs, type NotificationPrefs } from './notificationPrefs'

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

function isInQuietHours(date: Date, quietHours: NotificationPrefs['quietHours']): boolean {
  if (!quietHours.enabled) return false
  const hour = date.getHours()
  if (quietHours.start < quietHours.end) {
    // e.g. 8-18 (daytime quiet)
    return hour >= quietHours.start && hour < quietHours.end
  }
  // e.g. 22-6 (nighttime quiet)
  return hour >= quietHours.start || hour < quietHours.end
}

function pushOutOfQuietHours(date: Date, quietHours: NotificationPrefs['quietHours']): Date {
  if (!isInQuietHours(date, quietHours)) return date
  // Push to the end of quiet hours
  const result = new Date(date)
  result.setHours(quietHours.end, 0, 0, 0)
  // If end is before start (e.g. 22-6), and current hour >= start, push to next day
  if (quietHours.start > quietHours.end && result.getTime() <= date.getTime()) {
    result.setDate(result.getDate() + 1)
  }
  return result
}

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
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
      repeats: false,
    },
  })
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function rescheduleAllNotifications(
  logs: LogEntry[],
  intervals: Record<string, IntervalConfig>,
  events: EventType[],
): Promise<void> {
  const prefs = await loadNotificationPrefs()

  if (!prefs.enabled) {
    await cancelAllNotifications()
    return
  }

  const meta: Record<NotifCategory, { title: string; emoji: string }> = {
    feed: { title: 'Hora da mamada!', emoji: '🤱' },
    diaper: { title: 'Hora de trocar a fralda!', emoji: '💧' },
    sleep: { title: 'Hora do soninho!', emoji: '🌙' },
    bath: { title: 'Hora do banho!', emoji: '🛁' },
  }

  for (const [category, m] of Object.entries(meta) as [NotifCategory, { title: string; emoji: string }][]) {
    const warnId = `${NOTIFICATION_IDS[category]}_warn`
    const mainId = NOTIFICATION_IDS[category]

    // If category is disabled, cancel its notifications
    if (!prefs.categories[category]) {
      await Notifications.cancelScheduledNotificationAsync(warnId).catch(() => {})
      await Notifications.cancelScheduledNotificationAsync(mainId).catch(() => {})
      continue
    }

    const interval = intervals[category]
    if (!interval) {
      await Notifications.cancelScheduledNotificationAsync(mainId).catch(() => {})
      continue
    }

    const categoryLogs = logs
      .filter((l) => {
        const event = events.find((e) => e.id === l.eventId)
        return event?.category === category
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    if (categoryLogs.length === 0) {
      await Notifications.cancelScheduledNotificationAsync(warnId).catch(() => {})
      await Notifications.cancelScheduledNotificationAsync(mainId).catch(() => {})
      continue
    }

    const lastLog = categoryLogs[0]
    const now = Date.now()

    // Warning notification
    let warnTime = new Date(lastLog.timestamp + interval.warn * 60 * 1000)
    warnTime = pushOutOfQuietHours(warnTime, prefs.quietHours)
    if (warnTime.getTime() > now) {
      await scheduleNotif(
        warnId,
        `${m.emoji} Em breve: ${interval.label}`,
        `Faltam ${interval.minutes - interval.warn} min`,
        warnTime,
      )
    }

    // Main notification
    let nextTime = new Date(lastLog.timestamp + interval.minutes * 60 * 1000)
    nextTime = pushOutOfQuietHours(nextTime, prefs.quietHours)
    if (nextTime.getTime() > now) {
      await scheduleNotif(
        mainId,
        `${m.emoji} ${m.title}`,
        `Já passou ${interval.minutes} min desde o último registro`,
        nextTime,
      )
    }
  }
}
