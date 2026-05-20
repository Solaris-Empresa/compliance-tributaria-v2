-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0099 — Correção `artigo_base` + governança normativa em `risk_categories`
--
-- Issue: BUG-D1 + BUG-L1 — artigo_base errado em 6/9 categorias causa 76,7%
--        fallback no RAG validator (125/163 riscos ativos).
--
-- Sprint BUG-FIX 20/05/2026 · Autorização P.O. 15:18
-- Valores validados pelo consultor jurídico externo (RACI 2026-05-20)
--
-- CONTEXTO EMPÍRICO (Manus 2026-05-20T14:55Z, Bloco B1 + C2):
--   - 11 risk_categories (10 ativas + enquadramento_geral fallback)
--   - 6 com artigo_base apontando para artigo errado da LC 214/2025
--   - C2: split_payment, regime_diferenciado, inscricao_cadastral,
--         credito_presumido, obrigacao_acessoria, aliquota_zero,
--         aliquota_reduzida → 100% fallback no RAG validator
--
-- ESTRUTURA DA MIGRATION:
--   PARTE A — UPDATEs corrigindo `artigo_base` (6 categorias)
--   PARTE B — ALTER TABLE adicionando 5 colunas de governança normativa
--   PARTE C — UPDATEs populando `normative_bundle` para 4 categorias
--             confirmadas (split_payment, credito_presumido, imposto_seletivo,
--             inscricao_cadastral). Demais ficam `normative_status='pending_document'`.
--
-- REGRA-ORQ-26: branch dedicada · REGRA-ORQ-FILENAME-01: filename sem "rag"
-- REGRA-ORQ-34 Protocolo 3 (DoD negativo): query de validação no fim
--
-- DOWN: drizzle/downs/0099_down.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PARTE A — Correção de artigo_base (6 UPDATEs) ──────────────────────────
-- Motivo: valores antigos apontavam para artigos não relacionados (vide
-- coluna "Motivo" em cada UPDATE). Valores novos validados juridicamente.

UPDATE risk_categories SET
  artigo_base = 'Art. 31 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'split_payment';
-- Motivo: Art. 9 = imunidades (entidades religiosas, etc.)
-- Correto: Arts. 31-35 (split payment — extinção de débitos via fornecimento)

UPDATE risk_categories SET
  artigo_base = 'Art. 168 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'credito_presumido';
-- Motivo: Art. 58 = Comitê Gestor IBS + RFB atuação conjunta
-- Correto: Art. 168 (apropriação de créditos presumidos)

UPDATE risk_categories SET
  artigo_base = 'Art. 164 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'inscricao_cadastral';
-- Motivo: Art. 213 = ZFM (Zona Franca de Manaus — não aplicável universalmente)
-- Correto: Arts. 164-166 (inscrição cadastral produtor rural)

UPDATE risk_categories SET
  artigo_base = 'Art. 409 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'imposto_seletivo';
-- Motivo: Art. 2 = princípio da neutralidade (genérico)
-- Correto: Arts. 409-434 (Título VII — instituição do IS)

UPDATE risk_categories SET
  artigo_base = 'Art. 127 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'aliquota_reduzida';
-- Motivo: Art. 24 = responsabilidade solidária CTN (genérico)
-- Correto: Arts. 127-130 (reduções de alíquotas)

UPDATE risk_categories SET
  artigo_base = 'Art. 229 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'regime_diferenciado';
-- Motivo: Art. 29 = pagamento do saldo a recolher
-- Correto: Arts. 229+ (regimes diferenciados)

-- ─── PARTE B — ALTER TABLE: 5 colunas de governança normativa ──────────────
-- Permite expressar (a) múltiplos artigos por categoria (bundle), (b) natureza
-- jurídica, (c) confiança da atribuição, (d) status de validação, (e) leis-fonte.

ALTER TABLE `risk_categories`
  ADD COLUMN `normative_bundle`    JSON          NULL
    COMMENT 'Array de artigos correlatos: ["Art. 31","Art. 32",...]',
  ADD COLUMN `nature_type`         VARCHAR(50)   NULL
    COMMENT 'Natureza jurídica: obrigacao_principal | obrigacao_acessoria | credito_presumido | tributo_especifico | etc.',
  ADD COLUMN `legal_confidence`    VARCHAR(10)   NULL
    COMMENT 'Confiança da atribuição: high | medium | low',
  ADD COLUMN `normative_status`    VARCHAR(30)   DEFAULT 'pending_document'
    COMMENT 'Estado de validação normativa: pending_document | confirmed | revoked',
  ADD COLUMN `source_basis`        JSON          NULL
    COMMENT 'Leis-fonte que sustentam a categoria: ["lc214","decreto12955","resolucao_cgibs_6"]';

-- ─── PARTE C — Popular normative_bundle (4 categorias confirmadas) ─────────

