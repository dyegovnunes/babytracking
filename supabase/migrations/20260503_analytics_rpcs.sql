-- Analytics RPCs para o painel admin.
--
-- 4 funções SECURITY DEFINER que rodam queries pesadas no analytics_events
-- e devolvem JSON pronto pra UI consumir. Todas verificam is_admin().
--
-- Decisões de design:
--  * Funil sequencial REAL — cada etapa é subconjunto da anterior (joins
--    encadeados, não COUNT FILTER independente). Sem isso, "% de conversão"
--    fica fictícia.
--  * Comparação automática com período anterior do mesmo tamanho (overview).
--  * Filtro de plataforma via profiles.signup_platform OR last_seen_platform
--    (signup_platform às vezes é null).
--  * Last-touch exclui paywall_* e onboarding_completed do bucketing —
--    queremos saber QUE FEATURE de descoberta antecedeu, não o paywall em si.
--
-- Empty state: todas retornam JSON válido com zeros quando não há eventos.

CREATE OR REPLACE FUNCTION public.analytics_overview(
  p_days int DEFAULT 30,
  p_platform text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_start timestamptz := v_now - (p_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (p_days * 2 || ' days')::interval;
  v_prev_end timestamptz := v_start;
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH eligible AS (
    SELECT id FROM profiles
    WHERE p_platform IS NULL
       OR signup_platform = p_platform
       OR last_seen_platform = p_platform
  ),
  cur AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'onboarding_completed') AS onboarded,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'first_record_created') AS activated,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'paywall_viewed') AS paywall_views,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'subscription_started') AS conversions,
      COUNT(DISTINCT user_id) AS distinct_users,
      COUNT(*) AS total_events
    FROM analytics_events
    WHERE created_at BETWEEN v_start AND v_now
      AND user_id IN (SELECT id FROM eligible)
  ),
  prev AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'onboarding_completed') AS onboarded,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'first_record_created') AS activated,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'paywall_viewed') AS paywall_views,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'subscription_started') AS conversions,
      COUNT(DISTINCT user_id) AS distinct_users,
      COUNT(*) AS total_events
    FROM analytics_events
    WHERE created_at BETWEEN v_prev_start AND v_prev_end
      AND user_id IN (SELECT id FROM eligible)
  ),
  signups AS (
    SELECT
      COUNT(*) FILTER (WHERE created_at BETWEEN v_start AND v_now) AS cur_signups,
      COUNT(*) FILTER (WHERE created_at BETWEEN v_prev_start AND v_prev_end) AS prev_signups
    FROM profiles
    WHERE p_platform IS NULL
       OR signup_platform = p_platform
       OR last_seen_platform = p_platform
  )
  SELECT json_build_object(
    'period_days', p_days,
    'platform', p_platform,
    'first_event_at', (SELECT min(created_at) FROM analytics_events),
    'current', json_build_object(
      'signups', signups.cur_signups,
      'onboarded', cur.onboarded,
      'activated', cur.activated,
      'paywall_views', cur.paywall_views,
      'conversions', cur.conversions,
      'distinct_users', cur.distinct_users,
      'total_events', cur.total_events
    ),
    'previous', json_build_object(
      'signups', signups.prev_signups,
      'onboarded', prev.onboarded,
      'activated', prev.activated,
      'paywall_views', prev.paywall_views,
      'conversions', prev.conversions,
      'distinct_users', prev.distinct_users,
      'total_events', prev.total_events
    )
  ) INTO result
  FROM cur, prev, signups;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_overview(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_discovery_funnel(
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
    WHERE p_platform IS NULL
       OR signup_platform = p_platform
       OR last_seen_platform = p_platform
  ),
  step1 AS (
    SELECT user_id, MIN(created_at) AS at FROM analytics_events
    WHERE event_name = 'onboarding_completed'
      AND created_at >= v_start
      AND user_id IN (SELECT id FROM eligible)
    GROUP BY user_id
  ),
  step2 AS (
    SELECT s.user_id, MIN(e.created_at) AS at
    FROM step1 s
    JOIN analytics_events e ON e.user_id = s.user_id
    WHERE e.event_name = 'first_record_created' AND e.created_at >= s.at
    GROUP BY s.user_id
  ),
  step3 AS (
    SELECT s.user_id, MIN(e.created_at) AS at
    FROM step2 s
    JOIN analytics_events e ON e.user_id = s.user_id
    WHERE e.event_name = 'insights_tab_opened' AND e.created_at >= s.at
    GROUP BY s.user_id
  ),
  step4 AS (
    SELECT s.user_id, MIN(e.created_at) AS at
    FROM step3 s
    JOIN analytics_events e ON e.user_id = s.user_id
    WHERE e.event_name = 'yaia_first_message' AND e.created_at >= s.at
    GROUP BY s.user_id
  ),
  step5 AS (
    SELECT s.user_id, MIN(e.created_at) AS at
    FROM step4 s
    JOIN analytics_events e ON e.user_id = s.user_id
    WHERE e.event_name = 'super_report_viewed' AND e.created_at >= s.at
    GROUP BY s.user_id
  )
  SELECT json_build_object(
    'period_days', p_days,
    'platform', p_platform,
    'steps', json_build_array(
      json_build_object('key', 'onboarding_completed',  'label', 'Onboarding completo',  'count', (SELECT count(*) FROM step1)),
      json_build_object('key', 'first_record_created',  'label', 'Primeiro registro',    'count', (SELECT count(*) FROM step2)),
      json_build_object('key', 'insights_tab_opened',   'label', 'Abriu Insights',       'count', (SELECT count(*) FROM step3)),
      json_build_object('key', 'yaia_first_message',    'label', '1ª msg na YA·IA',      'count', (SELECT count(*) FROM step4)),
      json_build_object('key', 'super_report_viewed',   'label', 'Viu Super Relatório',  'count', (SELECT count(*) FROM step5))
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_discovery_funnel(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_monetization_funnel(
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
    WHERE p_platform IS NULL
       OR signup_platform = p_platform
       OR last_seen_platform = p_platform
  ),
  by_trigger AS (
    SELECT
      COALESCE(metadata->>'trigger', 'unknown') AS trigger,
      COUNT(*) FILTER (WHERE event_name = 'paywall_viewed') AS views,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'paywall_viewed') AS unique_views,
      COUNT(*) FILTER (WHERE event_name = 'paywall_dismissed') AS dismissed,
      COUNT(*) FILTER (WHERE event_name = 'subscription_started') AS subscribed
    FROM analytics_events
    WHERE event_name IN ('paywall_viewed', 'paywall_dismissed', 'subscription_started')
      AND created_at >= v_start
      AND user_id IN (SELECT id FROM eligible)
    GROUP BY COALESCE(metadata->>'trigger', 'unknown')
    HAVING COUNT(*) FILTER (WHERE event_name = 'paywall_viewed') > 0
       OR COUNT(*) FILTER (WHERE event_name = 'subscription_started') > 0
  ),
  totals AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'paywall_viewed') AS unique_paywall,
      COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'subscription_started') AS unique_subs
    FROM analytics_events
    WHERE event_name IN ('paywall_viewed', 'subscription_started')
      AND created_at >= v_start
      AND user_id IN (SELECT id FROM eligible)
  )
  SELECT json_build_object(
    'period_days', p_days,
    'platform', p_platform,
    'unique_paywall_views', t.unique_paywall,
    'unique_subscriptions', t.unique_subs,
    'overall_conversion_pct', CASE WHEN t.unique_paywall > 0
      THEN ROUND(100.0 * t.unique_subs / t.unique_paywall, 1)
      ELSE 0 END,
    'by_trigger', COALESCE(
      (SELECT json_agg(row_to_json(by_trigger.*) ORDER BY views DESC) FROM by_trigger),
      '[]'::json
    )
  ) INTO result
  FROM totals t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_monetization_funnel(int, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.analytics_last_touch(
  p_days int DEFAULT 30,
  p_window_hours int DEFAULT 24,
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
    WHERE p_platform IS NULL
       OR signup_platform = p_platform
       OR last_seen_platform = p_platform
  ),
  conversions AS (
    SELECT user_id, MIN(created_at) AS converted_at
    FROM analytics_events
    WHERE event_name = 'subscription_started'
      AND created_at >= v_start
      AND user_id IN (SELECT id FROM eligible)
    GROUP BY user_id
  ),
  last_touch AS (
    SELECT DISTINCT ON (c.user_id)
      c.user_id,
      e.event_name AS last_event,
      e.created_at AS touch_at,
      c.converted_at
    FROM conversions c
    JOIN analytics_events e ON e.user_id = c.user_id
      AND e.created_at BETWEEN c.converted_at - (p_window_hours || ' hours')::interval AND c.converted_at
      AND e.event_name NOT IN (
        'paywall_viewed', 'paywall_dismissed',
        'subscription_started', 'subscription_cancelled',
        'onboarding_completed'
      )
    ORDER BY c.user_id, e.created_at DESC
  ),
  bucketed AS (
    SELECT last_event, COUNT(*) AS conversions FROM last_touch GROUP BY last_event
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM conversions) AS total_conversions,
      (SELECT COUNT(*) FROM last_touch) AS attributed,
      (SELECT COUNT(*) FROM conversions) - (SELECT COUNT(*) FROM last_touch) AS cold
  )
  SELECT json_build_object(
    'period_days', p_days,
    'window_hours', p_window_hours,
    'platform', p_platform,
    'total_conversions', t.total_conversions,
    'attributed', t.attributed,
    'cold_conversions', t.cold,
    'breakdown', COALESCE(
      (SELECT json_agg(json_build_object(
        'event', last_event,
        'conversions', conversions,
        'pct', CASE WHEN t.attributed > 0
          THEN ROUND(100.0 * conversions / t.attributed, 1)
          ELSE 0 END
      ) ORDER BY conversions DESC) FROM bucketed),
      '[]'::json
    )
  ) INTO result
  FROM totals t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_last_touch(int, int, text) TO authenticated;
