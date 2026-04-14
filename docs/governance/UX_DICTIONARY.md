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
**Mock HTML:** `docs/sprints/Z-07/MOCKUP_RISK_DASHBOARD_V4.html` (a criar pelo Orquestrador)
**Linhas:** 1100

### Estado atual (Discovery 13/04/2026)

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
| Agrupamento por categoria | ausente | lista plana atualmente |
| SummaryBar sticky | ausente | |
| Banner N aguardando | ausente | |
| Botao criar plano no card | ausente | |
| HistoryTab com audit log | ausente | aba existe, sem conteudo de auditoria |
| BulkApprove | ausente | procedure nao existe no router |
| RAG validation badge | parcial | dados no banco (rag_validated), sem badge visual |

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
| upsertActionPlan | SIM | NAO (gap — nao chamada no dashboard) |
| bulkApprove | NAO | NAO (procedure nao existe) |
| getProjectAuditLog | SIM | NAO (nao usada no dashboard) |

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
**Mock HTML:** `docs/sprints/Z-07/MOCKUP_ACTION_PLAN_PAGE.html` (a criar pelo Orquestrador)
**Linhas:** 818
**Cardinalidade:** 1 plano → N tarefas atomicas

### Estado atual (Discovery 13/04/2026)

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
| Criar novo plano | ausente | upsertActionPlan nao chamada |
| Editar plano existente | ausente | sem form de edicao |
| Filtro por status de plano | ausente | |
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
| upsertActionPlan | SIM | NAO (gap — nao chamada) |

---

## Aviso de driver TiDB

> **ATENCAO — Driver TiDB/mysql2**
>
> Campos JSON podem ser retornados como objetos ja parseados pelo mysql2.
> Usar `safeParseObject()` e `safeParseArray()` — nunca `JSON.parse()` direto.
> Funcoes em: `server/lib/project-profile-extractor.ts`
