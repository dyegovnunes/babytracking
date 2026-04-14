import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { hapticSuccess, hapticLight } from '../../lib/haptics';
import { usePremium } from '../../hooks/usePremium';
import { showRewardedAd } from '../../lib/admob';

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

/** Máscara de peso: direita para esquerda, 1 decimal. Ex: "36" → "3,6", "360" → "36,0" */
function weightMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const limited = digits.slice(0, 3); // max 99,9 kg
  if (limited.length === 1) return `0,${limited}`;
  const intPart = limited.slice(0, -1);
  const decPart = limited.slice(-1);
  const cleanInt = intPart.replace(/^0+/, '') || '0';
  return `${cleanInt},${decPart}`;
}

/** Máscara de altura: direita para esquerda, 1 decimal. Ex: "505" → "50,5" */
function heightMask(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const limited = digits.slice(0, 4); // max 999,9 cm
  if (limited.length === 1) return `0,${limited}`;
  const intPart = limited.slice(0, -1);
  const decPart = limited.slice(-1);
  const cleanInt = intPart.replace(/^0+/, '') || '0';
  return `${cleanInt},${decPart}`;
}

function parseValue(input: string): number {
  return parseFloat(input.replace(',', '.'));
}

export default function GrowthSection({ babyId }: GrowthSectionProps) {
  const { isPremium } = usePremium();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showAddRetro, setShowAddRetro] = useState(false);
  const [retroDate, setRetroDate] = useState('');
  const [retroWeight, setRetroWeight] = useState('');
  const [retroHeight, setRetroHeight] = useState('');

  const loadMeasurements = useCallback(async () => {
    const { data } = await supabase
      .from('measurements')
      .select('*')
      .eq('baby_id', babyId)
      .order('measured_at', { ascending: false })
      .limit(50);
    if (data) setMeasurements(data);
  }, [babyId]);

  useEffect(() => {
    loadMeasurements();
  }, [loadMeasurements]);

  const latestWeight = measurements.find((m) => m.type === 'weight');
  const latestHeight = measurements.find((m) => m.type === 'height');

  const handleSave = async (type: 'weight' | 'height') => {
    const rawValue = type === 'weight' ? weightInput : heightInput;
    const value = parseValue(rawValue);
    if (isNaN(value) || value <= 0) return;

    // Free users must watch rewarded ad
    if (!isPremium) {
      const rewarded = await showRewardedAd();
      if (!rewarded) return;
    }

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

  const handleEdit = (m: Measurement) => {
    hapticLight();
    setEditingId(m.id);
    setEditValue(
      m.type === 'weight'
        ? Number(m.value).toFixed(1).replace('.', ',')
        : Number(m.value).toFixed(1).replace('.', ',')
    );
    setEditDate(m.measured_at.slice(0, 10));
  };

  const handleEditSave = async (m: Measurement) => {
    const value = parseValue(editValue);
    if (isNaN(value) || value <= 0) return;

    setSaving(true);
    const { error } = await supabase
      .from('measurements')
      .update({
        value,
        measured_at: editDate + 'T12:00:00.000Z',
      })
      .eq('id', m.id);

    if (!error) {
      hapticSuccess();
      setEditingId(null);
      await loadMeasurements();
    }
    setSaving(false);
  };

  const handleAddRetro = async () => {
    if (!retroDate) return;
    const weightVal = parseValue(retroWeight);
    const heightVal = parseValue(retroHeight);
    if ((isNaN(weightVal) || weightVal <= 0) && (isNaN(heightVal) || heightVal <= 0)) return;

    // Free users must watch rewarded ad
    if (!isPremium) {
      const rewarded = await showRewardedAd();
      if (!rewarded) return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const measuredAt = retroDate + 'T12:00:00.000Z';

    const inserts = [];
    if (!isNaN(weightVal) && weightVal > 0) {
      inserts.push({
        baby_id: babyId, type: 'weight', value: weightVal, unit: 'kg',
        measured_by: user?.id, measured_at: measuredAt,
      });
    }
    if (!isNaN(heightVal) && heightVal > 0) {
      inserts.push({
        baby_id: babyId, type: 'height', value: heightVal, unit: 'cm',
        measured_by: user?.id, measured_at: measuredAt,
      });
    }

    const { error } = await supabase.from('measurements').insert(inserts);
    if (!error) {
      hapticSuccess();
      setRetroDate('');
      setRetroWeight('');
      setRetroHeight('');
      setShowAddRetro(false);
      await loadMeasurements();
    }
    setSaving(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatDateFull = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    <div className="bg-surface-container rounded-xl p-4">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => { hapticLight(); setExpanded(!expanded); }}
        className="w-full flex items-center gap-3"
      >
        <span className="material-symbols-outlined text-primary text-xl">straighten</span>
        <h3 className="text-on-surface font-headline text-sm font-bold flex-1 text-left">Crescimento</h3>
        {!expanded && (
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="font-headline text-sm font-bold text-on-surface">
                {latestWeight ? `${Number(latestWeight.value).toFixed(1).replace('.', ',')}kg` : '--'}
              </span>
              <span className="text-on-surface-variant/50 mx-1">·</span>
              <span className="font-headline text-sm font-bold text-on-surface">
                {latestHeight ? `${Number(latestHeight.value).toFixed(1).replace('.', ',')}cm` : '--'}
              </span>
              {(latestWeight || latestHeight) && (
                <p className="font-label text-[9px] text-on-surface-variant">
                  {formatDate((latestWeight || latestHeight)!.measured_at)}
                </p>
              )}
            </div>
          </div>
        )}
        <span className={`material-symbols-outlined text-on-surface-variant text-base transition-transform ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
      <div className="mt-3">
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Peso */}
        <div className="bg-surface-container-low rounded-lg p-3">
          <p className="font-label text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Peso</p>
          {latestWeight ? (
            <p className="font-headline text-lg font-bold text-on-surface">
              {Number(latestWeight.value).toFixed(1).replace('.', ',')} <span className="text-xs font-normal text-on-surface-variant">kg</span>
            </p>
          ) : (
            <p className="font-body text-sm text-on-surface-variant">--,-</p>
          )}
          {latestWeight && (
            <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
              {formatDate(latestWeight.measured_at)}
            </p>
          )}
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(weightMask(e.target.value))}
                placeholder="0,0"
                className="w-full bg-surface-container rounded px-2 py-1.5 pr-7 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => e.key === 'Enter' && handleSave('weight')}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">kg</span>
            </div>
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
              {Number(latestHeight.value).toFixed(1).replace('.', ',')} <span className="text-xs font-normal text-on-surface-variant">cm</span>
            </p>
          ) : (
            <p className="font-body text-sm text-on-surface-variant">--,-</p>
          )}
          {latestHeight && (
            <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
              {formatDate(latestHeight.measured_at)}
            </p>
          )}
          <div className="flex gap-1.5 mt-2">
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                inputMode="decimal"
                value={heightInput}
                onChange={(e) => setHeightInput(heightMask(e.target.value))}
                placeholder="0,0"
                className="w-full bg-surface-container rounded px-2 py-1.5 pr-8 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => e.key === 'Enter' && handleSave('height')}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">cm</span>
            </div>
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
        <div className="space-y-2">
          <p className="font-body text-xs text-on-surface-variant text-center py-2">
            Registre o peso e altura do bebê para acompanhar o crescimento
          </p>
          {!showAddRetro ? (
            <button
              onClick={() => { hapticLight(); setShowAddRetro(true); }}
              className="w-full py-2 rounded-lg border border-dashed border-primary/30 text-primary font-label text-xs font-semibold flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Adicionar medição anterior
            </button>
          ) : (
            <div className="p-3 bg-surface-container-low rounded-lg border border-primary/20 space-y-2">
              <p className="font-label text-[11px] text-primary uppercase tracking-wider">Nova medição retroativa</p>
              <input
                type="date"
                value={retroDate}
                onChange={(e) => setRetroDate(e.target.value)}
                className="w-full bg-surface-container rounded px-2 py-1.5 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input type="text" inputMode="decimal" value={retroWeight}
                    onChange={(e) => setRetroWeight(weightMask(e.target.value))} placeholder="Peso"
                    className="w-full bg-surface-container rounded px-2 py-1.5 pr-7 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">kg</span>
                </div>
                <div className="relative">
                  <input type="text" inputMode="decimal" value={retroHeight}
                    onChange={(e) => setRetroHeight(heightMask(e.target.value))} placeholder="Altura"
                    className="w-full bg-surface-container rounded px-2 py-1.5 pr-8 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">cm</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleAddRetro} disabled={saving || !retroDate || (!retroWeight && !retroHeight)}
                  className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-label text-xs font-semibold disabled:opacity-30">Salvar</button>
                <button onClick={() => { setShowAddRetro(false); setRetroDate(''); setRetroWeight(''); setRetroHeight(''); }}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-on-surface-variant font-label text-xs">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => { hapticLight(); setShowHistory(!showHistory); }}
            className="w-full flex items-center justify-center gap-1 text-primary font-label text-xs font-semibold py-1.5"
          >
            <span className="material-symbols-outlined text-sm">
              {showHistory ? 'expand_less' : 'expand_more'}
            </span>
            {showHistory ? 'Ocultar histórico' : `Ver histórico (${historyDates.length})`}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
              {historyDates.map((entry) => (
                <div key={entry.date} className="py-1.5 px-2 bg-surface-container-low rounded">
                  {editingId === entry.weight?.id || editingId === entry.height?.id ? (
                    /* Modo edição */
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full bg-surface-container rounded px-2 py-1 text-on-surface font-body text-xs outline-none"
                      />
                      <div className="flex gap-2">
                        {editingId === entry.weight?.id && (
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={(e) => setEditValue(weightMask(e.target.value))}
                              className="w-full bg-surface-container rounded px-2 py-1 pr-7 text-on-surface font-body text-xs outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[10px]">kg</span>
                          </div>
                        )}
                        {editingId === entry.height?.id && (
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editValue}
                              onChange={(e) => setEditValue(heightMask(e.target.value))}
                              className="w-full bg-surface-container rounded px-2 py-1 pr-8 text-on-surface font-body text-xs outline-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[10px]">cm</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const m = editingId === entry.weight?.id ? entry.weight : entry.height;
                            if (m) handleEditSave(m);
                          }}
                          disabled={saving}
                          className="flex-1 py-1 rounded bg-primary/10 text-primary font-label text-[10px] font-semibold disabled:opacity-30"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-1 rounded bg-white/5 text-on-surface-variant font-label text-[10px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Modo visualização */
                    <div className="flex items-center justify-between">
                      <span className="font-label text-xs text-on-surface-variant">
                        {formatDateFull(entry.date + 'T00:00:00')}
                      </span>
                      <div className="flex items-center gap-2">
                        {entry.weight && (
                          <button
                            onClick={() => handleEdit(entry.weight!)}
                            className="font-body text-xs text-on-surface active:text-primary"
                          >
                            {Number(entry.weight.value).toFixed(1).replace('.', ',')} kg
                          </button>
                        )}
                        {entry.height && (
                          <button
                            onClick={() => handleEdit(entry.height!)}
                            className="font-body text-xs text-on-surface active:text-primary"
                          >
                            {Number(entry.height.value).toFixed(1).replace('.', ',')} cm
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (entry.weight) handleDelete(entry.weight.id);
                            if (entry.height) handleDelete(entry.height.id);
                          }}
                          className="text-on-surface-variant/40 active:text-error ml-1"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Botão adicionar dado retroativo */}
              {!showAddRetro ? (
                <button
                  onClick={() => { hapticLight(); setShowAddRetro(true); }}
                  className="w-full py-2 rounded-lg border border-dashed border-primary/30 text-primary font-label text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Adicionar medição anterior
                </button>
              ) : (
                <div className="p-3 bg-surface-container-low rounded-lg border border-primary/20 space-y-2">
                  <p className="font-label text-[11px] text-primary uppercase tracking-wider">Nova medição retroativa</p>
                  <input
                    type="date"
                    value={retroDate}
                    onChange={(e) => setRetroDate(e.target.value)}
                    className="w-full bg-surface-container rounded px-2 py-1.5 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={retroWeight}
                        onChange={(e) => setRetroWeight(weightMask(e.target.value))}
                        placeholder="Peso"
                        className="w-full bg-surface-container rounded px-2 py-1.5 pr-7 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">kg</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={retroHeight}
                        onChange={(e) => setRetroHeight(heightMask(e.target.value))}
                        placeholder="Altura"
                        className="w-full bg-surface-container rounded px-2 py-1.5 pr-8 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xs">cm</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleAddRetro}
                      disabled={saving || !retroDate || (!retroWeight && !retroHeight)}
                      className="flex-1 py-2 rounded-lg bg-primary/10 text-primary font-label text-xs font-semibold disabled:opacity-30"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => { setShowAddRetro(false); setRetroDate(''); setRetroWeight(''); setRetroHeight(''); }}
                      className="flex-1 py-2 rounded-lg bg-white/5 text-on-surface-variant font-label text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
      )}
    </div>
  );
}
