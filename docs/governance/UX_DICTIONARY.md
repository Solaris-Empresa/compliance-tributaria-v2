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
