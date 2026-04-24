import { motion } from 'framer-motion'
import { contractionDe } from '../../../lib/genderUtils'
import { hapticLight } from '../../../lib/haptics'
import type { Baby } from '../../../types'
import YaIAOrb from './YaIAOrb'

interface ChatEmptyProps {
  baby: Baby | null
  onPick: (suggestion: string) => void
}

interface SuggestionChip {
  emoji: string
  text: (name: string, de: string) => string
}

const CHIPS: SuggestionChip[] = [
  { emoji: '💤', text: (name, de) => `Como tá o sono ${de} ${name}?` },
  { emoji: '🍼', text: (name) => `${name} tá mamando bem?` },
  { emoji: '💉', text: () => 'Tem vacina atrasada?' },
  { emoji: '✨', text: (name, de) => `Em que salto ${de} ${name} tá?` },
]

export default function ChatEmpty({ baby, onPick }: ChatEmptyProps) {
  const name = baby?.name ?? 'seu bebê'
  const de = contractionDe(baby?.gender)

  function handlePick(s: string) {
    hapticLight()
    onPick(s)
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
      }}
      className="flex flex-col items-center text-center px-6 py-12 gap-5"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.8, y: 10 },
          show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
        }}
      >
        <YaIAOrb size="lg" />
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 8 },
          show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        }}
        className="flex flex-col gap-2"
      >
        <h2 className="font-display text-2xl text-on-surface">
          Oi, eu sou a yaIA
        </h2>
        <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
          Me conta o que tá rolando com {name}. Eu olho os dados reais do seu bebê antes de responder.
        </p>
      </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 8 },
          show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
        }}
        className="grid grid-cols-2 gap-2 w-full max-w-xs pt-2"
      >
        {CHIPS.map((c) => {
          const label = c.text(name, de)
          return (
            <motion.button
              key={label}
              type="button"
              onClick={() => handlePick(label)}
              whileTap={{ scale: 0.96 }}
              variants={{
                hidden: { opacity: 0, scale: 0.95 },
                show: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
              }}
              className="text-left text-[12.5px] leading-tight rounded-2xl bg-gradient-to-br from-surface-container to-surface-container-high text-on-surface px-3 py-2.5 ring-1 ring-outline-variant/15 hover:ring-primary/30 hover:bg-surface-container-high transition-all flex items-start gap-1.5"
            >
              <span className="text-base shrink-0 leading-none pt-0.5">{c.emoji}</span>
              <span>{label}</span>
            </motion.button>
          )
        })}
      </motion.div>

      <motion.p
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0.3, delay: 0.4 } },
        }}
        className="text-[10px] text-on-surface-variant/50 pt-3 flex items-center gap-1.5"
      >
        <img
          src="./landing/symbol-light.png"
          alt=""
          className="w-3 h-3 opacity-60"
          draggable={false}
        />
        Assistente do Yaya Baby
      </motion.p>
    </motion.div>
  )
}
