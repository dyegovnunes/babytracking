-- Fix: usuário não conseguia marcar o próprio welcome_shown_at.
--
-- A única policy de UPDATE em baby_members (`Parents can update member roles`)
-- tem `qual: (is_parent_of(baby_id) AND user_id <> auth.uid())` — ou seja,
-- parent pode atualizar OUTROS, mas nunca a própria linha. Isso bloqueava
-- silenciosamente o UPDATE que o WelcomePage dispara ao clicar "Vamos lá",
-- fazendo com que a tela de boas-vindas reaparecesse toda vez que o usuário
-- voltava pro app.
--
-- Em vez de abrir uma policy genérica de UPDATE no own-row (que permitiria
-- um caregiver se auto-promover a parent), uso uma função SECURITY DEFINER
-- que só mexe em welcome_shown_at — cirúrgico e seguro.

CREATE OR REPLACE FUNCTION mark_welcome_shown(p_baby_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE baby_members
     SET welcome_shown_at = NOW()
   WHERE user_id = auth.uid()
     AND baby_id = p_baby_id
     AND welcome_shown_at IS NULL;
END;
$$;

-- Qualquer usuário autenticado pode chamar (a função já restringe pelo
-- auth.uid() internamente, então só mexe na própria linha).
GRANT EXECUTE ON FUNCTION mark_welcome_shown(uuid) TO authenticated;
