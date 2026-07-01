-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0131 — B1 Fase 2: titulo_template em cnae_categoria_map (D-B1-4=A)
--
-- Issue: #B1-F2 · Spec: #1675 · D-B1-4=A (título curado mora no map, não em risk_categories
-- → evita schema.ts/rag-quality-gate; preserva a narrativa exata do gate Dr. José).
-- O engine (Fase 2) lê severidade/urgência/tipo/artigo de risk_categories (D-B1-3) e o
-- titulo_template daqui. {op} é substituído em runtime por profile.tipoOperacao.
--
-- Paridade EXATA: os 12 títulos são cópia literal de normative-inference.ts:236-329.
-- ═══════════════════════════════════════════════════════════════════════════

-- UP
ALTER TABLE cnae_categoria_map ADD COLUMN titulo_template TEXT NULL AFTER nota;

-- Títulos por categoria (aplicam-se a todas as linhas de prefixo daquela categoria).
UPDATE cnae_categoria_map SET titulo_template = 'Risco de perda/estorno de crédito de IBS/CBS sobre aquisições da obra — exige contabilidade por obra ou CIB ({op})' WHERE categoria_codigo = 'risco_credito_condicionado_obra';
UPDATE cnae_categoria_map SET titulo_template = 'Risco de perda do Redutor de Ajuste nas operações com bens imóveis ({op})' WHERE categoria_codigo = 'risco_redutor_ajuste';
UPDATE cnae_categoria_map SET titulo_template = 'Risco de divergência na avaliação dos imóveis pelo SINTER ({op})' WHERE categoria_codigo = 'risco_sinter_avaliacao';
UPDATE cnae_categoria_map SET titulo_template = 'Obrigação de inscrição dos imóveis no CIB (Cadastro Imobiliário Brasileiro) ({op})' WHERE categoria_codigo = 'risco_cib_cadastro';
UPDATE cnae_categoria_map SET titulo_template = 'Obrigação de apuração segregada por empreendimento de construção civil ({op})' WHERE categoria_codigo = 'risco_controle_empreendimento';
UPDATE cnae_categoria_map SET titulo_template = 'Risco tributário na permuta de imóveis — torna e manutenção do redutor ({op})' WHERE categoria_codigo = 'risco_permuta_imoveis';
UPDATE cnae_categoria_map SET titulo_template = 'Tributação do IBS/CBS no recebimento de cada parcela na incorporação/parcelamento ({op})' WHERE categoria_codigo = 'risco_tributacao_parcelas';
UPDATE cnae_categoria_map SET titulo_template = 'Sujeição passiva — recolhimento pelo sócio ostensivo em sociedade em conta de participação ({op})' WHERE categoria_codigo = 'risco_sujeicao_passiva_scp';
UPDATE cnae_categoria_map SET titulo_template = 'Levantamento dos custos históricos dos imóveis até 31/12/2026 para o Redutor de Ajuste ({op})' WHERE categoria_codigo = 'risco_custos_historicos';
UPDATE cnae_categoria_map SET titulo_template = 'Oportunidade de redução de 50% nas operações com bens imóveis ({op})' WHERE categoria_codigo = 'regime_especifico_imoveis';
UPDATE cnae_categoria_map SET titulo_template = 'Oportunidade de redução de 70% na locação, cessão onerosa e arrendamento de bens imóveis ({op})' WHERE categoria_codigo = 'regime_especifico_imoveis_locacao';
UPDATE cnae_categoria_map SET titulo_template = 'Obrigação de cadastro de obra (CIB) e apuração por empreendimento de construção civil ({op})' WHERE categoria_codigo = 'risco_art_269_270';

-- DOWN
-- ALTER TABLE cnae_categoria_map DROP COLUMN titulo_template;

-- DoD (Manus): SELECT COUNT(*) FROM cnae_categoria_map WHERE titulo_template IS NULL;  -- esperado 0
