-- get_yaia_context v3: corrige nomes de event_id usados pelo app real
-- (diaper_wet/diaper_dirty em vez de diaper_pee/poop; agrega breast_*;
-- conta sleep + wake eventos pra agregados de sono).

CREATE OR REPLACE FUNCTION public.get_yaia_context(p_user_id uuid, p_baby_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_baby json;
  v_logs_recent json;
  v_logs_summary_7d json;
  v_measurements json;
  v_medications_active json;
  v_medications_recent_inactive json;
  v_vaccines_applied json;
  v_vaccines_pending json;
  v_vaccines_summary json;
  v_milestones_achieved json;
  v_milestones_summary json;
  v_leap_mood json;
  v_seven_days_ago timestamptz := now() - interval '7 days';
  v_thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM baby_members WHERE user_id = p_user_id AND baby_id = p_baby_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_build_object(
    'name', b.name,
    'gender', b.gender,
    'birth_date', b.birth_date,
    'age_days', (CURRENT_DATE - b.birth_date),
    'age_weeks', ((CURRENT_DATE - b.birth_date) / 7),
    'age_months', (
      (EXTRACT(YEAR FROM age(CURRENT_DATE, b.birth_date)) * 12 +
       EXTRACT(MONTH FROM age(CURRENT_DATE, b.birth_date)))::integer
    ),
    'quiet_hours_start', b.quiet_hours_start,
    'quiet_hours_end', b.quiet_hours_end
  )
  INTO v_baby
  FROM babies b WHERE b.id = p_baby_id;

  SELECT json_agg(
    json_build_object(
      'event_id', l.event_id,
      'timestamp', to_timestamp(l.timestamp / 1000.0),
      'ml', l.ml,
      'duration', l.duration,
      'notes', l.notes
    ) ORDER BY l.timestamp DESC
  )
  INTO v_logs_recent
  FROM (
    SELECT event_id, timestamp, ml, duration, notes
    FROM logs
    WHERE baby_id = p_baby_id
      AND to_timestamp(timestamp / 1000.0) > v_thirty_days_ago
    ORDER BY timestamp DESC
    LIMIT 50
  ) l;

  SELECT json_build_object(
    'total_sleep_minutes', COALESCE(SUM(duration) FILTER (WHERE event_id IN ('sleep', 'wake') AND duration > 0), 0),
    'sleep_sessions', COUNT(*) FILTER (WHERE event_id = 'sleep'),
    'wake_events', COUNT(*) FILTER (WHERE event_id = 'wake'),
    'total_bottle_ml', COALESCE(SUM(ml) FILTER (WHERE event_id = 'bottle'), 0),
    'bottle_sessions', COUNT(*) FILTER (WHERE event_id = 'bottle'),
    'breast_sessions', COUNT(*) FILTER (WHERE event_id IN ('breast_left', 'breast_right', 'breast_both')),
    'breast_left', COUNT(*) FILTER (WHERE event_id = 'breast_left'),
    'breast_right', COUNT(*) FILTER (WHERE event_id = 'breast_right'),
    'breast_both', COUNT(*) FILTER (WHERE event_id = 'breast_both'),
    'diaper_wet', COUNT(*) FILTER (WHERE event_id = 'diaper_wet'),
    'diaper_dirty', COUNT(*) FILTER (WHERE event_id = 'diaper_dirty'),
    'bath_count', COUNT(*) FILTER (WHERE event_id = 'bath')
  )
  INTO v_logs_summary_7d
  FROM logs
  WHERE baby_id = p_baby_id
    AND to_timestamp(timestamp / 1000.0) > v_seven_days_ago;

  SELECT json_agg(m ORDER BY m.measured_at DESC)
  INTO v_measurements
  FROM (
    SELECT type, value, unit, measured_at, notes
    FROM (
      SELECT type, value, unit, measured_at, notes,
             ROW_NUMBER() OVER (PARTITION BY type ORDER BY measured_at DESC) AS rn
      FROM measurements
      WHERE baby_id = p_baby_id
    ) t
    WHERE rn <= 5
  ) m;

  SELECT json_agg(
    json_build_object(
      'name', m.name,
      'dosage', m.dosage,
      'frequency_hours', m.frequency_hours,
      'schedule_times', m.schedule_times,
      'start_date', m.start_date,
      'end_date', m.end_date,
      'notes', m.notes,
      'last_given', (
        SELECT ml.administered_at FROM medication_logs ml
        WHERE ml.baby_id = p_baby_id AND ml.medication_id = m.id
        ORDER BY ml.administered_at DESC LIMIT 1
      )
    )
  )
  INTO v_medications_active
  FROM medications m
  WHERE m.baby_id = p_baby_id AND m.is_active = true;

  SELECT json_agg(
    json_build_object(
      'name', m.name,
      'dosage', m.dosage,
      'start_date', m.start_date,
      'end_date', m.end_date
    )
  )
  INTO v_medications_recent_inactive
  FROM medications m
  WHERE m.baby_id = p_baby_id
    AND m.is_active = false
    AND m.end_date > (CURRENT_DATE - interval '90 days');

  SELECT json_agg(
    json_build_object(
      'vaccine_name', v.name,
      'applied_at', bv.applied_at,
      'location', bv.location
    ) ORDER BY bv.applied_at DESC
  )
  INTO v_vaccines_applied
  FROM baby_vaccines bv
  JOIN vaccines v ON v.id = bv.vaccine_id
  WHERE bv.baby_id = p_baby_id
    AND bv.status = 'applied';

  SELECT json_agg(
    json_build_object(
      'vaccine_name', v.name,
      'status', bv.status
    )
  )
  INTO v_vaccines_pending
  FROM baby_vaccines bv
  JOIN vaccines v ON v.id = bv.vaccine_id
  WHERE bv.baby_id = p_baby_id
    AND bv.status IN ('pending', 'overdue');

  SELECT json_build_object(
    'applied_count', COUNT(*) FILTER (WHERE status = 'applied'),
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending'),
    'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue'),
    'total_count', COUNT(*)
  )
  INTO v_vaccines_summary
  FROM baby_vaccines
  WHERE baby_id = p_baby_id;

  SELECT json_agg(
    json_build_object(
      'milestone_name', m.name,
      'category', m.category,
      'achieved_at', bm.achieved_at,
      'note', bm.note
    ) ORDER BY bm.achieved_at DESC
  )
  INTO v_milestones_achieved
  FROM baby_milestones bm
  JOIN milestones m ON m.id = bm.milestone_id
  WHERE bm.baby_id = p_baby_id
    AND bm.achieved_at IS NOT NULL;

  SELECT json_object_agg(category, total)
  INTO v_milestones_summary
  FROM (
    SELECT m.category, COUNT(*) AS total
    FROM baby_milestones bm
    JOIN milestones m ON m.id = bm.milestone_id
    WHERE bm.baby_id = p_baby_id AND bm.achieved_at IS NOT NULL
    GROUP BY m.category
  ) s;

  SELECT json_agg(
    json_build_object(
      'leap_id', lme.leap_id,
      'mood', lme.mood,
      'entry_date', lme.entry_date
    ) ORDER BY lme.entry_date DESC
  )
  INTO v_leap_mood
  FROM leap_mood_entries lme
  WHERE lme.baby_id = p_baby_id
    AND lme.entry_date > (CURRENT_DATE - interval '14 days');

  RETURN json_build_object(
    'baby', v_baby,
    'recent_logs', COALESCE(v_logs_recent, '[]'::json),
    'logs_summary_7d', v_logs_summary_7d,
    'measurements', COALESCE(v_measurements, '[]'::json),
    'active_medications', COALESCE(v_medications_active, '[]'::json),
    'recent_inactive_medications', COALESCE(v_medications_recent_inactive, '[]'::json),
    'vaccines_applied', COALESCE(v_vaccines_applied, '[]'::json),
    'vaccines_pending', COALESCE(v_vaccines_pending, '[]'::json),
    'vaccines_summary', v_vaccines_summary,
    'milestones_achieved', COALESCE(v_milestones_achieved, '[]'::json),
    'milestones_summary_by_category', COALESCE(v_milestones_summary, '{}'::json),
    'leap_mood_recent', COALESCE(v_leap_mood, '[]'::json)
  );
END;
$function$;
