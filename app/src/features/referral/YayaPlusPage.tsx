import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { hapticLight } from '../../lib/haptics'
import ReferralPanel from './components/ReferralPanel'

/**
 * Tela "Yaya+": acessível via aba da bottom nav (só pra free). Mostra:
 * 1. Comparativo de planos (free × Yaya+) + CTA assinar
 * 2. Painel MGM (código, progresso, indicações)
 *
 * Premium que acessar essa rota direto é redirecionado pra home (a aba
 * dele é Histórico, não Yaya+).
 */
export default function YayaPlusPage() {
  const navigate = useNavigate()
  const isPremium = useBabyPremium()
  const [showPaywall, setShowPaywall] = useState(false)

  if (isPremium) {
    // Premium não deveria chegar aqui pela nav; se digitou URL, redireciona.
    navigate('/', { replace: true })
    return null
  }

  const handleSubscribe = () => {
    hapticLight()
    setShowPaywall(true)
  }

  return (
    <div className="pb-4 page-enter">
      {/* Header */}
      <section className="px-5 pt-6 pb-2">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Yaya+
        </h1>
        <p className="font-label text-sm text-on-surface-variant">
          Tudo do Yaya, sem limites.
        </p>
      </section>

      {/* Benefícios / comparativo */}
      <section className="px-5 mt-4">
        <div className="rounded-md bg-gradient-to-br from-primary/15 to-tertiary/10 border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-2xl">
              auto_awesome
            </span>
            <h2 className="font-headline text-base font-bold text-on-surface">
              Yaya+ liberado
            </h2>
          </div>
          <ul className="space-y-2.5 mb-4">
            <BenefitRow text="Registros ilimitados por dia" />
            <BenefitRow text="Histórico completo (sem limite de 2 dias)" />
            <BenefitRow text="Até 2 bebês no mesmo plano" />
            <BenefitRow text="Compartilhamento com babá e familiares" />
            <BenefitRow text="Caderneta de vacinas, marcos e medicamentos sem travas" />
            <BenefitRow text="Insights + projeções em tempo real" />
            <BenefitRow text="Sem anúncios" />
          </ul>

          <button
            onClick={handleSubscribe}
            className="w-full py-4 rounded-md bg-primary text-on-primary font-headline text-base font-bold active:opacity-90 shadow-[0_8px_24px_rgba(91,61,181,0.3)]"
          >
            Assinar Yaya+
          </button>
          <p className="text-center font-label text-[11px] text-on-surface-variant mt-3">
            Mensal, anual ou vitalício. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* MGM */}
      <ReferralPanel />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="generic"
      />
    </div>
  )
}

function BenefitRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
      <span className="font-body text-sm text-on-surface leading-snug">{text}</span>
    </li>
  )
}
