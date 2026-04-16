-- Suporte a vacinas auto-registradas (bebê adicionado com idade > nascimento)
-- Vacinas obrigatórias (PNI) da idade passada ficam marcadas automaticamente
-- com status='applied' e applied_at=null. Pai pode confirmar com data ou desmarcar.
ALTER TABLE baby_vaccines ADD COLUMN IF NOT EXISTS auto_registered BOOLEAN NOT NULL DEFAULT false;
