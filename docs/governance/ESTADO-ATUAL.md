# Estado Atual — IA SOLARIS
> Atualizado pelo Manus ao fechar cada sprint  
> **v4.0 · 2026-04-05 (pós-Sprint T Pré-M1 — PRs #302–#309 mergeados)** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v4.0 · **HEAD:** `33de471` (solaris/main) · **Testes:** 1.446 passando  
**DIAGNOSTIC_READ_MODE:** `shadow` (aguarda UAT — NÃO alterar)  
**Corpus RAG:** 2.454 chunks · 10 leis · 100% confiabilidade  
**Sprint S:** ENCERRADA ✅ (Lotes A ✅ B ✅ C ✅ D ✅ E ✅ + Fix #295 ✅)  
**Sprint T Pré-M1:** ENCERRADA ✅ (PRs #302–#309 · Governança + Contratos M1 + Datasets)  
**GATE-EXT-01:** ⏳ Fase 2 — aguardando Dr. Rodrigues validar 3 NCM + 3 NBS  
**Pipeline 3 Ondas:** Onda 1 ✅ validada · Onda 2 ✅ validada (T1 projeto 2490006) · Onda 3 ⛔ bloqueada (Bloco C)

---

## Para o Manus (implementador)

- **Branch base:** solaris/main · **HEAD:** `33de471`
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Regra de ordem (Q8):** respeitar a sequência de lotes definida pelo Orquestrador. Se houver impedimento, reportar ANTES de alterar a sequência.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via `git checkout --ours`
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v4.0)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.

---

## 1. Indicadores Técnicos

| Indicador | Valor | Status |
|---|---|---|
| HEAD (solaris/main) | `33de471` | ✅ |
| Baseline | **v4.0** | ✅ |
| Testes passando | **1.446** (5 skipped) | ✅ |
| Testes falhando | 0 | ✅ |
| TypeScript | 0 erros | ✅ |
| CI Workflows | **12 ativos** | ✅ |
| CODEOWNERS | **15 entradas** — `@utapajos` | ✅ |
| PRs mergeados (total) | **309** | ✅ |
| Branch protection | Ativa (ruleset `main-protection`) | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (NÃO alterar) | ✅ |
| Corpus RAG | **2.454 chunks — 10 leis** | ✅ |
| Skill solaris-contexto | **v4.1** | ✅ |
| Skill solaris-orquestracao | **v3.2** | ✅ |
| feature-flags.ts | g17 ✅ g11 ✅ g15 ✅ | ✅ |
| db:push guard | Bloqueado em production | ✅ |
| Perguntas SOLARIS ativas | **24 (SOL-013..036)** | ✅ |
| Pipeline E2E | T1 ✅ T2 ✅ validados em produção | ✅ |
| Contratos Milestone 1 | CNT-01a/01b/02/03 em `docs/contracts/` | ✅ |
| Dataset NBS | `nbs-2-0-utf8.csv` (1.237 reg.) no repo | ✅ |
| LC 214/2025 | `lc214-2025.pdf` (6.7 MB) no sandbox | ✅ |

---

## 2. Corpus RAG — Estado pós-Sprint S

| Lei | Chunks | Status |
|---|---|---|
| lc214 (IBS/CBS/IS) | 1.573 | ✅ |
| lc227 | 434 | ✅ |
| conv_icms (Convênio ICMS 142/2018) | 278 | ✅ Novo (Sprint S) |
| lc116 (ISS) | 60 | ✅ Novo (Sprint S) |
| lc224 | 28 | ✅ |
| cg_ibs (Resolução CSIBS nº 1/2026) | 26 | ✅ Novo (Sprint S) |
| lc123 (Simples) | 25 | ✅ |
| ec132 | 18 | ✅ |
| rfb_cbs (Ato Conjunto RFB/CGIBS nº 1/2025) | 7 | ✅ Novo (Sprint S) |
| lc87 (Lei Kandir — texto original 1996) | 5 | ✅ Novo (Sprint S) |
| **Total** | **2.454** | ✅ |

> **Nota LC 87:** PDF recebido é o texto original de 1996 (2 páginas, 5 chunks). Solicitar versão compilada com emendas ao Dr. Rodrigues para enriquecer cobertura ICMS. **Sprint T: pendente.**

---

## 3. Sprint S — Resumo de Execução

| Lote | AUDIT | Entregável | PR | Status |
|---|---|---|---|---|
| C | — | Hard delete projetos legados (1.705 projetos) | Sem PR (dados) | ✅ |
| B | C-003 | `persistCpieScoreForProject` no backend (`approveActionPlan`) | #292 | ✅ |
| E | C-004 | `briefingEngine` lê `actionPlans` (401 reg.) em vez de `project_actions_v3` (9) | #292 | ✅ |
| A | C-002 | `iagen-gap-analyzer.ts` + integração `completeOnda2` fire-and-forget | #292 | ✅ |
| D | — | Upload 5 leis no corpus RAG (376 chunks → total 2.454) | #294→#296 | ✅ |
| Fix | — | `isNonCompliantAnswer` — bug `confidence_score` corrigido | #295 | ✅ |

**Desvio de governança registrado:** ordem C→B→E→A→D não foi respeitada na primeira execução. Corrigido na sessão corretiva. **Gate Q8** adicionado: verificar sequência de lotes antes de abrir PR.

**T1 validado:** projeto `2490006` → `source='iagen' | gaps=3` após `completeOnda2` com fix aplicado.

---

## 4. Histórico de Sprints (K → S)

| Sprint | Entregável principal | Status |
|---|---|---|
| K | Arquitetura 3 Ondas (K-4-A a K-4-E) | ✅ CONCLUÍDA |
| K+ | Cockpit P.O. v2.0 (C1–C5 + I1–I4) | ✅ CONCLUÍDA |
| K++ | Cockpit fetch dinâmico + Seção 4 + 10 docs | ✅ CONCLUÍDA |
| L | DEC-002 anchor_id + AdminSolaris + RAG Telemetria | ✅ CONCLUÍDA |
| M | G17-B Solaris Gap Engine v2 + 98% Confidence | ✅ CONCLUÍDA |
| N | G17 validado em produção + G11 fonte_risco | ✅ CONCLUÍDA |
| O | ONDA_BADGE + ADR-0002 + feature flags | ✅ CONCLUÍDA |
| P | Planos de ação v3 (actionPlans) | ✅ CONCLUÍDA |
| Q | ScoreView CPIE + cpie_score_history | ✅ CONCLUÍDA |
| R | briefingEngine v2 + iagen_answers pipeline | ✅ CONCLUÍDA |
| **S** | **Lotes A+B+C+D+E + Fix #295 — pipeline 3 Ondas completo + corpus 10 leis** | **✅ ENCERRADA 2026-04-04** |
| **T Pré-M1** | **Governança (GOV-02/03) + Contratos M1 + Datasets GATE-EXT-01** | **✅ ENCERRADA 2026-04-05** |
| **T Bloco C** | **Decision Kernel engine (ncm-dataset.json + nbs-dataset.json)** | **⛔ BLOQUEADO — aguarda GATE-EXT-01 Fase 2** |

---

## 5. Pipeline 3 Ondas — Status

| Onda | Fonte | Trigger | Status |
|---|---|---|---|
| Onda 1 | `source='solaris'` | `completeOnda1` → `analyzeSolarisAnswers` | ✅ Validada em produção |
| Onda 2 | `source='iagen'` | `completeOnda2` → `analyzeIagenAnswers` | ✅ Validada (T1 projeto 2490006) |
| Onda 3 | `source='engine'` | `completeOnda3` → Decision Kernel | ⛔ Bloco C bloqueado (GATE-EXT-01 Fase 2) |

---

## 6. Achados Críticos — Estado

| ID | Descrição | Status |
|---|---|---|
| AUDIT-C-002 | iagen_answers não geravam gaps | ✅ Resolvido (Lote A, PR #292 + fix PR #295) |
| AUDIT-C-003 | cpie_score_history sempre vazio | ✅ Resolvido (Lote B, PR #292) |
| AUDIT-C-004 | briefingEngine lia project_actions_v3 (9 reg.) | ✅ Resolvido (Lote E, PR #292) |
| AUDIT-C-005 | Corpus RAG com 5 leis faltando | ✅ Resolvido (Lote D, PR #296) |
| AUDIT-M-004 | LC 87 com apenas 5 chunks (texto original) | ⚠️ Aberto — Sprint T: solicitar versão compilada |
| AUDIT-M-007 | iagen-gap-analyzer: confidence_score como proxy de gap | ✅ Resolvido (PR #295 — isNonCompliantAnswer) |

---

## 7. Pendências e Próximas Ações (Sprint T)

| Prioridade | Ação | Responsável |
|---|---|---|
| P0 | Campo `principaisProdutos` (NCM) no perfil da empresa | Manus |
| P0 | Engine Onda 3: tabular Anexos I–XI LC 214 por NCM (~400 chunks) | Manus |
| P1 | LC 87 compilada completa (~80 chunks) | P.O. → Dr. Rodrigues |
| P1 | IN RFB 2.121/2022 (~200 chunks) | Manus |
| P2 | Validar RAG com query real sobre ISS/ICMS no RAG Cockpit | P.O. |

---

## 8. Decisões tomadas pelo P.O.

| Código | Decisão | Data |
|---|---|---|
| DEC-001 | Prefill cruzado QC-07→QO-03 pós-UAT | 2026-03-24 |
| DEC-002 | Schema DEC-002: 4 campos novos em solaris_questions | 2026-03-30 |
| DEC-003 | Ingestão Anexos LC 214 — chunk por Anexo | 2026-03-26 |
| DEC-004 | Gate lei=solaris — publicação direta com log | 2026-03-26 |
| DEC-005 | Escopo holístico — todas as empresas brasileiras | 2026-03-26 |
| DEC-006 | LC 123/2006 incluída no corpus | 2026-03-26 |
| DEC-007 | Infraestrutura de contexto: ESTADO-ATUAL + CODEOWNERS | 2026-03-28 |
| DEC-008 | Cockpit P.O. com fetch dinâmico API GitHub | 2026-03-29 |
| DEC-009 | Protocolo de Debug v2 adotado | 2026-03-31 |
| DEC-010 | Corpus RAG expandido para 10 leis (Sprint S Lote D) | 2026-04-02 |
| DEC-011 | Gate Q8: verificar ordem de execução dos lotes | 2026-04-04 |
| DEC-012 | isNonCompliantAnswer: conteúdo da resposta (não confidence_score) | 2026-04-04 |
| DEC-013 | source='engine' substitui source='rag' para Onda 3 (Decision Kernel) | 2026-04-04 |
| DEC-014 | Binários grandes (PDFs/XLSX) mantidos no sandbox, não no repositório | 2026-04-05 |

---

## 9. Bloqueios Permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata
- **Bloco C (engine)** → bloqueado até GATE-EXT-01 Fase 2 (validação Dr. Rodrigues: 3 NCM + 3 NBS)

---

## 10. Arquivos críticos — alterar SOMENTE via PR aprovado

```
drizzle/schema.ts
server/ai-schemas.ts
server/routers-fluxo-v3.ts
server/rag-retriever.ts
server/config/feature-flags.ts
docs/rag/CORPUS-BASELINE.md
docs/rag/RAG-GOVERNANCE.md
docs/governance/ESTADO-ATUAL.md
docs/BASELINE-PRODUTO.md
docs/HANDOFF-MANUS.md
docs/contracts/CNT-01a.md
docs/contracts/CNT-01b.md
docs/contracts/CNT-02.md
docs/contracts/CNT-03.md
server/lib/iagen-gap-analyzer.ts
server/lib/decision-kernel/engine/constants.ts
```

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-05 (pós-Sprint T Pré-M1 — PRs #302–#309 mergeados · baseline v4.0)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
