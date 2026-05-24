-- migration: 0106_feat_scope_02d_credito_presumido_questions.sql
-- (nº 0106 — 0105 já em main / BUG-RANGE-01 #1193)
-- Issue: #1197 (FEAT-SCOPE-02-D) · ADR-FEAT-SCOPE-02 (#1195) · curadoria 3 fontes (#1200)
-- Cria as 3 perguntas operacionais do gate Art. 168 (produtor rural) em solaris_questions.
--
-- Colunas EXATAS confirmadas via SHOW FULL COLUMNS (Gate 0 / G2, Manus 24/05):
--   texto NOT NULL · categoria NOT NULL · risk_category_code (engine link) · cnae_groups (NULL=universal)
--   obrigatorio/ativo tinyint def 1 · fonte def 'solaris' · criado_em bigint NOT NULL (sem default → fornecido)
--   classification_scope/mapping_review_status enums · lei_ref/artigo_ref estruturados · codigo SOL-NNN
-- Codigos SOL-050/051/052 = próximos livres (G1: último SOL-049).
-- mapping_review_status='curated_internal' → EXIBIDA (server/db.ts:1381). cnae_groups NULL: Art. 168 não restringe por CNAE.
-- Idempotente (guard NOT EXISTS por codigo — codigo não tem unique key). Reversível (DOWN abaixo).
-- A semântica de bloqueio (Q5/Q1/Q2 como gate) é aplicada pelo gate A (#1201), não há coluna correspondente no schema.

-- Q5 (regime regular) — SOL-050
INSERT INTO solaris_questions
  (texto, categoria, risk_category_code, cnae_groups, obrigatorio, ativo, fonte, criado_em,
   classification_scope, mapping_review_status, lei_ref, artigo_ref, codigo, titulo, topicos, observacao)
SELECT
  'A empresa é contribuinte de IBS/CBS sujeita ao regime regular (não optante pelo Simples Nacional)?',
  'credito_presumido', 'credito_presumido', NULL, 1, 1, 'solaris', FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000),
  'risk_engine', 'curated_internal', 'lc214', 'Art. 168 caput; Art. 41 §1º', 'SOL-050',
  'Crédito presumido — regime regular',
  'IBS,CBS,credito presumido,regime regular,produtor rural,Art. 168',
  'FEAT-SCOPE-02-D #1197. Gate Art. 168 (Q5 eliminatória). Curadoria 3 fontes + ADR-FEAT-SCOPE-02 #1195.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-050');

-- Q1 (adquire de produtor rural) — SOL-051
INSERT INTO solaris_questions
  (texto, categoria, risk_category_code, cnae_groups, obrigatorio, ativo, fonte, criado_em,
   classification_scope, mapping_review_status, lei_ref, artigo_ref, codigo, titulo, topicos, observacao)
SELECT
  'A empresa adquire bens ou serviços diretamente de produtor rural ou produtor rural integrado?',
  'credito_presumido', 'credito_presumido', NULL, 1, 1, 'solaris', FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000),
  'risk_engine', 'curated_internal', 'lc214', 'Art. 168 caput', 'SOL-051',
  'Crédito presumido — aquisição de produtor rural',
  'IBS,CBS,credito presumido,produtor rural,produtor rural integrado,Art. 168',
  'FEAT-SCOPE-02-D #1197. Gate Art. 168 (Q1 eliminatória). Curadoria 3 fontes + ADR-FEAT-SCOPE-02 #1195.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-051');

-- Q2 (produtor não contribuinte Art. 164) — SOL-052
INSERT INTO solaris_questions
  (texto, categoria, risk_category_code, cnae_groups, obrigatorio, ativo, fonte, criado_em,
   classification_scope, mapping_review_status, lei_ref, artigo_ref, codigo, titulo, topicos, observacao)
SELECT
  'Esse produtor rural/integrado é não contribuinte do IBS/CBS (receita < R$ 3,6M/ano, nos termos do Art. 164 LC 214/2025)?',
  'credito_presumido', 'credito_presumido', NULL, 1, 1, 'solaris', FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000),
  'risk_engine', 'curated_internal', 'lc214', 'Art. 164 caput', 'SOL-052',
  'Crédito presumido — produtor não contribuinte',
  'IBS,CBS,credito presumido,produtor rural,nao contribuinte,Art. 164',
  'FEAT-SCOPE-02-D #1197. Gate Art. 168 (Q2 eliminatória). Curadoria 3 fontes + ADR-FEAT-SCOPE-02 #1195.'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-052');

-- ROLLBACK (DOWN) — Reversível:
-- DELETE FROM solaris_questions WHERE codigo IN ('SOL-050', 'SOL-051', 'SOL-052') AND fonte = 'solaris';
