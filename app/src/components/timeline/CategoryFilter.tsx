import type { EventCategory } from '../../types'

interface Props {
  selected: EventCategory | 'all'
  onChange: (cat: EventCategory | 'all') => void
}

const categories: { id: EventCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'feed', label: 'Mamadas' },
  { id: 'diaper', label: 'Fraldas' },
  { id: 'sleep', label: 'Sono' },
  { id: 'care', label: 'Cuidados' },
]

export default function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`shrink-0 px-4 py-2 rounded-full font-label text-sm font-medium transition-colors ${
            selected === cat.id
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
