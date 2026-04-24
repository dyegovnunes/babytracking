import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { hapticLight } from '../../lib/haptics'
import { useYaIA } from './useYaIA'
import ChatBubble from './components/ChatBubble'
import ChatInput from './components/ChatInput'
import ChatEmpty from './components/ChatEmpty'
import YaIAIntroModal from './components/YaIAIntroModal'
import TypingIndicator from './components/TypingIndicator'
import SuggestionChips from './components/SuggestionChips'
import ContextChip from './components/ContextChip'
import SessionEndCard from './components/SessionEndCard'

const CHAT_INPUT_SPACER = '5rem'
// Auto-prompt de fim de sessão: 10min sem input novo após última resposta.
const AUTO_SESSION_END_MS = 10 * 60 * 1000

export default function YaIAPage() {
  const navigate = useNavigate()
  const { baby } = useAppState()
  const {
    messages,
    currentSession,
    previousCount,
    showPrevious,
    togglePrevious,
    lastAssistantAt,
    isLoading,
    isHistoryLoading,
    remaining,
    limitResetWhen,
    consentNeeded,
    limitReached,
    error,
    sendMessage,
    retryMessage,
    giveFeedback,
    endSession,
    dismissLimit,
    refreshConsent,
  } = useYaIA()

  const [showInfo, setShowInfo] = useState(false)
  /** Card de fim de sessão visível (manual ou auto). */
  const [showEndCard, setShowEndCard] = useState(false)
  /** Pra não reabrir o card repetidamente após o usuário dispensar. */
  const [dismissedAutoFor, setDismissedAutoFor] = useState<string | null>(null)

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
  }, [currentSession.length, isLoading, showPrevious])

  // Auto-prompt: 10min após última resposta sem novo input → mostra card.
  // Só dispara uma vez por lastAssistantAt (chave anti-re-abertura).
  useEffect(() => {
    if (!lastAssistantAt) return
    if (isLoading) return
    if (dismissedAutoFor === lastAssistantAt) return
    const elapsedSince = Date.now() - new Date(lastAssistantAt).getTime()
    const remainingMs = AUTO_SESSION_END_MS - elapsedSince
    if (remainingMs <= 0) {
      setShowEndCard(true)
      return
    }
    const id = window.setTimeout(() => setShowEndCard(true), remainingMs)
    return () => window.clearTimeout(id)
  }, [lastAssistantAt, isLoading, dismissedAutoFor])

  // Se o usuário mandar nova mensagem, esconde o card (não intrusivo).
  useEffect(() => {
    if (isLoading) setShowEndCard(false)
  }, [isLoading])

  const hasCurrentMessages = currentSession.length > 0
  const lastAssistant = [...currentSession].reverse().find((m) => m.role === 'assistant')
  const activeSuggestions = lastAssistant?.suggestions ?? []

  // Banner de contador: mostra diário no fluxo normal; quando diário acaba,
  // mostra mensal (transparência sem poluir quando tá OK).
  const counterLabel: string | null = useMemo(() => {
    if (!remaining) return null
    if (remaining.daily > 0) {
      return `${remaining.daily} ${remaining.daily === 1 ? 'pergunta' : 'perguntas'} hoje`
    }
    if (remaining.monthly > 0) {
      return `sem perguntas hoje. ${remaining.monthly}/mês disponíveis, ou vire Yaya+`
    }
    return 'limite do mês atingido. Vire Yaya+ pra continuar'
  }, [remaining])

  function handleEndSessionClick() {
    hapticLight()
    setShowEndCard(true)
  }

  function handleNewSession() {
    endSession()
    setShowEndCard(false)
  }

  function handleDismissCard() {
    setShowEndCard(false)
    // Lembra pra não reabrir auto pro mesmo lastAssistantAt.
    if (lastAssistantAt) setDismissedAutoFor(lastAssistantAt)
  }

  return (
    <>
      {/* Glow discreto no topo do canvas — "chão luminoso" do chat.
          Posicionado fixed atrás do conteúdo pra dar profundidade sem custar layout. */}
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 h-64 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(107,78,201,0.12) 0%, rgba(107,78,201,0.04) 40%, transparent 75%)',
        }}
      />

      <header className="sticky top-0 z-20 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/10">
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
          <div className="flex items-center">
            {hasCurrentMessages && (
              <button
                type="button"
                onClick={handleEndSessionClick}
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="Encerrar conversa"
                title="Encerrar conversa"
              >
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="w-10 h-10 flex items-center justify-center text-on-surface-variant"
              aria-label="Sobre a yaIA"
            >
              <span className="material-symbols-outlined">info</span>
            </button>
          </div>
        </div>
        <ContextChip baby={baby} />
        {counterLabel && (
          <div className="text-center text-[11px] text-on-surface-variant pb-1">
            {counterLabel}
          </div>
        )}
      </header>

      <div
        className="relative max-w-lg mx-auto w-full px-3 py-4 flex flex-col gap-3 z-10"
        style={{ paddingBottom: CHAT_INPUT_SPACER }}
      >
        {isHistoryLoading && (
          <div className="text-center text-sm text-on-surface-variant py-6">
            Carregando conversa...
          </div>
        )}

        {/* Toggle pra ver mensagens de sessões anteriores. */}
        {!isHistoryLoading && previousCount > 0 && (
          <button
            type="button"
            onClick={togglePrevious}
            className="self-center text-[11px] text-on-surface-variant/70 hover:text-on-surface flex items-center gap-1 py-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">
              {showPrevious ? 'expand_less' : 'expand_more'}
            </span>
            {showPrevious
              ? 'Ocultar conversa anterior'
              : `Ver ${previousCount} ${previousCount === 1 ? 'mensagem anterior' : 'mensagens anteriores'}`}
          </button>
        )}

        {/* Mensagens antigas (colapsadas por padrão). */}
        {showPrevious && previousCount > 0 && (
          <div className="flex flex-col gap-3 opacity-70">
            {messages.slice(0, previousCount).map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                isFresh={false}
                onRetry={retryMessage}
                onRate={giveFeedback}
              />
            ))}
            <div className="self-center text-[10px] text-on-surface-variant/50 uppercase tracking-wider py-1">
              nova conversa
            </div>
          </div>
        )}

        {!isHistoryLoading && !hasCurrentMessages && (
          <ChatEmpty baby={baby} onPick={(s) => sendMessage(s)} />
        )}

        {currentSession.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            isFresh={freshIds.has(m.id)}
            onRetry={retryMessage}
            onRate={giveFeedback}
          />
        ))}

        {!isLoading && activeSuggestions.length > 0 && lastAssistant && !showEndCard && (
          <div className="pl-9">
            <SuggestionChips
              suggestions={activeSuggestions}
              onPick={(s) => sendMessage(s)}
            />
          </div>
        )}

        {isLoading && <TypingIndicator babyName={baby?.name ?? null} />}

        {error && (
          <div className="text-sm text-error text-center py-2">{error}</div>
        )}

        {showEndCard && !isLoading && (
          <SessionEndCard
            lastAssistantMessageId={lastAssistant?.id ?? null}
            onRate={giveFeedback}
            onNewSession={handleNewSession}
            onDismiss={handleDismissCard}
          />
        )}

        {hasCurrentMessages && (
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
        resetWhen={limitResetWhen ?? undefined}
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
            No plano grátis você tem 2 perguntas por dia, até 15 por mês. Com o Yaya+ são ilimitadas.
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
