import { contractionDe } from '../../../lib/genderUtils'
import type { Baby } from '../../../types'

interface ChatEmptyProps {
  baby: Baby | null
  onPick: (suggestion: string) => void
}

export default function ChatEmpty({ baby, onPick }: ChatEmptyProps) {
  const name = baby?.name ?? 'seu bebê'
  const de = contractionDe(baby?.gender)

  const suggestions = [
    `Como está o sono ${de} ${name} essa semana?`,
    baby?.gender === 'girl' ? 'Ela está em algum salto agora?' : 'Ele está em algum salto agora?',
    'Tem alguma vacina em atraso?',
  ]

  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
      </div>
      <div>
        <h2 className="font-display text-xl text-on-surface">Oi, sou a yaIA</h2>
        <p className="text-sm text-on-surface-variant mt-1 max-w-xs">
          Pergunta qualquer coisa sobre {de === 'de' ? 'o' : de} {name} — sono, alimentação, saltos, vacinas. Eu olho os dados reais antes de responder.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-left text-sm rounded-md bg-surface-container text-on-surface px-3 py-2 hover:bg-surface-container-high transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
