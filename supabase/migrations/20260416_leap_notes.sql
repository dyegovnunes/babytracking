-- Leap notes: uma nota por salto por bebê
CREATE TABLE IF NOT EXISTS leap_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  leap_id INT NOT NULL CHECK (leap_id >= 1 AND leap_id <= 10),
  note TEXT NOT NULL CHECK (char_length(note) <= 280),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, leap_id)
);

CREATE INDEX IF NOT EXISTS idx_leap_notes_baby ON leap_notes(baby_id);

ALTER TABLE leap_notes ENABLE ROW LEVEL SECURITY;

-- RLS: padrão baby_members
DROP POLICY IF EXISTS "Members can read leap_notes" ON leap_notes;
CREATE POLICY "Members can read leap_notes" ON leap_notes
  FOR SELECT USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can insert leap_notes" ON leap_notes;
CREATE POLICY "Members can insert leap_notes" ON leap_notes
  FOR INSERT WITH CHECK (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can update leap_notes" ON leap_notes;
CREATE POLICY "Members can update leap_notes" ON leap_notes
  FOR UPDATE USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can delete leap_notes" ON leap_notes;
CREATE POLICY "Members can delete leap_notes" ON leap_notes
  FOR DELETE USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_leap_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leap_notes_updated_at ON leap_notes;
CREATE TRIGGER trg_leap_notes_updated_at
  BEFORE UPDATE ON leap_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_leap_notes_updated_at();
