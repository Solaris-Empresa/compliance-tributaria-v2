# Avaliação de Risco — Templates (REGRA-ORQ-20)

Esta pasta contém templates de avaliação de risco obrigatórios para alterações que disparam gatilhos da REGRA-ORQ-20.

## Quando usar cada template

| Template | Use quando a mudança envolve |
|---|---|
| [template-schema-change.md](./template-schema-change.md) | `ALTER TABLE`, `DROP COLUMN`, nova migration, novo JSON column |
| [template-crossfile-refactor.md](./template-crossfile-refactor.md) | ≥3 arquivos em módulos diferentes, rename/extract de helper compartilhado |
| [template-remove-guardrail.md](./template-remove-guardrail.md) | Remoção de `@ts-nocheck`, feature flag, gate, lint rule |
| [template-engine-change.md](./template-engine-change.md) | Alteração em `risk-engine-v4`, `compliance-score-v4`, funções puras do briefing |

## Como usar

1. Ao abrir issue F1/F2 com mudança que dispara gatilho, escolher o template adequado.
2. Copiar o bloco "Avaliação de Risco" para o corpo da issue.
3. Preencher todos os campos com valores REAIS do caso específico.
4. Orquestrador revisa antes de aplicar label `spec-aprovada`.
5. Manus implementa apenas com bloco preenchido.

## Hotfix P0 (exceção)

Em hotfix P0 (bug crítico em produção), PR pode ser aberto sem issue prévia, mas o body DEVE conter um bloco de avaliação reduzido:

- Título com tier: `[HOTFIX-P0-TIER-N] <descrição>`
- Seção mínima: amplitude · riscos · plano de rollback
- Post-mortem obrigatório após deploy

## Referências

- `.claude/rules/governance.md` — REGRA-ORQ-20 completa
- Issue #793 — exemplo canônico de análise estrutural (@ts-nocheck migration)
- Issue #796 — exemplo de análise matemática (ponto fixo em engine determinística)
