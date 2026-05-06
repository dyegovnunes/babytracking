import { useState, useEffect, useRef } from 'react';
import { usePurchase } from '../../contexts/PurchaseContext';
import { getAvailablePackages, type PlanType } from '../../lib/purchases';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';
import { Capacitor } from '@capacitor/core';
import { track } from '../../lib/analytics';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'history' | 'insights' | 'multi_caregiver' | 'multi_profile' | 'daily_limit' | 'generic' | 'shared_report' | 'medications' | 'yaia';
  /** Só usado com trigger='yaia' — muda a copy pra "volta amanhã" (diário) ou "renova dia 1" (mensal). */
  resetWhen?: 'tomorrow' | 'next_month';
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string }> = {
  history: {
    title: 'Histórico completo',
    description: 'No plano grátis você vê apenas hoje e ontem. Com o Yaya+, o histórico é ilimitado.',
  },
  insights: {
    title: 'Insights completos',
    description: 'Tenha acesso a todos os insights, ao gráfico semanal e padrões de sono/alimentação.',
  },
  multi_caregiver: {
    title: 'Convide mais cuidadores',
    description: 'No plano grátis você pode convidar 1 pessoa. Com o Yaya+, convide pai, mãe, avós e babá, sem limite.',
  },
  multi_profile: {
    title: 'Mais de um bebê',
    description: 'No plano grátis você cadastra 1 bebê. Com o Yaya+ pode acompanhar até 2.',
  },
  daily_limit: {
    title: 'Registros ilimitados',
    description: 'Você atingiu o limite de 5 registros hoje. Com o Yaya+, registre sem limites.',
  },
  shared_report: {
    title: 'Super Relatório para o pediatra',
    description: 'Gere um link seguro com toda a rotina do seu bebê para compartilhar com o pediatra ou a babá.',
  },
  medications: {
    title: 'Medicamentos ilimitados',
    description: 'Cadastre vários medicamentos, receba lembretes de horário e veja o histórico completo.',
  },
  yaia: {
    title: 'yaIA sem limite',
    description: 'Você atingiu o limite grátis da yaIA. Com o Yaya+, pergunte à vontade.',
  },
  yaia_daily: {
    title: 'yaIA sem limite',
    description: 'Você usou suas 2 perguntas de hoje. Volta amanhã, ou libera ilimitado agora com o Yaya+.',
  },
  yaia_monthly: {
    title: 'yaIA sem limite',
    description: 'Você atingiu o teto mensal de 15 perguntas. Renova no dia 1º, ou libera ilimitado com o Yaya+.',
  },
  generic: {
    title: 'Yaya+',
    description: 'Desbloqueie o melhor do Yaya.',
  },
};

const BENEFITS = [
  'Sem anúncios',
  'Registros ilimitados por dia',
  'Histórico completo',
  'Insights e gráficos semanais',
  'Marcar vacinas livremente',
  'Até 2 bebês',
  'Cuidadores ilimitados',
  'Lembretes de medicamento',
];

interface PlanOption {
  type: PlanType;
  label: string;
  /** Preço exibido no card — para vitalício é o equiv. mensal */
  price: string;
  /** Preço real usado no CTA — para vitalício é o valor total cobrado */
  ctaPrice?: string;
  detail: string;
  badge?: string;
}

// Fallback usado quando o RevenueCat não responde (web, offline, erro).
// Estes valores precisam bater com os produtos criados no App Store Connect
// e no Google Play Console — se mudar aqui, mude lá também (e vice-versa).
const FALLBACK_PLANS: PlanOption[] = [
  { type: 'annual',   label: 'Anual',     price: 'R$20,83/mês', detail: 'R$249,90 cobrado anualmente',  badge: 'Mais escolhido' },
  { type: 'monthly',  label: 'Mensal',    price: 'R$34,90/mês', detail: 'Cobrado mensalmente' },
  { type: 'lifetime', label: 'Vitalício', price: 'R$37,49/mês', ctaPrice: 'R$449,90', detail: 'Cobrado uma vez: R$449,90', badge: 'Melhor custo' },
];

