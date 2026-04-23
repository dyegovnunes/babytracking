import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { useYaIA } from './useYaIA'
import ChatBubble from './components/ChatBubble'
import ChatInput from './components/ChatInput'
import ChatEmpty from './components/ChatEmpty'
import YaIAIntroModal from './components/YaIAIntroModal'

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
    dismissLimit,
    refreshConsent,
  } = useYaIA()

  const [showInfo, setShowInfo] = useState(false)
  useSheetBackClose(showInfo, () => setShowInfo(false))

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para o fim sempre que chega mensagem nova ou entra em loading
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, isLoading])

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 pt-safe">
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
        {remaining !== null && remaining <= 3 && remaining > 0 && (
          <div className="text-center text-[11px] text-on-surface-variant pb-1">
            {remaining} {remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} esse mês
          </div>
        )}
      </header>

      {/* Corpo: lista de mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(72px + var(--yaya-ad-offset, 0px) + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-lg mx-auto w-full px-3 py-4 flex flex-col gap-3">
          {isHistoryLoading && (
            <div className="text-center text-sm text-on-surface-variant py-6">
              Carregando conversa…
            </div>
          )}

          {!isHistoryLoading && !hasMessages && (
            <ChatEmpty baby={baby} onPick={(s) => sendMessage(s)} />
          )}

          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}

          {isLoading && <TypingBubble />}

          {error && (
            <div className="text-sm text-error text-center py-2">{error}</div>
          )}
        </div>
      </div>

      {/* Input fixo */}
      <ChatInput
        disabled={isLoading || consentNeeded || !baby}
        placeholder={!baby ? 'Selecione um bebê primeiro' : 'Pergunta pra yaIA…'}
        onSend={(v) => sendMessage(v)}
      />

      {/* Consent na 1ª abertura */}
      <YaIAIntroModal
        isOpen={consentNeeded}
        onAccept={refreshConsent}
        onClose={() => navigate('/')}
      />

      {/* Paywall no 11º envio */}
      <PaywallModal
        isOpen={limitReached}
        onClose={dismissLimit}
        trigger="yaia"
      />

      {/* Info "o que é yaIA" */}
      {showInfo && <InfoSheet onClose={() => setShowInfo(false)} />}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold">
        yA
      </div>
      <div className="rounded-md bg-surface-container px-4 py-3 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/60 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  )
}

function InfoSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-md p-5 pt-6 pb-safe flex flex-col gap-3"
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
            informativas — em qualquer dúvida clínica, procure um profissional.
          </p>
          <p className="text-xs">
            No plano grátis, você pode fazer 10 perguntas por mês. Com o Yaya+,
            são ilimitadas.
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