UPDATE risk_categories SET
  normative_bundle = JSON_ARRAY('Art. 31','Art. 32','Art. 33','Art. 34','Art. 35'),
  nature_type      = 'obrigacao_principal',
  legal_confidence = 'high',
  normative_status = 'confirmed',
  source_basis     = JSON_ARRAY('lc214','decreto12955','resolucao_cgibs_6'),
  updated_at       = NOW()
WHERE codigo = 'split_payment';

UPDATE risk_categories SET
  normative_bundle = JSON_ARRAY('Art. 168','Art. 169'),
  nature_type      = 'credito_presumido',
  legal_confidence = 'high',
  normative_status = 'confirmed',
  source_basis     = JSON_ARRAY('lc214','resolucao_cgibs_6'),
  updated_at       = NOW()
WHERE codigo = 'credito_presumido';

UPDATE risk_categories SET
  normative_bundle = JSON_ARRAY('Art. 409','Art. 410','Art. 412','Art. 413','Art. 414','Art. 422','Art. 424','Art. 430','Art. 433'),
  nature_type      = 'tributo_especifico',
  legal_confidence = 'high',
  normative_status = 'confirmed',
  source_basis     = JSON_ARRAY('lc214'),
  updated_at       = NOW()
WHERE codigo = 'imposto_seletivo';

UPDATE risk_categories SET
  normative_bundle = JSON_ARRAY('Art. 164','Art. 165','Art. 166'),
  nature_type      = 'obrigacao_acessoria',
  legal_confidence = 'high',
  normative_status = 'confirmed',
  source_basis     = JSON_ARRAY('lc214','resolucao_cgibs_6'),
  updated_at       = NOW()
WHERE codigo = 'inscricao_cadastral';

-- ─── VALIDAÇÃO PÓS-MIGRATION (DoD REGRA-ORQ-34 Protocolo 3) ────────────────
-- Executar manualmente após migration:
--
-- -- DoD POSITIVO 1: artigo_base corrigido em todas as 6 categorias
-- SELECT codigo, artigo_base FROM risk_categories
-- WHERE codigo IN ('split_payment','credito_presumido','inscricao_cadastral',
--                  'imposto_seletivo','aliquota_reduzida','regime_diferenciado')
-- ORDER BY codigo;
-- -- Esperado:
-- --   aliquota_reduzida    -> Art. 127 LC 214/2025
-- --   credito_presumido    -> Art. 168 LC 214/2025
-- --   imposto_seletivo     -> Art. 409 LC 214/2025
-- --   inscricao_cadastral  -> Art. 164 LC 214/2025
-- --   regime_diferenciado  -> Art. 229 LC 214/2025
-- --   split_payment        -> Art. 31 LC 214/2025
--
-- -- DoD POSITIVO 2: 4 categorias com bundle populado
-- SELECT codigo, normative_status, JSON_LENGTH(normative_bundle) AS bundle_size
-- FROM risk_categories
-- WHERE normative_status = 'confirmed'
-- ORDER BY codigo;
-- -- Esperado: 4 rows (credito_presumido=2, imposto_seletivo=9, inscricao_cadastral=3, split_payment=5)
--
-- -- DoD NEGATIVO: nenhuma categoria deveria ter artigo_base errado pré-conhecido
-- SELECT 'BUG: artigo_base não atualizado' AS alert, codigo, artigo_base
-- FROM risk_categories
-- WHERE (codigo='split_payment'        AND artigo_base LIKE '%Art. 9%')
--    OR (codigo='credito_presumido'    AND artigo_base LIKE '%Art. 58%')
--    OR (codigo='inscricao_cadastral'  AND artigo_base LIKE '%Art. 213%')
--    OR (codigo='imposto_seletivo'     AND artigo_base LIKE '%Art. 2 %')
--    OR (codigo='aliquota_reduzida'    AND artigo_base LIKE '%Art. 24%')
--    OR (codigo='regime_diferenciado'  AND artigo_base LIKE '%Art. 29 %');
-- -- Esperado: 0 rows
--
-- -- DoD CASCATA (re-gerar riscos pós-migration e medir fallback):
-- SELECT categoria,
--        COUNT(*) AS total,
--        SUM(CASE WHEN JSON_EXTRACT(evidence,'$.rag_validation_note') IS NOT NULL THEN 1 ELSE 0 END) AS fallback,
--        ROUND(100.0 * SUM(CASE WHEN JSON_EXTRACT(evidence,'$.rag_validation_note') IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_fallback
-- FROM risks_v4 WHERE status = 'active' GROUP BY categoria;
-- -- Expectativa pós-fix: pct_fallback < 20% para categorias com artigo_base corrigido
-- -- (pré-fix Bloco C2: 100% fallback em 7 categorias)
