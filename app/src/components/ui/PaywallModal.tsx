import { useState, useEffect } from 'react';
import { usePurchase } from '../../contexts/PurchaseContext';
import { getAvailablePackages, type PlanType } from '../../lib/purchases';
import { Capacitor } from '@capacitor/core';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'history' | 'insights' | 'pdf' | 'multi_caregiver' | 'multi_profile' | 'daily_limit' | 'generic';
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string }> = {
  history: {
    title: 'Histórico completo',
    description: 'Você está tentando acessar registros com mais de 3 dias. Com o Yaya+, seu histórico é ilimitado.',
  },
  insights: {
    title: 'Insights semanais',
    description: 'Veja padrões de sono, frequência de amamentações e resumos semanais com o Yaya+.',
  },
  pdf: {
    title: 'Relatório para pediatra',
    description: 'Exporte um PDF completo da rotina do seu bebê para levar na consulta.',
  },
  multi_caregiver: {
    title: 'Compartilhar com cuidadores',
    description: 'Compartilhe o acompanhamento com o parceiro, avós ou babá com o Yaya+.',
  },
  multi_profile: {
    title: 'Múltiplos bebês',
    description: 'Adicione perfis para outros filhos. Com o Yaya+, até 4 perfis.',
  },
  daily_limit: {
    title: 'Registros ilimitados',
    description: 'Você atingiu o limite de 5 registros hoje. Com o Yaya+, registre sem limites.',
  },
  generic: {
    title: 'Yaya+',
    description: 'Desbloqueie o melhor do Yaya.',
  },
};

const BENEFITS = [
  'Registros ilimitados por dia',
  'Histórico ilimitado de registros',
  'Até 4 perfis de bebê',
  'Cuidadores ilimitados',
  'Insights e padrões semanais',
  'Relatório PDF para pediatra',
  'Sem anúncios',
];

interface PlanOption {
  type: PlanType;
  label: string;
  price: string;
  detail: string;
  badge?: string;
}

const FALLBACK_PLANS: PlanOption[] = [
  { type: 'annual', label: 'Anual', price: 'R$16,90/mês', detail: 'R$202,80/ano', badge: 'Melhor valor' },
  { type: 'monthly', label: 'Mensal', price: 'R$29,90/mês', detail: '' },
  { type: 'lifetime', label: 'Vitalício', price: 'R$299,90', detail: 'Uma vez, para sempre' },
];

export function PaywallModal({ isOpen, onClose, trigger = 'generic' }: PaywallModalProps) {
  const { purchase, restore } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);

  useEffect(() => {
    if (!isOpen || Capacitor.getPlatform() === 'web') return;

    getAvailablePackages().then((pkgs) => {
      const dynamicPlans: PlanOption[] = [];

      if (pkgs.annual) {
        dynamicPlans.push({
          type: 'annual',
          label: 'Anual',
          price: pkgs.annual.product.priceString + '/mês' || 'R$16,90/mês',
          detail: pkgs.annual.product.priceString || 'R$202,80/ano',
          badge: 'Melhor valor',
        });
      }
      if (pkgs.monthly) {
        dynamicPlans.push({
          type: 'monthly',
          label: 'Mensal',
          price: pkgs.monthly.product.priceString + '/mês' || 'R$29,90/mês',
          detail: '',
        });
      }
      if (pkgs.lifetime) {
        dynamicPlans.push({
          type: 'lifetime',
          label: 'Vitalício',
          price: pkgs.lifetime.product.priceString || 'R$299,90',
          detail: 'Uma vez, para sempre',
        });
      }

      if (dynamicPlans.length > 0) setPlans(dynamicPlans);
    }).catch(() => {
      // Keep fallback plans
    });
  }, [isOpen]);

  const message = TRIGGER_MESSAGES[trigger];
  const selected = plans.find((p) => p.type === selectedPlan) ?? plans[0];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchase(selectedPlan);
      if (success) onClose();
    } finally {
      setLoading(false);
    }
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
    ? `Comprar Yaya+ — ${selected.price}`
    : `Assinar Yaya+ — ${selected.price}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-[#0d0a27] border border-[#b79fff]/20 p-6 pb-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#b79fff]">Yaya+</span>
          <button onClick={onClose} className="text-[#e7e2ff]/40 hover:text-[#e7e2ff] text-xl leading-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Trigger context */}
        <h2 className="text-xl font-bold text-[#e7e2ff] mb-2">{message.title}</h2>
        <p className="text-sm text-[#e7e2ff]/60 mb-5">{message.description}</p>

        {/* Benefits */}
        <ul className="space-y-2 mb-6">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-sm text-[#e7e2ff]/80">
              <span className="material-symbols-outlined text-[#b79fff] text-base">check_circle</span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Plan cards */}
        <div className="space-y-2 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.type}
              onClick={() => setSelectedPlan(plan.type)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                selectedPlan === plan.type
                  ? 'border-[#b79fff] bg-[#b79fff]/10'
                  : 'border-[#474464]/50 bg-[#181538]/50'
              }`}
            >
              {/* Radio */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedPlan === plan.type ? 'border-[#b79fff]' : 'border-[#474464]'
              }`}>
                {selectedPlan === plan.type && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#b79fff]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#e7e2ff]">{plan.label}</span>
                  {plan.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#b79fff] text-[#0d0a27] px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                </div>
                {plan.detail && (
                  <span className="text-xs text-[#e7e2ff]/50">{plan.detail}</span>
                )}
              </div>

              {/* Price */}
              <span className="text-sm font-bold text-[#b79fff]">{plan.price}</span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#b79fff] text-[#0d0a27] font-bold text-base mb-3 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Processando...' : ctaText}
        </button>

        {/* Legal + Restore */}
        <p className="text-center text-[11px] text-[#e7e2ff]/30 mb-3">
          {selectedPlan === 'lifetime'
            ? 'Compra única. Acesso permanente.'
            : 'Cancele quando quiser. Renovação automática.'}
        </p>
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-center text-xs text-[#e7e2ff]/40 hover:text-[#e7e2ff]/70 py-2 transition-colors"
        >
          {restoring ? 'Verificando...' : 'Já comprei — restaurar acesso'}
        </button>
      </div>
    </div>
  );
}
