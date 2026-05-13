-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0092 — Adiciona 'inferred' ao ENUM risks_v4.source_priority
-- Origem: Fix #1072-v2 — causa raiz do bug de riscos desaparecendo
--
-- Motivação:
--   normative-inference.ts (linha 156) gera riscos com source_priority='inferred'
--   para categorias inferidas (aliquota_zero quando NCMs vazios). Sem este valor
--   no ENUM, MySQL rejeita o INSERT com ERROR 1265 (Data truncated), que dispara
--   o catch block do generateRisksAllSources, que faz rollback destrutivo
--   (deleteRisksByProject) — resultando em 0 riscos visíveis.
--
--   Bug afeta apenas projetos com NCMs vazios (normative-inference ativado).
--   Projetos com NCMs preenchidos (ex: 5730001) não disparam 'inferred' e
--   funcionam normalmente.
--
--   ALTER TABLE já aplicado manualmente em produção em 2026-05-13 via
--   webdev_execute_sql para desbloquear o P.O.
--
-- Reversibilidade:
--   ALTER TABLE risks_v4 MODIFY COLUMN source_priority ENUM('cnae','ncm','nbs','solaris','iagen','regulatorio') NOT NULL;
--   ATENÇÃO: só funciona se NÃO houver rows com source_priority='inferred'.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE `risks_v4`
  MODIFY COLUMN `source_priority` ENUM(
    'cnae',
    'ncm',
    'nbs',
    'solaris',
    'iagen',
    'regulatorio',
    'inferred'
  ) NOT NULL;
