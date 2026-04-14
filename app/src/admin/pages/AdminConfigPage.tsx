import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminConfigPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const FLAG_DESCRIPTIONS: Record<string, string> = {
    maintenance_mode: 'Ativa o modo manutenção. Quando ligado, o app exibe uma tela de "em manutenção" para todos os usuários, impedindo o uso normal.',
    push_enabled: 'Habilita o envio de push notifications automáticas (alertas de rotina, resumo diário, saltos de desenvolvimento).',
    premium_paywall: 'Ativa o paywall para recursos premium (Yaya+). Quando desligado, todos têm acesso a tudo gratuitamente.',
    streak_enabled: 'Ativa o sistema de streaks (sequência de dias usando o app). Mostra o contador no perfil.',
    insights_enabled: 'Ativa a aba de Insights com análises inteligentes sobre o bebê (padrões, saltos, dicas).',
    shared_reports: 'Permite que pais gerem links públicos de relatório para compartilhar com pediatras.',
    development_leaps: 'Ativa as notificações e cards sobre saltos de desenvolvimento do bebê.',
    onboarding_v2: 'Usa o fluxo de onboarding v2 com personalização por idade do bebê.',
  };

  useEffect(() => {
    supabase.from('feature_flags').select('*').order('id').then(({ data }) => {
      setFlags(data ?? []);
      setLoading(false);
    });
  }, []);

  async function toggleFlag(id: string, current: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('feature_flags').update({
      enabled: !current,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    }).eq('id', id);
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !current } : f));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #b79fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(183,159,255,0.08)',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e7e2ff', marginBottom: 20 }}>Configurações</h2>

      <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Feature flags</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {flags.map(flag => (
          <div key={flag.id} style={cardStyle}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#e7e2ff', fontWeight: 500 }}>{flag.description || FLAG_DESCRIPTIONS[flag.id] || flag.id}</div>
              <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>{flag.id}</div>
              {(FLAG_DESCRIPTIONS[flag.id] || flag.description) && (
                <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.35)', marginTop: 4, lineHeight: 1.4 }}>
                  {FLAG_DESCRIPTIONS[flag.id] || flag.description}
                </div>
              )}
            </div>
            <button
              onClick={() => toggleFlag(flag.id, flag.enabled)}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                background: flag.enabled ? '#b79fff' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 10, background: 'white',
                position: 'absolute', top: 3,
                left: flag.enabled ? 21 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Links rápidos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard/project/kgfjfdizxziacblgvplh' },
          { label: 'RevenueCat', url: 'https://app.revenuecat.com' },
          { label: 'Firebase Console', url: 'https://console.firebase.google.com' },
          { label: 'Google Play Console', url: 'https://play.google.com/console' },
          { label: 'App Store Connect', url: 'https://appstoreconnect.apple.com' },
          { label: 'Vercel', url: 'https://vercel.com' },
          { label: 'Codemagic', url: 'https://codemagic.io' },
        ].map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            style={{
              ...cardStyle,
              textDecoration: 'none',
              color: '#e7e2ff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <span style={{ flex: 1 }}>{link.label}</span>
            <span style={{ color: 'rgba(231,226,255,0.3)', fontSize: 12 }}>{'\u2197'}</span>
          </a>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
