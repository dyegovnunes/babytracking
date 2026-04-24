import { useState } from 'react'
import { motion } from 'framer-motion'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'

interface SessionEndCardProps {
  /** id da última mensagem assistant — usado pra gravar rating ligado à conversa. */
  lastAssistantMessageId: string | null
  onRate: (messageId: string, rating: 1 | -1, reasonTag?: string) => Promise<void> | void
  onNewSession: () => void
  onDismiss: () => void
}

/**
 * Card inline que aparece entre última bubble e input pra pedir feedback
 * de sessão inteira e oferecer "Nova conversa". Dois gatilhos:
 *   1) Usuário tocou no botão "encerrar" no header.
 *   2) Auto após 10min de pausa sem input novo (YaIAPage decide quando).
 *
 * Rating é gravado em yaia_feedback com reason_tag='session_end' pra separar
 * de feedbacks por-bubble. Clicar "Nova conversa" encerra sem rating
 * (não intrusivo).
 */
export default function SessionEndCard({
  lastAssistantMessageId,
  onRate,
  onNewSession,
  onDismiss,
}: SessionEndCardProps) {
  const [rated, setRated] = useState<1 | -1 | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleRate(rating: 1 | -1) {
    if (busy || rated) return
    hapticLight()
    setBusy(true)
    setRated(rating)
    if (lastAssistantMessageId && !lastAssistantMessageId.startsWith('tmp_')) {
      try {
        await onRate(lastAssistantMessageId, rating, 'session_end')
      } catch {
        /* silencioso — feedback é best-effort */
      }
    }
    if (rating === 1) hapticSuccess()
    setBusy(false)
    // Fecha sozinho 1s após registrar.
    window.setTimeout(onDismiss, 900)
  }

  function handleNewSession() {
    hapticLight()
    onNewSession()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative rounded-md bg-gradient-to-br from-surface-container to-surface-container-high ring-1 ring-primary/20 shadow-sm px-4 py-3.5 flex flex-col gap-3"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>

      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-primary text-[20px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          auto_awesome
        </span>
        <h3 className="font-display text-sm text-on-surface">
          Foi útil nossa conversa?
        </h3>
      </div>

      {rated === null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRate(1)}
            disabled={busy}
            className="flex-1 h-10 rounded-md bg-primary/10 text-primary ring-1 ring-primary/20 flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
            Sim
          </button>
          <button
            type="button"
            onClick={() => handleRate(-1)}
            disabled={busy}
            className="flex-1 h-10 rounded-md bg-surface-container-high text-on-surface-variant ring-1 ring-outline-variant/30 flex items-center justify-center gap-1.5 hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">thumb_down</span>
            Nem tanto
          </button>
        </div>
      )}

      {rated !== null && (
        <p className="text-sm text-on-surface-variant">
          {rated === 1
            ? 'Fico feliz em ajudar. Obrigada pelo retorno!'
            : 'Obrigada pelo retorno. Vou melhorar pra próxima.'}
        </p>
      )}

      <button
        type="button"
        onClick={handleNewSession}
        className="self-start text-[12px] text-primary/90 hover:text-primary transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[14px]">restart_alt</span>
        Começar nova conversa
      </button>
    </motion.div>
  )
}
