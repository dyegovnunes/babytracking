import { useState, useMemo, useCallback, useRef } from 'react';
import { WEIGHT_BOYS, WEIGHT_GIRLS, type OMSDataPoint } from '../lib/omsData';
import { MILESTONES, type Milestone } from '../features/milestones/milestoneData';
import { DEVELOPMENT_LEAPS, type DevelopmentLeap } from '../features/milestones/developmentLeaps';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface ReportVaccine {
  appliedAt: string;
  code: string | null;
  name: string;
  fullName: string | null;
  doseLabel: string | null;
  recommendedAgeDays: number | null;
  source: 'PNI' | 'SBP' | null;
}

interface ReportMilestone {
  code: string | null;
  achievedAt: string;
  photoUrl: string | null;
  note: string | null;
}

interface ReportLeapNote {
  leapId: number;
  note: string;
  updatedAt: string;
}

interface ReportMedication {
  id: string;
  name: string;
  dosage: string;
  frequencyHours: number;
  scheduleTimes: string[];
  durationType: 'continuous' | 'fixed';
  startDate: string;
  endDate: string | null;
}

interface ReportMedicationLog {
  medicationId: string;
  administeredAt: string;
}

type ReportAudience = 'pediatrician' | 'caregiver' | 'family';

interface ReportData {
  report: { name: string; expires_at: string | null; audience?: ReportAudience };
  baby: {
    name: string;
    birthDate: string;
    gender: string;
    photoUrl?: string;
    quietHoursStart: number;
    quietHoursEnd: number;
  };
  logs: { event_id: string; timestamp: number; ml?: number; duration?: number }[];
  measurements: { type: string; value: number; unit: string; measured_at: string }[];
  streak: { current_streak: number; longest_streak: number } | null;
  vaccines?: ReportVaccine[];
  milestones?: ReportMilestone[];
  leapNotes?: ReportLeapNote[];
  medications?: ReportMedication[];
  medicationLogs?: ReportMedicationLog[];
}

interface Stats {
  totalLogs: number;
  effectiveDays: number;
  feeding: { avgPerDay: number; avgInterval: number; dailyCounts: { date: string; count: number }[] };
  sleep: { avgTotal: number; avgNocturnal: number; avgDiurnal: number; longestBlock: number; dailyData: { date: string; noct: number; diur: number }[] };
  diapers: { avgPerDay: number; avgWet: number; avgDirty: number; dailyData: { date: string; wet: number; dirty: number }[] };
  growth: {
    weight: number | null; height: number | null;
    birthWeight: number | null; birthHeight: number | null;
    weightGain: number | null; heightGain: number | null;
    weightSpanDays: number | null;
    weightHistory: { months: number; value: number }[];
  } | null;
  patterns: string[];
}

interface Colors {
  bg: string; text: string; accent: string; accent2: string; accentDim: string;
  card: string; cardBorder: string; cardHighlight: string; headerBorder: string;
  muted: string; faint: string; veryFaint: string;
  green: string; greenBg: string; greenBorder: string; yellow: string; red: string;
  chartLine: string; shadow: string; tooltipBg: string;
}

const DARK: Colors = {
  bg: '#0d0a27', text: '#e7e2ff', accent: '#b79fff', accent2: '#ff96b9', accentDim: '#ab8ffe',
  card: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(183,159,255,0.12)',
  cardHighlight: 'rgba(183,159,255,0.1)', headerBorder: 'rgba(183,159,255,0.1)',
  muted: 'rgba(231,226,255,0.55)', faint: 'rgba(231,226,255,0.4)', veryFaint: 'rgba(231,226,255,0.2)',
  green: '#4CAF50', greenBg: 'rgba(76,175,80,0.05)', greenBorder: 'rgba(76,175,80,0.15)',
  yellow: '#FFB300', red: '#EF5350', chartLine: 'rgba(255,150,185,0.6)',
  shadow: 'none', tooltipBg: '#1a1540',
};

const LIGHT: Colors = {
  bg: '#f8f7ff', text: '#1a1635', accent: '#7c5cbf', accent2: '#d44b73', accentDim: '#9b7de6',
  card: '#ffffff', cardBorder: 'rgba(124,92,191,0.12)',
  cardHighlight: 'rgba(124,92,191,0.06)', headerBorder: 'rgba(124,92,191,0.12)',
  muted: 'rgba(26,22,53,0.6)', faint: 'rgba(26,22,53,0.45)', veryFaint: 'rgba(26,22,53,0.2)',
  green: '#2e7d32', greenBg: 'rgba(46,125,50,0.06)', greenBorder: 'rgba(46,125,50,0.15)',
  yellow: '#f57f17', red: '#c62828', chartLine: 'rgba(212,75,115,0.5)',
  shadow: '0 1px 3px rgba(0,0,0,0.08)', tooltipBg: '#ffffff',
};

// ─── Age-based reference ranges ───────────────
interface AgeRanges { feed: [number, number]; sleep: [number, number]; diapers: [number, number] }

function getAgeRanges(birthDate: string): AgeRanges {
  const ageMonths = (Date.now() - new Date(birthDate).getTime()) / (30.44 * 86400000);
  if (ageMonths < 1) return { feed: [8, 12], sleep: [840, 1020], diapers: [8, 12] };
  if (ageMonths < 3) return { feed: [7, 9], sleep: [840, 1020], diapers: [6, 10] };
  if (ageMonths < 6) return { feed: [6, 8], sleep: [720, 960], diapers: [6, 10] };
  if (ageMonths < 9) return { feed: [5, 7], sleep: [720, 900], diapers: [4, 8] };
  return { feed: [3, 5], sleep: [660, 840], diapers: [4, 8] };
}

function trafficLight(value: number, min: number, max: number): 'green' | 'yellow' | 'red' {
  if (value >= min && value <= max) return 'green';
  if (value >= min * 0.9 && value <= max * 1.1) return 'yellow';
  return 'red';
}

function trafficColor(status: 'green' | 'yellow' | 'red', c: Colors): string {
  return status === 'green' ? c.green : status === 'yellow' ? c.yellow : c.red;
}

// ─── Date Filters ─────────────────────────────
type FilterKey = 'today' | 'yesterday' | '7d' | '15d' | '30d' | 'month' | 'last_month' | 'all';

const FILTERS: { key: FilterKey; label: string; minDays: number }[] = [
  { key: 'today', label: 'Hoje', minDays: 0 },
  { key: 'yesterday', label: 'Ontem', minDays: 0 },
  { key: '7d', label: 'Últimos 7 dias', minDays: 2 },
  { key: '15d', label: 'Últimos 15 dias', minDays: 8 },
  { key: '30d', label: 'Últimos 30 dias', minDays: 16 },
  { key: 'month', label: 'Mês atual', minDays: 0 },
  { key: 'last_month', label: 'Mês passado', minDays: 0 },
  { key: 'all', label: 'Tudo', minDays: 0 },
];

