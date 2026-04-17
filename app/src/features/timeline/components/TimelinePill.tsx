interface Props {
  variant: 'vaccine' | 'medication' | 'milestone' | 'shift'
  children: string
}

const STYLES: Record<Props['variant'], string> = {
  // Azul — vacina
  vaccine: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  // Laranja — medicamento
  medication: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  // Roxo — marco
  milestone: 'bg-primary/15 text-primary border border-primary/25',
  // Verde — resumo da babá
  shift: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
}

/**
 * Pill pequena pra identificar o tipo do item na timeline. Fica antes do
 * nome do evento. Logs não recebem pill (ícone já comunica).
 */
export default function TimelinePill({ variant, children }: Props) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-label font-semibold uppercase tracking-wider ${STYLES[variant]}`}
    >
      {children}
    </span>
  )
}
