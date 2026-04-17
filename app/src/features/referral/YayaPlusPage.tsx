import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { hapticLight } from '../../lib/haptics'
import { contractionDe } from '../../lib/genderUtils'
import ReferralPanel from './components/ReferralPanel'

/**
 * Tela "Yaya+": visível só pra free (aba da bottom nav). Premium que chega
 * aqui é redirecionado pra home. Hero vertical + tabela comparativa +
 * ReferralPanel (MGM).
 */
export default function YayaPlusPage() {
  const navigate = useNavigate()
  const isPremium = useBabyPremium()
  const { baby } = useAppState()
  const [showPaywall, setShowPaywall] = useState(false)

  if (isPremium) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubscribe = () => {
    hapticLight()
    setShowPaywall(true)
  }

  const babyContextText = baby
    ? `rotina ${contractionDe(baby.gender ?? 'boy')} ${baby.name}`
    : 'rotina do seu bebê'

  return (
    <div className="pb-4 page-enter">
      {/* Hero */}
      <section className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="material-symbols-outlined text-primary text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            Yaya+
          </h1>
        </div>
        <p className="font-headline text-lg font-bold text-on-surface leading-snug mb-1">
          Organize a {babyContextText} sem limites.
        </p>
        <p className="font-label text-sm text-on-surface-variant leading-relaxed">
          Registros ilimitados, histórico completo, insights inteligentes e
          zero anúncios.
        </p>
      </section>

      {/* CTA principal */}
      <section className="px-5 mt-2">
        <button
          onClick={handleSubscribe}
          className="w-full py-4 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline text-base font-bold active:opacity-90 shadow-[0_8px_28px_rgba(91,61,181,0.35)]"
        >
          Assinar Yaya+
        </button>
        <p className="text-center font-label text-[11px] text-on-surface-variant mt-2">
          Mensal, anual ou vitalício. Cancele quando quiser.
        </p>
      </section>

      {/* Tabela comparativa */}
      <section className="px-5 mt-8">
        <h2 className="font-headline text-base font-bold text-on-surface mb-3">
          Grátis × Yaya+
        </h2>
        <div className="rounded-md bg-surface-container overflow-hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1.3fr_1fr_1fr] border-b border-outline-variant/20">
            <div />
            <div className="py-3 text-center font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-l border-outline-variant/20">
              Grátis
            </div>
            <div className="py-3 text-center font-label text-[11px] font-bold uppercase tracking-wider text-primary border-l border-outline-variant/20 bg-primary/5">
              Yaya+
            </div>
          </div>
          <ComparisonRow feature="Registros/dia" free="5" premium="Ilimitados" />
          <ComparisonRow feature="Bebês" free="1" premium="2" />
          <ComparisonRow feature="Histórico" free="Hoje + ontem" premium="Completo" />
          <ComparisonRow
            feature="Compartilhar com babá e família"
            free={<Cross />}
            premium={<Check />}
          />
          <ComparisonRow
            feature="Caderneta de vacinas"
            free="Limitado"
            premium="Ilimitado"
          />
          <ComparisonRow
            feature="Marcos do bebê"
            free="Limitado"
            premium="Ilimitado"
          />
          <ComparisonRow
            feature="Medicamentos"
            free="Limitado"
            premium="Ilimitado"
          />
          <ComparisonRow
            feature="Saltos de desenvolvimento"
            free="Limitado"
            premium="Ilimitado"
          />
          <ComparisonRow
            feature="Insights inteligentes"
            free="Básicos"
            premium="Completos"
          />
          <ComparisonRow
            feature="Resumo para o pediatra"
            free={<Cross />}
            premium={<Check />}
          />
          <ComparisonRow
            feature="Sem anúncios"
            free={<Cross />}
            premium={<Check />}
            last
          />
        </div>
      </section>

      {/* CTA secundário depois da tabela (evita ter que voltar pra cima) */}
      <section className="px-5 mt-5">
        <button
          onClick={handleSubscribe}
          className="w-full py-3.5 rounded-md bg-primary text-on-primary font-label font-bold text-sm active:opacity-90"
        >
          Assinar Yaya+
        </button>
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

function ComparisonRow({
  feature,
  free,
  premium,
  last = false,
}: {
  feature: string
  free: React.ReactNode
  premium: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[1.3fr_1fr_1fr] items-center ${last ? '' : 'border-b border-outline-variant/15'}`}
    >
      <div className="px-3 py-2.5 font-label text-[13px] text-on-surface">
        {feature}
      </div>
      <div className="px-3 py-2.5 text-center font-label text-[12px] text-on-surface-variant border-l border-outline-variant/15">
        {free}
      </div>
      <div className="px-3 py-2.5 text-center font-label text-[12px] text-primary border-l border-outline-variant/15 bg-primary/5 font-semibold">
        {premium}
      </div>
    </div>
  )
}

function Check() {
  return (
    <span
      className="material-symbols-outlined text-emerald-500 text-base"
      style={{ fontVariationSettings: "'FILL' 1" }}
      aria-label="Incluído"
    >
      check_circle
    </span>
  )
}

function Cross() {
  return (
    <span
      className="material-symbols-outlined text-error text-base"
      style={{ fontVariationSettings: "'FILL' 1" }}
      aria-label="Não incluído"
    >
      cancel
    </span>
  )
}
