# Rastreabilidade: Requisitos Funcionais × PR × Sprint

> **Propósito:** Este documento é a fonte de verdade para localizar onde cada requisito funcional foi implementado — qual PR, qual Sprint e quais arquivos principais foram alterados. Consulte antes de alterar qualquer funcionalidade.
>
> **Atualização:** A cada PR mergeado, adicionar uma linha na tabela correspondente.
>
> **Referência cruzada:** [REQUISITOS-FUNCIONAIS-v6.md](./REQUISITOS-FUNCIONAIS-v6.md) · [BASELINE-PRODUTO.md](../../BASELINE-PRODUTO.md)
>
> *Última atualização: 2026-03-27 · Sprint I*

---

## Índice

1. [Baseline v5.3.0 — PRs #1 a #103](#1-baseline-v530--prs-1-a-103)
2. [Sprint A — G1 G2 G5 G6 (PR #105)](#2-sprint-a--g1-g2-g5-g6-pr-105)
3. [Sprint B — G8 G7 (PR #106)](#3-sprint-b--g8-g7-pr-106)
4. [Sprint C — G9 G10 (PR #108)](#4-sprint-c--g9-g10-pr-108)
5. [Sprint D — DEC-002 G4 G3 (PR #109)](#5-sprint-d--dec-002-g4-g3-pr-109)
6. [Sprint E — G11 (PR #110)](#6-sprint-e--g11-pr-110)
7. [Sprint F — B1 B2 G12 (PRs #111 #113)](#7-sprint-f--b1-b2-g12-prs-111-113)
8. [Sprint G — RFC-001 RFC-002 (PR #126)](#8-sprint-g--rfc-001-rfc-002-pr-126)
9. [Sprint H — RAG Cockpit ao vivo (PRs #131 #132)](#9-sprint-h--rag-cockpit-ao-vivo-prs-131-132)
10. [Sprint I — G13 G14 G9 G10 revisados (PRs #134 #136)](#10-sprint-i--g13-g14-g9-g10-revisados-prs-134-136)
11. [Documentação e Governança (PRs #100–#135)](#11-documentação-e-governança-prs-100135)
12. [Backlog — Não implementado / RFC aberta](#12-backlog--não-implementado--rfc-aberta)

---

## 1. Baseline v5.3.0 — PRs #1 a #103

> **Nota:** Os PRs #1 a #103 foram mergeados antes da criação do `REQUISITOS-FUNCIONAIS-v6.md` (23/03/2026). O mapeamento abaixo é por agrupamento de domínio, não por RF individual. Para rastreamento granular desse período, consultar o histórico do GitHub.

| Grupo de RFs | Domínio | PRs | Sprint | Status |
|---|---|---|---|---|
| RF-1.01 a RF-1.08 | Etapa 1 — Criação de Projeto + CNAEs via IA | #1–#30 | v2.1–v4.0 | ✅ prod |
| RF-2.01 a RF-2.12 | Etapa 2 — Questionário Adaptativo | #31–#55 | v3.0–v4.5 | ✅ prod |
| RF-3.01 a RF-3.10 | Etapa 3 — Briefing de Compliance | #56–#70 | v4.0–v5.0 | ✅ prod |
| RF-4.01 a RF-4.13 | Etapa 4 — Matrizes de Riscos | #71–#85 | v5.0–v5.1 | ✅ prod |
| RF-5.01 a RF-5.09 | Etapa 5 — Plano de Ação | #86–#95 | v5.1–v5.2 | ✅ prod |
| RF-6.01 a RF-6.07 | Gestão de Clientes | #15–#40 | v2.1–v4.0 | ✅ prod |
| RF-7.01 a RF-7.05 | Gestão de Usuários e Permissões | #20–#50 | v3.0–v4.5 | ✅ prod |
| RF-8.01 a RF-8.06 | Dashboard e Painel de Projetos | #60–#90 | v4.5–v5.2 | ✅ prod |
| RF-9.01 a RF-9.07 | Exportação e Relatórios | #80–#100 | v5.0–v5.3 | ✅ prod |
| RF-10.01 a RF-10.08 | Questionário Corporativo V2 (QC-01..QC-10) | #85–#103 | v5.2–v5.3 | ✅ prod |
| RF-DD.01 a RF-DD.08 | Diagnóstico Dual V1/V3 — ADR-005 | #90–#103 | v5.2.0 (F-01 a F-04) | ✅ prod |
| RF-SM.01 a RF-SM.07 | Shadow Mode e Monitoramento | #95–#103 | v5.2.0 | ✅ prod |
| RF-VAL.01 a RF-VAL.04 | Suite de 107 Testes Automatizados | #98–#103 | v5.3.0 | ✅ prod |
| RF-UAT.01 a RF-UAT.04 | Protocolo UAT com Advogados | #100–#103 | v5.3.0 | ✅ prod |
| RF-AE.01 a RF-AE.10 | Admin — Embeddings CNAE | #88–#103 | v5.1–v5.3 | ✅ prod |
| RF-R.01 a RF-R.07 | Resiliência e UX de Carregamento | #75–#103 | v5.1–v5.3 | ✅ prod |
| RF-N.01 a RF-N.06 | Navegação e FlowStepper | #70–#103 | v5.0–v5.3 | ✅ prod |
| RF-O.01 a RF-O.06 | Onboarding Guiado (Tour Interativo) | #95–#103 | v5.2–v5.3 | ✅ prod |

---

## 2. Sprint A — G1 G2 G5 G6 (PR #105)

**Data:** 2026-03-26 · **Branch:** `fix/rag-sprint-a`

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| G1 | Labels de área nas matrizes de risco | `MatrizesV3.tsx` | #105 | ✅ prod |
| G2 | Labels de área no plano de ação | `PlanoAcaoV3.tsx` | #105 | ✅ prod |
| G5 | Corpus LC 224/2026 (01/04/2026) adicionado | `ragDocuments` (banco) | #105 | ✅ prod |
| G6 | Corpus atualizado — leis da reforma tributária | `ragDocuments` (banco) | #105 | ✅ prod |

---

## 3. Sprint B — G8 G7 (PR #106)

**Data:** 2026-03-26 · **Branch:** `fix/rag-sprint-b`

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| G8 | `companyProfile` injetado no briefing | `routers-fluxo-v3.ts` (generateBriefing) | #106 | ✅ prod |
| G7 | RAG por área nas matrizes (busca segmentada) | `routers-fluxo-v3.ts` (generateRiskMatrices) | #106 | ✅ prod |

---

## 4. Sprint C — G9 G10 (PR #108)

**Data:** 2026-03-26 · **Branch:** `feat/rag-sprint-c`

> **Nota:** G9 e G10 foram revisados e reforçados na Sprint I (PR #136 — ver seção 10).

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| G9 (v1) | `evidencia_regulatoria` no schema Zod (v1 — `.optional()`) | `ai-schemas.ts` | #108 | ✅ superseded por Sprint I |
| G10 (v1) | `fonte_risco` no schema Zod (v1) | `ai-schemas.ts` | #108 | ✅ superseded por Sprint I |

---

## 5. Sprint D — DEC-002 G4 G3 (PR #109)

**Data:** 2026-03-26 · **Branch:** `feat/corpus-sprint-d`

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| DEC-002 | Schema `anchor_id` + `autor` + `revisado_por` no corpus RAG | `drizzle/schema.ts` · `ragDocuments` | #109 | ✅ prod |
| G4 | Corpus Anexos LC 214/2025 (artigos 1–300+) | `ragDocuments` (banco) | #109 | ✅ prod |
| G3 | Corpus EC 132/2023 completo | `ragDocuments` (banco) | #109 | ✅ prod |
| — | 46 testes de integração do corpus | `sprint-d-g4-g3.test.ts` | #109 | ✅ prod |

---

## 6. Sprint E — G11 (PR #110)

**Data:** 2026-03-26 · **Branch:** `feat/rag-sprint-e`

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| G11 | `fundamentacao_auditavel` por item de risco | `ai-schemas.ts` · `routers-fluxo-v3.ts` | #110 | ✅ prod |
| — | Testes G11 (sprint-e-g11.test.ts) | `sprint-e-g11.test.ts` | #110 | ✅ prod |

---

## 7. Sprint F — B1 B2 G12 (PRs #111 #113)

**Data:** 2026-03-26

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| B1 | Matriz de Rastreabilidade v1.1 — anchor_ids canônicos + INV-001..INV-008 | `docs/` | #111 | ✅ prod |
| B2 | GATE-CHECKLIST + Cockpit P.O. v2 | `docs/` | #113 | ✅ prod |
| G12 | `fonte_acao` em `generateActionPlan` | `routers-fluxo-v3.ts` | #113 | ✅ prod |

---

## 8. Sprint G — RFC-001 RFC-002 (PR #126)

**Data:** 2026-03-27 · **Branch:** `fix/corpus-sprint-g`

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| RFC-001 | Fusão de chunks duplicados lc214 (ids 810+811) | `ragDocuments` (banco) — UPDATE | #126 | ✅ prod |
| RFC-002 | Reclassificação chunks lc123 → lei correta | `ragDocuments` (banco) — UPDATE | #126 | ✅ prod |
| — | RAG Cockpit v3 — estado real pós-Sprint G | `RagCockpit.tsx` | #129 | ✅ prod |

---

## 9. Sprint H — RAG Cockpit ao vivo (PRs #131 #132)

**Data:** 2026-03-27

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| RAG-INV | Endpoint tRPC `ragInventory.getSnapshot` — 9 gold set queries | `server/routers/ragInventory.ts` | #131 | ✅ prod |
| RAG-INV | `lc123` adicionado ao enum `lei` no schema | `drizzle/schema.ts` | #131 | ✅ prod |
| RAG-COCKPIT | RAG Cockpit substituído por dados ao vivo (tRPC) | `client/src/pages/RagCockpit.tsx` | #132 | ✅ prod |
| RAG-COCKPIT | Loading state + timestamp + botão Atualizar + 8 abas ao vivo | `client/src/pages/RagCockpit.tsx` | #132 | ✅ prod |

---

## 10. Sprint I — G13 G14 G9 G10 revisados (PRs #134 #136)

**Data:** 2026-03-27

| RF / Issue | Funcionalidade | Arquivos principais | PR | Status |
|---|---|---|---|---|
| G13 | Remover box âmbar "Conteúdo em desenvolvimento" (10 seções QC) | `QuestionarioCorporativoV2.tsx` | #134 | ✅ prod |
| G13 | Strip prefixos `[QC-XX-PY]` de todos os labels de pergunta | `QuestionarioCorporativoV2.tsx` | #134 | ✅ prod |
| G14 | Label visual `"Contabilidade"` → `"Contabilidade e Fiscal"` (8 ocorrências, 5 arquivos) | `ActionEditor.tsx` · `DashboardTarefas.tsx` · `GestaoPermissoes.tsx` · `MatrizesV3.tsx` · `PlanoAcaoV3.tsx` | #134 | ✅ prod |
| G9 (v2) | `RiskItemSchema.evidencia_regulatoria` → `.min(10)` obrigatório | `ai-schemas.ts` | #136 | ✅ prod |
| G10 (v2) | `TaskItemSchema.evidencia_regulatoria` → `.min(10)` sem fallback | `ai-schemas.ts` | #136 | ✅ prod |
| G10 (v2) | `TaskItemSchema.acao_concreta` → `.min(20)` obrigatório | `ai-schemas.ts` | #136 | ✅ prod |
| G10 (v2) | `TaskItemSchema.criterio_de_conclusao` — novo campo opcional | `ai-schemas.ts` | #136 | ✅ prod |
| G11-136 | `fonte_risco_tipo` adicionado ao `RiskItemSchema` | `ai-schemas.ts` | #136 | ✅ prod |
| DT-01 | db:push desbloqueado — migrations 0054/0055 registradas | `drizzle/0054_keen_maria_hill.sql` · `__drizzle_migrations` | #136 | ✅ prod |

---

## 11. Documentação e Governança (PRs #100–#135)

> PRs de documentação pura — zero código, zero banco.

| PR | Data | Conteúdo | Status |
|---|---|---|---|
| #100 | 2026-03-25 | Cockpit P.O. v1.0 — painel HTML autocontido | ✅ prod |
| #102 | 2026-03-25 | CI: paths-ignore para PRs de docs | ✅ prod |
| #103 | 2026-03-26 | HANDOFF-MANUS.md v1 | ✅ prod |
| #104 | 2026-03-26 | AS-IS v1.1 Final — base formal para sprints RAG | ✅ prod |
| #107 | 2026-03-26 | BASELINE-PRODUTO v1.4 + HANDOFF v2 | ✅ prod |
| #111 | 2026-03-26 | Matriz Rastreabilidade v1.1 — anchor_ids + INV-001..INV-008 | ✅ prod |
| #112 | 2026-03-26 | BASELINE-PRODUTO v1.5 + HANDOFF — pós-Sprints C/D/E/B1 | ✅ prod |
| #115 | 2026-03-26 | Skills solaris-orquestracao e solaris-contexto | ✅ prod |
| #116 | 2026-03-26 | Rollout B2 — BASELINE v1.6 + HANDOFF v1.6 + SNAPSHOT-B2 + GUIA-PO | ✅ prod |
| #119 | 2026-03-26 | FRAMEWORK-GOVERNANCA-IA-SOLARIS v1.0 | ✅ prod |
| #120 | 2026-03-26 | Skill solaris-orquestracao — regra obrigatória de branch | ✅ prod |
| #121 | 2026-03-26 | INDICE-DOCUMENTACAO v2.07 + docs/governanca/ | ✅ prod |
| #122 | 2026-03-26 | CORPUS-BASELINE v1.0 + RFC-001 + RFC-002 | ✅ prod |
| #125 | 2026-03-27 | Skill solaris-orquestracao — crítica obrigatória pré-execução | ✅ prod |
| #127 | 2026-03-27 | BASELINE-PRODUTO v1.7 — Sprint G | ✅ prod |
| #130 | 2026-03-27 | RAG-PROCESSO + RAG-RESPONSABILIDADES + HANDOFF-RAG + INDICE v2.08 | ✅ prod |
| #133 | 2026-03-27 | BASELINE-PRODUTO v1.8 — Sprint H | ✅ prod |
| #135 | 2026-03-27 | Relatórios Sprint G + docs automação RAG + skill v1.8 | ✅ prod |

---

## 12. Backlog — Não implementado / RFC aberta

> Itens identificados mas ainda não implementados. Status atualizado a cada Sprint.

| Issue | RF / Área | Funcionalidade | Bloqueio | Sprint alvo | Status |
|---|---|---|---|---|---|
| #138 | Corpus RAG | RFC-003 — reclassificação chunks lc123 e leis avulsas (ids 617–779) | Aguarda decisão do P.O. sobre destino dos 163 chunks | Sprint J | 📋 RFC aberta |
| #139 | Automação | N8N-F1 — monitoramento RAG agendado via n8n | Bloqueado por instrução do P.O. | Indefinido | ⛔ Bloqueado P.O. |
| #140 | Admin RAG | G16 — Upload CSV para corpus RAG (frontend) | Backend criado no PR #136; falta página frontend `/admin/rag-upload` | Sprint J | 🔧 Backend pronto, frontend pendente |
| #141 | Arquitetura | G15 — Diagnóstico 3 ondas: `fonte`, `requirement_id`, `source_reference` no QuestionSchema | Aguarda aprovação do P.O. para Fase A | Sprint K | 📋 Plano faseado criado |
| #142 | Corpus RAG | RFC-004 — Expansão corpus: lc116, lc87, cg_ibs, rfb_cbs | Texto oficial `cg_ibs` não publicado | Sprint K+ | 📋 RFC aberta |
| — | RF-4.11 | Exportação das Matrizes em PDF e CSV | Não implementado | Indefinido | ⏳ Backlog |
| — | RF-SM.03 | Dashboard Shadow Monitor `/admin/shadow-monitor` | Não implementado | Indefinido | ⏳ Backlog |
| — | RF-UAT.01 | Guia UAT v2 — protocolo formal com advogados | Documento existe; protocolo não iniciado | Sprint J | ⏳ Backlog |
| — | RF-DD.08 | F-04 Fase 3 — ativação modo `new` | **Bloqueado — requer aprovação explícita do P.O.** | Indefinido | 🔒 Gate P.O. |

---

## Legenda de Status

| Ícone | Significado |
|---|---|
| ✅ prod | Implementado e em produção |
| ⏳ Backlog | Identificado, não iniciado |
| 🔧 Parcial | Backend ou frontend implementado, outro lado pendente |
| 📋 RFC aberta | Diagnóstico feito, decisão de implementação pendente |
| ⛔ Bloqueado P.O. | Bloqueado por instrução explícita do P.O. |
| 🔒 Gate P.O. | Requer aprovação formal do P.O. antes de executar |

---

*Documento criado em 2026-03-27 · Sprint I*
*Mantido por: Manus (implementador técnico) — atualizar a cada PR mergeado*
