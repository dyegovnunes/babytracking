import type { TimelineFilter } from '../../timeline/types'

interface Props {
  selected: TimelineFilter
  onChange: (cat: TimelineFilter) => void
}

const categories: { id: TimelineFilter; label: string }[] = [
  { id: 'all',        label: 'Tudo' },
  { id: 'activities', label: 'Atividades' },
  { id: 'meals',      label: 'Refeições' },
  { id: 'health',     label: 'Saúde' },
  { id: 'milestones', label: 'Marcos' },
]

/**
 * Filtro da timeline unificada. Inclui 4 categorias:
 * - Tudo: sem filtro
 * - Atividades: logs (mamada, fralda, sono, banho) + resumos da babá
 * - Saúde: vacinas + medicamentos
 * - Marcos: só marcos atingidos
 */
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
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
