-- yaIA Tools v1: 7 RPCs especializadas pra arquitetura agentic.
-- A IA chama essas tools via HTTP no n8n em vez de receber context_summary
-- pre-montado. Extensivel, menor em tokens, cobre qualquer pergunta com
-- recorte dinamico.

CREATE OR REPLACE FUNCTION public.yaia_period_range(p_period text)
RETURNS TABLE(start_ts timestamptz, end_ts timestamptz)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
BEGIN
  IF p_period = 'today' THEN RETURN QUERY SELECT date_trunc('day', now()), now();
  ELSIF p_period = 'yesterday' THEN RETURN QUERY SELECT date_trunc('day', now()) - interval '1 day', date_trunc('day', now());
  ELSIF p_period = 'last_7d' THEN RETURN QUERY SELECT now() - interval '7 days', now();
  ELSIF p_period = 'last_14d' THEN RETURN QUERY SELECT now() - interval '14 days', now();
  ELSIF p_period = 'last_30d' THEN RETURN QUERY SELECT now() - interval '30 days', now();
  ELSIF p_period = 'last_90d' THEN RETURN QUERY SELECT now() - interval '90 days', now();
  ELSE RETURN QUERY SELECT now() - interval '7 days', now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_baby_basics(p_baby_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT json_build_object(
    'name', b.name, 'gender', b.gender, 'birth_date', b.birth_date,
    'age_days', (CURRENT_DATE - b.birth_date),
    'age_weeks', ((CURRENT_DATE - b.birth_date) / 7),
    'age_months', ((EXTRACT(YEAR FROM age(CURRENT_DATE, b.birth_date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, b.birth_date)))::integer),
    'quiet_hours_start', b.quiet_hours_start, 'quiet_hours_end', b.quiet_hours_end
  ) FROM babies b WHERE b.id = p_baby_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_activity(p_baby_id uuid, p_period text DEFAULT 'last_7d')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz; v_end timestamptz; v_qh_start int; v_qh_end int; v_result json;
BEGIN
  SELECT COALESCE(quiet_hours_start, 19), COALESCE(quiet_hours_end, 7) INTO v_qh_start, v_qh_end FROM babies WHERE id = p_baby_id;
  SELECT start_ts, end_ts INTO v_start, v_end FROM yaia_period_range(p_period);
  SELECT json_build_object(
    'period', p_period, 'start', v_start, 'end', v_end,
    'sleep', json_build_object(
      'total_sessions', COUNT(*) FILTER (WHERE event_id = 'sleep'),
      'day_sessions', COUNT(*) FILTER (WHERE event_id = 'sleep' AND NOT is_night_hour(to_timestamp(timestamp / 1000.0), v_qh_start, v_qh_end)),
      'night_sessions', COUNT(*) FILTER (WHERE event_id = 'sleep' AND is_night_hour(to_timestamp(timestamp / 1000.0), v_qh_start, v_qh_end)),
      'wake_events_total', COUNT(*) FILTER (WHERE event_id = 'wake'),
      'wake_events_night', COUNT(*) FILTER (WHERE event_id = 'wake' AND is_night_hour(to_timestamp(timestamp / 1000.0), v_qh_start, v_qh_end)),
      'last_sleep_at', MAX(to_timestamp(timestamp / 1000.0)) FILTER (WHERE event_id = 'sleep')
    ),
    'feeding', json_build_object(
      'breast_total', COUNT(*) FILTER (WHERE event_id IN ('breast_left','breast_right','breast_both')),
      'breast_left', COUNT(*) FILTER (WHERE event_id = 'breast_left'),
      'breast_right', COUNT(*) FILTER (WHERE event_id = 'breast_right'),
      'breast_both', COUNT(*) FILTER (WHERE event_id = 'breast_both'),
      'bottle_sessions', COUNT(*) FILTER (WHERE event_id = 'bottle'),
      'bottle_ml_total', COALESCE(SUM(ml) FILTER (WHERE event_id = 'bottle'), 0),
      'night_feeds', COUNT(*) FILTER (WHERE event_id IN ('breast_left','breast_right','breast_both','bottle') AND is_night_hour(to_timestamp(timestamp / 1000.0), v_qh_start, v_qh_end)),
      'last_feed_at', MAX(to_timestamp(timestamp / 1000.0)) FILTER (WHERE event_id IN ('breast_left','breast_right','breast_both','bottle'))
    ),
    'diaper', json_build_object(
      'wet', COUNT(*) FILTER (WHERE event_id = 'diaper_wet'),
      'dirty', COUNT(*) FILTER (WHERE event_id = 'diaper_dirty'),
      'total', COUNT(*) FILTER (WHERE event_id IN ('diaper_wet', 'diaper_dirty'))
    ),
    'bath_count', COUNT(*) FILTER (WHERE event_id = 'bath')
  ) INTO v_result
  FROM logs
  WHERE baby_id = p_baby_id
    AND to_timestamp(timestamp / 1000.0) >= v_start
    AND to_timestamp(timestamp / 1000.0) < v_end;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_growth(p_baby_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT json_build_object(
    'weight', (SELECT json_agg(json_build_object('date', measured_at::date, 'value', value, 'unit', unit) ORDER BY measured_at DESC) FROM measurements WHERE baby_id = p_baby_id AND type = 'weight'),
    'height', (SELECT json_agg(json_build_object('date', measured_at::date, 'value', value, 'unit', unit) ORDER BY measured_at DESC) FROM measurements WHERE baby_id = p_baby_id AND type = 'height'),
    'head', (SELECT json_agg(json_build_object('date', measured_at::date, 'value', value, 'unit', unit) ORDER BY measured_at DESC) FROM measurements WHERE baby_id = p_baby_id AND type = 'head_circumference'),
    'latest', (SELECT json_object_agg(type, json_build_object('value', value, 'unit', unit, 'date', measured_at::date)) FROM (SELECT DISTINCT ON (type) type, value, unit, measured_at FROM measurements WHERE baby_id = p_baby_id ORDER BY type, measured_at DESC) t)
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_vaccines(p_baby_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT json_build_object(
    'summary', json_build_object(
      'applied', COUNT(*) FILTER (WHERE bv.status = 'applied'),
      'pending', COUNT(*) FILTER (WHERE bv.status = 'pending'),
      'overdue', COUNT(*) FILTER (WHERE bv.status = 'overdue'),
      'total', COUNT(*)
    ),
    'applied', (SELECT json_agg(json_build_object('name', v.name, 'applied_at', bv.applied_at::date, 'location', bv.location) ORDER BY bv.applied_at DESC) FROM baby_vaccines bv JOIN vaccines v ON v.id = bv.vaccine_id WHERE bv.baby_id = p_baby_id AND bv.status = 'applied'),
    'pending', (SELECT json_agg(json_build_object('name', v.name, 'status', bv.status)) FROM baby_vaccines bv JOIN vaccines v ON v.id = bv.vaccine_id WHERE bv.baby_id = p_baby_id AND bv.status IN ('pending', 'overdue'))
  ) FROM baby_vaccines bv WHERE bv.baby_id = p_baby_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_milestones(p_baby_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN json_build_object(
    'total_achieved', (SELECT COUNT(*) FROM baby_milestones WHERE baby_id = p_baby_id AND achieved_at IS NOT NULL),
    'by_category', (SELECT json_object_agg(category, total) FROM (SELECT m.category, COUNT(*) AS total FROM baby_milestones bm JOIN milestones m ON m.id = bm.milestone_id WHERE bm.baby_id = p_baby_id AND bm.achieved_at IS NOT NULL GROUP BY m.category) s),
    'achieved', (SELECT json_agg(json_build_object('name', m.name, 'category', m.category, 'achieved_at', bm.achieved_at::date, 'note', bm.note) ORDER BY bm.achieved_at DESC) FROM baby_milestones bm JOIN milestones m ON m.id = bm.milestone_id WHERE bm.baby_id = p_baby_id AND bm.achieved_at IS NOT NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_medications(p_baby_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN json_build_object(
    'active', (SELECT json_agg(json_build_object('name', m.name, 'dosage', m.dosage, 'frequency_hours', m.frequency_hours, 'schedule_times', m.schedule_times, 'start_date', m.start_date, 'end_date', m.end_date, 'notes', m.notes, 'last_given', (SELECT ml.administered_at FROM medication_logs ml WHERE ml.baby_id = p_baby_id AND ml.medication_id = m.id ORDER BY ml.administered_at DESC LIMIT 1))) FROM medications m WHERE m.baby_id = p_baby_id AND m.is_active = true),
    'recent_inactive', (SELECT json_agg(json_build_object('name', m.name, 'dosage', m.dosage, 'start_date', m.start_date, 'end_date', m.end_date)) FROM medications m WHERE m.baby_id = p_baby_id AND m.is_active = false AND m.end_date > (CURRENT_DATE - interval '90 days'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.yaia_logs_detail(
  p_baby_id uuid,
  p_event_types text[] DEFAULT NULL,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz := COALESCE(p_start, now() - interval '7 days'); v_end timestamptz := COALESCE(p_end, now());
BEGIN
  RETURN (SELECT json_agg(json_build_object('event_id', event_id, 'timestamp', to_timestamp(timestamp / 1000.0), 'ml', ml, 'duration', duration, 'notes', notes) ORDER BY timestamp DESC)
    FROM (SELECT event_id, timestamp, ml, duration, notes FROM logs WHERE baby_id = p_baby_id AND to_timestamp(timestamp / 1000.0) >= v_start AND to_timestamp(timestamp / 1000.0) < v_end AND (p_event_types IS NULL OR event_id = ANY(p_event_types)) ORDER BY timestamp DESC LIMIT LEAST(p_limit, 200)) l);
END;
$$;
