-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0128 — Fase 1: 8 categorias de risco setoriais de Construção Civil
--
-- Issue: #1607 (cobertura setorial construção civil) · Despacho 29/06/2026 15h35
-- Gate jurídico: Dr. José (LC 214 SHA cd9969 + Decreto 12.955 SHA 88a9f8) · GO P.O.
--
-- Gate 0 (evidência bruta convergente — CC grep G1-G6 + Manus SQL Q1-Q7 + Consultor PDF):
--   - tipo            = 'risk'          (enum schema.ts:1923 ['risk','opportunity'])
--   - origem          = 'lei_federal'   (enum schema.ts:1929; sem 'juridico')
--   - lei_codigo      = 'LC-214-2025'   (seed canônico migration 0065:50)
--   - normative_status= 'confirmed'     (consumers deterministic-grounding.ts:115 +
--                                         validate-article-citations.ts:91 filtram 'confirmed')
--   - escopo          = 'setorial'      (default 'nacional'; construção é setorial)
--   - vigencia_inicio = '2027-01-01'    (regime de imóveis entra em vigor 01/01/2027; DATE)
--   - SEM coluna cnaeGroups / artigos_decreto em risk_categories (gating CNAE = engine, Fase 3a)
--
-- Permuta (B3): artigo_base = Art. 252 §2º I e §5º (corrigido de Art. 259 = redutor social).
-- B8 renomeada: risco_sujeicao_passiva_scp (era risco_revisao_contratos) — Arts. 263-264.
--
-- LIÇÃO #88 (acoplamento engine): esta migration cria as 8 LINHAS. Os riscos só DISPARAM
--   após a Fase 3a adicionar os 8 codigo ao `Categoria` union (risk-engine-v4.ts:46-71)
--   + regras de inferência. "Linha criada" ≠ "risco disparando".
--
-- Idempotente: codigo é UNIQUE (migration 0065:9) → ON DUPLICATE KEY UPDATE.
-- ═══════════════════════════════════════════════════════════════════════════

-- UP
INSERT INTO risk_categories
  (codigo, nome, tipo, severidade, urgencia, artigo_base, lei_codigo,
   vigencia_inicio, origem, escopo, normative_status, status)
VALUES
 ('risco_redutor_ajuste','Risco — Redutor de Ajuste','risk','alta','imediata',
  'Art. 257 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_sinter_avaliacao','Risco — Avaliação SINTER','risk','alta','imediata',
  'Art. 256 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_permuta_imoveis','Risco — Permuta de imóveis','risk','alta','curto_prazo',
  'Art. 252 §2º I e §5º LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_controle_empreendimento','Risco — Controle por empreendimento','risk','alta','imediata',
  'Art. 270 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_cib_cadastro','Risco — Cadastro no CIB','risk','alta','imediata',
  'Arts. 265-266 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_custos_historicos','Risco — Custos históricos < 2027','risk','alta','curto_prazo',
  'Art. 258 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_tributacao_parcelas','Risco — Tributação por parcelas','risk','media','medio_prazo',
  'Art. 262 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo'),
 ('risco_sujeicao_passiva_scp','Risco — Sujeição passiva / SCP','risk','media','medio_prazo',
  'Arts. 263-264 LC 214/2025','LC-214-2025','2027-01-01','lei_federal','setorial','confirmed','ativo')
ON DUPLICATE KEY UPDATE
  artigo_base=VALUES(artigo_base), severidade=VALUES(severidade),
  urgencia=VALUES(urgencia), normative_status=VALUES(normative_status);

-- DOWN
-- DELETE FROM risk_categories WHERE codigo IN (
--   'risco_redutor_ajuste','risco_sinter_avaliacao','risco_permuta_imoveis',
--   'risco_controle_empreendimento','risco_cib_cadastro','risco_custos_historicos',
--   'risco_tributacao_parcelas','risco_sujeicao_passiva_scp'
-- );

-- DoD (Manus, banco de produção):
--   SELECT COUNT(*) FROM risk_categories WHERE codigo IN (
--     'risco_redutor_ajuste','risco_sinter_avaliacao','risco_permuta_imoveis',
--     'risco_controle_empreendimento','risco_cib_cadastro','risco_custos_historicos',
--     'risco_tributacao_parcelas','risco_sujeicao_passiva_scp'
--   );  -- esperado: 8
