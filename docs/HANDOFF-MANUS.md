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

## Estado atual do projeto (2026-05-02)
- BASELINE **v8.1** — Sprint M3 ENCERRADO · Smoke Regressivo PASS
- **HEAD: `bc649fa` (github/main)** · **Checkpoint Manus:** `b4dd3cda`
- **PRs mergeados:** 691 (closed) · **TypeScript:** 0 erros · **Open PRs:** 0
- **Bundle:** ~1.5MB (dist/index.js) + 5.2MB frontend
- **Corpus RAG:** 2.515 chunks · 13 leis · 100% confiabilidade
- **Skill solaris-contexto:** v4.7 · **Skill solaris-orquestracao:** v3.2
- **Perguntas SOLARIS ativas:** 24 (SOL-013..036)
- **Schema:** 69 exports · 89 migrations (última: 0089_enquadramento_geral_categoria)
- **Contratos M1:** CNT-01a/01b/02/03 em `docs/contracts/`
- **Governança:** CODEOWNERS (15 entradas) + branch-scope + file-declaration + autoaudit + REGRA-ORQ-12/13 + ORQ-17/25/26
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- M2_PERFIL_ENTIDADE_ENABLED: `true` (global — ativo para TODOS os roles)
- Branch protection: ativa (ruleset `main-protection`)
- **risk_categories:** 9 categorias ativas · 10 no banco (1 inativa)
- **ADR-0025:** ✅ VIGENTE — FK risks_v4.categoria → risk_categories.codigo
- **ADR-0031:** ✅ VIGENTE — Snapshot imutável Perfil da Entidade
- **DB limpo:** 0 projetos · 0 archetypes · ragDocuments 2515 preservado
- **GitHub Secrets CI:** 7 configurados (DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, 4×VITE_*)
- **Sprints encerradas:** Z-07→Z-22 ✅ · M1 ✅ · M2 ✅ · **M3 ✅ (Archetype → Engines — 8 issues, 12 PRs, ~470 LOC)**

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

---

## Sprint M1 — Arquétipo de Negócio / Runner v3 — Estado atual (2026-04-25)

### Objetivo
Deploy controlado do Runner v3 com feature flag `M1_ARCHETYPE_ENABLED=false`, tela de Perfil da Entidade (`/admin/m1-perfil`), Painel de Confiança e persistência em `m1_runner_logs`.

### Entregáveis concluídos

| Artefato | Localização | Status |
|---|---|---|
| Feature flag M1 | `server/config/feature-flags.ts` | ✅ ativo (`false` por default) |
| Router tRPC M1 | `server/routers-m1-monitor.ts` | ✅ 5 procedures |
| Tabela `m1_runner_logs` | `drizzle/schema.ts` (20 colunas) | ✅ criada no banco |
| Tela `/admin/m1-perfil` | `client/src/pages/M1PerfilEntidade.tsx` | ✅ em produção |
| Botão "Confirmar Perfil" | `M1PerfilEntidade.tsx` | ✅ `user_confirmed=true` |
| Testes Vitest | `server/m1-feature-flag.test.ts` | ✅ 12/12 PASS |
| Relatório de validação | `docs/sprints/M1-arquetipo-negocio/RELATORIO-VALIDACAO-CAMADA-CONFIANCA-v1.1.md` | ✅ PASS em produção |
| Guia de teste P.O. | `docs/sprints/M1-arquetipo-negocio/GUIA-TESTE-PO-TRANSPORTADORA-COMBUSTIVEIS.md` | ✅ executado |

### Validação em produção — PASS (2026-04-25)

Caso real: **Transportadora de Combustíveis Perigosos** — `natureza_operacao_principal=[Transporte]`, `regime=Lucro Real`, `user_confirmed=true`.

