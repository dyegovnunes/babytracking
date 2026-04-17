-- Resumo diário do caregiver (um registro por baby+caregiver+dia)
CREATE TABLE IF NOT EXISTS caregiver_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INT CHECK (mood_score BETWEEN 1 AND 5),
  note TEXT CHECK (char_length(note) <= 280),
  quick_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(baby_id, caregiver_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_caregiver_shifts_baby_date
  ON caregiver_shifts(baby_id, shift_date DESC);

ALTER TABLE caregiver_shifts ENABLE ROW LEVEL SECURITY;

-- Caregiver gerencia o próprio shift
DROP POLICY IF EXISTS "Caregiver manages own shift" ON caregiver_shifts;
CREATE POLICY "Caregiver manages own shift" ON caregiver_shifts
  FOR ALL
  USING (caregiver_id = auth.uid())
  WITH CHECK (caregiver_id = auth.uid());

-- Parents/guardians do bebê podem ler (SELECT) os shifts do bebê
DROP POLICY IF EXISTS "Members read shifts of baby" ON caregiver_shifts;
CREATE POLICY "Members read shifts of baby" ON caregiver_shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM baby_members bm
      WHERE bm.baby_id = caregiver_shifts.baby_id
        AND bm.user_id = auth.uid()
        AND bm.role IN ('parent','guardian')
    )
  );
