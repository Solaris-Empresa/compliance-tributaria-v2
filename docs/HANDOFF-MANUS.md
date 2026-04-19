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

## Estado atual do projeto (2026-04-19)
- BASELINE **v7.13** — Sprint Z-22 Wave A.1 EM ANDAMENTO · E2E 5/5 PASS
- **HEAD: `5775d1d` (branch `feat/z22-725-cpie-v3-wave-a1`)** · **Checkpoint Manus:** `e77bd842`
- **PRs mergeados:** 726 · **TypeScript:** 0 erros · **Unit tests:** 1717 passed / 9 skipped (1 falha conhecida: b-z11-012-evidence)
- **Bundle:** ~1.4MB gzipado (vendor 761KB) — redução de 63% vs baseline Z-20
- **streamdown:** REMOVIDA (PR #726) → `MarkdownRenderer.tsx` (react-markdown + remark-gfm)
- **Corpus RAG:** 2.515 chunks · 13 leis · 100% confiabilidade
- **Skill solaris-contexto:** v4.7 · **Skill solaris-orquestracao:** v3.2
- **Perguntas SOLARIS ativas:** 24 (SOL-013..036)
- **Pipeline E2E:** T1 ✅ T2 ✅ validados em produção · Suite E2E automatizada 21 casos ✅ (Z-17)
- **Contratos M1:** CNT-01a/01b/02/03 em `docs/contracts/`
- **Governança:** CODEOWNERS (15 entradas) + branch-scope + file-declaration + autoaudit + REGRA-ORQ-12/13 + ORQ-17
- **Datasets:** `nbs-2-0-utf8.csv` no repo · `lc214-2025.pdf` no sandbox
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- Branch protection: ativa (ruleset `main-protection`)
- **UAT E2E:** ✅ COMPLETO — projeto 2851328 (Distribuidora Alimentos Teste) · 2026-04-06
- **risk_categories:** 9 categorias ativas · 10 no banco (1 inativa)
- **ADR-0025:** ✅ VIGENTE — FK risks_v4.categoria → risk_categories.codigo
- **Sprints encerradas:** Z-07 ✅ · Z-08 ✅ · Z-09 ✅ · Z-10 ✅ · Z-11 ✅ · Z-12 ✅ · Z-13 ✅ · Z-14 ✅ (16 issues) · Z-15 Lote A ✅ · Z-16 ✅ (9/9 issues) · Z-17 ✅ · Z-18 ✅ (3/3 issues) · **Z-19 ✅** · **Z-20 ✅** · **Z-21 ✅ (bundle -63% + streamdown removido)**
- **Sprint Z-22 Wave A.1:** Issue #725 · PR #729 mergeado · E2E 5/5 PASS (22.9s) · Deploy BLOQUEADO (fila Manus — abrir ticket help.manus.im)
- **⚠️ DEPLOY BLOQUEADO:** Botão "Publicando..." no Manus nunca conclui para `compliance-tributaria-v2` (iasolaris.manus.space). Abrir ticket em https://help.manus.im mencionando checkpoint `e77bd842`. NÃO tentar re-deploy até suporte destravar a fila.

### Sprint Z-15 Lote A — Estado final (2026-04-15)
| Issue | Título | Status |
|---|---|---|
| #598 | fix L1107: texto duplicado "riscos os riscos" no modal bulkApprove | ✅ PR #605 mergeado |
| #600 | RAG badge: rag-badge-validated / rag-badge-pending no card de risco | ✅ PR #605 mergeado |
| #601 | Plans preview: miniatura dos planos inline no card (data-testid="plans-preview") | ✅ PR #607 mergeado |
| #602 | Sugestão da IA: botão determinístico (PLANS exportado, sem LLM) | ✅ PR #607 mergeado |

**Checkpoint:** `2d203e06` · HEAD `78955e2` · tsc 0 erros · HTTP 200 · Deploy aguardando Publish P.O.

**Migration aplicada no banco:** `ALTER TABLE action_plans MODIFY COLUMN prazo ENUM(+180_dias)` — ENUM confirmado: `enum('30_dias','60_dias','90_dias','180_dias')`

**Limpeza de base executada:** tasks=0 · action_plans=0 · audit_log=0 · risks_v4 active=10 (apenas E2E) · projects=1 (id=270001) · RAG preservado (2.515 chunks)

## ADR-0016 — Estado atual (2026-04-07)

### Etapas concluídas

| Etapa | Entregável | PR | Status |
|---|---|---|---|
| 1 | Schema: 4 colunas skip (`solarisSkippedIds`, `iagenSkippedIds`, `solarisSkippedAll`, `iagenSkippedAll`) + migration 0062 | #391 | ✅ |
| 1-B | `VITE_GIT_SHA` injetado no build via `vite.config.ts` + `health.ts` | #391 | ✅ |
| 2 | `server/lib/questionnaire-completeness.ts` — tipos canônicos + funções (`computeState`, `computeConfidenceLevel`, `computeDiagnosticConfidence`) | #391 | ✅ |
| 3 | 3 procedures: `skipSolarisQuestion`, `skipIagenQuestion`, `skipQuestionnaire` | #391 | ✅ |
| 4 | Frontend: botões "Pular pergunta" + "Pular questionário" + modal confirmação; label "Obrigatória" removido | #391 | ✅ |

### data-testid implementados (Etapa 4)

| data-testid | Componente |
|---|---|
| `btn-pular-pergunta-{questionId}` | QuestionarioSolaris + QuestionarioIaGen |
| `btn-pular-questionario-solaris` | QuestionarioSolaris |
| `btn-pular-questionario-iagen` | QuestionarioIaGen |
| `modal-confirmar-pular-questionario` | QuestionarioSolaris + QuestionarioIaGen |
| `btn-confirmar-pular` | Modal compartilhado |
| `btn-cancelar-pular` | Modal compartilhado |

### Etapas pendentes (aguardando prompt do Orquestrador)

| Etapa | Entregável | Status |
|---|---|---|
| 5 | Badge de confiança no `DiagnosticoStepper` — exibir `ConfidenceLevel` calculado | ⏳ pendente |
| 6 | GET `/briefing` retorna campo `confidence` no payload | ⏳ pendente |
| 7 | Testes E2E Playwright para botões de skip | ⏳ pendente |

### Guia de testes manuais E2E — ADR-0016 Etapa 4

**URL de produção:** https://iasolaris.manus.space

**Cenário 1 — Pular pergunta individual (SOLARIS)**
1. Abrir projeto em andamento → navegar até Questionário SOLARIS (Onda 1)
2. Verificar que badge "Obrigatória" **não aparece** em nenhuma pergunta
3. Clicar em "Pular esta pergunta" (`btn-pular-pergunta-{questionId}`) → pergunta marcada como pulada
4. Progresso avança sem exigir resposta

**Cenário 2 — Pular questionário inteiro (SOLARIS)**
1. No rodapé do Questionário SOLARIS, clicar em "Pular questionário" (`btn-pular-questionario-solaris`)
2. Modal aparece (`modal-confirmar-pular-questionario`)
3. Testar "Cancelar" (`btn-cancelar-pular`) → modal fecha, questionário permanece
4. Testar "Confirmar" (`btn-confirmar-pular`) → questionário avança para próxima etapa

**Cenário 3 — Pular pergunta individual (IA Gen)**
1. Avançar até Questionário IA Gen (Onda 2)
2. Verificar ausência do badge "Obrigatória"
3. Clicar em "Pular esta pergunta" (`btn-pular-pergunta-{questionId}`) → comportamento idêntico ao Cenário 1

**Cenário 4 — Pular questionário inteiro (IA Gen)**
1. No rodapé do Questionário IA Gen, clicar em "Pular questionário" (`btn-pular-questionario-iagen`)
2. Fluxo idêntico ao Cenário 2

**Resultado esperado em todos os cenários:** projeto avança sem bloqueio; diagnóstico gerado com aviso de confiança reduzida.

## Lembrete: Bug encontrado e corrigido na Sprint S

> **iagen-gap-analyzer:** usar conteúdo da resposta (não `confidence_score`) para detectar gap.  
> Padrão G17: `startsWith('não') = gap`. Fix: `isNonCompliantAnswer` (PR #295).  
> Lição: `confidence_score` mede certeza do LLM na interpretação, não status de compliance da empresa.

## Documentos P0/P1 — atualizar SEMPRE após sprint concluída
| Prioridade | Arquivo | O que atualizar |
|---|---|---|
| **P0** | `docs/governance/ESTADO-ATUAL.md` | HEAD, commits, PRs, sprints, indicadores |
| **P1** | `docs/BASELINE-PRODUTO.md` | Versão, HEAD, indicadores técnicos, histórico |
| **P1** | `docs/HANDOFF-MANUS.md` (este arquivo) | Estado atual, PRs recentes, próximas sprints |

## Regras obrigatórias de governança
1. **SEMPRE** criar branch a partir do HEAD remoto (`solaris/main`), nunca do local
2. **NUNCA** fazer push direto em main
3. **NUNCA** alterar a ordem de lotes sem reportar ao Orquestrador ANTES
4. **NUNCA** ativar `DIAGNOSTIC_READ_MODE=new` sem aprovação do P.O.
5. **NUNCA** executar F-04 Fase 3 sem aprovação do P.O.
6. **NUNCA** executar DROP COLUMN sem aprovação do P.O.
7. Todo PR deve ter template preenchido com JSON de evidência
8. Apenas arquivos do escopo declarado por PR

## Gate 7 — Auto-auditoria antes de todo PR
- Q1 Branch limpa de `origin/main` ✅
- Q2 Apenas arquivos do escopo declarado ✅
- Q3 Sem DROP COLUMN, sem DIAGNOSTIC_READ_MODE ✅
- Q4 Testes Q5 criados ✅
- Q5 `pnpm test:unit` passando ✅
- Q6 Commit com evidências JSON ✅
- Q7 Gate 7 executado ✅
- **Q8 Ordem de lotes respeitada** ✅ *(nova regra — Sprint S)*

## Sprint T Pré-M1 — Estado final

| PR | Bloco | Entregável | Status |
|---|---|---|---|
| #302 | FIX-TS2339 | `resposta: string` em `gapsToInsert` | ✅ |
| #303 | Bloco A | `decision-kernel/datasets/.gitkeep` + `artifacts/poc-m1/README.md` | ✅ |
| #304 | GOV-02 | `branch-scope-check.yml` | ✅ |
| #305 | GOV-03a | CODEOWNERS 15 entradas | ✅ |
| #306 | GOV-03c | PR template + `file-declaration-check.yml` | ✅ |
| #307 | GOV-03d | `autoaudit-check.yml` | ✅ |
| #308 | Bloco B | CNT-01a/01b/02/03 contratos M1 | ✅ |
| #309 | GATE-EXT-01 | NBS 2.0 CSV + README datasets | ✅ |

## Sprint S — Estado final
| Lote | AUDIT | Entregável | PR | Status |
|---|---|---|---|---|
| C | — | Hard delete projetos legados (1.705) | Sem PR | ✅ |
| B | C-003 | `persistCpieScoreForProject` backend | #292 | ✅ |
| E | C-004 | `briefingEngine` lê `actionPlans` (401 reg.) | #292 | ✅ |
| A | C-002 | `iagen-gap-analyzer.ts` + `completeOnda2` | #292 | ✅ |
| D | — | Upload 5 leis corpus RAG (376 chunks) | #294→#296 | ✅ |
| Fix | M-007 | `isNonCompliantAnswer` — bug confidence_score | #295 | ✅ |

## Pendências abertas (pós Sprint Z-15 Lote A)

| Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|
| P0 | Testes manuais do P.O. em iasolaris.manus.space (Checkpoint 2d203e06) | P.O. Uires Tapajós | Aguardando Publish |
| P1 | Sprint Z-15 Lote B — identificar e planejar próximas issues | Orquestrador | Após testes manuais |
| P2 | Fix Bug #545 — imports dinâmicos em diagnostic-source.test.ts (2 linhas) | Manus | — |
| P3 | IN RFB 2.121/2022 (~200 chunks) | Manus | — |
| P4 | BL-06: vi.mock path mismatch em routers-fluxo-v3-etapas2-5.test.ts | Manus | — |

## Corpus RAG — 13 leis (2.515 chunks)
lc214 (1.573) · lc227 (434) · conv_icms (278) · lc116 (60) · lc224 (28) ·
cg_ibs (26) · lc123 (25) · ec132 (18) · rfb_cbs (7) · lc87 (5) ·
resolucao_cgibs_001 (2) · resolucao_cgibs_002 (2) · resolucao_cgibs_003 (2)

## Conflito recorrente
`client/public/__manus__/version.json` — resolver via `git restore --staged client/public/__manus__/version.json`

*Atualizado em 2026-04-15 · v2.3 · Sprint Z-15 Lote A · PRs #598–#607 · Aprovador: P.O. Uires Tapajós*

---

## Sprint Z-16 — Estado final (2026-04-16) · Gate 7 PASS

| Issue | Título | PR | Status |
|---|---|---|---|
| #611 | fix fallback PLANS por categoria | #632 | ✅ mergeado |
| #622 | calculateComplianceScore v4 | #634 | ✅ mergeado |
| #624 | ConsolidacaoV4 Step 7 completo | #637 | ✅ mergeado |
| #625 | redirect ActionPlan → ConsolidacaoV4 | #635 | ✅ mergeado |
| #626 | PDF diagnóstico jsPDF client-side | #638 | ✅ mergeado |
| #615 | modal excluir tarefa (soft delete + motivo) | #636 | ✅ mergeado |
| #614 | migration tasks NOT NULL (Opção C) + modal editar tarefa | #639 + #648 | ✅ mergeado |
| #613 | instrumentação data-testid ActionPlan (40+ seletores) | #647 | ✅ mergeado |
| #616 | ordenação urgência DESC + badge Atrasada | #649 | ✅ mergeado |

**Gate 7 Smoke Tests (REF_ID=270001):**
- PROVA 1 — COUNT: 10 ✅ PASS (10 <= N <= 40)
- PROVA 2 — CATEGORIAS: aliquota_zero, split_payment, imposto_seletivo, credito_presumido ✅ PASS
- PROVA 3 — TÍTULOS SUJOS: 0 ✅ PASS
- PROVA 4 — RAG: 10/10 (100.0%) ✅ PASS

**Checkpoint:** `8620bd66` · HEAD `04eefdd` · tsc 0 erros · 1665 testes · Deploy iasolaris.manus.space ✅

**tasks.data_inicio / data_fim:** DATE NOT NULL (Opção C) — SHOW COLUMNS verificado 2026-04-16:
```
data_inicio | date | Null: NO | Default: null
data_fim    | date | Null: NO | Default: null
```

---

## Sprint Z-17 — Estado final (2026-04-17) · Gate E2E PASS

### Bugs corrigidos

| PR | Título | Status |
|---|---|---|
| #674 | fix(engine): extractJsonFromLLMResponse suporta arrays [] + geração retroativa de tarefas | ✅ mergeado |
| #677 | test(e2e): Z-17 suite 21/21 PASS — fixtures robustos + CT-04b + timeouts produção | ✅ mergeado |

### Gate E2E Z-17 (PR #677)

```
21/21 PASS em 5.8min — EXIT_CODE=0
Produção: https://iasolaris.manus.space
Data: 2026-04-17
```

**Correções no spec:**
- `fixtures/auth.ts`: `page.request` em vez de `playwrightRequest.newContext` (evita browser close)
- CT-02/CT-03: `confirmCnaes` + `skipQuestionnaire` via API (fluxo real do usuário)
- CT-04b: novo CT — completar 3 camadas de diagnóstico antes do briefing
- CT-19: verifica aba Histórico existe (audit log LLM = sprint futura)
- `beforeEach`: `setTimeout` Node em vez de `page.waitForTimeout` no retry
- Todos os CTs: `networkidle` → `domcontentloaded` (produção com polling ativo)
- Timeouts: 30s → 60s em todos os CTs; CT-05 → 120s (geração LLM)

### Pendências abertas (pós Z-17)

| Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|
| P0 | Investigar botão "Ver Consolidação" — aparece após aprovar todos os planos individualmente; confirmar se era visível antes em outros estados | P.O. + Orquestrador | Aguardando análise |
| P1 | Audit log de eventos LLM (criação automática de tarefas) — feature de sprint futura | Manus | — |
| P2 | Testar aprovação individual de risco → geração de plano/tarefas | P.O. | — |
| P3 | Fix Bug #545 — imports dinâmicos em diagnostic-source.test.ts | Manus | — |

**Checkpoint:** `34a0bae3` · HEAD `d3ea681` · tsc 0 erros · E2E 21/21 PASS · Deploy iasolaris.manus.space ✅

**Banco limpo:** dados legado removidos (65 tabelas) · RAG preservado (2.515 chunks) · 2026-04-17

---

## Sprint Z-18 — Estado final (2026-04-17) · Gate 7 PASS 5/5

### Issues entregues (3/3)

| Issue | Título | PR | Status |
|---|---|---|---|
| #697 | feat(hub): hot swap plano-v3 → planos-v4 em ProjetoDetalhesV2 | #698 | ✅ mergeado — ADR-0022 fechado |
| #701 | feat(consolidacao): integração botão PDF (generateDiagnosticoPDF) | #703 | ✅ mergeado — placeholder removido |
| #705 | feat(action-plan): restore plano deletado (restoreActionPlan + audit_log) | #706 | ✅ mergeado — 2 PASS + 2 SKIP |

### PRs tooling e docs

| PR | Título | Status |
|---|---|---|
| #700 | chore: ignorar artefatos playwright do git | ✅ mergeado |
| #704 | chore(tooling): GitHub MCP + post-edit-lint | ✅ mergeado — E2E 4/4 PASS |
| #707 | docs(checkpoint): v7.9 — Sprint Z-18 completa | ✅ mergeado |

### Gate 7 Smoke Tests (project_id=930001 / tasks: project_id=840935)

```
PROVA 1 — riscos ativos: 10 ✅ PASS (10 <= N <= 40)
PROVA 2 — categorias: obrigacao_acessoria, aliquota_zero, imposto_seletivo, inscricao_cadastral, credito_presumido ✅ PASS
PROVA 3 — títulos sujos: 0 ✅ PASS
PROVA 4 — RAG validado: 10/10 (100.0%) ✅ PASS
PROVA 5 — tasks projeto 840935: 25 ✅ PASS (>= 10)
Gate 7: PASS 5/5
```

**Nota técnica:** coluna real no schema é `categoria` (não `risk_category_code`). Spec do Gate 7 deve ser atualizada na próxima sprint.

### Pendências abertas (pós Z-18)

| Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|
| P0 | Investigar botão "Ver Consolidação" — aparece após aprovar todos os planos individualmente | P.O. + Orquestrador | Aguardando análise |
| P1 | Audit log de eventos LLM (criação automática de tarefas) — feature de sprint futura | Manus | — |
| P2 | Testar aprovação individual de risco → geração de plano/tarefas | P.O. | — |
| P2 | Atualizar spec Gate 7 PROVA 2: `risk_category_code` → `categoria` | Orquestrador | — |
| P3 | Fix Bug #545 — imports dinâmicos em diagnostic-source.test.ts | Manus | — |

**Checkpoint:** `ba7e7af2` · HEAD `b387bbb` · tsc 0 erros · E2E 37 CTs · Gate 7 5/5 PASS · Deploy iasolaris.manus.space ✅

*Atualizado em 2026-04-17 · v2.4 · Sprint Z-18 · Aprovador: P.O. Uires Tapajós*
