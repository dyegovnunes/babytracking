-- Adiciona quiet_hours_enabled à tabela babies.
-- As colunas quiet_hours_start/end já existem (20260420a_baby_quiet_hours.sql).
-- O campo enabled faltava — a UI escrevia em notification_prefs.quiet_enabled
-- mas não espelhava em babies, então ao trocar de bebê/usuário o estado se perdia.

ALTER TABLE babies ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean DEFAULT false;

-- Backfill: copia quiet_enabled da row mais recente de notification_prefs por baby.
UPDATE babies b
SET quiet_hours_enabled = np.quiet_enabled
FROM (
  SELECT DISTINCT ON (baby_id) baby_id, quiet_enabled
  FROM notification_prefs
  ORDER BY baby_id, updated_at DESC NULLS LAST
) np
WHERE np.baby_id = b.id;

-- ROLLBACK: ALTER TABLE babies DROP COLUMN IF EXISTS quiet_hours_enabled;
