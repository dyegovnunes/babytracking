-- ═══════════════════════════════════════════════════════════════════════════
-- Yaya Infoprodutos — Sua Biblioteca Yaya
-- ═══════════════════════════════════════════════════════════════════════════
-- Catálogo de guias digitais pagos integrados ao ecossistema Yaya:
--   - Compra via Stripe (webhook concede acesso e 30 dias de Yaya+ cortesia)
--   - Conteúdo hierárquico (parts → sections) editável pelo admin
--   - Engajamento por seção (progresso, highlights, notas, quiz)
--   - Estrutura escalável: 1 produto hoje, N produtos amanhã
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de produtos
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT UNIQUE NOT NULL,
  title             TEXT NOT NULL,
  subtitle          TEXT,
  description       TEXT,
  price_cents       INT NOT NULL,
  stripe_price_id   TEXT,                       -- preenchido após criar no Stripe
  cover_image_url   TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
  courtesy_days     INT NOT NULL DEFAULT 30,    -- dias de Yaya+ que a compra concede
  audience          TEXT,                        -- 'gestante' | 'parent' | 'both' (livre)
  target_week_start INT,                         -- pra futuras integrações com a régua editorial
  target_week_end   INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guides_status_idx ON guides(status);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Estrutura hierárquica de seções (parts → sections → subsections)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id          UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  parent_id         UUID REFERENCES guide_sections(id) ON DELETE CASCADE,
  order_index       INT NOT NULL,
  slug              TEXT NOT NULL,
  title             TEXT NOT NULL,
  cover_image_url   TEXT,                        -- usado em chapter opener (parts)
  estimated_minutes INT,                          -- tempo de leitura estimado
  content_md        TEXT,                          -- markdown da seção
  type              TEXT NOT NULL DEFAULT 'linear'
                    CHECK (type IN ('linear', 'quiz', 'checklist', 'part')),
  data              JSONB,                         -- quiz: {questions, results}; checklist: {items}
  is_preview        BOOLEAN NOT NULL DEFAULT FALSE,-- amostra grátis na landing
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Slug único dentro do mesmo nível (evita conflito entre subseções de parts diferentes)
  UNIQUE (guide_id, parent_id, slug)
);

CREATE INDEX IF NOT EXISTS guide_sections_guide_idx ON guide_sections(guide_id, order_index);
CREATE INDEX IF NOT EXISTS guide_sections_parent_idx ON guide_sections(parent_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Compras (gate de acesso + idempotência do webhook)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guide_id            UUID NOT NULL REFERENCES guides(id),
  email               TEXT NOT NULL,             -- email da compra (rastreio mesmo se user for deletado)
  provider            TEXT NOT NULL CHECK (provider IN ('stripe', 'hotmart', 'manual')),
  provider_session_id TEXT,                       -- stripe checkout session id
  amount_cents        INT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_at        TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  metadata            JSONB,                      -- payload bruto do webhook pra audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotência: webhook re-enviado não cria duplicata
  UNIQUE (provider, provider_session_id)
);

CREATE INDEX IF NOT EXISTS guide_purchases_user_idx
  ON guide_purchases(user_id, guide_id, status);
CREATE INDEX IF NOT EXISTS guide_purchases_email_idx
  ON guide_purchases(email, status);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Engagement por seção (progresso de leitura)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_progress (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id      UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  section_id    UUID NOT NULL REFERENCES guide_sections(id) ON DELETE CASCADE,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  scroll_offset INT,                              -- pra resume reading preciso
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_id)
);

