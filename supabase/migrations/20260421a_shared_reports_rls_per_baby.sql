-- Shared reports RLS: permitir que qualquer membro (parent, guardian,
-- caregiver, pediatrician) do baby_id enxergue os links criados.
--
-- Antes: a SELECT policy filtrava por `user_id = auth.uid()`, então um
-- segundo pai não via os links criados pelo primeiro. Agora qualquer
-- membro do grupo do bebê enxerga o mesmo conjunto de links.
--
-- INSERT continua sendo só pra quem é membro (policy existente).
-- UPDATE/DELETE continuam restritos ao criador (user_id = auth.uid())
-- pra evitar que um caregiver derrube o link que o parent criou.

-- Dropa policies antigas de SELECT (nomes variam — cobrir os mais comuns).
DROP POLICY IF EXISTS "Users can view their own shared reports" ON shared_reports;
DROP POLICY IF EXISTS "shared_reports_select_own" ON shared_reports;
DROP POLICY IF EXISTS "shared_reports_select_by_user" ON shared_reports;

CREATE POLICY "shared_reports_select_by_baby_membership"
  ON shared_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM baby_members bm
      WHERE bm.baby_id = shared_reports.baby_id
        AND bm.user_id = auth.uid()
    )
  );
