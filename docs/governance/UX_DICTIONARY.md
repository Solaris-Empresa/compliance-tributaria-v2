# UX DICTIONARY — IA SOLARIS

**Criado:** Sprint Z-13.5 | **Motivo:** Post-mortem Z-07 (spec nao incluida no prompt)
**Regra:** Este documento e fonte autoritativa para estado de telas e componentes frontend.

## Regra de ouro

**NUNCA implementar frontend sem entrada neste dicionario.**
Se a tela nao estiver aqui, executar `.claude/agents/ux-spec-validator.md`
e criar entrada antes de codar.

## Regra do mockup HTML (adicionada Z-14)

Todo mockup HTML deve ser:
1. Criado pelo Orquestrador antes da issue de implementacao
2. Referenciado no Bloco 2 da issue
3. Aberto no browser pelo implementador antes de codar
4. Fonte dos seletores CSS documentados no Bloco 9

Quando criar mockup HTML:
- Toda nova tela ou componente significativo
- Quando spec ASCII nao captura estados visuais
- Quando ha multiplos estados de UI (pending/approved/deleted)

## Regra de spec

Spec HIBRIDA obrigatoria:
- Conteudo copiado na issue (para execucao)
- Link para arquivo fonte (para referencia)
- Lock apos aprovacao P.O.
- **PATCH** (ajuste <= 5 linhas): comentario na issue
- **AMENDMENT** (mudanca estrutural): nova issue

---

## TELA 1 — RiskDashboardV4

**Componente:** `client/src/components/RiskDashboardV4.tsx`
**Rota:** `/projetos/:id/risk-dashboard-v4`
**Spec:** `docs/sprints/Z-07/UX_SPEC_RISCOS_V4.md`
**Mock ASCII:** `docs/sprints/Z-07/MOCKUPS_SISTEMA_RISCOS_V4.md`
**Mock HTML:** `docs/sprints/Z-15/MOCKUP_RISK_DASHBOARD_V4_Z15.html`
**Linhas:** 1246

### Estado atual (Checkpoint 15/04/2026 — pós Z-15)

| Funcionalidade | Status | Observacao |
|---|---|---|
| KPI cards (4 contadores) | implementado | alta, media, oportunidade, excluidos |
| 3 abas (Riscos/Opps/Hist) | implementado | com contagem dinamica |
| Filtros severidade | implementado | Todos/Alta/Media |
| Filtros categoria | implementado | chips inline, top 5 + expand |
| Aprovar risco individual | implementado | modal AlertDialog |
| Excluir risco (soft delete) | implementado | motivo obrigatorio 10-200 chars |
| Restaurar risco | implementado | tab Historico |
| EvidencePanel expansivel | implementado | 2 items default, expand all |
| Breadcrumb 4 nos | implementado | chips coloridos com tooltip |
| Link para ActionPlanPage | implementado | ?riskId= query param |
| Gerar riscos (pipeline) | implementado | 3 estados: gaps, regras, riscos |
| Agrupamento por categoria | implementado | cat-divider Z-14 PR #592 |
| SummaryBar sticky | implementado | 3 cards Z-14 PR #582 |
| Banner N aguardando | implementado | Z-14 L786-790 |
| Botao criar plano no card | implementado | create-action-plan-button Z-14 PR #526 |
| HistoryTab com audit log | implementado | history-tab Z-14 PR #527 |
| BulkApprove | implementado | bulk-approve-button Z-14 PR #536+#538 |
| RAG validation badge | implementado | rag-badge-validated/pending Z-15 PR #605 |
| Plans preview inline | implementado | plans-preview/plan-preview-row Z-15 PR #607 |

### Procedures (confirmed Discovery)

| Procedure | Existe no router? | Chamada pelo componente? |
|---|---|---|
| listRisks | SIM | SIM |
| deleteRisk | SIM | SIM |
| restoreRisk | SIM | SIM |
| approveRisk | SIM | SIM |
| generateRisks | SIM | SIM |
| mapGapsToRules | SIM | SIM |
| generateRisksFromGaps | SIM | SIM |
| upsertActionPlan | SIM | SIM (create-action-plan-button Z-14) |
| bulkApprove | SIM | SIM (bulk-approve-button Z-14) |
| getProjectAuditLog | SIM | SIM (history-tab Z-14) |
| getActionPlanSuggestion | SIM | SIM (ai-suggestion-btn Z-15) |

