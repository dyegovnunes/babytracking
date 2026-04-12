import { supabase } from './supabase';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezeUsedThisWeek: boolean;
}

export const STREAK_BADGES = [
  { days: 7, label: '1 semana', badge: 'bronze', emoji: '🥉' },
  { days: 14, label: '2 semanas', badge: 'silver', emoji: '🥈' },
  { days: 30, label: '1 mes', badge: 'gold', emoji: '🥇' },
  { days: 60, label: '60 dias', badge: 'platinum', emoji: '💎' },
  { days: 100, label: '100 dias', badge: 'diamond', emoji: '👑' },
] as const;

/**
 * Atualiza streak quando um log e adicionado.
 * Chamar dentro de addLog no AppContext.
 */
export async function updateStreak(babyId: string): Promise<StreakData> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Buscar streak atual
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('baby_id', babyId)
    .maybeSingle();

  if (!streak) {
    // Primeiro registro: criar streak
    const newStreak = {
      baby_id: babyId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
    };
    await supabase.from('streaks').insert(newStreak);
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      freezeUsedThisWeek: false,
    };
  }

  // Ja registrou hoje? Nao incrementar
  if (streak.last_active_date === today) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: streak.last_active_date,
      freezeUsedThisWeek: streak.freeze_used_this_week,
    };
  }

  // Verificar se e dia consecutivo
  const lastDate = new Date(streak.last_active_date + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

  let newCurrent = streak.current_streak;

  if (diffDays === 1) {
    // Dia consecutivo: incrementar
    newCurrent = streak.current_streak + 1;
  } else if (diffDays === 2 && !streak.freeze_used_this_week) {
    // Pulou 1 dia e freeze DISPONIVEL: manter streak
    newCurrent = streak.current_streak + 1;
    // Marcar freeze como usado
    await supabase
      .from('streaks')
      .update({ freeze_used_this_week: true })
      .eq('baby_id', babyId);
  } else {
    // Streak quebrado: resetar
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, streak.longest_streak);

  await supabase
    .from('streaks')
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('baby_id', babyId);

  return {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastActiveDate: today,
    freezeUsedThisWeek: streak.freeze_used_this_week,
  };
}

/**
 * Busca streak atual do bebe
 */
export async function getStreak(babyId: string): Promise<StreakData | null> {
  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('baby_id', babyId)
    .maybeSingle();

  if (!data) return null;

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
    freezeUsedThisWeek: data.freeze_used_this_week,
  };
}

/**
 * Retorna o badge atual baseado no streak
 */
export function getCurrentBadge(streak: number) {
  const earned = STREAK_BADGES.filter(b => streak >= b.days);
  return earned.length > 0 ? earned[earned.length - 1] : null;
}
