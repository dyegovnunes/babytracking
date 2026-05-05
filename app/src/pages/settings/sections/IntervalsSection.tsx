import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { supabase } from '../../../lib/supabase'
import IntervalRow from '../components/IntervalRow'
import Toggle from '../components/Toggle'
import {
  FEED_PRESETS,
  DIAPER_PRESETS,
  SLEEP_NAP_PRESETS,
  SLEEP_AWAKE_PRESETS,
} from '../constants'
import type { NotifPrefs } from '../types'
import { padH } from '../utils'

interface Props {
  expanded: string | null
  onToggleExpanded: (cat: string) => void
  onOpenCustom: (cat: string) => void
  onSaved: () => void
  onError: (msg: string) => void
  prefs: NotifPrefs
  onSavePrefs: (updated: NotifPrefs) => void
  onOpenQuietPicker: (which: 'start' | 'end') => void
  onOpenInfo: () => void
}

export default function IntervalsSection({
  expanded,
  onToggleExpanded,
  onOpenCustom,
  onSaved,
  onError,
  prefs,
  onSavePrefs,
  onOpenQuietPicker,
  onOpenInfo,
}: Props) {
  const { baby, pauseDuringSleep, autoSleepEnabled } = useAppState()
  const { adaptiveTheme, setAdaptiveTheme } = useTheme()
  const { user } = useAuth()
  const dispatch = useAppDispatch()

  const toggleAutoSleep = useCallback(async () => {
    if (!user || !baby) return
    const newVal = !autoSleepEnabled
    const { error } = await supabase
      .from('babies')
      .update({ auto_sleep_enabled: newVal })
      .eq('id', baby.id)
    if (error) {
      onError('Erro ao salvar')
      return
    }
    dispatch({ type: 'SET_AUTO_SLEEP_ENABLED', value: newVal })
    onSaved()
  }, [autoSleepEnabled, user, baby, dispatch, onSaved, onError])

  const togglePauseDuringSleep = useCallback(async () => {
    if (!user || !baby) return
    const newVal = !pauseDuringSleep
    const { error } = await supabase.from('notification_prefs').upsert(
      {
        user_id: user.id,
        baby_id: baby.id,
        pause_during_sleep: newVal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,baby_id' },
    )
    if (error) {
      onError('Erro ao salvar')
      return
    }
    dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: newVal })
    onSaved()
  }, [pauseDuringSleep, user, baby, dispatch, onSaved, onError])

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-lg">timer</span>
        <h2 className="font-headline text-sm font-bold text-on-surface">
          Intervalos e horários
        </h2>
      </div>

      <div className="space-y-2">
        <IntervalRow
          cat="feed"
          icon="breastfeeding"
          label="Amamentação"
          presets={FEED_PRESETS}
          isOpen={expanded === 'feed'}
          onToggle={() => onToggleExpanded('feed')}
          onOpenCustom={onOpenCustom}
          onSaved={onSaved}
          onError={() => onError('Erro ao salvar')}
        />
        <IntervalRow
          cat="diaper"
          icon="water_drop"
          label="Fraldas"
          presets={DIAPER_PRESETS}
          isOpen={expanded === 'diaper'}
          onToggle={() => onToggleExpanded('diaper')}
          onOpenCustom={onOpenCustom}
          onSaved={onSaved}
          onError={() => onError('Erro ao salvar')}
        />

        {/* Sono header com info icon */}
        <div className="flex items-center gap-2 pt-2">
          <span className="material-symbols-outlined text-on-surface-variant text-base">
            bedtime
          </span>
          <span className="font-label text-xs text-on-surface-variant font-semibold flex-1">
            Sono
          </span>
          <button
            onClick={onOpenInfo}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center active:bg-primary/20"
          >
            <span className="material-symbols-outlined text-primary text-sm">info</span>
          </button>
        </div>

        <IntervalRow
          cat="sleep_nap"
          icon="nights_stay"
          label="Duração da soneca"
          presets={SLEEP_NAP_PRESETS}
          isOpen={expanded === 'sleep_nap'}
          onToggle={() => onToggleExpanded('sleep_nap')}
          onOpenCustom={onOpenCustom}
          onSaved={onSaved}
          onError={() => onError('Erro ao salvar')}
        />
        <IntervalRow
          cat="sleep_awake"
          icon="wb_sunny"
          label="Janela de sono"
          presets={SLEEP_AWAKE_PRESETS}
          isOpen={expanded === 'sleep_awake'}
          onToggle={() => onToggleExpanded('sleep_awake')}
          onOpenCustom={onOpenCustom}
          onSaved={onSaved}
          onError={() => onError('Erro ao salvar')}
        />

        {/* Pausar durante sono */}
        <div className="bg-surface-container rounded-md px-4 py-3.5 flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            pause_circle
          </span>
          <div className="flex-1">
            <p className="font-body text-sm text-on-surface">Pausar alertas durante sono</p>
            <p className="font-label text-[11px] text-on-surface-variant">
              Amamentação e fralda não alertam enquanto dorme
            </p>
          </div>
          <Toggle value={pauseDuringSleep} onChange={togglePauseDuringSleep} />
        </div>

        {/* Horário de sono noturno */}
        <div className="bg-surface-container rounded-md px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">
              dark_mode
            </span>
            <div className="flex-1">
              <p className="font-body text-sm text-on-surface">Horário de sono noturno</p>
              <p className="font-label text-[11px] text-on-surface-variant">
                Notificações pausadas neste período
              </p>
            </div>
            <Toggle
              value={prefs.quietHours.enabled}
              onChange={() =>
                onSavePrefs({
                  ...prefs,
                  quietHours: {
                    ...prefs.quietHours,
                    enabled: !prefs.quietHours.enabled,
                  },
                })
              }
            />
          </div>
          {prefs.quietHours.enabled && (
            <div className="flex items-center gap-3 mt-3 ml-9">
              <button
                onClick={() => onOpenQuietPicker('start')}
                className="px-4 py-2.5 rounded-md bg-surface-container-low active:bg-surface-container-high min-h-[44px]"
              >
                <span className="font-headline text-sm text-on-surface font-bold">
                  {padH(prefs.quietHours.start)}
                </span>
              </button>
              <span className="font-label text-xs text-on-surface-variant">até</span>
              <button
                onClick={() => onOpenQuietPicker('end')}
                className="px-4 py-2.5 rounded-md bg-surface-container-low active:bg-surface-container-high min-h-[44px]"
              >
                <span className="font-headline text-sm text-on-surface font-bold">
                  {padH(prefs.quietHours.end)}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Registrar despertadores noturnos automaticamente */}
        <div className="bg-surface-container rounded-md px-4 py-3.5 flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            bedtime
          </span>
          <div className="flex-1">
            <p className="font-body text-sm text-on-surface">Registrar despertadores noturnos</p>
            <p className="font-label text-[11px] text-on-surface-variant leading-snug">
              Insere &ldquo;Acordou&rdquo; 5 min antes e &ldquo;Dormiu&rdquo; 30 min depois ao registrar evento durante o sono noturno
            </p>
          </div>
          <Toggle value={autoSleepEnabled} onChange={toggleAutoSleep} />
        </div>

        {/* Iluminação adaptada — só aparece se o horário noturno está configurado */}
        {prefs.quietHours.enabled && (
          <div className="bg-surface-container rounded-md px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                wb_twilight
              </span>
              <div className="flex-1">
                <p className="font-body text-sm text-on-surface">Iluminação adaptada</p>
                <p className="font-label text-[11px] text-on-surface-variant leading-snug">
                  Muda para dark automaticamente no horário de sono e volta ao seu tema ao amanhecer.
                </p>
              </div>
              <Toggle value={adaptiveTheme} onChange={() => setAdaptiveTheme(!adaptiveTheme)} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
