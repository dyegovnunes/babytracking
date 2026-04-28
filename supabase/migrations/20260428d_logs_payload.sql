-- =========================================================================
-- Coluna payload jsonb em logs
-- Sprint 3 — jornada-adaptativa
-- =========================================================================
-- Operação segura: linhas existentes ficam com payload = NULL.
-- Nenhuma constraint NOT NULL, nenhuma mudança de RLS necessária.
-- =========================================================================
-- ROLLBACK: ALTER TABLE logs DROP COLUMN IF EXISTS payload;
-- =========================================================================

ALTER TABLE logs ADD COLUMN IF NOT EXISTS payload jsonb;
