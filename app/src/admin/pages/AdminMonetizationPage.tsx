import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminMonetizationPage() {
  const [data, setData] = useState({ monthly: 0, annual: 0, lifetime: 0, free: 0, courtesy: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('subscription_plan, is_premium, courtesy_expires_at');

      const counts = { monthly: 0, annual: 0, lifetime: 0, free: 0, courtesy: 0 };
      (profiles ?? []).forEach((p: any) => {
        if (p.courtesy_expires_at && new Date(p.courtesy_expires_at) > new Date()) {
          counts.courtesy++;
          return;
        }
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #b79fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const mrr = data.monthly * 29.90 + data.annual * 16.90;
  const total = data.monthly + data.annual + data.lifetime + data.free + data.courtesy;

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(183,159,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e7e2ff', marginBottom: 20 }}>Monetizacao</h2>

      {/* MRR highlight */}
      <div style={{
        background: 'rgba(183,159,255,0.1)',
        border: '1px solid rgba(183,159,255,0.2)',
        borderRadius: 16,
        padding: '28px 24px',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>MRR estimado</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#b79fff' }}>R$ {mrr.toFixed(2)}</div>
      </div>

      {/* Plan breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e7e2ff' }}>{data.monthly}</div>
          <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>Mensal (R$29,90)</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.3)', marginTop: 4 }}>R$ {(data.monthly * 29.90).toFixed(2)}/mes</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e7e2ff' }}>{data.annual}</div>
          <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>Anual (R$202,80)</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.3)', marginTop: 4 }}>R$ {(data.annual * 16.90).toFixed(2)}/mes</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e7e2ff' }}>{data.lifetime}</div>
          <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>Vitalicio (R$299,90)</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#FFB300' }}>{data.courtesy}</div>
          <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>Cortesia ativa</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'rgba(231,226,255,0.4)' }}>{data.free}</div>
          <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>Free</div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Funil de conversao</div>
        <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 12, overflow: 'hidden' }}>
          {data.monthly > 0 && <div style={{ flex: data.monthly, background: '#b79fff', minWidth: 2 }} title={`Mensal: ${data.monthly}`} />}
          {data.annual > 0 && <div style={{ flex: data.annual, background: '#9b7de6', minWidth: 2 }} title={`Anual: ${data.annual}`} />}
          {data.lifetime > 0 && <div style={{ flex: data.lifetime, background: '#7c5cbf', minWidth: 2 }} title={`Vitalicio: ${data.lifetime}`} />}
          {data.courtesy > 0 && <div style={{ flex: data.courtesy, background: '#FFB300', minWidth: 2 }} title={`Cortesia: ${data.courtesy}`} />}
          {data.free > 0 && <div style={{ flex: data.free, background: 'rgba(255,255,255,0.1)', minWidth: 2 }} title={`Free: ${data.free}`} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'rgba(231,226,255,0.35)' }}>
          <span>Premium: {total - data.free - data.courtesy} ({total > 0 ? ((total - data.free - data.courtesy) / total * 100).toFixed(1) : 0}%)</span>
          <span>Total: {total}</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
