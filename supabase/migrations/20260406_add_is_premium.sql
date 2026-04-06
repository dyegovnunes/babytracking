-- Adicionar coluna is_premium ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_purchased_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT;

-- Index para queries de verificação
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium);
