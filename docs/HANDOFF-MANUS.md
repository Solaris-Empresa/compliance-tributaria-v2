# HANDOFF-MANUS.md

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

## Estado atual do projeto (2026-03-27)

- BASELINE **v2.2** — Sprint K (K-1, K-2, K-3) **CONCLUÍDA**
- **541 testes passando** (517 baseline + 12 K-1 + 12 K-2)
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- **57 migrations aplicadas** (última: `0057_odd_ink.sql` — tabela `solaris_questions`)
- Branch protection: ativa (ruleset `main-protection`, ID 14328406)
- **Corpus RAG: 2.078 chunks — 100% com anchor_id canônico (DEC-002)**
- **Tabela `solaris_questions`: 12 questões ativas (SOL-001..SOL-012)**
- **Agent Skills ativas:** Manus `/solaris-orquestracao` + Claude `solaris-contexto`
- **GATE-CHECKLIST:** `docs/GATE-CHECKLIST.md` — executar Gate 0 antes de qualquer sprint
- **Commit HEAD:** `d166fd3` (PR #174 — FLUXO-3-ONDAS v1.1)
- **Checkpoint Manus:** `5f7a3297`

## ALERTA CRÍTICO — Dois fluxos paralelos

Existem **dois fluxos paralelos** no sistema. K-2 e K-3 foram implementados no Fluxo B (legado). O P.O. usa o Fluxo A. K-4 deve integrar as Ondas no Fluxo A.

| Fluxo | Rota | Quem usa | Ondas |
|---|---|---|---|
| **Fluxo A** (caminho real) | QC → QO → QCNAE → Briefing | P.O. e advogados | ❌ Nenhuma ainda |
| **Fluxo B** (LEGACY — não expandir) | QuestionarioV3 → Briefing | Legado | ✅ Onda 1 + badges |

**Documento de referência:** `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` (v1.1)

## Erros do watcher TypeScript — FALSO POSITIVO

O watcher reporta 4 erros de `solarisQuestions` não encontrado. São **falso positivo de cache** — `npx tsc --noEmit` retorna 0 erros reais. O servidor compilado tem todos os módulos corretos. Será corrigido em K-4-A.

## PRs mergeados (histórico recente — Sprint K)

| PR | Título | Commit | Data |
|---|---|---|---|
| #159 | feat(k1): tabela `solaris_questions` | `5e583f6` | 2026-03-27 |
| #160 | docs(governança): Tabela Planejamento Macro/Micro v1.0 | `80efc8c` | 2026-03-27 |
| #162 | feat(k2): integrar Onda 1 (SOLARIS) no questionEngine | `75627e6` | 2026-03-27 |
| #163 | feat(admin): Taskboard P.O. ao vivo — /admin/taskboard | `5a7b69d` | 2026-03-27 |
| #171 | feat(k3): badge visual por onda + seed SOL-001..012 | `38a2980` | 2026-03-27 |
| #172 | feat(admin): taskboard-po — página estática permanente | `2408271` | 2026-03-27 |
| #174 | docs(arquitetura): FLUXO-3-ONDAS v1.1 | `d166fd3` | 2026-03-27 |

## PRs anteriores (Sprints A-J)

| PR | Título | Commit |
|---|---|---|
| #108 | feat(rag): Sprint C — G9/G10 | `ec6a84e` |
| #109 | feat(corpus): Sprint D — G3/G4 + migração legados | `03fa2c1` |
| #110 | feat(rag): Sprint E — G11 fundamentação auditável | `5d15105` |
| #111 | docs(b1-v1.1): Matriz Rastreabilidade v1.1 | `88de16f` |
| #112 | docs: BASELINE v1.5 + HANDOFF-MANUS | `d18dadb` |
| #113 | feat(b2): GATE-CHECKLIST + Skills + Cockpit v2 + fonte_acao G12 | `805afd1` |
| ... | PRs #116–#139 — Sprints F/G/H/I/J — ver `docs/product/cpie-v2/produto/RASTREABILIDADE-RF-PR-SPRINT.md` | — |

## Gaps RAG — estado atual

| Gap | Descrição | Status |
|---|---|---|
| G1–G12 | Ver BASELINE-PRODUTO.md seção 11 | ✅ Todos resolvidos |
| G13 | fonte_dispositivo nos questionários | 🔜 Sprint futura |

## Corpus RAG

| Lei | Chunks | anchor_id | Origem |
|---|---|---|---|
| lc214 | 1.598 | 100% | 779 legados migrados + 819 Sprint D |
| lc227 | 434 | 100% | 434 legados migrados |
| lc224 | 28 | 100% | 28 legados migrados |
| ec132 | 18 | 100% | 18 Sprint D (canônico v3.1.1) |
| **TOTAL** | **2.078** | **100%** | Zero duplicatas |

## Tabela solaris_questions

| Coluna | Tipo | Observação |
|---|---|---|
| id | bigint PK | Auto-increment |
| texto | text | Pergunta completa |
| categoria | varchar(50) | regime_tributario, porte_empresa, operacoes, exportacao, simples_nacional, lucro_real |
| cnae_groups | text | JSON array de prefixos CNAE ou null (universal) |
| obrigatorio | tinyint | 1=obrigatório, 0=opcional |
| ativo | tinyint | 1=ativo, 0=soft-delete |
| observacao | text | Nota interna |
| fonte | varchar(20) | Sempre 'solaris' para Onda 1 |
| criado_em | bigint | Timestamp UTC ms |
| atualizado_em | bigint | Timestamp UTC ms |

> **Nota:** campo `codigo` (SOL-001..SOL-012) **ainda não existe** na tabela — será adicionado em K-4-A via migration.

## Sprint K — estado atual

| Issue | Título | Status |
|---|---|---|
| #153 K-1 | Tabela `solaris_questions` | ✅ Fechada — PR #159 |
| #154 K-2 | Pipeline Onda 1 no questionEngine | ✅ Fechada — PR #162 |
| #155 K-3 | Badge visual por onda | ✅ Fechada — PR #171 |
| #168 K-3 Val. | Validação P.O. badge | ✅ Fechada — aprovada |
| **#156 K-4** | **Onda 2 combinatória** | 🔴 **Aguarda aprovação P.O.** |
| #169 K-4 Val. | Validação P.O. Onda 2 | 🔴 Bloqueada por K-4 |

## Próximo passo — K-4

K-4 requer merge do PR #174 (FLUXO-3-ONDAS v1.1) antes de iniciar.

**K-4-A** (sem aprovação P.O. — técnico puro):
1. Adicionar coluna `codigo VARCHAR(10)` à tabela `solaris_questions`
2. Atualizar seed com códigos SOL-001..SOL-012
3. Criar tabela `solaris_answers` (Drizzle schema)
4. Criar tabela `iagen_answers` (Drizzle schema)
5. Estender `server/flowStateMachine.ts` com `VALID_TRANSITIONS` e `assertValidTransition`
6. `pnpm db:push` → 3 migrations

**K-4-B a K-4-D** (requerem aprovação P.O.):
- Integrar Ondas 1+2 no DiagnosticoStepper (Fluxo A)
- Geração IA da Onda 2 com fallback hardcoded
- Badges visuais no Fluxo A

## Checks obrigatórios no ruleset (4)

- Validate PR body
- Guard critical
- Migration discipline
- Governance gate

## Bloqueios ativos — NÃO executar sem aprovação do P.O.

- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3
- ❌ NÃO executar DROP COLUMN nas colunas legadas
- ❌ NÃO mergear K-4 sem aprovação do P.O. (label `p.o.-valida`)

## Issues abertas relevantes

- #56 — F-04 Fase 3 (bloqueada, aguarda UAT)
- #61 — Modo `new` (bloqueada, aguarda #56)
- #62 — DROP COLUMN (bloqueada, aguarda #61)
- #99 — Débito técnico: refatoração de componentes legados
- #101 — Débito técnico: 9 testes corpus com skipIf(CI)
- #128 — Governança: revisão de permissões de repositório

## Decisões resolvidas

- **DEC-002** ✅ — anchor_id VARCHAR(255) UNIQUE + campos de auditoria (PR #109)
- **DEC-003** ✅ — chunk por NCM/item para Anexos (PR #109)
- **DEC-004** ✅ — log de auditoria sem gate manual (PR #108)
- **DEC-005** ✅ — Sprint 98% B2 Opção A bridge (não recriar engines)
- **DEC-006** ✅ — Fluxo B (QuestionarioV3) = LEGACY — não expandir (2026-03-27)
- **DEC-007** ✅ — Tabelas separadas para Onda 1 e Onda 2 (não JSON) (2026-03-27)
- **DEC-008** ✅ — `status` = fonte de verdade; `currentStep` depreciado (2026-03-27)
- **DEC-009** ✅ — DiagnosticoStepper expandido para 8 etapas no TO-BE (2026-03-27)

---

Confirme que entendeu o contexto e aguarde a próxima instrução.
