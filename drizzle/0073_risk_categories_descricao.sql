-- Migration 0073 — Sprint Z-12
-- Adiciona coluna descricao TEXT NULL em risk_categories
-- Seed inline com descrição jurídica das 10 categorias

-- STEP 1: ADD COLUMN
ALTER TABLE risk_categories ADD COLUMN descricao TEXT NULL;

-- STEP 2: SEED — descrições jurídicas em português (1-2 frases, tom jurídico)
UPDATE risk_categories SET descricao =
  'Benefício fiscal que reduz a alíquota efetiva do IBS/CBS abaixo da alíquota padrão, aplicável a setores específicos como saúde, educação e agronegócio, nos termos do art. 30 e seguintes da LC 214/2025.'
WHERE codigo = 'aliquota_reduzida';

UPDATE risk_categories SET descricao =
  'Benefício fiscal que reduz a alíquota do IBS/CBS a zero para determinadas operações, eliminando a carga tributária sobre o contribuinte sem vedação ao aproveitamento de créditos, conforme arts. 47 e 48 da LC 214/2025.'
WHERE codigo = 'aliquota_zero';

UPDATE risk_categories SET descricao =
  'Mecanismo de liquidação automática de débitos tributários de IBS/CBS mediante declaração do contribuinte, sem necessidade de lançamento pela autoridade fiscal, conforme art. 98 da LC 214/2025, com efeito de confissão irretratável da dívida.'
WHERE codigo = 'confissao_automatica';

UPDATE risk_categories SET descricao =
  'Crédito fiscal presumido concedido em substituição ao crédito efetivo do IBS/CBS, aplicável a contribuintes de regimes simplificados ou setores com dificuldade de apuração do crédito real, nos termos dos arts. 52 a 56 da LC 214/2025.'
WHERE codigo = 'credito_presumido';

UPDATE risk_categories SET descricao =
  'Tributo federal de caráter extrafiscal incidente sobre bens e serviços considerados prejudiciais à saúde ou ao meio ambiente, instituído pelo art. 153, VIII da CF/88 e regulamentado nos arts. 409 a 450 da LC 214/2025, com alíquotas específicas por categoria de produto.'
WHERE codigo = 'imposto_seletivo';

UPDATE risk_categories SET descricao =
  'Obrigação de inscrição e manutenção cadastral perante o Comitê Gestor do IBS e a Receita Federal do Brasil para fins de apuração e recolhimento do IBS/CBS, conforme arts. 211 a 220 da LC 214/2025, com penalidades por irregularidade cadastral.'
WHERE codigo = 'inscricao_cadastral';

UPDATE risk_categories SET descricao =
  'Deveres instrumentais impostos ao contribuinte para fins de fiscalização e controle do IBS/CBS, incluindo emissão de documentos fiscais eletrônicos, escrituração digital e entrega de declarações periódicas, nos termos dos arts. 222 a 240 da LC 214/2025.'
WHERE codigo = 'obrigacao_acessoria';

UPDATE risk_categories SET descricao =
  'Tratamento tributário diferenciado concedido a setores específicos da economia (saúde, educação, transporte público, agronegócio, entre outros), com alíquotas reduzidas ou isenções parciais do IBS/CBS, conforme arts. 162 a 210 da LC 214/2025.'
WHERE codigo = 'regime_diferenciado';

UPDATE risk_categories SET descricao =
  'Mecanismo de retenção e recolhimento fracionado do IBS/CBS diretamente pelo agente financeiro no momento do pagamento da operação, conforme arts. 58 a 80 da LC 214/2025, visando reduzir a inadimplência e garantir a arrecadação em tempo real.'
WHERE codigo = 'split_payment';

UPDATE risk_categories SET descricao =
  'Regime de transição do ISS municipal para o IBS no período de 2026 a 2032, com redução gradual da alíquota do ISS e aumento progressivo do IBS, nos termos dos arts. 348 a 380 da LC 214/2025, exigindo adaptação simultânea às duas sistemáticas tributárias.'
WHERE codigo = 'transicao_iss_ibs';
