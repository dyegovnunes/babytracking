-- =========================================================================
-- Medicamentos
-- Spec: docs/specs/MEDICAMENTOS_SPEC.md
-- Guide: docs/guides/MEDICAMENTOS_IMPLEMENTATION_GUIDE.md
-- =========================================================================

-- -------------------------------------------------------------------------
-- Tabela: medications (medicamentos cadastrados)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency_hours NUMERIC NOT NULL CHECK (frequency_hours > 0 AND frequency_hours <= 24),
  schedule_times TIME[] NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('continuous', 'fixed')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_baby_active
  ON medications(baby_id, is_active);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- RLS padrão baby_members
DROP POLICY IF EXISTS "Members can read medications" ON medications;
CREATE POLICY "Members can read medications" ON medications
  FOR SELECT USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert medications" ON medications;
CREATE POLICY "Members can insert medications" ON medications
  FOR INSERT WITH CHECK (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update medications" ON medications;
CREATE POLICY "Members can update medications" ON medications
  FOR UPDATE USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete medications" ON medications;
CREATE POLICY "Members can delete medications" ON medications
  FOR DELETE USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Tabela: medication_logs (registros de administração)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  administered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  administered_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_medication_at
  ON medication_logs(medication_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_baby_at
  ON medication_logs(baby_id, administered_at DESC);

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read medication_logs" ON medication_logs;
CREATE POLICY "Members can read medication_logs" ON medication_logs
  FOR SELECT USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert medication_logs" ON medication_logs;
CREATE POLICY "Members can insert medication_logs" ON medication_logs
  FOR INSERT WITH CHECK (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete medication_logs" ON medication_logs;
CREATE POLICY "Members can delete medication_logs" ON medication_logs
  FOR DELETE USING (
    baby_id IN (
      SELECT baby_members.baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- Trigger: mantém updated_at atualizado em medications
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION medications_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medications_updated_at ON medications;
CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION medications_set_updated_at();
