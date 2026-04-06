# Estado Atual — IA SOLARIS
> Atualizado pelo Manus ao fechar cada sprint  
> **v4.5 · 2026-04-05 (Sprint V em andamento — PRs #302–#330 mergeados)** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v4.4 · **HEAD:** `1c42774` (origin/main) · **Testes:** 1.476 passando  
**DIAGNOSTIC_READ_MODE:** `shadow` (aguarda UAT — NÃO alterar)  
**Corpus RAG:** 2.509 chunks · 10 leis · 100% confiabilidade · 8/8 gold set  
**Sprint T:** ENCERRADA ✅ (Milestone 1 — Decision Kernel · PRs #302–#317 · 16 PRs)  
**Sprint U:** ENCERRADA ✅ (PRs #318–#323 · 4 tasks · 6/6 casos POC M1 confirmados)  
**Pipeline 3 Ondas:** Onda 1 ✅ · Onda 2 ✅ · Onda 3 ✅ integrada (`source='engine'`, 6/6 casos)  
**Sprint V:** ⏳ Em andamento (PV-01 Lote 1 ✅ #328 · PV-02 ✅ #325 · PV-03 ✅ #326 · PV-01 Lote 2 ✅ #330 · AS-IS ⏳ · Lote 3 ⏳)

---

## Para o Manus (implementador)

- **Branch base:** main · **HEAD:** `1c42774`
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Regra de ordem (Q8):** respeitar a sequência de lotes definida pelo Orquestrador. Se houver impedimento, reportar ANTES de alterar a sequência.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via `git restore --staged`
- **Checkpoint Manus ≠ versão de produto:** checkpoints são artefatos de infraestrutura para recuperação do sandbox. O estado canônico do produto é sempre `origin/main` no GitHub.
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v4.2)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.

---

## 1. Indicadores Técnicos

| Indicador | Valor | Status |
|---|---|---|
| HEAD (origin/main) | `1c42774` | ✅ |
| Baseline | **v4.4** | ✅ |
| Testes passando | **1.476** (0 falhas) | ✅ |
| TypeScript | 0 erros | ✅ |
| CI Workflows | **12 ativos** + invariant-check (GOV-03b) | ✅ |
| CODEOWNERS | **15 entradas** — `@utapajos` | ✅ |
| PRs mergeados (total) | **330** | ✅ |
| Branch protection | Ativa (ruleset `main-protection`) | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (NÃO alterar) | ✅ |
| Corpus RAG | **2.509 chunks — 10 leis** | ✅ |
| RAG Gold Set | **8/8 verde — 100% confiabilidade** | ✅ |
| GS-08 (autor NULL) | **0 chunks** (RFC-004 executada) | ✅ |
| CORPUS_VERSION | **v4.4** (env definida) | ✅ |
| Skill solaris-contexto | **v4.2** | ✅ |
| Skill solaris-orquestracao | **v3.2** | ✅ |
| feature-flags.ts | g17 ✅ g11 ✅ g15 ✅ | ✅ |
| db:push guard | Bloqueado em production | ✅ |
| Perguntas SOLARIS ativas | **24 (SOL-013..036)** | ✅ |
| Pipeline E2E | T1 ✅ T2 ✅ validados em produção | ✅ |
| Contratos Milestone 1 | CNT-01a/01b/02/03/01c em `docs/contracts/` | ✅ |
| Dataset NBS | `nbs-2-0-utf8.csv` (1.237 reg.) no repo | ✅ |
| Decision Kernel | ncm-engine + nbs-engine (**24/24 casos confirmados**) | ✅ |
| Dataset NCM | **12 casos** (Lote 1+2 mergeados — PRs #328, #330) | ✅ |
| Dataset NBS | **12 casos** (Lote 1+2 mergeados — PRs #328, #330) | ✅ |
| Testes decision-kernel | **34/34** | ✅ |
| Nota Q6 | total 24 (não 25) — N-09 e S-06 já existiam do M1. Reaproveitamentos não somam como inserções novas. | ℹ️ |
| Engine Onda 3 | `engine-gap-analyzer.ts` integrado | ✅ |
| Bloco E | `operationProfile` aceita NCM/NBS (CNT-01c) | ✅ |
| Evidence Pack M1 | `artifacts/engine-quality/poc-m1/` | ✅ |
| **Milestone 1** | **Gate triplo APROVADO** | **✅** |
| GOV-03b | `invariant-check.yml` — 5 invariantes protegidos | ✅ |
| RAG Cockpit | Baseline v4.4 · Sprint V Lote 1+2 · 24 casos NCM/NBS | ✅ |

---

## 2. Corpus RAG — Estado pós-Sprint S/T/U

| Lei | Chunks | Status |
|---|---|---|
| lc214 (IBS/CBS/IS) | 1.573 | ✅ |
| lc227 | 434 | ✅ |
| conv_icms (Convênio ICMS 142/2018) | 278 | ✅ |
| lc116 (ISS) | 60 | ✅ |
| lc224 | 28 | ✅ |
| cg_ibs (Resolução CSIBS nº 1/2026) | 26 | ✅ |
| lc123 (Simples) | 25 | ✅ |
| ec132 | 18 | ✅ |
| rfb_cbs (Ato Conjunto RFB/CGIBS nº 1/2025) | 7 | ✅ |
| lc87 (Lei Kandir — compilada 1996+emendas) | 60 | ✅ |
| **Total** | **2.509** | ✅ |

> **LC 87 (Sprint V PV-03):** Ingestão completa executada via PR #326. 55 novos chunks inseridos (5 legados + 55 novos = 60 total). Cobertura: Arts. 1–36, ementa, vigência, compensações financeiras. Anexo Kandir (tabelas históricas de 1996) excluído por gerar ruído no RAG.

> **RFC-004 executada (Sprint U):** 376 chunks com `autor NULL` corrigidos para `legado-pre-sprint-g/{lei}`. GS-08 passou de WARN para verde. Confiabilidade: 87.5% → 100%.

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

---

## 4. Milestone 1 — Decision Kernel (Sprint T)

| Bloco | Entregável | PR | Status |
|---|---|---|---|
| Pré-M1 GOV | Skill v4.1 · CODEOWNERS · branch-scope · file-declaration · autoaudit | #302–#307 | ✅ |
| Pré-M1 Contratos | CNT-01a/01b/02/03 | #308 | ✅ |
| GATE-EXT-01 | NBS 2.0 CSV (UTF-8) + README datasets | #309 | ✅ |
| Docs baseline | ESTADO-ATUAL v4.0 + HANDOFF + skill v4.2 | #310 | ✅ |
| Bloco C | ncm-engine + nbs-engine + datasets M1 (5/6 confirmados) | #311 | ✅ |
| Bloco D | engine-gap-analyzer + integração Onda 3 (source='engine') | #312 | ✅ |
| DK-Q1 | Gate estrutural dataset (Q1-A/B/C/D PASS) | #313 | ✅ |
| DK-Q2 | Validação manual gold set (5/5 PASS) | #314 | ✅ |
| Evidence Pack | Gate triplo — Técnico + Jurídico + P.O. | #315 | ✅ |
| RAG Cockpit v3.3 | Badge Sprint T/M1 · MIG-001 · CORPUS_VERSION v3.3 | #318 | ✅ |
| **Milestone 1** | **Gate triplo APROVADO** | — | **✅ ENCERRADO** |

**Casos validados (6/6 — pós Sprint U):**

| Código | Tipo | Regime | Status |
|---|---|---|---|
| 9619.00.00 | NCM | aliquota_zero | ✅ confirmado |
| 3101.00.00 | NCM | condicional | ✅ confirmado |
| 2202.10.00 | NCM | regime_geral + IS | ✅ confirmado (patch U-2 — Art. 393 compilado) |
| 1.1506.21.00 | NBS | regime_geral | ✅ confirmado |
| 1.0901.33.00 | NBS | regime_especial | ✅ confirmado |
| 1.1303.10.00 | NBS | regime_geral | ✅ confirmado |

---

## 5. Sprint U — Resumo de Execução

| Task | Entregável | PR | Status |
|---|---|---|---|
| U-4 GOV-03b | `invariant-check.yml` — 5 invariantes protegidos | #320 | ✅ |
| U-3 | Badge TaskBoard: `517 testes` → `1.470 testes` | #321 | ✅ |
| U-1 Bloco E | `operationProfile` aceita NCM/NBS · CNT-01c · 6 testes Q5 | #322 | ✅ |
| U-2 Patch IS | 2202.10.00 confirmado · artigos IS compilados (Art. 393/394/396) | #323 | ✅ |
| RFC-004 | 376 chunks `autor NULL` → `legado-pre-sprint-g/{lei}` · GS-08 verde | #319 | ✅ |

---

## 6. Histórico de Sprints (K → U)

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
| **T** | **Milestone 1 — Decision Kernel (Blocos C+D + DK-Q1/Q2 + Gate triplo · 16 PRs)** | **✅ ENCERRADA 2026-04-05** |
| **U** | **RFC-004 + GOV-03b + Bloco E + Patch IS 2202.10.00 · 6/6 casos M1 confirmados** | **✅ ENCERRADA 2026-04-05** |
| **V** | **PV-01 Lote 1+2 ✅ (24 casos) · PV-02 ✅ · PV-03 ✅ · AS-IS ⏳ · Lote 3 ⏳** | **⏳ EM ANDAMENTO** |

---

## 7. Pipeline 3 Ondas — Status

| Onda | Fonte | Trigger | Status |
|---|---|---|---|
| Onda 1 | `source='solaris'` | `completeOnda1` → `analyzeSolarisAnswers` | ✅ Validada em produção |
| Onda 2 | `source='iagen'` | `completeOnda2` → `analyzeIagenAnswers` | ✅ Validada (T1 projeto 2490006) |
| Onda 3 | `source='engine'` | `completeOnda2` → `analyzeEngineGaps` (fire-and-forget) | ✅ Integrada (6/6 casos confirmados) |

---

## 8. Achados Críticos — Estado

| ID | Descrição | Status |
|---|---|---|
| AUDIT-C-002 | iagen_answers não geravam gaps | ✅ Resolvido (Lote A, PR #292 + fix PR #295) |
| AUDIT-C-003 | cpie_score_history sempre vazio | ✅ Resolvido (Lote B, PR #292) |
| AUDIT-C-004 | briefingEngine lia project_actions_v3 (9 reg.) | ✅ Resolvido (Lote E, PR #292) |
| AUDIT-C-005 | Corpus RAG com 5 leis faltando | ✅ Resolvido (Lote D, PR #296) |
| AUDIT-M-004 | LC 87 com apenas 5 chunks (texto original) | ✅ Resolvido (PV-03, PR #326 — 55 novos chunks, total 60) |
| AUDIT-M-007 | iagen-gap-analyzer: confidence_score como proxy de gap | ✅ Resolvido (PR #295 — isNonCompliantAnswer) |
| GS-08 | 376 chunks sem `autor` (herança pré-Sprint G) | ✅ Resolvido (RFC-004, PR #319) |

---

## 9. Pendências Formais — Sprint V

| ID | Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|---|
| PV-01 Lote 1 | P0 | Dataset +10 casos NCM/NBS | Manus + Dr. Rodrigues | **✅ CONCLUÍDA** (#328) |
| PV-01 Lote 2 | P0 | Dataset +8 casos NCM/NBS | Manus + Dr. Rodrigues | **✅ CONCLUÍDA** (#330) |
| PV-02 | P1 | Frontend Bloco E — campos NCM/NBS no formulário de projeto | Manus | **✅ CONCLUÍDA** (#325) |
| PV-03 | P1 | LC 87 compilada completa (55 novos chunks) | Manus | **✅ CONCLUÍDA** (#326) |
| PV-04 | P2 | M2 prep — GOV-03b já feito, aguarda validação Claude Code | Orquestrador | Sprint W |

---

## 10. Decisões tomadas pelo P.O.

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
| DEC-015 | Opção A (Bloco D): NCM/NBS como parâmetro de entrada — Bloco E persiste no schema | 2026-04-05 |
| DEC-016 | Milestone 1 aprovado — Gate triplo (Técnico + Dr. Rodrigues + P.O.) | 2026-04-05 |
| DEC-017 | RFC-004: autor NULL corrigido para `legado-pre-sprint-g/{lei}` — não é regressão | 2026-04-05 |
| DEC-018 | Checkpoint Manus ≠ versão de produto — estado canônico é sempre origin/main GitHub | 2026-04-05 |
| DEC-019 | Bloco E: NCM/NBS persistidos em operationProfile (campo JSON existente) — sem migration | 2026-04-05 |
| DEC-020 | 2202.10.00 IS: **Art. 409 original (DOU 16/01/2025) = Art. 393 compilado (Planalto)** — dataset mantém ambas as numerações com nota de equivalência | 2026-04-05 |
| DEC-021 | PV-02: campos NCM/NBS opcionais no formulário de projeto — compatibilidade legada garantida (arrays vazios) | 2026-04-05 |
| DEC-022 | PV-03: LC 87 compilada ingerida com 55 novos chunks — Anexo Kandir excluído (ruído histórico) | 2026-04-05 |
| DEC-023 | nbs-engine.ts extractFonte — suporte a artigo string direta além de artigos nomeados. PR #328. Sem regressão. | 2026-04-05 |

---

## 11. Bloqueios Permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata

---

## 12. Arquivos críticos — alterar SOMENTE via PR aprovado

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
docs/contracts/CNT-01c.md
docs/contracts/CNT-02.md
docs/contracts/CNT-03.md
server/lib/iagen-gap-analyzer.ts
server/lib/engine-gap-analyzer.ts
server/lib/decision-kernel/engine/constants.ts
server/lib/decision-kernel/engine/ncm-engine.ts
server/lib/decision-kernel/engine/nbs-engine.ts
server/lib/decision-kernel/datasets/ncm-dataset.json
server/lib/decision-kernel/datasets/nbs-dataset.json
```

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-05 (Sprint V em andamento — PRs #302–#330 mergeados · baseline v4.4 · HEAD 1c42774)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
