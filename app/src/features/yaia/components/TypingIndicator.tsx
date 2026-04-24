import { useEffect, useMemo, useState } from 'react'
import YaIAOrb from './YaIAOrb'

// Status rotativo — 6 fases + "quase lá..." só depois de 6s. Sensação de
// progresso varia: às vezes ela "olha os registros", às vezes "consulta o
// blog", às vezes "faz as contas". Injeta nome do bebê quando disponível
// pra passar sinal de grounding ("olhando os registros do Guto...").
const BASE_STAGES = (babyName?: string | null): string[] => [
  'yaIA está pensando...',
  babyName ? `olhando os registros do ${babyName}...` : 'olhando os registros...',
  'consultando o blog do Yaya...',
  'fazendo as contas...',
  'organizando a resposta...',
]
const FINAL_STAGE = 'quase lá...'

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface TypingIndicatorProps {
  babyName?: string | null
}

export default function TypingIndicator({ babyName }: TypingIndicatorProps) {
  // Ordem embaralhada por chamada pra não parecer scripted.
  const stages = useMemo(() => shuffle(BASE_STAGES(babyName)), [babyName])
  const [idx, setIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const rot = window.setInterval(() => {
      setIdx((i) => (i + 1) % stages.length)
    }, 2000)
    const tick = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => {
      window.clearInterval(rot)
      window.clearInterval(tick)
    }
  }, [stages.length])

  // Depois de 6s, trava em "quase lá..." — sinaliza que demora mais que o
  // normal, mas ainda tá vivo.
  const label = elapsed >= 6 ? FINAL_STAGE : stages[idx]

  return (
    <div className="flex justify-start gap-2 items-end">
      <div className="shrink-0">
        <YaIAOrb size="sm" pulsing />
      </div>
      <div className="relative rounded-2xl rounded-bl-md bg-gradient-to-br from-surface-container to-surface-container-high px-4 py-3 flex items-center gap-2 ring-1 ring-outline-variant/10 shadow-sm overflow-hidden">
        {/* Shimmer sutil passando por cima — efeito "carregando de verdade". */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
            animation: 'yaia-shimmer 1.8s linear infinite',
          }}
        />
        <div className="relative flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse [animation-delay:300ms]" />
        </div>
        <span className="relative text-[11px] text-on-surface-variant/80 italic">
          {label}
        </span>
      </div>

      {/* Keyframes locais do shimmer. Evita adicionar CSS global só pra isso. */}
      <style>{`
        @keyframes yaia-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
