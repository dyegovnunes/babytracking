import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { YaIAMessage } from '../useYaIA'
import BubbleMenu from './BubbleMenu'
import YaIAOrb from './YaIAOrb'

interface ChatBubbleProps {
  message: YaIAMessage
  /** Recém-chegadas animam com stagger. Histórico entra direto. */
  isFresh?: boolean
  /** Primeira bubble de um grupo — mostra avatar (assistant) ou tail (user). */
  isFirstInGroup?: boolean
  /** Última bubble de um grupo — mostra tail (user) ou sources (assistant). */
  isLastInGroup?: boolean
  onRetry?: (messageId: string) => void
  onRate?: (messageId: string, rating: 1 | -1, reasonTag?: string) => void
}

const STAGGER_MS = 500
const LONG_PRESS_MS = 450

/**
 * Tail SVG pra bubble assistant — canto esquerdo inferior.
 * Cor puxa do gradiente da bubble (surface-container-high aproximado).
 */
function AssistantTail() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="absolute -left-1.5 bottom-0 pointer-events-none"
      aria-hidden
    >
      <path
        d="M10 0 L10 10 L2 10 C6 10 10 6 10 0 Z"
        fill="rgb(47 44 63)"
        opacity="0.95"
      />
    </svg>
  )
}

/**
 * Tail SVG pra bubble user — canto direito inferior, cor primary/20 blend.
 */
function UserTail() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="absolute -right-1.5 bottom-0 pointer-events-none"
      aria-hidden
    >
      <path
        d="M0 0 L0 10 L8 10 C4 10 0 6 0 0 Z"
        fill="rgba(107,78,201,0.20)"
      />
    </svg>
  )
}

export default function ChatBubble({
  message,
  isFresh,
  isFirstInGroup = true,
  isLastInGroup = true,
  onRetry,
  onRate,
}: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <UserBubble
        message={message}
        isLastInGroup={isLastInGroup}
        onRetry={onRetry}
      />
    )
  }

  return (
    <AssistantBubbles
      message={message}
      isFresh={!!isFresh}
      isFirstInGroup={isFirstInGroup}
      isLastInGroup={isLastInGroup}
      onRate={onRate}
    />
  )
}

function UserBubble({
  message,
  isLastInGroup,
  onRetry,
}: {
  message: YaIAMessage
  isLastInGroup: boolean
  onRetry?: (id: string) => void
}) {
  const content = message.bubbles[0] ?? ''
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-end gap-1"
    >
      <div className="relative max-w-[80%]">
        <div
          className={`rounded-2xl ${
            isLastInGroup ? 'rounded-br-md' : 'rounded-br-2xl'
          } px-4 py-2.5 whitespace-pre-wrap break-words shadow-sm transition-colors ${
            message.failed
              ? 'bg-error-container/40 text-on-surface ring-1 ring-error/40'
              : 'bg-gradient-to-br from-primary/25 to-primary/15 text-on-surface ring-1 ring-primary/15'
          } ${message.pending ? 'opacity-60' : ''}`}
        >
          {content}
        </div>
        {isLastInGroup && !message.failed && <UserTail />}
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

function AssistantBubbles({
  message,
  isFresh,
  isFirstInGroup,
  isLastInGroup,
  onRate,
}: {
  message: YaIAMessage
  isFresh: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  onRate?: (id: string, rating: 1 | -1, reasonTag?: string) => void
}) {
  const total = message.bubbles.length
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

  const canRate = !!onRate && !message.id.startsWith('tmp_')

  return (
    <div className="flex flex-col gap-1">
      {message.bubbles.slice(0, visibleCount).map((text, idx) => {
        const isAbsoluteFirst = idx === 0 && isFirstInGroup
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex justify-start gap-2 items-end"
          >
            {isAbsoluteFirst ? (
              <div className="shrink-0 self-end">
                <YaIAOrb size="sm" breathing={false} />
              </div>
            ) : (
              <div className="shrink-0 w-7 h-7" aria-hidden />
            )}
            <div className="relative max-w-[80%]">
              <div
                className={`rounded-2xl ${
                  isAbsoluteFirst ? 'rounded-bl-md' : 'rounded-bl-2xl'
                } bg-gradient-to-br from-surface-container to-surface-container-high text-on-surface px-4 py-2.5 break-words select-none shadow-sm ring-1 ring-outline-variant/10`}
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
              {isAbsoluteFirst && <AssistantTail />}
            </div>
          </motion.div>
        )
      })}

      {showingDots && visibleCount < total && (
        <div className="flex justify-start gap-2 pl-9">
          <div className="rounded-2xl bg-surface-container px-3 py-2 flex items-center gap-1 ring-1 ring-outline-variant/10">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* Sources chip abaixo da última bubble quando existem E é o fim do grupo. */}
      {visibleCount >= total &&
        isLastInGroup &&
        message.sources &&
        message.sources.length > 0 && (
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
