-- =========================================================================
-- Grid configurável por bebê
-- Sprint 2 — jornada-adaptativa
-- =========================================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS baby_grid_items CASCADE;
--   DROP TRIGGER IF EXISTS on_baby_created_seed_grid ON babies;
--   DROP FUNCTION IF EXISTS seed_grid_items_for_new_baby();
-- =========================================================================

-- 1. Tabela
CREATE TABLE IF NOT EXISTS baby_grid_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id      uuid NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  event_id     text NOT NULL,
  enabled      boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  -- Campos de sugestão (usados nas sprints 3+)
  suggested_at timestamptz,
  accepted_at  timestamptz,
  dismissed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (baby_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_baby_grid_items_baby_id
  ON baby_grid_items(baby_id);

-- 2. RLS (padrão idêntico a medications)
ALTER TABLE baby_grid_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read grid items"   ON baby_grid_items;
DROP POLICY IF EXISTS "Members can insert grid items"  ON baby_grid_items;
DROP POLICY IF EXISTS "Members can update grid items"  ON baby_grid_items;

CREATE POLICY "Members can read grid items" ON baby_grid_items
  FOR SELECT USING (
    baby_id IN (
      SELECT baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert grid items" ON baby_grid_items
  FOR INSERT WITH CHECK (
    baby_id IN (
      SELECT baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update grid items" ON baby_grid_items
  FOR UPDATE USING (
    baby_id IN (
      SELECT baby_id FROM baby_members WHERE user_id = auth.uid()
    )
  );

-- 3. Seeder: 9 eventos padrão para bebês que ainda não têm rows
INSERT INTO baby_grid_items (baby_id, event_id, enabled, sort_order)
SELECT b.id, e.event_id, true, e.sort_order
FROM babies b
CROSS JOIN (VALUES
  ('breast_left',  0),
  ('breast_right', 1),
  ('breast_both',  2),
  ('bottle',       3),
  ('diaper_wet',   4),
  ('diaper_dirty', 5),
  ('bath',         6),
  ('sleep',        7),
  ('wake',         8)
) AS e(event_id, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM baby_grid_items g
  WHERE g.baby_id = b.id AND g.event_id = e.event_id
);

-- 4. Trigger: novos bebês recebem os itens padrão automaticamente
CREATE OR REPLACE FUNCTION seed_grid_items_for_new_baby()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO baby_grid_items (baby_id, event_id, enabled, sort_order) VALUES
    (NEW.id, 'breast_left',  true, 0),
    (NEW.id, 'breast_right', true, 1),
    (NEW.id, 'breast_both',  true, 2),
    (NEW.id, 'bottle',       true, 3),
    (NEW.id, 'diaper_wet',   true, 4),
    (NEW.id, 'diaper_dirty', true, 5),
    (NEW.id, 'bath',         true, 6),
    (NEW.id, 'sleep',        true, 7),
    (NEW.id, 'wake',         true, 8)
  ON CONFLICT (baby_id, event_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_baby_created_seed_grid ON babies;
CREATE TRIGGER on_baby_created_seed_grid
  AFTER INSERT ON babies
  FOR EACH ROW
  EXECUTE FUNCTION seed_grid_items_for_new_baby();
