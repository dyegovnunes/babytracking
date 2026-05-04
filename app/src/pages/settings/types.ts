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
  // feed e sleep são ativados automaticamente no primeiro registro.
  // diaper e bath ficam desativados até o usuário ativar manualmente.
  categories: { feed: false, diaper: false, sleep: false, bath: false },
  quietHours: { enabled: false, start: 22, end: 7 },
}

export type NotifCategoryKey = keyof NotifPrefs['categories']
