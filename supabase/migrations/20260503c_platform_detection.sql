-- Platform detection: corrigir o problema de "—" na coluna Plataforma
-- do painel admin pra quase todos os usuários.
--
-- Antes: signup_platform NUNCA era escrito (0/35 users tinham). admin_get_users
-- só lia push_tokens (4/35 users) + signup_platform (0/35), por isso 31/35
-- apareciam como "—".
--
-- Mudanças (3 frentes):
--
-- 1) BACKFILL (one-time, ja rodado em runtime):
--    UPDATE profiles SET signup_platform = COALESCE(last_seen_platform, push_tokens.platform)
--    pra users existentes. Pegou 22 + 1 = 23 dos 35.
--
-- 2) handle_new_user trigger agora le signup_platform de raw_user_meta_data,
--    populando no INSERT inicial. Funciona pra signInWithOtp (que passa via
--    options.data). OAuth providers nao injetam custom claims, então pra
--    Google/Apple o tracking acontece via touch_last_seen (item 3).
--
-- 3) touch_last_seen agora tambem popula signup_platform oportunisticamente
--    se ainda for null. Anti-spam preservado: roda quando passa 5min OU
--    quando signup_platform é null + recebe platform novo.
--
-- 4) admin_get_users ARRAY-merge das 3 fontes (push_tokens + signup +
--    last_seen) deduplicado. Antes COALESCE pegava só uma. Agora user
--    que migrou de Web pra iOS aparece como "iOS | Web".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, signup_platform)
  VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data->>'signup_platform', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    signup_platform = COALESCE(profiles.signup_platform, EXCLUDED.signup_platform);
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.touch_last_seen(p_platform text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  UPDATE profiles
  SET last_seen_at = now(),
      last_seen_platform = COALESCE(p_platform, last_seen_platform),
      signup_platform = COALESCE(signup_platform, p_platform)
  WHERE id = auth.uid()
    AND (
      last_seen_at IS NULL
      OR last_seen_at < now() - interval '5 minutes'
      OR (signup_platform IS NULL AND p_platform IS NOT NULL)
    );
END;
$$;


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
  WITH cutoff AS (SELECT (now() - interval '24 hours') AS ts_24h),
  platforms_agg AS (
    SELECT pt.user_id,
           array_agg(DISTINCT pt.platform ORDER BY pt.platform) AS platforms,
           MAX(pt.last_seen_at) AS max_token_seen
    FROM push_tokens pt WHERE pt.platform IS NOT NULL GROUP BY pt.user_id
  ),
  logs_agg AS (
    SELECT l.created_by AS uid, MAX(l.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE l.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM logs l WHERE l.created_by IS NOT NULL GROUP BY l.created_by
  ),
  medlogs_agg AS (
    SELECT ml.administered_by AS uid, MAX(ml.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE ml.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM medication_logs ml WHERE ml.administered_by IS NOT NULL GROUP BY ml.administered_by
  ),
  shifts_agg AS (
    SELECT cs.caregiver_id AS uid, MAX(cs.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE cs.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM caregiver_shifts cs WHERE cs.caregiver_id IS NOT NULL GROUP BY cs.caregiver_id
  ),
  leap_notes_agg AS (
    SELECT ln.recorded_by AS uid, MAX(ln.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE ln.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM leap_notes ln WHERE ln.recorded_by IS NOT NULL GROUP BY ln.recorded_by
  ),
  leap_mood_agg AS (
    SELECT lme.recorded_by AS uid, MAX(lme.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE lme.created_at > (SELECT ts_24h FROM cutoff))::int AS cnt_24h
    FROM leap_mood_entries lme WHERE lme.recorded_by IS NOT NULL GROUP BY lme.recorded_by
  ),
  vaccines_agg AS (
    SELECT bv.recorded_by AS uid, MAX(bv.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE bv.created_at > (SELECT ts_24h FROM cutoff) AND bv.auto_registered IS NOT TRUE)::int AS cnt_24h
    FROM baby_vaccines bv WHERE bv.recorded_by IS NOT NULL GROUP BY bv.recorded_by
  ),
  milestones_agg AS (
    SELECT bm.recorded_by AS uid, MAX(bm.created_at) AS last_ts,
           COUNT(*) FILTER (WHERE bm.created_at > (SELECT ts_24h FROM cutoff) AND bm.auto_registered IS NOT TRUE)::int AS cnt_24h
    FROM baby_milestones bm WHERE bm.recorded_by IS NOT NULL GROUP BY bm.recorded_by
  )
  SELECT
    p.id, u.email::text, p.created_at, p.is_premium, p.is_admin,
    p.subscription_plan, p.subscription_status, p.signup_platform,
    p.last_seen_at, p.last_seen_platform, p.courtesy_expires_at, p.courtesy_reason,
    -- Merge das 3 fontes (push_tokens + signup_platform + last_seen_platform)
    -- Deduplica e ordena alfabeticamente. Antes COALESCE pegava só a primeira.
    ARRAY(
      SELECT DISTINCT x FROM unnest(
        array_cat(
          array_cat(
            COALESCE(pa.platforms, ARRAY[]::text[]),
            CASE WHEN p.signup_platform IS NOT NULL THEN ARRAY[p.signup_platform] ELSE ARRAY[]::text[] END
          ),
          CASE WHEN p.last_seen_platform IS NOT NULL THEN ARRAY[p.last_seen_platform] ELSE ARRAY[]::text[] END
        )
      ) x
      WHERE x IS NOT NULL
      ORDER BY x
    ) AS platforms,
    GREATEST(la.last_ts, ma.last_ts, sa.last_ts, lna.last_ts, lma.last_ts,
             va.last_ts, mia.last_ts, pa.max_token_seen, p.last_seen_at) AS last_activity_at,
    (COALESCE(la.cnt_24h, 0) + COALESCE(ma.cnt_24h, 0) + COALESCE(sa.cnt_24h, 0)
     + COALESCE(lna.cnt_24h, 0) + COALESCE(lma.cnt_24h, 0)
     + COALESCE(va.cnt_24h, 0) + COALESCE(mia.cnt_24h, 0))::int AS records_24h
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
  WHERE NOT (
    EXISTS (SELECT 1 FROM pediatricians ped WHERE ped.user_id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM baby_members bm
      WHERE bm.user_id = p.id AND bm.role <> 'pediatrician'
    )
  )
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;


-- BACKFILL (one-time): preenche signup_platform pra users existentes onde dá
-- pra inferir via last_seen_platform ou push_tokens.
UPDATE profiles
SET signup_platform = last_seen_platform
WHERE signup_platform IS NULL AND last_seen_platform IS NOT NULL;

UPDATE profiles p
SET signup_platform = (
  SELECT pt.platform FROM push_tokens pt
  WHERE pt.user_id = p.id AND pt.platform IS NOT NULL
  ORDER BY pt.updated_at DESC NULLS LAST
  LIMIT 1
)
WHERE p.signup_platform IS NULL
  AND EXISTS (SELECT 1 FROM push_tokens WHERE user_id = p.id AND platform IS NOT NULL);
