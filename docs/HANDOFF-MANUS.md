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

## Estado atual do projeto (2026-03-26)

- BASELINE **v1.6** — Sprint 98% Confidence B0/B1/B2 **CONCLUÍDA**
- **489+ testes passando**
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- 56 migrations aplicadas
- Branch protection: ativa (ruleset `main-protection`, ID 14328406)
- **Corpus RAG: 2.078 chunks — 100% com anchor_id canônico (DEC-002)**
- **Agent Skills ativas:** Manus `/solaris-orquestracao` + Claude `solaris-contexto`
- **GATE-CHECKLIST:** `docs/GATE-CHECKLIST.md` — executar Gate 0 antes de qualquer sprint

## PRs mergeados (histórico recente)

| PR | Título | Commit |
|---|---|---|
| #108 | feat(rag): Sprint C — G9/G10 | `ec6a84e` |
| #109 | feat(corpus): Sprint D — G3/G4 + migração legados | `03fa2c1` |
| #110 | feat(rag): Sprint E — G11 fundamentação auditável | `5d15105` |
| #111 | docs(b1-v1.1): Matriz Rastreabilidade v1.1 | `88de16f` |
| #112 | docs: BASELINE v1.5 + HANDOFF-MANUS | `d18dadb` |
| #113 | feat(b2): GATE-CHECKLIST + Skills + Cockpit v2 + fonte_acao G12 | `805afd1` |
| #115 | docs(cockpit): skills na biblioteca | `0647511` |

## Gaps RAG — estado atual

| Gap | Descrição | Status |
|---|---|---|
| G1 | Label lc224 no formatContextText | ✅ PR #105 |
| G2 | Label lc227 ano errado (2024→2026) | ✅ PR #105 |
| G5 | Art. 45 tópicos — confissão de dívida | ✅ PR #105 |
| G6 | LC 224 cnaeGroups — cobertura universal | ✅ PR #105 |
| G8 | companyProfile não injetado no briefing | ✅ PR #106 |
| G7 | 1 RAG compartilhado para 4 áreas | ✅ PR #106 |
| G9 | Schema Zod para outputs do pipeline RAG | ✅ PR #108 |
| G10 | Campo fonte_risco nas matrizes de risco | ✅ PR #108 |
| G3 | EC 132/2023 — 18 chunks canônicos no corpus | ✅ PR #109 |
| G4 | Anexos LC 214/2025 (I–XVII, sem VII) no corpus | ✅ PR #109 |
| G11 | Fundamentação auditável por item de risco | ✅ PR #110 |
| G12 | fonte_acao no plano de ação | ✅ PR #113 |
| G13 | fonte_dispositivo nos questionários | 🔜 Sprint futura |

## Corpus RAG

| Lei | Chunks | anchor_id | Origem |
|---|---|---|---|
| lc214 | 1.598 | 100% | 779 legados migrados + 819 Sprint D |
| lc227 | 434 | 100% | 434 legados migrados |
| lc224 | 28 | 100% | 28 legados migrados |
| ec132 | 18 | 100% | 18 Sprint D (canônico v3.1.1) |
| **TOTAL** | **2.078** | **100%** | Zero duplicatas |

**Nota id 811:** chunk fragmentado lc227 — rastreável, pendente correção em Sprint G.
**Nota ids 617–807:** artigos de outras leis (LC 87/1996, CTN) sob `lei='lc214'` — normalização pendente Sprint G.

## Sprint 98% Confidence — estado FINAL

| Bloco | Conteúdo | Status |
|---|---|---|
| B0 | Governança GitHub: milestone, labels, 34 issues, PR template | ✅ Concluído (2026-03-23) |
| B1 | ADR-010 + Matrizes canônicas (I/O + Rastreabilidade) | ✅ Concluído — PR #111 |
| B2 | GATE-CHECKLIST + Skills + Cockpit v2 + G12 fonte_acao | ✅ Concluído — PR #113 |

## Próximas sprints

- **Sprint G** — Corpus complementar (P0): id 811 lc227 + ids 617–807 campo `lei`
- **Sprint H** — Qualidade do retrieval: ordenação semântica + cobertura quinquenal
- **Sprint I** — Débito técnico: Issue #101 + Issues #56, #61, #62

## Checks obrigatórios no ruleset (4)

- Validate PR body
- Guard critical
- Migration discipline
- Governance gate

## Bloqueios ativos — NÃO executar sem aprovação do P.O.

- NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- NÃO executar F-04 Fase 3
- NÃO executar DROP COLUMN nas colunas legadas

## Issues abertas relevantes

- #56 — F-04 Fase 3 (bloqueada, aguarda UAT)
- #61 — Modo `new` (bloqueada, aguarda #56)
- #62 — DROP COLUMN (bloqueada, aguarda #61)
- #101 — Débito técnico: 9 testes corpus com skipIf(CI) — habilitar no CI real

## Decisões resolvidas

- **DEC-002** ✅ — anchor_id VARCHAR(255) UNIQUE + campos de auditoria (PR #109)
- **DEC-003** ✅ — chunk por NCM/item para Anexos (PR #109)
- **DEC-004** ✅ — log de auditoria sem gate manual (PR #108)
- **DEC-005** ✅ — Sprint 98% B2 Opção A bridge (não recriar engines)

---

Confirme que entendeu o contexto e aguarde a próxima instrução.
