import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminMonetizationPage() {
  const [data, setData] = useState({ monthly: 0, annual: 0, lifetime: 0, free: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('subscription_plan, is_premium');

      const counts = { monthly: 0, annual: 0, lifetime: 0, free: 0 };
      (profiles ?? []).forEach((p: any) => {
        if (!p.is_premium) { counts.free++; return; }
        if (p.subscription_plan === 'monthly') counts.monthly++;
        else if (p.subscription_plan === 'annual') counts.annual++;
        else if (p.subscription_plan === 'lifetime') counts.lifetime++;
      });
      setData(counts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mrr = data.monthly * 29.90 + data.annual * 16.90;

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Monetizacao</h2>

      <div className="bg-purple-900/40 border border-purple-700/40 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-xs mb-1">MRR estimado</p>
        <p className="text-3xl font-bold text-purple-300">R$ {mrr.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.monthly}</div>
          <div className="text-gray-500 text-xs">Mensal (R$29,90)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.annual}</div>
          <div className="text-gray-500 text-xs">Anual (R$202,80)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.lifetime}</div>
          <div className="text-gray-500 text-xs">Vitalicio (R$299,90)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.free}</div>
          <div className="text-gray-500 text-xs">Free</div>
        </div>
      </div>
    </div>
  );
}
