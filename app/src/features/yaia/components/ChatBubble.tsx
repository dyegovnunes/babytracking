import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { YaIAMessage } from '../useYaIA'
import BubbleMenu from './BubbleMenu'

interface ChatBubbleProps {
  message: YaIAMessage
  /** Mensagens carregadas do histórico pulam stagger. Recém-chegadas animam. */
  isFresh?: boolean
  onRetry?: (messageId: string) => void
  onRate?: (messageId: string, rating: 1 | -1, reasonTag?: string) => void
}

const STAGGER_MS = 500
const LONG_PRESS_MS = 450

export default function ChatBubble({ message, isFresh, onRetry, onRate }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return <UserBubble message={message} onRetry={onRetry} />
  }

  return <AssistantBubbles message={message} isFresh={!!isFresh} onRate={onRate} />
}

function UserBubble({ message, onRetry }: { message: YaIAMessage; onRetry?: (id: string) => void }) {
  const content = message.bubbles[0] ?? ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-end gap-1"
    >
      <div
        className={`max-w-[80%] rounded-md rounded-br-sm px-3.5 py-2 whitespace-pre-wrap break-words shadow-sm transition-colors ${
          message.failed
            ? 'bg-error-container/40 text-on-surface ring-1 ring-error/40'
            : 'bg-gradient-to-br from-primary/20 to-primary/10 text-on-surface ring-1 ring-primary/15'
        } ${message.pending ? 'opacity-60' : ''}`}
      >
        {content}
      </div>
      {message.failed && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(message.id)}
          className="flex items-center gap-1 text-[11px] text-error hover:text-on-surface transition-colors px-1"
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Não enviou. Toca pra tentar de novo
        </button>
      )}
    </motion.div>
  )
}

function AssistantAvatar() {
  return (
    <div className="relative shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/20 text-primary flex items-center justify-center text-[11px] font-semibold ring-1 ring-primary/20">
      yA
      <span
        className="material-symbols-outlined absolute -top-0.5 -right-0.5 text-[11px] text-primary bg-surface rounded-full leading-none p-[1px] ring-1 ring-primary/30"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden
      >
        auto_awesome
      </span>
    </div>
  )
}

function AssistantBubbles({
  message,
  isFresh,
  onRate,
}: {
  message: YaIAMessage
  isFresh: boolean
  onRate?: (id: string, rating: 1 | -1, reasonTag?: string) => void
}) {
  const total = message.bubbles.length
  // Histórico aparece tudo de uma vez. Mensagens novas entram uma a uma.
  const [visibleCount, setVisibleCount] = useState(isFresh ? 1 : total)
  const [showingDots, setShowingDots] = useState(isFresh && total > 1)
  const [menuOpen, setMenuOpen] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isFresh) return
    if (visibleCount >= total) {
      setShowingDots(false)
      return
    }
    const dotsId = window.setTimeout(() => setShowingDots(true), 120)
    const revealId = window.setTimeout(() => {
      setVisibleCount((n) => n + 1)
      setShowingDots(false)
    }, STAGGER_MS)
    return () => {
      window.clearTimeout(dotsId)
      window.clearTimeout(revealId)
    }
  }, [visibleCount, total, isFresh])

  function startLongPress() {
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      setMenuOpen(true)
    }, LONG_PRESS_MS)
  }
  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleCopy() {
    const fullText = message.bubbles.join('\n\n')
    navigator.clipboard?.writeText(fullText).catch(() => {})
  }

  // A IA não aceita feedback em mensagens temporárias (sem UUID real do DB).
  const canRate = !!onRate && !message.id.startsWith('tmp_')

  return (
    <div className="flex flex-col gap-1.5">
      {message.bubbles.slice(0, visibleCount).map((text, idx) => {
        // Primeira bubble ganha "tail" sutil no canto superior esquerdo.
        // Demais ficam simétricas — evita parecer escadinha.
        const tailClass = idx === 0 ? 'rounded-md rounded-tl-sm' : 'rounded-md'
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex justify-start gap-2"
          >
            {idx === 0 ? <AssistantAvatar /> : <div className="shrink-0 w-7 h-7" aria-hidden />}
            <div
              className={`max-w-[80%] ${tailClass} bg-gradient-to-br from-surface-container to-surface-container-high text-on-surface px-3.5 py-2 break-words select-none shadow-sm ring-1 ring-outline-variant/10`}
              onPointerDown={startLongPress}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenuOpen(true)
              }}
            >
              <div className="yaia-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'br']}
                  unwrapDisallowed
                >
                  {text}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )
      })}

      {showingDots && visibleCount < total && (
        <div className="flex justify-start gap-2 pl-9">
          <div className="rounded-md bg-surface-container px-3 py-2 flex items-center gap-1 ring-1 ring-outline-variant/10">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* Sources chip abaixo da última bubble quando existem. */}
      {visibleCount >= total && message.sources && message.sources.length > 0 && (
        <div className="pl-9 flex flex-wrap gap-2 mt-1">
          {message.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] rounded-full bg-primary/10 text-primary px-2.5 py-1 ring-1 ring-primary/20 hover:bg-primary/15 transition-colors"
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                menu_book
              </span>
              Leia no blog: {s.title}
            </a>
          ))}
        </div>
      )}

      <BubbleMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onCopy={handleCopy}
        onRate={canRate ? (rating, tag) => onRate?.(message.id, rating, tag) : undefined}
      />
    </div>
  )
}
