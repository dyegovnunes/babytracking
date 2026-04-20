-- Fix para admin_get_stats:
-- Versão antiga contava premium_users = is_premium=true (que inclui cortesia),
-- e a conversão derivada disso ficava enganosa (7/22 = 31% com cortesia
-- contando como "premium pagante").
--
-- Esta versão adiciona `paying_users` e `courtesy_users` separados, mantendo
-- os campos antigos pra compatibilidade. AdminDashboardPage já consome os
-- novos campos e calcula "conversão real" = paying / (paying + free).
--
-- Outros ajustes: excluir admins de DAU/WAU/MAU (não representam mercado).
-- Filtros de logs continuam via created_at — é quando o registro foi INSERIDO
-- (refletindo ação do usuário), não o campo timestamp (bigint ms, que pode
-- ser backdated pelo usuário editando um log antigo).

DROP FUNCTION IF EXISTS public.admin_get_stats();

CREATE FUNCTION public.admin_get_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  today_start TIMESTAMPTZ;
  week_start TIMESTAMPTZ;
  month_start TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  today_start := date_trunc('day', now());
  week_start := date_trunc('day', now() - interval '7 days');
  month_start := date_trunc('day', now() - interval '30 days');

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'new_today', (SELECT count(*) FROM profiles WHERE created_at >= today_start),
    'new_this_week', (SELECT count(*) FROM profiles WHERE created_at >= week_start),

    -- Campo legado (mantido pra não quebrar consumidores antigos):
    -- inclui pagantes + cortesia.
    'premium_users', (SELECT count(*) FROM profiles WHERE is_premium = true),

    -- Novos buckets separados:
    'paying_users', (
      SELECT count(*) FROM profiles
      WHERE is_premium = true
        AND subscription_plan IN ('monthly', 'annual', 'lifetime')
        AND NOT (
          subscription_plan = 'courtesy_lifetime' OR
          (courtesy_expires_at IS NOT NULL AND courtesy_expires_at > now())
        )
    ),
    'courtesy_users', (
      SELECT count(*) FROM profiles
      WHERE subscription_plan = 'courtesy_lifetime'
         OR (courtesy_expires_at IS NOT NULL AND courtesy_expires_at > now())
    ),

    'free_users', (
      SELECT count(*) FROM profiles
      WHERE (is_premium = false OR is_premium IS NULL)
    ),

    'total_babies', (SELECT count(*) FROM babies),
    'total_logs', (SELECT count(*) FROM logs),
    'logs_today', (SELECT count(*) FROM logs WHERE created_at >= today_start),
    'logs_this_week', (SELECT count(*) FROM logs WHERE created_at >= week_start),
    'active_streaks', (SELECT count(*) FROM streaks WHERE current_streak > 0),

    -- DAU/WAU/MAU excluem contas admin (não representam mercado).
    'dau', (
      SELECT count(DISTINCT l.created_by)
      FROM logs l
      LEFT JOIN profiles p ON p.id = l.created_by
      WHERE l.created_at >= today_start
        AND (p.is_admin IS DISTINCT FROM true)
    ),
    'wau', (
      SELECT count(DISTINCT l.created_by)
      FROM logs l
      LEFT JOIN profiles p ON p.id = l.created_by
      WHERE l.created_at >= week_start
        AND (p.is_admin IS DISTINCT FROM true)
    ),
    'mau', (
      SELECT count(DISTINCT l.created_by)
      FROM logs l
      LEFT JOIN profiles p ON p.id = l.created_by
      WHERE l.created_at >= month_start
        AND (p.is_admin IS DISTINCT FROM true)
    ),

    'avg_users_per_baby', (
      SELECT COALESCE(ROUND(AVG(member_count)::numeric, 1), 0)
      FROM (
        SELECT baby_id, count(*) AS member_count
        FROM baby_members
        GROUP BY baby_id
      ) sub
    ),
    'multi_caregiver_babies', (
      SELECT count(*) FROM (
        SELECT baby_id
        FROM baby_members
        GROUP BY baby_id
        HAVING count(*) > 1
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
