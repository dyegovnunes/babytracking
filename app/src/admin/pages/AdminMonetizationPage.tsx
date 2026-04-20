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
        // Cortesia: plano courtesy_lifetime OU courtesy_expires_at futuro
        if (
          p.subscription_plan === 'courtesy_lifetime' ||
          (p.courtesy_expires_at && new Date(p.courtesy_expires_at) > new Date())
        ) {
          counts.courtesy++;
          return;
        }
        if (!p.is_premium) {
          counts.free++;
          return;
        }
        if (p.subscription_plan === 'monthly') counts.monthly++;
        else if (p.subscription_plan === 'annual') counts.annual++;
        else if (p.subscription_plan === 'lifetime') counts.lifetime++;
        else counts.courtesy++; // admin_granted ou premium desconhecido → cortesia
      });
      setData(counts);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  // MRR estimado: só mensal + anual. Lifetime é receita única, não entra em MRR.
  // Se mudar preço de tabela, atualizar aqui.
  const mrr = data.monthly * 34.90 + data.annual * 20.825;
  const total = data.monthly + data.annual + data.lifetime + data.free + data.courtesy;
  const paying = data.monthly + data.annual + data.lifetime;
  // Conversão real: pagantes / (pagantes + free). Cortesia fica de fora.
  const convertible = paying + data.free;
  const realConversion = convertible > 0 ? ((paying / convertible) * 100).toFixed(1) : '0';

  return (
    <div>
      <h2 className="font-headline text-xl font-bold text-on-surface mb-5">Monetização</h2>

      {/* MRR highlight */}
      <div className="bg-primary/10 border border-primary/20 rounded-md px-6 py-7 text-center mb-5">
        <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-2">
          MRR estimado
        </div>
        <div className="font-headline text-4xl font-bold text-primary">
          R$ {mrr.toFixed(2)}
        </div>
        <div className="font-label text-xs text-on-surface-variant/70 mt-2">
          Conversão real: <span className="text-on-surface font-semibold">{realConversion}%</span>{' '}
          ({paying} pagantes de {convertible} convertíveis)
        </div>
      </div>

      {/* Plan breakdown */}
      <div
        className="grid gap-3 mb-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        <Card>
          <BigValue>{data.monthly}</BigValue>
          <Label>Mensal (R$34,90)</Label>
          <Sub>R$ {(data.monthly * 34.90).toFixed(2)}/mês</Sub>
        </Card>
        <Card>
          <BigValue>{data.annual}</BigValue>
          <Label>Anual (R$249,90)</Label>
          <Sub>R$ {(data.annual * 20.825).toFixed(2)}/mês</Sub>
        </Card>
        <Card>
          <BigValue>{data.lifetime}</BigValue>
          <Label>Vitalício (R$449,90)</Label>
        </Card>
        <Card>
          <BigValue amber>{data.courtesy}</BigValue>
          <Label>Cortesia ativa</Label>
        </Card>
        <Card>
          <BigValue muted>{data.free}</BigValue>
          <Label>Free</Label>
        </Card>
      </div>

      {/* Conversion funnel */}
      <Card>
        <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-3">
          Funil de conversão
        </div>
        <div className="flex gap-1 h-6 rounded-md overflow-hidden">
          {data.monthly > 0 && (
            <div className="bg-primary min-w-[2px]" style={{ flex: data.monthly }} title={`Mensal: ${data.monthly}`} />
          )}
          {data.annual > 0 && (
            <div className="bg-primary-dim min-w-[2px]" style={{ flex: data.annual }} title={`Anual: ${data.annual}`} />
          )}
          {data.lifetime > 0 && (
            <div className="bg-secondary min-w-[2px]" style={{ flex: data.lifetime }} title={`Vitalício: ${data.lifetime}`} />
          )}
          {data.courtesy > 0 && (
            <div className="bg-amber-500 min-w-[2px]" style={{ flex: data.courtesy }} title={`Cortesia: ${data.courtesy}`} />
          )}
          {data.free > 0 && (
            <div className="bg-outline-variant/40 min-w-[2px]" style={{ flex: data.free }} title={`Free: ${data.free}`} />
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 font-label text-[11px] text-on-surface-variant/70">
          <span>Pagantes: <span className="text-primary font-semibold">{paying}</span></span>
          <span>Cortesia: <span className="text-amber-500 font-semibold">{data.courtesy}</span></span>
          <span>Free: <span className="text-on-surface-variant">{data.free}</span></span>
          <span className="ml-auto">Total: {total}</span>
        </div>
      </Card>

      <div className="mt-6 p-3 rounded-md bg-surface-container-lowest border border-outline-variant/20 font-label text-xs text-on-surface-variant/80 leading-relaxed">
        MRR considera apenas mensais e anuais recorrentes. Vitalício é receita
        única e não entra. Cortesia não gera receita e não conta como pagante.
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4">
      {children}
    </div>
  );
}

function BigValue({
  children,
  amber,
  muted,
}: {
  children: React.ReactNode;
  amber?: boolean;
  muted?: boolean;
}) {
  const color = amber ? 'text-amber-500' : muted ? 'text-on-surface-variant/60' : 'text-on-surface';
  return <div className={`font-headline text-2xl font-bold ${color}`}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-label text-xs text-on-surface-variant/70 mt-0.5">{children}</div>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="font-label text-[11px] text-on-surface-variant/50 mt-1">{children}</div>;
}
