<!--
  Template PR — Classe A Cirúrgica (REGRA-ORQ-24 + FIX-GOV-5).
  USAR SOMENTE quando: ≤50 LOC · 1 arquivo · sem schema novo · sem ADR · 1 função/seed isolado.
  Caso contrário, usar o template completo (.github/PULL_REQUEST_TEMPLATE.md).
  As seções abaixo cobrem o mínimo dos gates de CI (risco + JSON evidência herdam do completo se exigido).
-->

## Objetivo
<!-- 1 linha -->

## Issue
Closes #N

## Gate 0 (REGRA-ORQ-45 + SCHEMA-REFERENCE.md)
- [ ] `SELECT`/`DESCRIBE` executado — estado real confirmado
- [ ] Coluna/regime/enum verificado contra `docs/governance/SCHEMA-REFERENCE.md`

## DoD
- [ ] SQL de verificação: `<query>` → `<resultado esperado>`
- [ ] `tsc --noEmit` → 0 erros

## Classificação de risco
- [x] Baixo — sem impacto em dados ou fluxo principal
<!-- OU: - [x] Médio — impacto controlado e reversível -->

## Reversão
<!-- como reverter em 1 linha -->

## Classificação da task
- [x] Nível 1 — Seguro
<!-- OU Nível 2 — Controlado -->
