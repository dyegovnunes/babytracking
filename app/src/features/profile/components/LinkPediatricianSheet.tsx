import { useState, useRef, useEffect } from 'react'
import { Share } from '@capacitor/share'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { usePediatricianLink, type LinkResult } from '../usePediatricianLink'
import type { LinkedPediatrician } from '../../../types'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  onClose: () => void
  babyId: string
  babyName: string
  onLinked: (ped: LinkedPediatrician) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Código não encontrado. Verifique com a pediatra.',
  not_approved: 'Essa profissional ainda não está ativa no portal.',
  already_linked: 'Essa pediatra já está vinculada ao bebê.',
  not_authorized: 'Apenas pais e responsáveis podem vincular uma pediatra.',
  error: 'Erro ao vincular. Tente novamente.',
}

export default function LinkPediatricianSheet({
  isOpen,
  onClose,
  babyId,
  babyName,
  onLinked,
}: Props) {
  useSheetBackClose(isOpen, onClose)

  const { link } = usePediatricianLink(babyId)
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<LinkedPediatrician | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focar o campo ao abrir e ler código pendente de deep link
  useEffect(() => {
    if (!isOpen) {
      setCode('')
      setConsent(false)
      setError(null)
      setSuccess(null)
      return
    }
    const pending = localStorage.getItem('yaya_pending_ped_code')
    if (pending) {
      setCode(pending)
      localStorage.removeItem('yaya_pending_ped_code')
    }
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  const handleLink = async () => {
    if (!code.trim() || !consent) return
    setLinking(true)
    setError(null)
    hapticLight()
    const result: LinkResult = await link(code)
    setLinking(false)
    if (result === 'ok') {
      hapticSuccess()
      // A lista atualizada já foi recarregada pelo hook; buscamos a recém-vinculada
      // via reload. Para exibir o sucesso inline usamos um estado temporário.
      setSuccess({
        linkId: '',
        pediatricianId: '',
        name: '...',
        crm: '',
        crmState: '',
        linkedAt: new Date().toISOString(),
      })
      // onLinked é chamado ao fechar — permite que PediatricianSection recarregue
    } else {
      setError(ERROR_MESSAGES[result] ?? ERROR_MESSAGES.error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative bg-surface rounded-t-2xl pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-on-surface/20" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">stethoscope</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                Vincular pediatra
              </h2>
              <p className="font-label text-xs text-on-surface-variant">
                Conecte o app com o sistema da pediatra
              </p>
            </div>
          </div>

          {/* Portal explanation */}
          <div className="rounded-md bg-primary/8 border border-primary/15 px-3.5 py-3 mb-4">
            <p className="font-label text-xs text-on-surface-variant leading-relaxed">
              Para usar este recurso, a pediatra precisa ter conta gratuita no{' '}
              <strong className="text-primary">Portal Yaya</strong> (pediatra.yayababy.app).
              Se ela ainda não tem, compartilhe o link:
            </p>
            <button
              type="button"
              onClick={async () => {
                hapticLight()
                try {
                  await Share.share({
                    title: 'Portal Yaya Pediatra',
                    text: 'Acesse o Portal Yaya gratuito para pediatras e acompanhe seus pacientes pelo app Yaya.',
                    url: 'https://pediatra.yayababy.app',
                  })
                } catch { /* dismissed */ }
              }}
              className="mt-2 flex items-center gap-1.5 font-label text-xs font-[600] text-primary active:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-[14px]">share</span>
              Compartilhar link do portal
            </button>
          </div>

          {success ? (
            /* Estado de sucesso */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
              </div>
              <p className="font-headline text-sm font-bold text-on-surface mb-1">
                Vínculo confirmado!
              </p>
              <p className="font-label text-xs text-on-surface-variant mb-5">
                A pediatra já pode acompanhar {babyName} pelo portal.
              </p>
              <button
                onClick={() => { onLinked(success); onClose() }}
                className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm active:opacity-90"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Campo de código */}
              <div className="mb-4">
                <label className="block font-label text-xs text-on-surface-variant mb-1.5">
                  Código de convite
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="Ex: ABCD1234"
                  maxLength={12}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-mono text-base text-center tracking-widest focus:outline-none focus:border-primary"
                />
                {error && (
                  <p className="font-label text-xs text-error mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                  </p>
                )}
              </div>

              {/* Consentimento LGPD */}
              <button
                type="button"
                onClick={() => setConsent((v) => !v)}
                className="flex items-start gap-3 w-full text-left mb-5"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  consent ? 'bg-primary border-primary' : 'border-outline-variant'
                }`}>
                  {consent && (
                    <span className="material-symbols-outlined text-on-primary text-xs">check</span>
                  )}
                </div>
                <p className="font-label text-xs text-on-surface-variant leading-relaxed">
                  Entendo que ao vincular, a pediatra poderá visualizar os registros de{' '}
                  <strong className="text-on-surface">{babyName}</strong> no portal dela:
                  alimentação, sono, fraldas, vacinas, marcos e medicamentos.
                </p>
              </button>

              {/* Botão vincular */}
              <button
                onClick={handleLink}
                disabled={!code.trim() || !consent || linking}
                className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm active:opacity-90 disabled:opacity-40"
              >
                {linking ? 'Vinculando...' : 'Vincular pediatra'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
