import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { YaIAMessage } from '../useYaIA'

interface ChatBubbleProps {
  message: YaIAMessage
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[80%] rounded-md bg-primary/15 text-on-surface px-3 py-2 whitespace-pre-wrap break-words ${
            message.pending ? 'opacity-60' : ''
          }`}
        >
          {message.content}
        </div>
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
