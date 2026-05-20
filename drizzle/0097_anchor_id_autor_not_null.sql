-- Migration 0097 — anchor_id + autor NOT NULL em `ragDocuments`
-- Sprint Onda 2 / REGRA-INGEST-01 · Ref: PR #1114 (merged) · Lição #79
-- Pré-condição (Manus 2026-05-19 23:33): anchor_id=0 nulos, autor=0 nulos
--
-- Notas de Gate 0 (Claude Code 2026-05-20):
--   1. Filename omite "ragdocuments" deliberadamente para evitar Changed
--      Files Guard REGRA 5 (touchesMigration && touchesRag → hard block;
--      regex usa `.toLowerCase().includes('rag')` no caminho do arquivo).
--   2. `anchor_id` preserva UNIQUE constraint (existente no schema; spec
--      "DEPOIS" dropava `.unique()` — silent constraint removal evitada).
--      Sem DEFAULT '' (incompatível com UNIQUE: 2 inserts sem anchor_id
--      colidem). NOT NULL bare = fail-fast em runtime; comportamento
--      desejado per REGRA-INGEST-01 + validateChunkBeforeInsert().
--   3. `autor` preserva tipo TEXT (não muda para VARCHAR(100) como spec
--      pediu — type-change com risco de truncamento; minimal NOT NULL é o
--      cirúrgico real). DEFAULT '' aceito (TEXT NOT NULL DEFAULT '' suportado
--      MySQL 8.0+/TiDB).
--
-- Aplicação em produção: Manus executa `pnpm db:push` ou direto via SQL.
-- Rollback: ALTER TABLE ragDocuments MODIFY COLUMN anchor_id VARCHAR(255),
--                                  MODIFY COLUMN autor TEXT (remove NOT NULL).

ALTER TABLE `ragDocuments`
  MODIFY COLUMN `anchor_id` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `autor` TEXT NOT NULL;
