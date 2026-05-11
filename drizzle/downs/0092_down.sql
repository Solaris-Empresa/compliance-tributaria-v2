-- Reversão da migration 0092 — Issue #1047
-- Remove coluna gap_detected de risks_v4.
--
-- Reversão é segura: campo é novo (criado em 2026-05-11), sem FK, sem
-- queries em produção dependentes. Index dropado junto.

DROP INDEX `risks_v4_gap_detected_idx` ON `risks_v4`;
ALTER TABLE `risks_v4` DROP COLUMN `gap_detected`;