| Métrica | Resultado |
|---|---|
| `status_arquetipo` | `confirmado` ✅ |
| `score_confianca` | 100% ✅ |
| `fallback_count` | 0 ✅ |
| `hard_block_count` | 0 ✅ |
| `lc_conflict_count` | 0 ✅ |
| Fluxo `pendente → confirmado` | Validado ✅ |
| Gravação `m1_runner_logs` | OK ✅ |
| IS indevido | Não disparado ✅ |

**Veredito: PASS 9/9 — Runner v3 validado em produção controlada.**

### Commits na branch `feat/m1-archetype-runner-v3`

| Hash | Mensagem |
|---|---|
| `639937d` | feat(m1): deploy controlado Runner v3 — feature flag + monitor + tabela m1_runner_logs |
| `f4fea13` | feat(m1): adicionar confirmação explícita do Perfil da Entidade |
| `b1f6d82d` | fix(m1): alinhar drizzle/schema.ts varchar(80) (P0.1) |
| `24009d98` | fix(m1): registrar rota /admin/m1-perfil no App.tsx (Manus, fora do fluxo orquestrado — P2.W) |

### Estado do git

- Branch `main` local: `1c429950` (sincronizado com `origin/main`)
- Branch `feat/m1-archetype-runner-v3` remota: `24009d98` no GitHub (PR #847 CLOSED em 2026-04-27, supersedido por PR-A #850 + PR-B #851)
- `drizzle/schema.ts`: `perfil_hash`/`rules_hash` em `varchar(80)` ✅ aplicado em main via PR-A #850 (mergeado em 2026-04-26)

### Pendências abertas (pós M1 validação)

| Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|
| P2 | Ativar piloto via secret `M1_ARCHETYPE_ALLOWED_PROJECTS=<project_id>` | P.O. | Decisão de produto |
| P2 | Adicionar `posicao_na_cadeia_economica` ao formulário M1 | Manus | Aguarda autorização P.O. |
| P3 | Ratificar ADR-0031 e ADR-0032 (PROPOSED → ACCEPTED) | P.O. | — |

### Regras invariantes (M1)

- **NÃO alterar** `server/lib/archetype/` (runner)
- **NÃO alterar** `server/lib/decision-kernel/` (dataset NCM/NBS)
- **NÃO alterar** `validateConflicts.ts` (regras C1-C6)
- **NÃO fazer rollout global** — `M1_ARCHETYPE_ENABLED=false` por default
- **NÃO commitar** sem aprovação explícita do P.O.

**Checkpoint:** `1c429950` · tsc 0 erros · Vitest 12/12 PASS · Runner v3 PASS em produção ✅ (atualizado v7.59 · 2026-04-27)  
*Atualizado em 2026-04-25 · v7.59 · Sprint M1 · Aprovador: P.O. Uires Tapajós*


---

## Sprint M1 — Pós-split PR #847 / Estado pós-2026-04-27

### Resumo factual

O PR #847 original combinava migration (`drizzle/schema.ts` + `scripts/create-m1-table.mjs`) com domínio RAG documental (`docs/epic-830-rag-arquetipo/manifests/m1-v1.0.0.json` + `docs/epic-830-rag-arquetipo/specs/SPEC-RUNNER-RODADA-D.md`), violando estruturalmente a REGRA 5 do `changed-files-guard`.

**Decisão arquitetural:** split governado em 2 PRs com paths disjuntos. M1 Runner v3 está agora em `main` (`1c429950...`).

### Estado das branches (2026-04-27)

| Branch | HEAD | PR | Estado |
|---|---|---|---|
| `main` (GitHub) | `1c429950` | — | ✅ M1 Runner v3 completo |
| `feat/m1-archetype-runner-migration` | `42cfad37` | #850 | MERGED — schema + script |
| `feat/m1-archetype-runner-runtime` | `82c8e921` | #851 | MERGED — runtime + UI + manifest |
| `feat/m1-archetype-runner-v3` | `24009d98` | #847 | CLOSED, não mergeado, supersedido |
| `docs/handoff-v7.60` | `c0d15dcc` | #852 | CLOSED — branch obsoleta vs main |

### Incidente P2.W (2026-04-27 00:01 UTC)

Manus aplicou commit `24009d98` em PR #847 (`feat/m1-archetype-runner-v3`) fora do fluxo de orquestração. Conteúdo: alteração de 2 linhas em `client/src/App.tsx` (rota `/admin/m1-perfil`), funcionalmente equivalente ao que o PR-B #851 já contém.

**Impacto técnico:** zero. Main intocada, PR-B intocado. Branch `feat/m1-archetype-runner-v3` ficou com HEAD `24009d98` e foi closed sem merge.

### Regra P2.W — protocolo operacional

**Durante orquestração ativa de um PR, Manus NÃO toca a branch sem requisição explícita do Orquestrador via prompt formal.**

Protocolo operacional para Manus:

1. **Antes de qualquer push** em branch existente, Manus DEVE executar:
   ```bash
   git ls-remote origin <branch>
   ```
   Comparar HEAD remoto com HEAD esperado herdado do contexto da sessão. Se divergir → PARAR e reportar antes de qualquer ação.

2. **Lista de PRs/branches sob orquestração ativa** deve ser explicitada no contexto herdado de cada sessão Manus. Se a lista não estiver explícita: **considerar todas as branches `feat/*` e `docs/*` em remoto como sob orquestração** até confirmação contrária.

3. **GitHub `main` é fonte canônica** para PR/merge. `iasolaris.manus.space` sandbox pode divergir (P2.Y aberta) — qualquer divergência detectada deve ser reportada, não corrigida unilateralmente.

4. **Tipos de operação proibidos sem prompt formal do Orquestrador:**
   - `git push` em branch sob orquestração
   - `git rebase` ou `git reset` em branch remota
   - `gh pr edit` (título, body, labels) em PR sob orquestração
   - `gh pr ready` ou `gh pr merge` em PR sob orquestração
   - Aplicação de migrations em DB de produção

### Regras invariantes (M1) — mantidas + P2.W

- **NÃO alterar** `server/lib/archetype/` (runner)
- **NÃO alterar** `server/lib/decision-kernel/` (dataset NCM/NBS)
- **NÃO alterar** `validateConflicts.ts` (regras C1-C6)
- **NÃO fazer rollout global** — `M1_ARCHETYPE_ENABLED=false` por default
- **NÃO commitar** sem aprovação explícita do P.O.
- **NÃO tocar branches sob orquestração ativa** sem requisição do Orquestrador (P2.W)

### PRs sob orquestração ativa nesta sessão (2026-04-27, fechada com Prompt 27)

Após o merge deste PR documental, **nenhum PR M1 está sob orquestração ativa**. Pendências futuras (Sprint Z-15, Epic #830 fase 0 IQG) reabrirão orquestração sob coordenação explícita do P.O./Orquestrador.

**Checkpoint:** main `1c429950` · tsc 0 erros · Vitest 12/12 PASS · Suite 51 cenários 50/0/1 ✅
*Atualizado em 2026-04-27 · v7.59 · Sprint M1 pós-split · Aprovador: P.O. Uires Tapajós*

## Sprint M2 — Perfil da Entidade — Estado final (2026-05-01)

### Resumo

Módulo Perfil da Entidade implementado e validado end-to-end. Engine de 6 dimensões (objeto, papel_na_cadeia, tipo_de_relacao, território, regime, subnatureza_setorial) com inferência LLM+RAG, validação de conflitos, e confirmação imutável (ADR-0031).

### PRs mergeados (M2)

| PR | Título | Tipo |
|---|---|---|
| #876 | defense-in-depth E2E_TEST_MODE | security |
| #880 | PR-F BUG-4 financeiro | fix |
| #884 | PR-FIN-NBS gate input isenção | fix |
| #885 | PR-FIN-OBJETO deriveObjeto fallback | fix |
| #886 | PR-FIN-OBJETO-V2 deriveObjetoForSeed + computeMissingRequiredFields | fix |

### PRs mergeados (M3 — refactor + CI)

| PR | Título | Tipo |
|---|---|---|
| #889 | docs(investigation): CI_SECRETS_GAP_ANALYSIS | docs |
| #890 | docs(m3-t1): LICOES_ARQUITETURAIS | docs |
| #891 | docs(m3-t2): CPIE decision doc | docs |
| #892 | docs(pr-j): Fase 1 pré-análise (C+D) | docs |
| #893 | test(pr-j): Fase 2a snapshot behavior gates | test |
| #894 | refactor(pr-j): extract seedNormalizers | refactor |
| #895 | test(risk-engine-v4): snapshot defensivo SEVERITY_TABLE | test |
| #896 | test(ci): graceful skip DB tests via CI_HAS_TEST_DB | test |

### Smoke validados

| Smoke | Cenário | Resultado | Data |
|---|---|---|---|
| M3-PROMPT-0 | Financeiro sem NBS (equipe_solaris) | 10/10 PASS | 2026-05-01 |
| M3-PROMPT-0-BIS | Validação definitiva JSON real | PASS | 2026-05-01 |
| Smoke Regressivo Fase 2 | Pós PR-J refactor (equipe_solaris) | 10/10 PASS | 2026-05-01 |
| Caminho B (tRPC) | role=cliente programmático | HTTP 200 PASS | 2026-05-01 |

### Feature flags

| Flag | Valor | Desde |
|---|---|---|
| M2_PERFIL_ENTIDADE_ENABLED | `true` (global) | 2026-05-01 |
| E2E_TEST_MODE | `false` (prod) | 2026-04-30 |
| DIAGNOSTIC_READ_MODE | `shadow` | 2026-04-18 |

### Pendentes Sprint M3

| Item | Status | Bloqueador |
|---|---|---|
| Issue #873 (CI prod isolation) | Pronto para iniciar | Nenhum |
| PR-LISTCLIENTS-FIX (BUG dropdown role=cliente) | Aguardando despacho | Nenhum |
| CI_HAS_TEST_DB secret | Criar quando #873 mergear | Depende de #873 |
| E2E Playwright suite | Adiado | Depende de E2E_TEST_SECRET |

### Regras invariantes (M2/M3) — mantidas

- **NÃO alterar** `server/lib/archetype/buildPerfilEntidade.ts` sem smoke regressivo
- **NÃO desativar** `M2_PERFIL_ENTIDADE_ENABLED` sem aprovação P.O.
- **NÃO executar** DROP COLUMN sem aprovação P.O.
- **NÃO ativar** `DIAGNOSTIC_READ_MODE=new` sem aprovação P.O.
- **Regra P2.W** permanece ativa (não tocar branches sob orquestração)

**Checkpoint:** main `bc649fa` · Manus `b4dd3cda` · tsc 0 erros · Deploy iasolaris.manus.space ✅
*Atualizado em 2026-05-02 · v8.1 · Sprint M3 ENCERRADO · Aprovador: P.O. Uires Tapajós*

## Sprint M3 — Archetype → Engines — Estado final (2026-05-02)

### Resumo
Sprint cirúrgico de 8 issues (NOVA-01 a NOVA-09). Objetivo: propagar o Perfil da Entidade (archetype confirmado em M2) como contexto enriquecido para todos os engines downstream — IA GEN, Compliance (RAG), Gap Engine, Risk Engine, e rastreabilidade end-to-end.

**Padrão aplicado:** Cada engine já recebia contexto como string → archetype é mais texto no mesmo ponto de injeção. ~470 LOC aditivas, zero regressão (rules_hash invariante 5x).

### PRs mergeados (Sprint M3 — 12 PRs)
| PR | Título | Tipo |
|---|---|---|
| #899 | docs(produto): baseline Sprint M3 + Perfil da Entidade fonte da verdade | docs |
| #900 | docs(investigation): M3 diagnostic — archetype adoption gap analysis | docs |
| #901 | docs(diagnostics): map archetype adoption across engines | docs |
| #902 | fix(listclients): cliente auto-vínculo destrava criação projeto | fix |
| #903 | feat(m3): NOVA-03 helper getArchetypeContext (fundação) | feat |
| #904 | feat(m3): NOVA-01 IA GEN consome archetype (2 geradores) | feat |
| #905 | feat(m3): NOVA-02 Compliance CNAE/NCM/NBS consome archetype | feat |
| #906 | feat(m3): NOVA-05 risk engine consome derived_legacy | feat |
| #907 | feat(m3): NOVA-04 gap engine texto enriquecido | feat |
| #908 | feat(m3): NOVA-06 rastreabilidade end-to-end Risco→Pergunta→Resposta→Gap | feat |
| #909 | feat(m3): NOVA-07 badge contexto Perfil da Entidade no Questionário | feat |
| #912 | feat(m3): consolidação NOVA-01/02/03/04/06/07 → main | merge |
| #913 | test(m3): NOVA-09 suite E2E integração archetype + rastreabilidade (17 testes) | test |

### Engines modificados
| Engine | Arquivo | Mudança M3 |
|---|---|---|
| IA GEN (Onda 2) | `routers-fluxo-v3.ts:3833` | archCtx injetado em profileFields do prompt LLM |
| Compliance NCM | `product-questions.ts:88` | archetype enriquece contextQuery do RAG |
| Compliance NBS | `service-questions.ts:88` | archetype enriquece contextQuery do RAG |
| Question Engine | `routers/questionEngine.ts:312` | archetype_context no projectContext |
| Gap Engine | `routers/gapEngine.ts:255` | archetype enriquece gap_description |
| Risk Engine | `routers/riskEngine.ts:639` | derived_legacy_operation_type como drop-in |
| Pipeline v4 | `generate-risks-pipeline.ts:91` | archetype_context em ConsolidatedEvidence |
| Mapper | `gap-to-rule-mapper.ts` | propaga questionId/answerValue/gapId/questionSource |

### Validações
| Validação | Resultado |
|---|---|
| tsc --noEmit | 0 erros |
| Vitest (189 testes) | 189/189 PASS |
| run-50-v3.mjs (60 cenários) | 59 PASS / 0 FAIL / 1 SKIP |
| rules_hash invariante | 5x byte-a-byte idêntico |
| Health endpoint (produção) | healthy |

### Issues residuais (tech-debt)
| Issue | Prioridade | Descrição |
|---|---|---|
| #911 | low | Cleanup semântico gapId (string vs number) |
| #914 | medium | CI secrets GitHub Actions (envvars faltantes) |

### Regras invariantes (M3) — mantidas + novas
- **NÃO alterar** `server/lib/archetype/buildPerfilEntidade.ts` sem smoke regressivo
- **NÃO desativar** `M2_PERFIL_ENTIDADE_ENABLED` sem aprovação P.O.
- **NÃO executar** DROP COLUMN sem aprovação P.O.
- **NÃO ativar** `DIAGNOSTIC_READ_MODE=new` sem aprovação P.O.
- **NÃO alterar** `getArchetypeContext` sem rodar suite m3-archetype-e2e.test.ts (17 testes)
- **NÃO remover** campos opcionais de rastreabilidade (questionId/answerValue/gapId/questionSource) — backward-compat obrigatória
- **Regra P2.W** permanece ativa

### Achado de auditoria (2026-05-02)
> **NOVA-02 questionEngine:** `archetype_context` é adicionado ao objeto `projectContext` (linha 320) mas a função `generateQuestionForRequirement` (linha 84) não o inclui no prompt LLM — o campo é passado mas não consumido na geração. O archetype **funciona** corretamente no RAG (product-questions.ts e service-questions.ts) mas não no Question Engine LLM prompt. Issue menor — não bloqueia, mas é oportunidade de melhoria futura.
