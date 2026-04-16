-- Suporte a marcos auto-registrados (bebê adicionado com idade > 14 dias)
-- achieved_at agora pode ser NULL quando o pai não sabe a data exata
ALTER TABLE baby_milestones ALTER COLUMN achieved_at DROP NOT NULL;

-- Flag indicando que o marco foi criado automaticamente pelo sistema
-- com base na idade do bebê, sem confirmação explícita do pai
ALTER TABLE baby_milestones ADD COLUMN IF NOT EXISTS auto_registered BOOLEAN NOT NULL DEFAULT false;
