-- GOLD SET — IA SOLARIS RAG
-- Queries canônicas de validação de cobertura do corpus.
-- Executar após qualquer ingestão ou correção.
-- Resultado esperado documentado em CORPUS-BASELINE.md.
-- Versão: 1.0 | Data: 2026-03-26

-- ─────────────────────────────────────────────────────────────
-- GS-01 Integridade total
-- Esperado: 2.078 chunks, 0 sem anchor_id
-- ─────────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                               AS total_chunks,
  SUM(CASE WHEN anchor_id IS NULL THEN 1 ELSE 0 END)    AS sem_anchor_id,
  SUM(CASE WHEN anchor_id IS NOT NULL THEN 1 ELSE 0 END) AS com_anchor_id
FROM ragDocuments;

-- ─────────────────────────────────────────────────────────────
-- GS-02 Distribuição por lei — deve bater com CORPUS-BASELINE.md
-- ─────────────────────────────────────────────────────────────
SELECT lei, COUNT(*) AS total, MIN(id) AS id_min, MAX(id) AS id_max
FROM ragDocuments
GROUP BY lei
ORDER BY lei;

-- ─────────────────────────────────────────────────────────────
-- GS-03 Recuperabilidade lc227 — deve retornar >= 5 chunks
-- Query simulando busca real do rag-retriever.ts
-- ─────────────────────────────────────────────────────────────
SELECT id, lei, artigo, titulo, anchor_id,
       LEFT(conteudo, 100) AS conteudo_inicio
FROM ragDocuments
WHERE lei = 'lc227'
  AND (topicos LIKE '%split payment%'
    OR topicos LIKE '%retenção%'
    OR conteudo LIKE '%split payment%')
LIMIT 10;

-- ─────────────────────────────────────────────────────────────
-- GS-04 Recuperabilidade lc214 Art. 45 — confissão de dívida (G5)
-- Deve retornar >= 1 chunk com topico relevante
-- ─────────────────────────────────────────────────────────────
SELECT id, lei, artigo, titulo, topicos, anchor_id
FROM ragDocuments
WHERE lei = 'lc214'
  AND (topicos LIKE '%confissão%'
    OR topicos LIKE '%apuração%'
    OR artigo LIKE '%45%')
LIMIT 10;

-- ─────────────────────────────────────────────────────────────
-- GS-05 Recuperabilidade lc224 — cnaeGroups universal (G6)
-- Deve retornar chunks com cnaeGroups cobrindo grupos 46 e 49
-- ─────────────────────────────────────────────────────────────
SELECT id, lei, artigo, cnaeGroups, anchor_id
FROM ragDocuments
WHERE lei = 'lc224'
  AND (cnaeGroups LIKE '%46%' OR cnaeGroups LIKE '%01-96%')
LIMIT 10;

-- ─────────────────────────────────────────────────────────────
-- GS-06 Cobertura ec132 — deve ter >= 18 chunks
-- ─────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_ec132,
       MIN(id) AS id_min, MAX(id) AS id_max
FROM ragDocuments
WHERE lei = 'ec132';

-- ─────────────────────────────────────────────────────────────
-- GS-07 Ausência de anomalias — deve retornar 0 linhas
-- ─────────────────────────────────────────────────────────────
SELECT id, lei, artigo, anchor_id,
       LENGTH(conteudo) AS bytes
FROM ragDocuments
WHERE anchor_id IS NULL
   OR LENGTH(conteudo) < 50
   OR lei NOT IN ('lc214','ec132','lc227','lc224','lc116','lc87',
                  'cg_ibs','rfb_cbs','conv_icms','solaris')
ORDER BY id;

-- ─────────────────────────────────────────────────────────────
-- GS-08 Ingestão mais recente — verificar autor e data
-- ─────────────────────────────────────────────────────────────
SELECT id, lei, artigo, autor, data_revisao, createdAt,
       LEFT(conteudo, 80) AS conteudo_inicio
FROM ragDocuments
ORDER BY id DESC
LIMIT 10;