function getFilterRange(key: FilterKey): { start: number; end: number } {
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  switch (key) {
    case 'today': return { start: todayStart.getTime(), end: now };
    case 'yesterday': {
      const y = new Date(todayStart); y.setDate(y.getDate() - 1);
      const ye = new Date(y); ye.setHours(23, 59, 59, 999);
      return { start: y.getTime(), end: ye.getTime() };
    }
    case '7d': return { start: now - 7 * 86400000, end: now };
    case '15d': return { start: now - 15 * 86400000, end: now };
    case '30d': return { start: now - 30 * 86400000, end: now };
    case 'month': return { start: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).getTime(), end: now };
    case 'last_month': {
      const s = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
      const e = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59, 999);
      return { start: s.getTime(), end: e.getTime() };
    }
    case 'all': return { start: 0, end: now };
  }
}

function getFilterAvailability(logs: { timestamp: number }[]): Record<FilterKey, boolean> {
  if (logs.length === 0) return { today: false, yesterday: false, '7d': false, '15d': false, '30d': false, month: false, last_month: false, all: false };
  const now = Date.now();
  const oldest = Math.min(...logs.map(l => l.timestamp));
  const dataSpanDays = (now - oldest) / 86400000;
  const result: Record<string, boolean> = {};
  for (const f of FILTERS) {
    if (f.key === 'today') {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      result[f.key] = logs.some(l => l.timestamp >= todayStart.getTime());
    } else if (f.key === 'yesterday') {
      const r = getFilterRange('yesterday');
      result[f.key] = logs.some(l => l.timestamp >= r.start && l.timestamp <= r.end);
    } else if (f.key === 'month') {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      result[f.key] = logs.some(l => l.timestamp >= monthStart);
    } else if (f.key === 'last_month') {
      const r = getFilterRange('last_month');
      result[f.key] = logs.some(l => l.timestamp >= r.start && l.timestamp <= r.end);
    } else if (f.key === 'all') {
      result[f.key] = true;
    } else {
      result[f.key] = dataSpanDays >= f.minDays;
    }
  }
  return result as Record<FilterKey, boolean>;
}

// ─── Stats ────────────────────────────────
const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle']);

/**
 * Trata janela noturna tanto atravessando meia-noite (22-7, padrão) quanto
 * janela simples dentro do mesmo dia (caso raro, ex: 0-12).
 */
function makeIsNight(start: number, end: number): (ts: number) => boolean {
  const wraps = start > end;
  return (ts: number) => {
    const h = new Date(ts).getHours();
    return wraps ? h >= start || h < end : h >= start && h < end;
  };
}

function computeStats(data: ReportData, startTs: number, endTs: number, nightStart: number, nightEnd: number): Stats {
  const isNight = makeIsNight(nightStart, nightEnd);
  const logs = data.logs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);
  const uniqueDays = new Set(logs.map(l => new Date(l.timestamp).toDateString()));
  const effectiveDays = Math.max(1, uniqueDays.size);
  const rangeDays = Math.max(1, Math.ceil((endTs - startTs) / 86400000));
  const chartDays = Math.min(rangeDays, 60);
  const chartStart = endTs - chartDays * 86400000;

  const dayLabel = (ts: number) => { const d = new Date(ts); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`; };

  // Feeding
  const feedLogs = logs.filter(l => FEED_IDS.has(l.event_id)).sort((a, b) => a.timestamp - b.timestamp);
  const feedAvg = feedLogs.length / effectiveDays;
  const intervals: number[] = [];
  for (let i = 1; i < feedLogs.length; i++) {
    const diff = (feedLogs[i].timestamp - feedLogs[i - 1].timestamp) / 60000;
    if (diff < 720) intervals.push(diff);
  }
  const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  const feedDaily: { date: string; count: number }[] = [];
  for (let d = 0; d < chartDays; d++) {
    const ds = chartStart + d * 86400000;
    const de = ds + 86400000;
    feedDaily.push({ date: dayLabel(ds), count: feedLogs.filter(l => l.timestamp >= ds && l.timestamp < de).length });
  }

  // Sleep
  const sleepStartIds = new Set(['sleep', 'sleep_start']);
  const sleepEndIds = new Set(['wake', 'sleep_end']);
  const sleepLogs = logs.filter(l => sleepStartIds.has(l.event_id) || sleepEndIds.has(l.event_id)).sort((a, b) => a.timestamp - b.timestamp);
  // State machine: evita double-counting quando há dois 'sleep' sem 'wake' entre eles,
  // que era a causa de dias com sono noturno zerado no gráfico.
  const pairs: { start: number; end: number }[] = [];
  let sleepStart: number | null = null;
  for (const log of sleepLogs) {
    if (sleepStartIds.has(log.event_id)) {
      if (sleepStart === null) sleepStart = log.timestamp; // ignora sleep duplicado
    } else {
      if (sleepStart !== null) {
        pairs.push({ start: sleepStart, end: log.timestamp });
        sleepStart = null;
      }
      // wake sem sleep anterior é ignorado
    }
  }
  const noctPairs = pairs.filter(p => isNight(p.start));
  const diurPairs = pairs.filter(p => !isNight(p.start));
  const totalNoct = noctPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0);
  const totalDiur = diurPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0);
  const longestBlock = pairs.length > 0 ? Math.max(...pairs.map(p => (p.end - p.start) / 60000)) : 0;
  // Distribui cada sessão pelos dias em que ela ocorre via sobreposição de intervalos.
  // Garante que sono noturno que termina de manhã apareça corretamente no dia seguinte.
  const sleepDaily: { date: string; noct: number; diur: number }[] = [];
  for (let d = 0; d < chartDays; d++) {
    const ds = chartStart + d * 86400000;
    const de = ds + 86400000;
    let noct = 0, diur = 0;
    for (const p of pairs) {
      if (p.end <= ds || p.start >= de) continue;
      const oStart = Math.max(p.start, ds);
      const oEnd = Math.min(p.end, de);
      if (isNight(oStart)) noct += (oEnd - oStart) / 60000;
      else diur += (oEnd - oStart) / 60000;
    }
    sleepDaily.push({ date: dayLabel(ds), noct, diur });
  }

  // Diapers
  const wetLogs = logs.filter(l => l.event_id === 'diaper_wet');
  const dirtyLogs = logs.filter(l => l.event_id === 'diaper_dirty');
  const diaperDaily: { date: string; wet: number; dirty: number }[] = [];
  for (let d = 0; d < chartDays; d++) {
    const ds = chartStart + d * 86400000;
    const de = ds + 86400000;
    diaperDaily.push({
      date: dayLabel(ds),
      wet: wetLogs.filter(l => l.timestamp >= ds && l.timestamp < de).length,
      dirty: dirtyLogs.filter(l => l.timestamp >= ds && l.timestamp < de).length,
    });
  }

  // Growth
  let growth: Stats['growth'] = null;
  const weights = data.measurements.filter(m => m.type === 'weight').sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  const heights = data.measurements.filter(m => m.type === 'height').sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  if (weights.length > 0 || heights.length > 0) {
    const birthDate = new Date(data.baby.birthDate);
    growth = {
      weight: weights.length > 0 ? Number(weights[0].value) : null,
      height: heights.length > 0 ? Number(heights[0].value) : null,
      birthWeight: weights.length > 0 ? Number(weights[weights.length - 1].value) : null,
      birthHeight: heights.length > 0 ? Number(heights[heights.length - 1].value) : null,
      weightGain: weights.length >= 2 ? Number(weights[0].value) - Number(weights[weights.length - 1].value) : null,
      heightGain: heights.length >= 2 ? Number(heights[0].value) - Number(heights[heights.length - 1].value) : null,
      weightSpanDays: weights.length >= 2
        ? (new Date(weights[0].measured_at).getTime() - new Date(weights[weights.length - 1].measured_at).getTime()) / 86400000
        : null,
      weightHistory: weights.map(w => ({ months: (new Date(w.measured_at).getTime() - birthDate.getTime()) / (30.44 * 86400000), value: Number(w.value) })).reverse(),
    };
  }

  // Patterns
  const ageRanges = getAgeRanges(data.baby.birthDate);
  const patterns: string[] = [];
  const totalSleepAvg = (totalNoct + totalDiur) / effectiveDays;
  if (trafficLight(feedAvg, ageRanges.feed[0], ageRanges.feed[1]) === 'green') patterns.push('Amamentações estáveis no período');
  if (growth?.weightGain != null && growth.weightGain > 0 && growth.weightSpanDays != null && growth.weightSpanDays > 0) {
    const gainG = Math.round(growth.weightGain * 1000);
    const days = Math.round(growth.weightSpanDays);
    const gPerWeek = Math.round(gainG / Math.max(1, growth.weightSpanDays / 7));
    patterns.push(`Ganho de peso: +${gainG}g em ${days} dias (~${gPerWeek}g/semana)`);
  }
  if (longestBlock >= 240) patterns.push(`Maior bloco de sono contínuo: ${Math.floor(longestBlock / 60)}h${Math.round(longestBlock % 60).toString().padStart(2, '0')}`);
  if (trafficLight(totalSleepAvg, ageRanges.sleep[0], ageRanges.sleep[1]) === 'green') patterns.push('Qualidade do sono excelente no período');

  return {
    totalLogs: logs.length, effectiveDays,
    feeding: { avgPerDay: feedAvg, avgInterval, dailyCounts: feedDaily },
    sleep: { avgTotal: totalSleepAvg, avgNocturnal: totalNoct / effectiveDays, avgDiurnal: totalDiur / effectiveDays, longestBlock, dailyData: sleepDaily },
    diapers: { avgPerDay: (wetLogs.length + dirtyLogs.length) / effectiveDays, avgWet: wetLogs.length / effectiveDays, avgDirty: dirtyLogs.length / effectiveDays, dailyData: diaperDaily },
    growth, patterns,
  };
}

// ─── Formatters ────────────────────────────────
function fmtHours(min: number): string { if (min <= 0) return '0h'; const h = Math.floor(min / 60); const m = Math.round(min % 60); return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`; }
function fmtMin(min: number): string { if (min <= 0) return '0min'; const h = Math.floor(min / 60); const m = Math.round(min % 60); return h > 0 ? `${h}h${m}min` : `${m}min`; }
function parseLocal(d: string | number): Date { if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day); } return new Date(d); }
function fmtDate(d: string | number): string { const dt = parseLocal(d); return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`; }
function fmtDateShort(d: string | number): string { const dt = parseLocal(d); return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`; }
function fmtAge(birthDate: string): string {
  const totalDays = Math.floor((Date.now() - parseLocal(birthDate).getTime()) / 86400000);
  if (totalDays <= 0) return 'Recém-nascido';
  if (totalDays < 30) return `${totalDays} dias`;
  const months = Math.floor(totalDays / 30.44);
  const remainDays = Math.floor(totalDays - months * 30.44);
  if (months < 12) return remainDays > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainDays} dias` : `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12); const rm = months % 12;
  return rm > 0 ? `${years} ano${years > 1 ? 's' : ''} e ${rm} ${rm === 1 ? 'mês' : 'meses'}` : `${years} ano${years > 1 ? 's' : ''}`;
}

