export interface NotifPrefs {
  enabled: boolean
  categories: {
    feed: boolean
    diaper: boolean
    sleep: boolean
    bath: boolean
  }
  quietHours: {
    enabled: boolean
    start: number
    end: number
  }
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  categories: { feed: true, diaper: true, sleep: true, bath: true },
  quietHours: { enabled: false, start: 22, end: 7 },
}

export type NotifCategoryKey = keyof NotifPrefs['categories']
