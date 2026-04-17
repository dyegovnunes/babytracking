import { useState } from 'react'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useAppState } from '../../../contexts/AppContext'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import {
  useReferral,
  buildReferralLink,
  buildShareMessage,
} from '../useReferral'

/**
 * Painel MGM: código, link, progresso e lista de indicações. Embutível em
 * várias telas (hoje usado na /yaya-plus; futuramente pode aparecer no Perfil).
 *
 * Pro premium v1 não há prêmio ativo (apenas free ganha créditos/cortesia).
 * O painel ainda mostra pro premium, mas as chamadas ficam neutras.
 */
export default function ReferralPanel() {
  const { status, referrals, loading } = useReferral()
  const { baby } = useAppState()
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (loading || !status) {
    return (
      <div className="px-5 py-4">
        <div className="h-32 rounded-md bg-surface-container animate-pulse" />
      </div>
    )
  }

  const link = buildReferralLink(status.code)
  const progressPct = Math.min(100, (status.activatedCount / status.nextMilestone) * 100)
  const stillNeeded = Math.max(0, status.nextMilestone - status.activatedCount)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      hapticSuccess()
      setCopied(true)
      setToast('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('Não foi possível copiar')
      setTimeout(() => setToast(null), 2000)
    }
  }

  async function handleShare() {
    hapticLight()
    const text = buildShareMessage(status!.code, baby?.name)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ text, url: link, title: 'Yaya' })
      } catch {
        // User cancelou — ok
      }
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({ text, url: link, title: 'Yaya' })
      } catch {
        // cancelado
      }
      return
    }
    // Fallback: copiar
    await handleCopy()
  }

  return (
    <section className="px-5 mt-6">
      {/* Header */}
      <h2 className="font-headline text-lg font-bold text-on-surface mb-1">
        Convide amigos, ganhe Yaya+
      </h2>
      <p className="font-label text-sm text-on-surface-variant mb-4">
        Cada amigo que começar a usar te dá recompensas.
      </p>

      {/* Código + ações */}
      <div className="rounded-md bg-surface-container p-4 mb-4">
        <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
          Seu código
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 px-3 py-2.5 rounded-md bg-surface-container-high border border-primary/15 font-headline text-lg font-bold text-primary tracking-wider text-center">
            {status.code}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-2.5 rounded-md bg-surface-container-high text-on-surface font-label text-xs font-semibold active:bg-surface-variant flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm active:opacity-90 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">share</span>
          Compartilhar link
        </button>
      </div>

      {/* Progresso */}
      <div className="rounded-md bg-surface-container p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-label text-xs font-semibold text-on-surface">
            Próximo prêmio: 7 dias Yaya+
          </span>
          <span className="font-headline text-sm font-bold text-primary">
            {status.activatedCount}/{status.nextMilestone}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {stillNeeded > 0 && (
          <p className="font-label text-[11px] text-on-surface-variant mt-2">
            Faltam {stillNeeded} {stillNeeded === 1 ? 'amigo ativado' : 'amigos ativados'} pro próximo prêmio.
          </p>
        )}
      </div>

      {/* Saldo */}
      {status.credits > 0 && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 mb-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-400 text-xl">bolt</span>
          <p className="font-label text-sm text-amber-400 font-semibold">
            Você tem <strong>{status.credits}</strong> cadastros extras disponíveis
          </p>
        </div>
      )}

      {/* Como funciona */}
      <div className="rounded-md bg-surface-container p-4 mb-4">
        <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Como funciona
        </p>
        <ul className="space-y-2 text-sm font-body text-on-surface">
          <li className="flex gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Amigo se cadastra pelo seu link e cadastra o bebê.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>
              Quando fizer 5 registros, você ganha <strong>30 cadastros extras</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>
              A cada <strong>10 amigos ativados</strong>, você ganha <strong>7 dias de Yaya+</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>
              Se o amigo assinar plano anual ou vitalício, você ganha{' '}
              <strong>30 dias de Yaya+</strong>.
            </span>
          </li>
        </ul>
      </div>

      {/* Lista de indicações */}
      <div className="mb-4">
        <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Suas indicações ({referrals.length})
        </p>
        {referrals.length === 0 ? (
          <p className="font-label text-sm text-on-surface-variant py-4 text-center">
            Nenhuma indicação ainda. Compartilhe seu link pra começar!
          </p>
        ) : (
          <ul className="space-y-1.5">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface-container"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    r.status === 'pending'
                      ? 'bg-on-surface-variant/40'
                      : r.status === 'activated'
                        ? 'bg-emerald-500'
                        : 'bg-primary'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-label text-sm font-medium text-on-surface">
                    {r.status === 'pending'
                      ? 'Aguardando ativação'
                      : r.status === 'activated'
                        ? 'Ativou o app 🎉'
                        : `Assinou Yaya+ (${r.subscriptionPlan ?? 'pago'})`}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-24 flex justify-center z-50 pointer-events-none">
          <div className="bg-primary text-on-primary px-4 py-2 rounded-md font-label text-sm font-semibold shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </section>
  )
}