### Principios UX (spec Z-07)

1. **Rastreabilidade visivel** — advogado sabe de onde veio cada risco
2. **Aprovacao explicita** — nada avanca sem ato consciente
3. **Reversibilidade** — tudo pode ser desfeito com motivo registrado
4. **Progressao bloqueada** — tarefa so libera apos plano aprovado
5. **Feedback imediato** — toda acao < 300ms

---

## TELA 2 — ActionPlanPage

**Componente:** `client/src/pages/ActionPlanPage.tsx`
**Rota:** `/projetos/:id/planos-v4`
**Spec:** `docs/sprints/Z-07/UX_SPEC_RISCOS_V4.md`
**Mock ASCII:** `docs/sprints/Z-07/MOCKUPS_SISTEMA_RISCOS_V4.md`
**Mock HTML:** `docs/sprints/Z-15/MOCKUP_ACTION_PLAN_PAGE_Z15.html`
**Linhas:** 877
**Cardinalidade:** 1 plano → N tarefas atomicas

### Estado atual (Checkpoint 15/04/2026 — pós Z-15)

| Funcionalidade | Status | Observacao |
|---|---|---|
| TraceabilityBanner sticky | implementado | 5 chips, backdrop-blur, z-20 |
| Listar planos | implementado | via listRisks join |
| Aprovar plano | implementado | approvePlanMutation |
| Excluir plano | implementado | motivo obrigatorio |
| Listar tarefas | implementado | TaskRow com status cycle |
| Adicionar tarefa | implementado | inline form |
| Atualizar status tarefa | implementado | NEXT_STATUS map |
| Excluir tarefa | implementado | com motivo |
| Audit log global | implementado | getProjectAuditLog |
| Audit log por plano | implementado | getAuditLog |
| Lock tarefas (plan=rascunho) | implementado | opacity-40, cursor-not-allowed |
| Criar novo plano | implementado | upsertActionPlan Z-14 PR #526 |
| Editar plano existente | implementado | action-plan-modal Z-14 PR #537 |
| Sugestão da IA no modal | implementado | ai-suggestion-btn Z-15 PR #607 |
| 180_dias no prazo | implementado | SelectItem Z-15 PR #607 |
| Filtro por status de plano | ausente | mockup Z-15 pronto, backlog |
| Kanban tarefas | ausente | lista simples atualmente |

### Procedures (confirmed Discovery)