// ─── Content lookups (vaccines / milestones / leaps / medications) ───

/** Rótulo legível para agrupar vacinas por idade recomendada (em dias). */
function vaccineAgeLabel(days: number | null): string {
  if (days == null) return 'Outras';
  if (days === 0) return 'Ao nascer';
  const months = Math.round(days / 30);
  if (months < 1) return `${days} dias`;
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

const MILESTONE_INDEX: Record<string, Milestone> = Object.fromEntries(
  MILESTONES.map((m) => [m.code, m]),
);

const LEAP_INDEX: Record<number, DevelopmentLeap> = Object.fromEntries(
  DEVELOPMENT_LEAPS.map((l) => [l.id, l]),
);

/** Semana (contada a partir do nascimento) para descobrir o salto ativo. */
function currentWeek(birthDate: string): number {
  const ms = Date.now() - parseLocal(birthDate).getTime();
  return Math.max(0, Math.floor(ms / (7 * 86400000)));
}

function getActiveLeap(birthDate: string): DevelopmentLeap | null {
  const w = currentWeek(birthDate);
  return DEVELOPMENT_LEAPS.find((l) => w >= l.weekStart && w <= l.weekEnd) ?? null;
}

/**
 * Próxima dose estimada para um medicamento com frequência em horas.
 * Retorna texto curto como "em 2h30" ou "agora" (null se não pode estimar).
 */
function nextDoseRelative(med: ReportMedication, lastLogTs: number | null): string | null {
  if (!med.frequencyHours || !lastLogTs) return null;
  const nextTs = lastLogTs + med.frequencyHours * 3600_000;
  const diffMs = nextTs - Date.now();
  if (diffMs <= 0) return 'agora';
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `em ${diffMin}min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `em ${h}h` : `em ${h}h${m.toString().padStart(2, '0')}`;
}

// ─── Interactive Charts ─────────────────────────
function BarChartInteractive({ data, c, refLine, unit = '' }: { data: { date: string; value: number }[]; c: Colors; refLine?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100; const h = 44;
  const barW = w / data.length;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full" preserveAspectRatio="none" style={{ height: '4rem' }}>
        {refLine != null && (
          <line x1={0} y1={h - (refLine / max) * h} x2={w} y2={h - (refLine / max) * h}
            stroke={c.accent2} strokeWidth={0.4} strokeDasharray="2,1.5" opacity={0.6} />
        )}
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * h, 0.5);
          const isHovered = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={i * barW} y={0} width={barW} height={h + 4} fill="transparent" />
              <rect x={i * barW + 0.15} y={h - barH} width={barW - 0.3} height={barH}
                fill={c.accent} opacity={isHovered ? 0.9 : 0.6} rx={0.2} />
              {isHovered && d.value > 0 && (
                <text x={i * barW + barW / 2} y={h - barH - 1.5} fontSize={3.2} fontWeight="bold"
                  fill={c.text} textAnchor="middle">{d.value}{unit}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-semibold pointer-events-none z-10"
          style={{ backgroundColor: c.tooltipBg, color: c.text, border: `1px solid ${c.cardBorder}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {data[hover].date}: {data[hover].value}{unit}
        </div>
      )}
    </div>
  );
}