CREATE INDEX IF NOT EXISTS guide_progress_guide_user_idx
  ON guide_progress(guide_id, user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Highlights (texto destacado)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_highlights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES guide_sections(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,                      -- trecho destacado
  position    INT,                                 -- offset no markdown rendered
  color       TEXT NOT NULL DEFAULT 'yellow'
              CHECK (color IN ('yellow', 'pink', 'purple')),
  note_md     TEXT,                                -- opcional: nota inline no highlight
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guide_highlights_user_section_idx
  ON guide_highlights(user_id, section_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Notas pessoais por seção
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_notes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES guide_sections(id) ON DELETE CASCADE,
  note_md    TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Respostas de quiz
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guide_quiz_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id   UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  section_id UUID REFERENCES guide_sections(id) ON DELETE SET NULL,
  answers    JSONB NOT NULL,
  result     TEXT,                                 -- ex: 'analitica', 'intuitiva'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guide_quiz_responses_user_idx
  ON guide_quiz_responses(user_id, guide_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ENABLE RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE guides                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_highlights       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_quiz_responses   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────
-- Padrão: usuário lê só o que comprou; admin lê/escreve tudo via is_admin();
-- preview e landing pública usam SELECT específico (sem auth) onde aplicável.

-- ── guides ───────────────────────────────────────────────────────────────
-- Anon/auth: vê apenas guides published (pra catálogo + landing)
CREATE POLICY "guides_public_select_published"
  ON guides FOR SELECT
  USING (status = 'published');

-- Admin: tudo
CREATE POLICY "guides_admin_all"
  ON guides FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── guide_sections ───────────────────────────────────────────────────────
-- Sections previews aparecem na landing pública (sem auth)
CREATE POLICY "guide_sections_public_select_preview"
  ON guide_sections FOR SELECT
  USING (
    is_preview = TRUE
    AND EXISTS (
      SELECT 1 FROM guides g WHERE g.id = guide_id AND g.status = 'published'
    )
  );

-- Quem comprou o guia pode ler todas as seções dele
CREATE POLICY "guide_sections_buyers_select"
  ON guide_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guide_purchases gp
      WHERE gp.guide_id = guide_sections.guide_id
        AND gp.user_id = auth.uid()
        AND gp.status = 'completed'
    )
  );

-- Admin: tudo
CREATE POLICY "guide_sections_admin_all"
  ON guide_sections FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── guide_purchases ──────────────────────────────────────────────────────
-- Usuário vê suas próprias compras
CREATE POLICY "guide_purchases_owner_select"
  ON guide_purchases FOR SELECT
  USING (user_id = auth.uid());

-- Admin: tudo
CREATE POLICY "guide_purchases_admin_all"
  ON guide_purchases FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- INSERT/UPDATE só via SECURITY DEFINER (process_guide_purchase) — sem policy
-- pra usuário comum. Edge function autentica como service_role.

-- ── guide_progress ───────────────────────────────────────────────────────
-- Usuário CRUD do próprio progresso
CREATE POLICY "guide_progress_owner_all"
  ON guide_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin lê tudo (pra analytics)
CREATE POLICY "guide_progress_admin_select"
  ON guide_progress FOR SELECT
  USING (is_admin());

-- ── guide_highlights ─────────────────────────────────────────────────────
CREATE POLICY "guide_highlights_owner_all"
  ON guide_highlights FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guide_highlights_admin_select"
  ON guide_highlights FOR SELECT
  USING (is_admin());

-- ── guide_notes ──────────────────────────────────────────────────────────
CREATE POLICY "guide_notes_owner_all"
  ON guide_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guide_notes_admin_select"
  ON guide_notes FOR SELECT
  USING (is_admin());

-- ── guide_quiz_responses ─────────────────────────────────────────────────
CREATE POLICY "guide_quiz_responses_owner_all"
  ON guide_quiz_responses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "guide_quiz_responses_admin_select"
  ON guide_quiz_responses FOR SELECT
  USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: updated_at automático em guides + guide_sections
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at_guides()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_guides_updated_at ON guides;
CREATE TRIGGER trg_guides_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_guides();

DROP TRIGGER IF EXISTS trg_guide_sections_updated_at ON guide_sections;
CREATE TRIGGER trg_guide_sections_updated_at
  BEFORE UPDATE ON guide_sections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_guides();

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNÇÃO CENTRAL: process_guide_purchase
-- ═══════════════════════════════════════════════════════════════════════════
-- Chamada pela edge function stripe-webhook depois que o user_id já foi
-- resolvido (ou criado) via auth.admin API. Aqui dentro: idempotência,
-- INSERT da compra, +N dias de cortesia, log em courtesy_log.
--
-- Idempotência: re-execução com mesmo (provider, provider_session_id) é no-op
-- e retorna o id da compra original.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_guide_purchase(
  p_user_id      UUID,
  p_guide_id     UUID,
  p_email        TEXT,
  p_provider     TEXT,
  p_session_id   TEXT,
  p_amount_cents INT,
  p_metadata     JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id    UUID;
  v_courtesy_days  INT;
  v_guide_title    TEXT;
BEGIN
  -- Idempotência: se já existe uma compra com mesmo (provider, session_id), retorna ela.
  SELECT id INTO v_purchase_id
    FROM guide_purchases
    WHERE provider = p_provider
      AND provider_session_id = p_session_id;

  IF v_purchase_id IS NOT NULL THEN
    RETURN v_purchase_id;
  END IF;

  -- Busca metadados do guia (título + courtesy_days)
  SELECT title, courtesy_days
    INTO v_guide_title, v_courtesy_days
    FROM guides
    WHERE id = p_guide_id;

  IF v_guide_title IS NULL THEN
    RAISE EXCEPTION 'Guide % not found', p_guide_id;
  END IF;

  -- Insere compra completa
  INSERT INTO guide_purchases (
    user_id, guide_id, email, provider, provider_session_id,
    amount_cents, status, purchased_at, metadata
  ) VALUES (
    p_user_id, p_guide_id, p_email, p_provider, p_session_id,
    p_amount_cents, 'completed', NOW(), p_metadata
  ) RETURNING id INTO v_purchase_id;

  -- Concede cortesia Yaya+ (estende sem conflitar com assinatura paga)
  -- Padrão GREATEST() copiado de 20260418b_mgm_v1.sql:90
  IF p_user_id IS NOT NULL THEN
    UPDATE profiles SET
      is_premium = TRUE,
      courtesy_expires_at = GREATEST(COALESCE(courtesy_expires_at, NOW()), NOW())
                            + (v_courtesy_days || ' days')::INTERVAL,
      courtesy_reason = 'Compra: ' || v_guide_title
    WHERE id = p_user_id;

    INSERT INTO courtesy_log (user_id, granted_by, days, reason, expires_at)
    VALUES (
      p_user_id,
      NULL,                                -- NULL = automático (não foi admin manual)
      v_courtesy_days,
      'Compra: ' || v_guide_title,
      NOW() + (v_courtesy_days || ' days')::INTERVAL
    );
  END IF;

  RETURN v_purchase_id;
END;
$$;

-- Permite que a edge function (autenticada como service_role) chame a função.
-- Usuários comuns NÃO podem chamar — só o webhook após validar a Stripe-Signature.
REVOKE ALL ON FUNCTION process_guide_purchase FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_guide_purchase TO service_role;
