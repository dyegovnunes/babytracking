import { useState } from 'react';
import { usePurchase } from '../../contexts/PurchaseContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: 'history' | 'insights' | 'pdf' | 'multi_caregiver' | 'multi_profile' | 'generic';
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string }> = {
  history: {
    title: 'Histórico completo',
    description: 'Você está tentando acessar registros com mais de 7 dias. Com o Yaya+, seu histórico é ilimitado.',
  },
  insights: {
    title: 'Insights semanais',
    description: 'Veja padrões de sono, frequência de mamadas e resumos semanais com o Yaya+.',
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
  generic: {
    title: 'Yaya+',
    description: 'Desbloqueie o melhor do Yaya.',
  },
};

const BENEFITS = [
  'Histórico ilimitado de registros',
  'Até 4 perfis de bebê',
  'Cuidadores ilimitados',
  'Insights e padrões semanais',
  'Relatório PDF para pediatra',
  'Sem anúncios',
];

export function PaywallModal({ isOpen, onClose, trigger = 'generic' }: PaywallModalProps) {
  const { purchase, restore } = usePurchase();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const message = TRIGGER_MESSAGES[trigger];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchase();
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl bg-[#0d0a27] border border-[#b79fff]/20 p-6 pb-10 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#b79fff]">Yaya+</span>
          <button onClick={onClose} className="text-[#e7e2ff]/40 hover:text-[#e7e2ff] text-xl leading-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Trigger context */}
        <h2 className="text-xl font-bold text-[#e7e2ff] mb-2">{message.title}</h2>
        <p className="text-sm text-[#e7e2ff]/60 mb-6">{message.description}</p>

        {/* Benefits */}
        <ul className="space-y-2 mb-8">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-sm text-[#e7e2ff]/80">
              <span className="material-symbols-outlined text-[#b79fff] text-base">check_circle</span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-[#b79fff] text-[#0d0a27] font-bold text-base mb-3 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Processando...' : 'Assinar Yaya+ — R$49,90'}
        </button>
        <p className="text-center text-xs text-[#e7e2ff]/40 mb-3">Compra única. Sem assinatura. Para sempre.</p>
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
