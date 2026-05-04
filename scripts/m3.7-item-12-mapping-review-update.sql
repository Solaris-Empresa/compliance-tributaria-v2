-- M3.7 Item 12 — Bloquear perguntas SOLARIS LC 224 ATIVAS até curadoria jurídica
--
-- Origem: Issue #945 + análise profunda Manus (2026-05-04) + query empírica em produção (2026-05-04)
--
-- ⚠️ ATUALIZADO 2026-05-04 — verificações em produção corrigem entendimento inicial:
--
-- 1) SOL-008 e SOL-009 (documentados em E2E-3-ONDAS-QUESTIONARIOS-v1.md:148-152 como LC 224):
--    NÃO EXISTEM no banco real. Documentação está desatualizada.
--
-- 2) SOL-010, SOL-011, SOL-012 (documentados como LC 224):
--    Existem mas têm ativo=0 (já desativadas). getOnda1Questions filtra por ativo=1
--    (server/db.ts:1352), então NÃO aparecem hoje no questionário. Incluir no UPDATE
--    seria REDUNDANTE — ativo=0 já as bloqueia.
--
-- 3) Lote real LC 224 ativo: SOL-026..SOL-037 (12 perguntas, todas ativo=1, todas
--    aparecendo no questionário hoje). NÃO documentado em E2E-3-ONDAS — adicionado
--    ao banco entre 2026-04 (documentação) e 2026-05-04 (query).
--
-- Justificativa: as 12 perguntas LC 224 ativas referenciam a lei sem metadado
-- determinístico (lei_ref/artigo_ref ausentes; cnaeGroups com bug ["[]"] string literal).
-- Conforme REGRA-ORQ-29 + Lição #61: perguntas sem metadado determinístico não devem
-- ser exibidas até curadoria jurídica preencher os campos.
--
-- Gate em getOnda1Questions (server/db.ts:1345) filtra mappingReviewStatus
-- IN ('curated_internal','approved_legal') — pending_legal é bloqueado.
--
-- Reversibilidade: após equipe jurídica preencher lei_ref + artigo_ref via Issue #940,
-- executar UPDATE para 'approved_legal' — perguntas voltam automaticamente.
--
-- Execução: rodar manualmente no banco de produção (DML, não migration drizzle).

UPDATE solaris_questions
SET mapping_review_status = 'pending_legal'
WHERE codigo IN (
  -- Lote real LC 224 ativo (12 perguntas, ativo=1, aparecendo hoje no smoke):
  'SOL-026',  -- aliquota_zero | pricing | carga_tributaria
  'SOL-027',  -- credito | nao_cumulativo | margem
  'SOL-028',  -- cumulatividade | credito | compras
  'SOL-029',  -- fluxo_caixa | planejamento | faturamento
  'SOL-030',  -- competitividade | pricing | mercado
  'SOL-031',  -- erp | aliquotas | validacao
  'SOL-032',  -- ncm | classificacao_fiscal | cadastro_produtos
  'SOL-033',  -- interpretacao | parecer_juridico | lista_taxativa
  'SOL-034',  -- beneficio_fiscal | autuacao | auditoria
  'SOL-035',  -- lucro_presumido | judicializacao | contencioso
  'SOL-036',  -- ipi | estrutura_tributaria | industria
  'SOL-037'   -- repasse_custos | fornecedores | contratos
);
-- NOTA: SOL-008, SOL-009 não existem. SOL-010..012 estão ativo=0 (redundante incluir).

-- Verificação:
-- SELECT codigo, mapping_review_status FROM solaris_questions
-- WHERE codigo IN ('SOL-026','SOL-027','SOL-028','SOL-029','SOL-030',
--                  'SOL-031','SOL-032','SOL-033','SOL-034','SOL-035',
--                  'SOL-036','SOL-037');
-- Esperado: 12 rows com mapping_review_status='pending_legal'.

-- Reversão (após equipe jurídica preencher lei_ref + artigo_ref):
-- UPDATE solaris_questions
-- SET mapping_review_status = 'approved_legal'
-- WHERE codigo IN (
--   'SOL-026','SOL-027','SOL-028','SOL-029','SOL-030',
--   'SOL-031','SOL-032','SOL-033','SOL-034','SOL-035',
--   'SOL-036','SOL-037'
-- )
--   AND lei_ref IS NOT NULL
--   AND artigo_ref IS NOT NULL;

-- Investigações pendentes (issues separadas, NÃO escopo deste PR):
--   1) Bug de seed: cnae_groups = ["[]"] em SOL-026..037 (string literal vez de array vazio)
--      — corrigir script CSV ou seed; impacto: querySolarisByCnaes trata como universal
--   2) Atualizar documentação E2E-3-ONDAS-QUESTIONARIOS-v1.md:148-152 para refletir realidade:
--      - SOL-008..009 não existem
--      - SOL-010..012 estão desativadas
--      - SOL-026..037 são as perguntas LC 224 ativas (12 codes)
