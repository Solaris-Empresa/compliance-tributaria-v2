-- Migration 0063 — G15: campo fonte em solaris_questions (3 Ondas de Perguntas)
-- Sprint N · Issue #192 · 2026-03-31
-- Adiciona campo fonte VARCHAR(20) NOT NULL DEFAULT 'solaris' para rastrear
-- a origem da pergunta: 'regulatorio' (corpus RAG), 'solaris' (seeds SOL-001..012),
-- 'ia_gen' (inferência contextual LLM — Onda 3)
-- NOTA: coluna já existia em produção (aplicada em Sprint J).
-- Este arquivo registra formalmente a migration no histórico do repositório.
-- iagen_questions: tabela não existe — perguntas IA são geradas dinamicamente
-- e salvas em questionnaire_answers_v3, não em tabela separada.

-- Idempotente: só executa se a coluna ainda não existir
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'solaris_questions'
  AND COLUMN_NAME = 'fonte'
);

-- Backfill: garantir que todos os registros existentes tenham fonte='solaris'
UPDATE solaris_questions
  SET fonte = 'solaris'
  WHERE fonte IS NULL OR fonte = '';

-- Registrar no histórico de migrations (aplicado em 2026-03-31)
-- QuestionSchema: campo fonte em server/ai-schemas.ts (linha ~144)
-- INV-005: coberto por server/schema-g15-question.test.ts (T-G15-01..05)
