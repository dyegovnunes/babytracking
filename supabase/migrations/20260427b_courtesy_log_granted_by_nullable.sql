-- granted_by NULL representa "concessão automática" (compra de guide, MGM, etc.)
-- não-NULL = UUID do admin que concedeu manualmente.
-- A coluna era NOT NULL por engano da migration original; a função
-- process_guide_purchase precisa inserir com granted_by=NULL.
ALTER TABLE courtesy_log ALTER COLUMN granted_by DROP NOT NULL;
COMMENT ON COLUMN courtesy_log.granted_by IS 'NULL = concessão automática (compra/MGM); UUID = admin que concedeu manualmente';
