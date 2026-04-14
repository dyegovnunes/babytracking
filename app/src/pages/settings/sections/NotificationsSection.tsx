import { useAppState } from '../../../contexts/AppContext'
import Toggle from '../components/Toggle'
import type { NotifCategoryKey, NotifPrefs } from '../types'
import { mToStr } from '../utils'

interface Props {
  prefs: NotifPrefs
  onSavePrefs: (updated: NotifPrefs) => void
  onOpenInfo: () => void
}

export default function NotificationsSection({
  prefs,
  onSavePrefs,
  onOpenInfo,
}: Props) {
  const { intervals } = useAppState()

  const categories: Array<{
    key: NotifCategoryKey
    label: string
    icon: string
    desc: string
  }> = [
    {
      key: 'feed',
      label: 'Amamentação',
      icon: 'breastfeeding',
      desc: `A cada ${mToStr(intervals['feed']?.minutes ?? 180)}`,
    },
    {
      key: 'diaper',
      label: 'Fraldas',
      icon: 'water_drop',
      desc: `A cada ${mToStr(intervals['diaper']?.minutes ?? 120)}`,
    },
    { key: 'sleep', label: 'Sono', icon: 'bedtime', desc: 'Soneca e janela de sono' },
    { key: 'bath', label: 'Banho', icon: 'bathtub', desc: '15min antes do horário' },
  ]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-lg">notifications</span>
        <h2 className="font-headline text-sm font-bold text-on-surface flex-1">
          Notificações
        </h2>
        <button
          onClick={onOpenInfo}
          className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center active:bg-primary/20"
        >
          <span className="material-symbols-outlined text-primary text-sm">info</span>
        </button>
      </div>

      <div className="space-y-2">
        {/* Global */}
        <div
          className={`rounded-md px-4 py-4 flex items-center gap-3 transition-colors ${
            prefs.enabled
              ? 'bg-primary/15 border border-primary/30'
              : 'bg-tertiary/10 border border-tertiary/30'
          }`}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              prefs.enabled ? 'text-primary' : 'text-tertiary'
            }`}
            style={prefs.enabled ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {prefs.enabled ? 'notifications_active' : 'notifications_off'}
          </span>
          <div className="flex-1">
            <span
              className={`font-body text-sm font-semibold ${
                prefs.enabled ? 'text-primary' : 'text-tertiary'
              }`}
            >
              {prefs.enabled ? 'Notificações ativas' : 'Notificações desativadas'}
            </span>
          </div>
          <Toggle
            value={prefs.enabled}
            onChange={() => onSavePrefs({ ...prefs, enabled: !prefs.enabled })}
          />
        </div>

        {/* Per category */}
        {prefs.enabled && (
          <div className="bg-surface-container rounded-md overflow-hidden">
            {categories.map(({ key, label, icon, desc }, i) => (
              <div
                key={key}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i > 0 ? 'border-t border-outline-variant/20' : ''
                }`}
              >
                <span className="material-symbols-outlined text-on-surface-variant text-lg">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-on-surface">{label}</p>
                  <p className="font-label text-[11px] text-on-surface-variant">{desc}</p>
                </div>
                <Toggle
                  value={prefs.categories[key]}
                  onChange={() =>
                    onSavePrefs({
                      ...prefs,
                      categories: {
                        ...prefs.categories,
                        [key]: !prefs.categories[key],
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
