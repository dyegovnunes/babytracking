import { motion } from 'framer-motion'
import type { YaIAMessage } from '../useYaIA'
import type { MessageGroupData } from '../lib/groupMessages'
import ChatBubble from './ChatBubble'

interface MessageGroupProps extends MessageGroupData {
  freshIds: Set<string>
  onRetry?: (messageId: string) => void
  onRate?: (messageId: string, rating: 1 | -1, reasonTag?: string) => void
}

/**
 * Um grupo = sequência de mensagens do mesmo role em janela < 2min.
 * Renderiza opcional separador de tempo no topo, depois as bubbles com
 * gap tight (4px) entre elas. Avatar só aparece na primeira bubble do
 * grupo (controlado via isFirstInGroup). Tail SVG só na primeira
 * (assistant) ou última (user).
 */
export default function MessageGroup({
  messages,
  showTimeLabel,
  timeLabel,
  freshIds,
  onRetry,
  onRate,
}: MessageGroupProps) {
  if (messages.length === 0) return null

  return (
    <div className="flex flex-col">
      {showTimeLabel && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="self-center my-3"
        >
          <span
            className={
              showTimeLabel === 'day'
                ? 'text-[10px] uppercase tracking-[0.15em] text-on-surface-variant/50 font-medium'
                : 'text-[10px] text-on-surface-variant/50 font-medium'
            }
          >
            {timeLabel}
          </span>
        </motion.div>
      )}

      {/* Bubbles do grupo com gap interno tight. */}
      <div className="flex flex-col gap-1">
        {messages.map((m, idx) => (
          <ChatBubble
            key={m.id}
            message={m}
            isFresh={freshIds.has(m.id)}
            isFirstInGroup={idx === 0}
            isLastInGroup={idx === messages.length - 1}
            onRetry={onRetry}
            onRate={onRate}
          />
        ))}
      </div>
    </div>
  )
}

// Helper: expõe o tipo de mensagem pra quem importa daqui.
export type { YaIAMessage }
