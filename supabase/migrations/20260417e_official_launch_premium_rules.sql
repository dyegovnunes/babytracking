-- Official launch: ativa regras oficiais de premium.
--
-- Estado anterior (fase de teste): todos profiles e babies com is_premium=true.
-- Estado novo: só quem tem assinatura real (billing_provider != null) ou
-- cortesia admin ativa (courtesy_expires_at > now) é premium.
--
-- REGRA DE COBERTURA (MULTI_BABY_ROLES_SPEC.md:48-49):
-- O plano base de um parent cobre até 2 bebês. Se um parent é parent de 3+
-- bebês (ex: admin manual, feature futura de "assento adicional"), apenas
-- os 2 mais antigos dele ficam cobertos. Os demais só serão premium se
-- outro parent premium também for parent deles e tiver slot disponível.
--
-- Também adiciona triggers pra manter babies.is_premium sincronizado com o
-- status dos parents. Antes dessa migration o webhook só atualizava profiles
-- e a flag do baby ficava stale — o app lê baby.is_premium via useBabyPremium.

-- ============================================================
-- 1. Reset profiles sem billing_provider e sem cortesia ativa
-- ============================================================

UPDATE profiles
SET
  is_premium = false,
  subscription_status = 'free',
  subscription_plan = NULL,
  subscription_started_at = NULL,
  subscription_expires_at = NULL,
  subscription_cancelled_at = NULL
WHERE is_premium = true
  AND billing_provider IS NULL
  AND (courtesy_expires_at IS NULL OR courtesy_expires_at <= NOW());

-- ============================================================
-- 2. Função helper: baby está coberto por algum parent premium?
--
-- Regra: existe ao menos 1 parent premium desse bebê, tal que esse bebê
-- esteja entre os 2 bebês mais antigos onde esse parent é parent.
-- ============================================================

CREATE OR REPLACE FUNCTION baby_has_covering_parent(target_baby UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM baby_members bm
    JOIN profiles p ON p.id = bm.user_id
    WHERE bm.baby_id = target_baby
      AND bm.role = 'parent'
      AND p.is_premium = true
      AND target_baby IN (
        SELECT sub_bm.baby_id
        FROM baby_members sub_bm
        JOIN babies sub_b ON sub_b.id = sub_bm.baby_id
        WHERE sub_bm.user_id = bm.user_id
          AND sub_bm.role = 'parent'
        ORDER BY sub_b.created_at ASC
        LIMIT 2
      )
  );
$$;

-- ============================================================
-- 3. Função recalc por bebê
-- ============================================================

CREATE OR REPLACE FUNCTION recalc_baby_premium(target_baby UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE babies
  SET is_premium = baby_has_covering_parent(target_baby)
  WHERE id = target_baby;
END;
$$;

-- ============================================================
-- 4. Recalcula TODOS os babies com a regra oficial
-- ============================================================

UPDATE babies b
SET is_premium = baby_has_covering_parent(b.id);

-- ============================================================
-- 5. Trigger: profiles.is_premium muda → recalcular todos os
--    babies onde esse user é parent
-- ============================================================

CREATE OR REPLACE FUNCTION trg_profiles_premium_to_babies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  baby_row RECORD;
BEGIN
  IF OLD.is_premium IS DISTINCT FROM NEW.is_premium THEN
    FOR baby_row IN
      SELECT baby_id
      FROM baby_members
      WHERE user_id = NEW.id AND role = 'parent'
    LOOP
      PERFORM recalc_baby_premium(baby_row.baby_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_premium_to_babies ON profiles;
CREATE TRIGGER profiles_premium_to_babies
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_profiles_premium_to_babies();

-- ============================================================
-- 6. Trigger: baby_members muda → recalcular todos os babies
--    que esse parent cobre (os 2 ordenados podem ter mudado)
-- ============================================================

CREATE OR REPLACE FUNCTION trg_baby_members_premium_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_user UUID;
  baby_row RECORD;
BEGIN
  affected_user := COALESCE(NEW.user_id, OLD.user_id);

  -- Recalcular todos os babies onde esse user é parent (o conjunto dos
  -- "top 2 cobertos" pode ter mudado quando um bebê entra/sai do grupo).
  FOR baby_row IN
    SELECT baby_id
    FROM baby_members
    WHERE user_id = affected_user AND role = 'parent'
  LOOP
    PERFORM recalc_baby_premium(baby_row.baby_id);
  END LOOP;

  -- Também recalcular o baby diretamente afetado (pode não estar mais
  -- na lista se foi um DELETE).
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_baby_premium(OLD.baby_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_baby_premium(NEW.baby_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS baby_members_premium_sync ON baby_members;
CREATE TRIGGER baby_members_premium_sync
  AFTER INSERT OR UPDATE OR DELETE ON baby_members
  FOR EACH ROW
  EXECUTE FUNCTION trg_baby_members_premium_sync();
