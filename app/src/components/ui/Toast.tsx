import { useEffect } from 'react'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 3000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  return (
    <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-primary text-on-primary font-label text-sm font-semibold px-5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(167,139,250,0.3)]">
        {message}
      </div>
    </div>
  )
}
