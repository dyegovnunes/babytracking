-- Migra applied_at e achieved_at de DATE pra TIMESTAMPTZ pra permitir
-- editar data + hora. Dados existentes (DATE) ficam 00:00 UTC do dia.
-- Auto-registrados com null continuam null.

ALTER TABLE baby_vaccines
  ALTER COLUMN applied_at TYPE TIMESTAMPTZ USING applied_at::timestamptz;

ALTER TABLE baby_milestones
  ALTER COLUMN achieved_at TYPE TIMESTAMPTZ USING achieved_at::timestamptz;
