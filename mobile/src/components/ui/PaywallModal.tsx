import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { usePurchase } from '../../contexts/PurchaseContext';
import { getAvailablePackages, type PlanType } from '../../lib/purchases';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'history' | 'insights' | 'pdf' | 'multi_caregiver' | 'multi_profile' | 'daily_limit' | 'generic';
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string }> = {
  history: {
    title: 'Historico completo',
    description: 'Voce esta tentando acessar registros com mais de 3 dias. Com o Yaya+, seu historico e ilimitado.',
  },
  insights: {
    title: 'Insights semanais',
    description: 'Veja padroes de sono, frequencia de amamentacoes e resumos semanais com o Yaya+.',
  },
  pdf: {
    title: 'Relatorio para pediatra',
    description: 'Exporte um PDF completo da rotina do seu bebe para levar na consulta.',
  },
  multi_caregiver: {
    title: 'Compartilhar com cuidadores',
    description: 'Compartilhe o acompanhamento com o parceiro, avos ou baba com o Yaya+.',
  },
  multi_profile: {
    title: 'Multiplos bebes',
    description: 'Adicione perfis para outros filhos. Com o Yaya+, ate 4 perfis.',
  },
  daily_limit: {
    title: 'Registros ilimitados',
    description: 'Voce atingiu o limite de 5 registros hoje. Com o Yaya+, registre sem limites.',
  },
  generic: {
    title: 'Yaya+',
    description: 'Desbloqueie o melhor do Yaya.',
  },
};

const BENEFITS = [
  'Registros ilimitados por dia',
  'Historico ilimitado de registros',
  'Ate 4 perfis de bebe',
  'Cuidadores ilimitados',
  'Insights e padroes semanais',
  'Relatorio PDF para pediatra',
  'Sem anuncios',
];

interface PlanOption {
  type: PlanType;
  label: string;
  price: string;
  detail: string;
  badge?: string;
}

const FALLBACK_PLANS: PlanOption[] = [
  { type: 'annual', label: 'Anual', price: 'R$16,90/mes', detail: 'R$202,80/ano', badge: 'Melhor valor' },
  { type: 'monthly', label: 'Mensal', price: 'R$29,90/mes', detail: '' },
  { type: 'lifetime', label: 'Vitalicio', price: 'R$299,90', detail: 'Uma vez, para sempre' },
];

export function PaywallModal({ isOpen, onClose, trigger = 'generic' }: PaywallModalProps) {
  const { purchase, restore } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [plans, setPlans] = useState<PlanOption[]>(FALLBACK_PLANS);

  useEffect(() => {
    if (!isOpen) return;

    getAvailablePackages().then((pkgs) => {
      const dynamicPlans: PlanOption[] = [];

      if (pkgs.annual) {
        dynamicPlans.push({
          type: 'annual',
          label: 'Anual',
          price: pkgs.annual.product.priceString + '/mes' || 'R$16,90/mes',
          detail: pkgs.annual.product.priceString || 'R$202,80/ano',
          badge: 'Melhor valor',
        });
      }
      if (pkgs.monthly) {
        dynamicPlans.push({
          type: 'monthly',
          label: 'Mensal',
          price: pkgs.monthly.product.priceString + '/mes' || 'R$29,90/mes',
          detail: '',
        });
      }
      if (pkgs.lifetime) {
        dynamicPlans.push({
          type: 'lifetime',
          label: 'Vitalicio',
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

  const ctaText = selectedPlan === 'lifetime'
    ? `Comprar Yaya+ — ${selected.price}`
    : `Assinar Yaya+ — ${selected.price}`;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl bg-[#0d0a27] border border-[#b79fff]/20 p-6 pb-10 max-h-[90%]">
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-xs font-semibold tracking-widest uppercase text-[#b79fff]">Yaya+</Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Text className="text-[#e7e2ff]/40 text-xl">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Trigger context */}
            <Text className="text-xl font-bold text-[#e7e2ff] mb-2">{message.title}</Text>
            <Text className="text-sm text-[#e7e2ff]/60 mb-5">{message.description}</Text>

            {/* Benefits */}
            <View className="mb-6">
              {BENEFITS.map((benefit) => (
                <View key={benefit} className="flex-row items-center gap-3 mb-2">
                  <Text className="text-[#b79fff] text-base">✓</Text>
                  <Text className="text-sm text-[#e7e2ff]/80">{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Plan cards */}
            <View className="mb-6">
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.type}
                  onPress={() => setSelectedPlan(plan.type)}
                  className={`flex-row items-center gap-3 p-4 rounded-2xl border-2 mb-2 ${
                    selectedPlan === plan.type
                      ? 'border-[#b79fff] bg-[#b79fff]/10'
                      : 'border-[#474464]/50 bg-[#181538]/50'
                  }`}
                >
                  {/* Radio */}
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPlan === plan.type ? 'border-[#b79fff]' : 'border-[#474464]'
                  }`}>
                    {selectedPlan === plan.type && (
                      <View className="w-2.5 h-2.5 rounded-full bg-[#b79fff]" />
                    )}
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-[#e7e2ff]">{plan.label}</Text>
                      {plan.badge && (
                        <View className="bg-[#b79fff] px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-semibold uppercase tracking-wider text-[#0d0a27]">
                            {plan.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    {plan.detail ? (
                      <Text className="text-xs text-[#e7e2ff]/50">{plan.detail}</Text>
                    ) : null}
                  </View>

                  {/* Price */}
                  <Text className="text-sm font-bold text-[#b79fff]">{plan.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading}
              className={`w-full py-4 rounded-2xl bg-[#b79fff] items-center mb-3 ${loading ? 'opacity-50' : ''}`}
            >
              <Text className="text-[#0d0a27] font-bold text-base">
                {loading ? 'Processando...' : ctaText}
              </Text>
            </TouchableOpacity>

            {/* Legal + Restore */}
            <Text className="text-center text-[11px] text-[#e7e2ff]/30 mb-3">
              {selectedPlan === 'lifetime'
                ? 'Compra unica. Acesso permanente.'
                : 'Cancele quando quiser. Renovacao automatica.'}
            </Text>
            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              className="w-full items-center py-2"
            >
              <Text className="text-xs text-[#e7e2ff]/40">
                {restoring ? 'Verificando...' : 'Ja comprei — restaurar acesso'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
