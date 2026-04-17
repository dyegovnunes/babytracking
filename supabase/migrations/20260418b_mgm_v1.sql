-- MGM v1: indicações só pra free (premium fica pra v2 com tokens).
-- Recompensas:
--   - Indicado ativa (5+ logs) → indicador free +30 créditos permanentes
--   - Cada 10 ativações acumuladas → +7 dias Yaya+ cortesia
--   - Indicado assina anual/vitalício → +30 dias Yaya+ cortesia

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS activity_credits INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  code_used TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','activated','subscribed_paid')) DEFAULT 'pending',
  subscription_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_user_id, status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select_own" ON referrals;
CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid() OR is_admin());

-- Gera código único de 7 chars (ex: A3X9K7B). Trigger BEFORE INSERT em profiles.
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE candidate TEXT; retries INT := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    candidate := UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = candidate);
    retries := retries + 1;
    IF retries > 30 THEN
      candidate := UPPER(substr(md5(random()::text || NEW.id::text), 1, 10));
      EXIT;
    END IF;
  END LOOP;
  NEW.referral_code := candidate;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_generate_code ON profiles;
CREATE TRIGGER trg_profiles_generate_code
  BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Trigger de ativação: quando user chega no 5º log, ativa referral + premia
CREATE OR REPLACE FUNCTION process_referral_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_count INT;
  ref_row referrals%ROWTYPE;
  referrer_is_premium BOOLEAN;
  activated_count INT;
BEGIN
  IF NEW.created_by IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO log_count FROM logs WHERE created_by = NEW.created_by;
  IF log_count <> 5 THEN RETURN NEW; END IF;

  SELECT * INTO ref_row FROM referrals
    WHERE referred_user_id = NEW.created_by AND status = 'pending' LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;

  UPDATE referrals SET status = 'activated', activated_at = NOW() WHERE id = ref_row.id;

  SELECT is_premium INTO referrer_is_premium FROM profiles WHERE id = ref_row.referrer_user_id;
  IF referrer_is_premium IS NOT TRUE THEN
    UPDATE profiles SET activity_credits = activity_credits + 30
      WHERE id = ref_row.referrer_user_id;

    SELECT COUNT(*) INTO activated_count FROM referrals
      WHERE referrer_user_id = ref_row.referrer_user_id
        AND status IN ('activated', 'subscribed_paid');

    IF activated_count > 0 AND activated_count % 10 = 0 THEN
      UPDATE profiles SET
        is_premium = true,
        courtesy_expires_at = GREATEST(COALESCE(courtesy_expires_at, NOW()), NOW()) + INTERVAL '7 days',
        courtesy_reason = 'MGM: ' || activated_count || ' ativações'
      WHERE id = ref_row.referrer_user_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_logs_referral_activation ON logs;
CREATE TRIGGER trg_logs_referral_activation
  AFTER INSERT ON logs FOR EACH ROW EXECUTE FUNCTION process_referral_activation();

-- Chamada pelo webhook RevenueCat quando plano pago começa
CREATE OR REPLACE FUNCTION process_referral_paid_subscription(p_user_id UUID, p_plan TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ref_row referrals%ROWTYPE; referrer_is_premium BOOLEAN;
BEGIN
  IF p_plan NOT IN ('annual', 'lifetime') THEN RETURN; END IF;
  SELECT * INTO ref_row FROM referrals
    WHERE referred_user_id = p_user_id AND status <> 'subscribed_paid' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE referrals SET status='subscribed_paid', subscribed_at=NOW(), subscription_plan=p_plan
    WHERE id = ref_row.id;

  SELECT is_premium INTO referrer_is_premium FROM profiles WHERE id = ref_row.referrer_user_id;
  IF referrer_is_premium IS NOT TRUE THEN
    UPDATE profiles SET
      is_premium = true,
      courtesy_expires_at = GREATEST(COALESCE(courtesy_expires_at, NOW()), NOW()) + INTERVAL '30 days',
      courtesy_reason = 'MGM: indicado assinou ' || p_plan
    WHERE id = ref_row.referrer_user_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION accept_referral(p_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller UUID := auth.uid(); referrer_id UUID;
BEGIN
  IF caller IS NULL THEN RETURN false; END IF;
  SELECT id INTO referrer_id FROM profiles WHERE referral_code = UPPER(p_code);
  IF referrer_id IS NULL OR referrer_id = caller THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_user_id = caller) THEN RETURN false; END IF;
  INSERT INTO referrals (referrer_user_id, referred_user_id, code_used, status)
    VALUES (referrer_id, caller, UPPER(p_code), 'pending');
  UPDATE profiles SET referred_by = referrer_id WHERE id = caller AND referred_by IS NULL;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION consume_activity_credit()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller UUID := auth.uid(); new_balance INT;
BEGIN
  IF caller IS NULL THEN RETURN -1; END IF;
  UPDATE profiles SET activity_credits = activity_credits - 1
    WHERE id = caller AND activity_credits > 0
    RETURNING activity_credits INTO new_balance;
  RETURN COALESCE(new_balance, -1);
END $$;

CREATE OR REPLACE FUNCTION get_my_referral_status()
RETURNS TABLE (code TEXT, credits INT, activated_count BIGINT, pending_count BIGINT, subscribed_count BIGINT, next_milestone INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller UUID := auth.uid(); activated BIGINT;
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO activated FROM referrals
    WHERE referrer_user_id = caller AND status IN ('activated', 'subscribed_paid');
  RETURN QUERY
  SELECT p.referral_code, p.activity_credits, activated,
    (SELECT COUNT(*) FROM referrals WHERE referrer_user_id = caller AND status = 'pending'),
    (SELECT COUNT(*) FROM referrals WHERE referrer_user_id = caller AND status = 'subscribed_paid'),
    (((activated / 10)::INT + 1) * 10)::INT
  FROM profiles p WHERE p.id = caller;
END $$;

CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS TABLE (id UUID, status TEXT, subscription_plan TEXT, created_at TIMESTAMPTZ, activated_at TIMESTAMPTZ, subscribed_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT r.id, r.status, r.subscription_plan, r.created_at, r.activated_at, r.subscribed_at
  FROM referrals r WHERE r.referrer_user_id = auth.uid() ORDER BY r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION accept_referral(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_activity_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_referral_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_referrals() TO authenticated;