function SleepChartInteractive({ data, c }: { data: { date: string; noct: number; diur: number }[]; c: Colors }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.noct + d.diur), 1);
  const w = 100; const h = 44;
  const step = w / data.length;
  const fh = (min: number) => { const hrs = Math.floor(min / 60); const m = Math.round(min % 60); return m > 0 ? `${hrs}h${m.toString().padStart(2, '0')}` : `${hrs}h`; };
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full" preserveAspectRatio="none" style={{ height: '4rem' }}>
        {data.map((d, i) => {
          const totalH = ((d.noct + d.diur) / max) * h;
          const noctH = (d.noct / max) * h;
          const isHovered = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={i * step} y={0} width={step} height={h + 4} fill="transparent" />
              <rect x={i * step + 0.1} y={h - totalH} width={step - 0.2} height={totalH} fill={c.accentDim} opacity={isHovered ? 0.5 : 0.3} rx={0.2} />
              <rect x={i * step + 0.1} y={h - noctH} width={step - 0.2} height={noctH} fill={c.accent} opacity={isHovered ? 1 : 0.8} rx={0.2} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-semibold pointer-events-none z-10"
          style={{ backgroundColor: c.tooltipBg, color: c.text, border: `1px solid ${c.cardBorder}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {data[hover].date}: {fh(data[hover].noct)} not + {fh(data[hover].diur)} diur
        </div>
      )}
    </div>
  );
}

function DiaperChartInteractive({ data, c }: { data: { date: string; wet: number; dirty: number }[]; c: Colors }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.wet + d.dirty), 1);
  const w = 100; const h = 44;
  const step = w / data.length;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="w-full" preserveAspectRatio="none" style={{ height: '4rem' }}>
        {data.map((d, i) => {
          const wetH = (d.wet / max) * h;
          const dirtyH = (d.dirty / max) * h;
          const isHovered = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={i * step} y={0} width={step} height={h + 4} fill="transparent" />
              <rect x={i * step + 0.1} y={h - wetH - dirtyH} width={step - 0.2} height={wetH} fill={c.accent} opacity={isHovered ? 0.7 : 0.5} rx={0.2} />
              <rect x={i * step + 0.1} y={h - dirtyH} width={step - 0.2} height={dirtyH} fill={c.accent2} opacity={isHovered ? 0.7 : 0.5} rx={0.2} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-semibold pointer-events-none z-10"
          style={{ backgroundColor: c.tooltipBg, color: c.text, border: `1px solid ${c.cardBorder}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {data[hover].date}: {data[hover].wet} xixi + {data[hover].dirty} cocô
        </div>
      )}
    </div>
  );
}

function OMSCurve({ history, gender, c }: { history: { months: number; value: number }[]; gender: 'boy' | 'girl'; c: Colors }) {
  // Seleciona curva OMS por gênero (dados em app/src/lib/omsData.ts, vão até 24 meses).
  const omsData: OMSDataPoint[] = gender === 'girl' ? WEIGHT_GIRLS : WEIGHT_BOYS;
  const maxMonth = Math.max(...history.map(h => h.months), 6);
  const omsMaxMonth = omsData[omsData.length - 1].months;
  // Corta a curva em maxMonth + 3 meses de folga, sem ultrapassar o fim da tabela OMS.
  const cutMonth = Math.min(maxMonth + 3, omsMaxMonth);
  const visibleOms = omsData.filter(p => p.months <= cutMonth);
  const allVals = [
    ...visibleOms.map(p => p.p3),
    ...visibleOms.map(p => p.p97),
    ...history.map(h => h.value),
  ];
  const minVal = Math.min(...allVals) * 0.9;
  const maxVal = Math.max(...allVals) * 1.05;
  const w = 400; const h = 180; const pad = { top: 15, right: 30, bottom: 25, left: 35 };
  const cw = w - pad.left - pad.right; const ch = h - pad.top - pad.bottom;
  const sx = (m: number) => pad.left + (m / cutMonth) * cw;
  const sy = (v: number) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch;
  const toPath = (pts: OMSDataPoint[], key: keyof Pick<OMSDataPoint, 'p3' | 'p50' | 'p97'>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.months)},${sy(p[key])}`).join(' ');
  const last = history[history.length - 1];
  const lastOms = visibleOms[visibleOms.length - 1];
  // Tick labels: 0, 2, 4... até cutMonth (inclui cutMonth se não for múltiplo de 2).
  const ticks: number[] = [];
  for (let m = 0; m <= cutMonth; m += 2) ticks.push(m);
  if (cutMonth % 2 !== 0) ticks.push(cutMonth);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {Array.from({ length: 5 }, (_, i) => <line key={i} x1={pad.left} y1={pad.top + ch * (i / 4)} x2={w - pad.right} y2={pad.top + ch * (i / 4)} stroke={c.accent} strokeWidth={0.15} />)}
      <path d={toPath(visibleOms, 'p97')} fill="none" stroke={c.accent} strokeWidth={0.8} strokeDasharray="3,2" opacity={0.4} />
      <path d={toPath(visibleOms, 'p50')} fill="none" stroke={c.accent} strokeWidth={1} opacity={0.5} />
      <path d={toPath(visibleOms, 'p3')} fill="none" stroke={c.accent} strokeWidth={0.8} strokeDasharray="3,2" opacity={0.4} />
      {lastOms && <text x={w - pad.right + 3} y={sy(lastOms.p97)} fontSize={7} fill={c.accent} opacity={0.5}>P97</text>}
      {lastOms && <text x={w - pad.right + 3} y={sy(lastOms.p50)} fontSize={7} fill={c.accent} opacity={0.5}>P50</text>}
      {lastOms && <text x={w - pad.right + 3} y={sy(lastOms.p3)} fontSize={7} fill={c.accent} opacity={0.5}>P3</text>}
      {history.length >= 2 && <path d={history.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.months)},${sy(p.value)}`).join(' ')} fill="none" stroke={c.accentDim} strokeWidth={2} />}
      {history.map((p, i) => <circle key={i} cx={sx(p.months)} cy={sy(p.value)} r={i === history.length - 1 ? 4 : 2.5} fill={c.accentDim} />)}
      {last && <text x={sx(last.months)} y={sy(last.value) - 8} fontSize={8} fontWeight="bold" fill={c.text} textAnchor="end">{last.value.toFixed(1)}kg</text>}
      {ticks.map((m) => <text key={m} x={sx(m)} y={h - 4} fontSize={7} fill={c.accent} opacity={0.5} textAnchor="middle">{m}m</text>)}
      {Array.from({ length: 5 }, (_, i) => { const v = minVal + (maxVal - minVal) * (1 - i / 4); return <text key={i} x={pad.left - 4} y={pad.top + ch * (i / 4) + 3} fontSize={7} fill={c.accent} opacity={0.5} textAnchor="end">{v.toFixed(1)}</text>; })}
    </svg>
  );
}

