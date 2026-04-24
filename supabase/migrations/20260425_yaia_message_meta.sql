-- yaIA UX overhaul: persist sources/suggestions + daily limit enforcement.
--
-- 1) yaia_conversations ganha sources/suggestions (jsonb). Hoje só texto
--    persiste; chips do blog e suggestion chips sumiam ao sair/voltar da tela.
--    `sources` é sempre persistido. `suggestions` só renderiza na ÚLTIMA
--    assistant (continua sendo "volátil por turno" — o hook zera das
--    anteriores ao chegar resposta nova), mas sobrevive a reload.
--
-- 2) yaia_usage ganha enforcement diário. Limite free muda de 10/mês puro
--    pra 2/dia com teto 15/mês. Motivação: UX ruim quando usuário chega
--    em 0 e fica semanas travado. Diário + teto mensal cria gancho de uso
--    recorrente sem estourar custo (~US$ 0,04/msg × 15 = US$ 0,60/user/mês).

-- ============================================================
-- 1. yaia_conversations: sources + suggestions
-- ============================================================
ALTER TABLE yaia_conversations
  ADD COLUMN IF NOT EXISTS sources jsonb,
  ADD COLUMN IF NOT EXISTS suggestions jsonb;

COMMENT ON COLUMN yaia_conversations.sources IS
  'Links do blog citados pela IA. Formato: [{"title":"...","url":"..."}]. Persistido e exibido quando a mensagem é carregada do histórico.';

COMMENT ON COLUMN yaia_conversations.suggestions IS
  'Suggestion chips propostos pela IA. Formato: ["...","..."]. Só renderiza na última assistant (volátil por turno), mas sobrevive a reload da tela.';

-- ============================================================
-- 2. yaia_usage: enforcement diário
-- ============================================================
ALTER TABLE yaia_usage
  ADD COLUMN IF NOT EXISTS day_key text,
  ADD COLUMN IF NOT EXISTS day_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN yaia_usage.day_key IS
  'YYYY-MM-DD em UTC. Rotaciona diariamente; quando edge function detecta que day_key != hoje, zera day_count e atualiza.';

COMMENT ON COLUMN yaia_usage.day_count IS
  'Contador diário. Reset automático pelo edge function quando o dia vira. Limite free: 2/dia.';

-- Index pra lookup rápido por (user_id, day_key) no edge function.
CREATE INDEX IF NOT EXISTS yaia_usage_user_day_idx
  ON yaia_usage (user_id, day_key);
