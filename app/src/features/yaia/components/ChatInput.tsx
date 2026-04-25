import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { hapticLight } from '../../../lib/haptics'
import { spring } from '../../../lib/motion'

interface ChatInputProps {
  disabled?: boolean
  placeholder?: string
  onSend: (value: string) => void
}

export default function ChatInput({ disabled, placeholder, onSend }: ChatInputProps) {
  const [value, setValue] = useState('')
  const canSend = !disabled && !!value.trim()

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    hapticLight()
    onSend(trimmed)
    setValue('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed left-0 right-0 z-30 bg-surface-container-high/85 backdrop-blur-2xl"
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--yaya-ad-offset, 0px))',
        boxShadow:
          '0 -12px 32px -16px rgba(0,0,0,0.35), inset 0 1px 0 0 rgba(107,78,201,0.18)',
      }}
    >
      <p className="text-center text-[9.5px] text-on-surface-variant/35 pt-1.5 pb-0 px-4 leading-snug">
        yaIA pode cometer erros. As respostas combinam dados do seu bebê, blog Yaya e diretrizes OMS/SBP. Não substitui consulta pediátrica.
      </p>
      <div className="flex items-end gap-2 max-w-lg mx-auto px-3 py-2.5">
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Conta pra yaIA...'}
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-surface/70 rounded-3xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary/40 disabled:opacity-60 max-h-32 transition-all"
          />
        </div>
        <motion.button
          type="submit"
          disabled={!canSend}
          animate={{
            scale: canSend ? 1 : 0.88,
            opacity: canSend ? 1 : 0.55,
          }}
          whileTap={canSend ? { scale: 0.92 } : undefined}
          transition={spring.subtle}
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-on-primary transition-[background,box-shadow] ${
            canSend
              ? 'bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/40'
              : 'bg-surface-variant text-on-surface-variant/50 shadow-none'
          }`}
          aria-label="Enviar"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            arrow_upward
          </span>
        </motion.button>
      </div>
    </form>
  )
}
