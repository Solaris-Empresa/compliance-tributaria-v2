-- Migration 0072 — Sprint Z-12
-- Adiciona coluna risk_category_code em regulatory_requirements_v3
-- Rastreabilidade nível 2: FK → risk_categories.codigo
-- Meta: 98% de confiabilidade jurídica (todos os 138 requisitos mapeados)
-- ---------------------------------------------------------------------------
-- STEP 1: ADD COLUMN (nullable para não quebrar dados existentes)
ALTER TABLE regulatory_requirements_v3
  ADD COLUMN IF NOT EXISTS risk_category_code VARCHAR(64) NULL
    COMMENT 'FK → risk_categories.codigo — rastreabilidade nível 2 (Z-12)';

-- STEP 2: FK constraint (ON DELETE SET NULL para resiliência)
-- TiDB Cloud suporta FK com ON DELETE SET NULL
ALTER TABLE regulatory_requirements_v3
  ADD CONSTRAINT IF NOT EXISTS fk_req_v3_risk_category
    FOREIGN KEY (risk_category_code)
    REFERENCES risk_categories(codigo)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- STEP 3: Seed — mapear os 138 requisitos existentes por domain
-- Mapeamento domain → risk_category_code (10 categorias × 12 domínios)

-- split_payment (domínio direto)
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'split_payment'
  WHERE domain = 'split_payment';

-- cadastro_identificacao → inscricao_cadastral
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'inscricao_cadastral'
  WHERE domain = 'cadastro_identificacao';

-- regimes_diferenciados → regime_diferenciado
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'regime_diferenciado'
  WHERE domain = 'regimes_diferenciados';

-- creditos_ressarcimento → credito_presumido
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'credito_presumido'
  WHERE domain = 'creditos_ressarcimento';

-- incentivos_beneficios_transparencia → aliquota_reduzida
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'aliquota_reduzida'
  WHERE domain = 'incentivos_beneficios_transparencia';

-- apuracao_extincao → confissao_automatica
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'confissao_automatica'
  WHERE domain = 'apuracao_extincao';

-- documentos_obrigacoes → obrigacao_acessoria
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'obrigacao_acessoria'
  WHERE domain = 'documentos_obrigacoes';

-- classificacao_incidencia → imposto_seletivo
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'imposto_seletivo'
  WHERE domain = 'classificacao_incidencia';

-- contratos_comercial_precificacao → transicao_iss_ibs
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'transicao_iss_ibs'
  WHERE domain = 'contratos_comercial_precificacao';

-- sistemas_erp_dados → split_payment (integração técnica do split)
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'split_payment'
  WHERE domain = 'sistemas_erp_dados';

-- conformidade_fiscalizacao_contencioso → confissao_automatica
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'confissao_automatica'
  WHERE domain = 'conformidade_fiscalizacao_contencioso';

-- governanca_transicao → transicao_iss_ibs
UPDATE regulatory_requirements_v3
  SET risk_category_code = 'transicao_iss_ibs'
  WHERE domain = 'governanca_transicao';
