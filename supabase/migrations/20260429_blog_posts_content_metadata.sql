-- Migration: adiciona colunas tipo e gatilho em blog_posts
-- Usadas pelo motor de relevância para classificar conteúdo contextual no app

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS tipo    TEXT CHECK (tipo IN ('referencia', 'fase', 'evento_unico')),
  ADD COLUMN IF NOT EXISTS gatilho TEXT;

-- Índice para query por gatilho (ex: buscar artigos de um gatilho específico)
CREATE INDEX IF NOT EXISTS blog_posts_gatilho_idx ON blog_posts (gatilho)
  WHERE gatilho IS NOT NULL;

-- Índice para query por tipo
CREATE INDEX IF NOT EXISTS blog_posts_tipo_idx ON blog_posts (tipo)
  WHERE tipo IS NOT NULL;

COMMENT ON COLUMN blog_posts.tipo IS
  'Classificação editorial: referencia (sempre útil), fase (relevante numa faixa etária), evento_unico (relevante próximo a um evento específico da jornada)';

COMMENT ON COLUMN blog_posts.gatilho IS
  'Evento específico que torna o artigo relevante: introducao_alimentar, sono_regressao_4m, sono_regressao_8m, sono_regressao_12m, colica, desmame, etc.';
