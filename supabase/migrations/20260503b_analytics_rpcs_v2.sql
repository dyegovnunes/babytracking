-- Analytics RPCs v2: time-to-event, cohort retention, daily series, dropoff users.
--
-- Adicionam ao painel /paineladmin/analytics:
--  * Sparklines (daily_series) — mini gráficos nos KPI cards
--  * Tempo entre etapas (time_to_event) — mediana/p75/p90 por par de eventos
--  * Retenção por coorte (cohort_retention) — pivot semanal estilo Mixpanel
--  * Drill-down (dropoff_users) — lista quem parou em cada etapa do funil
--
-- Todas SECURITY DEFINER + checagem is_admin().
-- Empty state: retornam JSON válido com arrays vazios quando não há dados.

CREATE OR REPLACE FUNCTION public.analytics_time_to_event(
  p_days int DEFAULT 30,
  p_platform text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (p_days || ' days')::interval;
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH eligible AS (
    SELECT id FROM profiles
    WHERE p_platform IS NULL OR signup_platform = p_platform OR last_seen_platform = p_platform
  ),
  user_events AS (
    SELECT user_id, event_name, MIN(created_at) AS first_at
    FROM analytics_events
    WHERE created_at >= v_start AND user_id IN (SELECT id FROM eligible)
    GROUP BY user_id, event_name
  ),
  pairs AS (
    SELECT * FROM (VALUES
      ('onboarding_completed', 'first_record_created', 'Ativação'),
      ('first_record_created', 'insights_tab_opened', 'Descoberta de Insights'),
      ('insights_tab_opened', 'yaia_first_message', 'Engajou com YAIA'),
      ('yaia_first_message', 'super_report_viewed', 'Chegou ao Super Relatório'),
      ('onboarding_completed', 'paywall_viewed', 'Até ver paywall'),
      ('paywall_viewed', 'subscription_started', 'Paywall até assinar'),
      ('onboarding_completed', 'subscription_started', 'Onboarding até assinar')
    ) AS t(from_e, to_e, label)
  ),
  gaps AS (
    SELECT
      p.from_e, p.to_e, p.label,
      EXTRACT(EPOCH FROM (e2.first_at - e1.first_at)) AS gap_seconds
    FROM pairs p
    JOIN user_events e1 ON e1.event_name = p.from_e
    JOIN user_events e2 ON e2.event_name = p.to_e AND e2.user_id = e1.user_id AND e2.first_at >= e1.first_at
  )
  SELECT json_build_object(
    'period_days', p_days,
    'platform', p_platform,
    'pairs', COALESCE(json_agg(row_to_json(s.*) ORDER BY s.from_e, s.to_e), '[]'::json)
  ) INTO result
  FROM (
    SELECT
      from_e, to_e, label,
      COUNT(*) AS n,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_seconds)::numeric, 0) AS median_seconds,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY gap_seconds)::numeric, 0) AS p75_seconds,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY gap_seconds)::numeric, 0) AS p90_seconds
    FROM gaps
    GROUP BY from_e, to_e, label
  ) s;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_time_to_event(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_cohort_retention(
  p_weeks int DEFAULT 8,
  p_platform text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := date_trunc('week', now() - (p_weeks || ' weeks')::interval);
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH eligible AS (
    SELECT id, created_at FROM profiles
    WHERE created_at >= v_start
      AND (p_platform IS NULL OR signup_platform = p_platform OR last_seen_platform = p_platform)
  ),
  cohort AS (
    SELECT id AS user_id, date_trunc('week', created_at)::date AS cohort_week
    FROM eligible
  ),
  cohort_sizes AS (
    SELECT cohort_week, COUNT(*) AS size FROM cohort GROUP BY cohort_week
  ),
  user_activity AS (
    SELECT user_id, date_trunc('week', created_at)::date AS active_week
    FROM analytics_events WHERE user_id IN (SELECT user_id FROM cohort)
    UNION
    SELECT id AS user_id, date_trunc('week', last_seen_at)::date AS active_week
    FROM profiles WHERE id IN (SELECT user_id FROM cohort) AND last_seen_at IS NOT NULL
  ),
  retention AS (
    SELECT
      c.cohort_week,
      ((a.active_week - c.cohort_week) / 7) AS week_offset,
      COUNT(DISTINCT c.user_id) AS retained
    FROM cohort c
    JOIN user_activity a ON a.user_id = c.user_id AND a.active_week >= c.cohort_week
    WHERE ((a.active_week - c.cohort_week) / 7) BETWEEN 0 AND 7
    GROUP BY c.cohort_week, week_offset
  ),
  cohort_rows AS (
    SELECT
      cs.cohort_week,
      cs.size,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 0), 0) AS w0,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 1), 0) AS w1,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 2), 0) AS w2,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 3), 0) AS w3,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 4), 0) AS w4,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 5), 0) AS w5,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 6), 0) AS w6,
      COALESCE(MAX(r.retained) FILTER (WHERE r.week_offset = 7), 0) AS w7
    FROM cohort_sizes cs
    LEFT JOIN retention r ON r.cohort_week = cs.cohort_week
    GROUP BY cs.cohort_week, cs.size
  )
  SELECT json_build_object(
    'weeks', p_weeks,
    'platform', p_platform,
    'cohorts', COALESCE(json_agg(row_to_json(cohort_rows.*) ORDER BY cohort_week DESC), '[]'::json)
  ) INTO result FROM cohort_rows;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_cohort_retention(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_daily_series(
  p_days int DEFAULT 14,
  p_platform text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date := (now() - (p_days || ' days')::interval)::date;
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH eligible AS (
    SELECT id FROM profiles
    WHERE p_platform IS NULL OR signup_platform = p_platform OR last_seen_platform = p_platform
  ),
  series AS (
    SELECT generate_series(v_start, now()::date, '1 day')::date AS day
  ),
  daily AS (
    SELECT
      s.day,
      (SELECT COUNT(*) FROM profiles
        WHERE created_at::date = s.day AND id IN (SELECT id FROM eligible)) AS signups,
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
        WHERE event_name = 'onboarding_completed' AND created_at::date = s.day
          AND user_id IN (SELECT id FROM eligible)) AS onboarded,
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
        WHERE event_name = 'first_record_created' AND created_at::date = s.day
          AND user_id IN (SELECT id FROM eligible)) AS activated,
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
        WHERE event_name = 'paywall_viewed' AND created_at::date = s.day
          AND user_id IN (SELECT id FROM eligible)) AS paywall_views,
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
        WHERE event_name = 'subscription_started' AND created_at::date = s.day
          AND user_id IN (SELECT id FROM eligible)) AS conversions,
      (SELECT COUNT(DISTINCT user_id) FROM analytics_events
        WHERE created_at::date = s.day AND user_id IN (SELECT id FROM eligible)) AS active_users
    FROM series s
  )
  SELECT json_build_object(
    'days', (SELECT json_agg(day ORDER BY day) FROM daily),
    'signups', (SELECT json_agg(signups ORDER BY day) FROM daily),
    'onboarded', (SELECT json_agg(onboarded ORDER BY day) FROM daily),
    'activated', (SELECT json_agg(activated ORDER BY day) FROM daily),
    'paywall_views', (SELECT json_agg(paywall_views ORDER BY day) FROM daily),
    'conversions', (SELECT json_agg(conversions ORDER BY day) FROM daily),
    'active_users', (SELECT json_agg(active_users ORDER BY day) FROM daily)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_daily_series(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_dropoff_users(
  p_from_event text,
  p_to_event text,
  p_days int DEFAULT 30,
  p_platform text DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (p_days || ' days')::interval;
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH eligible AS (
    SELECT id FROM profiles
    WHERE p_platform IS NULL OR signup_platform = p_platform OR last_seen_platform = p_platform
  ),
  from_users AS (
    SELECT user_id, MIN(created_at) AS at FROM analytics_events
    WHERE event_name = p_from_event
      AND created_at >= v_start
      AND user_id IN (SELECT id FROM eligible)
    GROUP BY user_id
  ),
  to_users AS (
    SELECT f.user_id FROM from_users f
    JOIN analytics_events e ON e.user_id = f.user_id
    WHERE e.event_name = p_to_event AND e.created_at >= f.at
  ),
  dropoff AS (
    SELECT f.user_id, f.at AS reached_from_at
    FROM from_users f
    WHERE f.user_id NOT IN (SELECT user_id FROM to_users)
  )
  SELECT json_build_object(
    'from_event', p_from_event,
    'to_event', p_to_event,
    'period_days', p_days,
    'total', (SELECT COUNT(*) FROM dropoff),
    'users', COALESCE(
      (SELECT json_agg(json_build_object(
        'user_id', d.user_id,
        'email', u.email::text,
        'reached_at', d.reached_from_at,
        'last_seen_at', p.last_seen_at,
        'last_seen_platform', p.last_seen_platform,
        'signup_platform', p.signup_platform,
        'created_at', p.created_at
      ) ORDER BY d.reached_from_at DESC)
      FROM dropoff d
      JOIN profiles p ON p.id = d.user_id
      JOIN auth.users u ON u.id = d.user_id
      LIMIT p_limit),
      '[]'::json
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_dropoff_users(text, text, int, text, int) TO authenticated;
