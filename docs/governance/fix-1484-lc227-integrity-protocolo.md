# Protocolo de Fix #1484 — Integridade do corpus `lc227`

**Aprovado P.O.:** 16/06/2026 22h00 · SOLARIS-SPEC-FIRST v1.2
**Executor:** Manus (prod) · **Revisor/Autor:** Claude Code
**Issue:** #1484 · **Tipo:** correção de dados (não-schema)

> **Nota de formato:** a SQL fica neste doc (não em `scripts/*.sql`) porque o gate `Migration discipline` trata qualquer `.sql` como migration Drizzle e exigiria seções/reversibilidade que **não se aplicam** a um fix operacional de dados (Lição #92 — guards com false-positive por tipo de arquivo). O conteúdo é a SQL revisada e versionada (Lição #71). O Manus executa estas statements em produção.

## Contexto

`lei = 'lc227'` tem 434 chunks no `ragDocuments`. Diagnóstico #1484:
- **101 mis-tag** — LC 227 altera artigos da LC 214 (num > 197, range 212→544); o seed tagueou `lei='lc227'` mas o conteúdo é da LC 214.
- **89 pontilhados** — placeholders `"........"` (texto não-alterado) importados literalmente; sem valor para RAG.
- Sobreposição: 29 chunks são mis-tag **e** pontilhados → vão no DELETE.

**Zero schema change:** `lei='lc214'` já está no enum `ragDocuments.lei` (`drizzle/schema.ts:1355`).

## Gate 0 (Claude Code) — 2 bugs corrigidos vs a SQL original do despacho

| Bug | SQL original | Correção |
|---|---|---|
| String-compare | `artigo > 'Art. 197'` → `'Art. 2' > 'Art. 197'`=TRUE → 128 falsos positivos | `CAST(REGEXP_SUBSTR(artigo,'[0-9]+') AS UNSIGNED) > 197` (numérico) = 101 |
| LIKE genérico | `conteudo LIKE '%.%.%.%'` → casa 139/434 (legítimos) | `conteudo REGEXP '[.]{20,}'` (run ≥20 pontos) = 89 |

## Protocolo de execução (Manus — REGRA-ORQ-35 + Lição #71)

1. Ler o bloco SQL **inteiro** antes de executar.
2. Rodar a **PRÉ-VERIFICAÇÃO** e confirmar os 4 números (`434 / 89 / 72 / 1586`). Se divergir → **PARAR** e reportar ao Claude Code.
3. **PASSO 1 (DELETE)** — confirmar `89 rows affected`.
4. **PASSO 2 (UPDATE)** — confirmar `72 rows affected`.
5. Rodar **PÓS-VERIFICAÇÃO** + **DoD negativo** (`deve_ser_zero = 0`) e postar a evidência no PR/issue (REGRA-ORQ-37).

```sql
-- ============================================================
-- PRÉ-VERIFICAÇÃO (antes de qualquer alteração)
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
-- SE DIVERGIR: PARAR e reportar ao Claude Code.

-- ============================================================
-- PASSO 1 — DELETE 89 pontilhados (run ≥ 20 pontos)
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
-- PÓS-VERIFICAÇÃO (REGRA-ORQ-37 — postar evidência)
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
```

## Reversibilidade

- **UPDATE (72):** reversível — `UPDATE ... SET lei='lc227' WHERE autor='lc227-via-lc214-fix-16jun2026'`.
- **DELETE (89):** **não trivialmente reversível** — são placeholders pontilhados sem valor; recuperáveis apenas via re-seed do corpus. Por isso o `COUNT` obrigatório antes do DELETE.

## Vinculadas

Issue #1484 · worklists primários (#1483) · Lição #64 (enum Data truncated) · #65 (writer/reader) · #71 (script versionado) · #92 (guards false-positive por tipo) · REGRA-ORQ-35/37
