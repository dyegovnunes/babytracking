// Sheet de convite familiar — duas telas:
// 1. Intro: explica o grupo e seus benefícios → CTA "Criar convite"
// 2. Convite: código + compartilhar (WhatsApp no web, Share nativo no app) + copiar
//
// - Pula direto para a tela 2 se o usuário já enviou um convite antes
// - Auto-gera código ao entrar na tela 2 se não houver código ativo
// - Marca yaya_evt_family_invite_sent + timestamp de compartilhamento

import { useEffect, useState } from 'react'
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

type View = 'intro' | 'invite'

const BENEFITS = [
  {
    emoji: '📱',
    text: 'Pai, mãe, avó ou babá — qualquer um pode registrar e ver as atividades',
  },
  {
    emoji: '🔄',
    text: 'Todos veem os registros em tempo real, sem precisar contar nada',
  },
  {
    emoji: '⚙️',
    text: 'Você gerencia o grupo no perfil do bebê e pode remover alguém a qualquer hora',
  },
  {
    emoji: '🕐',
    text: 'A babá tem acesso limitado — você define o horário de expediente e o que ela pode ver. Ao final, ela pode fazer um resumo no app dela',
  },
]

export default function FamilyInviteSheet({ isOpen, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  const { baby } = useAppState()
  const { code, generating, generate } = useInviteCodes()
  const [view, setView] = useState<View>('intro')

  // Ao abrir: pula intro se já enviou convite antes
  useEffect(() => {
    if (!isOpen) return
    const alreadySent = baby?.id
      ? !!localStorage.getItem(`yaya_evt_family_invite_sent_${baby.id}`)
      : false
    setView(alreadySent ? 'invite' : 'intro')
  }, [isOpen, baby?.id])

  // Auto-gera código ao entrar na tela de convite
  useEffect(() => {
    if (view === 'invite' && !code && !generating) {
      generate()
    }
  }, [view, code, generating, generate])

  if (!isOpen) return null

  const de = contractionDe(baby?.gender ?? null)
  const babyName = baby?.name ?? 'bebê'
  const shareText = code
    ? `Oi! Te convidei para acompanhar ${de} ${babyName} no app Yaya 🍼\n\nPara entrar no grupo:\n1. Baixe o app: www.yayababy.app\n2. Crie sua conta\n3. Na tela de cadastro, escolha *"Entrar no grupo de um bebê"*\n4. Insira o código: *${code}*`
    : ''

  function markShared() {
    if (!baby) return
    trackOnce('family_invite_sent', 'family_invite_sent', {
      baby_age_days: Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000),
    }, baby.id)
    localStorage.setItem(`yaya_invite_shared_at_${baby.id}`, String(Date.now()))
    window.dispatchEvent(new Event('focus'))
  }

  async function handleShare() {
    if (!code) return
    hapticLight()
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ text: shareText, title: 'Yaya — convite de grupo' })
      } else if (navigator.share) {
        await navigator.share({ text: shareText })
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
      }
      hapticSuccess()
      markShared()
    } catch {
      /* usuário cancelou */
    }
  }

  function handleWhatsApp() {
    if (!code) return
    hapticLight()
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
    hapticSuccess()
    markShared()
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

        {view === 'intro' ? (
          <>
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
                  Quem cuida junto?
                </h2>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">
                  {`Convide quem faz parte da rotina ${de} ${babyName}`}
                </p>
              </div>
            </div>

            {/* Lista de benefícios */}
            <div className="space-y-3.5 mb-6">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base mt-0.5 shrink-0">{b.emoji}</span>
                  <p className="font-body text-sm text-on-surface-variant leading-snug">{b.text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={() => { hapticLight(); setView('invite') }}
              className="w-full py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined text-lg">group_add</span>
              Criar convite
            </button>
          </>
        ) : (
          <>
            {/* Header com botão voltar */}
            <div className="flex items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => setView('intro')}
                className="text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
                aria-label="Voltar"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                  Convide alguém pro grupo
                </h2>
                <p className="font-label text-xs text-on-surface-variant mt-0.5">
                  {`Compartilhe com quem vai acompanhar ${de} ${babyName}`}
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
            <div className="flex gap-2 mb-3">
              {Capacitor.isNativePlatform() ? (
                /* Nativo: share sheet geral (WhatsApp, iMessage, Telegram...) */
                <button
                  type="button"
                  disabled={!code || generating}
                  onClick={handleShare}
                  className="flex-1 py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Compartilhar
                </button>
              ) : (
                /* Web: botão direto pro WhatsApp */
                <button
                  type="button"
                  disabled={!code || generating}
                  onClick={handleWhatsApp}
                  className="flex-1 py-3 rounded-md text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-40"
                  style={{ background: '#25D366' }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Compartilhar no WhatsApp
                </button>
              )}
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

            {/* Rodapé */}
            <p className="font-label text-[11px] text-on-surface-variant/55 text-center leading-relaxed">
              A pessoa precisa baixar o Yaya. No cadastro, ela escolhe{' '}
              <span className="text-on-surface-variant/80">"Entrar no grupo de um bebê"</span>{' '}
              e insere este código.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
