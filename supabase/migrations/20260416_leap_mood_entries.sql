-- Leap mood entries: daily mood tracking during development leaps
CREATE TABLE IF NOT EXISTS leap_mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  leap_id INT NOT NULL CHECK (leap_id >= 1 AND leap_id <= 10),
  mood INT NOT NULL CHECK (mood >= 1 AND mood <= 5),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id, leap_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_leap_mood_entries_baby ON leap_mood_entries(baby_id);
CREATE INDEX IF NOT EXISTS idx_leap_mood_entries_leap ON leap_mood_entries(baby_id, leap_id);

ALTER TABLE leap_mood_entries ENABLE ROW LEVEL SECURITY;

-- RLS: padrao baby_members
DROP POLICY IF EXISTS "Members can read leap_mood_entries" ON leap_mood_entries;
CREATE POLICY "Members can read leap_mood_entries" ON leap_mood_entries
  FOR SELECT USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can insert leap_mood_entries" ON leap_mood_entries;
CREATE POLICY "Members can insert leap_mood_entries" ON leap_mood_entries
  FOR INSERT WITH CHECK (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can update leap_mood_entries" ON leap_mood_entries;
CREATE POLICY "Members can update leap_mood_entries" ON leap_mood_entries
  FOR UPDATE USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members can delete leap_mood_entries" ON leap_mood_entries;
CREATE POLICY "Members can delete leap_mood_entries" ON leap_mood_entries
  FOR DELETE USING (
    baby_id IN (SELECT bm.baby_id FROM baby_members bm WHERE bm.user_id = auth.uid())
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_leap_mood_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leap_mood_entries_updated_at ON leap_mood_entries;
CREATE TRIGGER trg_leap_mood_entries_updated_at
  BEFORE UPDATE ON leap_mood_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_leap_mood_entries_updated_at();

-- Add overall_mood column to leap_notes for past leap rating
ALTER TABLE leap_notes ADD COLUMN IF NOT EXISTS overall_mood INT CHECK (overall_mood IS NULL OR (overall_mood >= 1 AND overall_mood <= 5));