export function PaywallModal({ isOpen, onClose, trigger = 'generic', resetWhen }: PaywallModalProps) {
  const { purchase, restore } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);
  // Flag: compra foi iniciada com sucesso (não disparar paywall_dismissed nesses casos)
  const purchasedRef = useRef(false);

  useSheetBackClose(isOpen, onClose);

  // Analytics: paywall_viewed ao abrir
  useEffect(() => {
    if (!isOpen) return;
    purchasedRef.current = false;
    track('paywall_viewed', { trigger, plan_highlighted: 'annual' });
  }, [isOpen, trigger]);

  useEffect(() => {
    if (!isOpen || Capacitor.getPlatform() === 'web') return;

    getAvailablePackages().then((pkgs) => {
      const dynamicPlans: PlanOption[] = [];

      if (pkgs.annual) {
        // RevenueCat retorna `priceString` = valor TOTAL do ano (ex "R$249,90").
        // Mostramos o equivalente mensal (total/12) em destaque e o total no
        // detalhe — é o padrão de UX pra anuais. Fallback pro label hardcoded
        // se o parse numérico falhar (moedas exóticas, etc).
        const totalPrice = pkgs.annual.product.priceString || 'R$249,90';
        const monthly = pkgs.annual.product.price
          ? `R$${(pkgs.annual.product.price / 12).toFixed(2).replace('.', ',')}/mês`
          : 'R$20,83/mês';
        dynamicPlans.push({
          type: 'annual',
          label: 'Anual',
          price: monthly,
          detail: `${totalPrice} cobrado anualmente`,
          badge: 'Mais escolhido',
        });
      }
      if (pkgs.monthly) {
        const priceString = pkgs.monthly.product.priceString;
        dynamicPlans.push({
          type: 'monthly',
          label: 'Mensal',
          price: priceString ? `${priceString}/mês` : 'R$34,90/mês',
          detail: 'Cobrado mensalmente',
        });
      }
      if (pkgs.lifetime) {
        // Para vitalício mostramos o equiv. mensal (total/12) no card
        // e o valor real no CTA — mesmo padrão do anual.
        const totalPrice = pkgs.lifetime.product.priceString || 'R$449,90';
        const monthly = pkgs.lifetime.product.price
          ? `R$${(pkgs.lifetime.product.price / 12).toFixed(2).replace('.', ',')}/mês`
          : 'R$37,49/mês';
        dynamicPlans.push({
          type: 'lifetime',
          label: 'Vitalício',
          price: monthly,
          ctaPrice: totalPrice,
          detail: `Cobrado uma vez: ${totalPrice}`,
          badge: 'Melhor custo',
        });
      }

      if (dynamicPlans.length > 0) setPlans(dynamicPlans);
    }).catch(() => {
      // Keep fallback plans
    });
  }, [isOpen]);

  // Pra yaIA, ajusta copy por tipo de reset: diário (volta amanhã) vs
  // mensal (renova dia 1). Sem resetWhen cai no texto genérico.
  const triggerKey =
    trigger === 'yaia' && resetWhen === 'tomorrow'
      ? 'yaia_daily'
      : trigger === 'yaia' && resetWhen === 'next_month'
      ? 'yaia_monthly'
      : trigger;
  const message = TRIGGER_MESSAGES[triggerKey] ?? TRIGGER_MESSAGES[trigger];
  const selected = plans.find((p) => p.type === selectedPlan) ?? plans[0];

  const handlePurchase = async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await purchase(selectedPlan);
      if (success) {
        purchasedRef.current = true;
        onClose();
      }
      // success=false sem exception = usuário cancelou — não mostrar nada
    } catch (e: any) {
      // Só erros reais chegam aqui (pacote não encontrado, rede, etc.)
      setError(e?.message || 'Erro ao processar compra.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Analytics: fechou o paywall sem assinar
    if (!purchasedRef.current) {
      track('paywall_dismissed', { trigger });
    }
    onClose();
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restore();
      if (success) onClose();
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  const ctaText = selectedPlan === 'lifetime'
    ? `Comprar Yaya+ · ${selected.ctaPrice ?? selected.price}`
    : `Assinar Yaya+ · ${selected.price}`;

  return (
    <div role="dialog" aria-modal="true" aria-label="Upgrade Yaya Plus" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 60 }}>
      <div className="w-full max-w-md rounded-t-md sm:rounded-md sm:mx-4 bg-surface border border-primary/20 animate-slide-up max-h-[92vh] flex flex-col">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">Yaya+</span>
            <button onClick={handleClose} className="text-on-surface/40 hover:text-on-surface text-xl leading-none">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Main headline */}
          <h2 className="text-lg font-bold text-on-surface mb-1">Desbloqueie o melhor do Yaya</h2>

          {/* Trigger context */}
          {trigger !== 'generic' && (
            <p className="text-xs text-primary/80 mb-1 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-sm mt-0.5">auto_awesome</span>
              <span>{message.title}: {message.description}</span>
            </p>
          )}
          <p className="text-xs text-on-surface/50 mb-4">
            Tudo o que você precisa para acompanhar a rotina do seu bebê.
          </p>

          {/* Benefits — compact 2-column */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mb-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-1.5 text-xs text-on-surface/80">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                {benefit}
              </div>
            ))}
          </div>

          {/* Plan cards */}
          <div className="space-y-2 mb-2">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.type
              const isLifetime = plan.type === 'lifetime'

              // Tema de cor: vitalício = âmbar, demais = primary (roxo)
              const accentBorder = isLifetime ? 'border-amber-400'      : 'border-primary'
              const accentBg     = isLifetime ? 'bg-amber-400/10'       : 'bg-primary/10'
              const accentBadge  = isLifetime
                ? 'bg-amber-400/20 text-amber-400'
                : 'bg-primary/20 text-primary'
              const accentRadio  = isLifetime ? 'border-amber-400'      : 'border-primary'
              const accentDot    = isLifetime ? 'bg-amber-400'          : 'bg-primary'
              const accentPrice  = isLifetime ? 'text-amber-400'        : 'text-primary'

              return (
                <button
                  key={plan.type}
                  onClick={() => setSelectedPlan(plan.type)}
                  className={`w-full rounded-md border-2 transition-all overflow-hidden text-left ${
                    isSelected
                      ? `${accentBorder} ${accentBg}`
                      : 'border-outline-variant/50 bg-surface-container/50'
                  }`}
                >
                  {/* Faixa de destaque no topo — visível só quando selecionado */}
                  {isSelected && plan.badge && (
                    <div className={`px-4 py-1 text-[10px] font-bold uppercase tracking-wider ${accentBadge}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Radio */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? accentRadio : 'border-outline-variant'
                    }`}>
                      {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${accentDot}`} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-on-surface">{plan.label}</span>
                        {/* Pill badge compacto quando NÃO selecionado */}
                        {!isSelected && plan.badge && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-on-surface/50">{plan.detail}</span>
                    </div>

                    {/* Price — equiv. mensal para todos os planos */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-bold ${isSelected ? accentPrice : 'text-on-surface/70'}`}>
                        {plan.price}
                      </div>
                      {/* Nota de equivalência para vitalício */}
                      {isLifetime && (
                        <div className="text-[9px] text-on-surface/40">equiv./mês</div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Fixed bottom — CTA always visible */}
        <div className="px-5 pb-sheet-sm pt-2 border-t border-outline-variant/30 bg-surface">
          {error && (
            <p className="text-center text-xs text-error mb-2">{error}</p>
          )}
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-3.5 rounded-md bg-primary text-on-primary font-bold text-base mb-2 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Processando...' : ctaText}
          </button>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-on-surface/30">
              {selectedPlan === 'lifetime'
                ? 'Compra única.'
                : 'Cancele quando quiser.'}
            </p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="text-[11px] text-on-surface/40 hover:text-on-surface/70 transition-colors"
            >
              {restoring ? 'Verificando...' : 'Restaurar compra'}
            </button>
          </div>

          {/* Links obrigatórios pela Apple (Guideline 3.1.2(c)) */}
          <div className="flex items-center justify-center gap-3 mt-2">
            <a
              href="https://yayababy.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-on-surface/30 hover:text-on-surface/50 underline"
            >
              Privacidade
            </a>
            <span className="text-[10px] text-on-surface/20">·</span>
            <a
              href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-on-surface/30 hover:text-on-surface/50 underline"
            >
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
