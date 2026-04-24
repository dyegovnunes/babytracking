import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { hapticLight } from '../../lib/haptics'
import { useYaIA } from './useYaIA'
import ChatInput from './components/ChatInput'
import ChatEmpty from './components/ChatEmpty'
import YaIAIntroModal from './components/YaIAIntroModal'
import TypingIndicator from './components/TypingIndicator'
import SuggestionChips from './components/SuggestionChips'
import SessionEndCard from './components/SessionEndCard'
import YaIAHeader from './components/YaIAHeader'
import MessageGroup from './components/MessageGroup'
import { groupMessages } from './lib/groupMessages'

const CHAT_INPUT_SPACER = '5.5rem'
const AUTO_SESSION_END_MS = 10 * 60 * 1000

/**
 * Canvas ambient — pontinhos de luz em posições fixas com delays diferentes.
 * Pointer-events-none, aria-hidden. Não distrai, só dá profundidade.
 */
const PARTICLES = [
  { top: '18%', left: '12%', size: 3, delay: '0ms' },
  { top: '32%', left: '78%', size: 2, delay: '800ms' },
  { top: '56%', left: '22%', size: 2, delay: '1600ms' },
  { top: '72%', left: '68%', size: 3, delay: '400ms' },
  { top: '88%', left: '38%', size: 2, delay: '1200ms' },
]

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
  const [showEndCard, setShowEndCard] = useState(false)
  const [dismissedAutoFor, setDismissedAutoFor] = useState<string | null>(null)

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

  useEffect(() => {
    if (isLoading) setShowEndCard(false)
  }, [isLoading])

  const hasCurrentMessages = currentSession.length > 0
  const lastAssistant = [...currentSession].reverse().find((m) => m.role === 'assistant')
  const activeSuggestions = lastAssistant?.suggestions ?? []

  // Agrupa mensagens da sessão corrente em "turnos" com separadores de tempo.
  const groupedCurrent = useMemo(() => groupMessages(currentSession), [currentSession])
  // Agrupa também as anteriores (sem separador dia — elas moram no "passado"
  // do botão colapsável, dia/hora já é contexto de quando acontece).
  const groupedPrevious = useMemo(
    () => (showPrevious ? groupMessages(messages.slice(0, previousCount)) : []),
    [showPrevious, messages, previousCount],
  )

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
    if (lastAssistantAt) setDismissedAutoFor(lastAssistantAt)
  }

  return (
    <>
      {/* Canvas ambient — gradiente rico + pontos de luz. Fixed no fundo. */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(107,78,201,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(212,165,165,0.06) 0%, transparent 70%)',
        }}
      />
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-primary/40 animate-pulse"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: '2.5s',
              animationDelay: p.delay,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      <YaIAHeader
        baby={baby}
        isLoading={isLoading}
        hasMessages={hasCurrentMessages}
        counterLabel={counterLabel}
        onEndSession={handleEndSessionClick}
        onOpenInfo={() => setShowInfo(true)}
      />

      <div
        className="relative max-w-lg mx-auto w-full px-4 py-4 flex flex-col z-10"
        style={{ paddingBottom: CHAT_INPUT_SPACER }}
      >
        {isHistoryLoading && (
          <div className="text-center text-sm text-on-surface-variant py-6">
            Carregando conversa...
          </div>
        )}

        {/* Toggle: ver mensagens de sessões anteriores. */}
        {!isHistoryLoading && previousCount > 0 && (
          <button
            type="button"
            onClick={togglePrevious}
            className="self-center text-[11px] text-on-surface-variant/70 hover:text-on-surface flex items-center gap-1 py-1.5 px-3 rounded-full bg-surface-container/60 backdrop-blur-sm ring-1 ring-outline-variant/15 transition-colors mb-3"
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
          <div className="flex flex-col gap-5 opacity-70 mb-5">
            {groupedPrevious.map((g, i) => (
              <MessageGroup
                key={`prev-${i}-${g.messages[0].id}`}
                messages={g.messages}
                showTimeLabel={g.showTimeLabel}
                timeLabel={g.timeLabel}
                freshIds={freshIds}
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

        {/* Mensagens da sessão atual, agrupadas com separadores de tempo. */}
        <div className="flex flex-col gap-5">
          {groupedCurrent.map((g, i) => (
            <MessageGroup
              key={`cur-${i}-${g.messages[0].id}`}
              messages={g.messages}
              showTimeLabel={g.showTimeLabel}
              timeLabel={g.timeLabel}
              freshIds={freshIds}
              onRetry={retryMessage}
              onRate={giveFeedback}
            />
          ))}
        </div>

        {!isLoading && activeSuggestions.length > 0 && lastAssistant && !showEndCard && (
          <div className="pl-9 mt-3">
            <SuggestionChips
              suggestions={activeSuggestions}
              onPick={(s) => sendMessage(s)}
            />
          </div>
        )}

        {isLoading && (
          <div className="mt-3">
            <TypingIndicator babyName={baby?.name ?? null} />
          </div>
        )}

        {error && (
          <div className="text-sm text-error text-center py-2 mt-3">{error}</div>
        )}

        {showEndCard && !isLoading && (
          <div className="mt-4">
            <SessionEndCard
              lastAssistantMessageId={lastAssistant?.id ?? null}
              onRate={giveFeedback}
              onNewSession={handleNewSession}
              onDismiss={handleDismissCard}
            />
          </div>
        )}

        {hasCurrentMessages && (
          <p className="text-[10px] text-on-surface-variant/50 text-center pt-4">
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

