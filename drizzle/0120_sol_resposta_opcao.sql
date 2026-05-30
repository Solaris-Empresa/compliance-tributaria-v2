-- Migration 0120 — FEAT-SOL-UX-01 PR-A
-- Adiciona coluna resposta_opcao a solaris_answers (dual-column).
--
-- Estratégia: NÃO altera a coluna `resposta` (text NOT NULL) existente.
-- Adiciona coluna estruturada nova `resposta_opcao` ENUM nullable AO LADO.
--
-- Despacho: PR-0 SQL diagnóstico do Manus confirmou:
--   - 525 rows existentes em solaris_answers
--   - 95% das respostas são variantes "Sim."/"Não."/"N/A." (texto livre)
--   - 3 respostas têm texto descritivo real
--   - Coluna resposta atual é text NOT NULL
--
-- Zero risco de ER_DATA_TRUNCATED — coluna nova, NULL permitido, histórico intacto.
-- Backfill (Sim./Não./N/A. → enum) fica para sprint futura, não bloqueia PR-A.

ALTER TABLE `solaris_answers`
  ADD COLUMN `resposta_opcao`
    ENUM('sim', 'nao', 'nao_sei', 'nao_se_aplica') NULL
    AFTER `resposta`;
