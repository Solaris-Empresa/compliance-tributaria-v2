-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0091 — Adiciona 'regulatorio' ao ENUM risks_v4.source_priority
-- Origem: Sprint M3.8.1 (PR #973) — fix Bug B + Bug C
--
-- Motivação:
--   Sprint M3.8-1B (PR #968) mudou inferFonte (gap-to-rule-mapper.ts:258,262)
--   para retornar 'regulatorio' quando layer não é onda1/onda2. Com o fix
--   M3.8.1 Bug B (default getBestSourcePriority = 'regulatorio') + Bug C
--   (type Fonte += 'regulatorio'), agora 100% dos riscos derivados de gaps
--   regulatórios v1 tentam persistir source_priority='regulatorio'.
--
--   Sem esta migration, INSERT em risks_v4 falha com:
--     ERROR 1265: Data truncated for column 'source_priority' at row 1
--
--   O Manus aplicou ALTER TABLE manualmente em produção em 2026-05-05 para
--   desbloquear smoke E2E. Esta migration formaliza o estado em produção e
--   garante consistência em ambientes recriados (CI, dev, staging).
--
-- Reversibilidade:
--   Ver drizzle/downs/0091_down.sql.
--   ATENÇÃO: down só funciona se NÃO houver rows com source_priority='regulatorio'.
--
-- DOWN: drizzle/downs/0091_down.sql
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE `risks_v4`
  MODIFY COLUMN `source_priority` ENUM(
    'cnae',
    'ncm',
    'nbs',
    'solaris',
    'iagen',
    'regulatorio'
  ) NOT NULL;
