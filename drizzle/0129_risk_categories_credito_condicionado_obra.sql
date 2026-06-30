-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0129 — ACHADO-1: categoria risco_credito_condicionado_obra
--
-- Issue: #1647 · Gate jurídico Dr. José APROVADO (29/06/2026 22h55) · GO P.O.
-- O "maior risco" do Dr. José: perda/estorno de crédito de IBS/CBS sobre aquisições
-- da obra (Art. 255 §5º LC 214/2025; Art. 365 Decreto 12.955/2026). Distinta das
-- obrigações de cadastro/apuração (CIB 265-266, empreendimento 269-270) — modela a
-- CONSEQUÊNCIA PATRIMONIAL (estorno), não a obrigação acessória.
--
-- Gate 0 (mesmo schema da migration 0128):
--   - tipo='risk' · origem='lei_federal' · lei_codigo='LC-214-2025' · escopo='setorial'
--   - normative_status='confirmed' (consumido por deterministic-grounding.ts:115)
--   - vigencia_inicio='2027-01-01' · SEM coluna cnaeGroups/artigos_decreto (Decreto 365 na descricao)
--   - gate CNAE (41/42/43/68) é no engine: isConstrucaoCivilImoveis (Fase 3a)
--   - Gate 0a: nenhuma categoria existente com artigo_base 'Art. 255 §5º' (Manus confirma)
--
-- LIÇÃO #88: a migration cria a linha; o risco só DISPARA com a regra makeInferredRisk
--   (normative-inference.ts) + codigo no Categoria union (risk-engine-v4.ts) — incluídos neste PR.
--
-- Idempotente: codigo UNIQUE (migration 0065:9).
-- ═══════════════════════════════════════════════════════════════════════════

-- UP
INSERT INTO risk_categories
  (codigo, nome, tipo, severidade, urgencia, artigo_base, lei_codigo,
   vigencia_inicio, origem, escopo, normative_status, status, descricao)
VALUES
 ('risco_credito_condicionado_obra',
  'Risco — Perda/estorno de crédito sobre aquisições da obra',
  'risk', 'alta', 'imediata',
  'Art. 255 §5º LC 214/2025', 'LC-214-2025', '2027-01-01',
  'lei_federal', 'setorial', 'confirmed', 'ativo',
  'Risco de perda e estorno de crédito de IBS/CBS sobre aquisições da obra. O prestador de serviço de construção civil a não contribuinte, com fornecimento de materiais, só apropria o crédito até o valor do débito do serviço, e o crédito que não atender à contabilidade por obra ou ao CIB deve ser estornado (Art. 255 §5º LC 214/2025; Art. 365 Decreto 12.955/2026). Exceção: administração pública (Art. 255 §6º). Severidade: alta. Urgência: imediata (vigência 2027).')
ON DUPLICATE KEY UPDATE
  artigo_base=VALUES(artigo_base), severidade=VALUES(severidade),
  urgencia=VALUES(urgencia), normative_status=VALUES(normative_status),
  descricao=VALUES(descricao);

-- DOWN
-- DELETE FROM risk_categories WHERE codigo='risco_credito_condicionado_obra';

-- DoD (Manus, produção): após aplicar + regenerar o projeto 10860001 (CNAE 4120):
--   SELECT categoria, severidade FROM risks_v4
--    WHERE project_id=10860001 AND categoria='risco_credito_condicionado_obra';  -- esperado: 1 linha
--   + plano de ação específico gerado (severidade alta → buildActionPlans gera plano).
