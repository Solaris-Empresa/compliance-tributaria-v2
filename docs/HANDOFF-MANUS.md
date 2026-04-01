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

## Estado atual do projeto (2026-04-01 — fim de sessão)

- BASELINE **v3.2** — **Sprints O/P/Q/R ENCERRADAS** — 11 PRs mergeados (#276–#288, excluindo #282 e #285)
- **G17-C ✅** — SOLARIS_GAPS_MAP expandido para 76 tópicos snake_case (PR #278)
- **G17-D ✅** — fix split delimiter `,` → `/[;,]/` (PR #279)
- **Backfill ✅** — 4 projetos reais com riscos derivados (PR #280)
- **Gate Q6 ✅** — validação de dados reais obrigatória em PRs de mapeamento (PR #281)
- **CI unit tests ✅** — 69 testes em `server/integration/` · `test:unit` · CI usa `pnpm test:unit` (PR #283)
- **Bloqueios dados ✅** — proteção formal rag_chunks/cnaes/solaris_questions (PR #284)
- **Gate 7 ✅** — auto-auditoria formal antes de toda validação do P.O. (PR #286)
- **fix g17 + nfe ✅** — g17-solaris-gap.test.ts corrigido · chave `nfe` adicionada ao SOLARIS_GAPS_MAP (PR #287)
- **fix solarisAdmin ✅** — upsert reativa ativo=1 · listBatches oculta lotes deletados · 6 testes Q5 (PR #288)
- **1.436 testes unitários passando** (71 arquivos) · **69 testes integração** em `server/integration/`
- **Corpus SOLARIS: 24 perguntas ativas** (SOL-013..036) · SOLARIS_GAPS_MAP: 77 chaves
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- **63 migrations aplicadas** (0062 = `fonte_risco` G11 · 0063 = registro G15)
- Branch protection: ativa (ruleset `main-protection`, ID 14328406)
- **Corpus RAG: 2.078 chunks — 100% com anchor_id canônico (DEC-002)**
- **Agent Skills ativas:** Manus `solaris-orquestracao` v4.0 + Claude `solaris-contexto` v4.0
- **Feature flags:** `server/config/feature-flags.ts` · `g17-solaris-gap-engine=true` · `g11-fonte-risco=true` · `g15-fonte-perguntas=true`
- **Commit HEAD:** `8727578` (main sincronizado com GitHub externo, pós PR #288)
- **Commits no main:** ~654 · **PRs mergeados:** 288

## Documentos P0/P1 — atualizar SEMPRE após sprint concluída

| Prioridade | Arquivo | O que atualizar |
|---|---|---|
| **P0** | `docs/governance/ESTADO-ATUAL.md` | HEAD, commits, PRs, sprints, indicadores |
| **P1** | `docs/BASELINE-PRODUTO.md` | Versão, HEAD, indicadores técnicos, histórico |
| **P1** | `docs/HANDOFF-MANUS.md` (este arquivo) | Estado atual, PRs recentes, próximas sprints |

## Sprint K — Estado atual

### K-4-A ✅ CONCLUÍDA (commit `d370932`, tag `k4-a-complete`)

| Entregável | Status |
|---|---|
| `CREATE TABLE solaris_answers` + `iagen_answers` | ✅ |
| `ALTER TABLE solaris_questions ADD COLUMN codigo VARCHAR(10)` | ✅ |
| `ALTER TABLE projects MODIFY COLUMN status` (ADD `onda1_solaris`, `onda2_iagen`) | ✅ |
| `flowStateMachine.ts`: `VALID_TRANSITIONS` + `assertValidTransition` | ✅ |
| Testes T-K4A-01..08 (36 testes) | ✅ |
| Issue #156 fechada · tag `k4-a-complete` | ✅ |

### K-4-B ✅ CONCLUÍDA E APROVADA PELO P.O.

| Entregável | Status |
|---|---|
| `DiagnosticoStepper.tsx` v3.0 — 8 etapas visuais (Onda 1 → Plano) | ✅ |
| `QuestionarioSolaris.tsx` — badge azul, pills SOL-001..012, `completeOnda1` | ✅ |
| Procedures `getOnda1Questions` + `completeOnda1` com `assertValidTransition` | ✅ |
| Rota `/projetos/:id/questionario-solaris` em `App.tsx` | ✅ |
| Entrada pelo stepper em `ProjetoDetalhesV2.tsx` | ✅ |
| Testes T-K4B-01..08 (26 testes) | ✅ |
| **Critério de aceite P.O.:** Aprovado — stepper 8 etapas funciona, badge azul correto | ✅ |

### K-4-C ✅ CONCLUÍDA E APROVADA PELO P.O. (commit `62c4219`, PR #182)

| Entregável | Status |
|---|---|
| `QuestionarioIaGen.tsx` — badge laranja, spinner 30s, fallback 5 perguntas | ✅ |
| Procedure `generateOnda2Questions` — LLM timeout 30s, fallback hardcoded | ✅ |
| Procedure `completeOnda2` — salva em `iagen_answers`, `assertValidTransition` | ✅ |
| Rota `/projetos/:id/questionario-iagen` em `App.tsx` | ✅ |
| `onStartOnda2` wiring em `ProjetoDetalhesV2.tsx` | ✅ |
| **Critério de aceite P.O.:** Aprovado — fluxo Onda 1 → Onda 2 → Corporativo validado | ✅ |

### K-4-D ✅ CONCLUÍDA E MERGEADA (commit `e54d606`, PR #184)

| Entregável | Status |
|---|---|
| `DiagnosticoStepper.tsx` — `onStartMatrizes?` e `onStartPlano?` na interface | ✅ |
| `DiagnosticoStepper.tsx` — cases `matrizes` e `plano` preenchidos no `handleStepStart` | ✅ |
| `ProjetoDetalhesV2.tsx` — `onStartMatrizes` e `onStartPlano` passados ao stepper | ✅ |
| `onda1-t06-t10.test.ts` — T06.1 corrigido (assertion `questionario-solaris`) | ✅ |
| **Critério de aceite P.O.:** Clicar em Iniciar na Etapa 7 navega para `/matrizes-v3`; Etapa 8 para `/plano-v3` | ✅ |

## Sprint K+ ✅ CONCLUÍDA (PRs #196–#197)

| Entregável | Status |
|---|---|
| Cockpit P.O. v2.0 — C1 (ACAO AGORA), C2 (Responsável), C3 (Modo UAT/DEV/HOTFIX) | ✅ PR #197 |
| C4 (métricas), C5 (Log Decisões com links), I1 (Entrada Agentes) | ✅ PR #197 |
| I2 (Checklist interativo), I3 (Score de Saúde), I4 (Status acionável) | ✅ PR #197 |

## Sprint K++ ✅ CONCLUÍDA (PRs #199–#202)

| Entregável | Status |
|---|---|
| Fetch dinâmico API GitHub — Score de Saúde em tempo real | ✅ PR #199 |
| Seção 4 (4A–4F) — 24 docs catalogados com status visual e links | ✅ PR #200 |
| 10 docs defasados atualizados (GUIA-UAT v2.1, CHANGELOG K-4-B/C/D, +8) | ✅ PR #202 |
| Datas dinâmicas Seção 4 — fetch do último commit de cada arquivo | ✅ PR #202 |

## PRs mergeados (histórico recente — Sprints O/P/Q/R)

| PR | Título | Data |
|---|---|---|
| #276 | feat(g17-b): trigger riskEngine em completeOnda1 | 2026-04-01 |
| #277 | docs: BASELINE v3.1 + ESTADO-ATUAL v3.4 | 2026-04-01 |
| #278 | feat(g17-c): SOLARIS_GAPS_MAP 76 tópicos snake_case | 2026-04-01 |
| #279 | fix(g17-d): split(',') → split(/[;,]/) | 2026-04-01 |
| #280 | chore(backfill): script g17-backfill 4 projetos reais | 2026-04-01 |
| #281 | chore(governance): Gate Q6 — validação de dados reais | 2026-04-01 |
| #283 | chore(ci): 69 testes integração para server/integration/ + test:unit | 2026-04-01 |
| #284 | chore(governance): proteção formal dados permanentes | 2026-04-01 |
| #286 | chore(governance): Gate 7 auto-auditoria formal | 2026-04-01 |
| #287 | chore(test+map): fix g17-solaris-gap.test.ts + chave nfe | 2026-04-01 |
| #288 | fix(solarisAdmin): upsert reativa ativo=1 + listBatches oculta lotes deletados | 2026-04-01 |

## PRs abertos

Nenhum PR aberto no momento. Sprints O/P/Q/R encerradas.

## Próximas sprints (Sprint Auditoria E2E)

- **Prioridade 1:** Auditar se dados das 3 ondas chegam ao briefing e à matriz de riscos (E2E das tabelas)
- **Prioridade 2:** Verificar Onda 2 e Onda 3 no pipeline — `project_risks_v3` é populado corretamente?
- **Prioridade 3:** Segunda planilha advogados (aguardando Dr. José Rodrigues) — SOL-037+ quando disponível
- **Prioridade 4:** Adicionar `'nfe'` como tópico em SOL-013 no próximo upload CSV
- **Lembrete de governança:** Gate 7 (auto-auditoria) ANTES da validação do P.O. — o Orquestrador dispara, não o P.O.

## Gaps RAG — estado atual

| Gap | Descrição | Status |
|---|---|---|
| G1–G12 | Corpus, retrieval, fundamentação auditável, fonte_acao | ✅ Concluídos |
| G13 | fonte_dispositivo nos questionários | 🔜 Sprint futura |
| G15 | `fonte`/`requirement_id`/`source_reference` no `QuestionSchema` | ✅ PR #142 + PR #269 (ONDA_BADGE) |
| G16 | Upload CSV SOLARIS para corpus RAG | ✅ Sprint L (PR #236–#246) |
| G17 | `analyzeSolarisAnswers` → `server/lib/` + source='solaris' | ✅ Sprint N (PR #263) |
| G11 | `fonte_risco` em `project_risks_v3` | ✅ Sprint N (PR #267) |

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
- NÃO mergear PRs sem aprovação explícita do P.O.

## Issues abertas relevantes

- #56 — F-04 Fase 3 (bloqueada, aguarda UAT)
- #61 — Modo `new` (bloqueada, aguarda #56)
- #62 — DROP COLUMN (bloqueada, aguarda #61)
- #101 — Débito técnico: 9 testes corpus com `skipIf(CI)`
- #191 — G16 Upload CSV SOLARIS (Sprint L — próxima)

## Nota sobre erros do LSP do Manus

O watcher de desenvolvimento interno reporta 8 erros TS (`solarisQuestions not exported`). São artefatos do watcher — `npx tsc --noEmit` confirma **0 erros reais**. Não bloqueia build nem deploy.

## Decisões resolvidas

- **DEC-002** ✅ — anchor_id VARCHAR(255) UNIQUE + campos de auditoria (PR #109)
- **DEC-003** ✅ — chunk por NCM/item para Anexos (PR #109)
- **DEC-004** ✅ — log de auditoria sem gate manual (PR #108)
- **DEC-005** ✅ — Sprint 98% B2 Opção A bridge (não recriar engines)
- **DECISÃO-001** ✅ — Prefill cruzado QC-07→QO-03 (executar pós-UAT)
- **DEC-007** ✅ — Infraestrutura de contexto: ESTADO-ATUAL.md como P0 obrigatório
- **DEC-008** ✅ — Cockpit P.O. com fetch dinâmico API GitHub
- **DEC-009** ✅ — Protocolo de Debug v2 adotado — Passo 0 fast path obrigatório
- **DEC-010** ✅ — Corpus SOLARIS: SOL-001..SOL-012 ativos; SOL-013/SOL-014 soft-deleted
- **DEC-011** ✅ — E2E Playwright via auth.testLogin (E2E_TEST_MODE guard) — sem OAuth real

---

Confirme que entendeu o contexto e aguarde a próxima instrução.
