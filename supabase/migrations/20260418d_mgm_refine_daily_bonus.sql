-- MGM refinado: bônus diário em vez de crédito permanente.
-- Fórmula: effectiveLimit = 5 (base) + bonusAds + 30 × activated_referrals
-- Reseta todo dia (não tem saldo consumível).

ALTER TABLE profiles DROP COLUMN IF EXISTS activity_credits;

DROP FUNCTION IF EXISTS consume_activity_credit();

-- Trigger de ativação sem mais update em activity_credits. O check de +7d
-- cortesia a cada 10 ativações permanece.
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

-- RPC nova: 3 cards de recompensa + bônus diário pro useDailyLimit.
CREATE OR REPLACE FUNCTION get_my_referral_rewards()
RETURNS TABLE (
  activated_count BIGINT,
  pending_count BIGINT,
  subscribed_count BIGINT,
  daily_bonus_records INT,
  cumulative_yaya_days INT,
  next_milestone INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  activated BIGINT;
  subscribed BIGINT;
BEGIN
  IF caller IS NULL THEN RETURN; END IF;
  SELECT COUNT(*) INTO activated FROM referrals
    WHERE referrer_user_id = caller AND status IN ('activated', 'subscribed_paid');
  SELECT COUNT(*) INTO subscribed FROM referrals
    WHERE referrer_user_id = caller AND status = 'subscribed_paid';

  RETURN QUERY
  SELECT
    activated,
    (SELECT COUNT(*) FROM referrals WHERE referrer_user_id = caller AND status = 'pending'),
    subscribed,
    (30 * activated)::INT AS daily_bonus_records,
    ((FLOOR(activated / 10.0) * 7) + (subscribed * 30))::INT AS cumulative_yaya_days,
    (((activated / 10)::INT + 1) * 10)::INT AS next_milestone;
END $$;

GRANT EXECUTE ON FUNCTION get_my_referral_rewards() TO authenticated;
