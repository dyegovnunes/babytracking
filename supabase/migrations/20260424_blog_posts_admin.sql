-- Garante coluna status em blog_posts (pode já existir)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';

-- Atualiza posts existentes sem status
UPDATE blog_posts SET status = 'published' WHERE status IS NULL;

-- RLS: admin pode fazer tudo em blog_posts (INSERT, UPDATE, DELETE, SELECT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blog_posts' AND policyname = 'Admin full access on blog_posts'
  ) THEN
    CREATE POLICY "Admin full access on blog_posts"
      ON blog_posts FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;
