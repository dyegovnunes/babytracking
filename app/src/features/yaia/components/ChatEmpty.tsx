import { contractionDe, article } from '../../../lib/genderUtils'
import type { Baby } from '../../../types'

interface ChatEmptyProps {
  baby: Baby | null
  onPick: (suggestion: string) => void
}

export default function ChatEmpty({ baby, onPick }: ChatEmptyProps) {
  const name = baby?.name ?? 'seu bebê'
  const de = contractionDe(baby?.gender)
  const pronoun = baby?.gender === 'girl' ? 'Ela' : baby?.gender === 'boy' ? 'Ele' : 'Ele(a)'
  const art = article(baby?.gender)

  const suggestions = [
    `Como foi o sono ${de} ${name} essa semana?`,
    `${pronoun} está em algum salto agora?`,
    `Tem alguma vacina atrasada?`,
  ]

  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-4">
      <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          auto_awesome
        </span>
      </div>
      <div>
        <h2 className="font-display text-xl text-on-surface">Oi, que bom te ver por aqui</h2>
        <p className="text-sm text-on-surface-variant mt-2 max-w-xs leading-relaxed">
          Sou a yaIA. Pode me contar o que tá rolando com {art} {name} hoje, eu olho os dados reais antes de responder. Se não souber por onde começar, essas aqui costumam ajudar:
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
