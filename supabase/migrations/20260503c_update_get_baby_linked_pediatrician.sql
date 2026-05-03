-- Atualizar get_baby_linked_pediatrician para incluir phone e next_appointment_at
-- Ambas as colunas foram adicionadas em 20260503_pediatrician_patients_phone_appointment.sql

CREATE OR REPLACE FUNCTION get_baby_linked_pediatrician(p_baby_id uuid)
RETURNS TABLE (
  link_id             uuid,
  pediatrician_id     uuid,
  name                text,
  crm                 text,
  crm_state           text,
  linked_at           timestamptz,
  consent_given_at    timestamptz,
  phone               text,
  next_appointment_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM baby_members
    WHERE baby_id = p_baby_id AND user_id = auth.uid()
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    pp.id                   AS link_id,
    pp.pediatrician_id      AS pediatrician_id,
    ped.name                AS name,
    ped.crm                 AS crm,
    ped.crm_state           AS crm_state,
    pp.linked_at            AS linked_at,
    pp.consent_given_at     AS consent_given_at,
    ped.phone               AS phone,
    pp.next_appointment_at  AS next_appointment_at
  FROM pediatrician_patients pp
  JOIN pediatricians ped ON ped.id = pp.pediatrician_id
  WHERE pp.baby_id = p_baby_id AND pp.unlinked_at IS NULL
  ORDER BY pp.linked_at DESC;
END;
$$;
