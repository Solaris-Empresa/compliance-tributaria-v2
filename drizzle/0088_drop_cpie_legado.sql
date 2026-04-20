-- 0088_drop_cpie_legado — Sprint Z-22 Wave B
-- ADR-0029 D-2 + EX-3 · P.O. Uires Tapajos · 2026-04-18
-- IRREVERSIVEL — sem rollback via down()
--
-- Apaga legado CPIE v1 / v2 / CPIE-B conforme autorizacao explicita:
--   "todos os dados do banco podem ser apagados, com excecao RAG"
--
-- Invariante obrigatoria: ragDocuments deve permanecer em 2.515 linhas
-- (baseline v7.12 Corpus RAG · 10 leis + 3 CGIBS).
-- Nome real da tabela e camelCase (drizzle/schema.ts L1329: mysqlTable("ragDocuments")).

-- Gate 1: contagens pre-drop (evidencia para PR body)
SELECT 'pre_drop_cpieAnalysisHistory' AS label, COUNT(*) AS n FROM cpie_analysis_history;
SELECT 'pre_drop_cpieSettings' AS label, COUNT(*) AS n FROM cpie_settings;
SELECT 'pre_drop_cpie_score_history' AS label, COUNT(*) AS n FROM cpie_score_history;
SELECT 'pre_drop_ragDocuments_INVARIANTE' AS label, COUNT(*) AS n FROM ragDocuments;

-- DROP das 3 tabelas CPIE legado (nomes snake_case conforme criacao original)
DROP TABLE IF EXISTS cpie_analysis_history;
DROP TABLE IF EXISTS cpie_settings;
DROP TABLE IF EXISTS cpie_score_history;

-- DROP das 4 colunas orfas em projects (EX-3 do ADR-0029)
-- default=0 / NULL em 2367 projetos (ADR-0023) - sem valor retido
ALTER TABLE projects DROP COLUMN IF EXISTS profileCompleteness;
ALTER TABLE projects DROP COLUMN IF EXISTS profileConfidence;
ALTER TABLE projects DROP COLUMN IF EXISTS profileLastAnalyzedAt;
ALTER TABLE projects DROP COLUMN IF EXISTS profileIntelligenceData;

-- Gate 2: invariante pos-drop
SELECT 'post_drop_ragDocuments_INVARIANTE' AS label, COUNT(*) AS n FROM ragDocuments;
-- Esperado: 2515 (valor fixo do Corpus RAG baseline v7.12)
