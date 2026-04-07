# ADR Index — IA SOLARIS
## Todos os Architecture Decision Records ativos

Atualizar este índice ao criar ou modificar qualquer ADR.
Script: `./scripts/gate-adr.sh` verifica automaticamente a consistência.

---

## ADRs ativos

| ADR | Arquivo | Título | Status | Data | Sprint |
|---|---|---|---|---|---|
| ADR-0002 | `0002-arquitetura-3-ondas-perguntas.md` | Arquitetura 3 Ondas de Perguntas | — | — | M (legado) |
| ADR-0009 | `ADR-0009-fluxo-canonico-fontes-diagnostico.md` | Fluxo Canônico e Fontes do Diagnóstico | Aprovado | 2026-04-06 | M |
| ADR-0010 | `ADR-0010-substituicao-qc-qo-por-ncm-nbs.md` | Substituição QC/QO por Q.Produtos/Q.Serviços (NCM/NBS) | Aceito | 2026-04-07 | Z-02 |

---

## Contratos ativos

| Contrato | Arquivo | Escopo | Data | Sprint |
|---|---|---|---|---|
| CONTRATO-DEC-M3-05-v3 | `docs/contratos/CONTRATO-DEC-M3-05-v3.md` | ProductAnswer · ServiceAnswer · procedures Q.Produtos/Q.Serviços | 2026-04-07 | Z-02 |
| CONTRATO-DEC-M3-05-v3-interface | `docs/contratos/CONTRATO-DEC-M3-05-v3-interface.md` | Contrato completo com partes 1-7: tipos, procedures, FSM, Stepper, Banner, violações | 2026-04-07 | Z-02 |

---

## Divergências abertas

| DIV | Arquivo | Descrição | Status |
|---|---|---|---|
| DIV-Z01-006 | `docs/divergencias/DIV-Z01-006-backend-sem-frontend.md` | Backend sem frontend (BUG-MANUAL-02) | Aberta — fix em Z-02 |
| DIV-Z02-001 | `docs/divergencias/DIV-Z02-001-*.md` | Assinatura errada generateProductQuestions | Pendente criação |
| DIV-Z02-002 | `docs/divergencias/DIV-Z02-002-*.md` | confirmedCnaes vs cnaes | Pendente criação |
| DIV-Z02-003 | `docs/divergencias/DIV-Z02-003-*.md` | Enum inglês vs português no FSM | Pendente criação |

---

## Como usar

Antes de qualquer PR que modifique arquivo arquitetural:

1. `./scripts/gate-adr.sh` — verifica se ADR existe
2. Criar ADR em `docs/adr/ADR-XXXX-descricao.md` se necessário
3. Atualizar este índice
4. Referenciar no body do PR: `## Gate ADR · ADR-XXXX`

---

## Arquivos arquiteturais protegidos (Gate ADR)

| Arquivo | ADR de referência |
|---|---|
| `server/flowStateMachine.ts` | ADR-0010 |
| `drizzle/schema.ts` | ADR-0009, ADR-0010 |
| `server/routers-fluxo-v3.ts` | ADR-0009, ADR-0010 |
| `client/src/App.tsx` | ADR-0009 |
| `client/src/pages/DiagnosticoStepper.tsx` | ADR-0009, ADR-0010 |
| `server/lib/completeness.ts` | ADR-0009 |
| `server/lib/tracked-question.ts` | ADR-0010 |
| `server/lib/risk-categorizer.ts` | ADR-0009 |

---

*Atualizado: 2026-04-07 · PR #379 · feat/z02-to-be-flow-refactor*
