-- Content System: blog_posts, content_cards, content_alerts, content_triggers, user_content_interactions

-- ─── blog_posts ───────────────────────────────────────────────────────────────

CREATE TABLE blog_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  meta_description  TEXT,
  content_md        TEXT NOT NULL,
  keywords          TEXT[],
  category          TEXT NOT NULL CHECK (category IN ('alimentacao', 'sono', 'desenvolvimento', 'saude', 'rotina', 'marcos')),
  target_week_start INTEGER,
  target_week_end   INTEGER,
  sources           JSONB,
  image_url         TEXT,
  image_alt         TEXT,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  card_id           UUID,  -- FK adicionada após content_cards (ver abaixo)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ
);

CREATE INDEX idx_blog_posts_slug   ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_cat    ON blog_posts(category, status);

-- ─── content_cards ────────────────────────────────────────────────────────────

CREATE TABLE content_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  cta_text     TEXT NOT NULL,
  cta_url      TEXT NOT NULL,
  trigger_week INTEGER NOT NULL,
  end_week     INTEGER,
  category     TEXT NOT NULL CHECK (category IN ('alimentacao', 'sono', 'desenvolvimento', 'saude', 'rotina', 'marcos')),
  is_premium   BOOLEAN NOT NULL DEFAULT FALSE,
  priority     INTEGER NOT NULL DEFAULT 5,
  blog_url     TEXT,
  image_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_content_cards_trigger  ON content_cards(trigger_week, status);
CREATE INDEX idx_content_cards_category ON content_cards(category, status);

-- FK de blog_posts → content_cards (agora que content_cards existe)
ALTER TABLE blog_posts
  ADD CONSTRAINT fk_blog_post_card
  FOREIGN KEY (card_id) REFERENCES content_cards(id) ON DELETE SET NULL;

-- ─── content_alerts ───────────────────────────────────────────────────────────

CREATE TABLE content_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  cta_text     TEXT NOT NULL,
  trigger_week INTEGER NOT NULL,
  type         TEXT NOT NULL DEFAULT 'contextual' CHECK (type IN ('contextual', 'push')),
  push_title   TEXT,
  push_body    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── content_triggers ─────────────────────────────────────────────────────────

CREATE TABLE content_triggers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id           UUID NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  trigger_type      TEXT NOT NULL CHECK (trigger_type IN ('age', 'behavior', 'first_event', 'milestone')),
  trigger_condition JSONB NOT NULL,
  priority          INTEGER NOT NULL DEFAULT 5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── user_content_interactions ────────────────────────────────────────────────

CREATE TABLE user_content_interactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id    UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  card_id    UUID NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('viewed', 'clicked', 'dismissed', 'shared')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- dismissed deve ser único por usuário/bebê/card (não faz sentido descartar duas vezes)
-- viewed/clicked podem ter múltiplas entradas para analytics de frequência
CREATE UNIQUE INDEX idx_dismissed_unique
  ON user_content_interactions(user_id, baby_id, card_id)
  WHERE action = 'dismissed';

CREATE INDEX idx_user_content_user_baby ON user_content_interactions(user_id, baby_id);
CREATE INDEX idx_user_content_card      ON user_content_interactions(card_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE blog_posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_cards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_triggers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_interactions ENABLE ROW LEVEL SECURITY;

-- Leitura pública de artigos publicados (visitantes anônimos — necessário para SEO)
CREATE POLICY "blog_posts_anon_select" ON blog_posts
  FOR SELECT TO anon USING (status = 'published');

-- Leitura de artigos para autenticados
CREATE POLICY "blog_posts_auth_select" ON blog_posts
  FOR SELECT TO authenticated USING (status = 'published');

-- Leitura de cards para autenticados
CREATE POLICY "content_cards_auth_select" ON content_cards
  FOR SELECT TO authenticated USING (status = 'published');

-- Leitura de alerts e triggers para autenticados (config de comportamento do app)
CREATE POLICY "content_alerts_auth_select" ON content_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "content_triggers_auth_select" ON content_triggers
  FOR SELECT TO authenticated USING (true);

-- Interações: cada usuário vê e escreve apenas as próprias
CREATE POLICY "user_content_own_select" ON user_content_interactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_content_own_insert" ON user_content_interactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admin: controle total nas tabelas de conteúdo
CREATE POLICY "blog_posts_admin_all" ON blog_posts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "content_cards_admin_all" ON content_cards
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "content_alerts_admin_all" ON content_alerts
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "content_triggers_admin_all" ON content_triggers
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "user_content_admin_select" ON user_content_interactions
  FOR SELECT TO authenticated USING (is_admin());
