-- Política de delete consolidada para pediatra:
--
-- Não existe "conta separada de pediatra" — pediatra é uma faceta do
-- mesmo auth.users. Deletar a auth user remove TUDO incluindo o papel
-- de pediatra (via CASCADE). Inversamente, deletar só o registro de
-- pediatra (DELETE FROM pediatricians) não toca em auth/profile.
--
-- FKs após esta migration:
--
--   pediatricians.user_id              -> CASCADE   (já existia)
--   pediatricians.approved_by          -> SET NULL  (novo)
--   pediatrician_patients.pediatrician_id -> CASCADE (já existia)
--   pediatrician_patients.baby_id      -> CASCADE   (já existia)
--   pediatrician_patients.linked_by    -> SET NULL  (era NO ACTION)
--   pediatrician_patients.unlinked_by  -> SET NULL  (novo)
--
-- Verificado antes da aplicação: 0 órfãos em todos os campos.

ALTER TABLE pediatrician_patients
  DROP CONSTRAINT pediatrician_patients_linked_by_fkey;

ALTER TABLE pediatrician_patients
  ADD CONSTRAINT pediatrician_patients_linked_by_fkey
  FOREIGN KEY (linked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pediatricians
  ADD CONSTRAINT pediatricians_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE pediatrician_patients
  ADD CONSTRAINT pediatrician_patients_unlinked_by_fkey
  FOREIGN KEY (unlinked_by) REFERENCES auth.users(id) ON DELETE SET NULL;
