-- Migration 0127 — ADR-0038 (Gate Regime Tributário no Questionário SOLARIS Onda 1)
-- Adiciona coluna tax_regimes a solaris_questions (filtro por regime do projeto).
--
-- Despacho v92 (2026-06-18) — F1 do épico regime tributário (demanda Dr. José).
--
-- Semântica (ADR-0038 D1/D2/D4):
--   - array JSON de regimes elegíveis: ["simples_nacional","lucro_presumido","lucro_real"]
--   - null / [] = universal (aparece para todos os regimes) → backward-compat
--   - extensível (D2): adicionar MEI/outros regimes = popular dado, sem ALTER ENUM
--   - consistência com cnae_groups (também JSON, null = universal) (D4)
--
-- Curadoria via Admin (D3 — P.O./jurídico). Import CSV backward-compat: linha sem
-- a coluna → null = universal (F6).
--
-- ALTER aditivo. Nullable. Zero risco de quebra em registros existentes
-- (perguntas existentes terão NULL = universal até curadoria por regime).

ALTER TABLE `solaris_questions`
  ADD COLUMN `tax_regimes` JSON NULL
  COMMENT 'ADR-0038: regimes tributários elegíveis (JSON array). Ex.: ["simples_nacional","lucro_presumido","lucro_real"]. null/[] = universal (todos os regimes). Extensível sem ALTER ENUM.';
