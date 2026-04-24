import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { useYaIA } from './useYaIA'
import ChatBubble from './components/ChatBubble'
import ChatInput from './components/ChatInput'
import ChatEmpty from './components/ChatEmpty'
import YaIAIntroModal from './components/YaIAIntroModal'
import TypingIndicator from './components/TypingIndicator'
import SuggestionChips from './components/SuggestionChips'
import ContextChip from './components/ContextChip'

const CHAT_INPUT_SPACER = '5rem'

export default function YaIAPage() {
  const navigate = useNavigate()
  const { baby } = useAppState()
  const {
    messages,
    isLoading,
    isHistoryLoading,
    remaining,
    consentNeeded,
    limitReached,
    error,
    sendMessage,
    retryMessage,
    giveFeedback,
    dismissLimit,
    refreshConsent,
  } = useYaIA()

  const [showInfo, setShowInfo] = useState(false)

  // Tracking de quais mensagens foram montadas (pra stagger só em novas).
  const seenRef = useRef<Set<string>>(new Set())
  const freshIds = useMemo(() => {
    const s = new Set<string>()
    for (const m of messages) {
      if (m.role === 'assistant' && !seenRef.current.has(m.id)) s.add(m.id)
    }
    return s
  }, [messages])
  useEffect(() => {
    for (const m of messages) seenRef.current.add(m.id)
  }, [messages])

  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const id = window.setTimeout(() => {
      main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' })
    }, 60)
    return () => window.clearTimeout(id)
  }, [messages.length, isLoading])

  const hasMessages = messages.length > 0
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const activeSuggestions = lastAssistant?.suggestions ?? []

  return (
    <>
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15">
        <div className="flex items-center justify-between h-12 px-2 max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <h1 className="font-display text-lg text-on-surface">yaIA</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant"
            aria-label="Sobre a yaIA"
          >
            <span className="material-symbols-outlined">info</span>
          </button>
        </div>
        <ContextChip baby={baby} />
        {remaining !== null && remaining <= 3 && remaining > 0 && (
          <div className="text-center text-[11px] text-on-surface-variant pb-1">
            {remaining} {remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} esse mês
          </div>
        )}
      </header>

      <div
        className="max-w-lg mx-auto w-full px-3 py-4 flex flex-col gap-3"
        style={{ paddingBottom: CHAT_INPUT_SPACER }}
      >
        {isHistoryLoading && (
          <div className="text-center text-sm text-on-surface-variant py-6">
            Carregando conversa...
          </div>
        )}

        {!isHistoryLoading && !hasMessages && (
          <ChatEmpty baby={baby} onPick={(s) => sendMessage(s)} />
        )}

        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            isFresh={freshIds.has(m.id)}
            onRetry={retryMessage}
            onRate={giveFeedback}
          />
        ))}

        {!isLoading && activeSuggestions.length > 0 && lastAssistant && (
          <div className="pl-9">
            <SuggestionChips
              suggestions={activeSuggestions}
              onPick={(s) => sendMessage(s)}
            />
          </div>
        )}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="text-sm text-error text-center py-2">{error}</div>
        )}

        {hasMessages && (
          <p className="text-[10px] text-on-surface-variant/60 text-center pt-2">
            Informação geral. Não substitui consulta pediátrica.
          </p>
        )}
      </div>

      <ChatInput
        disabled={isLoading || consentNeeded || !baby}
        placeholder={!baby ? 'Selecione um bebê primeiro' : 'Conta pra yaIA...'}
        onSend={(v) => sendMessage(v)}
      />

      <YaIAIntroModal
        isOpen={consentNeeded}
        onAccept={refreshConsent}
        onClose={() => navigate('/')}
      />

      <PaywallModal
        isOpen={limitReached}
        onClose={dismissLimit}
        trigger="yaia"
      />

      <InfoSheet isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </>
  )
}

function InfoSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useSheetBackClose(isOpen, onClose)
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-md p-5 pt-6 flex flex-col gap-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg text-on-surface">Sobre a yaIA</h2>
        <div className="text-sm text-on-surface-variant space-y-2">
          <p>
            A yaIA é a assistente conversacional do Yaya. Ela combina conhecimento
            pediátrico atualizado com os dados reais do seu bebê para responder de
            forma personalizada.
          </p>
          <p>
            <strong>Ela não substitui o pediatra.</strong> As respostas são
            informativas. Em qualquer dúvida clínica, procure um profissional.
          </p>
          <p className="text-xs">
            No plano grátis você pode fazer 10 perguntas por mês. Com o Yaya+, são ilimitadas.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-md bg-primary text-on-primary font-medium mt-2"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
