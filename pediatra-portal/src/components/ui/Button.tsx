import { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  loading?: boolean
}

export default function Button({ variant = 'primary', loading, children, className = '', disabled, ...rest }: Props) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-[6px] font-[700] text-sm transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 leading-none'

  const variants = {
    primary: 'bg-[#7056e0] text-white shadow-primary hover:bg-[#5a45c4] active:scale-[0.98]',
    ghost:   'bg-transparent text-[#7056e0] hover:bg-[#e8e1ff] active:bg-[#d0c8f8]',
    danger:  'bg-transparent text-[#b3001f] hover:bg-[#ffd9dd] active:bg-[#ffb3bb]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      )}
      {children}
    </button>
  )
}
