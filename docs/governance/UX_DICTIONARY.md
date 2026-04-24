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

## TELA M1 — Confirmação do Perfil da Entidade (Sprint M1 · 2026-04-24)

> **REGRA:** Esta tela é introduzida pelo milestone M1. Não implementar sem aprovação P.O. e prompt do Orquestrador. Artefato pré-M1.

**Componente:** `client/src/pages/ConfirmacaoPerfil.tsx` (a criar)  
**Rota:** `/projetos/:id/perfil-entidade`  
**Mockup baseline:** `docs/sprints/M1-arquetipo-negocio/MOCKUP_perfil_entidade_v5_1.html` (branch `docs/m1-arquetipo-exploracao`)  
**Status:** A IMPLEMENTAR (M1+)

### Estados visuais

| Estado | ID | Cenário | `status_arquetipo` | Botão "Confirmar" |
|---|---|---|---|---|
| Início | S1 | Sem CNAEs confirmados | `pendente` | `disabled` |
| Modal CNAE | S2 | Modal de identificação aberto | `pendente` | `disabled` |
| CNAEs confirmados | S3 | 5 dimensões com conflito | `inconsistente` | `disabled` |
| Blocos pré-abertos | S4 | Auto-open por CNAE | `inconsistente` | `disabled` |
| Campos faltantes | C1 | Campos obrigatórios ausentes | `pendente` | `disabled` |
| Conflito ativo | C2 | Erro estrutural — exige correção | `inconsistente` | `disabled` |
| HARD_BLOCK | C3 | V-05-DENIED ativo | `bloqueado` | `disabled` |
| Confirmado | C4 | Gate liberado | `confirmado` | habilitado → redirect STEP 2 |

### Componentes da tela

| Componente | Descrição | Regras |
|---|---|---|
| Botão "Identificar CNAEs" | Abre modal de sugestão de CNAEs (reuso do modal existente) | NÃO reimplementar RAG/LLM. Acionado explicitamente pelo usuário. |
| Modal de CNAEs | Lista de CNAEs sugeridos com badges de confiança (Alta/Média/Baixa) | LLM sugere — usuário confirma. LLM não é fonte de verdade (ADR-0031 §Princípio 5). |
| Lista de CNAEs confirmados | Multi-select editável (chips com ✕ e "+ Adicionar CNAE") | Editável antes de avançar. Alimenta `projects.confirmedCnaes[]`. |
| Botão "Avançar" | Valida `confirmedCnaes[]` e `descricao_negocio_livre` | NÃO abre modal CNAE. Apenas valida e avança. |
| 5 Dimensões | Cards com `objeto`, `papel_na_cadeia`, `tipo_de_relacao`, `territorio`, `regime` | Derivadas deterministicamente. Não editáveis diretamente pelo usuário. |
| Separador Erro Estrutural vs Risco Aceito | Duas colunas explicativas | Erro estrutural = exige correção. Risco aceito (`acceptRisk()`) = mecanismo AS-IS, fora do gate M1. |
| Painel de Confiança (PC-01 a PC-06) | Score de completude, composição, issues, snapshot, PC-05 (exploratório), gate | PC-05 é prévia exploratória. Score NÃO libera gate. |
| Botão "Confirmar Perfil da Entidade" | CTA final — dispara congelamento do snapshot (ADR-0032) | Habilitado APENAS quando gate liberado (ver abaixo). |

### Gate visual — fórmula canônica (instrução P.O. 2026-04-24)

```
gateLiberated = status_arquetipo === 'confirmado'
             AND erros_estruturais.length === 0
             AND hard_blocks.length === 0
```

### Regras de UX obrigatórias

1. **"Cliente Vinculado" não aparece nesta tela** — campo permanece em `projects.clientId` como dado legado/sistêmico
2. **"Perfil da Entidade" na UI** — "arquétipo" é termo técnico interno
3. **Estado `inconsistente` exige correção** — sem override, sem `acknowledgeInconsistency`
4. **Score alto NÃO libera o gate** — nota vermelha explícita no Painel de Confiança
5. **PC-05 é prévia exploratória** — badge "EXPLORATÓRIO" obrigatório
6. **Fórmula do score é exploratória** — badge "fórmula exploratória" em PC-02
7. **Snapshot imutável após confirmação** — mensagem explícita no estado C4

### Procedures necessárias (a criar em M1+)

| Procedure | Descrição |
|---|---|
| `perfil.buildPerfilEntidade(projectId)` | Deriva as 5 dimensões + metadata e retorna `PerfilEntidade` |
| `perfil.confirmPerfilEntidade(projectId)` | Grava snapshot imutável em `projects.archetype` e seta `archetype_version` |
| `perfil.getPerfilEntidade(projectId)` | Retorna snapshot atual ou `null` se não confirmado |
