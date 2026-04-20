-- Audience: para quem é o link compartilhado.
-- Muda o conteúdo renderizado e o CTA do SharedReportPage.
--   pediatrician — dados clínicos completos (KPIs com semáforo OMS, curva, padrões)
--   caregiver    — tempo real (última fralda, próxima dose, sono do dia)
--   family       — emocional (marcos recentes, foto grande, tom leve)
-- Default 'pediatrician' garante compat com links criados antes desta feature.

ALTER TABLE shared_reports
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'pediatrician'
  CHECK (audience IN ('pediatrician', 'caregiver', 'family'));

COMMENT ON COLUMN shared_reports.audience IS
  'Público-alvo do link: pediatrician | caregiver | family. Imutável após criação.';
