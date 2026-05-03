-- Sprint B1: Adicionar phone em pediatricians e next_appointment_at em pediatrician_patients
-- Também inclui a função add_measurement_by_pediatrician (B5)
-- e set_next_appointment (D1)

-- ── pediatricians.phone ──────────────────────────────────────────────────────
ALTER TABLE pediatricians
  ADD COLUMN IF NOT EXISTS phone text;

-- ── pediatrician_patients.next_appointment_at ────────────────────────────────
ALTER TABLE pediatrician_patients
  ADD COLUMN IF NOT EXISTS next_appointment_at timestamptz;

-- ── Atualizar get_pediatrician_patients para incluir novos campos ────────────
-- (a função existente precisa ser recriada com os campos novos)
CREATE OR REPLACE FUNCTION get_pediatrician_patients()
RETURNS TABLE (
  baby_id             uuid,
  baby_name           text,
  birth_date          date,
  gender              text,
  photo_url           text,
  last_active_at      timestamptz,
  link_id             uuid,
  next_appointment_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ped_id uuid;
BEGIN
  SELECT id INTO v_ped_id FROM pediatricians
  WHERE user_id = auth.uid() AND approved_at IS NOT NULL;
  IF v_ped_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    b.id            AS baby_id,
    b.name          AS baby_name,
    b.birth_date    AS birth_date,
    b.gender        AS gender,
    b.photo_url     AS photo_url,
    (
      SELECT MAX(created_at) FROM logs WHERE baby_id = b.id
    )               AS last_active_at,
    pp.id           AS link_id,
    pp.next_appointment_at
  FROM pediatrician_patients pp
  JOIN babies b ON b.id = pp.baby_id
  WHERE pp.pediatrician_id = v_ped_id
    AND pp.unlinked_at IS NULL
  ORDER BY b.name;
END;
$$;

-- ── add_measurement_by_pediatrician (B5) ────────────────────────────────────
CREATE OR REPLACE FUNCTION add_measurement_by_pediatrician(
  p_baby_id     uuid,
  p_type        text,
  p_value       numeric,
  p_unit        text,
  p_measured_at date
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ped_id uuid;
BEGIN
  SELECT id INTO v_ped_id FROM pediatricians
  WHERE user_id = auth.uid() AND approved_at IS NOT NULL;
  IF v_ped_id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pediatrician_patients
    WHERE pediatrician_id = v_ped_id AND baby_id = p_baby_id AND unlinked_at IS NULL
  ) THEN RAISE EXCEPTION 'not_linked'; END IF;

  INSERT INTO measurements(baby_id, type, value, unit, measured_at)
  VALUES (p_baby_id, p_type, p_value, p_unit, p_measured_at);
END;
$$;

-- ── set_next_appointment (D1) ─────────────────────────────────────────────────
-- Chamado pelo app (família), não pela pediatra
CREATE OR REPLACE FUNCTION set_next_appointment(
  p_link_id  uuid,
  p_datetime timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verifica que o caller é membro do bebê vinculado
  IF NOT EXISTS (
    SELECT 1 FROM pediatrician_patients pp
    JOIN baby_members bm ON bm.baby_id = pp.baby_id
    WHERE pp.id = p_link_id AND bm.user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  UPDATE pediatrician_patients
  SET next_appointment_at = p_datetime
  WHERE id = p_link_id;
END;
$$;

-- ROLLBACK:
-- ALTER TABLE pediatricians DROP COLUMN IF EXISTS phone;
-- ALTER TABLE pediatrician_patients DROP COLUMN IF EXISTS next_appointment_at;
-- DROP FUNCTION IF EXISTS add_measurement_by_pediatrician(uuid, text, numeric, text, date);
-- DROP FUNCTION IF EXISTS set_next_appointment(uuid, timestamptz);
