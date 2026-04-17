-- Fix 1: signup quebrado. handle_new_user (SECURITY DEFINER) dispara nosso
-- trigger BEFORE INSERT em profiles, mas o trigger filho herda search_path
-- potencialmente vazio. ALTER pra SECURITY DEFINER + search_path explícito.
ALTER FUNCTION generate_referral_code()
  SECURITY DEFINER
  SET search_path = public;

-- Fix 2: update de medication_logs silencioso. Faltava policy de UPDATE.
-- Mesmo predicate de INSERT/SELECT/DELETE (membros do bebê).
DROP POLICY IF EXISTS "Members can update medication_logs" ON medication_logs;
CREATE POLICY "Members can update medication_logs" ON medication_logs
  FOR UPDATE
  USING (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()))
  WITH CHECK (baby_id IN (SELECT baby_id FROM baby_members WHERE user_id = auth.uid()));
