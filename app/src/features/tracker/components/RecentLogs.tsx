import { Link } from 'react-router-dom'
import type { LogEntry, Member } from '../../../types'
import type { CaregiverShift } from '../useCaregiverShift'
import type { TimelineItem } from '../../timeline/types'
import type { BabyVaccine } from '../../vaccines/vaccineData'
import type { BabyMilestone } from '../../milestones/milestoneData'
import { TimelineRow } from '../../timeline'

interface Props {
  /** Lista pronta de itens da timeline (agregada no TrackerPage). */
  items: TimelineItem[]
  members: Record<string, Member>
  onEditLog: (log: LogEntry) => void
  onShiftClick: (shift: CaregiverShift) => void
  onVaccineClick?: (vaccine: BabyVaccine) => void
  onMilestoneClick?: (milestone: BabyMilestone) => void
}

/**
 * "Últimos registros" na home. Lista unificada de logs, resumos da babá,
 * vacinas aplicadas, marcos atingidos e doses administradas. O parent
 * (TrackerPage) aplica a regra de janela: últimas 4h OU últimos 5 itens,
 * o que der mais — aqui só renderizamos.
 */
export default function RecentLogs({
  items,
  members,
  onEditLog,
  onShiftClick,
  onVaccineClick,
  onMilestoneClick,
}: Props) {
  if (items.length === 0) {
    return (
      <section className="px-5 mt-6">
        <p className="text-center text-on-surface-variant font-label text-sm py-8">
          Nenhum registro ainda. Toque nos botões acima para começar.
        </p>
      </section>
    )
  }

  return (
    <section className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline text-base font-bold text-on-surface">
          Últimos registros
        </h2>
        <Link
          to="/history"
          className="font-label text-xs text-primary font-medium"
        >
          Ver tudo →
        </Link>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <TimelineRow
            key={`${item.kind}-${item.id}`}
            item={item}
            members={members}
            onEditLog={onEditLog}
            onShiftClick={onShiftClick}
            onVaccineClick={onVaccineClick}
            onMilestoneClick={onMilestoneClick}
          />
        ))}
      </div>
    </section>
  )
}
