import { useState } from 'react'
import type { IntervalConfig } from '../../types'

interface Props {
  intervals: Record<string, IntervalConfig>
  onSave: (intervals: Record<string, IntervalConfig>) => void
}

const CATEGORIES = [
  { key: 'feed', label: 'Amamentação', icon: 'breastfeeding', description: 'Intervalo entre amamentações' },
  { key: 'diaper', label: 'Fraldas', icon: 'water_drop', description: 'Intervalo entre trocas de fralda' },
  { key: 'sleep', label: 'Sono', icon: 'bedtime', description: 'Intervalo entre sonecas' },
  { key: 'bath', label: 'Banho', icon: 'bathtub', description: 'Intervalo entre banhos' },
]

const PRESETS: Record<string, { label: string; minutes: number; warn: number }[]> = {
  feed: [
    { label: 'A cada 2h', minutes: 120, warn: 100 },
    { label: 'A cada 2h30', minutes: 150, warn: 120 },
    { label: 'A cada 3h', minutes: 180, warn: 150 },
    { label: 'A cada 4h', minutes: 240, warn: 200 },
  ],
  diaper: [
    { label: 'A cada 1h30', minutes: 90, warn: 70 },
    { label: 'A cada 2h', minutes: 120, warn: 90 },
    { label: 'A cada 3h', minutes: 180, warn: 150 },
  ],
  sleep: [
    { label: 'A cada 1h', minutes: 60, warn: 45 },
    { label: 'A cada 1h30', minutes: 90, warn: 60 },
    { label: 'A cada 2h', minutes: 120, warn: 90 },
  ],
  bath: [
    { label: 'Diário', minutes: 1440, warn: 1200 },
    { label: 'A cada 2 dias', minutes: 2880, warn: 2400 },
    { label: 'A cada 3 dias', minutes: 4320, warn: 3600 },
  ],
}

function minutesToDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return d === 1 ? 'Diário' : `A cada ${d} dias`
  }
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

export default function IntervalSettings({ intervals, onSave }: Props) {
  const [editingCat, setEditingCat] = useState<string | null>(null)

  function handleSelect(cat: string, preset: { minutes: number; warn: number }) {
    const updated = {
      ...intervals,
      [cat]: { ...intervals[cat], minutes: preset.minutes, warn: preset.warn },
    }
    onSave(updated)
    setEditingCat(null)
  }

  return (
    <div className="bg-surface-container rounded-md overflow-hidden">
      <div className="flex items-center gap-3 p-4 pb-2">
        <span className="material-symbols-outlined text-primary text-xl">timer</span>
        <h3 className="text-on-surface font-headline text-sm font-bold">
          Intervalos esperados
        </h3>
      </div>
      <p className="px-4 pb-3 font-label text-xs text-on-surface-variant">
        Te avisamos quando estiver perto da hora
      </p>

      <div className="px-4 pb-4 space-y-1">
        {CATEGORIES.map(({ key, label, icon }) => {
          const config = intervals[key]
          if (!config) return null
          const isEditing = editingCat === key
          const presets = PRESETS[key] ?? []

          return (
            <div key={key}>
              <button
                onClick={() => setEditingCat(isEditing ? null : key)}
                className="w-full flex items-center gap-3 py-3 px-2 rounded-md active:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant text-lg">
                  {icon}
                </span>
                <span className="flex-1 text-left font-body text-sm text-on-surface">
                  {label}
                </span>
                <span className="font-label text-sm text-primary font-semibold">
                  {minutesToDisplay(config.minutes)}
                </span>
                <span className={`material-symbols-outlined text-on-surface-variant text-lg transition-transform ${isEditing ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {isEditing && (
                <div className="pl-10 pr-2 pb-3 flex flex-wrap gap-2 animate-fade-in">
                  {presets.map((preset) => {
                    const isActive = config.minutes === preset.minutes
                    return (
                      <button
                        key={preset.minutes}
                        onClick={() => handleSelect(key, preset)}
                        className={`px-3 py-1.5 rounded-full font-label text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-variant text-on-surface-variant'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
