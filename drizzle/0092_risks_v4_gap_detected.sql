-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0092 — Issue #1047: adiciona coluna `gap_detected` em risks_v4
--
-- Decisão P.O. (2026-05-09):
--   "Exibir AMBOS os badges:
--      🛡️ 'Risco inerente ao perfil' → arquétipo, compliance declarada
--      ⚠️ 'Gap detectado'           → resposta 'Não'/'Parcial' nos questionários
--   Campo novo: risks_v4.gap_detected (boolean)
--   Score: NÃO muda — permanece fórmula atual"
--
-- Semântica do campo:
--   gap_detected = TRUE
--     Pelo menos 1 gap do risco tem fonte de questionário do usuário
--     (solaris, iagen, cnae, ncm, nbs). Sinaliza não-conformidade declarada.
--     Badge: ⚠️ Gap detectado (vermelho).
--
--   gap_detected = FALSE
--     TODOS os gaps são de fonte 'regulatorio' (inferido por arquétipo).
--     Cliente declarou compliance — risco é monitoramento contínuo.
--     Badge: 🛡️ Risco inerente ao perfil (azul).
--
-- Default FALSE:
--   Riscos legados (criados antes desta migration) recebem 'false'
--   automaticamente — comportamento conservador. A próxima geração de
--   riscos (pós-deploy) preenche corretamente via risk-engine-v4.
--
-- Reversibilidade:
--   Ver drizzle/downs/0092_down.sql (DROP COLUMN gap_detected).
--   Reversão é segura — campo é novo, sem dependências de FK ou query.
--
-- DOWN: drizzle/downs/0092_down.sql
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE `risks_v4`
  ADD COLUMN `gap_detected` BOOLEAN NOT NULL DEFAULT FALSE
  AFTER `confidence`;

CREATE INDEX `risks_v4_gap_detected_idx` ON `risks_v4` (`gap_detected`);
