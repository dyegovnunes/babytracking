-- Migration: 20260502_portal_pediatra.sql
-- Portal Pediatra: tabelas, índices, RLS e RPCs de vínculo

-- ============================================================
-- 1. generate_invite_code()
--    Base32 sem caracteres ambíguos (sem I, O, 0, 1)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars      text    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result     text    := '';
  i          int;
  rand_bytes bytea;
BEGIN
  rand_bytes := gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    result := result || substr(chars, (get_byte(rand_bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================
-- 2. Tabela pediatricians
-- ============================================================
CREATE TABLE IF NOT EXISTS pediatricians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  crm         text NOT NULL,
  crm_state   text NOT NULL,
  rqe         text[],
  specialties text[],
  approved_at timestamptz,
  approved_by uuid,
  invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(crm, crm_state)
);

CREATE INDEX IF NOT EXISTS idx_pediatricians_user_id     ON pediatricians(user_id);
CREATE INDEX IF NOT EXISTS idx_pediatricians_invite_code ON pediatricians(invite_code);
CREATE INDEX IF NOT EXISTS idx_pediatricians_approved_at ON pediatricians(approved_at);

-- ============================================================
-- 3. Tabela pediatrician_patients
--    Vínculo pediatra ↔ bebê (soft delete, uma linha por par)
-- ============================================================
CREATE TABLE IF NOT EXISTS pediatrician_patients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pediatrician_id uuid NOT NULL REFERENCES pediatricians(id) ON DELETE CASCADE,
  baby_id         uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  linked_by       uuid NOT NULL REFERENCES auth.users(id),
  linked_at       timestamptz NOT NULL DEFAULT now(),
  unlinked_at     timestamptz,
  unlinked_by     uuid,
  unlink_reason   text CHECK (unlink_reason IN ('parent', 'pediatrician')),
  UNIQUE(pediatrician_id, baby_id)
);

CREATE INDEX IF NOT EXISTS idx_ped_patients_ped_id
  ON pediatrician_patients(pediatrician_id)
  WHERE unlinked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ped_patients_baby_id
  ON pediatrician_patients(baby_id)
  WHERE unlinked_at IS NULL;

-- ============================================================
-- 4. RLS — pediatricians
-- ============================================================
ALTER TABLE pediatricians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pediatrician_own"           ON pediatricians;
DROP POLICY IF EXISTS "admin_all_pediatricians"    ON pediatricians;

CREATE POLICY "pediatrician_own" ON pediatricians
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_all_pediatricians" ON pediatricians
  FOR ALL USING (is_admin());

-- ============================================================
-- 5. RLS — pediatrician_patients
-- ============================================================
ALTER TABLE pediatrician_patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pediatrician_sees_own_patients" ON pediatrician_patients;
DROP POLICY IF EXISTS "parent_sees_baby_links"         ON pediatrician_patients;
DROP POLICY IF EXISTS "parent_can_link_unlink"         ON pediatrician_patients;

-- Pediatra vê os vínculos dela
CREATE POLICY "pediatrician_sees_own_patients" ON pediatrician_patients
  FOR SELECT USING (
    pediatrician_id IN (
      SELECT id FROM pediatricians WHERE user_id = auth.uid()
    )
  );

-- Pai/mãe vê vínculos do bebê dele
CREATE POLICY "parent_sees_baby_links" ON pediatrician_patients
  FOR SELECT USING (
    baby_id IN (
      SELECT baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

-- Pai/mãe pode criar e modificar vínculos dos seus bebês
CREATE POLICY "parent_can_link_unlink" ON pediatrician_patients
  FOR ALL USING (
    baby_id IN (
      SELECT baby_id FROM baby_members
      WHERE user_id = auth.uid()
        AND role IN ('parent', 'guardian')
    )
  );

-- ============================================================
-- 6. RPC: link_baby_to_pediatrician
--    Chamada pela mãe ao confirmar o convite da pediatra
-- ============================================================
CREATE OR REPLACE FUNCTION link_baby_to_pediatrician(
  p_invite_code text,
  p_baby_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ped pediatricians%ROWTYPE;
BEGIN
  -- 1. Valida pediatra aprovada
  SELECT * INTO v_ped
  FROM pediatricians
  WHERE invite_code = p_invite_code
    AND approved_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Pediatra não encontrada ou pendente de aprovação');
  END IF;

  -- 2. Valida que o usuário tem acesso ao bebê como parent/guardian
  IF NOT EXISTS (
    SELECT 1 FROM baby_members
    WHERE baby_id = p_baby_id
      AND user_id = auth.uid()
      AND role IN ('parent', 'guardian')
  ) THEN
    RETURN jsonb_build_object('error', 'Sem permissão para este bebê');
  END IF;

  -- 3. Vínculo ativo já existe?
  IF EXISTS (
    SELECT 1 FROM pediatrician_patients
    WHERE pediatrician_id = v_ped.id
      AND baby_id         = p_baby_id
      AND unlinked_at     IS NULL
  ) THEN
    RETURN jsonb_build_object('already_linked', true, 'pediatrician_name', v_ped.name);
  END IF;

  -- 4. Cria ou reativa vínculo anterior (ON CONFLICT = mesma linha, sem histórico)
  INSERT INTO pediatrician_patients (pediatrician_id, baby_id, linked_by)
  VALUES (v_ped.id, p_baby_id, auth.uid())
  ON CONFLICT (pediatrician_id, baby_id)
  DO UPDATE SET
    unlinked_at   = NULL,
    unlinked_by   = NULL,
    unlink_reason = NULL,
    linked_at     = now(),
    linked_by     = auth.uid();

  RETURN jsonb_build_object('success', true, 'pediatrician_name', v_ped.name);
END;
$$;

-- ============================================================
-- 7. RPC: unlink_baby_from_pediatrician
--    Chamada pela mãe para remover acesso da pediatra
-- ============================================================
CREATE OR REPLACE FUNCTION unlink_baby_from_pediatrician(
  p_pediatrician_id uuid,
  p_baby_id         uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pediatrician_patients
  SET
    unlinked_at   = now(),
    unlinked_by   = auth.uid(),
    unlink_reason = 'parent'
  WHERE pediatrician_id = p_pediatrician_id
    AND baby_id         = p_baby_id
    AND unlinked_at     IS NULL
    AND baby_id IN (
      SELECT baby_id FROM baby_members
      WHERE user_id = auth.uid()
        AND role IN ('parent', 'guardian')
    );

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 8. RPC: unlink_patient_by_pediatrician
--    Chamada pela pediatra para remover um paciente do portal
-- ============================================================
CREATE OR REPLACE FUNCTION unlink_patient_by_pediatrician(
  p_baby_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pediatrician_patients
  SET
    unlinked_at   = now(),
    unlinked_by   = auth.uid(),
    unlink_reason = 'pediatrician'
  WHERE baby_id = p_baby_id
    AND unlinked_at IS NULL
    AND pediatrician_id IN (
      SELECT id FROM pediatricians WHERE user_id = auth.uid()
    );

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 9. RPC: get_pediatrician_patients
--    Dashboard: pacientes ativos com last_active_at correto
--    (last_seen do membro mais ativo do bebê, não só do linked_by)
-- ============================================================
CREATE OR REPLACE FUNCTION get_pediatrician_patients()
RETURNS TABLE (
  link_id        uuid,
  linked_at      timestamptz,
  baby_id        uuid,
  baby_name      text,
  birth_date     date,
  gender         text,
  photo_url      text,
  last_active_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id                                            AS link_id,
    pp.linked_at,
    b.id                                             AS baby_id,
    b.name                                           AS baby_name,
    b.birth_date,
    b.gender,
    b.photo_url,
    (
      SELECT MAX(pr.last_seen_at)
      FROM baby_members bm
      JOIN profiles pr ON pr.id = bm.user_id
      WHERE bm.baby_id = b.id
        AND bm.role IN ('parent', 'guardian')
    )                                                AS last_active_at
  FROM pediatrician_patients pp
  JOIN babies b ON b.id = pp.baby_id
  WHERE pp.pediatrician_id = (
    SELECT id FROM pediatricians WHERE user_id = auth.uid()
  )
    AND pp.unlinked_at IS NULL
  ORDER BY pp.linked_at DESC;
END;
$$;

-- ============================================================
-- 10. RPC: get_pediatrician_ended_patients
--     Dashboard: pacientes que removeram acesso (visibilidade honesta)
-- ============================================================
CREATE OR REPLACE FUNCTION get_pediatrician_ended_patients()
RETURNS TABLE (
  link_id       uuid,
  unlinked_at   timestamptz,
  unlink_reason text,
  baby_id       uuid,
  baby_name     text,
  birth_date    date,
  gender        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id           AS link_id,
    pp.unlinked_at,
    pp.unlink_reason,
    b.id            AS baby_id,
    b.name          AS baby_name,
    b.birth_date,
    b.gender
  FROM pediatrician_patients pp
  JOIN babies b ON b.id = pp.baby_id
  WHERE pp.pediatrician_id = (
    SELECT id FROM pediatricians WHERE user_id = auth.uid()
  )
    AND pp.unlinked_at IS NOT NULL
  ORDER BY pp.unlinked_at DESC;
END;
$$;

-- ============================================================
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS get_pediatrician_ended_patients();
--   DROP FUNCTION IF EXISTS get_pediatrician_patients();
--   DROP FUNCTION IF EXISTS unlink_patient_by_pediatrician(uuid);
--   DROP FUNCTION IF EXISTS unlink_baby_from_pediatrician(uuid, uuid);
--   DROP FUNCTION IF EXISTS link_baby_to_pediatrician(text, uuid);
--   DROP TABLE IF EXISTS pediatrician_patients CASCADE;
--   DROP TABLE IF EXISTS pediatricians CASCADE;
--   DROP FUNCTION IF EXISTS generate_invite_code();
-- ============================================================
