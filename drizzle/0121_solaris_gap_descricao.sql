-- Migration 0121 — SOLARIS-FIX-05
-- Adiciona coluna gap_descricao a solaris_questions (curadoria jurídica do gap).
--
-- Despacho FASE A FIX-05 (2026-06-01) — preparação para refator do G17 que
-- elimina SOLARIS_GAPS_MAP (curadoria recorrente → curadoria por pergunta).
--
-- Semântica: quando preenchido, G17 usa este texto como gap_descricao do gap
-- gerado por resposta negativa. Quando NULL, G17 usa fallback "Ausência: {titulo}".
--
-- Backfill (separado, sprint posterior): migrar os 73 textos curados de
-- server/config/solaris-gaps-map.ts para esta coluna via script Manus.
--
-- ALTER aditivo. Nullable. Zero risco de quebra em registros existentes
-- (525 rows em solaris_questions terão NULL até backfill).

ALTER TABLE `solaris_questions`
  ADD COLUMN `gap_descricao` TEXT NULL
  COMMENT 'Descrição curada do gap quando resposta é negativa. Ex.: "Ausência de controle de débitos constituídos por confissão — risco de execução fiscal automática (Art. 45 LC 214/2025)". Se NULL, G17 usa fallback: "Ausência: {titulo}"';
