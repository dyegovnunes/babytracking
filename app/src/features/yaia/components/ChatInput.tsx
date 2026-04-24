import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { hapticLight } from '../../../lib/haptics'

interface ChatInputProps {
  disabled?: boolean
  placeholder?: string
  onSend: (value: string) => void
}

export default function ChatInput({ disabled, placeholder, onSend }: ChatInputProps) {
  const [value, setValue] = useState('')

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
    // Enter envia, Shift+Enter quebra linha
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed left-0 right-0 z-30 bg-surface-container/90 backdrop-blur-xl border-t border-outline-variant/15"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + var(--yaya-ad-offset, 0px))' }}
    >
      <div className="flex items-end gap-2 max-w-lg mx-auto px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Conta pra yaIA...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-surface rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 max-h-32"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 w-10 h-10 rounded-md bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
          aria-label="Enviar"
        >
          <span className="material-symbols-outlined text-xl">send</span>
        </button>
      </div>
    </form>
  )
}
