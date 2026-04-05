import type { EventType, IntervalConfig } from '../types'

export const DEFAULT_EVENTS: EventType[] = [
  { id: 'breast_left', label: 'Peito Esq.', emoji: '🤱', badge: 'E', icon: '', color: 'tertiary', category: 'feed' },
  { id: 'breast_right', label: 'Peito Dir.', emoji: '🤱', badge: 'D', icon: '', color: 'tertiary', category: 'feed' },
  { id: 'breast_both', label: 'Ambos', emoji: '🤱', badge: 'E+D', icon: '', color: 'tertiary', category: 'feed' },
  { id: 'bottle', label: 'Mamadeira', emoji: '🍼', icon: '', color: 'primary', category: 'feed', hasAmount: true },
  { id: 'diaper_wet', label: 'Fralda Xixi', emoji: '💧', icon: '', color: 'secondary', category: 'diaper' },
  { id: 'diaper_dirty', label: 'Fralda Cocô', emoji: '💩', icon: '', color: 'secondary', category: 'diaper' },
  { id: 'bath', label: 'Banho', emoji: '🛁', icon: '', color: 'primary', category: 'care' },
  { id: 'sleep', label: 'Dormiu', emoji: '🌙', icon: '', color: 'primary', category: 'sleep' },
  { id: 'wake', label: 'Acordou', emoji: '☀️', icon: '', color: 'primary', category: 'sleep' },
]

export const DEFAULT_INTERVALS: Record<string, IntervalConfig> = {
  feed:   { label: 'próxima mamada',  minutes: 180, warn: 150 },
  diaper: { label: 'próxima troca',   minutes: 120, warn: 90 },
  bath:   { label: 'próximo banho',   minutes: 1440, warn: 1200 },
  sleep:  { label: 'próximo soninho', minutes: 90, warn: 60 },
}

export const CATEGORY_LABELS: Record<string, string> = {
  feed: 'Mamadas',
  diaper: 'Fraldas',
  sleep: 'Sono',
  care: 'Cuidados',
}
