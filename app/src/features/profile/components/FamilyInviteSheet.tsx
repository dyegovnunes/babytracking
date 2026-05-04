// Sheet de convite familiar — gera e entrega o código de convite pronto para
// compartilhar. Pode ser aberta da trilha de descoberta ou do nudge contextual,
// sem o usuário precisar ir ao perfil.
//
// - Auto-gera código ao abrir se não houver código ativo
// - Compartilhamento nativo via Share.share (@capacitor/share)
// - Cópia via navigator.clipboard como fallback
// - Marca yaya_evt_family_invite_sent + timestamp de compartilhamento

import { useEffect } from 'react'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useAppState } from '../../../contexts/AppContext'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { useInviteCodes } from '../useInviteCodes'
import { trackOnce } from '../../../lib/analytics'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { contractionDe } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FamilyInviteSheet({ isOpen, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  const { baby } = useAppState()
  const { code, generating, generate } = useInviteCodes()

  // Auto-gera código ao abrir se não houver nenhum ativo
  useEffect(() => {
    if (!isOpen) return
    if (!code && !generating) {
      generate()
    }
  }, [isOpen, code, generating, generate])

  if (!isOpen) return null

  const de = contractionDe(baby?.gender ?? null)
  const babyName = baby?.name ?? 'bebê'
  const shareText = code
    ? `Oi! Usa o código *${code}* para acompanhar ${de} ${babyName} no app Yaya. Baixe em yayababy.app 🍼`
    : ''

  function markShared() {
    if (!baby) return
    trackOnce('family_invite_sent', 'family_invite_sent', {
      baby_age_days: Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000),
    }, baby.id)
    localStorage.setItem(`yaya_invite_shared_at_${baby.id}`, String(Date.now()))
    // Sinaliza para o DiscoveryTrail re-checar (focus event)
    window.dispatchEvent(new Event('focus'))
  }

  async function handleShare() {
    if (!code) return
    hapticLight()
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ text: shareText, title: 'Yaya — convite de grupo' })
      } else if (navigator.share) {
        await navigator.share({ text: shareText, title: 'Yaya — convite de grupo' })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
      hapticSuccess()
      markShared()
    } catch {
      /* usuário cancelou o share */
    }
  }

  async function handleCopy() {
    if (!code) return
    hapticLight()
    try {
      await navigator.clipboard.writeText(code)
    } catch { /* silent */ }
    hapticSuccess()
    markShared()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--md-sys-color-surface-container-high, #1e1631)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="text-2xl">👨‍👩‍👦</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              Convide alguém pro grupo
            </h2>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              {`Pai, mãe, avó — todos veem a rotina ${de} ${babyName} em tempo real`}
            </p>
          </div>
        </div>

        {/* Código */}
        <div
          className="rounded-md p-4 mb-4 text-center"
          style={{
            background: 'rgba(183,159,255,0.07)',
            border: '1px solid rgba(183,159,255,0.18)',
          }}
        >
          {generating || !code ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="font-label text-sm text-on-surface-variant">Gerando código...</span>
            </div>
          ) : (
            <>
              <p className="font-label text-[11px] uppercase tracking-wider text-on-surface-variant/60 mb-1">
                Código de convite
              </p>
              <p className="font-headline text-3xl font-bold text-primary tracking-[0.18em]">
                {code}
              </p>
              <p className="font-label text-[11px] text-on-surface-variant/50 mt-1">
                Válido por 30 dias
              </p>
            </>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            disabled={!code || generating}
            onClick={handleShare}
            className="flex-1 py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            Compartilhar
          </button>
          <button
            type="button"
            disabled={!code || generating}
            onClick={handleCopy}
            className="py-3 px-4 rounded-md font-label text-sm font-semibold flex items-center justify-center gap-1.5 active:opacity-80 transition-opacity disabled:opacity-40"
            style={{
              background: 'rgba(183,159,255,0.1)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            Copiar
          </button>
        </div>

        {/* Rodapé explicativo */}
        <p className="font-label text-[11px] text-on-surface-variant/55 text-center leading-relaxed">
          A pessoa precisa baixar o Yaya. No cadastro, ela escolhe
          {' '}<span className="text-on-surface-variant/80">"Entrar no grupo de um bebê"</span>{' '}
          e insere este código.
        </p>
      </div>
    </div>
  )
}
