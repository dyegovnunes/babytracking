import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { hapticLight } from '../../../lib/haptics'
import { getLocalDateString } from '../../../lib/formatters'
import Toast from '../../../components/ui/Toast'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

interface LeapMoodTrackerProps {
  leapId: number
  babyId: string
  status: LeapStatus
  isPremium: boolean
}

const MOOD_SCALE: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😫', label: 'Muito dificil' },
  { value: 2, emoji: '😟', label: 'Dificil' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '😊', label: 'Tranquilo' },
  { value: 5, emoji: '😍', label: 'Muito tranquilo' },
]

interface MoodEntry {
  date: string
  mood: number
}

export default function LeapMoodTracker({ leapId, babyId, status }: LeapMoodTrackerProps) {
  const [todayMood, setTodayMood] = useState<number | null>(null)
  const [overallMood, setOverallMood] = useState<number | null>(null)
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Don't render for future/upcoming
  if (status === 'future' || status === 'upcoming') return null

  const today = getLocalDateString(new Date())

  // Load mood data
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const loadMoods = useCallback(async () => {
    if (status === 'active') {
      // Load last 7 days of mood entries
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const startDate = getLocalDateString(sevenDaysAgo)

      const { data } = await supabase
        .from('leap_mood_entries')
        .select('entry_date, mood')
        .eq('baby_id', babyId)
        .eq('leap_id', leapId)
        .gte('entry_date', startDate)
        .order('entry_date', { ascending: true })

      if (data) {
        const entries: MoodEntry[] = data.map((d: { entry_date: string; mood: number }) => ({
          date: d.entry_date,
          mood: d.mood,
        }))
        setRecentMoods(entries)

        const todayEntry = entries.find(e => e.date === today)
        if (todayEntry) setTodayMood(todayEntry.mood)
      }
    }

    if (status === 'past') {
      // Load overall mood from leap_notes
      const { data: noteData } = await supabase
        .from('leap_notes')
        .select('overall_mood')
        .eq('baby_id', babyId)
        .eq('leap_id', leapId)
        .maybeSingle()

      if (noteData?.overall_mood) {
        setOverallMood(noteData.overall_mood)
      }

      // Load all mood entries for this leap for the mini timeline
      const { data: moodData } = await supabase
        .from('leap_mood_entries')
        .select('entry_date, mood')
        .eq('baby_id', babyId)
        .eq('leap_id', leapId)
        .order('entry_date', { ascending: true })

      if (moodData) {
        setRecentMoods(
          moodData.map((d: { entry_date: string; mood: number }) => ({
            date: d.entry_date,
            mood: d.mood,
          })),
        )
      }
    }
  }, [babyId, leapId, status, today])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    loadMoods()
  }, [loadMoods])

  async function handleActiveMood(mood: number) {
    hapticLight()
    setSaving(true)

    const userId = (await supabase.auth.getUser()).data.user?.id

    const { error } = await supabase
      .from('leap_mood_entries')
      .upsert(
        {
          baby_id: babyId,
          leap_id: leapId,
          mood,
          entry_date: today,
          recorded_by: userId,
        },
        { onConflict: 'baby_id,leap_id,entry_date' },
      )

    setSaving(false)

    if (error) {
      setToast('Erro ao salvar')
    } else {
      setTodayMood(mood)
      setToast('Humor registrado')
      // Update recent moods
      setRecentMoods(prev => {
        const filtered = prev.filter(e => e.date !== today)
        return [...filtered, { date: today, mood }].sort((a, b) => a.date.localeCompare(b.date))
      })
    }
  }

  async function handlePastMood(mood: number) {
    hapticLight()
    setSaving(true)

    const userId = (await supabase.auth.getUser()).data.user?.id

    // Upsert into leap_notes with overall_mood
    const { error } = await supabase
      .from('leap_notes')
      .upsert(
        {
          baby_id: babyId,
          leap_id: leapId,
          note: overallMood ? undefined : '',
          overall_mood: mood,
          recorded_by: userId,
        },
        { onConflict: 'baby_id,leap_id' },
      )

    setSaving(false)

    if (error) {
      setToast('Erro ao salvar')
    } else {
      setOverallMood(mood)
      setToast('Avaliacao salva')
    }
  }

  function getMoodEmoji(mood: number): string {
    return MOOD_SCALE.find(m => m.value === mood)?.emoji ?? '😐'
  }

  if (status === 'active') {
    return (
      <div className="rounded-md bg-surface-container-high p-3">
        <p className="text-xs font-semibold text-on-surface-variant mb-2">
          Como esta sendo hoje?
        </p>

        {/* Mood buttons */}
        <div className="flex justify-between gap-1">
          {MOOD_SCALE.map(m => (
            <button
              key={m.value}
              type="button"
              disabled={saving}
              onClick={() => handleActiveMood(m.value)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md transition-all ${
                todayMood === m.value
                  ? 'bg-primary/15 ring-1 ring-primary'
                  : 'bg-surface active:bg-surface-container'
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[9px] text-on-surface-variant leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Recent moods mini timeline */}
        {recentMoods.length > 0 && (
          <div className="mt-2 pt-2 border-t border-outline-variant/30">
            <p className="text-[10px] text-on-surface-variant/50 mb-1">Ultimos dias</p>
            <div className="flex gap-1.5">
              {recentMoods.slice(-7).map(entry => (
                <div
                  key={entry.date}
                  className="flex flex-col items-center gap-0.5"
                  title={`${entry.date}: ${getMoodEmoji(entry.mood)}`}
                >
                  <span className="text-sm">{getMoodEmoji(entry.mood)}</span>
                  <span className="text-[8px] text-on-surface-variant/40">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  if (status === 'past') {
    return (
      <div className="rounded-md bg-surface-container-high p-3">
        <p className="text-xs font-semibold text-on-surface-variant mb-2">
          Como foi esse salto?
        </p>

        {/* Mood buttons */}
        <div className="flex justify-between gap-1">
          {MOOD_SCALE.map(m => (
            <button
              key={m.value}
              type="button"
              disabled={saving}
              onClick={() => handlePastMood(m.value)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-md transition-all ${
                overallMood === m.value
                  ? 'bg-primary/15 ring-1 ring-primary'
                  : 'bg-surface active:bg-surface-container'
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[9px] text-on-surface-variant leading-tight">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Mood history for past leap */}
        {recentMoods.length > 0 && (
          <div className="mt-2 pt-2 border-t border-outline-variant/30">
            <p className="text-[10px] text-on-surface-variant/50 mb-1">Historico de humor</p>
            <div className="flex gap-1 flex-wrap">
              {recentMoods.map(entry => (
                <div
                  key={entry.date}
                  className="flex flex-col items-center"
                  title={`${entry.date}: ${getMoodEmoji(entry.mood)}`}
                >
                  <span className="text-xs">{getMoodEmoji(entry.mood)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    )
  }

  return null
}
