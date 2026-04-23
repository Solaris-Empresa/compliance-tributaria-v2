# Estado Atual — IA SOLARIS
> Atualizado pelo Manus ao fechar cada sprint
> **v7.58 · 2026-04-22 (Hotfix IS v2 + v2.1 MERGEADOS — HEAD `58d490c` · SPEC v1.2 intocada · ADR-0030 amendments 1+2 inline · Epic #830 desbloqueado pós-deploy)**
> **Predecessor:** v7.57 · 2026-04-22 (Hotfix IS v1.2 entregue — PR #828 mergeado pós-v7.58, documentou v1.2 antes do UAT identificar caller inativo)

## Sessão v7.58 (2026-04-22) — Hotfix IS v2 + v2.1 (ciclo completo)

**HEAD main:** `58d490c48619b6b3b86d6cbaea029b5b26621064` (merge PR #841, 21:08:50Z)

**Gatilho:** UAT P.O. pós-deploy v1.2 (PR #826) reproduziu o bug original — transportadora continuou recebendo `imposto_seletivo`.

**Descobertas da Investigação D:**
1. Gate v1.2 aplicado em `server/routers/riskEngine.ts` (engine v3 legado) — frontend usa `useNewRiskEngine=true` → engine v4 (caller ativo)
2. Projeto de teste tinha `operationType='servico'` (singular não-canônico) — caía no caso (6) warning sem bloquear

**PRs fechados nesta sessão:**

| PR | Entrega | Merge |
|---|---|---|
| #840 | Hotfix v2 — gate no engine v4 `consolidateRisks` + alias `servico`→`servicos` (privado) | `8cf303d` (18:45:10Z) |
| #841 | Hotfix v2.1 — `enquadramento_geral` registrado como 11ª categoria canônica (corrige FK constraint P0 do v2) + DOWN migration + comentário no-op ALTER ENUM | `58d490c` (21:08:50Z) |

**Ressalvas atravessadas:**
- `db:migration` label faltava no PR #841 — identificado via `Guard critical` + `Governance gate` failures, adicionado pelo P.O.
- `gh run rerun --failed` usa payload antigo (sem label nova) — **empty commit** foi a via para disparar `synchronize` event e forçar Structural Fix Gate reavaliar

**Hashes registrados em `governance/APPROVED_SPEC-HOTFIX-IS.json`:**
| Artefato | Hash |
|---|---|
| SPEC v1.2 (intocada desde 2026-04-21) | `80176084...` |
| CONTRATO v1.2.1 (NOVO v2) | `887dfca7...` |
| ADR v1.1 amendment 1 (v2) | `9e89bbfe...` |
| ADR v1.1 amendment 2 (v2.1) | `620b0a0b...` |
| Migration 0089 UP | `30608bcd...` |
| Migration 0089 DOWN | `f9b18537...` |

**Lições de Gate 0 registradas no ADR-0030 v1.1:**
1. "Verificar caller efetivo em runtime, não apenas caller existente no código" (v2)
2. "Quando hotfix toca valores de schema ENUM ou FK target, exigir teste integration com persist real" (v2.1)

**Auditoria:** `docs/governance/audits/v7.58-2026-04-22-hotfix-is-v2-v2.1.md`

**Estado dos checkpoints:**
- v7.57 (PR #828) — mergeado pós-v7.58 (documentou v1.2)
- v7.58 (este) — docs branch preparado

**Próxima ação:** Etapa 5 v2.1 — Deploy em produção pelo Manus (inclui migration 0089) + Etapa 6 validação funcional pelo P.O.

**Tech-debt registrada:** CI com DATABASE_URL para desbloquear `Run Unit Tests` + `TypeScript + Vitest` (pré-existente em 7+ merges). Teste integration com `persistRiskV4` real (gap que deixou bug FK do v2 escapar).

---

## Sessão v7.57 (2026-04-22) — Hotfix IS v1.2 entregue + Backlog Epic

**HEAD main:** `49208cb` (último merge: PR #818 — Epic backlog docs; Hotfix IS ainda em draft)

**Frentes fechadas:**

| Frente | Executor | Resultado |
|---|---|---|
| Hotfix IS v1.2 (PR #826 draft) | Claude Code | 3 commits · 8 arquivos · 60/60 testes · tsc 0 erros · hashes SPEC/Contrato/ADR/APPROVED_SPEC-HOTFIX-IS conferidos |
| Backlog Padrão A/B (#820-#825) | Manus | 5 issues + 1 Epic · zero código · checkpoint v7.56 `1f84aef0` |
| Aprovação pre-deploy v1.2 | Orquestrador | 3 artefatos hash-locked entregues via Caminho β |
| Issue #827 (Hotfix IS) | Claude Code | Aberta · labels `hotfix`+`risk-categorizer`+`epic:rag-arquetipo:etapa0` |

**Decisão Caminho β:** `governance/APPROVED_SPEC.json` e `scripts/validate-governance.sh` NÃO tocados. Trilha paralela via `APPROVED_SPEC-HOTFIX-IS.json` (schema v1 do validator preservado). Migração do validator = backlog P2.

**Regra operacional registrada:** "Executar somente o que está listado no prompt. NÃO agregar entregas adicionais mesmo que pareçam úteis. Se algo valioso surgir durante execução, REPORTAR ao Orquestrador como sugestão de backlog — nunca entregar sem autorização explícita."

**Pendências ativas:**
- PR #826 review operacional do Manus (build TS OK · testes em andamento)
- Erros TS em `server/routers-fluxo-v3.ts` (módulos `briefing-quality`/`briefing-sanitizer`) — pré-existentes, candidato a issue própria
- Blocos 7-12 da UAT V1 (v7.56) + teste decisivo CT-D2 — ainda pendentes

**Auditoria:** `docs/governance/audits/v7.57-2026-04-22-hotfix-is-entregue.md`

---

## Sessão v7.56 (2026-04-21) — UAT V1 parcial (Blocos 1-6)

**Executor:** P.O. direto no browser em `iasolaris.manus.space`.
**Projeto de teste:** `V1-UAT-<hora>` (novo) — Distribuidora Alimentos, CNAE 4639-7/01, tipo produto, 3 NCMs (1006.40.00 · 1507.90.11 · 2202.10.00), Q1 SOLARIS 100% (48 resp.).

**Resultados consolidados:**
| Bloco | CT | Resultado |
|---|---|---|
| 1 | Completude perfil 97% (7/7 obrig · 11/12 opc) | 🟢 |
| 2 | Confiança 37% pós-Q1 (matemática valida) | 🟢 |
| 3 | v1 gerada — 14/14 critérios (46%, PARCIAL, Top 3, Fonte, Timestamp, Qualidade removida, lista bullet) | 🟢 |
| 4 | **Determinismo (temp=0) — 0pp de diferença em regeração** | 🟢 **CRÍTICO validado** |
| 5 | Correção óleo vegetal (inconsistente com perfil) | 🟡 parcial — Hipótese A (filtro do LLM) ou B (regressão) — teste decisivo pendente |
| 6 | Complemento RECOF — novo Gap 5 + múltiplas menções | 🟢 |

**Pendente:** Blocos 7-12 (freshness, imutabilidade, hash desempata, PDF, cosméticos, regressão 1682096) + teste decisivo CT-D2 com correção consistente (ex: NCM farinha 1101.00.10).

**Auditoria:** `docs/governance/audits/v7.56-2026-04-21-uat-v1-parcial.md`

**Status produção:** HEAD `b02467f` (v7.55) em `iasolaris.manus.space` · 110 tests PASS · `pnpm check` zero errors · deploy ativo.

**Próxima ação P.O.:** abrir Epic com o Orquestrador (escopo a definir — possivelmente Fase 2 V1: vencimento temporal/regulatório + outros).

---

## Sessão v7.55 (2026-04-21) — Merge bundle V1 em main

- `feat/811-briefing-source-type-por-gap` mergeada em main via PR #815 (14 commits)
- PR #812 mergeado separado (#808 anti-alucinação NCM)
- PRs #813 e #814 fechados como superseded (conteúdo já em #815)
- 4 issues (#808/#809/#810/#811) auto-fechadas
- Main HEAD: `b02467f`

---

## Sessão v7.54 (2026-04-21) — V1 Confiança Ponderada (encerramento)

**Motivação:** UAT encontrou "85% de confiança com 1/5 questionário e 0 produtos cadastrados" — contradição com as Limitações listadas no próprio briefing.

**Entregue em `feat/811-briefing-source-type-por-gap`:**
- Fórmula ponderada v2 — 6 pilares (pesos 8/10/10/10/5/2) substitui bandas discretas
- Modelo composto Q3 Produtos/Serviços: `0.3·cadastro + 0.7·respostas` (0% sem NCM/NBS)
- Signals module dinâmico — replica `calcProfileScore` (7 obrig + 12 opc) + queries em tempo real
- Snapshot persistido em `briefingStructured.confiancaSnapshot` (zero migration)
- Procedure `checkBriefingFreshness` + banner UI com diff por fonte
- Timestamp da versão (D10) na UI e no PDF `handleExportPDF`
- 4 fixes UAT: qualidade redundante removida, perfil "7/7 obrig · 11/12 opc" honesto, Q3 sem cadastro explicativo, PDF sem "Gerado hoje"
- Tabela → lista (fix "895%") + typo "limitaçãoões" → "limitações"

**Auditoria:** `docs/governance/audits/v7.54-2026-04-21-v1-confianca-encerramento.md` (veredito 🟡 — 2 fixes cosméticos aguardando redeploy Manus).

**Pendências registradas:**
- D7 dialog cascata matriz/plano ao regerar — não implementado, follow-up se necessário
- PDF `generateDiagnosticoPDF` (tela /consolidacao) — interface ampliada mas callers não passam os novos campos
- Tipo empresa "Serviço" para Distribuidora Alimentos Teste (dado de entrada errado no form, não bug da fórmula)

**Decisões de governança registradas na auditoria:** falhas reconhecidas (ORQ-20/ORQ-19 não aplicadas com rigor, confiança excessiva em `tsc`, iteração de spec durante implementação) + lições para próxima sessão.

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v7.10 · **HEAD:** `31ef5a6` (github/main) · **Testes:** tsc 0 erros · 61 unit + 33 E2E  
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
  - **Hotfix #664:** observabilidade TaskGenerator — timeout 15s→45s, console.warn→insertAuditLog
  - **Hotfix #666:** schema wrapper z.union — LLM retorna {tarefas:[]} ao invés de [] (Manus)
  - **Hotfix #667:** schema flexível z.preprocess — extrai array de qualquer chave wrapper (Manus)
  - **#668 → PR #670:** gatilho Ver Planos — geração no clique, não na aprovação
  - **#672:** E2E Pipeline Completo — 20 CTs (questionários → briefing → riscos → planos → tarefas)
  - **#673:** geração retroativa de tarefas para planos existentes sem tarefas
  - **#674:** dual fix extractJsonFromLLMResponse arrays + geração retroativa (Manus)
  - **#675:** LLM Integration Gates — 17 unit tests + 3 integration tests + CI workflow (ORQ-19 → convenção testes LLM, PR #680)
  - **#682:** useMemo → useEffect para calculateAndSaveScore
  - **#683:** safeStr para Date objects — previne React error #31
  - **#684:** setShowTour → useEffect em ComplianceLayout (Manus)
  - **#685:** safeStr helper abrangente no ConsolidacaoV4
  - **#686:** invalidar getProjectAuditLog cache após mutations
  - **#688:** LIMIT ? → LIMIT interpolado para TiDB (aba Histórico vazia)
  - **#689:** CI TiDB query safety — grep LIMIT ? + DB integration tests + CLAUDE.md
  - **Gate E2E:** 21/21 PASS (PR #677) · **CRUD:** 6/6 PASS (planos + tarefas + auditoria)
  - **Geração tarefas LLM:** FUNCIONANDO em produção (testado P.O. 17/04/2026)
  - **Trilha de auditoria:** 31 eventos visíveis na aba Histórico (criação LLM + CRUD manual)
  - **ConsolidacaoV4:** FUNCIONANDO (após fixes #682 #683 #684 #685)
  - **PRs totais Z-17:** #655–#695 (produto + hotfixes + governança + E2E + Claude Code optimization)
**Sprint Z-18:** ✅ ENCERRADA · 3/3 issues + governance · PRs #697–#710 · HEAD 31ef5a6 · Checkpoint 56b495bf
  - hot swap plano-v3 → planos-v4 completo ✅ (#697 → PR #698) — 6 botões hub, ADR-0022 fechado após 10 sprints. E2E 4/4 PASS.
  - integração botão PDF ConsolidacaoV4 ✅ (#701 → PR #702) — generateDiagnosticoPDF conectado, toast placeholder removido
  - restore plano deletado ✅ (#705 → PR #706) — procedure restoreActionPlan, botão "↩ Restaurar", audit_log restored. E2E 2 PASS + 2 SKIP.
  - Claude Code optimization: hooks + rules + skills (#693 → PR #695) + tooling MCP + lint (PR #704)
  - governance automation: E2E rule + Manus template + board automation (#710) — project-automation.yml (add/in-progress/done)
  - **E2E total:** 33 CTs (21 pipeline + 4 hub + 4 pdf + 4 restore)
  - **Governança:** ORQ-17 PRE-CLOSE · ORQ-18 board sync · Manus template · E2E obrigatória · board automation CI
**Sprint Z-19:** ✅ ENCERRADA · UI refinements · PR #714 · HEAD 6b5bbfe · Issue #712 (6 ajustes P.O. em ActionPlanPage)
  - Botão "Ver Consolidação" + "Exportar PDF" no header ✅
  - Badge prazo removido do card (modal mantido) ✅
  - Breadcrumb expandido "Projeto / Matriz de Riscos / Planos de Ação" ✅
  - Remover "v4" dos textos de UI (3 locais) + limpeza de jsdoc/empty-state ✅
  - Suite E2E `action-plan-ui-refinements.spec.ts` — 6 CTs cobrindo mudanças
  - Pipeline 3 etapas: implementação + E2E + teste manual P.O.
**Sprint Z-20:** 🟡 PARCIAL · Suite Matriz de Riscos + snapshot + CPIE doc · PRs #716 #718 #721 · Issue #717
  - **Snapshot Matriz de Riscos v4** ✅ MERGED (#716 → 52a1739) — `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` (1628 linhas · 25 seções · 4 scores CPIE mapeados · 10 critérios §13.5 · Gate 7 PASS · fluxos Mermaid)
  - **SPEC-TESTE-MATRIZ-RISCOS v1.1** ✅ mergeada junto do snapshot (via #716) — spec de suite 4 baterias · 867 linhas
  - **CPIE doc (4 scores mapeados)** ✅ MERGED (#721 → f08dfc1) — `docs/governance/CPIE_SCORES_MAPEAMENTO.md` (570 linhas · v1/v2/CPIE-B/Score v4 desambiguados · achado: 0/2367 projetos analisados — débito operacional)
  - **Suite de testes Z-20 (PR #718)** ⏳ ABERTA · Bateria 1 PASS (33/33 unit · 10/10 aferição · Gate 7 4/4) — **estratégia reavaliada:** sistema estava "razoável a bom", overengineered para 4 baterias. Decisão P.O. 2026-04-18: declarar vitória, não rodar B2/B3/B4 formais, ir direto ao caso real do advogado.
  - **Governança:** REGRA-ORQ-19 (F4 automático após F3) + REGRA-ORQ-20 (Manus não edita Claude Code sem F0) esboçadas — pendentes PR formal
  - **Débito operacional CI:** `OAUTH_SERVER_URL` e `OPENAI_API_KEY` ausentes em GitHub Actions → "Run Unit Tests" FAIL sistemático em todos PRs
**Sprint Z-21:** ✅ ENCERRADA · Cascata Soft Delete + Bateria 3 · PRs #722 · HEAD f08dfc1 · Issues #719 + #720
  - **Bug cascata descoberto pela B1 Gate 0 da Z-20** — `deleteRisk` e `restoreRisk` não cascateavam para `action_plans` e `tasks`. Violação RN-CONSOLIDACAO-V4 §14 + RI-07. Bug existia desde Z-07.
  - **Fix #719** ✅ MERGED (#722 → 0ff2337) — `softDeleteRiskWithCascade` + `restoreRiskWithCascade` em `db-queries-risks-v4.ts`. Audit_log N+1+M (risco + planos + tasks). Validação ATIVA comprovada pelo Manus: `task/restored = 3 ✅` após restore via tRPC real.
  - **Fix colateral Manus (0c3c07f):** `status='pending'` → `status='todo'` em restore de tasks (enum correto). Bug meu herdado do 4a13cde.
  - **Issue #720** ⏳ OPEN — F6 pendente (converter 4 `test.fixme` em executáveis após #722 merge)
  - **Lição de processo:** dupla checagem Claude+Manus pegou 3 incidentes (D8 falso positivo · status pending bug · explanação incoerente audit_log task) · Adoção de (R1) output bruto + (R2) audit_log evidence em reports
**Sprint Z-22 (Wave A.2+B):** ✅ ENCERRADA · CPIE DROP completo · PR #737 MERGED (admin · 17 SUCCESS + 2 FAILURE pré-existentes) · HEAD 94c5537 · 2026-04-20
  - **SPEC-CPIE-V3-DASHBOARD-COMPLIANCE v1.1** + **ADR-0029** drop strategy (hashes aprovados `c8914f16...` / `e63168b2...` · Errata F6.1)
  - **24 arquivos deletados:** backend (cpie.ts · cpie-v2.ts · cpie-v2-evidence*.ts · cpieRouter · cpieV2Router · scoringEngine · monthlyReportJob · 6 testes órfãos · 3 scripts) · frontend (CpieScoreBadge · CpieBatchPanel · CpieHistoryPanel · CpieSettingsPanel · AdminCpieDashboard) · raiz (cpie_stress_runner.ts) · CpieReportExport
  - **14 arquivos modificados:** App.tsx · routers.ts · NovoProjeto.tsx (-488 linhas · gate CPIE v2 removido) · PerfilEmpresaIntelligente.tsx · ComplianceDashboardV3 · ScoreView redirect · Painel · AdminConsistencia · ProjetoDetalhesV2 · DiagnosticoStepper · routers-bateria-avancada.test.ts
  - **3 exceções limitadas (ADR-0029):** EX-1 `server/_core/index.ts` (import initMonthlyReportJob) · EX-2 `routers-fluxo-v3.ts` (persistCpieScoreForProject) · EX-3 DROP COLUMN projects (4 colunas profile*)
  - **Migration 0088** `drop_cpie_legado.sql` aplicada no dev Manus · backup 102MB preservado · **invariante RAG 2515 → 2515 ✅**
  - **Fixes UAT pré-merge:** B-01 SectionLink duplicado (ProjetoDetalhesV2) · B-02a título renomeado · B-02b rota `/compliance-v3/*` removida (9 rotas) · B-03 statusMap expandido 6 status pós-aprovação
  - **Bug pós-merge:** `/projetos/:id` 404 por dessincronia schema↔DB · resolvido com migration 0088 + restart dev · UAT destravada
  - **Issues abertas pós-merge:** #739 débito B-03 statusMap · #740 UAT B-04 botão Exposição · #741 badge Exposição nos cards · #742 filtro Score IA órfão · #743 escopo "página completa" (carry-over)
  - **Lição Z-22:** drop destrutivo em sprint ativa ≠ comentar código. Custo real 10× estimado (triple review · 2 empty commits · admin merge · 7.8KB→102MB backup · bloqueio UAT). Regra proposta para próximas: **comentar agora, dropar em janela dedicada pós-sprint**.
**Sprint Z-22 (UAT Wave FINAL):** ✅ ENCERRADA · 39 PRs briefing/UX/risco/score · 2026-04-20 · HEAD `ab88497` · checkpoint Manus `9eefcf85` (v7.42)
  - **Métricas da sessão:** 39 PRs mergeados (#744–#792) · 81 unit tests novos · 9 issues resolvidas · 2 hotfixes P0 (#778 projectName, #792 useMemo) · 5 issues abertas no backlog
  - **Pacote briefing (15 PRs):** #763 (4 bugs UAT) · #764 (prefix NCM/NBS + determinismo T0) · #765 (ConfidenceBar + retry toast + classificação severidade) · #768+#770 (NCM/NBS no prompt + parse operationProfile) · #772 (audit evidência fontes) · #773 (confidence determinístico — Closes #771) · #775 (enriquecer prompt com Onda 1/2/Q.Produtos/Q.Serviços — Closes #774) · #779 (complement→RAG+prompt) · #786 (correction também antes do prompt) · #787 (BUG-1+BUG-3 dismiss/approval lifecycle) · #788 (BUG-4 generationCount regress) · #789 (regras fixas artigos críticos — #785 item F) · #790 (consolidar gaps por artigo — #780 item 1) · #791 (detector geo + RAG boost — #785 item G)
  - **Novas features deployadas:** #776 (resumo WhatsApp 6 áreas — Closes #767) · #777 (Trilha de Auditoria UI — Closes #766) · #781 (gate ≥85% confiança + aprovação com ressalva) · #782 (Histórico versões expand) · #784 (Exportar Riscos CSV — Closes #783)
  - **Lição estrutural:** 2 crashes P0 em 24h pela mesma causa raiz (`@ts-nocheck` em BriefingV3.tsx suprimindo ReferenceError) → issue #793 aberta para migração em snapshot→cold→hot, com decision gate pós-UAT em #794
  - **Confidence patamar P.O.:** ≥85% é mínimo aceitável. Abaixo disso → modal de ressalva obrigatório (#781)
  - **Issues abertas pós-encerramento:**
    - **#796** (P HIGH) — compliance score cravado em 66% (engine v4 produz severidade homogênea — ponto fixo matemático `7·0.85/9·100=66`) · próximo alvo da próxima sessão
    - **#795** (P low) — UX "Versão 2" em primeiro teste de projeto limpo
    - **#793** (tech-debt alta) — migração `@ts-nocheck` de 20 arquivos · snapshot→cold→hot
    - **#794** (governance) — decision gate pós-UAT
    - **#785** (P3) — corpus enrichment RAG item B (Sprint dedicado)
  - **UAT final validado em produção (v7.42):** briefing nominal com NCMs 1006.40.00/1507.90.11/2202.10.00 cita Art. 9 (cesta básica), Art. 2 (IS bebidas açucaradas), Art. 8 (exportação proativa), Art. 10/11 (fato gerador), Art. 14/15 (IBS interestadual), Art. 21 §1º (cadastral) · confiança 90% determinística · complement MT funcionando · Compartilhar Resumo OK · Histórico versões expansível OK

**Sprint Z-22 (UAT Wave — snapshot histórico inicial):** 10 PRs · HEAD `5a4ac1e`
  - **#755 hero card Exposição ao Risco** (PR #755) — ProjetoDetalhesV2 ganha hero card via `ExposicaoRiscoBadge` (scoringData engine v4).
  - **#756 compliance-dashboard linkage** (PR #756) — remove banner contraproducente e restaura link do dashboard (#743).
  - **#757 docs CSV SOLARIS consultor** (PR #757) — fluxo E2E + spec CSV Onda 1 para consultor jurídico.
  - **#758 prefix buttons SOLARIS (Onda 1)** (PR #758) — botões Sim/Não/N.A. com prefixo determinístico (A2).
  - **#759 prefix buttons IA Gen (Onda 2)** (PR #759) — mesmo padrão aplicado à Onda 2.
  - **#760 paginação /projetos** (PR #762 P0) — paginação server-side, alivia carga com projetos em massa.
  - **#763 briefing 4 bugs UAT** (PR #763) — B1 `additionalInfo`→`complement` silenciosamente descartado; B2 botão "Resolver" inconsistência; G2 audit log de regeneração; G5 confirmação antes de regenerar.
  - **#764 prefix NCM/NBS + determinismo T0** (PR #764) — Questionário Produtos/Serviços ganha Sim/Não/N.A.; T1 temperatura 0; N1b regra de determinismo; N2 separa inconsistência × limitação; N5 esconde banner após aprovação; UX2 disable btn.
  - **#765 UX1 ConfidenceBar + UX3 toast retry + classificação severidade server-side** (PR #765) — ConfidenceBar visual (≥85/70/<70), toast "Gerando... tentativa 2/3", `classifyInconsistenciaImpacto` heurística determinística.
  - **#768 NCM/NBS fontes completas no briefing** (PR #768) — `completeProductQuestionnaire/completeServiceQuestionnaire` aceitam `pergunta_texto` + `ncm_code`/`nbs_code` opcionais; `buildProductServiceLayers` prefixa `[NCM xxx]`/`[NBS xxx]`; `companyProfileBlock` e `generateBriefingFromDiagnostic` incluem NCMs/NBS do `operationProfile`. **Root cause UAT:** códigos NCM/NBS nunca chegavam ao prompt — corrigido sem schema change.
  - **Issues abertas (backlog):** #766 UI Trilha de Auditoria · #767 resumo briefing formato WhatsApp (6 áreas: genérico/fiscal/TI/contabilidade/legal/gestão) · #761 cleanup comentários CpieReportExport · #752 Drizzle journal drift (Z-23).
  - **Determinismo do briefing:** temperatura 0 + regras objetivas N1b/N2 + classificação server-side → eliminam variabilidade observada em UAT (2→1→2 inconsistências em gerações consecutivas).

**Sprint Z-22 (carry-over):** ✅ ENCERRADA · 3 issues fechadas + 1 PR cobertura · 2026-04-20 · HEAD 56e403c
  - **#739 statusMap currentStep** (PR #745 → 44eace5) — projectStatusToStepState aceita currentStep opcional. Para status pós-aprovação com currentStep<8, deriva honestamente em vez de marcar tudo como completed. Cenário (admin force em_andamento + currentStep=1) agora exibe 1/8 em vez de 8/8.
  - **#742 filtro Score IA órfão removido** (PR #746 → 80ca31b) — `<Select>` "Filtrar por Score IA" lia `projects.profileCompleteness` dropada na 0088. SCORE_FILTER_OPTIONS, matchesScoreFilter, ScoreIaBadge, sortedProjects, scoreFilter state, import Brain — todos removidos. Decisão P.O.: opção (a) remover; reintrodução com engine v4 ficou para #741.
  - **#741 badge Exposição nos cards** (PR #747 → 56e403c) — novo componente `ExposicaoRiscoBadge` lê `projects.scoringData` (engine v4 ADR-0022, preservada na 0088). 5 estados: Crítica/Alta/Média/Baixa/Sem análise. Substitui semanticamente o CpieScoreBadge dropado, sem reintroduzir CPIE legado. Sem custo de query extra.
  - **#720 cobertura E2E cascade** (PR #748 — aberto) — 4 `test.fixme` em `soft-delete-cascade.spec.ts` convertidos em testes executáveis. CT-1: cascata risk→action_plans · CT-2: cascata risk→tasks · CT-3: audit_log N+1+M · CT-4: restore RI-07. Validação via tRPC (não DOM). Cleanup automático.
  - **Pendências P.O./Manus:** #740 UAT B-04 botão Exposição (P.O. testar projeto novo) · #743 escopo "página completa exposição" (P.O. especificar) · Migration 0088 produção (Manus janela manutenção bloqueada por deploy).
**Snapshot Matriz + CPIE:** consolidação documental — base para sprints futuras tocarem risco ou CPIE
**UAT E2E:** ✅ COMPLETO — projeto 2851328 (Distribuidora Alimentos Teste) · 2026-04-06 · PIPELINE VALIDADO EM PRODUÇÃO
**BUG-UAT-06:** ✅ CORRIGIDO (PR #352) — coluna "Descrição do Risco" no Relatório Final PDF agora exibe `r.evento` corretamente
**M2.1:** ✅ CONCLUÍDO (PR #354) — banner de completude diagnóstica no briefing + bloco PDF
**M3 Fase 1:** ✅ CONCLUÍDO (PR #357) — `computeCompleteness` · 7 fontes · `inferCompanyType` · 28 testes

---

## Para o Manus (implementador)

- **Branch base:** main · **HEAD:** `ab88497` · **checkpoint Manus:** `9eefcf85` (v7.42)
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
| HEAD (github/main) | `56e403c` | ✅ |
| Baseline | **v7.15** | ✅ |
| Testes passando | tsc 0 erros · 61 unit + 39 E2E (6 UI refinements + cascata) | ✅ |
| TypeScript | 0 erros | ✅ |
| PRs mergeados (total) | **710 (sessão 16-17/abr: PRs #617–#710)** | ✅ |
| Gate 0 (banco) | **CONFIAVEL** — DATA_DICTIONARY 60 campos · db-schema-validator · verificacao dupla banco vs migration | ✅ |
| Gate UX (frontend) | **CONFIAVEL** — UX_DICTIONARY + ux-spec-validator + mockup HTML obrigatorio | ✅ |
| Gate Spec (5 labels) | **ATIVO** — CI bloqueia PR sem spec-bloco9/adr/contrato/e2e/aprovada | ✅ |
| Modelo Orquestracao | **v1.1** — F0–F7 + F4.5 · 11 regras · CI/CD · Sprint Log · mockup HTML | ✅ |
| CI Workflows | **17 ativos** (validate-pr + project-automation) | ✅ |
| Issue Templates | **5** (sprint-issue com 12 blocos + ADR/Contrato/E2E) | ✅ |
| Sprint Z-14 | **ENCERRADA** — 16 issues · catalogo PLANS · cat-divider · mockups HTML v2 · 9 CTs E2E · 16 regras ORQ | ✅ |
| Sprint Z-15 | **ENCERRADA** — 4 issues · RAG badge · plans preview · AI suggestion · fix L1107 · PRs #599–#607 | ✅ |
| Sprint Z-16 | **ENCERRADA** — 9/9 issues · Gate 7 PASS · deploy 8620bd66 · PRs #617–#651 · 18 regras ORQ · CI PRE-CLOSE + POST-MERGE | ✅ |
| Sprint Z-17 | **ENCERRADA** — 3 issues + 12 hotfixes + governança · PRs #655–#695 · E2E 21/21 · CRUD 6/6 · CI TiDB + LLM gates | ✅ |
| Sprint Z-18 | **ENCERRADA** — 3/3 issues + governance · PRs #697–#710 · E2E 33 · board automation · Checkpoint 56b495bf | ✅ |
| Sprint Z-19 | **ENCERRADA** — UI refinements ActionPlanPage · PR #714 (#712) · 6 ajustes P.O. · E2E 6 CTs · HEAD 6b5bbfe | ✅ |
| Sprint Z-20 | **PARCIAL** — Snapshot Matriz + SPEC + CPIE doc (#716 #721 MERGED) · Suite B1 PASS (33/33 · 10/10 · Gate 7 4/4) · B2/B3/B4 canceladas (overengineered · sistema "razoável a bom" · decisão P.O. 2026-04-18) | 🟡 |
| Sprint Z-21 | **ENCERRADA** — Cascata soft delete (#719 → PR #722 MERGED) · validação ativa comprovada pelo Manus · Issue #720 OPEN (4 fixme → executáveis) · HEAD f08dfc1 | ✅ |
| Sprint Z-22 (A.2+B) | **ENCERRADA** — CPIE DROP completo · PR #737 MERGED (admin) · 24 deletes + 14 modifies · Migration 0088 aplicada dev · RAG 2515 preservado · 4 fixes UAT (B-01..B-04) · 5 issues abertas pós-merge (#739-#743) · HEAD 94c5537 | ✅ |
| Sprint Z-22 (carry-over) | **ENCERRADA** — 3 issues fechadas (#739/#741/#742) via PRs #745/#746/#747 + #748 (#720 cobertura E2E) · ExposicaoRiscoBadge engine v4 · statusMap currentStep dinâmico · filtro Score IA órfão removido · HEAD 56e403c | ✅ |
| Regras ORQ | **18** (ORQ-00..18) · RN riscos + planos + consolidação · FLOW_DICTIONARY · 4 dicionarios | ✅ |
| Mockups HTML | **6** (Z-07: 2 + Z-15: 2 + Z-16: 2 com data-testid) no repo | ✅ |
| CI Workflows | **20 ativos** (validate-pr + pre-close-checklist + post-merge-gate + llm-integration-gate + project-automation + taskboard-automation) | ✅ |
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

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-20 (v7.15 · Sprint Z-22 carry-over fechado · PRs #745/#746/#747 mergeados + #748 aberto · HEAD 56e403c)*  
*PRs mergeados total: 710 · Hot swap ADR-0022: COMPLETO · Board automation: ATIVO · E2E: 33 CTs*  
*Novas entregas Z-18: #698 (hot swap) · #702 (PDF) · #706 (restore) · #710 (governance automation)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
