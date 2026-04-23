-- yaIA: assistente conversacional com contexto do bebê
-- - yaia_conversations: persistência das mensagens (histórico por bebê)
-- - yaia_usage: contador mensal de perguntas para enforcement do limite free (10/mês)
-- - profiles.yaia_consent_at: flag de consent exibida na 1ª abertura da aba

-- ============================================================
-- 1. Tabela de conversas
-- ============================================================
CREATE TABLE IF NOT EXISTS yaia_conversations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id    uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yaia_conversations_user_baby_created
  ON yaia_conversations (user_id, baby_id, created_at DESC);

ALTER TABLE yaia_conversations ENABLE ROW LEVEL SECURITY;

-- Usuário lê só as suas próprias mensagens.
-- Writes são feitos pelo edge function (service_role bypassa RLS).
DROP POLICY IF EXISTS "yaia_conversations_select_own" ON yaia_conversations;
CREATE POLICY "yaia_conversations_select_own"
  ON yaia_conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Contador mensal (enforcement do limite free)
-- ============================================================
CREATE TABLE IF NOT EXISTS yaia_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key  text NOT NULL,               -- formato 'YYYY-MM' em UTC, definido no edge function
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_key)
);

ALTER TABLE yaia_usage ENABLE ROW LEVEL SECURITY;

-- Leitura própria pra UI mostrar "X de 10 usadas".
-- Writes são sempre via service_role (edge function).
DROP POLICY IF EXISTS "yaia_usage_select_own" ON yaia_usage;
CREATE POLICY "yaia_usage_select_own"
  ON yaia_usage
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 3. Consent na primeira abertura da yaIA
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS yaia_consent_at timestamptz;