// ═══════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════
export default function SharedReportPage() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [filter, setFilter] = useState<FilterKey | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const token = window.location.pathname.split('/r/')[1]?.split('/')[0] ?? '';
  const c = dark ? DARK : LIGHT;

  const filterAvail = useMemo(() => data ? getFilterAvailability(data.logs) : ({} as Record<FilterKey, boolean>), [data]);

  // Ordem de preferência para o default: o maior filtro com dados disponíveis.
  // Assim bebê novo (<2d) cai em "today"/"all" sem "7d" vazio.
  const DEFAULT_PRIORITY: FilterKey[] = ['30d', '15d', '7d', 'today', 'yesterday', 'all'];
  const defaultFilter: FilterKey = DEFAULT_PRIORITY.find((k) => filterAvail[k]) ?? 'all';
  const activeFilter = filter ?? defaultFilter;
  const range = useMemo(() => getFilterRange(activeFilter), [activeFilter]);
  const stats = useMemo(
    () => data ? computeStats(data, range.start, range.end, data.baby.quietHoursStart, data.baby.quietHoursEnd) : null,
    [data, range],
  );

  // Opções visíveis no dropdown: esconde as sem dado em vez de desabilitar.
  // "Tudo" sempre fica disponível (é o fallback seguro).
  const visibleFilters = useMemo(
    () => FILTERS.filter((f) => f.key === 'all' || filterAvail[f.key]),
    [filterAvail],
  );

  // ─── Hooks de conteúdo (precisam vir ANTES de qualquer early return
  //     para respeitar a regra dos hooks — tolerem data === null). ───

  const audience: ReportAudience = data?.report.audience ?? 'pediatrician';
  const babyName = data?.baby.name ?? '';

  const cta = useMemo(() => {
    if (audience === 'caregiver') {
      return {
        title: 'Adicione esse link aos favoritos',
        subtitle: 'Acesse rápido durante os turnos.',
        btnLabel: 'Conhecer o Yaya',
        whatsappText: `Oi! Uso o Yaya para acompanhar ${babyName}. Link do app: https://yayababy.app`,
      };
    }
    if (audience === 'family') {
      return {
        title: `Acompanhe ${babyName} pelo Yaya`,
        subtitle: 'Veja marcos e novidades em primeira mão.',
        btnLabel: 'Baixar o Yaya',
        whatsappText: `Olha só ${babyName}! Acompanho pelo Yaya: https://yayababy.app`,
      };
    }
    return {
      title: 'Recomende o Yaya para seus pacientes',
      subtitle: 'Pais organizados trazem dados melhores para a consulta.',
      btnLabel: 'Compartilhar no WhatsApp',
      whatsappText: 'Conheça o Yaya — o app que ajuda pais a acompanhar a rotina do bebê com calma e clareza.\n\nhttps://yayababy.app',
    };
  }, [audience, babyName]);

  const vaccinesByAge = useMemo(() => {
    const vacs = data?.vaccines ?? [];
    if (vacs.length === 0) return [];
    const groups = new Map<string, { days: number; label: string; items: ReportVaccine[] }>();
    for (const v of vacs) {
      const label = vaccineAgeLabel(v.recommendedAgeDays);
      const key = `${v.recommendedAgeDays ?? -1}`;
      if (!groups.has(key)) groups.set(key, { days: v.recommendedAgeDays ?? -1, label, items: [] });
      groups.get(key)!.items.push(v);
    }
    return Array.from(groups.values()).sort((a, b) => a.days - b.days);
  }, [data?.vaccines]);

  const recentMilestones = useMemo(() => {
    const ms = data?.milestones ?? [];
    const cutoff = Date.now() - 60 * 86400000;
    return ms
      .filter((m) => m.code && new Date(m.achievedAt).getTime() >= cutoff)
      .map((m) => ({ ...m, meta: MILESTONE_INDEX[m.code as string] }))
      .filter((m) => m.meta);
  }, [data?.milestones]);

  const activeLeap = useMemo(
    () => data ? getActiveLeap(data.baby.birthDate) : null,
    [data],
  );

  const leapNotesResolved = useMemo(() => {
    const notes = data?.leapNotes ?? [];
    return notes
      .map((n) => ({ ...n, meta: LEAP_INDEX[n.leapId] }))
      .filter((n) => n.meta)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data?.leapNotes]);

  const liveSnapshot = useMemo(() => {
    const all = data?.logs ?? [];
    const latestOf = (ids: string[]) => {
      let max = 0;
      for (const l of all) if (ids.includes(l.event_id) && l.timestamp > max) max = l.timestamp;
      return max || null;
    };
    const now = Date.now();
    const fmtRelative = (ts: number | null): string => {
      if (!ts) return '—';
      const diffMin = Math.round((now - ts) / 60000);
      if (diffMin < 1) return 'agora há pouco';
      if (diffMin < 60) return `há ${diffMin}min`;
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      if (h < 24) return m === 0 ? `há ${h}h` : `há ${h}h${m.toString().padStart(2, '0')}`;
      return fmtDateShort(ts);
    };
    const fmtClock = (ts: number | null): string => {
      if (!ts) return '';
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    const lastDiaper = latestOf(['diaper_wet', 'diaper_dirty']);
    const lastFeed = latestOf(['breast_left', 'breast_right', 'breast_both', 'bottle']);
    const lastSleepStart = latestOf(['sleep', 'sleep_start']);
    const lastWake = latestOf(['wake', 'sleep_end']);
    const currentlySleeping = lastSleepStart && (!lastWake || lastSleepStart > lastWake);
    return {
      diaper: { ts: lastDiaper, rel: fmtRelative(lastDiaper), clock: fmtClock(lastDiaper) },
      feed:   { ts: lastFeed,   rel: fmtRelative(lastFeed),   clock: fmtClock(lastFeed) },
      sleep:  currentlySleeping
        ? { ts: lastSleepStart, rel: `dormindo há ${fmtRelative(lastSleepStart).replace('há ', '')}`, clock: fmtClock(lastSleepStart), sleeping: true }
        : { ts: lastWake,       rel: fmtRelative(lastWake),                                          clock: fmtClock(lastWake),       sleeping: false },
    };
  }, [data?.logs]);

  const medicationsWithNext = useMemo(() => {
    const meds = data?.medications ?? [];
    const logs = data?.medicationLogs ?? [];
    const lastByMed = new Map<string, number>();
    for (const l of logs) {
      const ts = new Date(l.administeredAt).getTime();
      const prev = lastByMed.get(l.medicationId) ?? 0;
      if (ts > prev) lastByMed.set(l.medicationId, ts);
    }
    return meds.map((m) => ({
      ...m,
      lastDoseTs: lastByMed.get(m.id) ?? null,
      nextLabel: nextDoseRelative(m, lastByMed.get(m.id) ?? null),
    }));
  }, [data?.medications, data?.medicationLogs]);

  if (data) document.title = `Yaya — Resumo de ${data.baby.name}`;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;
    setLoading(true); setError(null);
    try {
      // fetch direto requer headers apikey + Authorization pra passar no gateway
      // do Supabase (mesmo em funções com verify_jwt=false). Sem isso o gateway
      // retorna 401 com body não-JSON e a gente caía em "Erro de conexão".
      const res = await fetch(`${supabaseUrl}/functions/v1/report-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ token, password }),
      });
      let json: any = null;
      try { json = await res.json(); } catch { /* resposta não-JSON do gateway */ }
      if (!res.ok) {
        setError(json?.error || `Erro ao acessar relatório (${res.status})`);
        return;
      }
      setData(json);
    } catch (err: any) {
      setError(`Erro de conexão: ${err?.message || 'tente novamente'}`);
    } finally {
      setLoading(false);
    }
  }, [token, password]);

  // ─── PASSWORD SCREEN ──────
  if (!data) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mx-auto mb-5">
              <img src="/logo-symbol.png" alt="Yaya" className="w-24 h-24" style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)' }} />
            </div>
            <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Ya<span className="text-primary">ya</span></h1>
            <p className="font-label text-sm text-on-surface-variant mt-2">Cada momento conta.</p>
          </div>
          <div className="page-enter">
            <form onSubmit={handleSubmit}>
              <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-2">Senha de acesso</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite a senha"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40 mb-4" autoFocus />
              {error && <p className="font-label text-sm text-error mb-4">{error}</p>}
              <button type="submit" disabled={loading || !password}
                className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity">
                {loading ? <span className="material-symbols-outlined animate-spin text-xl align-middle">progress_activity</span> : 'Acessar relatório'}
              </button>
              <p className="text-center font-label text-xs text-on-surface-variant mt-4">Dados protegidos por senha. Não substitui avaliação clínica.</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const baby = data.baby;
  const ageRanges = getAgeRanges(baby.birthDate);
  const periodEnd = fmtDateShort(range.end);
  const periodStart = fmtDateShort(range.start === 0 ? Math.min(...data.logs.map(l => l.timestamp)) : range.start);
  const chartLabel = activeFilter === 'today' ? 'Hoje' : `${stats.effectiveDays} dias`;
  const feedStatus = trafficLight(stats.feeding.avgPerDay, ageRanges.feed[0], ageRanges.feed[1]);
  const sleepStatus = trafficLight(stats.sleep.avgTotal, ageRanges.sleep[0], ageRanges.sleep[1]);
  const diaperStatus = trafficLight(stats.diapers.avgPerDay, ageRanges.diapers[0], ageRanges.diapers[1]);
  const babyInitial = baby.name.charAt(0).toUpperCase();

  const whatsappText = encodeURIComponent(cta.whatsappText);

  return (
    <div className="min-h-screen print:bg-white" style={{ backgroundColor: c.bg, fontFamily: 'Plus Jakarta Sans, sans-serif' }} ref={reportRef}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { margin: 10mm 8mm; size: A4; }
        }
      `}</style>
      <div className="max-w-3xl mx-auto">

        {/* ── HEADER BAR ── */}
        <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
            Ya<span style={{ color: c.accent }}>ya</span>
          </h1>
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={() => window.print()} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }} title="Baixar PDF">
              <span className="material-symbols-outlined text-lg" style={{ color: c.accent }}>download</span>
            </button>
            <button onClick={() => setDark(!dark)} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }} title={dark ? 'Modo claro' : 'Modo escuro'}>
              <span className="material-symbols-outlined text-lg" style={{ color: c.accent }}>{dark ? 'light_mode' : 'dark_mode'}</span>
            </button>
          </div>
        </div>

        {/* ── BABY INFO ── */}
        <div className="px-4 sm:px-6 pb-4" style={{ borderBottom: `1px solid ${c.headerBorder}` }}>
          <div className="flex items-center gap-3 mb-3">
            {baby.photoUrl ? (
              <img src={baby.photoUrl} alt={baby.name} className="w-11 h-11 rounded-full object-cover shrink-0" style={{ border: `2px solid ${c.accent}` }} />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                style={{ backgroundColor: c.cardHighlight, border: `2px solid ${c.accent}`, color: c.accent }}>{babyInitial}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>{baby.name}</p>
              <p className="text-xs" style={{ color: c.muted }}>{fmtAge(baby.birthDate)} · Nasc: {fmtDate(baby.birthDate)}</p>
            </div>
            <div className="shrink-0 text-right print:hidden">
              <select value={activeFilter} onChange={(e) => setFilter(e.target.value as FilterKey)}
                className="text-xs font-semibold rounded-lg px-2.5 py-1.5 appearance-none cursor-pointer outline-none"
                style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, color: c.text,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='${encodeURIComponent(c.accent)}' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' }}>
                {visibleFilters.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <p className="text-[10px] mt-1" style={{ color: c.faint }}>{periodStart} — {periodEnd}</p>
            </div>
          </div>
          {stats.effectiveDays < 7 && stats.effectiveDays > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px]" style={{ backgroundColor: c.cardHighlight, color: c.muted, border: `1px solid ${c.cardBorder}` }}>
              <span className="material-symbols-outlined text-sm" style={{ color: c.yellow }}>info</span>
              Dados baseados em {stats.effectiveDays} {stats.effectiveDays === 1 ? 'dia' : 'dias'} de registro.
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-5 print:px-6">

          {/* ── AGORA (cuidadora) ── */}
          {audience === 'caregiver' && (
            <Section icon="schedule" title="Agora" c={c}>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>baby_changing_station</span>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Última fralda</p>
                  </div>
                  <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    {liveSnapshot.diaper.clock || '—'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: c.faint }}>{liveSnapshot.diaper.rel}</p>
                </div>
                <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>restaurant</span>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Última mamada</p>
                  </div>
                  <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    {liveSnapshot.feed.clock || '—'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: c.faint }}>{liveSnapshot.feed.rel}</p>
                </div>
                <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>bedtime</span>
                    <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                      {liveSnapshot.sleep.sleeping ? 'Dormindo' : 'Último despertar'}
                    </p>
                  </div>
                  <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    {liveSnapshot.sleep.clock || '—'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: c.faint }}>{liveSnapshot.sleep.rel}</p>
                </div>
              </div>
            </Section>
          )}

          {/* ── KPIs (pediatra) ── */}
          {audience === 'pediatrician' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <KPI c={c} icon="restaurant" label="Amamentação" value={`${stats.feeding.avgPerDay.toFixed(1)}x`} sub="/dia"
                refText={`Ref: ${ageRanges.feed[0]}–${ageRanges.feed[1]}x`} status={feedStatus} />
              <KPI c={c} icon="bedtime" label="Sono total" value={fmtHours(stats.sleep.avgTotal)} sub="/dia"
                refText={`Ref: ${Math.round(ageRanges.sleep[0] / 60)}–${Math.round(ageRanges.sleep[1] / 60)}h`} status={sleepStatus} />
              <KPI c={c} icon="baby_changing_station" label="Fraldas" value={`${stats.diapers.avgPerDay.toFixed(1)}x`} sub="/dia"
                refText={`Ref: ${ageRanges.diapers[0]}–${ageRanges.diapers[1]}x`} status={diaperStatus} />
              <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>monitor_weight</span>
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Peso atual</p>
                </div>
                <p className="text-xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                  {stats.growth?.weight ? `${stats.growth.weight.toFixed(2)}kg` : '—'}
                </p>
                {stats.growth?.weightGain != null && stats.growth.weightGain > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: c.green }}>+{(stats.growth.weightGain * 1000).toFixed(0)}g no período</p>
                )}
              </div>
            </div>
          )}

          {/* ── AMAMENTAÇÃO / SONO / FRALDAS (pediatra) ── */}
          {audience === 'pediatrician' && <>
          <Section icon="restaurant" title="Amamentação" c={c}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Stat label="Média diária" value={`${stats.feeding.avgPerDay.toFixed(1)} sessões`} c={c} />
              <Stat label="Intervalo médio" value={fmtMin(stats.feeding.avgInterval)} c={c} />
              <div className="col-span-2 sm:col-span-1 p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Frequência {chartLabel}</span>
                  <span className="text-[10px] font-medium" style={{ color: c.chartLine }}>--- meta {ageRanges.feed[0]}x</span>
                </div>
                <BarChartInteractive data={stats.feeding.dailyCounts.map(d => ({ date: d.date, value: d.count }))} c={c} refLine={ageRanges.feed[0]} />
              </div>
            </div>
          </Section>

          {/* ── SONO ── */}
          <Section icon="bedtime" title="Sono" c={c}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
              <div className="rounded-md p-2.5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs" style={{ color: c.accent }}>dark_mode</span>
                  <p className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Noturno</p>
                </div>
                <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>{fmtHours(stats.sleep.avgNocturnal)}</p>
                <p className="text-[9px] mt-0.5" style={{ color: c.faint }}>{baby.quietHoursStart}h às {baby.quietHoursEnd}h</p>
              </div>
              <div className="rounded-md p-2.5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs" style={{ color: c.accent }}>light_mode</span>
                  <p className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Diurno</p>
                </div>
                <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>{fmtHours(stats.sleep.avgDiurnal)}</p>
                <p className="text-[9px] mt-0.5" style={{ color: c.faint }}>{baby.quietHoursEnd}h às {baby.quietHoursStart}h</p>
              </div>
              <Stat label="Maior bloco" value={fmtHours(stats.sleep.longestBlock)} icon="hotel" c={c} />
              <div className="rounded-md p-2.5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <p className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Qualidade</p>
                <p className="text-base font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: trafficColor(sleepStatus, c) }}>
                  {sleepStatus === 'green' ? 'Excelente' : sleepStatus === 'yellow' ? 'Bom' : 'Atenção'}
                </p>
                <p className="text-[9px] mt-0.5" style={{ color: c.faint }}>
                  {sleepStatus === 'green' ? 'Dentro da faixa esperada' : sleepStatus === 'yellow' ? 'Próximo da faixa' : 'Fora da faixa esperada'}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Distribuição {chartLabel}</span>
                <div className="flex gap-3 text-[10px]" style={{ color: c.muted }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c.accent, opacity: 0.8 }} /> Noturno</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c.accentDim, opacity: 0.3 }} /> Diurno</span>
                </div>
              </div>
              <SleepChartInteractive data={stats.sleep.dailyData} c={c} />
            </div>
          </Section>

          {/* ── FRALDAS ── */}
          <Section icon="baby_changing_station" title="Fraldas" c={c}>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
              <div className="grid grid-cols-3 gap-2 col-span-2 sm:col-span-1">
                <Stat label="Total/dia" value={`${stats.diapers.avgPerDay.toFixed(1)}`} c={c} />
                <Stat label="Xixi/dia" value={`${stats.diapers.avgWet.toFixed(1)}`} c={c} />
                <Stat label="Cocô/dia" value={`${stats.diapers.avgDirty.toFixed(1)}`} c={c} />
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>Trocas {chartLabel}</span>
                  <div className="flex gap-2 text-[10px]" style={{ color: c.muted }}>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c.accent, opacity: 0.5 }} /> Xixi</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: c.accent2, opacity: 0.5 }} /> Cocô</span>
                  </div>
                </div>
                <DiaperChartInteractive data={stats.diapers.dailyData} c={c} />
              </div>
            </div>
          </Section>

          <div className="print:break-before-page" />
          </>}

          {/* ── CRESCIMENTO (pediatra + família) ── */}
          {stats.growth && audience !== 'caregiver' && (
            <Section icon="straighten" title="Crescimento" c={c}>
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Peso</p>
                  <p className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    {stats.growth.weight?.toFixed(1) ?? '—'}<span className="text-sm font-medium ml-0.5" style={{ color: c.faint }}>kg</span>
                  </p>
                  <div className="flex justify-between text-[10px] mt-1.5 pt-1.5" style={{ color: c.muted, borderTop: `1px solid ${c.cardBorder}` }}>
                    <span>Nasc: {stats.growth.birthWeight?.toFixed(1) ?? '—'}kg</span>
                    <span style={{ color: c.green, fontWeight: 600 }}>{stats.growth.weightGain != null ? `+${(stats.growth.weightGain * 1000).toFixed(0)}g` : '—'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-md" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>Comprimento</p>
                  <p className="text-2xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    {stats.growth.height?.toFixed(1) ?? '—'}<span className="text-sm font-medium ml-0.5" style={{ color: c.faint }}>cm</span>
                  </p>
                  <div className="flex justify-between text-[10px] mt-1.5 pt-1.5" style={{ color: c.muted, borderTop: `1px solid ${c.cardBorder}` }}>
                    <span>Nasc: {stats.growth.birthHeight?.toFixed(1) ?? '—'}cm</span>
                    <span style={{ color: c.green, fontWeight: 600 }}>{stats.growth.heightGain != null ? `+${stats.growth.heightGain.toFixed(1)}cm` : '—'}</span>
                  </div>
                </div>
              </div>
              {stats.growth.weightHistory.length >= 2 && (
                <div className="rounded-md p-3" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-xs" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>Curva de Peso (OMS)</h4>
                    <div className="flex gap-3 text-[10px]" style={{ color: c.muted }}>
                      <span className="flex items-center gap-1"><span className="w-3 h-px inline-block" style={{ backgroundColor: c.accent, opacity: 0.4 }} /> P3–P97</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ backgroundColor: c.accentDim }} /> {baby.name}</span>
                    </div>
                  </div>
                  <OMSCurve history={stats.growth.weightHistory} gender={baby.gender === 'girl' ? 'girl' : 'boy'} c={c} />
                </div>
              )}
            </Section>
          )}

          {/* ── PADRÕES (pediatra) — abaixo de Crescimento ── */}
          {audience === 'pediatrician' && stats.patterns.length > 0 && (
            <Section icon="insights" title="Padrões observados" c={c}>
              <div className="rounded-md p-3 space-y-2" style={{ backgroundColor: c.greenBg, border: `1px solid ${c.greenBorder}` }}>
                {stats.patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm" style={{ color: c.text }}>
                    <span className="text-xs mt-0.5 font-bold shrink-0" style={{ color: c.green }}>✓</span>
                    {p}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── VACINAS (pediatra) — recolhido por padrão ── */}
          {audience === 'pediatrician' && vaccinesByAge.length > 0 && (
            <CollapsibleSection icon="vaccines" title="Vacinas aplicadas"
              badge={vaccinesByAge.reduce((n, g) => n + g.items.length, 0)} c={c}>
              <div className="space-y-2">
                {vaccinesByAge.map((group) => (
                  <div key={group.label} className="rounded-md p-3" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: c.muted }}>{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((v, i) => (
                        <div key={`${v.code}-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]"
                          style={{ backgroundColor: c.cardHighlight, border: `1px solid ${c.cardBorder}`, color: c.text }}
                          title={[v.fullName, v.doseLabel, v.source].filter(Boolean).join(' · ')}>
                          <span className="font-semibold">{v.name}</span>
                          {v.doseLabel && <span style={{ color: c.faint }}>· {v.doseLabel}</span>}
                          <span style={{ color: c.muted }}>{fmtDateShort(v.appliedAt)}</span>
                          {v.source && (
                            <span className="px-1 rounded text-[9px] font-bold"
                              style={{ backgroundColor: v.source === 'PNI' ? c.greenBg : c.cardHighlight, color: v.source === 'PNI' ? c.green : c.accent }}>
                              {v.source}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* ── MARCOS — recolhido por padrão ── */}
          {recentMilestones.length > 0 && (
            <CollapsibleSection icon="flag" title="Marcos recentes" badge={recentMilestones.length} c={c}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentMilestones.map((m, i) => (
                  <div key={`${m.code}-${i}`} className="flex gap-2.5 p-3 rounded-md"
                    style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.meta.name}
                        className="w-12 h-12 rounded-md object-cover shrink-0"
                        style={{ border: `1px solid ${c.cardBorder}` }} />
                    ) : (
                      <div className="w-12 h-12 rounded-md flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: c.cardHighlight, border: `1px solid ${c.cardBorder}` }}>
                        {m.meta.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                        {m.meta.name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: c.muted }}>
                        {fmtDate(m.achievedAt)}
                      </p>
                      {m.note && (
                        <p className="text-[11px] mt-1 leading-snug" style={{ color: c.muted }}>"{m.note}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* ── SALTOS (pediatra + cuidadora) — recolhido por padrão ── */}
          {audience !== 'family' && (activeLeap || leapNotesResolved.length > 0) && (
            <CollapsibleSection icon="trending_up" title="Saltos de desenvolvimento"
              badge={(activeLeap ? 1 : 0) + Math.min(leapNotesResolved.length, 5)} c={c}>
              {activeLeap && (
                <div className="rounded-md p-3 mb-2"
                  style={{ backgroundColor: c.cardHighlight, border: `1px solid ${c.cardBorder}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>bolt</span>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.accent }}>
                      Salto ativo · Semana {activeLeap.weekStart}–{activeLeap.weekEnd}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                    Salto {activeLeap.id} · {activeLeap.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: c.muted }}>{activeLeap.subtitle}</p>
                </div>
              )}
              {leapNotesResolved.length > 0 && (
                <div className="space-y-1.5">
                  {leapNotesResolved.slice(0, 5).map((n) => (
                    <div key={n.leapId} className="p-2.5 rounded-md"
                      style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>
                        Salto {n.leapId} · {n.meta.name}
                      </p>
                      <p className="text-[12px] mt-0.5 leading-snug" style={{ color: c.text }}>"{n.note}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* ── MEDICAMENTOS (pediatra + cuidadora) — recolhido por padrão ── */}
          {audience !== 'family' && medicationsWithNext.length > 0 && (
            <CollapsibleSection icon="medication" title="Medicamentos ativos" badge={medicationsWithNext.length} c={c}>
              <div className="space-y-2">
                {medicationsWithNext.map((m) => (
                  <div key={m.id} className="p-3 rounded-md"
                    style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
                          {m.name}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: c.muted }}>
                          {m.dosage} · a cada {m.frequencyHours}h
                          {m.scheduleTimes.length > 0 && ` · ${m.scheduleTimes.map((t) => t.slice(0, 5)).join(', ')}`}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: c.faint }}>
                          Desde {fmtDateShort(m.startDate)}
                          {m.endDate ? ` · até ${fmtDateShort(m.endDate)}` : ' · contínuo'}
                        </p>
                      </div>
                      {m.nextLabel && (
                        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md"
                          style={{ backgroundColor: c.cardHighlight, color: c.accent }}>
                          próxima {m.nextLabel}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* ── CTA (varia por público) ── */}
          <div className="rounded-md p-5 print:hidden text-center" style={{ backgroundColor: c.cardHighlight, border: `1px solid ${c.cardBorder}` }}>
            <p className="font-bold text-base mb-1" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
              {cta.title}
            </p>
            <p className="text-xs mb-3" style={{ color: c.muted }}>
              {cta.subtitle}
            </p>
            <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#25D366', color: '#ffffff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.462-1.494A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.336 0-4.512-.767-6.262-2.063l-.437-.338-2.66.89.89-2.66-.338-.437A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              {cta.btnLabel}
            </a>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="px-4 sm:px-6 py-3 text-[10px] print:px-6" style={{ color: c.faint, borderTop: `1px solid ${c.cardBorder}` }}>
          <span>Gerado por yaya · yayababy.app</span>
        </footer>
      </div>
    </div>
  );
}

// ─── Reusable components ──────────────────────
function KPI({ icon, label, value, sub, refText, status, c }: { icon: string; label: string; value: string; sub: string; refText: string; status: 'green' | 'yellow' | 'red'; c: Colors }) {
  const sc = trafficColor(status, c);
  return (
    <div className="p-3 rounded-md relative overflow-hidden" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: sc }} />
      <div className="flex items-center gap-1.5 mb-1 mt-0.5">
        <span className="material-symbols-outlined text-sm" style={{ color: c.accent }}>{icon}</span>
        <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: c.muted }}>{label}</p>
      </div>
      <p className="text-xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: sc }}>
        {value} <span className="text-xs font-normal" style={{ color: c.faint }}>{sub}</span>
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: c.faint }}>{refText}</p>
    </div>
  );
}

function Section({ icon, title, children, c }: { icon: string; title: string; children: React.ReactNode; c: Colors }) {
  return (
    <section>
      <h2 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
        <span className="material-symbols-outlined text-base" style={{ color: c.accent }}>{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Seção expansível — começa recolhida, o usuário clica pra ver detalhes. */
function CollapsibleSection({ icon, title, badge, children, c }: {
  icon: string; title: string; badge?: number; children: React.ReactNode; c: Colors;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-2 text-left"
      >
        <h2 className="font-bold text-sm flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>
          <span className="material-symbols-outlined text-base" style={{ color: c.accent }}>{icon}</span>
          {title}
          {badge != null && badge > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
              style={{ backgroundColor: c.cardHighlight, border: `1px solid ${c.cardBorder}`, color: c.accent }}>
              {badge}
            </span>
          )}
        </h2>
        <span className="material-symbols-outlined text-sm flex-shrink-0"
          style={{ color: c.muted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          expand_more
        </span>
      </button>
      {open && children}
    </section>
  );
}

function Stat({ label, value, icon, c }: { label: string; value: string; icon?: string; c: Colors }) {
  return (
    <div className="rounded-md p-2.5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.shadow }}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="material-symbols-outlined text-xs" style={{ color: c.accent }}>{icon}</span>}
        <p className="text-[10px] font-medium uppercase" style={{ color: c.muted }}>{label}</p>
      </div>
      <p className="text-base font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color: c.text }}>{value}</p>
    </div>
  );
}
