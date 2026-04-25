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
            Sou a assistente do Yaya. Respondo com base nos registros reais do seu bebê:
            sono, alimentação, fraldas, vacinas, marcos e saltos.
          </p>

          <div className="bg-surface-container rounded-md p-3 space-y-2 text-xs">
            <p className="font-semibold text-on-surface">O que é enviado ao processar suas perguntas:</p>
            <ul className="space-y-1 text-on-surface-variant">
              <li>• Nome, data de nascimento e sexo do bebê</li>
              <li>• Registros recentes de sono, alimentação, fraldas, vacinas e marcos</li>
              <li>• Texto das suas mensagens nesta conversa</li>
            </ul>
            <p className="font-semibold text-on-surface mt-2">Para quem os dados são enviados:</p>
            <p className="text-on-surface-variant">
              Suas perguntas e o contexto do bebê são processados por um serviço de
              inteligência artificial de terceiro (provedor de IA em nuvem). Esses dados
              são usados exclusivamente para gerar a resposta e não são usados para
              treinar modelos ou compartilhados com outras partes.
            </p>
          </div>

          <p>
            <strong className="text-on-surface">Não substituo o pediatra.</strong>{' '}
            Minhas respostas são informativas, baseadas em diretrizes gerais de saúde
            infantil (OMS, SBP), e não servem como diagnóstico ou prescrição médica.
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
