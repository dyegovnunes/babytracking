-- RPC SECURITY DEFINER para inserir milestones manuais (first-highlight,
-- first-note, first-checklist-completed, etc).
-- guide_milestones só tem SELECT para owner (INSERT bloqueado por RLS),
-- então inserts manuais do client usam esta função que bypassa RLS.
CREATE OR REPLACE FUNCTION record_guide_milestone(
  p_guide_id UUID,
  p_type TEXT,
  p_ref TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO guide_milestones (user_id, guide_id, type, ref, metadata)
  VALUES (auth.uid(), p_guide_id, p_type, p_ref, p_metadata)
  ON CONFLICT (user_id, guide_id, type, ref) DO NOTHING;
END;
$$;
