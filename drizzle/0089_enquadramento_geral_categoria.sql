-- Migration 0089 — Hotfix IS v2.1 (correcao de regressao pos-PR #840)
-- ADR-0030 v1.1 (amendment 2026-04-22 — 2 adição Opção A)
--
-- Motivação:
--   Hotfix IS v2 (PR #840, commit 8cf303d) aplicou gate de elegibilidade em
--   consolidateRisks do risk-engine-v4, com downgrade_to='enquadramento_geral'
--   para imposto_seletivo bloqueado em operationType=servicos/financeiro/agronegocio.
--
--   Porém 'enquadramento_geral' NAO esta registrada em 3 pontos:
--     1. risks_v4.categoria ENUM (10 valores)
--     2. risk_categories tabela (FK alvo de fk_risks_v4_categoria)
--     3. Enums TS: Categoria (risk-engine-v4.ts) + CategoriaV4 (db-queries-risks-v4.ts)
--        + CategoriaV4Schema Zod (routers/risks-v4.ts)
--
--   INSERT em risks_v4 falha com FK constraint error — matriz de riscos
--   fica vazia em producao para empresas servicos.
--
-- Esta migration corrige os 2 pontos de DB. As 3 correcoes de TS vao em
-- commits separados do mesmo PR.
--
-- Reversibilidade:
--   Ver drizzle/downs/0089_down.sql (DELETE do row + ALTER ENUM de volta para 10)
--   ou manualmente reverter via revert do PR.

-- ---------------------------------------------------------------------------
-- 1. ALTER ENUM da coluna risks_v4.categoria — adicionar 'enquadramento_geral'
-- ---------------------------------------------------------------------------

ALTER TABLE `risks_v4`
  MODIFY COLUMN `categoria` ENUM(
    'imposto_seletivo',
    'confissao_automatica',
    'split_payment',
    'inscricao_cadastral',
    'regime_diferenciado',
    'transicao_iss_ibs',
    'obrigacao_acessoria',
    'aliquota_zero',
    'aliquota_reduzida',
    'credito_presumido',
    'enquadramento_geral'
  ) NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Seed do row 'enquadramento_geral' em risk_categories
-- ---------------------------------------------------------------------------
--
-- Caracterização:
--   - severidade='media': fallback não é alta (não é risco legal específico),
--     mas também não é oportunidade. Categoria indica "sem enquadramento
--     canônico identificado" — revisão recomendada.
--   - urgencia='curto_prazo': alinhada com media severidade.
--   - tipo='risk': downgrade de imposto_seletivo (tipo=risk) permanece risk.
--   - artigo_base='N/A (categoria fallback)': não tem artigo específico da lei.
--   - lei_codigo='LC-214-2025': referência ao escopo geral da reforma.
--   - origem='manual': categoria interna do sistema, não deriva de norma legal
--     direta (diferencia das 10 categorias 'lei_federal').
-- ---------------------------------------------------------------------------

INSERT INTO `risk_categories`
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo)
VALUES
  ('enquadramento_geral',
   'Enquadramento Geral',
   'media', 'curto_prazo', 'risk',
   'N/A (categoria fallback)', 'LC-214-2025',
   '2026-01-01', NULL, 'ativo', 'manual', 'nacional');
