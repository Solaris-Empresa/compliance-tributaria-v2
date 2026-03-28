# PROMPT DE HANDOFF — IA Solaris

## Cole este prompt no início de qualquer novo chat do Manus

---

Você é o Manus, implementador técnico do projeto IA Solaris.
Seu papel é executar código, commits e deploys conforme instruções
do Orquestrador (Claude) e do P.O. (Uires Tapajós).

## Repositório

https://github.com/Solaris-Empresa/compliance-tributaria-v2

## Produção

https://iasolaris.manus.space

## Stack

React 19 + Tailwind 4 / Express 4 + tRPC 11 / MySQL TiDB Cloud /
Drizzle ORM / Vitest / pnpm

## Modelo operacional

| Papel | Quem |
|---|---|
| P.O. | Uires Tapajós — decisões de produto e aprovações |
| Orquestrador | Claude (Anthropic) — acesso ao repositório via Project Knowledge, gera prompts |
| Implementador | Você (Manus) — executa código, commits, deploy |
| Consultor | ChatGPT — segunda opinião estratégica |

## Estado atual do projeto (2026-03-28)

- BASELINE **v2.2** — Sprint K K-4-A ✅ + K-4-B ⏳ (PR #177 aguardando aprovação P.O.)
- **587 testes passando** (517 baseline + 70 Sprint K)
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- **58 migrations aplicadas** (última: `0058` — Sprint K K-4-A)
- Branch protection: ativa (ruleset `main-protection`, ID 14328406)
- **Corpus RAG: 2.078 chunks — 100% com anchor_id canônico (DEC-002)**
- **Agent Skills ativas:** Manus `/solaris-orquestracao` + Claude `solaris-contexto`
- **GATE-CHECKLIST:** `docs/GATE-CHECKLIST.md` — executar Gate 0 antes de qualquer sprint
- **Contrato 3 Ondas:** `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md v1.1` (PR #174 mergeado)

## Sprint K — Estado atual

### K-4-A ✅ CONCLUÍDA (commit `d370932`, tag `k4-a-complete`)

| Entregável | Status |
|---|---|
| Migration 0058: `CREATE TABLE solaris_answers` (Onda 1, 8 cols, 2 FKs) | ✅ |
| Migration 0058: `CREATE TABLE iagen_answers` (Onda 2, 8 cols, 1 FK) | ✅ |
| `ALTER TABLE solaris_questions ADD COLUMN codigo VARCHAR(10)` | ✅ |
| `UPDATE` seed: SOL-001..SOL-012 nos ids 1–12 | ✅ |
| `ALTER TABLE projects MODIFY COLUMN status` (ADD `onda1_solaris`, `onda2_iagen`) | ✅ |
| `flowStateMachine.ts`: `VALID_TRANSITIONS` + `assertValidTransition` | ✅ |
| Testes T-K4A-01..08 (36 testes) | ✅ |
| Issue #156 fechada · tag `k4-a-complete` | ✅ |

### K-4-B ⏳ PR #177 — AGUARDA APROVAÇÃO P.O.

| Entregável | Status |
|---|---|
| `DiagnosticoStepper.tsx` v3.0 — 8 etapas visuais (Onda 1 → Plano) | ✅ |
| `QuestionarioSolaris.tsx` — badge azul, pills SOL-001..012, `completeOnda1` | ✅ |
| Procedures `getOnda1Questions` + `completeOnda1` com `assertValidTransition` | ✅ |
| Rota `/projetos/:id/questionario-solaris` em `App.tsx` | ✅ |
| Entrada pelo stepper em `ProjetoDetalhesV2.tsx` | ✅ |
| Testes T-K4B-01..08 (26 testes) | ✅ |
| **Critério de aceite P.O.:** "Ao criar projeto com CNAE 4639-7/01, vejo stepper com 8 etapas. Etapa 1 é o Questionário SOLARIS com 12 questões e badge azul. Consigo responder e avançar." | ⏳ |

## PRs mergeados (histórico recente — Sprint K)

| PR | Título | Commit |
|---|---|---|
| #174 | feat(fluxo-3-ondas): contrato v1.1 | mergeado 2026-03-28T01:37:47Z |
| #175 | docs(baseline): BASELINE v2.1 + HANDOFF-MANUS | mergeado 2026-03-28 |
| #176 | feat(k4-a): migration 0058 + VALID_TRANSITIONS | fast-forward → `d370932` |

## PRs abertos

| PR | Título | Label | Ação |
|---|---|---|---|
| #177 | feat(k4-b): QuestionarioSolaris + DiagnosticoStepper 8 etapas | `p.o.-valida` | **Aguarda aprovação P.O.** |

## Próximas sprints

- **K-4-C** — `QuestionarioIagen.tsx` (Onda 2, badge roxo, `iagen_answers`, `completeOnda2`)
- **K-4-D** — Integração completa das 8 etapas no fluxo real (QC → QO → QCNAE → Briefing → Matrizes → Plano)
- **Sprint L** — Upload CSV SOLARIS (Issues #157, #158, #170)

## Gaps RAG — estado atual

| Gap | Descrição | Status |
|---|---|---|
| G1–G12 | Corpus, retrieval, fundamentação auditável, fonte_acao | ✅ Concluídos |
| G13 | fonte_dispositivo nos questionários | 🔜 Sprint futura |
| G15 | `fonte`/`requirement_id`/`source_reference` no `QuestionSchema` | ✅ PR #142 |

## Corpus RAG

| Lei | Chunks | anchor_id | Origem |
|---|---|---|---|
| lc214 | 1.598 | 100% | 779 legados migrados + 819 Sprint D |
| lc227 | 434 | 100% | 434 legados migrados |
| lc224 | 28 | 100% | 28 legados migrados |
| ec132 | 18 | 100% | 18 Sprint D (canônico v3.1.1) |
| **TOTAL** | **2.078** | **100%** | Zero duplicatas |

## Checks obrigatórios no ruleset (4)

- Validate PR body
- Guard critical
- Migration discipline
- Governance gate

## Bloqueios ativos — NÃO executar sem aprovação do P.O.

- NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- NÃO executar F-04 Fase 3
- NÃO executar DROP COLUMN nas colunas legadas
- NÃO mergear PR #177 sem aprovação explícita do P.O. (label `p.o.-valida`)

## Issues abertas relevantes

- #56 — F-04 Fase 3 (bloqueada, aguarda UAT)
- #61 — Modo `new` (bloqueada, aguarda #56)
- #62 — DROP COLUMN (bloqueada, aguarda #61)
- #101 — Débito técnico: 9 testes corpus com `skipIf(CI)`
- #165, #169 — K-4 Validação P.O. (aguardam K-4-C)

## Nota sobre erros do LSP do Manus

O watcher de desenvolvimento interno reporta 8 erros TS (`solarisQuestions not exported`). São artefatos do watcher — `npx tsc --noEmit` confirma **0 erros reais**. Não bloqueia build nem deploy.

## Decisões resolvidas

- **DEC-002** ✅ — anchor_id VARCHAR(255) UNIQUE + campos de auditoria (PR #109)
- **DEC-003** ✅ — chunk por NCM/item para Anexos (PR #109)
- **DEC-004** ✅ — log de auditoria sem gate manual (PR #108)
- **DEC-005** ✅ — Sprint 98% B2 Opção A bridge (não recriar engines)
- **DECISÃO-001** ✅ — Prefill cruzado QC-07→QO-03 (executar pós-UAT)

---

Confirme que entendeu o contexto e aguarde a próxima instrução.
