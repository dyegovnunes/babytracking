-- Waitlist de pré-lançamento do Yaya
-- Captura emails de interessados antes do lançamento oficial nas stores.

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  source     text        DEFAULT 'waitlist_page'
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante (anon ou autenticado) pode se inscrever
CREATE POLICY "public can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Somente admins leem e gerenciam
CREATE POLICY "admin full access on waitlist"
  ON waitlist FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
