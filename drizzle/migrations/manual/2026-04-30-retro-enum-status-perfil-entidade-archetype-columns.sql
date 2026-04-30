-- =============================================================================
-- Migration RETROATIVA documentando estado já existente em produção TiDB
-- =============================================================================
-- Patch ID:  HOTFIX-P0-RETRO-ENUM-STATUS-PERFIL-ENTIDADE-2026-04-30
-- Autor:     Manus (implementador técnico)
-- Aprovação: P.O. Uires Tapajós (retroativo)
-- Data:      2026-04-30
--
-- Contexto:
--   PR-A (#865) adicionou 6 colunas archetype + enum perfil_entidade_confirmado
--   ao schema TS (drizzle/schema.ts). Porém `pnpm db:push` falha por conflito
--   com tabela cpie_analysis_history, então a migration nunca foi aplicada
--   automaticamente em produção.
--
--   As colunas archetype foram aplicadas manualmente via ALTER TABLE no hotfix
--   #869 (2026-04-29). O enum perfil_entidade_confirmado foi aplicado
--   manualmente durante smoke R3-A SOJA (2026-04-30 ~10:05Z).
--
-- IMPORTANTE:
--   - Em PRODUÇÃO: estas mudanças JÁ existem. NÃO executar novamente.
--   - Em ambientes NOVOS (dev/sandbox/CI): executar para reproduzir schema.
--   - Usar IF NOT EXISTS / IF NOT EXIST guards quando possível.
-- =============================================================================

-- 1. Colunas archetype (aplicadas via hotfix #869 em 2026-04-29)
ALTER TABLE `projects`
  ADD COLUMN IF NOT EXISTS `archetype` JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `archetypeVersion` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `archetypePerfilHash` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `archetypeRulesHash` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `archetypeConfirmedAt` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `archetypeConfirmedBy` INT DEFAULT NULL;

-- 2. Enum status com perfil_entidade_confirmado (aplicado manualmente 2026-04-30)
--    NOTA: MODIFY COLUMN não suporta IF NOT EXISTS — é idempotente por natureza
--    (re-executar com mesma definição não causa efeito colateral).
ALTER TABLE `projects`
  MODIFY COLUMN `status` ENUM(
    'rascunho',
    'consistencia_pendente',
    'cnaes_confirmados',
    'perfil_entidade_confirmado',
    'assessment_fase1',
    'assessment_fase2',
    'onda1_solaris',
    'onda2_iagen',
    'diagnostico_corporativo',
    'diagnostico_operacional',
    'q_produto',
    'q_servico',
    'diagnostico_cnae',
    'briefing',
    'riscos',
    'plano',
    'dashboard',
    'matriz_riscos',
    'plano_acao',
    'em_avaliacao',
    'aprovado',
    'em_andamento',
    'concluido',
    'arquivado'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rascunho';

-- =============================================================================
-- Evidência de integridade pós-aplicação:
--   Schema SHA256: 538148b97f5c0be84c5a57a9f1a0087f5ce4bdcd94c08d7bcff7b60df5bd26fd
--   ragDocuments: 2515 (intactos)
--   projects: 275 (pós-cleanup projetos de teste 2280001, 2280002)
-- =============================================================================
