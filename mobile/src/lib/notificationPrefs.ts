import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFS_KEY = 'bt_notification_prefs'

export interface NotificationPrefs {
  enabled: boolean
  categories: {
    feed: boolean
    diaper: boolean
    sleep: boolean
    bath: boolean
  }
  quietHours: {
    enabled: boolean
    start: number // hour 0-23
    end: number   // hour 0-23
  }
  pauseDuringSleep: boolean
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  categories: {
    feed: true,
    diaper: true,
    sleep: true,
    bath: true,
  },
  quietHours: {
    enabled: false,
    start: 22,
    end: 6,
  },
  pauseDuringSleep: false,
}

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const raw = await AsyncStorage.getItem(PREFS_KEY)
  if (!raw) return DEFAULT_PREFS
  return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}
