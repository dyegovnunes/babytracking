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
import EmptyState from '../../../components/ui/EmptyState'

/**
 * Painel MGM repaginado (v2):
 * - Foco no link (usuário não precisa digitar código; código fica expansível)
 * - 3 cards de recompensas acumuladas (registros/dia extras, Yaya+ ganho, amigos ativados)
 * - Explicação clara de como funciona antes da lista de indicações
 * - Share message corrigido com gender ("da Sofia" vs "do Guto")
 */
export default function ReferralPanel() {
  const { code, rewards, referrals, loading } = useReferral()
  const { baby } = useAppState()
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  if (loading || !code || !rewards) {
    return (
      <div className="px-5 py-4">
        <div className="h-32 rounded-md bg-surface-container animate-pulse" />
      </div>
    )
  }

  const link = buildReferralLink(code)
  const progressPct = Math.min(100, (rewards.activatedCount / rewards.nextMilestone) * 100)
  const stillNeeded = Math.max(0, rewards.nextMilestone - rewards.activatedCount)

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
    const text = buildShareMessage(code!, baby ? { name: baby.name, gender: baby.gender } : undefined)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ text, url: link, title: 'Yaya' })
      } catch { /* user cancelou */ }
      return
    }
    if (navigator.share) {
      try {
        await navigator.share({ text, url: link, title: 'Yaya' })
      } catch { /* cancelado */ }
      return
    }
    await handleCopy()
  }

  return (
    <section className="px-5 mt-6">
      <h2 className="font-headline text-lg font-bold text-on-surface mb-1">
        Convide amigos, ganhe Yaya+
      </h2>
      <p className="font-label text-sm text-on-surface-variant mb-5">
        Seus amigos que começam a usar o Yaya viram recompensas pra você —
        sem você pagar nada a mais.
      </p>

      {/* Como funciona (antes do link) */}
      <div className="rounded-md bg-primary/5 border border-primary/15 p-4 mb-5">
        <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
          Como funciona
        </p>
        <ol className="space-y-2.5 text-sm font-body text-on-surface">
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0 w-5">1.</span>
            <span>Você compartilha seu link com um amigo que tem bebê.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0 w-5">2.</span>
            <span>
              Ele baixa o app e começa a usar (cadastra o bebê + faz 5 registros).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0 w-5">3.</span>
            <span>
              Vocês ganham:{' '}
              <strong className="text-primary">você recebe registros extras por dia</strong>
              {' '}e, se ele assinar Yaya+, você ganha 1 mês de Yaya+ grátis.
            </span>
          </li>
        </ol>
      </div>

      {/* CTA principal: link */}
      <button
        onClick={handleShare}
        className="w-full py-4 rounded-md bg-primary text-on-primary font-headline font-bold text-base mb-2 active:opacity-90 shadow-[0_4px_16px_rgba(91,61,181,0.25)] flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">share</span>
        Compartilhar meu link
      </button>
      <button
        onClick={handleCopy}
        className="w-full py-2.5 rounded-md bg-surface-container text-on-surface font-label text-sm font-semibold active:bg-surface-container-high mb-5 flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-base">
          {copied ? 'check' : 'content_copy'}
        </span>
        {copied ? 'Link copiado!' : 'Copiar link'}
      </button>

      {/* Código expansível — fallback (raro) */}
      <button
        onClick={() => setShowCode((s) => !s)}
        className="w-full text-left mb-5 font-label text-xs text-on-surface-variant/70 flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-base">
          {showCode ? 'expand_less' : 'expand_more'}
        </span>
        Ver meu código manual
      </button>
      {showCode && (
        <div className="rounded-md bg-surface-container p-3 mb-5 -mt-2">
          <p className="font-label text-[10px] text-on-surface-variant mb-1">
            Se o amigo não conseguir clicar no link:
          </p>
          <p className="font-headline text-base font-bold text-primary tracking-wider text-center py-2">
            {code}
          </p>
          <p className="font-label text-[10px] text-on-surface-variant text-center">
            Ele pode digitar esse código ao criar a conta.
          </p>
        </div>
      )}

      {/* Recompensas acumuladas (3 cards) */}
      <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
        Seus ganhos
      </p>
      <div className="grid grid-cols-3 gap-2 mb-5">
        <RewardCard
          icon="bolt"
          value={rewards.dailyBonusRecords}
          label={rewards.dailyBonusRecords === 1 ? 'registro extra/dia' : 'registros extras/dia'}
          tone="amber"
        />
        <RewardCard
          icon="auto_awesome"
          value={rewards.cumulativeYayaDays}
          label={rewards.cumulativeYayaDays === 1 ? 'dia de Yaya+' : 'dias de Yaya+'}
          tone="primary"
        />
        <RewardCard
          icon="group"
          value={rewards.activatedCount}
          label={rewards.activatedCount === 1 ? 'amigo ativou' : 'amigos ativaram'}
          tone="emerald"
        />
      </div>

      {/* Progresso pro próximo milestone */}
      {rewards.activatedCount > 0 && (
        <div className="rounded-md bg-surface-container p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label text-xs font-semibold text-on-surface">
              Próximo prêmio: 7 dias Yaya+
            </span>
            <span className="font-headline text-sm font-bold text-primary">
              {rewards.activatedCount}/{rewards.nextMilestone}
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
              Faltam {stillNeeded} {stillNeeded === 1 ? 'amigo ativado' : 'amigos ativados'}.
            </p>
          )}
        </div>
      )}

      {/* Lista de indicações (com empty state quando ainda não indicou) */}
      {referrals.length === 0 ? (
        <EmptyState
          emoji="💌"
          title="Nenhuma indicação ainda"
          description="Compartilhe seu link com uma amiga que também está nesse universo de bebê. Vocês ganham juntas."
          size="compact"
        />
      ) : (
        <div className="mb-4">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Suas indicações
          </p>
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
        </div>
      )}

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

interface RewardCardProps {
  icon: string
  value: number
  label: string
  tone: 'amber' | 'primary' | 'emerald'
}

function RewardCard({ icon, value, label, tone }: RewardCardProps) {
  const colors: Record<RewardCardProps['tone'], { bg: string; text: string }> = {
    amber: { bg: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400' },
    primary: { bg: 'bg-primary/10 border-primary/25', text: 'text-primary' },
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400' },
  }
  return (
    <div className={`rounded-md ${colors[tone].bg} border p-3 text-center`}>
      <span
        className={`material-symbols-outlined text-lg ${colors[tone].text} mb-1 block`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {icon}
      </span>
      <p className={`font-headline text-xl font-extrabold ${colors[tone].text} leading-none`}>
        {value}
      </p>
      <p className="font-label text-[10px] text-on-surface-variant leading-tight mt-1">
        {label}
      </p>
    </div>
  )
}
