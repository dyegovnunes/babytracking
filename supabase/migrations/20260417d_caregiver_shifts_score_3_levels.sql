-- Substitui os BOOLEAN ate_well/slept_well por SMALLINT score com 3 níveis
-- 1 = ruim, 2 = médio, 3 = bom. NULL = não respondeu.
ALTER TABLE caregiver_shifts
  DROP COLUMN IF EXISTS ate_well,
  DROP COLUMN IF EXISTS slept_well;

ALTER TABLE caregiver_shifts
  ADD COLUMN IF NOT EXISTS ate_score SMALLINT CHECK (ate_score BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS slept_score SMALLINT CHECK (slept_score BETWEEN 1 AND 3);
