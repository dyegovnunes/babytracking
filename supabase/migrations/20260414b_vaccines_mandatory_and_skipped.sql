-- =========================================================================
-- Caderneta de Vacinas — extensões
-- 1. Classificação "obrigatória" vs "opcional" (independente de SUS/Particular)
-- 2. Estado "skipped" em baby_vaccines (usuário decidiu não aplicar)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. vaccines.is_mandatory
-- -------------------------------------------------------------------------
ALTER TABLE vaccines
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT true;

-- Backfill: PNI = obrigatória, SBP = opcional
UPDATE vaccines SET is_mandatory = true  WHERE source = 'PNI';
UPDATE vaccines SET is_mandatory = false WHERE source = 'SBP';

-- -------------------------------------------------------------------------
-- 2. baby_vaccines.status
-- -------------------------------------------------------------------------
ALTER TABLE baby_vaccines
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied'
  CHECK (status IN ('applied', 'skipped'));

-- applied_at passa a ser opcional (skipped não precisa de data)
ALTER TABLE baby_vaccines
  ALTER COLUMN applied_at DROP NOT NULL;
