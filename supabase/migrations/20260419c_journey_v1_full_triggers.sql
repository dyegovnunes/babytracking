-- Jornada v1 · triggers completos dos 16 achievements
--
-- Cobre todos os triggers restantes diretamente em Postgres:
--   - three_different_kinds (log INSERT): feed + sleep + diaper
--   - first_full_day (log INSERT): logs nos 3 turnos do mesmo dia
--   - ten_feeds (log INSERT): 10 logs de feed categoria
--   - first_full_night (log INSERT de wake): par sleep->wake ≥ 6h
--   - first_caregiver (baby_members INSERT role='caregiver')
--   - first_shared_report (shared_reports INSERT)
--
-- Temporais (avaliados sob demanda via função check_user_achievements):
--   - first_week: streak ≥ 7
--   - thirty_days_streak: streak ≥ 30
--   - baby_one_month: baby_age_days ≥ 30
--   - hundred_entries: count(logs) ≥ 100 (também via trigger de log)
--   - first_month_in_app: days_since_signup ≥ 30
--
-- A função check_user_achievements é chamada via RPC pelo client
-- no load da home, garantindo avaliação 'preguiçosa' (no momento que
-- importa) sem precisar de cron — elimina dependência de edge function.

CREATE OR REPLACE FUNCTION _unlock_for_parents(
  p_baby_id uuid,
  p_achievement_key text,
  p_baby_scope boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  FOR v_parent_id IN
    SELECT user_id FROM baby_members
    WHERE baby_id = p_baby_id AND role = 'parent'
  LOOP
    INSERT INTO app_achievements (user_id, baby_id, achievement_key)
    VALUES (
      v_parent_id,
      CASE WHEN p_baby_scope THEN p_baby_id ELSE NULL END,
      p_achievement_key
    )
    ON CONFLICT (user_id, baby_id, achievement_key) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION check_log_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_categories text[];
  v_periods text[];
  v_feed_count int;
  v_total_count int;
  v_last_sleep_ts bigint;
  v_duration_h numeric;
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT CASE
      WHEN event_id LIKE 'breast_%' OR event_id = 'bottle' THEN 'feed'
      WHEN event_id = 'sleep' OR event_id = 'wake' THEN 'sleep'
      WHEN event_id LIKE 'diaper_%' THEN 'diaper'
      ELSE 'other'
    END
    FROM logs WHERE baby_id = NEW.baby_id
  ) INTO v_categories;

  IF 'feed' = ANY(v_categories) AND 'sleep' = ANY(v_categories)
     AND 'diaper' = ANY(v_categories) THEN
    PERFORM _unlock_for_parents(NEW.baby_id, 'three_different_kinds', true);
  END IF;

  WITH log_hour AS (
    SELECT EXTRACT(HOUR FROM
      to_timestamp((timestamp / 1000) - 3*3600) AT TIME ZONE 'UTC') AS h,
      FLOOR(((timestamp / 1000) - 3*3600) / 86400) AS day_idx
    FROM logs WHERE baby_id = NEW.baby_id
  ), today_logs AS (
    SELECT h FROM log_hour
    WHERE day_idx = FLOOR(((NEW.timestamp / 1000) - 3*3600) / 86400)
  )
  SELECT ARRAY(
    SELECT DISTINCT
      CASE
        WHEN h >= 5 AND h < 12 THEN 'morning'
        WHEN h >= 12 AND h < 18 THEN 'afternoon'
        ELSE 'night'
      END
    FROM today_logs
  ) INTO v_periods;

  IF 'morning' = ANY(v_periods) AND 'afternoon' = ANY(v_periods)
     AND 'night' = ANY(v_periods) THEN
    PERFORM _unlock_for_parents(NEW.baby_id, 'first_full_day', true);
  END IF;

  SELECT COUNT(*) INTO v_feed_count
  FROM logs
  WHERE baby_id = NEW.baby_id
    AND (event_id LIKE 'breast_%' OR event_id = 'bottle');
  IF v_feed_count >= 10 THEN
    PERFORM _unlock_for_parents(NEW.baby_id, 'ten_feeds', true);
  END IF;

  SELECT COUNT(*) INTO v_total_count FROM logs WHERE baby_id = NEW.baby_id;
  IF v_total_count >= 100 THEN
    PERFORM _unlock_for_parents(NEW.baby_id, 'hundred_entries', true);
  END IF;

  IF NEW.event_id = 'wake' THEN
    SELECT timestamp INTO v_last_sleep_ts
    FROM logs
    WHERE baby_id = NEW.baby_id
      AND event_id = 'sleep'
      AND timestamp < NEW.timestamp
    ORDER BY timestamp DESC
    LIMIT 1;

    IF v_last_sleep_ts IS NOT NULL THEN
      v_duration_h := (NEW.timestamp - v_last_sleep_ts) / 1000.0 / 3600.0;
      IF v_duration_h >= 6 THEN
        PERFORM _unlock_for_parents(NEW.baby_id, 'first_full_night', true);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_log_achievements ON logs;
CREATE TRIGGER trg_check_log_achievements
  AFTER INSERT ON logs
  FOR EACH ROW
  EXECUTE FUNCTION check_log_achievements();

CREATE OR REPLACE FUNCTION check_caregiver_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'caregiver' THEN
    PERFORM _unlock_for_parents(NEW.baby_id, 'first_caregiver', false);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_caregiver_achievement ON baby_members;
CREATE TRIGGER trg_check_caregiver_achievement
  AFTER INSERT ON baby_members
  FOR EACH ROW
  EXECUTE FUNCTION check_caregiver_achievement();

CREATE OR REPLACE FUNCTION check_shared_report_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO app_achievements (user_id, baby_id, achievement_key)
  VALUES (NEW.user_id, NULL, 'first_shared_report')
  ON CONFLICT (user_id, baby_id, achievement_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_shared_report ON shared_reports;
CREATE TRIGGER trg_check_shared_report
  AFTER INSERT ON shared_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_shared_report_achievement();

CREATE OR REPLACE FUNCTION check_user_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_days_since_signup int;
  v_baby_id uuid;
  v_baby_age_days int;
  v_streak int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::int / 86400
  INTO v_days_since_signup
  FROM auth.users WHERE id = v_user_id;

  IF v_days_since_signup >= 30 THEN
    INSERT INTO app_achievements (user_id, baby_id, achievement_key)
    VALUES (v_user_id, NULL, 'first_month_in_app')
    ON CONFLICT DO NOTHING;
  END IF;

  FOR v_baby_id IN
    SELECT baby_id FROM baby_members
    WHERE user_id = v_user_id AND role = 'parent'
  LOOP
    SELECT EXTRACT(EPOCH FROM (NOW() - birth_date::timestamp))::int / 86400
    INTO v_baby_age_days
    FROM babies WHERE id = v_baby_id;

    IF v_baby_age_days >= 30 THEN
      INSERT INTO app_achievements (user_id, baby_id, achievement_key)
      VALUES (v_user_id, v_baby_id, 'baby_one_month')
      ON CONFLICT DO NOTHING;
    END IF;

    SELECT current_streak INTO v_streak
    FROM streaks WHERE baby_id = v_baby_id;

    IF v_streak >= 7 THEN
      INSERT INTO app_achievements (user_id, baby_id, achievement_key)
      VALUES (v_user_id, NULL, 'first_week')
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_streak >= 30 THEN
      INSERT INTO app_achievements (user_id, baby_id, achievement_key)
      VALUES (v_user_id, NULL, 'thirty_days_streak')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_achievements() TO authenticated;
