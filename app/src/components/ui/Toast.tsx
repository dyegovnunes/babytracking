import { useEffect, useRef, useState, type TouchEvent } from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
  variant?: ToastVariant
}

const SWIPE_THRESHOLD = 80

const VARIANT_STYLES: Record<ToastVariant, { bg: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-primary',
    text: 'text-on-primary',
    icon: 'info',
  },
  success: {
    bg: 'bg-emerald-600',
    text: 'text-white',
    icon: 'check_circle',
  },
  error: {
    bg: 'bg-error',
    text: 'text-on-error',
    icon: 'warning',
  },
}

/**
 * Toast não-obstrutivo. Aparece fixed próximo ao bottom (acima da nav),
 * auto-some depois de `duration` ms, e aceita swipe horizontal pra dismissar
 * manualmente. Suporta 3 variantes (info / success / error) com cores
 * distintas + ícone.
 *
 * Formato retangular (rounded-md, seguindo padrão do app) e texto centralizado.
 */
export default function Toast({ message, onDismiss, duration = 3500, variant = 'info' }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [dismissing, setDismissing] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  const style = VARIANT_STYLES[variant]

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
      className="fixed left-0 right-0 z-50 px-4 pointer-events-none"
      style={{
        // Acima da bottom nav (inclui banner AdMob offset se ativo)
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom) + var(--yaya-ad-offset, 0px))',
      }}
    >
      <div
        className="max-w-md mx-auto animate-slide-up pointer-events-auto"
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
          className={`${style.bg} ${style.text} rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.3)] px-4 py-3 flex items-center gap-3`}
        >
          <span className="material-symbols-outlined text-xl shrink-0">
            {style.icon}
          </span>
          <p className="flex-1 text-center font-label text-sm font-semibold leading-snug">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}
