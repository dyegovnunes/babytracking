-- Bloqueia registro duplicado de dose no mesmo slot do mesmo dia.
-- Exemplo: medicação com slot 08:00 não pode ter 2 logs administrados em
-- dias iguais ocupando o mesmo slot.
--
-- Índice parcial (só quando slot_time IS NOT NULL) pra não quebrar logs
-- legados sem slot_time (migration 20260414c criou medication_logs sem
-- binding explícito; migration 20260414d adicionou a coluna slot_time).
-- Doses "extras" / "fora do horário" entram com slot_time = NULL e
-- continuam permitidas.

CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_slot_per_day
  ON medication_logs (medication_id, slot_time, (administered_at::date))
  WHERE slot_time IS NOT NULL;
