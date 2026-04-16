-- Normalizar roles existentes para valores válidos
UPDATE baby_members SET role = 'caregiver'
  WHERE role NOT IN ('parent', 'guardian', 'caregiver', 'pediatrician');

-- Constraint de role em baby_members
ALTER TABLE baby_members
  DROP CONSTRAINT IF EXISTS baby_members_role_check;
ALTER TABLE baby_members
  ADD CONSTRAINT baby_members_role_check
  CHECK (role IN ('parent', 'guardian', 'caregiver', 'pediatrician'));

-- Coluna is_premium em babies
ALTER TABLE babies ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

-- Todos os bebês premium para teste (remover no lançamento oficial)
UPDATE babies SET is_premium = true;
