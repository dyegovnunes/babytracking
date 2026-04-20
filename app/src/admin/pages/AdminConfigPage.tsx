import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminConfigPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const FLAG_DESCRIPTIONS: Record<string, string> = {
    maintenance_mode:
      'Ativa o modo manutenção. Quando ligado, o app exibe uma tela de "em manutenção" para todos os usuários, impedindo o uso normal.',
    push_enabled:
      'Habilita o envio de push notifications automáticas (alertas de rotina, resumo diário, saltos de desenvolvimento).',
    premium_paywall:
      'Ativa o paywall para recursos premium (Yaya+). Quando desligado, todos têm acesso a tudo gratuitamente.',
    streak_enabled:
      'Ativa o sistema de streaks (sequência de dias usando o app). Mostra o contador no perfil.',
    insights_enabled:
      'Ativa a aba de Insights com análises inteligentes sobre o bebê (padrões, saltos, dicas).',
    shared_reports:
      'Permite que pais gerem links públicos de relatório para compartilhar com pediatras.',
    development_leaps:
      'Ativa as notificações e cards sobre saltos de desenvolvimento do bebê.',
    onboarding_v2: 'Usa o fluxo de onboarding v2 com personalização por idade do bebê.',
  };

  useEffect(() => {
    supabase
      .from('feature_flags')
      .select('*')
      .order('id')
      .then(({ data }) => {
        setFlags(data ?? []);
        setLoading(false);
      });
  }, []);

  async function toggleFlag(id: string, current: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('feature_flags')
      .update({
        enabled: !current,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      })
      .eq('id', id);
    setFlags(prev => prev.map(f => (f.id === id ? { ...f, enabled: !current } : f)));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-headline text-xl font-bold text-on-surface mb-5">Configurações</h2>

      <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3">
        Feature flags
      </h3>
      <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-4 py-3 mb-3 font-label text-xs text-amber-500 leading-relaxed">
        <span className="font-semibold">Atenção —</span> essas flags ainda não são lidas pelo
        app; toggling não altera comportamento. Implementação do hook está em
        task separado.
      </div>
      <div className="flex flex-col gap-2 mb-7">
        {flags.map(flag => (
          <div
            key={flag.id}
            className="flex items-center gap-4 bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4"
          >
            <div className="flex-1 min-w-0">
              <div className="font-body text-sm font-medium text-on-surface">
                {flag.description || FLAG_DESCRIPTIONS[flag.id] || flag.id}
              </div>
              <div className="font-mono text-[11px] text-on-surface-variant/50 mt-0.5">
                {flag.id}
              </div>
              {(FLAG_DESCRIPTIONS[flag.id] || flag.description) && (
                <div className="font-label text-xs text-on-surface-variant/70 mt-1 leading-relaxed">
                  {FLAG_DESCRIPTIONS[flag.id] || flag.description}
                </div>
              )}
            </div>
            <button
              onClick={() => toggleFlag(flag.id, flag.enabled)}
              className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors ${
                flag.enabled ? 'bg-primary' : 'bg-outline-variant/40'
              }`}
              aria-pressed={flag.enabled}
              aria-label={`Toggle ${flag.id}`}
            >
              <div
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: flag.enabled ? 21 : 3 }}
              />
            </button>
          </div>
        ))}
      </div>

      <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3">
        Links rápidos
      </h3>
      <div className="flex flex-col gap-2">
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
            className="flex items-center gap-4 bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 text-on-surface no-underline hover:bg-surface-container transition-colors"
          >
            <span className="flex-1 font-body text-sm">{link.label}</span>
            <span className="text-on-surface-variant/50 text-xs">↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
