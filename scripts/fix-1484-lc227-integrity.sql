-- scripts/fix-1484-lc227-integrity.sql
-- Fix #1484 — Integridade corpus lc227 (mis-tag de lei + pontilhados garbage)
-- Aprovado P.O.: 16/06/2026 22h00 | SOLARIS-SPEC-FIRST v1.2
-- Executor: Manus (prod) | Revisor/Autor: Claude Code
-- REGRA-ORQ-35: ler o script INTEIRO antes de executar qualquer passo.
-- REGRA-ORQ-37: postar evidência before/after no PR body.
-- Zero schema change: lei='lc214' já está no enum ragDocuments.lei (schema.ts:1355).
--
-- Gate 0 (Claude Code) corrigiu 2 bugs da SQL original do despacho:
--   1) `artigo > 'Art. 197'` (string) → 128 falsos positivos (Art. 2/3/9/20-99 reais).
--      Correção: CAST(REGEXP_SUBSTR(artigo,'[0-9]+') AS UNSIGNED) > 197  (numérico).
--   2) `LIKE '%.%.%.%'` → casa 139/434 (legítimos). Correção: run ≥20 pontos consecutivos.

-- ============================================================
-- PRÉ-VERIFICAÇÃO (executar ANTES de qualquer alteração)
-- ============================================================
SELECT
  'PRE-CHECK' AS fase,
  SUM(CASE WHEN lei = 'lc227' THEN 1 ELSE 0 END)                                          AS lc227_total,
  SUM(CASE WHEN lei = 'lc227'
       AND conteudo REGEXP '[.]{20,}' THEN 1 ELSE 0 END)                                  AS pontilhados_89,
  SUM(CASE WHEN lei = 'lc227'
       AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) > 197
       AND conteudo NOT REGEXP '[.]{20,}' THEN 1 ELSE 0 END)                              AS mistag_liquido_72,
  SUM(CASE WHEN lei = 'lc214' THEN 1 ELSE 0 END)                                          AS lc214_atual
FROM ragDocuments;
-- ESPERADO: lc227_total=434 · pontilhados_89=89 · mistag_liquido_72=72 · lc214_atual=1586
-- SE DIVERGIR: PARAR e reportar ao Claude Code antes de prosseguir.

-- ============================================================
-- PASSO 1 — DELETE 89 pontilhados (garbage — run ≥ 20 pontos)
-- ============================================================
SELECT COUNT(*) AS vai_deletar FROM ragDocuments
WHERE lei = 'lc227' AND conteudo REGEXP '[.]{20,}';
-- ESPERADO: 89 — SE DIFERENTE: PARAR

DELETE FROM ragDocuments
WHERE lei = 'lc227'
  AND conteudo REGEXP '[.]{20,}';
-- ESPERADO: 89 rows affected

-- ============================================================
-- PASSO 2 — UPDATE 72 mis-tag remanescentes → lei='lc214'
-- (os 29 pontilhados com num>197 já foram deletados no Passo 1)
-- ============================================================
SELECT COUNT(*) AS vai_retagear FROM ragDocuments
WHERE lei = 'lc227'
  AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) > 197;
-- ESPERADO: 72 — SE DIFERENTE: PARAR

UPDATE ragDocuments
SET
  lei   = 'lc214',
  autor = 'lc227-via-lc214-fix-16jun2026'
WHERE lei = 'lc227'
  AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) > 197;
-- ESPERADO: 72 rows affected

-- ============================================================
-- PÓS-VERIFICAÇÃO (REGRA-ORQ-37 — postar no PR body)
-- ============================================================
SELECT 'POS-CHECK' AS fase, lei, COUNT(*) AS chunks
FROM ragDocuments
WHERE lei IN ('lc227', 'lc214')
GROUP BY lei;
-- ESPERADO: lc227=273 · lc214=1658 (1586+72)

-- DoD NEGATIVO — deve retornar 0
SELECT COUNT(*) AS deve_ser_zero FROM ragDocuments
WHERE lei = 'lc227'
  AND (CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) > 197
       OR conteudo REGEXP '[.]{20,}');
-- ESPERADO: 0
