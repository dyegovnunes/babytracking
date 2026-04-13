import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminConfigPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Configuracoes</h2>

      <div className="space-y-2">
        {flags.map(flag => (
          <div key={flag.id} className="bg-gray-900 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-white text-sm">{flag.description || flag.id}</p>
              <p className="text-gray-600 text-[10px] font-mono">{flag.id}</p>
            </div>
            <button
              onClick={() => toggleFlag(flag.id, flag.enabled)}
              className={`w-11 h-6 rounded-full relative transition-colors ${flag.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${flag.enabled ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-gray-500 text-xs">Links rapidos</p>
        {[
          { label: '\u{1F5C4}\uFE0F Supabase Dashboard', url: 'https://supabase.com/dashboard/project/kgfjfdizxziacblgvplh' },
          { label: '\u{1F4B3} RevenueCat', url: 'https://app.revenuecat.com' },
          { label: '\u{1F525} Firebase Console', url: 'https://console.firebase.google.com' },
        ].map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-300 active:bg-gray-800"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
