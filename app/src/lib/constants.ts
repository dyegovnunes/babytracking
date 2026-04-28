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
  feed:        { label: 'Próxima amamentação',    minutes: 180, warn: 150 },
  diaper:      { label: 'Próxima troca',         minutes: 120, warn: 90 },
  bath:        { label: 'Próximo banho',         minutes: 0,   warn: 15, mode: 'scheduled', scheduledHours: [18] },
  sleep_nap:   { label: 'Deve acordar',          minutes: 90,  warn: 75, description: 'Duração esperada da soneca' },
  sleep_awake: { label: 'Deve dormir',           minutes: 120, warn: 100, description: 'Janela de sono (tempo acordado)' },
}

export const CATEGORY_LABELS: Record<string, string> = {
  feed: 'Amamentação',
  diaper: 'Fraldas',
  sleep: 'Sono',
  care: 'Cuidados',
}

/**
 * Catálogo completo de eventos — inclui os 9 padrão + eventos opcionais
 * que podem ser sugeridos/habilitados via baby_grid_items.
 * Usar como dicionário de resolução eventId → EventType em handlers de log.
 * O grid do TrackerPage usa useGridItems (que resolve via EVENT_CATALOG).
 */
export const EVENT_CATALOG: EventType[] = [
  ...DEFAULT_EVENTS,
  { id: 'meal',     label: 'Refeição',   emoji: '🥣', icon: '', color: 'secondary', category: 'care' },
  { id: 'mood',     label: 'Humor',      emoji: '😊', icon: '', color: 'secondary', category: 'care' },
  { id: 'sick_log', label: 'Doente',     emoji: '🤒', icon: '', color: 'secondary', category: 'care' },
]
