-- migration: 0107_feat_cob_01_regime_imoveis.sql
-- (nº 0107 — 0106 já em main / FEAT-SCOPE-02-D #1198)
-- Issue: #1176 (FEAT-COB-01) · Despacho Definitivo 24/05/2026 (D1/D2/D3 + G-A Opção 1)
-- Cria as 3 categorias do regime específico de bens imóveis (Arts. 251-270 LC 214/2025).
--
-- GATE 0 (NUNCA ASSUMA) — risk_categories tem 7 colunas NOT NULL sem default que o
-- despacho omitiu (nome, severidade, urgencia, tipo, lei_codigo, vigencia_inicio, origem).
-- INSERT só com (codigo, artigo_base, normative_bundle) lançaria "Field 'nome' doesn't
-- have a default value". Valores preenchidos conforme convenção do seed 0065_risk_categories.sql
-- + G-B (nome) + G-D (severidade/tipo/urgencia) do despacho.
--
-- Base legal verificada no corpus (fonte de verdade):
--   Art. 360 V + §13 (decreto) → serviço de construção civil é operação do regime → Art. 261 50%
--   Art. 261 PU → locação/cessão/arrendamento 70%
--   Art. 389 (decreto) = LC 269 (cadastro de obra) · Art. 390 (decreto) = LC 270 (apuração por empreendimento)
--
-- normative_bundle = shape OBJETO {tema, artigos_lc214, artigos_decreto, artigos_cgibs6}
--   (compatível com enrichArticle/risk-engine-v4.ts:407 + migration 0101 — NÃO o shape nested do v4 do despacho).
--   artigos_cgibs6 = [] (CGIBS 6 Livro I não ingerido — tech debt P3-IMO-B).
-- Geração por-perfil (inferNormativeRisks) — NÃO inserir em regulatory_requirements_v3 (decisão N1.4).
-- Idempotente (guard NOT EXISTS por codigo — codigo tem index não-unique). Reversível (DOWN abaixo).

-- ── INSERT 1 — oportunidade 50% (regime geral de imóveis) ───────────────────────
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_bundle)
SELECT
  'regime_especifico_imoveis',
  'Regime Específico de Imóveis',
  'oportunidade', 'curto_prazo', 'opportunity',
  'Art. 251', 'LC-214-2025',
  '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional',
  '{"tema":"regime_especifico_imoveis","artigos_lc214":[251,252,253,257,261,263,269,270],"artigos_decreto":[359,360,362,369,375,376,379,381,390],"artigos_cgibs6":[]}'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_especifico_imoveis');

-- ── INSERT 2 — oportunidade 70% (locação/cessão/arrendamento — Art. 261 PU) ──────
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_bundle)
SELECT
  'regime_especifico_imoveis_locacao',
  'Regime Específico de Imóveis — Locação (70%)',
  'oportunidade', 'curto_prazo', 'opportunity',
  'Art. 261', 'LC-214-2025',
  '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional',
  '{"tema":"regime_especifico_imoveis_locacao","artigos_lc214":[252,261,263,264],"artigos_decreto":[360,379,381],"artigos_cgibs6":[]}'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'regime_especifico_imoveis_locacao');

-- ── INSERT 3 — risco/obrigação (cadastro de obra + apuração — Arts. 269-270) ─────
-- G-A Opção 1 (P.O. 24/05): categoria própria (padrão obrigacao_acessoria/inscricao_cadastral).
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo, normative_bundle)
SELECT
  'risco_art_269_270',
  'Obrigação — Cadastro e Apuração por Empreendimento',
  'media', 'curto_prazo', 'risk',
  'Art. 269', 'LC-214-2025',
  '2026-01-01', NULL, 'ativo', 'lei_federal', 'nacional',
  '{"tema":"risco_art_269_270","artigos_lc214":[269,270],"artigos_decreto":[388,389,390],"artigos_cgibs6":[]}'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM risk_categories WHERE codigo = 'risco_art_269_270');

-- ════════════════════════════════════════════════════════════════════════════════
-- DOWN (rollback manual — remover as 3 categorias):
-- DELETE FROM risk_categories WHERE codigo IN
--   ('regime_especifico_imoveis','regime_especifico_imoveis_locacao','risco_art_269_270');
-- ════════════════════════════════════════════════════════════════════════════════
