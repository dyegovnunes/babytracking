-- ════════════════════════════════════════════════════════════════════════════
-- Sua Biblioteca Yaya — Engajamento intra-leitor (Fase 2)
-- ════════════════════════════════════════════════════════════════════════════
-- Adiciona:
--   - guide_checklist_state: estado de items dos checklists por leitor/a
--     (substitui localStorage do ChecklistRenderer atual)
--   - guide_milestones: marcos / conquistas (parte concluída, guia
--     concluído, primeiros highlights, etc) — usado pra disparar
--     comemorações no leitor via realtime
--   - Triggers SQL pra detectar automaticamente parte concluída e guia
--     concluído quando guide_progress.completed muda pra true
--
-- Sem cron, sem comunicação externa. Tudo dentro da experiência de
-- leitura web. Comunicação por email/push entra com o sistema de
-- jornadas configurável (próximo plano).
-- ════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. guide_checklist_state — estado de items dos checklists
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_checklist_state (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES guide_sections(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_id, item_id)
);

CREATE INDEX IF NOT EXISTS guide_checklist_state_user_section_idx
  ON guide_checklist_state(user_id, section_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. guide_milestones — conquistas/marcos do leitor
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id    UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'section-completed', 'part-completed', 'guide-completed',
    'quiz-completed', 'first-highlight', 'first-note',
    '5-highlights', '10-highlights', '20-highlights',
    'first-checklist-completed', 'all-checklists-completed'
  )),
  ref         TEXT,                          -- section_id (UUID stringificado), part-id, etc
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB,
  -- Idempotência: não dispara duas vezes pra mesmo (user, guide, type, ref)
  -- 'ref' é parte da PK lógica — pra section-completed o ref é o section_id;
  -- pra guide-completed, ref é NULL (cobre por COALESCE)
  UNIQUE (user_id, guide_id, type, ref)
);

CREATE INDEX IF NOT EXISTS guide_milestones_user_guide_idx
  ON guide_milestones(user_id, guide_id, achieved_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- ENABLE RLS — padrão "owner all + admin select" (igual guide_notes/progress)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE guide_checklist_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_milestones      ENABLE ROW LEVEL SECURITY;

-- ── guide_checklist_state ───────────────────────────────────────────────
CREATE POLICY "guide_checklist_state_owner_all"
  ON guide_checklist_state FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guide_checklist_state_admin_select"
  ON guide_checklist_state FOR SELECT
  USING (is_admin());

-- ── guide_milestones ───────────────────────────────────────────────────
-- Owner pode ler os próprios marcos (mas INSERT só via SECURITY DEFINER
-- trigger function — usuário não cria marco diretamente)
CREATE POLICY "guide_milestones_owner_select"
  ON guide_milestones FOR SELECT
  USING (user_id = auth.uid());

-- Admin: tudo (analytics)
CREATE POLICY "guide_milestones_admin_all"
  ON guide_milestones FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- INSERT pelo trigger SECURITY DEFINER (que roda como owner da função,
-- bypassa RLS). Não precisa de policy de INSERT.

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: detecta parte concluída + guia concluído quando seção é marcada
-- ═══════════════════════════════════════════════════════════════════════════

-- Detecta guia inteiro concluído (todas as parts têm milestone part-completed)
CREATE OR REPLACE FUNCTION check_guide_completion(
  p_user_id  UUID,
  p_guide_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_parts    INT;
  v_completed_parts INT;
BEGIN
  -- Conta total de parts do guia (top-level: parent_id IS NULL E type='part')
  SELECT COUNT(*) INTO v_total_parts
    FROM guide_sections
    WHERE guide_id = p_guide_id
      AND parent_id IS NULL
      AND type = 'part';

  IF v_total_parts = 0 THEN RETURN; END IF;

  -- Conta quantas parts já têm milestone part-completed pra esse user
  SELECT COUNT(*) INTO v_completed_parts
    FROM guide_milestones
    WHERE user_id = p_user_id
      AND guide_id = p_guide_id
      AND type = 'part-completed';

  IF v_completed_parts >= v_total_parts THEN
    INSERT INTO guide_milestones (user_id, guide_id, type, ref)
    VALUES (p_user_id, p_guide_id, 'guide-completed', NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Detecta parte concluída quando todas as seções filhas atingem completed=true
CREATE OR REPLACE FUNCTION check_part_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part_id     UUID;
  v_total       INT;
  v_completed   INT;
BEGIN
  -- Só dispara quando completed muda pra true (não em re-marcar / scroll updates)
  IF NEW.completed IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.completed IS TRUE THEN RETURN NEW; END IF;

  -- Acha o parent_id (parte) da seção concluída
  SELECT parent_id INTO v_part_id
    FROM guide_sections
    WHERE id = NEW.section_id;

  IF v_part_id IS NULL THEN
    -- Seção é top-level (uma parte ela mesma), não tem agrupador acima.
    -- Verifica diretamente o guia inteiro (caso de guia "flat").
    PERFORM check_guide_completion(NEW.user_id, NEW.guide_id);
    RETURN NEW;
  END IF;

  -- Conta total de seções da parte e quantas estão completas pra esse user
  SELECT COUNT(*) INTO v_total
    FROM guide_sections
    WHERE parent_id = v_part_id;

  SELECT COUNT(*) INTO v_completed
    FROM guide_progress gp
    JOIN guide_sections gs ON gs.id = gp.section_id
    WHERE gs.parent_id = v_part_id
      AND gp.user_id = NEW.user_id
      AND gp.completed = TRUE;

  IF v_total > 0 AND v_completed >= v_total THEN
    -- INSERT idempotente via UNIQUE constraint
    INSERT INTO guide_milestones (user_id, guide_id, type, ref)
    VALUES (NEW.user_id, NEW.guide_id, 'part-completed', v_part_id::text)
    ON CONFLICT DO NOTHING;

    -- Cascata: verifica se concluiu o guia inteiro
    PERFORM check_guide_completion(NEW.user_id, NEW.guide_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger AFTER UPDATE/INSERT em guide_progress
DROP TRIGGER IF EXISTS trg_check_part_completion ON guide_progress;
CREATE TRIGGER trg_check_part_completion
  AFTER INSERT OR UPDATE OF completed ON guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION check_part_completion();

-- ═══════════════════════════════════════════════════════════════════════════
-- Realtime: habilita supabase realtime nas tabelas pra hook subscriber
-- detectar novos milestones em tempo real (useMilestones.ts)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE guide_milestones;

COMMENT ON TABLE guide_checklist_state IS
  'Estado dos items dos checklists das seções do tipo "linear" que contém '
  'sintaxe `- [ ]` parseada como data.checklist_items. Substitui localStorage.';

COMMENT ON TABLE guide_milestones IS
  'Marcos/conquistas do leitor: parte concluída, guia concluído, primeiros '
  'highlights, etc. UNIQUE (user, guide, type, ref) garante idempotência. '
  'Inserido apenas via SECURITY DEFINER trigger function — usuário não cria '
  'diretamente.';
