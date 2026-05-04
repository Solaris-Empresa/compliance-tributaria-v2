-- M3.7 Item 12 — Bloquear perguntas SOL-008..012 (LC 224) até curadoria jurídica
--
-- Origem: Issue #945 + análise profunda Manus (2026-05-04)
-- Justificativa: SOL-008 a SOL-012 referenciam LC 224 sem metadado determinístico
-- (lei_ref/artigo_ref ausentes; cnaeGroups universal sem justificativa).
-- Conforme REGRA-ORQ-29 + Lição #61: perguntas sem metadado determinístico
-- não devem ser exibidas até curadoria jurídica preencher os campos.
--
-- Gate em getOnda1Questions (server/db.ts:1345) já filtra mappingReviewStatus
-- IN ('curated_internal','approved_legal') — pending_legal é bloqueado.
--
-- Reversibilidade: após equipe jurídica preencher lei_ref + artigo_ref via Issue #940,
-- executar UPDATE para 'approved_legal' — perguntas voltam automaticamente.
--
-- Execução: rodar manualmente no banco de produção (DML, não migration drizzle).

UPDATE solaris_questions
SET mapping_review_status = 'pending_legal'
WHERE codigo IN ('SOL-008', 'SOL-009', 'SOL-010', 'SOL-011', 'SOL-012');

-- Verificação:
-- SELECT codigo, mapping_review_status FROM solaris_questions
-- WHERE codigo IN ('SOL-008','SOL-009','SOL-010','SOL-011','SOL-012');
-- Esperado: 5 rows com mapping_review_status='pending_legal'.

-- Reversão (após curadoria):
-- UPDATE solaris_questions
-- SET mapping_review_status = 'approved_legal'
-- WHERE codigo IN ('SOL-008','SOL-009','SOL-010','SOL-011','SOL-012')
--   AND lei_ref IS NOT NULL
--   AND artigo_ref IS NOT NULL;
