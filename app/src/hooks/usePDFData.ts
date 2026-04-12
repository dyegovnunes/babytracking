import { useMemo, useState, useEffect } from 'react';
import { useAppState } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { getPercentile, getWeeklyWeightGainReference } from '../lib/omsData';
import type { LogEntry } from '../types';

export interface PDFData {
  periodStart: Date;
  periodEnd: Date;
  totalLogs: number;

  feeding: {
    avgPerDay: number;
    avgIntervalDaytime: number;
    avgIntervalNighttime: number;
    breastLeftCount: number;
    breastRightCount: number;
    breastBothCount: number;
    bottleCount: number;
    totalBottleMl: number;
    dominantSide: 'left' | 'right' | 'both' | 'equal';
    trend: 'stable' | 'increasing' | 'decreasing';
    dailyCounts: { date: string; count: number }[];
  };

  sleep: {
    avgTotalMinutes: number;
    avgNocturnalMinutes: number;
    avgDiurnalMinutes: number;
    longestBlockMinutes: number;
    avgNapsPerDay: number;
    avgNapDuration: number;
    nocturnalTrend: 'stable' | 'improving' | 'declining';
    dailyMinutes: { date: string; nocturnal: number; diurnal: number }[];
  };

  diapers: {
    avgPerDay: number;
    avgWetPerDay: number;
    avgDirtyPerDay: number;
    dailyCounts: { date: string; wet: number; dirty: number }[];
  };

  growth: {
    currentWeight: number | null;
    currentHeight: number | null;
    birthWeight: number | null;
    birthHeight: number | null;
    weightGain: number | null;
    weightGainPerWeek: number | null;
    heightGain: number | null;
    weightPercentile: string | null;
    heightPercentile: string | null;
    weightHistory: { date: string; value: number }[];
    heightHistory: { date: string; value: number }[];
  } | null;

  patterns: string[];
}

interface Measurement {
  id: string;
  type: string;
  value: number;
  unit: string;
  measured_at: string;
}

const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle']);

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function isDaytime(ts: number): boolean {
  const h = new Date(ts).getHours();
  return h >= 8 && h < 20;
}

function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const sorted = [...logs]
    .filter((l) => l.eventId === 'sleep' || l.eventId === 'wake')
    .sort((a, b) => a.timestamp - b.timestamp);

  const pairs: { start: number; end: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventId === 'sleep') {
      const wake = sorted.slice(i + 1).find((l) => l.eventId === 'wake');
      pairs.push({
        start: sorted[i].timestamp,
        end: wake ? wake.timestamp : Date.now(),
      });
    }
  }
  return pairs;
}

