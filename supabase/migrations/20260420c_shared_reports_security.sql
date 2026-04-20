-- Segurança do Super Relatório compartilhado:
--   - Log de acesso visível pro pai: access_count + last_accessed_at
--   - Rate limit anti-brute-force: failed_attempts + locked_until (15 min após 5 erros)
--   - Migração de algoritmo de hash: password_algo permite rotação SHA-256 → bcrypt
--     sem invalidar links existentes (edge function migra no primeiro acesso bem-sucedido).

ALTER TABLE shared_reports
  ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_algo TEXT NOT NULL DEFAULT 'sha256'
    CHECK (password_algo IN ('sha256', 'bcrypt'));

COMMENT ON COLUMN shared_reports.access_count IS 'Quantidade de acessos bem-sucedidos. Mostrado ao pai no card do link.';
COMMENT ON COLUMN shared_reports.last_accessed_at IS 'Timestamp do último acesso bem-sucedido.';
COMMENT ON COLUMN shared_reports.failed_attempts IS 'Tentativas de senha erradas consecutivas. Zeradas em sucesso.';
COMMENT ON COLUMN shared_reports.locked_until IS 'Bloqueio temporário após 5 falhas (15 min). Erro genérico pro cliente — não vaza estado.';
COMMENT ON COLUMN shared_reports.password_algo IS 'Algoritmo do hash atual. sha256 = link antigo (será migrado pra bcrypt no próximo acesso).';
