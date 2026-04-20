-- Enriquece admin_get_users com:
--  - platforms text[] (distintos de push_tokens + fallback p/ signup_platform)
--  - last_activity_at (GREATEST de created_at em todas as tabelas de atividade
--    onde o usuário é dono, + push_tokens.last_seen_at + profiles.last_seen_at)
--  - records_24h (count de registros inseridos nas últimas 24h, excluindo
--    auto_registered de baby_milestones/baby_vaccines pra não inflar em
--    usuários novos que acabam de criar um bebê)
--
-- CREATE OR REPLACE não aceita mudança da cláusula RETURNS TABLE, então
-- dropa + recria. Rollback: restaurar a versão anterior abaixo em comentário.

DROP FUNCTION IF EXISTS public.admin_get_users();

CREATE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  is_premium boolean,
  is_admin boolean,
  subscription_plan text,
  subscription_status text,
  signup_platform text,
  last_seen_at timestamptz,
  last_seen_platform text,
  courtesy_expires_at timestamptz,
  courtesy_reason text,
  platforms text[],
  last_activity_at timestamptz,
  records_24h integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH cutoff AS (
    SELECT (now() - interval '24 hours') AS ts_24h
  ),
  platforms_agg AS (
    SELECT pt.user_id,
           array_agg(DISTINCT pt.platform ORDER BY pt.platform) AS platforms,
           MAX(pt.last_seen_at) AS max_token_seen
    FROM push_tokens pt
    WHERE pt.platform IS NOT NULL
    GROUP BY pt.user_id
  ),
  logs_agg AS (
    SELECT l.created_by AS uid,
           MAX(l.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE l.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM logs l
    WHERE l.created_by IS NOT NULL
    GROUP BY l.created_by
  ),
  medlogs_agg AS (
    SELECT ml.administered_by AS uid,
           MAX(ml.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE ml.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM medication_logs ml
    WHERE ml.administered_by IS NOT NULL
    GROUP BY ml.administered_by
  ),
  shifts_agg AS (
    SELECT cs.caregiver_id AS uid,
           MAX(cs.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE cs.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM caregiver_shifts cs
    WHERE cs.caregiver_id IS NOT NULL
    GROUP BY cs.caregiver_id
  ),
  leap_notes_agg AS (
    SELECT ln.recorded_by AS uid,
           MAX(ln.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE ln.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM leap_notes ln
    WHERE ln.recorded_by IS NOT NULL
    GROUP BY ln.recorded_by
  ),
  leap_mood_agg AS (
    SELECT lme.recorded_by AS uid,
           MAX(lme.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE lme.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM leap_mood_entries lme
    WHERE lme.recorded_by IS NOT NULL
    GROUP BY lme.recorded_by
  ),
  vaccines_agg AS (
    SELECT bv.recorded_by AS uid,
           MAX(bv.created_at) AS last_ts,
           COUNT(*) FILTER (
             WHERE bv.created_at > (SELECT ts_24h FROM cutoff)
               AND bv.auto_registered IS NOT TRUE
           )::int AS cnt_24h
    FROM baby_vaccines bv
    WHERE bv.recorded_by IS NOT NULL
    GROUP BY bv.recorded_by
  ),
  milestones_agg AS (
    SELECT bm.recorded_by AS uid,
           MAX(bm.created_at) AS last_ts,
           COUNT(*) FILTER (
             WHERE bm.created_at > (SELECT ts_24h FROM cutoff)
               AND bm.auto_registered IS NOT TRUE
           )::int AS cnt_24h
    FROM baby_milestones bm
    WHERE bm.recorded_by IS NOT NULL
    GROUP BY bm.recorded_by
  )
  SELECT
    p.id,
    u.email::text,
    p.created_at,
    p.is_premium,
    p.is_admin,
    p.subscription_plan,
    p.subscription_status,
    p.signup_platform,
    p.last_seen_at,
    p.last_seen_platform,
    p.courtesy_expires_at,
    p.courtesy_reason,
    COALESCE(
      pa.platforms,
      CASE
        WHEN p.signup_platform IS NOT NULL THEN ARRAY[p.signup_platform]
        ELSE ARRAY[]::text[]
      END
    ) AS platforms,
    GREATEST(
      la.last_ts, ma.last_ts, sa.last_ts,
      lna.last_ts, lma.last_ts,
      va.last_ts, mia.last_ts,
      pa.max_token_seen,
      p.last_seen_at
    ) AS last_activity_at,
    (
      COALESCE(la.cnt_24h, 0) +
      COALESCE(ma.cnt_24h, 0) +
      COALESCE(sa.cnt_24h, 0) +
      COALESCE(lna.cnt_24h, 0) +
      COALESCE(lma.cnt_24h, 0) +
      COALESCE(va.cnt_24h, 0) +
      COALESCE(mia.cnt_24h, 0)
    )::int AS records_24h
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN platforms_agg pa ON pa.user_id = p.id
  LEFT JOIN logs_agg la ON la.uid = p.id
  LEFT JOIN medlogs_agg ma ON ma.uid = p.id
  LEFT JOIN shifts_agg sa ON sa.uid = p.id
  LEFT JOIN leap_notes_agg lna ON lna.uid = p.id
  LEFT JOIN leap_mood_agg lma ON lma.uid = p.id
  LEFT JOIN vaccines_agg va ON va.uid = p.id
  LEFT JOIN milestones_agg mia ON mia.uid = p.id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- Rollback (recria versão antiga sem campos enriquecidos):
-- DROP FUNCTION IF EXISTS public.admin_get_users();
-- CREATE FUNCTION public.admin_get_users()
-- RETURNS TABLE (id uuid, email text, created_at timestamptz, is_premium boolean,
--                is_admin boolean, subscription_plan text, subscription_status text,
--                signup_platform text, last_seen_at timestamptz,
--                courtesy_expires_at timestamptz, courtesy_reason text)
-- LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
--     RAISE EXCEPTION 'Unauthorized';
--   END IF;
--   RETURN QUERY
--   SELECT p.id, u.email::TEXT, p.created_at, p.is_premium, p.is_admin,
--          p.subscription_plan, p.subscription_status, p.signup_platform,
--          p.last_seen_at, p.courtesy_expires_at, p.courtesy_reason
--   FROM profiles p JOIN auth.users u ON u.id = p.id
--   ORDER BY p.created_at DESC;
-- END; $$;
