# Estado Atual — IA SOLARIS
> Atualizado pelo Manus ao fechar cada sprint  
> **v7.2 · 2026-04-16 (Sprint Z-17 ENCERRADA · 2/2 issues · HEAD e77dca7)** · Responsavel: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v7.2 · **HEAD:** `e77dca7` (github/main) · **Testes:** tsc 0 erros · 1665 unit tests pass  
**DIAGNOSTIC_READ_MODE:** `shadow` (aguarda UAT — NÃO alterar)  
**Corpus RAG:** 2.515 chunks · 10 leis + 3 CGIBS · 100% confiabilidade · 8/8 gold set  
**Sprint T:** ENCERRADA ✅ (Milestone 1 — Decision Kernel · PRs #302–#317 · 16 PRs)  
**Sprint U:** ENCERRADA ✅ (PRs #318–#323 · 4 tasks · 6/6 casos POC M1 confirmados)  
**Pipeline 3 Ondas:** Onda 1 ✅ · Onda 2 ✅ · Onda 3 ✅ integrada (`source='engine'`, 6/6 casos)  
**Sprint V:** ✅ Encerrada (PV-01 Lote 1 ✅ #328 · PV-02 ✅ #325 · PV-03 ✅ #326 · PV-01 Lote 2 ✅ #330 · PV-01 Lote 3 ✅ #333 · AS-IS ✅ #336)  
**Sprint W:** ✅ ENCERRADA — M2 COMPLETO (A ✅ #337 · D ✅ #338 · UX ✅ #339 · B ✅ #344 · C ✅ #345 · docs #340–#343)  
**Sprint X:** ✅ ENCERRADA — falhas conhecidas = 0 (T-B7-08/T-B7-10 ✅ #347 · BUG-UAT-04 ✅ #348 · BUG-UAT-05 ✅ #349)  
**Sprint Y:** ✅ ENCERRADA — BL-01 a BL-05 concluídos (PRs #355 + #356)
**Sprint M3 UAT:** ✅ ENCERRADA — BUG-UAT-08 ✅ #362 · E2E 15 casos ✅ #364 · BUG-UAT-09+PDF-01 ✅ #365 · Docs v4.9.3 ✅ #367 · BL-06 ⏳ backlog
**Pré-Sprint Z:** ✅ ADR-0009 criado ✅ #368 · ADR-001/002 supersedidos · ADR-007 atualizado · **Bloqueador Z-01 REMOVIDO**
**Sprint Z-07:** ✅ ENCERRADA — PR #B ✅ #427 (0064_risks_v4.sql · db-queries-risks-v4.ts) · PR #C ✅ #429 (risks-v4.ts · RiskDashboardV4.tsx · ActionPlanPage.tsx) · Gate Z-07 3/3 PASS · DEC-SWAP-05 aprovada · deploy estável
**Sprint Z-08:** ✅ ENCERRADA — fix JSON.parse (#434) · fix pool.promise (#435) · conexão engine v4 ao pipeline
**Sprint Z-09:** ✅ ENCERRADA — risk_categories configurável (#436) · VARCHAR migration (#437) · RAG sensor + painel admin (#438) · ADR-0025 (#439) · engine cache 1h (#440) · docs fix (#441) · CONTRACT-02/03 (#442) · FK CONTRACT-01 (#443)
**Sprint Z-10:** ✅ ENCERRADA — ACL Gap→Risk (#448) · fix mapper determinístico (#449) · risks-v4 router (#450) · fix user_id→createdById (#451) · PROTOCOLO-DEBUG (#452 #453) · ADR-0026
**Sprint Z-11:** ✅ ENCERRADA · Gate E PASS — B-Z11-009 (CNAE skip) · B-Z11-010 (briefing guard) · B-Z11-012 (status transition) · PRs #467–#468
**Sprint Z-12:** ✅ ENCERRADA · Gate 7 PASS — migration 0072/0073/0074 · housekeeping Z-11 em lote · RAG Lote D (CGIBS) · hot swap ADR-0022 · R-SYNC-01 · PRs #469–#483 · HEAD c4a5f57
**Sprint Z-13:** ✅ ENCERRADA · Gate 7 PASS — RAG CGIBS 6 chunks ✅ · descricao /admin/categorias ✅ · R-SYNC-01 CLAUDE.md ✅ · fix B-Z13-001 is_active→active ✅ · fix B-Z13-002 gap_type/criticality ✅ · fix B-Z13-003 JOIN inválido ✅ · stepper etapa4→risk-dashboard-v4 ✅ · fix B-Z13-004 risk_category_code GapSchema+INSERT ✅ (#495+#496) · backfill project_gaps_v3 ✅ · cockpits P.O.+RAG atualizados ✅ (#499) · 9 docs RAG v5.0 ✅ (#498) · PRs #485–#499 · HEAD f396fed · Gate E PASS
**Sprint Z-13.5:** ✅ ENCERRADA · Gate E PASS · Gate 7 PASS · **Gate 0 CONFIAVEL** — B-Z13.5-001 (safeParseObject/safeParseArray) ✅ · B-Z13.5-002 (dual-schema operationProfile) ✅ · PRs #502–#511 · HEAD 7080d40
  - Campos confirmados: `operationProfile` → `operationType/multiState/clientType/paymentMethods/hasIntermediaries` (novo) + `tipoOperacao/multiestadual/tipoCliente/meiosPagamento/intermediarios` (legado)
  - `product_answers`: `ncm` (snake_case) · `confirmedCnaes`: camelCase JSON
  - UAT T1–T6 PASS em producao · ragDocuments: 2.515 · normative_product_rules: 20 · risk_categories: 10
  - **Governanca Gate 0:** DATA_DICTIONARY.md (60 campos, 8 tabelas) + db-schema-validator agent + CLAUDE.md Gate 0 section
  - **Governanca Gate UX:** UX_DICTIONARY.md (2 telas, 33 funcionalidades) + ux-spec-validator agent + CLAUDE.md Gate UX section
  - **Modelo Orquestracao v1.1:** F0–F7 + F4.5 · 11 regras (ORQ-01..11) · CI/CD enforcement · Sprint Log · PRs #512–#518
  - **Post-mortem:** `docs/governance/POST-MORTEM-Z13.5-SESSAO-CLAUDE-CODE.md` — auditoria completa, 5/5 bugs cobertos
  - **Resumo P.O.:** `docs/governance/GOVERNANCA-SESSAO-13ABR2026.md` — documento executivo para o P.O.
**Sprint Z-15:** ✅ ENCERRADA · 4 issues · PRs #599–#607 · HEAD 78955e2
  - fix L1107 texto malformado bulkApprove ✅ (#598 → PR #605)
  - RAG validation badge no card ✅ (#600 → PR #605) — rag-badge-validated/pending
  - Plans preview inline no card ✅ (#601 → PR #607) — plans-preview/plan-preview-row
  - Sugestão da IA no modal criar plano ✅ (#602 → PR #607) — ai-suggestion-btn + getActionPlanSuggestion
  - Mockups HTML Z-15 com data-testid ✅ (PR #599) — 72+35 testids
  - 180_dias adicionado ao Select prazo · PLANS exportado do engine
  - **ACHADO:** catálogo PLANS com 4 chaves legado (GAP-XX-000) vs ruleId composto (categoria::op:X::geo:Y) — fallback ativo
**Sprint Z-16:** ✅ ENCERRADA · 9/9 issues · PRs #617–#650 · HEAD 04eefdd · Gate 7 PASS
  - fix fallback PLANS por categoria ✅ (#611 → PR #632) — PLANS[ruleId] ?? PLANS[categoria] ?? default
  - calculateComplianceScore v4 ✅ (#622 → PR #634) — score determinístico + snapshot scoringData
  - ConsolidacaoV4 Step 7 completo ✅ (#624 → PR #637) — 27 data-testid · disclaimer · score · riscos · planos · timeline
  - redirect ActionPlan → ConsolidacaoV4 ✅ (#625 → PR #635) — btn-ver-consolidacao
  - PDF diagnóstico jsPDF ✅ (#626 → PR #638) — generateDiagnosticoPDF client-side
  - modal excluir tarefa ✅ (#615 → PR #636) — AlertDialog + motivo min 10 chars + audit log
  - migration tasks NOT NULL ✅ (#614 → PR #639) — data_inicio + data_fim NOT NULL (Opção C)
  - instrumentação data-testid 20+ ✅ (#613 → PR #647)
  - modal editar tarefa + z.string().date() ✅ (#614 → PR #648) — updateTaskFull + validação dupla
  - ordenação overdue + badge Atrasada ✅ (#616 → PR #649) — sortTasks + isOverdue
  - **Gate 7 Smoke Tests (REF_ID=270001):** P1 COUNT=10 ✅ · P2 aliquota_zero+credito_presumido ✅ · P3 0 títulos sujos ✅ · P4 RAG 10/10 (100%) ✅
  - **Deploy:** checkpoint 8620bd66 · iasolaris.manus.space · 2026-04-16
  - **Governança:** PRE-CLOSE-CHECKLIST CI (#643) · PC-0 1 issue/PR (#644) · Closes vs Refs (#645) · ORQ-18 sync board (#646) · POST-MERGE-GATE (#651)
  - **Post-mortem:** #614 fechada por migration sem UI → detectado, reaberto, corrigido, regra criada
**Sprint Z-17:** ✅ ENCERRADA · Gate 7 PASS · 2/2 issues · PRs #657–#662 · HEAD e77dca7 · Checkpoint 06614c05
  - modal criar tarefa completo ✅ (#655 → PR #657) — taskModalMode create/edit, guard duplo, Tooltip wrapper, toLocaleDateString('en-CA'), form inline removido
  - geração automática tarefas via LLM ✅ (#659 → PR #660) — generateTaskSuggestions via generateWithRetry, Promise.allSettled chunks 3, audit_log generated_by='llm'
  - **Reversão Z-14:** "tarefas manuais" → "carga inicial LLM + revisão humana" (autorização P.O. 16/04/2026)
  - **Deploy:** iasolaris.manus.space ✅ — 2026-04-16
**UAT E2E:** ✅ COMPLETO — projeto 2851328 (Distribuidora Alimentos Teste) · 2026-04-06 · PIPELINE VALIDADO EM PRODUÇÃO
**BUG-UAT-06:** ✅ CORRIGIDO (PR #352) — coluna "Descrição do Risco" no Relatório Final PDF agora exibe `r.evento` corretamente
**M2.1:** ✅ CONCLUÍDO (PR #354) — banner de completude diagnóstica no briefing + bloco PDF
**M3 Fase 1:** ✅ CONCLUÍDO (PR #357) — `computeCompleteness` · 7 fontes · `inferCompanyType` · 28 testes

---

## Para o Manus (implementador)

- **Branch base:** main · **HEAD:** `e77dca7`
- **Regra obrigatoria:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Regra de ordem (Q8):** respeitar a sequencia de lotes definida pelo Orquestrador. Se houver impedimento, reportar ANTES de alterar a sequencia.
- **Gate 0 OBRIGATORIO:** Antes de tocar banco, consultar `docs/governance/DATA_DICTIONARY.md`. Ver CLAUDE.md secao Gate 0.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via `git restore --staged`
- **Checkpoint Manus ≠ versao de produto:** checkpoints sao artefatos de infraestrutura para recuperacao do sandbox. O estado canonico do produto e sempre `origin/main` no GitHub.
- **Referencia operacional:** docs/HANDOFF-MANUS.md
- **Referencia de governanca:** docs/governance/HANDOFF-IMPLEMENTADOR.md
- **Post-mortem Z-13.5:** docs/governance/POST-MORTEM-Z13.5-SESSAO-CLAUDE-CODE.md

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
| HEAD (github/main) | `e77dca7` | ✅ |
| Baseline | **v7.2** | ✅ |
| Testes passando | tsc 0 erros · 1665 unit tests pass (1 file pré-existente Z-11 fora do escopo) | ✅ |
| TypeScript | 0 erros | ✅ |
| PRs mergeados (total) | **662 (sessão 16/abr: PRs #617–#662)** | ✅ |
| Gate 0 (banco) | **CONFIAVEL** — DATA_DICTIONARY 60 campos · db-schema-validator · verificacao dupla banco vs migration | ✅ |
| Gate UX (frontend) | **CONFIAVEL** — UX_DICTIONARY + ux-spec-validator + mockup HTML obrigatorio | ✅ |
| Gate Spec (5 labels) | **ATIVO** — CI bloqueia PR sem spec-bloco9/adr/contrato/e2e/aprovada | ✅ |
| Modelo Orquestracao | **v1.1** — F0–F7 + F4.5 · 11 regras · CI/CD · Sprint Log · mockup HTML | ✅ |
| CI Workflows | **17 ativos** (validate-pr + project-automation) | ✅ |
| Issue Templates | **5** (sprint-issue com 12 blocos + ADR/Contrato/E2E) | ✅ |
| Sprint Z-14 | **ENCERRADA** — 16 issues · catalogo PLANS · cat-divider · mockups HTML v2 · 9 CTs E2E · 16 regras ORQ | ✅ |
| Sprint Z-15 | **ENCERRADA** — 4 issues · RAG badge · plans preview · AI suggestion · fix L1107 · PRs #599–#607 | ✅ |
| Sprint Z-16 | **ENCERRADA** — 9/9 issues · Gate 7 PASS · deploy 8620bd66 · PRs #617–#651 · 18 regras ORQ · CI PRE-CLOSE + POST-MERGE | ✅ |
| Sprint Z-17 | **ENCERRADA** — 2/2 issues · Gate 7 PASS · deploy 06614c05 · PRs #657–#662 | ✅ |
| Regras ORQ | **18** (ORQ-00..18) · RN riscos + planos + consolidação · FLOW_DICTIONARY · 4 dicionarios | ✅ |
| Mockups HTML | **6** (Z-07: 2 + Z-15: 2 + Z-16: 2 com data-testid) no repo | ✅ |
| CI Workflows | **18 ativos** (validate-pr + pre-close-checklist + post-merge-gate + project-automation) | ✅ |
| data-testid | **74** (ActionPlanPage: 27 · ConsolidacaoV4: 27 · RiskDashboardV4: 20) | ✅ |
| UAT E2E | ✅ COMPLETO — projeto 2851328 (2026-04-06) | ✅ |
| Branch protection | Ativa (ruleset `main-protection`) | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (NÃO alterar) | ✅ |
| Corpus RAG | **2.515 chunks — 10 leis + 3 CGIBS** | ✅ |
| RAG Gold Set | **8/8 verde — 100% confiabilidade** | ✅ |
| GS-08 (autor NULL) | **0 chunks** (RFC-004 executada) | ✅ |
| CORPUS_VERSION | **v4.4** (env definida) | ✅ |
| Skill solaris-contexto | **v4.2** | ✅ |
| M2 Completo | **A+D+UX+B+C concluídos** (PRs #337–#339 · #344–#345) | ✅ |
| Gate B | ✅ APROVADO — `source='engine'` = 2 gaps · conf 1.00/0.98 · projeto 2850797 | ✅ |
| Skill solaris-orquestracao | **v3.2** | ✅ |
| feature-flags.ts | g17 ✅ g11 ✅ g15 ✅ | ✅ |
| db:push guard | Bloqueado em production | ✅ |
| Perguntas SOLARIS ativas | **24 (SOL-013..036)** | ✅ |
| Pipeline E2E | T1 ✅ T2 ✅ validados em produção | ✅ |
| Contratos Milestone 1 | CNT-01a/01b/02/03/01c em `docs/contracts/` | ✅ |
| Dataset NBS | `nbs-2-0-utf8.csv` (1.237 reg.) no repo | ✅ |
| Decision Kernel | ncm-engine + nbs-engine (**37/38 casos confirmados + 1 pending**) | ✅ |
| Dataset NCM | **19 casos** (Lote 1+2+3 mergeados — PRs #328, #330, #333) | ✅ |
| Dataset NBS | **19 casos** (Lote 1+2+3 mergeados — PRs #328, #330, #333) | ✅ |
| Testes decision-kernel | **48/48** | ✅ |
| Nota Q6 | total 37 (meta 38) — 2202.10.00 IS já estava confirmado. 1 pending: 1.0906.11.00 (corretagem de seguros — sem base legal explícita). Meta Sprint V atingida com margem de segurança jurídica. | ℹ️ |
| Engine Onda 3 | `engine-gap-analyzer.ts` integrado | ✅ |
| Bloco E | `operationProfile` aceita NCM/NBS (CNT-01c) | ✅ |
| Evidence Pack M1 | `artifacts/engine-quality/poc-m1/` | ✅ |
| **Milestone 1** | **Gate triplo APROVADO** | **✅** |
| GOV-03b | `invariant-check.yml` — 5 invariantes protegidos | ✅ |
| RAG Cockpit | Baseline v4.4 · Sprint V Lote 1+2+3 · 37 casos NCM/NBS | ✅ |

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
| **V** | **PV-01 Lote 1+2+3 ✅ (37 casos) · PV-02 ✅ · PV-03 ✅ · AS-IS ✅ #336** | **✅ ENCERRADA** |
| **W** | **M2 COMPLETO: A ✅ #337 · D ✅ #338 · UX ✅ #339 · B ✅ #344 · C ✅ #345** | **✅ ENCERRADA** |
| **X** | **Dívidas técnicas: T-B7-08/T-B7-10 ✅ #347 · BUG-UAT-04 ✅ #348 · BUG-UAT-05 ✅ #349** | **✅ ENCERRADA** |
| **Y** | **BL-01 assertValidTransition ✅ #355 · BL-02/03/04 testes ✅ #355 · BL-05 badge ✅ #356 · M2.1 ✅ #354 · M3 Fase 1 ✅ #357** | **✅ ENCERRADA** |
| **Sprint M3 UAT** | **BUG-UAT-08 ✅ #362 · E2E 15 casos ✅ #364 · BUG-UAT-09+PDF-01 ✅ #365 · Docs ✅ #367** | **✅ ENCERRADA** |
| **Pré-Sprint Z** | **ADR-0009 criado ✅ #368 · ADR-001/002 supersedidos · ADR-007 atualizado · Bloqueador Z-01 REMOVIDO** | **✅ CONCLUÍDO** |
| **Sprint Z-07** | **PR #B ✅ #427 (0064_risks_v4.sql · db-queries-risks-v4.ts) · PR #C ✅ #429 (risks-v4.ts · RiskDashboardV4.tsx · ActionPlanPage.tsx) · Gate Z-07 3/3 PASS · DEC-SWAP-05 · deploy estável** | **✅ ENCERRADA 2026-04-09** |
| **Z-07** | **✅** | **#425–#431** | **Engine v4 · schema 0064 · router · RiskDashboardV4** |
| **Z-08** | **✅** | **#432–#435** | **Conexão engine v4 · fix JSON.parse · fix pool.promise** |
| **Z-09** | **✅** | **#436–#443** | **risk_categories · RAG sensor · ADR-0025 · FK CONTRACT-01 · ENCERRADA** |

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
| PV-01 Lote 3 | P0 | Dataset +13 casos NCM/NBS + 1 pending | Manus + Dr. Rodrigues | **✅ CONCLUÍDA** (#333) |
| PV-02 | P1 | Frontend Bloco E — campos NCM/NBS no formulário de projeto | Manus | **✅ CONCLUÍDA** (#325) |
| PV-03 | P1 | LC 87 compilada completa (55 novos chunks) | Manus | **✅ CONCLUÍDA** (#326) |
| PV-04 | P2 | M2 prep — GOV-03b já feito, aguarda validação Claude Code | Orquestrador | **✅ CONCLUÍDA** (Sprint W) |

---

## 9b. Sprint W — M2 Fase 1 (Em Execução)

### Componentes M2 — Status

| Componente | Arquivo | PR | Status | Bloqueio |
|---|---|---|---|---|
| A — briefingEngine | `server/routers/briefingEngine.ts` | #337 | **✅ CONCLUÍDO** | — |
| D — Edição NCM/NBS | `server/routers-fluxo-v3.ts` | #338 | **✅ CONCLUÍDO** | — |
| UX NCM/NBS | `client/src/components/PerfilEmpresaIntelligente.tsx` | #339 | **✅ CONCLUÍDO** | — |
| B — riskEngine | `server/routers/riskEngine.ts` | #344 | **✅ CONCLUÍDO** | — |
| C — scoringEngine | `server/routers/scoringEngine.ts` | #345 | **✅ CONCLUÍDO** | — |

### Decisões Canônicas M2 (DEC-M2-01 a DEC-M2-09)

| Código | Decisão | Status |
|---|---|---|
| DEC-M2-01 | briefingEngine ordena por `COALESCE(evaluation_confidence, 0.8)` — valor 0.8 FIXO · `top_gaps` mantém TODOS os gaps · `engine_gaps` é seção ADICIONAL opcional | ✅ PR #337 |
| DEC-M2-02 | `updateOperationProfile` — `undefined` NÃO sobrescreve · arrays vazios `[]` SÃO aceitos · engine só dispara em change material | ✅ PR #338 |
| DEC-M2-03 | `analyzeEngineGaps` requer 3 parâmetros: `analyzeEngineGaps(projectId, ncmCodes, nbsCodes)` — NUNCA chamar com apenas `projectId` | ✅ PR #338 |
| DEC-M2-04 | `gap_classification=NULL` para `source='engine'` é INTENCIONAL · fallback `'ausencia'` via `effectiveGapClassification` correto · NÃO corrigir o NULL | ✅ PR #337 |
| DEC-M2-05 | `fonte_risco` é `VARCHAR(20)` — sem migration de banco · Componente B: apenas Zod enum + WHERE clause | ⏳ Comp. B |
| DEC-M2-06 | Scoring — menor confidence = menor penalidade (APROVADO P.O.) · engine 1.00→100% · solaris 0.90→90% · iagen 0.70→70% | ⏳ Comp. C |
| DEC-M2-07 | UX NCM/NBS — validação em tempo real · NCM: `NNNN.NN.NN` · NBS: `N.NNNN.NN.NN` · botão salvar desabilitado com códigos inválidos | ✅ PR #339 |
| DEC-M2-08 | `onda3_rag` **NÃO existe** no schema nem no VALID_TRANSITIONS — status correto pós-`completeOnda2` é `diagnostico_corporativo` · referências a `onda3_rag` em docs anteriores são inválidas | ✅ PR #350 |
| DEC-M2-09 | Handlers `completeDiagnosticLayer` (#3–#5) e de aprovação (#6–#10) operam sem `assertValidTransition` — status gravados estão corretos · risco classificado como regressão futura (backlog BL-01) · não bloqueiam E2E | ✅ PR #350 |

### Gate B — ✅ APROVADO (2026-04-06 · projeto 2850797)

| # | Critério | Resultado |
|---|---|---|
| 1 | 1+ projeto com NCM/NBS criado via nova UI | ✅ projeto 2850797 |
| 2 | `COUNT(*) WHERE source='engine' >= 1` | ✅ **2 gaps** |
| 3 | `evaluation_confidence >= 0.90` | ✅ **1.00** e **0.98** |
| 4 | `source_reference` preenchido | ✅ `LC 214/2025 Art. 11, 15, 21` |
| 5 | Briefing gerado sem erro Zod | ✅ |
| 6 | `fonte_risco='engine'` = 0 antes do Comp. B | ✅ |

> **ACHADO-01:** `evaluation_confidence` vem como **string** do MySQL (ex: `"0.98"`). Todo consumidor futuro DEVE usar `Number()` cast explícito. Tratado no Componente C (PR #345 linha 116).

### Flags — Estado pós-Sprint X

| Flag | Descrição | Status |
|---|---|---|
| FLAG 1 | Gate B não verificado | ✅ RESOLVIDA — Gate B aprovado (projeto 2850797) |
| FLAG 2 | Escopo cirúrgico por PR | ✅ RESOLVIDA — 10 PRs M2 respeitados |
| FLAG 3 | `SectionGapsSchema` mergeado | 🟡 MONITORAR |
| FLAG 4 | C1-C7 pendentes (Consultor) — TO-BE v9 bloqueado | 🔴 ATIVA |
| FLAG 5 | Arquitetura crescendo sem validação de uso real | 🟡 MONITORAR — dados reais existem (E2E validado em produção ✅ projeto 2851328) |
| FLAG 6 | 0 regressões além das **2 conhecidas** (T-B7-08 · T-B7-10) | ✅ OK |
| FLAG 7 | `DIAGNOSTIC_READ_MODE` alterado sem aprovação P.O. | 🔴 ATIVA PERMANENTE |
| FLAG 8 | `consistencyRouter.OperationProfileSchema` desatualizado | 🟡 MONITORAR (antes do M3) |

---

## 9c. Marco E2E — Primeiro Teste Completo em Produção

> **MARCO E2E · 2026-04-06 · Projeto 2851328 (Distribuidora Alimentos Teste)**  
> Primeiro teste E2E real completo da história do SOLARIS.

| Etapa | Detalhe | Status |
|---|---|---|
| Perfil + NCMs | 1006.40.00 · 1507.90.11 · 2202.10.00 | ✅ |
| CNAEs | 4632-0/01 · 4637-1/02 · 4622-2/00 · 4635-4/02 | ✅ |
| Onda 1 | 24/24 perguntas SOLARIS respondidas | ✅ |
| Onda 2 | engine disparou (iagen) | ✅ |
| Diagnóstico Corporativo | concluído | ✅ |
| Diagnóstico Operacional | concluído | ✅ |
| Diagnóstico CNAE | concluído | ✅ |
| Briefing | gerado (Risco Alto · 4 gaps · confiança 85%) | ✅ |
| Matriz de Riscos | 32 riscos · 12 críticos · 4 áreas | ✅ |
| Relatório Final | 32 tarefas · responsáveis · prazos por CNAE | ✅ |

**Resultado: PIPELINE VALIDADO EM PRODUÇÃO ✅**

> **BUG-UAT-06 RESOLVIDO (PR #352):** coluna "Descrição do Risco" no PDF do Relatório Final agora exibe `r.evento` corretamente. Fix: `PlanoAcaoV3.tsx` L1149.

---

## 9c.1 — Pendências Abertas: Expansão Corpus RAG (NCM/NBS)

> Documento completo: `docs/governance/PENDENCIA_RAG_EXPANSAO_NCM_NBS.md`  
> Registrado pelo Orquestrador — 2026-04-06 · Não bloqueiam nenhuma feature arquitetural (M3, M4, etc.)

| Lote | Documento | Impacto | Status |
|---|---|---|---|
| D-1 | Resoluções CGIBS nº 1, 2 e 3/2026 | NCM 55% → 63% · NBS 30% → 45% | **ABERTA** |
| D-2 | TIPI 2022 (Decreto 11.158/2022) | NCM 63% → 78% | **ABERTA** |
| D-3 | Reindexação Anexo I LC 214/2025 (tabela estruturada) | NCM 78% → 84% | **ABERTA** |
| E | NBS completa + Notas Técnicas RFB CBS por segmento | NBS 45% → 65% | **ABERTA** |
| F | Listas oficiais governo (aliquota zero, IBS/CBS por NCM) | NCM 84% → 95%+ · NBS 65% → 85%+ | **AGUARDA GOVERNO** |

---

## 9d. Histórico de Bugs UAT

| Bug | PR | HEAD | Causa | Fix | Lição |
|---|---|---|---|---|---|
| BUG-UAT-04 | #348 | 21f2cd2 | `completeOnda1` marcava `onda1_solaris` em 3 lugares (em vez de `onda2_iagen`) — travava transição para Onda 2 | Corrigido em `routers-fluxo-v3.ts` | Transição de estado não coberta por testes automatizados — só detectada via uso real |
| BUG-UAT-05 | #349 | f1f0f13 | `completeOnda2` usava `assertValidTransition('onda2_iagen')` mas gravava `diagnostico_corporativo` — inconsistência entre assert e update | Corrigido em `routers-fluxo-v3.ts` L2450 | Mesmo padrão do BUG-UAT-04 — detectado via auditoria P2 |
| BUG-UAT-06 | #352 | 94c241f | `PlanoAcaoV3.tsx` L1149 usava `r.descricao \|\| r.description` para coluna "Descrição do Risco" no PDF — campos inexistentes no `RiskItemSchema` · coluna sempre vazia | Corrigido para `r.evento \|\| r.descricao \|\| r.description \|\| ""` | Campo correto no schema é `r.evento` (ai-schemas.ts L308) — `MatrizesV3.tsx` já usava corretamente; apenas `PlanoAcaoV3.tsx` estava com mapeamento errado |

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
| DEC-M2-01 | briefingEngine: COALESCE(0.8) FIXO + engine_gaps opcional + source enum. PR #337. | 2026-04-06 |
| DEC-M2-02 | updateOperationProfile: merge seguro + fire-and-forget change material. PR #338. | 2026-04-06 |
| DEC-M2-03 | analyzeEngineGaps: 3 parâmetros obrigatórios (projectId, ncmCodes, nbsCodes). PR #338. | 2026-04-06 |
| DEC-M2-04 | gap_classification=NULL para source=engine: intencional, NÃO corrigir. PR #337. | 2026-04-06 |
| DEC-M2-05 | fonte_risco VARCHAR(20): sem migration. Componente B: apenas Zod enum + WHERE. | 2026-04-06 |
| DEC-M2-06 | Scoring confidence ponderado: aprovado P.O. (engine 1.00→100%, solaris 0.90→90%, iagen 0.70→70%). | 2026-04-06 |
| DEC-M2-07 | UX NCM/NBS: validação em tempo real + acessibilidade WCAG (aria-describedby/invalid). PR #339. | 2026-04-06 |
| DEC-M2-08 | onda3_rag não existe — status correto pós-completeOnda2 é diagnostico_corporativo. Auditoria P2. PR #350. | 2026-04-06 |
| DEC-M2-09 | completeDiagnosticLayer e handlers de aprovação sem assertValidTransition: status corretos, risco=regressão futura. Backlog BL-01. PR #350. | 2026-04-06 |
| DEC-SWAP-05 | AUDIT-C-004 — Opção A aprovada: `scoringEngine.ts` NÃO é tocado no Sprint Z-07. `generateRisks` sem dependência do CPIE. PR #E (migração score → tabelas v4) na próxima sprint. | 2026-04-09 |

---

## 11. Bloqueios Permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata
- `analyzeEngineGaps(projectId)` → SEMPRE 3 parâmetros (DEC-M2-03)
- `gap_classification=NULL` para `source='engine'` → NUNCA corrigir (DEC-M2-04)
- `COALESCE(0.8)` no briefingEngine → NUNCA alterar sem P.O. (DEC-M2-01)
- `undefined` em `updateOperationProfile` → NUNCA sobrescreve dados (DEC-M2-02)
- Componente B → NUNCA iniciar sem Gate B verificado pelo P.O.
- Gate B critério 3: `evaluation_confidence >= 0.90` (operador >=, não >)
- T-B7-08 + T-B7-10 → falhas PRÉ-EXISTENTES, não investigar como regressão
- Q5-3 + Q5-mix (`engine-gap-analyzer.test.ts`) → ✅ CORRIGIDOS no PR #343 — substituídos por `1.0906.11.00` (único NBS `pending_validation`). Removidos da lista de falhas conhecidas.
- `consistencyRouter.OperationProfileSchema` → ATUALIZAR antes do M3 Consolidador (pré-requisito)

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

---

## 13. Backlog Sprint M3 UAT
| ID | Ação | Prioridade | Tamanho | Status |
|---|---|---|---|---|
| BL-01 | `assertValidTransition` em `completeDiagnosticLayer` | P2 | ~5 linhas | ✅ PR #362 |
| BL-02 | Teste de integração `completeOnda2` — handler completo | P2 | 1 arquivo novo | ✅ PR #362 |
| BL-03 | Teste de integração `completeDiagnosticLayer` | P3 | 1 arquivo novo | ✅ PR #362 |
| BL-04 | Teste de integração `updateDiagnosticStatus` | P3 | 1 arquivo novo | ✅ PR #362 |
| BL-05 | Badge de completude diagnóstica no briefing | P2 | ~20 linhas | ✅ PR #356 |
| BL-06 | `vi.mock` path mismatch em `routers-fluxo-v3-etapas2-5.test.ts` (`"./db"` → `"../db"`) | P3 | ~5 linhas | ⏳ backlog |

### PRs Sprint M3 UAT
| PR | Título | Status |
|---|---|---|
| #362 | fix: BUG-UAT-08 — VALID_TRANSITIONS + assertValidTransition universal | ✅ mergeado |
| #364 | test: E2E fluxo completo — 15 casos automatizados | ✅ mergeado |
| #365 | fix: BUG-UAT-09 + BUG-UAT-PDF-01 — approveBriefing atômico + PDF status | ✅ mergeado |

> Fonte: Auditoria P2 (2026-04-06) · Orquestrador aprovado · DEC-M2-09 · DEC-M3-05

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-16 (v7.2 · Sprint Z-17 ENCERRADA · Gate 7 PASS · PRs #657–#662 · HEAD e77dca7)*  
*PRs mergeados total: 499 · Novos componentes: RiskDashboardV4 (UX completa) · ActionPlanPage (UX completa) · Hot swap ADR-0022: ATIVO*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
