import { useEffect, useRef, useState, type TouchEvent } from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
  variant?: ToastVariant
}

const SWIPE_THRESHOLD = 80

const VARIANT_STYLES: Record<ToastVariant, string> = {
  // Usa bg escuro quase opaco com borda colorida fina — não se confunde
  // com botões primários roxos do app. Notificação, não CTA.
  info: 'bg-surface-container-highest text-on-surface border border-primary/50',
  success: 'bg-surface-container-highest text-on-surface border border-emerald-500/50',
  error: 'bg-surface-container-highest text-on-surface border border-error/60',
}

/**
 * Toast/snackbar não-obstrutivo. Aparece perto do bottom (acima da nav),
 * auto-some em `duration` ms, e aceita swipe horizontal pra dismiss.
 *
 * Design: chip compacto com fundo dark + borda colorida sutil por variant.
 * **Não** parece botão (sem cor sólida CTA, sem ícone clicável). Largura
 * acompanha o conteúdo (inline-flex), não toma full-width.
 */
export default function Toast({ message, onDismiss, duration = 3500, variant = 'info' }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [dismissing, setDismissing] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissing(true)
      setTimeout(onDismiss, 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
  }

  const handleTouchMove = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }
    if (!isHorizontal.current) return
    setOffsetX(dx)
  }

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
      setDismissing(true)
      setOffsetX(offsetX > 0 ? 400 : -400)
      setTimeout(onDismiss, 200)
    } else {
      setOffsetX(0)
    }
    isHorizontal.current = null
  }

  const opacity = dismissing ? 0 : 1 - Math.min(Math.abs(offsetX) / 200, 0.8)

  return (
    <div
      className="fixed left-0 right-0 z-50 flex justify-center px-5 pointer-events-none"
      style={{
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom) + var(--yaya-ad-offset, 0px))',
      }}
    >
      <div
        className="animate-slide-up pointer-events-auto max-w-[90%]"
        style={{
          transform: `translateX(${offsetX}px)`,
          opacity,
          transition: offsetX === 0 || dismissing ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`inline-flex items-center rounded-full backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.25)] px-4 py-2 ${VARIANT_STYLES[variant]}`}
        >
          <p className="font-label text-xs text-center leading-snug">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
