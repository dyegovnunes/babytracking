import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import { markConsent } from '../yaiaChatService'

interface YaIAIntroModalProps {
  isOpen: boolean
  onAccept: () => void
  onClose: () => void
}

export default function YaIAIntroModal({ isOpen, onAccept, onClose }: YaIAIntroModalProps) {
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  async function handleAccept() {
    setError(null)
    setAccepting(true)
    try {
      await markConsent()
      hapticLight()
      onAccept()
    } catch {
      setError('Não consegui salvar. Tenta de novo.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-safe">
      <div className="w-full max-w-md bg-surface rounded-t-2xl sm:rounded-md p-5 pt-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          <h2 className="font-display text-lg text-on-surface">Oi, sou a yaIA</h2>
        </div>

        <div className="text-sm text-on-surface-variant space-y-3">
          <p>
            Sou a assistente do Yaya. Pergunto, escuto e respondo com base nos dados reais
            do seu bebê — sono, alimentação, saltos, vacinas, marcos.
          </p>
          <p>
            <strong>Não substituo o pediatra.</strong> Minhas respostas são informativas e
            não servem como diagnóstico ou prescrição. Em qualquer dúvida clínica, consulte
            um profissional.
          </p>
          <p>
            Ao continuar, você concorda em compartilhar os dados do seu bebê comigo pra eu
            poder te ajudar.
          </p>
        </div>

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full h-11 rounded-md bg-primary text-on-primary font-medium disabled:opacity-60"
          >
            {accepting ? 'Salvando…' : 'Entendi, continuar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="w-full h-11 rounded-md text-on-surface-variant"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
