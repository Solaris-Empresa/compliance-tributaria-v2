-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0098 — UNIQUE INDEX (project_id, codigo) em `solaris_answers`
--
-- Issue: BUG-I2 — Duplicatas em solaris_answers
-- Sprint BUG-FIX 20/05/2026 · Ref: Auditoria Empírica Bloco B (Manus)
--
-- CONTEXTO:
--   Comentário no schema.ts:1750 afirma "Índice único: (project_id, codigo)",
--   mas a constraint nunca foi criada no banco. Sem ela, `saveOnda1Answers`
--   (server/db.ts:1393-1423) usa `ON DUPLICATE KEY UPDATE` mas o ODKU não
--   tem chave para detectar conflito — cada INSERT gera nova linha.
--
--   Auditoria empírica (Bloco F2 — 2026-05-20T14:55Z):
--   - 36 perguntas em solaris_questions
--   - 24 ativas
--   - Em projeto #6780001: 12 códigos únicos com 2 rows cada = 24 rows
--
-- COMPORTAMENTO PÓS-MIGRATION:
--   - DELETE remove duplicatas existentes preservando MAX(id) por par
--     (project_id, codigo). Critério "última gravação prevalece" — coerente
--     com ON DUPLICATE KEY UPDATE.set.resposta=NOW value já praticado pelo
--     código atual em db.ts:1416-1421.
--   - ADD UNIQUE INDEX ativa o ODKU existente; futuros saves viram upsert
--     real (sem mudança em código).
--
-- REGRA-ORQ-26: migration em branch dedicada (fix/bug-i2-solaris-answers-unique-index)
-- REGRA-ORQ-FILENAME-01: filename sem substring "rag" — OK (touchesRag=false)
-- REGRA-ORQ-34 Protocolo 3 (DoD negativo): query de validação ao final
--
-- DOWN: drizzle/downs/0098_down.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PASSO 1: Remover duplicatas (preservar MAX(id) por par) ────────────────
-- Critério: última gravação prevalece (coerente com ODKU.set já existente).
DELETE sa1 FROM solaris_answers sa1
INNER JOIN solaris_answers sa2
  ON  sa1.project_id = sa2.project_id
  AND sa1.codigo     = sa2.codigo
  AND sa1.id         < sa2.id;

-- ─── PASSO 2: Criar UNIQUE INDEX ────────────────────────────────────────────
-- Nome: idx_solaris_answers_project_codigo (per spec do P.O.)
ALTER TABLE `solaris_answers`
  ADD UNIQUE INDEX `idx_solaris_answers_project_codigo` (`project_id`, `codigo`);

-- ─── VALIDAÇÃO PÓS-MIGRATION (DoD negativo REGRA-ORQ-34) ────────────────────
-- Executar manualmente após a migration:
--
-- -- Esperado: 0 rows (nenhuma duplicata residual)
-- SELECT project_id, codigo, COUNT(*) AS qtd
-- FROM solaris_answers
-- GROUP BY project_id, codigo
-- HAVING qtd > 1;
--
-- -- Esperado: 1 row com Non_unique=0 e Key_name=idx_solaris_answers_project_codigo
-- SHOW INDEX FROM solaris_answers WHERE Key_name = 'idx_solaris_answers_project_codigo';
