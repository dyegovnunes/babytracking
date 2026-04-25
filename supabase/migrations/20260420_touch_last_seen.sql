-- RPC pra atualizar profiles.last_seen_at do usuário logado a cada
-- foco/resume do app. WHERE garante anti-spam server-side: 1 write
-- por usuário a cada 5 min, no máximo.
--
-- Sem isso, o "Último acesso" no painel admin captura apenas
-- timestamps de tabelas onde o usuário GRAVOU algo (logs, marcos,
-- vacinas, medicamentos, etc) — usuários que só abrem e olham
-- não deixam rastro, gerando "miopia" de presença.
--
-- Cliente: app/src/hooks/usePresenceTracker.ts (chama em mount,
-- visibilitychange e Capacitor App resume).

CREATE OR REPLACE FUNCTION public.touch_last_seen(p_platform text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET last_seen_at = now(),
      last_seen_platform = COALESCE(p_platform, last_seen_platform)
  WHERE id = auth.uid()
    AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes');
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen(text) TO authenticated;
