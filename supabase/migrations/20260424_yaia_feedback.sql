-- yaIA feedback: thumbs up/down + motivo por mensagem da IA.
-- Alimentado pelo long-press menu da bubble.

CREATE TABLE IF NOT EXISTS yaia_feedback (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  uuid NOT NULL REFERENCES yaia_conversations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating IN (-1, 1)),
  reason_tag  text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_yaia_feedback_message
  ON yaia_feedback (message_id);

ALTER TABLE yaia_feedback ENABLE ROW LEVEL SECURITY;

-- Usuario pode ler e escrever so o proprio feedback.
DROP POLICY IF EXISTS "yaia_feedback_own" ON yaia_feedback;
CREATE POLICY "yaia_feedback_own"
  ON yaia_feedback
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
