-- Adicionar colunas de assinatura ao profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'
  CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired', 'grace_period'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  CHECK (subscription_plan IN ('monthly', 'annual', 'lifetime', NULL));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_provider TEXT
  CHECK (billing_provider IN ('apple', 'google', 'stripe', NULL));

-- Index para queries de status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- Migrar dados existentes: quem tem is_premium = true vira lifetime
UPDATE profiles
SET subscription_status = 'active',
    subscription_plan = 'lifetime',
    subscription_started_at = premium_purchased_at
WHERE is_premium = TRUE;
