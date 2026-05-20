-- DOWN para migration 0098 — remove UNIQUE INDEX
-- ATENÇÃO: não há rollback das duplicatas DELETEd (perda de dados irreversível).
-- Reversão apenas remove a constraint; o estado do banco volta ao "ODKU não
-- funcional" mas com dados já deduplicados.

ALTER TABLE `solaris_answers`
  DROP INDEX `idx_solaris_answers_project_codigo`;
