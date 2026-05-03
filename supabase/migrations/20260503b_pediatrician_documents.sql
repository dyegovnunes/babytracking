-- Sprint E1: Tabelas de documentos clínicos
-- pediatrician_documents: templates da pediatra
-- pediatrician_document_shares: envios para famílias

CREATE TABLE IF NOT EXISTS pediatrician_documents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pediatrician_id uuid REFERENCES pediatricians(id) ON DELETE CASCADE NOT NULL,
  doc_type        text NOT NULL CHECK (doc_type IN ('receita','atestado','encaminhamento','orientacoes')),
  title           text NOT NULL,
  content         text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pediatrician_document_shares (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id     uuid REFERENCES pediatrician_documents(id) ON DELETE CASCADE NOT NULL,
  baby_id         uuid REFERENCES babies(id) ON DELETE CASCADE NOT NULL,
  pediatrician_id uuid REFERENCES pediatricians(id) ON DELETE CASCADE NOT NULL,
  shared_at       timestamptz DEFAULT now(),
  read_at         timestamptz,
  token           text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_shares_baby    ON pediatrician_document_shares(baby_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_token   ON pediatrician_document_shares(token);
CREATE INDEX IF NOT EXISTS idx_documents_ped      ON pediatrician_documents(pediatrician_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE pediatrician_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pediatrician_document_shares ENABLE ROW LEVEL SECURITY;

-- Pediatra vê/gerencia seus próprios documentos
CREATE POLICY "ped manages own docs"
  ON pediatrician_documents
  USING (pediatrician_id = (
    SELECT id FROM pediatricians WHERE user_id = auth.uid()
  ));

-- Família lê shares dos seus bebês
CREATE POLICY "family reads own shares"
  ON pediatrician_document_shares FOR SELECT
  USING (baby_id IN (
    SELECT baby_id FROM baby_members WHERE user_id = auth.uid()
  ));

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- Enviar documento para bebê (chamado pela pediatra)
CREATE OR REPLACE FUNCTION send_document_to_baby(
  p_doc_id  uuid,
  p_baby_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ped_id uuid;
  v_token  text;
BEGIN
  SELECT id INTO v_ped_id FROM pediatricians
  WHERE user_id = auth.uid() AND approved_at IS NOT NULL;
  IF v_ped_id IS NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pediatrician_documents
    WHERE id = p_doc_id AND pediatrician_id = v_ped_id
  ) THEN RAISE EXCEPTION 'not_found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pediatrician_patients
    WHERE pediatrician_id = v_ped_id AND baby_id = p_baby_id AND unlinked_at IS NULL
  ) THEN RAISE EXCEPTION 'not_linked'; END IF;

  INSERT INTO pediatrician_document_shares(document_id, baby_id, pediatrician_id)
  VALUES (p_doc_id, p_baby_id, v_ped_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- Buscar documentos do bebê (chamado pelo app/família)
CREATE OR REPLACE FUNCTION get_baby_documents(p_baby_id uuid)
RETURNS TABLE (
  share_id        uuid,
  token           text,
  doc_type        text,
  title           text,
  content         text,
  ped_name        text,
  ped_crm         text,
  ped_crm_state   text,
  ped_phone       text,
  shared_at       timestamptz,
  read_at         timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM baby_members WHERE baby_id = p_baby_id AND user_id = auth.uid()
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    s.id          AS share_id,
    s.token       AS token,
    d.doc_type    AS doc_type,
    d.title       AS title,
    d.content     AS content,
    p.name        AS ped_name,
    p.crm         AS ped_crm,
    p.crm_state   AS ped_crm_state,
    p.phone       AS ped_phone,
    s.shared_at   AS shared_at,
    s.read_at     AS read_at
  FROM pediatrician_document_shares s
  JOIN pediatrician_documents d ON d.id = s.document_id
  JOIN pediatricians p ON p.id = s.pediatrician_id
  WHERE s.baby_id = p_baby_id
  ORDER BY s.shared_at DESC
  LIMIT 50;
END;
$$;

-- Marcar documento como lido (chamado pelo app)
CREATE OR REPLACE FUNCTION mark_document_read(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE pediatrician_document_shares
  SET read_at = now()
  WHERE token = p_token
    AND read_at IS NULL
    AND baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid());
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS mark_document_read(text);
-- DROP FUNCTION IF EXISTS get_baby_documents(uuid);
-- DROP FUNCTION IF EXISTS send_document_to_baby(uuid, uuid);
-- DROP TABLE IF EXISTS pediatrician_document_shares;
-- DROP TABLE IF EXISTS pediatrician_documents;
