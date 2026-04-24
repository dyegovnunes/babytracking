import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { YaIAMessage } from '../useYaIA'

interface ChatBubbleProps {
  message: YaIAMessage
  onRetry?: (messageId: string) => void
}

export default function ChatBubble({ message, onRetry }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className={`max-w-[80%] rounded-md px-3 py-2 whitespace-pre-wrap break-words transition-colors ${
            message.failed
              ? 'bg-error-container/40 text-on-surface ring-1 ring-error/40'
              : 'bg-primary/15 text-on-surface'
          } ${message.pending ? 'opacity-60' : ''}`}
        >
          {message.content}
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
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold">
        yA
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-md bg-surface-container text-on-surface px-3 py-2 break-words">
          <div className="yaia-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'br']}
              unwrapDisallowed
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <p className="text-[10px] text-on-surface-variant/70 mt-1 px-1">
          Informação geral. Não substitui consulta pediátrica.
        </p>
      </div>
    </div>
  )
}
