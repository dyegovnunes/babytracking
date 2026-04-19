-- Jornada v1 · unlocks imediatos via Postgres em vez de edge function.
--
-- Problema original: edge function achievement-checker retorna 401 quando
-- chamada via supabase.functions.invoke do client (issue de JWT forwarding).
-- Solução: fazer os unlocks imediatos direto no Postgres:
--
--   1. track_feature_seen extendido — quando user entra numa feature,
--      insert também em app_achievements o discovered_* correspondente
--
--   2. Trigger on logs AFTER INSERT — quando user insere primeiro log
--      pro bebê, unlock first_log
--
-- Ambos rodam com SECURITY DEFINER (bypassing RLS), então o INSERT em
-- app_achievements é permitido mesmo sem policy de INSERT pra user.

-- --------------------------------------------------------------
-- 1. track_feature_seen — agora também destrava discovered_*
-- --------------------------------------------------------------

CREATE OR REPLACE FUNCTION track_feature_seen(p_feature_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Marca feature vista
  INSERT INTO user_feature_seen (user_id, feature_key)
  VALUES (auth.uid(), p_feature_key)
  ON CONFLICT (user_id, feature_key) DO NOTHING;

  -- Mapeia feature → achievement de descoberta
  v_achievement_key := CASE p_feature_key
    WHEN 'insights'    THEN 'discovered_insights'
    WHEN 'milestones'  THEN 'discovered_milestones'
    WHEN 'vaccines'    THEN 'discovered_vaccines'
    WHEN 'leaps'       THEN 'discovered_leaps'
    WHEN 'medications' THEN 'discovered_medications'
    ELSE NULL
  END;

  -- Se é uma feature com achievement associado, destrava (idempotente)
  IF v_achievement_key IS NOT NULL THEN
    INSERT INTO app_achievements (user_id, baby_id, achievement_key)
    VALUES (auth.uid(), NULL, v_achievement_key)
    ON CONFLICT (user_id, baby_id, achievement_key) DO NOTHING;
  END IF;
END;
$$;

-- --------------------------------------------------------------
-- 2. Trigger on logs — unlock first_log no primeiro INSERT por baby
-- --------------------------------------------------------------

CREATE OR REPLACE FUNCTION unlock_first_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  -- Busca o parent do bebê pra atribuir o achievement
  -- (Multi-parent: se tiver mais de um, insere pra todos)
  FOR v_parent_id IN
    SELECT user_id FROM baby_members
    WHERE baby_id = NEW.baby_id AND role = 'parent'
  LOOP
    INSERT INTO app_achievements (user_id, baby_id, achievement_key)
    VALUES (v_parent_id, NEW.baby_id, 'first_log')
    ON CONFLICT (user_id, baby_id, achievement_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_first_log ON logs;
CREATE TRIGGER trg_unlock_first_log
  AFTER INSERT ON logs
  FOR EACH ROW
  EXECUTE FUNCTION unlock_first_log();
