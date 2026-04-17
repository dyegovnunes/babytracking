import type { LogEntry, Member } from '../../../types'
import type { CaregiverShift } from '../../tracker/useCaregiverShift'
import type { TimelineItem } from '../types'
import LogRow from './LogRow'
import ShiftRow from './ShiftRow'
import VaccineRow from './VaccineRow'
import MilestoneRow from './MilestoneRow'
import MedicationRow from './MedicationRow'

interface Props {
  item: TimelineItem
  members: Record<string, Member>
  onEditLog: (log: LogEntry) => void
  onShiftClick?: (shift: CaregiverShift) => void
}

/**
 * Dispatcher: dado um TimelineItem, renderiza a row apropriada.
 * Callbacks são passados pra quem precisa; cada row implementa seu
 * próprio comportamento (tap edit, navegar, abrir sheet).
 */
export default function TimelineRow({ item, members, onEditLog, onShiftClick }: Props) {
  switch (item.kind) {
    case 'log':
      return (
        <LogRow
          log={item.data}
          members={members}
          onEdit={onEditLog}
          pairedLog={item.pairedLog}
        />
      )
    case 'shift': {
      const name = members[item.data.caregiverId]?.displayName || 'Cuidador(a)'
      return (
        <ShiftRow
          shift={item.data}
          caregiverName={name}
          onClick={onShiftClick ? () => onShiftClick(item.data) : undefined}
        />
      )
    }
    case 'vaccine':
      return <VaccineRow vaccine={item.data} displayName={item.displayName} />
    case 'milestone':
      return <MilestoneRow milestone={item.data} displayName={item.displayName} />
    case 'medication':
      return <MedicationRow log={item.data} medication={item.medication} />
  }
}
