-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN Migration 0091 — Remove 'regulatorio' do ENUM risks_v4.source_priority
--
-- ATENÇÃO: este down SÓ funciona se NÃO houver rows com source_priority='regulatorio'
--          em risks_v4. Caso contrário, MySQL retorna ERROR 1265: Data truncated.
--
-- Pré-requisito antes de rodar este down:
--   UPDATE risks_v4 SET source_priority='iagen' WHERE source_priority='regulatorio';
--   (ou DELETE dos riscos afetados se preferível)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE `risks_v4`
  MODIFY COLUMN `source_priority` ENUM(
    'cnae',
    'ncm',
    'nbs',
    'solaris',
    'iagen'
  ) NOT NULL;
