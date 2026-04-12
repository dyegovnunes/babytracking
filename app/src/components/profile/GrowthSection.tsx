import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { hapticSuccess, hapticLight } from '../../lib/haptics';

interface Measurement {
  id: string;
  type: string;
  value: number;
  unit: string;
  measured_at: string;
}

interface GrowthSectionProps {
  babyId: string;
}

export default function GrowthSection({ babyId }: GrowthSectionProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadMeasurements = useCallback(async () => {
    const { data } = await supabase
      .from('measurements')
      .select('*')
      .eq('baby_id', babyId)
      .order('measured_at', { ascending: false })
      .limit(20);
    if (data) setMeasurements(data);
  }, [babyId]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  const latestWeight = measurements.find((m) => m.type === 'weight');
  const latestHeight = measurements.find((m) => m.type === 'height');

  const handleSave = async (type: 'weight' | 'height') => {
    const rawValue = type === 'weight' ? weightInput : heightInput;
    const value = parseFloat(rawValue.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    setSaving(true);
    const unit = type === 'weight' ? 'kg' : 'cm';
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('measurements').insert({
      baby_id: babyId,
      type,
      value,
      unit,
      measured_by: user?.id,
      measured_at: new Date().toISOString(),
    });

    if (!error) {
      hapticSuccess();
      if (type === 'weight') setWeightInput('');
      else setHeightInput('');
      await loadMeasurements();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    hapticLight();
    await supabase.from('measurements').delete().eq('id', id);
    await loadMeasurements();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Group history by date
  const historyDates: { date: string; weight?: Measurement; height?: Measurement }[] = [];
  const seen = new Set<string>();
  for (const m of measurements) {
    const d = m.measured_at.slice(0, 10);
    if (!seen.has(d)) {
      seen.add(d);
      const weight = measurements.find((x) => x.type === 'weight' && x.measured_at.slice(0, 10) === d);
      const height = measurements.find((x) => x.type === 'height' && x.measured_at.slice(0, 10) === d);
      historyDates.push({ date: d, weight, height });
    }
  }

  return (
    <div className="bg-surface-container rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined text-primary text-xl">straighten</span>
        <h3 className="text-on-surface font-headline text-sm font-bold">Crescimento</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Peso */}
        <div className="bg-surface-container-low rounded-lg p-3">
          <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Peso</p>
          {latestWeight ? (
            <p className="font-headline text-lg font-bold text-on-surface">
              {Number(latestWeight.value).toFixed(2)} <span className="text-xs font-normal text-on-surface-variant">kg</span>
            </p>
          ) : (
            <p className="font-body text-sm text-on-surface-variant">—</p>
          )}
          {latestWeight && (
            <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
              {formatDate(latestWeight.measured_at)}
            </p>
          )}
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={latestWeight ? Number(latestWeight.value).toFixed(2) : '0.00'}
              className="flex-1 min-w-0 bg-surface-container rounded px-2 py-1.5 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
              onKeyDown={(e) => e.key === 'Enter' && handleSave('weight')}
            />
            <button
              onClick={() => handleSave('weight')}
              disabled={saving || !weightInput}
              className="px-2.5 py-1.5 rounded bg-primary/10 text-primary font-label text-xs font-semibold disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        {/* Altura */}
        <div className="bg-surface-container-low rounded-lg p-3">
          <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Altura</p>
          {latestHeight ? (
            <p className="font-headline text-lg font-bold text-on-surface">
              {Number(latestHeight.value).toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">cm</span>
            </p>
          ) : (
            <p className="font-body text-sm text-on-surface-variant">—</p>
          )}
          {latestHeight && (
            <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
              {formatDate(latestHeight.measured_at)}
            </p>
          )}
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              inputMode="decimal"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              placeholder={latestHeight ? Number(latestHeight.value).toFixed(1) : '0.0'}
              className="flex-1 min-w-0 bg-surface-container rounded px-2 py-1.5 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
              onKeyDown={(e) => e.key === 'Enter' && handleSave('height')}
            />
            <button
              onClick={() => handleSave('height')}
              disabled={saving || !heightInput}
              className="px-2.5 py-1.5 rounded bg-primary/10 text-primary font-label text-xs font-semibold disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {measurements.length === 0 ? (
        <p className="font-body text-xs text-on-surface-variant text-center py-2">
          Registre o peso e altura do bebe para acompanhar o crescimento
        </p>
      ) : (
        <>
          <button
            onClick={() => { hapticLight(); setShowHistory(!showHistory); }}
            className="w-full flex items-center justify-center gap-1 text-primary font-label text-xs font-semibold py-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {showHistory ? 'expand_less' : 'expand_more'}
            </span>
            {showHistory ? 'Ocultar historico' : `Ver historico (${historyDates.length})`}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {historyDates.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between py-1.5 px-2 bg-surface-container-low rounded">
                  <span className="font-label text-xs text-on-surface-variant">{formatDate(entry.date + 'T00:00:00')}</span>
                  <div className="flex items-center gap-3">
                    {entry.weight && (
                      <span className="font-body text-xs text-on-surface">
                        {Number(entry.weight.value).toFixed(2)} kg
                      </span>
                    )}
                    {entry.height && (
                      <span className="font-body text-xs text-on-surface">
                        {Number(entry.height.value).toFixed(1)} cm
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (entry.weight) handleDelete(entry.weight.id);
                        if (entry.height) handleDelete(entry.height.id);
                      }}
                      className="text-on-surface-variant/40 active:text-error"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
