-- =============================================================================
-- Medication logs: slot_time
-- =============================================================================
--
-- Adiciona um binding explícito entre um log de medicamento e o slot da
-- schedule_times que ele cumpriu (ex: "08:00"). Antes o cliente casava
-- log <-> slot por janela de proximidade de tempo (frequency_hours/2), o que
-- quebrava em cenários como "remédio 1x/dia às 08:00, registrado às 22:00"
-- -- a distância ficava fora da janela e o slot parecia pendente pra sempre.
--
-- Com slot_time salvo, o matching fica determinístico: o cliente marca a
-- dose no slot correto e a UI reflete imediatamente. Logs antigos (null)
-- continuam funcionando pelo fallback de proximidade no cliente.
--
-- Coluna é nullable porque doses "extras" (fora dos slots, registradas
-- manualmente no histórico) não têm slot_time — elas continuam existindo
-- como float e contam no givenCount.
-- =============================================================================

ALTER TABLE public.medication_logs
  ADD COLUMN IF NOT EXISTS slot_time TEXT NULL;

COMMENT ON COLUMN public.medication_logs.slot_time IS
  'HH:mm do slot da schedule_times que essa dose cumpriu. Null = dose extra/floating sem binding. Usado pelo cliente para casar log<->slot de forma explícita, sem depender de janela de proximidade.';
