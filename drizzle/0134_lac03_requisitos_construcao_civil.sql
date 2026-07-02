-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0134 — LAC-03: cadeia evidência de construção civil (requisito→pergunta)
--
-- Issue: #1664 · Classe B · Spec aprovada P.O. (Despacho 02/07 17h55/18h12)
-- Acende a cadeia por EVIDÊNCIA (resposta do cliente → gap) para as 10 categorias CC,
-- que hoje só geram por inferência de perfil (cnae_categoria_map, B1). Desbloqueia o
-- stub normalizeQcnaeOnda3Answers (#963).
--
-- Migração de banco. Reversível (DOWN por DELETE dos códigos REQ-CC/CANON-CC + reverter
-- UPDATEs). Testado em ambiente isolado. NÃO faz DROP.
--
-- Gate 0 (fechado): F-B evaluation_criteria/evidence_required são JSON array
-- (db-requirements.ts:142); F-A cnae_scope match EXATO por CNAE completo em
-- questionEngine.ts:337 (input.cnae_code = "4120-4/00"); coverage ignora cnae_scope
-- (opção i, GAP-REQ-CNAE-SCOPE-COVERAGE). CNAEs validados contra cnae_embeddings
-- (38 códigos; 4211-1/03 ausente e 6911-7/01 advocacia removidos).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. D1 — risco_art_269_270 vira setorial ────────────────────────────────
UPDATE risk_categories SET escopo = 'setorial' WHERE codigo = 'risco_art_269_270';

-- ── 2. D6-A — SOL-056 artigo correto (consultor: Art. 234 → Art. 159) ───────
UPDATE solaris_questions SET artigo_ref = 'Art. 159 LC 214/2025' WHERE codigo = 'SOL-056';

-- ── 3. D7-A — SOL-053 sem artigo verificado ────────────────────────────────
UPDATE solaris_questions
  SET artigo_ref = NULL, mapping_review_status = 'pending_legal'
  WHERE codigo = 'SOL-053';

-- ── 4. ALTER — rastro de proveniência (mitigação DEBT #1697) ────────────────
ALTER TABLE requirement_question_mapping
  ADD COLUMN source_question_code VARCHAR(20) NULL
  COMMENT 'Rastro de proveniência da pergunta (SOL-xxx) — não FK (DEBT #1697)';

-- ── 5. seed regulatory_requirements_v3 (10 requisitos CC) ───────────────────
-- name/description = verbatim de risk_categories (subquery). cnae_scope = 38 CNAEs
-- validados. evaluation_criteria/evidence_required = JSON array (F-B).
SET @base := (SELECT COALESCE(MAX(assessment_order), 0) FROM regulatory_requirements_v3);
SET @cc := '["4110-7/00","4120-4/00","4211-1/01","4211-1/02","4213-8/00","4221-9/01","4221-9/02","4221-9/03","4221-9/04","4221-9/05","4222-7/01","4222-7/02","4223-5/00","4291-0/00","4292-8/01","4292-8/02","4299-5/01","4299-5/99","4321-5/00","4322-3/01","4322-3/02","4329-1/01","4329-1/02","4329-1/03","4329-1/04","4329-1/05","4391-6/00","4399-1/01","4399-1/02","4399-1/03","4399-1/04","4399-1/05","6810-2/01","6810-2/02","6810-2/03","6821-8/01","6821-8/02","6822-6/00"]';

INSERT INTO regulatory_requirements_v3
  (code, name, description, domain, assessment_order, base_criticality, default_gap_type,
   gap_level, layer, cnae_scope, evaluation_criteria, evidence_required, legal_reference,
   legal_article, active, risk_category_code)
VALUES
 ('REQ-CC-CIB',
  (SELECT nome FROM risk_categories WHERE codigo='risco_cib_cadastro'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_cib_cadastro'),
  'construcao_civil', @base+1, 'alta', 'cadastro', 'operacional', 'cnae', @cc,
  '["Verificar se todos os imóveis (urbanos/rurais) e cada obra de construção civil estão inscritos no CIB, dentro dos prazos do Art. 266 (12 ou 24 meses conforme o sujeito)."]',
  '["Comprovante de inscrição do imóvel e da obra no CIB (número de cadastro)."]',
  'LC 214/2025', 'Arts. 265-266 LC 214/2025', 1, 'risco_cib_cadastro'),

 ('REQ-CC-269270',
  (SELECT nome FROM risk_categories WHERE codigo='risco_art_269_270'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_art_269_270'),
  'construcao_civil', @base+2, 'media', 'cadastro', 'operacional', 'cnae', @cc,
  '["Verificar se a obra recebeu identificação cadastral própria no CIB (Art. 269) e se esse número consta dos documentos fiscais de aquisição de bens/serviços da obra (Art. 270, §único)."]',
  '["Número de cadastro da obra + amostra de notas fiscais de aquisição com o número indicado."]',
  'LC 214/2025', 'Arts. 269 e 270 §único LC 214/2025', 1, 'risco_art_269_270'),

 ('REQ-CC-APURACAO',
  (SELECT nome FROM risk_categories WHERE codigo='risco_controle_empreendimento'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_controle_empreendimento'),
  'construcao_civil', @base+3, 'alta', 'processo', 'operacional', 'cnae', @cc,
  '["Verificar se a apuração do IBS/CBS é segregada por empreendimento — CNPJ/CPF específico, cada obra como centro de custo distinto (Art. 270, caput)."]',
  '["Demonstrativo de apuração segregado por empreendimento/obra."]',
  'LC 214/2025', 'Art. 270 caput LC 214/2025', 1, 'risco_controle_empreendimento'),

 ('REQ-CC-CREDITO',
  (SELECT nome FROM risk_categories WHERE codigo='risco_credito_condicionado_obra'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_credito_condicionado_obra'),
  'construcao_civil', @base+4, 'alta', 'financeiro', 'operacional', 'cnae', @cc,
  '["Verificar se, em prestação a não contribuinte com fornecimento de materiais, o crédito de CBS/IBS relativo aos materiais está limitado ao valor do débito da prestação do serviço (Art. 255, §5º; Decreto Art. 365; Resolução Art. 365)."]',
  '["Memória de cálculo do crédito apropriado vs. débito da prestação, por obra."]',
  'LC 214/2025', 'Art. 255 §5º LC 214/2025 c/c Art. 365 Decreto 12.955/2026 (CBS) e Art. 365 Resolução CGIBS 6/2026 (IBS)', 1, 'risco_credito_condicionado_obra'),

 ('REQ-CC-CUSTOS',
  (SELECT nome FROM risk_categories WHERE codigo='risco_custos_historicos'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_custos_historicos'),
  'construcao_civil', @base+5, 'alta', 'processo', 'operacional', 'cnae', @cc,
  '["Verificar se o valor inicial do redutor de ajuste está apurado conforme o Art. 258: valor de aquisição atualizado (imóvel pronto em 31/12/2026) ou soma do terreno + custos de produção documentados (imóvel em construção em 31/12/2026)."]',
  '["Documentos fiscais idôneos comprobatórios do valor de aquisição do terreno e dos custos de produção incorridos até 31/12/2026 (exigência literal do Art. 258, II, ''b'')."]',
  'LC 214/2025', 'Art. 258 LC 214/2025', 1, 'risco_custos_historicos'),

 ('REQ-CC-REDUTOR',
  (SELECT nome FROM risk_categories WHERE codigo='risco_redutor_ajuste'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_redutor_ajuste'),
  'construcao_civil', @base+6, 'alta', 'financeiro', 'operacional', 'cnae', @cc,
  '["verificar se o contribuinte mantém, por imóvel, o valor do redutor de ajuste vinculado (valor inicial + acréscimos previstos), atualizado pelo IPCA, desde 01/01/2027"]',
  '["memória de cálculo do redutor de ajuste por imóvel, com histórico de correção monetária"]',
  'LC 214/2025', 'Art. 257 LC 214/2025 c/c Arts. 369-374 Decreto 12.955/2026 (CBS) e Resolução CGIBS 6/2026 (IBS)', 1, 'risco_redutor_ajuste'),

 ('REQ-CC-SINTER',
  (SELECT nome FROM risk_categories WHERE codigo='risco_sinter_avaliacao'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_sinter_avaliacao'),
  'construcao_civil', @base+7, 'alta', 'processo', 'operacional', 'cnae', @cc,
  '["verificar se o contribuinte confere o valor de referência Sinter contra o valor de mercado real da operação, e se aciona impugnação quando houver divergência relevante"]',
  '["consulta ao Sinter para o imóvel objeto da operação + registro de eventual impugnação protocolada"]',
  'LC 214/2025', 'Art. 256 LC 214/2025 c/c Arts. 366-368 Decreto 12.955/2026 (CBS) e Resolução CGIBS 6/2026 (IBS)', 1, 'risco_sinter_avaliacao'),

 ('REQ-CC-PERMUTA',
  (SELECT nome FROM risk_categories WHERE codigo='risco_permuta_imoveis'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_permuta_imoveis'),
  'construcao_civil', @base+8, 'alta', 'contrato', 'operacional', 'cnae', @cc,
  '["identificar operações de permuta de imóveis; verificar não incidência sobre o valor permutado (só a torna é tributada) e a manutenção do redutor de ajuste do imóvel dado em permuta"]',
  '["contrato de permuta + memória de cálculo do redutor de ajuste transferido/mantido"]',
  'LC 214/2025', 'Art. 252 §2º I e §5º LC 214/2025 c/c Art. 360 §7º Decreto 12.955/2026 (CBS) e Resolução CGIBS 6/2026 (IBS)', 1, 'risco_permuta_imoveis'),

 ('REQ-CC-PARCELAS',
  (SELECT nome FROM risk_categories WHERE codigo='risco_tributacao_parcelas'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_tributacao_parcelas'),
  'construcao_civil', @base+9, 'media', 'financeiro', 'operacional', 'cnae', @cc,
  '["verificar se a apuração do IBS/CBS ocorre a cada pagamento (não no fechamento do contrato), com dedução proporcional do redutor de ajuste (Art. 258) e redutor social (Art. 259, se aplicável) em cada parcela"]',
  '["cronograma de pagamentos da incorporação/parcelamento + memória de cálculo do tributo devido por parcela"]',
  'LC 214/2025', 'Art. 262 LC 214/2025 c/c Art. 380 Decreto 12.955/2026 (CBS) e Resolução CGIBS 6/2026 (IBS)', 1, 'risco_tributacao_parcelas'),

 ('REQ-CC-SCP',
  (SELECT nome FROM risk_categories WHERE codigo='risco_sujeicao_passiva_scp'),
  (SELECT descricao FROM risk_categories WHERE codigo='risco_sujeicao_passiva_scp'),
  'construcao_civil', @base+10, 'media', 'contrato', 'operacional', 'cnae', @cc,
  '["identificar se a empresa atua como sócia ostensiva em SCP com operações de bens imóveis, e se recolhe o IBS/CBS integral (sem excluir a parte dos sócios participantes)"]',
  '["contrato de SCP + registro contábil identificando o sócio ostensivo e o recolhimento consolidado"]',
  'LC 214/2025', 'Arts. 263-264 LC 214/2025 c/c Arts. 381 e 384 Decreto 12.955/2026 (CBS) e Resolução CGIBS 6/2026 (IBS)', 1, 'risco_sujeicao_passiva_scp');

-- ── 6. req_v3_to_canonical — NÃO SEMEADO (G-2, Hipótese A — vestigial) ───────
-- Investigação G-2 (grep repo inteiro, Despacho 19h16): a tabela foi criada na
-- CPIE-v2 (scripts/create-d7-mapping.mjs + docs 2026-03-24) para mapear req_v3 →
-- taxonomia canônica CAN-0001..CAN-0499 (namespace DIFERENTE do code do requisito).
-- Tem WRITER (o script) + suite de teste (routers-bateria-avancada.test.ts), mas
-- ZERO reader em RUNTIME (server/). É vestigial para o pipeline atual → não semear.
-- DEBT-REQV3TOCANONICAL-UNUSED (P3) aberta junto com o PR. A cadeia LAC-03 usa
-- requirement_question_mapping.canonical_id = code do requisito (G-1), que é o que
-- a cobertura (db-requirements.ts:201) e a geração (questionEngine) consomem.

-- ── 7. seed requirement_question_mapping ────────────────────────────────────
-- G-1: canonical_id = CODE do requisito (REQ-CC-*), casa o IN() da cobertura.
-- G-3: question_quality_status:
--   - 5 SOL-mapeadas (source NOT NULL): 'approved' → hasValidQuestion=TRUE (db-requirements.ts:224).
--   - 5 novas Q6-Q10 (source NULL): 'pending' → hasValidQuestion=FALSE (não erro) — DoD funcional
--     do P.O.; as 5 novas ainda não passaram o quality gate (GAP-QUESTION-CC-5CATS).
--   ('pending' cabe no varchar(16); 'pending_valid_question' (22) não caberia.)
INSERT INTO requirement_question_mapping
  (mapping_id, canonical_id, question_template, source_question_code, question_type,
   questionnaire_section, required, question_quality_status)
SELECT CONCAT('MAP-', m.code), m.code, m.question_template, m.source_question_code,
       'boolean', 'cnae', 1,
       CASE WHEN m.source_question_code IS NOT NULL THEN 'approved' ELSE 'pending' END
FROM (
  SELECT 'REQ-CC-CIB' AS code,
    (SELECT texto FROM solaris_questions WHERE codigo='SOL-054') AS question_template, 'SOL-054' AS source_question_code
  UNION ALL SELECT 'REQ-CC-269270', (SELECT texto FROM solaris_questions WHERE codigo='SOL-054'), 'SOL-054'
  UNION ALL SELECT 'REQ-CC-APURACAO', (SELECT texto FROM solaris_questions WHERE codigo='SOL-055'), 'SOL-055'
  UNION ALL SELECT 'REQ-CC-CREDITO', (SELECT texto FROM solaris_questions WHERE codigo='SOL-055'), 'SOL-055'
  UNION ALL SELECT 'REQ-CC-CUSTOS', (SELECT texto FROM solaris_questions WHERE codigo='SOL-055'), 'SOL-055'
  UNION ALL SELECT 'REQ-CC-REDUTOR', 'A empresa mantém, para cada imóvel sujeito ao regime regular, o cálculo e o controle individualizado do redutor de ajuste conforme o Art. 257 da LC 214/2025?', NULL
  UNION ALL SELECT 'REQ-CC-SINTER', 'A empresa consulta e confere o valor de referência do Sinter (Art. 256 LC 214/2025) para cada operação com bem imóvel antes de apurar a base de cálculo?', NULL
  UNION ALL SELECT 'REQ-CC-PERMUTA', 'A empresa realiza operações de permuta de imóveis e aplica corretamente a não incidência sobre o valor permutado (tributando apenas a torna), conforme Art. 252, §2º, I e §5º, da LC 214/2025?', NULL
  UNION ALL SELECT 'REQ-CC-PARCELAS', 'A empresa apura o IBS e a CBS a cada pagamento recebido em contratos de incorporação imobiliária ou parcelamento de solo, com dedução proporcional dos redutores aplicáveis, conforme Art. 262 da LC 214/2025?', NULL
  UNION ALL SELECT 'REQ-CC-SCP', 'A empresa atua como sócia ostensiva em Sociedade em Conta de Participação (SCP) com operações de bens imóveis e recolhe o IBS/CBS integral, sem exclusão de valores devidos aos sócios participantes, conforme Art. 264 da LC 214/2025?', NULL
) m;

-- ═══════════════════════════════════════════════════════════════════════════
-- DoD NEGATIVO (Lição #168 / REGRA-ORQ-44) — rodar pós-migration, deve retornar 0 linhas:
--   SELECT rqm.source_question_code
--   FROM requirement_question_mapping rqm
--   JOIN solaris_questions sq ON sq.codigo = rqm.source_question_code
--   WHERE rqm.source_question_code IS NOT NULL AND rqm.question_template <> sq.texto;
-- (se ≠ 0 → cópia divergiu da fonte SOL-054/055 → FALHA)
--
-- DoD POSITIVO (contagem — NÃO prova consumo sozinho):
--   SELECT COUNT(*) FROM regulatory_requirements_v3 WHERE code LIKE 'REQ-CC-%';            -- = 10
--   SELECT COUNT(*) FROM requirement_question_mapping WHERE canonical_id LIKE 'REQ-CC-%';  -- = 10
--
-- DoD G-1 (canonical_id casa o IN() da cobertura — db-requirements.ts:201) — 10 linhas:
--   SELECT rqm.canonical_id, rr.code FROM requirement_question_mapping rqm
--   JOIN regulatory_requirements_v3 rr ON rqm.canonical_id = rr.code WHERE rr.code LIKE 'REQ-CC-%';
--
-- DoD G-3 (status='approved' — db-requirements.ts:224) — todos 'approved':
--   SELECT canonical_id, question_quality_status FROM requirement_question_mapping WHERE canonical_id LIKE 'REQ-CC-%';
--
-- DoD FUNCIONAL (smoke real — insubstituível por contagem):
--   projeto CC teste (CNAE 4120-4/00) → getApplicableRequirements →
--     5 SOL-mapeadas (CIB/269270/APURACAO/CREDITO/CUSTOS): hasValidQuestion = TRUE
--     5 novas (REDUTOR/SINTER/PERMUTA/PARCELAS/SCP): hasValidQuestion = FALSE (não erro)
--
-- DOWN (reversão):
--   DELETE FROM requirement_question_mapping WHERE canonical_id LIKE 'REQ-CC-%';
--   DELETE FROM regulatory_requirements_v3 WHERE code LIKE 'REQ-CC-%';
--   ALTER TABLE requirement_question_mapping DROP COLUMN source_question_code;
--   UPDATE risk_categories SET escopo='nacional' WHERE codigo='risco_art_269_270';
--   UPDATE solaris_questions SET artigo_ref='Art. 234 LC 214/2025' WHERE codigo='SOL-056';
--   UPDATE solaris_questions SET artigo_ref=NULL, mapping_review_status='curated_internal' WHERE codigo='SOL-053';
-- ═══════════════════════════════════════════════════════════════════════════
