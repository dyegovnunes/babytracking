-- RPC para pais/responsáveis lerem o pediatra vinculado ao bebê.
-- A RLS de `pediatricians` só permite self-access, então precisamos de
-- SECURITY DEFINER para que o pai consiga fazer o JOIN.
--
-- Também adiciona `consent_given_at` em `pediatrician_patients` para
-- rastreabilidade LGPD (Apple App Review exige consentimento explícito
-- antes de compartilhar dados com terceiros).

-- 1. Coluna de consentimento LGPD
ALTER TABLE pediatrician_patients
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz;

-- 2. RPC de leitura do pediatra vinculado (chamada pelo app)
CREATE OR REPLACE FUNCTION get_baby_linked_pediatrician(p_baby_id uuid)
RETURNS TABLE (
  link_id          uuid,
  pediatrician_id  uuid,
  name             text,
  crm              text,
  crm_state        text,
  linked_at        timestamptz,
  consent_given_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Somente membros do bebê podem consultar
  IF NOT EXISTS (
    SELECT 1 FROM baby_members
    WHERE baby_id = p_baby_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pp.id,
    pp.pediatrician_id,
    ped.name,
    ped.crm,
    ped.crm_state,
    pp.linked_at,
    pp.consent_given_at
  FROM pediatrician_patients pp
  JOIN pediatricians ped ON ped.id = pp.pediatrician_id
  WHERE pp.baby_id = p_baby_id
    AND pp.unlinked_at IS NULL
  ORDER BY pp.linked_at DESC;
END;
$$;

-- ROLLBACK:
-- ALTER TABLE pediatrician_patients DROP COLUMN IF EXISTS consent_given_at;
-- DROP FUNCTION IF EXISTS get_baby_linked_pediatrician(uuid);