export function usePDFData(periodDays: number = 30): PDFData | null {
  const { logs, baby } = useAppState();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!baby) return;
    supabase
      .from('measurements')
      .select('*')
      .eq('baby_id', baby.id)
      .order('measured_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setMeasurements(data ?? []);
        setLoaded(true);
      });
  }, [baby?.id]);

  return useMemo(() => {
    if (!baby || !loaded) return null;

    const now = Date.now();
    const periodEnd = new Date(now);
    const periodStart = new Date(now - periodDays * 86400000);
    const periodStartTs = periodStart.getTime();

    const periodLogs = logs.filter((l) => l.timestamp >= periodStartTs);
    const totalLogs = periodLogs.length;

    const calendarDays = periodDays;

    // ── AMAMENTAÇÃO ──
    const feedLogs = periodLogs.filter((l) => FEED_IDS.has(l.eventId));
    const breastLeftCount = feedLogs.filter((l) => l.eventId === 'breast_left').length;
    const breastRightCount = feedLogs.filter((l) => l.eventId === 'breast_right').length;
    const breastBothCount = feedLogs.filter((l) => l.eventId === 'breast_both').length;
    const bottleCount = feedLogs.filter((l) => l.eventId === 'bottle').length;
    const totalBottleMl = feedLogs
      .filter((l) => l.eventId === 'bottle')
      .reduce((sum, l) => sum + (l.ml ?? 0), 0);

    const avgPerDay = feedLogs.length / calendarDays;

    // Intervals daytime vs nighttime
    const sortedFeeds = [...feedLogs].sort((a, b) => a.timestamp - b.timestamp);
    const dayIntervals: number[] = [];
    const nightIntervals: number[] = [];
    for (let i = 1; i < sortedFeeds.length; i++) {
      const diff = (sortedFeeds[i].timestamp - sortedFeeds[i - 1].timestamp) / 60000;
      if (diff > 720) continue; // skip gaps > 12h
      if (isDaytime(sortedFeeds[i - 1].timestamp)) {
        dayIntervals.push(diff);
      } else {
        nightIntervals.push(diff);
      }
    }
    const avgIntervalDaytime = dayIntervals.length > 0
      ? dayIntervals.reduce((a, b) => a + b, 0) / dayIntervals.length
      : 0;
    const avgIntervalNighttime = nightIntervals.length > 0
      ? nightIntervals.reduce((a, b) => a + b, 0) / nightIntervals.length
      : 0;

    // Dominant side
    const breastCounts = { left: breastLeftCount, right: breastRightCount, both: breastBothCount };
    const maxBreast = Math.max(breastCounts.left, breastCounts.right, breastCounts.both);
    let dominantSide: 'left' | 'right' | 'both' | 'equal' = 'equal';
    if (maxBreast > 0) {
      const values = Object.values(breastCounts);
      const countMax = values.filter((v) => v === maxBreast).length;
      if (countMax === 1) {
        dominantSide = Object.entries(breastCounts).find(([, v]) => v === maxBreast)![0] as 'left' | 'right' | 'both';
      }
    }

    // Trend: compare first half vs second half
    const midpoint = periodStartTs + (periodDays * 86400000) / 2;
    const firstHalf = feedLogs.filter((l) => l.timestamp < midpoint).length;
    const secondHalf = feedLogs.filter((l) => l.timestamp >= midpoint).length;
    const feedTrendDiff = firstHalf > 0 ? Math.abs(secondHalf - firstHalf) / firstHalf : 0;
    let feedTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (feedTrendDiff > 0.15) {
      feedTrend = secondHalf > firstHalf ? 'increasing' : 'decreasing';
    }

    // Daily counts for chart
    const feedDailyCounts: { date: string; count: number }[] = [];
    for (let i = 0; i < calendarDays; i++) {
      const dayStart = startOfDay(periodStartTs + i * 86400000);
      const dayEnd = dayStart + 86400000;
      const ds = dateStr(dayStart);
      const count = feedLogs.filter((l) => l.timestamp >= dayStart && l.timestamp < dayEnd).length;
      feedDailyCounts.push({ date: ds, count });
    }

    // ── SONO ──
    const sleepPairs = computeSleepPairs(periodLogs);

    // Classify each pair as nocturnal or diurnal
    const nocturnalPairs = sleepPairs.filter((p) => !isDaytime(p.start));
    const diurnalPairs = sleepPairs.filter((p) => isDaytime(p.start));

    const totalNocturnal = nocturnalPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0);
    const totalDiurnal = diurnalPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0);
    const totalSleep = totalNocturnal + totalDiurnal;

    const avgTotalMinutes = totalSleep / calendarDays;
    const avgNocturnalMinutes = totalNocturnal / calendarDays;
    const avgDiurnalMinutes = totalDiurnal / calendarDays;

    const allDurations = sleepPairs.map((p) => (p.end - p.start) / 60000);
    const longestBlockMinutes = allDurations.length > 0 ? Math.max(...allDurations) : 0;

    const avgNapsPerDay = diurnalPairs.length / calendarDays;
    const napDurations = diurnalPairs.map((p) => (p.end - p.start) / 60000);
    const avgNapDuration = napDurations.length > 0
      ? napDurations.reduce((a, b) => a + b, 0) / napDurations.length
      : 0;

    // Nocturnal trend
    const firstHalfNoct = nocturnalPairs
      .filter((p) => p.start < midpoint)
      .reduce((s, p) => s + (p.end - p.start) / 60000, 0);
    const secondHalfNoct = nocturnalPairs
      .filter((p) => p.start >= midpoint)
      .reduce((s, p) => s + (p.end - p.start) / 60000, 0);
    const noctDiff = firstHalfNoct > 0 ? (secondHalfNoct - firstHalfNoct) / firstHalfNoct : 0;
    let nocturnalTrend: 'stable' | 'improving' | 'declining' = 'stable';
    if (Math.abs(noctDiff) > 0.15) {
      nocturnalTrend = noctDiff > 0 ? 'improving' : 'declining';
    }

    // Daily sleep for chart
    const sleepDailyMinutes: { date: string; nocturnal: number; diurnal: number }[] = [];
    for (let i = 0; i < calendarDays; i++) {
      const dayStart = startOfDay(periodStartTs + i * 86400000);
      const dayEnd = dayStart + 86400000;
      const ds = dateStr(dayStart);
      const dayPairs = sleepPairs.filter((p) => p.start >= dayStart && p.start < dayEnd);
      const noct = dayPairs.filter((p) => !isDaytime(p.start)).reduce((s, p) => s + (p.end - p.start) / 60000, 0);
      const diur = dayPairs.filter((p) => isDaytime(p.start)).reduce((s, p) => s + (p.end - p.start) / 60000, 0);
      sleepDailyMinutes.push({ date: ds, nocturnal: noct, diurnal: diur });
    }

    // ── FRALDAS ──
    const wetLogs = periodLogs.filter((l) => l.eventId === 'diaper_wet');
    const dirtyLogs = periodLogs.filter((l) => l.eventId === 'diaper_dirty');
    const avgWetPerDay = wetLogs.length / calendarDays;
    const avgDirtyPerDay = dirtyLogs.length / calendarDays;
    const avgDiapersPerDay = (wetLogs.length + dirtyLogs.length) / calendarDays;

    const diaperDailyCounts: { date: string; wet: number; dirty: number }[] = [];
    for (let i = 0; i < calendarDays; i++) {
      const dayStart = startOfDay(periodStartTs + i * 86400000);
      const dayEnd = dayStart + 86400000;
      const ds = dateStr(dayStart);
      const wet = wetLogs.filter((l) => l.timestamp >= dayStart && l.timestamp < dayEnd).length;
      const dirty = dirtyLogs.filter((l) => l.timestamp >= dayStart && l.timestamp < dayEnd).length;
      diaperDailyCounts.push({ date: ds, wet, dirty });
    }

    // ── CRESCIMENTO ──
    let growth: PDFData['growth'] = null;
    if (measurements.length > 0) {
      const weights = measurements
        .filter((m) => m.type === 'weight')
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
      const heights = measurements
        .filter((m) => m.type === 'height')
        .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());

      const currentWeight = weights.length > 0 ? Number(weights[0].value) : null;
      const currentHeight = heights.length > 0 ? Number(heights[0].value) : null;
      const birthWeight = weights.length > 0 ? Number(weights[weights.length - 1].value) : null;
      const birthHeight = heights.length > 0 ? Number(heights[heights.length - 1].value) : null;

      // Weight gain in period
      let weightGain: number | null = null;
      let weightGainPerWeek: number | null = null;
      if (weights.length >= 2) {
        const oldest = weights[weights.length - 1];
        const newest = weights[0];
        weightGain = Number(newest.value) - Number(oldest.value);
        const daysBetween = (new Date(newest.measured_at).getTime() - new Date(oldest.measured_at).getTime()) / 86400000;
        if (daysBetween > 0) {
          weightGainPerWeek = (weightGain / daysBetween) * 7;
        }
      }

      let heightGain: number | null = null;
      if (heights.length >= 2) {
        heightGain = Number(heights[0].value) - Number(heights[heights.length - 1].value);
      }

      // Age in months
      const birthDate = new Date(baby.birthDate);
      const ageMonths = (now - birthDate.getTime()) / (30.44 * 86400000);
      const gender = baby.gender || 'boy';

      const weightPercentile = currentWeight
        ? getPercentile('weight', currentWeight, ageMonths, gender)
        : null;
      const heightPercentile = currentHeight
        ? getPercentile('height', currentHeight, ageMonths, gender)
        : null;

      const weightHistory = weights
        .map((w) => ({ date: w.measured_at.slice(0, 10), value: Number(w.value) }))
        .reverse();
      const heightHistory = heights
        .map((h) => ({ date: h.measured_at.slice(0, 10), value: Number(h.value) }))
        .reverse();

      if (currentWeight !== null || currentHeight !== null) {
        growth = {
          currentWeight,
          currentHeight,
          birthWeight,
          birthHeight,
          weightGain,
          weightGainPerWeek,
          heightGain,
          weightPercentile,
          heightPercentile,
          weightHistory,
          heightHistory,
        };
      }
    }

    // ── PADRÕES OBSERVADOS ──
    const patterns: string[] = [];

    // Nocturnal > diurnal consistency
    const daysNoctGreater = sleepDailyMinutes.filter((d) => d.nocturnal > d.diurnal).length;
    if (daysNoctGreater >= 10) {
      patterns.push(`Sono noturno consistentemente maior que diurno nos ultimos ${daysNoctGreater} dias`);
    }

    // Feeding stability
    if (feedTrend === 'stable' && feedLogs.length > 10) {
      patterns.push('Amamentacoes estaveis no periodo (variacao inferior a 15%)');
    }

    // Weight gain
    if (growth?.weightGainPerWeek != null) {
      const weeklyG = Math.round(growth.weightGainPerWeek * 1000);
      const birthDate = new Date(baby.birthDate);
      const ageMonths = (now - birthDate.getTime()) / (30.44 * 86400000);
      const ref = getWeeklyWeightGainReference(ageMonths);
      patterns.push(
        `Ganho de peso de ${weeklyG}g/semana (referencia OMS para a idade: ${ref.min}-${ref.max}g/semana)`
      );
    }

    // Longest sleep block
    if (longestBlockMinutes >= 240) {
      const h = Math.floor(longestBlockMinutes / 60);
      const m = Math.round(longestBlockMinutes % 60);
      patterns.push(`Maior bloco continuo de sono: ${h}h${m.toString().padStart(2, '0')}`);
    }

    // Diaper frequency
    if (avgDiapersPerDay > 0) {
      patterns.push(`Media de ${avgDiapersPerDay.toFixed(1)} fraldas/dia no periodo`);
    }

    return {
      periodStart,
      periodEnd,
      totalLogs,
      feeding: {
        avgPerDay,
        avgIntervalDaytime,
        avgIntervalNighttime,
        breastLeftCount,
        breastRightCount,
        breastBothCount,
        bottleCount,
        totalBottleMl,
        dominantSide,
        trend: feedTrend,
        dailyCounts: feedDailyCounts,
      },
      sleep: {
        avgTotalMinutes,
        avgNocturnalMinutes,
        avgDiurnalMinutes,
        longestBlockMinutes,
        avgNapsPerDay,
        avgNapDuration,
        nocturnalTrend,
        dailyMinutes: sleepDailyMinutes,
      },
      diapers: {
        avgPerDay: avgDiapersPerDay,
        avgWetPerDay,
        avgDirtyPerDay,
        dailyCounts: diaperDailyCounts,
      },
      growth,
      patterns,
    };
  }, [logs, baby, measurements, loaded, periodDays]);
}
