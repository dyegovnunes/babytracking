-- Tabela de agenda de cada caregiver por bebê
CREATE TABLE IF NOT EXISTS caregiver_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_start_time TIME NOT NULL DEFAULT '08:00',
  work_end_time TIME NOT NULL DEFAULT '18:00',
  workdays INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom..6=Sáb (JS getDay)
  instructions TEXT CHECK (char_length(instructions) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(baby_id, caregiver_id)
);

-- Index auxiliar para leitura por caregiver
CREATE INDEX IF NOT EXISTS idx_caregiver_schedules_caregiver
  ON caregiver_schedules(caregiver_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION caregiver_schedules_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_caregiver_schedules_updated ON caregiver_schedules;
CREATE TRIGGER trg_caregiver_schedules_updated
  BEFORE UPDATE ON caregiver_schedules
  FOR EACH ROW EXECUTE FUNCTION caregiver_schedules_touch_updated_at();

-- Ativar RLS
ALTER TABLE caregiver_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Parents manage caregiver schedules" ON caregiver_schedules;
CREATE POLICY "Parents manage caregiver schedules" ON caregiver_schedules
  FOR ALL
  USING (is_parent_of(baby_id))
  WITH CHECK (is_parent_of(baby_id));

DROP POLICY IF EXISTS "Caregivers read own schedule" ON caregiver_schedules;
CREATE POLICY "Caregivers read own schedule" ON caregiver_schedules
  FOR SELECT
  USING (caregiver_id = auth.uid());

-- Coluna caregiver_permissions em baby_members (JSONB livre: show_milestones, show_leaps, show_vaccines, show_growth)
ALTER TABLE baby_members
  ADD COLUMN IF NOT EXISTS caregiver_permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
