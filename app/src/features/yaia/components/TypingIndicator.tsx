import { useEffect, useState } from 'react'

// Status rotativo pra dar sensação de progresso enquanto a IA responde.
// Troca texto a cada ~2s até a resposta chegar.
const STAGES = [
  'yaIA está pensando...',
  'consultando os dados...',
  'organizando a resposta...',
]

export default function TypingIndicator() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => Math.min(i + 1, STAGES.length - 1))
    }, 2000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="flex justify-start gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold">
        yA
      </div>
      <div className="rounded-md bg-surface-container px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:300ms]" />
        </div>
        <span className="text-[11px] text-on-surface-variant/70 italic">
          {STAGES[idx]}
        </span>
      </div>
    </div>
  )
}
