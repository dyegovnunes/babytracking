-- Quiet hours por bebê (horário noturno).
-- Fonte de verdade para o conceito "diurno vs noturno" no Super Relatório compartilhado.
-- O AppContext continua lendo notification_prefs (por user+baby) para pushs;
-- quando o user salva, o useNotificationPrefs também escreve aqui para o bebê.
-- Valores em hora local (0-23). Default 22h-7h (padrão do app).

ALTER TABLE babies
  ADD COLUMN IF NOT EXISTS quiet_hours_start SMALLINT NOT NULL DEFAULT 22
    CHECK (quiet_hours_start BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS quiet_hours_end SMALLINT NOT NULL DEFAULT 7
    CHECK (quiet_hours_end BETWEEN 0 AND 23);

COMMENT ON COLUMN babies.quiet_hours_start IS 'Início do horário noturno do bebê (0-23h, local). Fonte única para o Super Relatório.';
COMMENT ON COLUMN babies.quiet_hours_end IS 'Fim do horário noturno do bebê (0-23h, local). Fonte única para o Super Relatório.';
