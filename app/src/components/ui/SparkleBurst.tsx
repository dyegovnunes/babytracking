import { motion } from 'framer-motion'

interface Props {
  /** Mostra/dispara. Ao virar true, estrelas emergem uma vez. */
  active: boolean
  /** Raio da explosão em px. Padrão 28 (pro checkbox de marco/vacina). */
  radius?: number
  /** Quantidade de estrelas. Padrão 6 (menos denso que celebração fullscreen). */
  count?: number
  /** Dura\u00e7\u00e3o do fade em ms. Padr\u00e3o 800. */
  durationMs?: number
}

/**
 * Burst inline de estrelinhas emergindo radialmente de um ponto central.
 * Usado em micro-celebrações (checkbox de marco/vacina marcado), onde a
 * celebração fullscreen do `MilestoneCelebration` é exagero.
 *
 * Design:
 * - Posicionamento absoluto; container pai precisa ser `relative`
 * - Pointer-events: none (não bloqueia o próprio botão)
 * - Emoji ✨ pequeno (text-sm) pra não cobrir o ícone
 * - Triggered via `active` prop. Componente pai controla o ciclo:
 *   montar com active=true → esperar o tempo da animação → desmontar
 *   (ou deixar montado com active=false, sem overhead visual)
 */
export default function SparkleBurst({
  active,
  radius = 28,
  count = 6,
  durationMs = 800,
}: Props) {
  if (!active) return null

  const sparkles = Array.from({ length: count }).map((_, i) => {
    const angle = (i / count) * Math.PI * 2
    return {
      id: i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      delay: i * 0.02,
    }
  })

  const durationSec = durationMs / 1000

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {sparkles.map((s) => (
        <motion.span
          key={s.id}
          className="absolute top-1/2 left-1/2 text-sm select-none"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{
            x: s.x,
            y: s.y,
            opacity: [0, 1, 0],
            scale: [0.3, 1, 0.5],
          }}
          transition={{ duration: durationSec, delay: s.delay, ease: 'easeOut' }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  )
}
