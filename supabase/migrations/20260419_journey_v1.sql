-- Jornada v1 · Fase 2 — Trilha de Descoberta + Conquista
--
-- Três tabelas:
--   1. app_achievements: marcos desbloqueados por user (+ opcional baby).
--      seen_at=null até o user abrir o AchievementSheet/celebration.
--   2. user_feature_seen: flag de "user abriu tela X pela 1ª vez", usada
--      pra disparar achievements de descoberta (discovered_*).
--   3. dismissed_hints: user fechou hint com X, não mostrar de novo.
--
-- Duas funções SECURITY DEFINER:
--   - track_feature_seen(feature_key): chamada via RPC por useFeatureSeen
--   - mark_achievement_seen(key, baby_id): chamada quando user tappa no card
--
-- INSERTs em app_achievements ficam restritos à edge function
-- achievement-checker (service role), não abrimos policy genérica.

CREATE TABLE IF NOT EXISTS app_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id uuid REFERENCES babies(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT NOW(),
  seen_at timestamptz,
  UNIQUE(user_id, baby_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_app_achievements_user
  ON app_achievements(user_id, unlocked_at DESC);

ALTER TABLE app_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own achievements" ON app_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user marks own seen" ON app_achievements
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feature_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_seen_user
  ON user_feature_seen(user_id);

ALTER TABLE user_feature_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user sees own feature_seen" ON user_feature_seen
  FOR SELECT USING (user_id = auth.uid());

-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dismissed_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hint_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, hint_key)
);

CREATE INDEX IF NOT EXISTS idx_dismissed_hints_user
  ON dismissed_hints(user_id);

ALTER TABLE dismissed_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manages own dismissed_hints" ON dismissed_hints
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --------------------------------------------------------------
-- Funções SECURITY DEFINER
-- --------------------------------------------------------------

CREATE OR REPLACE FUNCTION track_feature_seen(p_feature_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO user_feature_seen (user_id, feature_key)
  VALUES (auth.uid(), p_feature_key)
  ON CONFLICT (user_id, feature_key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION track_feature_seen(text) TO authenticated;

CREATE OR REPLACE FUNCTION mark_achievement_seen(p_key text, p_baby_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE app_achievements
  SET seen_at = NOW()
  WHERE user_id = auth.uid()
    AND achievement_key = p_key
    AND ((baby_id = p_baby_id) OR (baby_id IS NULL AND p_baby_id IS NULL))
    AND seen_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_achievement_seen(text, uuid) TO authenticated;
