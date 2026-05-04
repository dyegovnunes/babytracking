-- Migration: adicionar welcome_email_sent_at em profiles
-- Controla idempotência do email M0 de boas-vindas (enviado 1x por usuário)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

-- ROLLBACK:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS welcome_email_sent_at;
