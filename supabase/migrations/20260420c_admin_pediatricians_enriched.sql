-- v2 do admin_get_pediatricians: enriquece com presença, atividade,
-- plataformas e contagens (pacientes via pediatrician_patients +
-- baby_members onde role != 'pediatrician'). Tambem adiciona
-- admin_get_pediatrician_patients pra detalhe e ajusta o filtro
-- de admin_get_users.
--
-- Filtro robusto em admin_get_users: exclui APENAS usuarios que sao
-- pediatras E nao tem nenhum baby_members com role != 'pediatrician'.
-- Pediatra que tambem e pai/cuidador continua aparecendo na aba de
-- usuarios e na aba de pediatras.

DROP FUNCTION IF EXISTS public.admin_get_pediatricians();

CREATE FUNCTION public.admin_get_pediatricians()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  name text,
  crm text,
  crm_state text,
  rqe text[],
  specialties text[],
  invite_code text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz,
  baby_members_count integer,
  patients_count integer,
  last_seen_at timestamptz,
  last_seen_platform text,
  last_activity_at timestamptz,
  platforms text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH plats AS (
    SELECT pt.user_id,
           array_agg(DISTINCT pt.platform ORDER BY pt.platform) AS platforms,
           MAX(pt.last_seen_at) AS max_token_seen
    FROM push_tokens pt
    WHERE pt.platform IS NOT NULL
    GROUP BY pt.user_id
  )
  SELECT
    p.id, p.user_id, u.email::text, p.name, p.crm, p.crm_state,
    p.rqe, p.specialties, p.invite_code,
    p.approved_at, p.approved_by, p.created_at,
    (SELECT COUNT(*)::int FROM baby_members bm
       WHERE bm.user_id = p.user_id AND bm.role <> 'pediatrician') AS baby_members_count,
    (SELECT COUNT(*)::int FROM pediatrician_patients pp
       WHERE pp.pediatrician_id = p.id AND pp.unlinked_at IS NULL) AS patients_count,
    pf.last_seen_at,
    pf.last_seen_platform,
    GREATEST(
      pf.last_seen_at,
      pl.max_token_seen,
      (SELECT MAX(l.created_at) FROM logs l WHERE l.created_by = p.user_id),
      (SELECT MAX(ml.created_at) FROM medication_logs ml WHERE ml.administered_by = p.user_id),
      (SELECT MAX(cs.created_at) FROM caregiver_shifts cs WHERE cs.caregiver_id = p.user_id),
      (SELECT MAX(ln.created_at) FROM leap_notes ln WHERE ln.recorded_by = p.user_id),
      (SELECT MAX(lme.created_at) FROM leap_mood_entries lme WHERE lme.recorded_by = p.user_id),
      (SELECT MAX(bv.created_at) FROM baby_vaccines bv WHERE bv.recorded_by = p.user_id),
      (SELECT MAX(bm2.created_at) FROM baby_milestones bm2 WHERE bm2.recorded_by = p.user_id)
    ) AS last_activity_at,
    COALESCE(pl.platforms, ARRAY[]::text[]) AS platforms
  FROM pediatricians p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN profiles pf ON pf.id = p.user_id
  LEFT JOIN plats pl ON pl.user_id = p.user_id
  ORDER BY (p.approved_at IS NOT NULL), p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_pediatricians() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_pediatrician_patients(p_pediatrician_id uuid)
RETURNS TABLE (
  baby_id uuid,
  baby_name text,
  baby_gender text,
  baby_birth_date date,
  linked_at timestamptz,
  unlinked_at timestamptz,
  unlink_reason text,
  parent_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    pp.baby_id,
    b.name AS baby_name,
    b.gender::text AS baby_gender,
    b.birth_date AS baby_birth_date,
    pp.linked_at,
    pp.unlinked_at,
    pp.unlink_reason,
    (SELECT u.email::text FROM baby_members bm
       JOIN auth.users u ON u.id = bm.user_id
       WHERE bm.baby_id = pp.baby_id AND bm.role = 'parent'
       LIMIT 1) AS parent_email
  FROM pediatrician_patients pp
  JOIN babies b ON b.id = pp.baby_id
  WHERE pp.pediatrician_id = p_pediatrician_id
  ORDER BY (pp.unlinked_at IS NOT NULL), pp.linked_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_pediatrician_patients(uuid) TO authenticated;

-- admin_get_users com filtro robusto
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
    COALESCE(pa.platforms,
      CASE WHEN p.signup_platform IS NOT NULL THEN ARRAY[p.signup_platform] ELSE ARRAY[]::text[] END
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
  WHERE
    NOT (
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