| Procedure | Existe no router? | Chamada pelo componente? |
|---|---|---|
| listRisks | SIM | SIM |
| getProjectAuditLog | SIM | SIM |
| approveActionPlan | SIM | SIM |
| deleteActionPlan | SIM | SIM |
| upsertTask | SIM | SIM |
| deleteTask | SIM | SIM |
| getAuditLog | SIM | SIM |
| upsertActionPlan | SIM | SIM (Z-14 PR #526) |
| getActionPlanSuggestion | SIM | SIM (ai-suggestion-btn Z-15) |

---

## TELA 3 — ConsolidacaoV4 (Step 7)

**Arquivo:** `client/src/pages/ConsolidacaoV4.tsx`
**Rota:** `/projetos/:id/consolidacao-v4`
**Status:** A IMPLEMENTAR (Z-16)
**Entrada:** redirect de ActionPlanPage apos todos os planos aprovados
**Saida:** PDF "Diagnostico de Adequacao LC 214/2025"

| Funcionalidade | Status | Issue |
|---|---|---|
| Header (empresa/CNPJ/CNAEs/data) | ausente | Z16-F1 |
| KPI cards (score/alta/media/oportunidade/planos/tarefas) | ausente | Z16-F1 |
| Score card + historico snapshots | ausente | Z16-F0+F1 |
| Tabela riscos aprovados + badges onda (alta/media/oportunidade) | ausente | Z16-F1 |
| Oportunidades (secao separada) | ausente | Z16-F1 |
| Riscos desconsiderados + motivo | ausente | Z16-F1 |
| Planos aprovados + tarefas vinculadas | ausente | Z16-F1 |
| Base legal escalavel por lei (LC 214/2025 + futuras) | ausente | Z16-F1 |
| Linha do tempo 2026-2032 | ausente | Z16-F1 |
| Proximos passos (template PT-BR) | ausente | Z16-F1 |
| Disclaimer juridico obrigatorio | ausente | Z16-F1 |
| Redirect de ActionPlanPage (botao "Ver Consolidacao") | ausente | Z16-F2 |
| PDF download (jsPDF, client-side) | ausente | Z16-F3 |

### Invariantes da TELA 3

- Score calculado deterministicamente no mount (NUNCA LLM)
- Snapshot persistido em `projects.scoringData` no mount (idempotente)
- Disclaimer juridico SEMPRE visivel — nao pode ser ocultado
- Rastreabilidade: cada risco exibe `ruleId` + artigo de origem
- 4 botoes de saida: PDF / Ver Projetos / Voltar ao Plano / Ver Projeto

### Procedures necessarias (A CRIAR)

| Procedure | Descricao |
|---|---|
| `risksV4.getConsolidationData(projectId)` | Retorna riscos + planos + tarefas + scoringData |
| `risksV4.calculateAndSaveScore(projectId)` | Calcula score e persiste snapshot em scoringData |

---

## Aviso de driver TiDB

> **ATENCAO — Driver TiDB/mysql2**
>
> Campos JSON podem ser retornados como objetos ja parseados pelo mysql2.
> Usar `safeParseObject()` e `safeParseArray()` — nunca `JSON.parse()` direto.
> Funcoes em: `server/lib/project-profile-extractor.ts`

---

## TELAS M1 — Epic #830 (DRAFT, pós-GO M1)

**Status:** DRAFT — implementação bloqueada por REGRA-M1-GO-NO-GO.
**Mockups HTML obrigatórios (a criar):** `docs/epic-830-rag-arquetipo/mockups/MOCKUP_novo-projeto.html` + `MOCKUP_perfil-confirmacao.html`.

### TELA M1.1 — NovoProjeto (ajustes)

**Componente:** `client/src/pages/NovoProjeto.tsx` (modificado)
**Rota:** `/projetos/novo`
**Spec:** `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` §9.1.1
**Mudanças (decisão P.O. 2026-04-24):**
- **Remove** campo "Cliente Vinculado" do form M1 (permanece em DB via contexto)
- **Adiciona** botão `[data-testid="btn-identificar-cnaes"]` após textarea `descricao_negocio_livre`
- Modal CNAE existente é reusado (`data-testid="modal-cnae-rag"`) — não alterado
- Botão `[data-testid="btn-avancar"]` não abre modal — apenas valida

**Invariantes:**
- `cnaes[]` não-vazio ao clicar em Avançar
- `descricao_negocio_livre` preenchida (min 50 caracteres sugerido)
- Zero alteração em `server/` ou lógica RAG/LLM de CNAE

**Procedures chamadas:** idênticas ao fluxo atual (intactas)

### TELA M1.2 — Confirmação do Perfil (NOVA)

**Componente:** `client/src/pages/ConfirmacaoPerfil.tsx` (a criar)
**Rota:** `/projetos/:id/perfil` (definitiva TBD)
**Spec:** `SPEC-RUNNER-RODADA-D.md` §4.8 (requisitos mínimos)
**Mockup:** `docs/epic-830-rag-arquetipo/mockups/MOCKUP_perfil-confirmacao.html` (a criar — pré-requisito Gate UX REGRA-ORQ-09)

**Elementos / data-testids:**
| Element | data-testid | Quando visível |
|---|---|---|
| Preview 5 dimensões read-only | `perfil-dimensions-preview` | sempre |
| Preview `derived_legacy_operation_type` | `perfil-legacy-optype` | sempre |
| Lista de blockers | `perfil-blockers-list` | apenas se `inconsistente` ou `bloqueado` |
| `motivo_bloqueio` destacado | `perfil-motivo-bloqueio` | apenas se `bloqueado` |
| Botão "Confirmar perfil" | `btn-confirmar-perfil` | apenas se `pendente` sem issues |
| Botão "Voltar e editar" | `btn-voltar-editar` | apenas se `pendente`/`inconsistente` |
| Botão "Iniciar nova versão" | `btn-nova-versao` | apenas se `confirmado` (cria novo snapshot) |

**Estados visuais (invariante IS-1 a IS-9 da SPEC §8.1):**
- `pendente`: card azul/neutro com preview + botão Confirmar primário
- `inconsistente`: card amarelo com lista de blockers legíveis (reason descritivo)
- `bloqueado`: card vermelho terminal com orientação
- `confirmado`: card verde read-only + opção "Iniciar nova versão"

**Procedures chamadas (a criar):**
- `archetype.derivePerfilDimensional(projectId)` → retorna arquétipo derivado (sem persistir)
- `archetype.confirmPerfil(projectId)` → persiste snapshot imutável com `confirmed_at`
- `archetype.startNewVersion(projectId)` → cria novo registro em `pendente`

**Invariantes:**
- Snapshot confirmado é imutável (ADR-0032 §1) — validado server-side
- Edição após confirmação cria novo `archetype` row; antigo **preservado**
- `status_arquetipo = confirmado` é pré-requisito de avançar para Briefing (Gate E2E SPEC §4.6)

---

## Perfil da Entidade (M2 — `/projetos/:id/perfil-entidade`)

> **Origem:** M2 PR-A (#865) + PR-B (#867) + PR-C (este). Tela cliente entre `confirmCnaes` e `Questionário SOLARIS`.
> **Termo canônico UI:** "Perfil da Entidade" (interno: `archetype` / `archetype_version`). **Proibido:** "Arquétipo" em strings visíveis.

**8 estados visuais** (atributo `data-state` no root):

| Estado | Semântica |
|---|---|
| `s1` | Início — sem dados, formulário não tocado |
| `s2` | Modal CNAE recém-fechado, build pendente |
| `s3` | CNAEs confirmados, dimensões sendo derivadas |
| `s4` | Painel completo, status_arquetipo = confirmado |
| `c1` | Pendente — campos obrigatórios faltando |
| `c2` | Inconsistente — exige correção (sem override) |
| `c3` | Bloqueado — HARD_BLOCK ativo |
| `c4` | Confirmado — snapshot imutável persistido |

**6 seções do Painel de Confiança:**

| ID | Conteúdo |
|---|---|
| PC-01 | Resumo Executivo — score_total + status_arquetipo + eligibility + mensagem |
| PC-02 | Composição da Confiança — Completude (40%) + Inferência (30%) + Coerência (30%) com nota explícita "Score alto não libera fluxo sozinho" |
| PC-03 | Pendências e Bloqueios priorizados (HARD_BLOCK > PENDENTE_CRITICO > PENDENTE > INFO) com CTA "Ir para campo" |
| PC-04 | Snapshot do Perfil — CNAEs, natureza, dimensões M1, NCMs, NBSs, perfil_hash, rules_hash |
| PC-05 | Prévia de Riscos com badge **EXPLORATÓRIO** (não bloqueia gate) |
| PC-06 | CTA "Continuar para o Questionário SOLARIS" — disabled exceto se `gate_liberated === true` |

**Conditional rendering NCM/NBS** (PR-C G-A5):

| Natureza inclui | Mostra |
|---|---|
| Produção própria, Comércio, Intermediação | Campo NCM (com warning se array vazio) |
| Transporte, Prestação de serviço, Locação, Intermediação | Campo NBS (com warning se array vazio) |
| Apenas serviços | NCM oculto |
| Apenas bens | NBS oculto |

**Invariantes (M2):**
- Score alto **não** libera fluxo sozinho — gate exige `status_arquetipo = "perfil_confirmado"` AND zero `HARD_BLOCK`
- Estado `inconsistente` exige correção; **não** existe `acceptInconsistency`
- Erro estrutural ≠ risco aceito; risco aceito não confirma Perfil da Entidade
- PC-05 é **exploratório** — não bloqueia, não libera
- Snapshot imutável após `confirm` (ADR-0031); alteração gera nova versão (ADR-0032)
- NCM truncado (regex `/^\d{4}\.\d{2}\.\d{2}$/`) bloqueia confirmação
- NBS digitado em campo NCM (`/^1\.\d{4}\.\d{2}\.\d{2}$/`) bloqueia com mensagem específica

**Procedures (PR-A `server/routers/perfil.ts`):**
- `perfil.build(projectId)` — read-only, computa snapshot via `buildSnapshot`
- `perfil.confirm(projectId)` — write-once, persiste em `projects.archetype*`
- `perfil.get(projectId)` — retorna snapshot ou null
- Todas guardadas por `assertM2Enabled(ctx, projectId)` — feature flag `m2-perfil-entidade-enabled`

---

## §M1.1 — Identidade Fiscal Dual (BUG-AGRO-CPF — Issue #1290)

**Origem:** F2 (PR #1294) — UI radio PJ/PF + input CPF condicional.
**Tela:** `NovoProjeto.tsx` (formulário inicial de criação de projeto).
**Mockup:** `docs/governance/mockups/mockup-cpf-pf-variante-a.html` (estático, referência QA).
**Spec normativa:** Art. 164 LC 214/2025 (produtor rural Pessoa Física como sujeito tributário).
**Feature flag:** `VITE_ENABLE_TAX_ID_DUAL` (frontend) · `ENABLE_TAX_ID_DUAL` (backend) — default `false`.

### 3 entradas canônicas

| Chave | Label PT-BR | Tooltip | Contexto (data-testid) |
|---|---|---|---|
| `tax_id_type.pj` | "Pessoa Jurídica" | "Empresa com CNPJ" | `radio-tax-id-type-pj` |
| `tax_id_type.pf` | "Pessoa Física Produtor Rural" | "Produtor rural com CPF (Art. 164 LC 214/2025)" | `radio-tax-id-type-pf` |
| `tax_id.cpf_label` | "CPF" | "Cadastro de Pessoa Física — 11 dígitos" | `input-cpf` (label) |

### Comportamento UI

- Radio group `[PJ] [PF]` é exibido **somente** quando `VITE_ENABLE_TAX_ID_DUAL=true` (REGRA-ORQ-32 — feature flag).
- Quando flag OFF: apenas campo CNPJ visível (comportamento AS-IS pré-F2).
- Quando flag ON + PJ selecionado: campo CNPJ visível com máscara `00.000.000/0000-00`.
- Quando flag ON + PF selecionado: campo CPF visível com máscara progressiva `000.000.000-00`; campo CNPJ oculto; `companyType` é forçado para `produtor_rural_pf` no submit (não exibido ao usuário).

### Invariantes

- O `data-testid` do radio PF é `radio-tax-id-type-pf` (não `radio-pf` puro — F2 commit `1080a6c`).
- `cpfValid` controla `disabled` do botão "Avançar" quando PF selecionado (mesma lógica que `cnpjValid` para PJ).
- Mudança PJ→PF limpa o campo CNPJ e vice-versa (sem persistir documento do outro tipo).
- Schema Zod backend (`server/routers-fluxo-v3.ts:248-263`) tem `taxIdType.default('cnpj')` → retrocompat F1↔F2: payload sem `taxIdType` continua sendo aceito como PJ legacy.

### Procedures impactadas

- `fluxoV3Router.createProject` — schema dual (F1 PR #1293), refine derivado.
- `perfil.build` + `perfil.confirm` — hash null-safe (F3 PR #1295 ADR-0033).

### Vinculadas

- ADR-0033 (Identidade Fiscal Dual)
- ADR-0032 (Versionamento Snapshot — MINOR aditivo preservado)
- REGRA-ORQ-29 (CNAE-condicionado — extensão para sujeito tributário)
- REGRA-ORQ-32 (no hardcode — feature flag em vez de if/else)
- Lição #93 (mecanismo verificado: `analise_1_cnpj_operacional` mantido por escopo unitário, não rotulagem CNPJ)
- F0 #1292 · F1 #1293 · F2 #1294 · F3 #1295 · F4 #1296 · F5 (este PR fecha #1290)

---

## §UX-BRIEFING-C-V2 — BriefingV3 Split View (Issue #1344)

**Criado:** Sprint 5 (2026-06-03) · **Precedente de formato:** §M1.1 (BUG-AGRO-CPF) · **PR:** #1354 · **Status:** ANÁLISE (impl. bloqueada até `spec-aprovada`)
**Tela host:** `client/src/pages/BriefingV3.tsx` (1200 LOC, `@ts-nocheck`) · **Rota:** `/projetos/:id/briefing-v3`
**Feature flag:** `BRIEFING_UI_VERSION` — `legacy` (monolito atual, default até F5) | **`split`** (Split View)
**Decisões aprovadas:** C1 (4 faixas completude) · C2 (consome `briefingStructured`, sem parser) · C3 (host) · C4 (sem prefixo) · UX-LABELS-01 (#1342) · UX-LABELS-02 (#1346) · D1 (badge alucinação Opção 0) · D2 (ImpactsSection `<Streamdown>`+âncora) · D3 (6 PRs) · D4 (`shared/source-type-labels.ts` no PR-0) · D5 (threshold)

> **Regra:** labels seguem as DECISÕES (UX-LABELS-01/C1), **NÃO o mockup** — MK-1/MK-2/MK-3 são regressões REJEITADAS (mockup é só referência de layout).

### 1. DecisionPanel (Zona 1 — sidebar fixa)
Fonte: `structured.confidence_score.nivel_confianca` (number dentro de OBJECT — `ai-schemas.ts:237`) + `structured.nivel_risco_geral`.

| Chave | Label PT-BR |
|---|---|
| gauge_title | **"Grau de Completude do Diagnóstico"** (C1 — não "Confiança") |
| faixas | "Crítico" (0-49) · "Parcial" (50-79) · "Adequado" (80-94) · "Completo" (95-100) |
| alerta | "Alerta: completude abaixo de 80%" (C1, render só `<80`) |
| risco_badge_title | **"Nível de Exposição"** (não "Nível de Risco") |
| contadores | "Gaps" · "Oportunidades" · "Ações" · "Inconsistências" |

**Invariantes:** gauge usa as **4 faixas C1** — NÃO reusa as 3 faixas do `ConfidenceBar.tsx` (`>=85/70-84/<70`, TK-1). Alerta visual `<80` ≠ gate de aprovação `<85` (D5 — coexistem). `nivel_risco_geral` enum `baixo|medio|alto|critico` (`ai-schemas.ts:180`).
**data-testid:** `decision-panel` · `decision-panel-gauge` · `decision-panel-faixa` · `decision-panel-alerta` · `decision-panel-risco-badge` · `decision-panel-resumo`

### 2. GapCard (Zona 2 — tab Gaps)
Fonte: `structured.principais_gaps[i]`. Labels por `source_type` (UX-LABELS-01 #1342, **sem emoji**):

| `source_type` | Label | Linha (`SOURCE_TYPE_LABEL_V2`, const :6643) |
|---|---|---|
| `questionario` | "Declaração do contribuinte" | :6648 |
| `regra_semantica` | "Aplicação obrigatória por perfil" | :6650 |
| `solaris` | "Questionário de conformidade SOLARIS" | :6652 |
| `rag` | "Norma aplicável identificada" | :6645 |
| `cnae` | "Incidência por atividade econômica (CNAE)" | :6646 |
| `descricao` | "Sinal identificado na descrição da atividade" | :6647 |
| `iagen` | "Análise complementar por IA" | :6649 |

> Mockup MK-3 ("🔮 Diagnóstico SOLARIS") **REJEITADO**. Urgência: `imediata`→"Imediata" · `curto_prazo`→"Curto Prazo" · `medio_prazo`→"Médio Prazo".

**Badge alucinação (D1/Opção 0):** `gap._hallucination_detected === true` → "⚠️ Verificar artigo citado". Campo **pós-parse** (`validate-article-citations.ts:78`), fora do Zod — usar `gap._hallucination_detected ?? false`.
**Campos:** título = `gap` (**NÃO `titulo`**). `source_reference` exibido **sem prefixo "Aplicação obrigatória:"**.
**🔴 Invariante N2-b (dados legados):** os 93 projetos existentes têm o prefixo **persistido** no `source_reference` (Gap 1 do 5700001 confirmado por SQL). O **`briefingAdapter.ts` deve fazer `strip("Aplicação obrigatória: ")`** no render (UX-LABELS-02 só afeta briefings novos).
**data-testid:** `briefing-gap-card-{i}` · `briefing-gap-source-badge-{i}` · `briefing-gap-urgencia-badge-{i}` · `briefing-gap-hallucination-badge-{i}` · `briefing-gap-expand-{i}`

### 3. PriorityCards · 4. OpportunityCard · 5. ActionsList
- **PriorityCards** — `structured.top_3_acoes[]` ({acao, justificativa, prazo}, `ai-schemas.ts:225`); título "Top 3 Prioridades"; `priority-card-{i}` (reconciliado PR-3: implementado como `priority-card-{i}`, não `briefing-priority-card-{i}` — despacho definitivo prevalece).
- **OpportunityCard** — `structured.oportunidades[]` (string[]); tab "Oportunidades"; vazio→"Nenhuma oportunidade identificada"; `briefing-opportunity-{i}`.
- **ActionsList** — `structured.recomendacoes_prioritarias[]` (**NÃO `recomendacoes`**); tab **"Ações Prioritárias"**; `briefing-action-{i}`.

### 6. ImpactsSection (tab "Impactos")
Bloco **fixo** (3 eixos Financeiro/Operacional/Jurídico — `server:6835-6843`), **não vem do JSON**. D2: render via `<Streamdown>` + âncora de nav (split) / hardcode dos 3 textos. `briefing-impacts-section`.

### 7. MethodSection (tab **"Metodologia"**)
Fonte: `structured.confidence_score` + **`structured.confiancaSnapshot.pilares[]`** (gravado em `routers-fluxo-v3.ts:2164`; via `getBriefingInconsistencias.structured` — **N2-a: NÃO via `checkBriefingFreshness`**, que não retorna pilares). Labels "Limites do Diagnóstico" · "Como calculamos a Confiança". `briefing-method-section` · `briefing-method-pilares-table`.

### 8. BriefingNav (5 tabs)
Ordem: **"Gaps" · "Oportunidades" · "Ações Prioritárias" · "Impactos" · "Metodologia"**. Default: Gaps. `briefing-nav-tab-{slug}`. (Errata P.O. 03/06: "Metodologia", não "Método".)

### 9. ActionBar (Zona 0 superior + Zona 3 inferior sticky)
**Superior:** Regenerar · Corrigir · Mais Informações · Compartilhar Resumo · Anotações. **Inferior:** Histórico (N) · Exportar PDF · Aprovar Briefing.
**Invariantes:** handlers **movidos, não reescritos** (`handleApprove:400` · `handleGenerate:322` · `handleExportPDF:446` · `handleFeedbackSubmit:525`); state lifted ao container (`isApproving`/`canApprove`/`briefing`/`feedbackMode`).
**data-testid PRESERVADOS:** `btn-regenerar-briefing` (:1012) · `btn-compartilhar-resumo` (:1118). **Novos:** `btn-aprovar-briefing` · `btn-corrigir-briefing` · `btn-mais-info-briefing` · `btn-exportar-pdf-briefing` · `briefing-action-bar-top` · `briefing-action-bar-bottom`.

### 10. RoundsSummarySection (🔴 NOVO — N1, elemento obrigatório)
**Fonte:** `getRoundsSummary` (**CONSUMIDO** — não "não usado"). Renderiza **"Intensidade de Aprofundamento por CNAE"** (heatmap de rounds por CNAE, badge de alta complexidade) — está na lista **"Elementos Obrigatórios (NÃO suprimir)"** da issue #1344 (`BriefingV3.tsx:874-970`). **Zona 2** (tab "Metodologia" ou seção acima das tabs, como no monolito). `data-testid: briefing-rounds-summary`.

### 11. BriefingV3 (host) — feature flag + fallback
| Estado | Condição | Render |
|---|---|---|
| `legacy_render` | flag=`legacy` | monolito atual (markdown via `<Streamdown>`) byte-idêntico |
| `split_render` | flag=`split` + `briefingStructured` não-null (2%) | Split View |
| **`split_fallback`** | flag=`split` + `briefingStructured` **null (98%!)** | **`if (!structured) return <LegacyBriefingView {...props} />`** — **monolito COMPLETO** (N2-c: NÃO `<Streamdown>` parcial; preserva version history, banners, inconsistências, ActionBar) |

**7 data-testid preservados (E2E z17):** `briefing-version-timestamp` (:616) · `version-history-row-{v}` (:769) · `version-history-reason-{v}` (:782) · `btn-toggle-reason-{v}` (:807) · `version-history-reason-full-{v}` (:824) · `btn-regenerar-briefing` (:1012) · `btn-compartilhar-resumo` (:1118).
**Fallback (98%) é o caminho mais exercitado → testado PRIMEIRO.**

### 12. Componentes REUSADOS (não reescrever)
`BriefingReservationBadge` · `BriefingFreshnessBanner` · `ShareBriefingModal` · `ApproveReservationModal` · `StepComments` · `AlertasInconsistencia` · `FlowStepper` · `RetrocessoConfirmModal`. `ConfidenceBar` — **NÃO reusado no DecisionPanel** (faixas diferentes, TK-1); preservado para outros consumers.
**`DiagnosticoEntradaPanel`** (`BriefingV3:37-80,:976`) — **EXCLUÍDO do escopo v2** (decisão P.O. 03/06/2026; não está nos "Elementos Obrigatórios"). **Preservado no fallback legacy.**

### 13. Procedures tRPC (10 — contrato F3.1)
`getProjectStep1` (915) · `generateBriefing` (1495) · `approveBriefing` (2586) · `approveBriefingWithReservation` (2720) · `getProgress` (1187) · **`getRoundsSummary` (1333 — CONSUMIDO por RoundsSummarySection)** · `getBriefingInconsistencias` (3708) · `checkBriefingFreshness` (2511) · `getLiveBriefingSources` (6295) · `dismissInconsistencia` (2376).

### Vinculadas
Issue #1344 · UX-LABELS-01 #1342 · UX-LABELS-02 #1346 · `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md` (v5) · `DB-SPEC-UX-BRIEFING-C-V2.md` · `RISCOS-MITIGACAO-UX-BRIEFING-C-V2.md` · `briefingAdapter.test.ts` (Triade ORQ-28 A2) · REGRA-ORQ-09/16/28 · Lição #72.

---

## Admin SOLARIS — Gestão de Perguntas (`AdminSolarisQuestions`)

**Componente:** `client/src/pages/AdminSolarisQuestions.tsx` · **Spec F5:** `docs/governance/relatorios/SPEC-F5-ADMIN-TAX-REGIMES.md` · **Mockup:** `docs/sprints/regime-tributario/MOCKUP_admin_tax_regimes.html` · **ADR-0038**

Tela administrativa (equipe SOLARIS / advogado_senior) para curar as perguntas da Onda 1. Cadastrada no Gate UX em 19/06/2026 (F5).

### F5 — coluna/curadoria de `tax_regimes` (regime tributário)
- **Listagem:** coluna "Regimes" — badges por regime; `tax_regimes` null/[] → badge **"Todos"** (universal). `data-testid="col-tax-regimes"`.
- **Cadastro/Edição:** multi-select `[Todos · Simples Nacional · Lucro Presumido · Lucro Real]`. "Todos" (ou nenhum) → persiste **`NULL`** (universal — DoD negativo REGRA-ORQ-44). `data-testid="input-tax-regimes"` + `option-todos|option-simples_nacional|option-lucro_presumido|option-lucro_real`.

### Procedures tRPC (F5)
`solarisAdmin.listQuestions` (retorna `tax_regimes`) · `solarisAdmin.createQuestion` (aceita `tax_regimes`) · `solarisAdmin.updateQuestion` (aceita `tax_regimes`).

### Vinculadas
ADR-0038 · #1282 · REGRA-ORQ-09 (Gate UX) · REGRA-ORQ-27/44 · Lição #137 · F1 (#1517) / F2 (#1518) / F3 (#1519) / F4 (#1520).
