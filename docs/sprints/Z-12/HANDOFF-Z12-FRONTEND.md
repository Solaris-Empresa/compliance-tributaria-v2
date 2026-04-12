# HANDOFF Z-12 — Frontend UX Spec (RiskDashboardV4 + ActionPlanPage)

**Sprint:** Z-12  
**Data:** 2026-04-12  
**Implementador:** Claude Code (Opus 4.6)  
**PRs:** #480 (PR #A — RiskDashboardV4), #482 (PR #B — ActionPlanPage)

---

## Escopo Entregue

### PR #A — RiskDashboardV4.tsx (items 1-9)

| # | Feature | Arquivo |
|---|---|---|
| 1 | **Tabs** Riscos (N) / Oportunidades (M) / Histórico (K) | `client/src/components/RiskDashboardV4.tsx` |
| 2 | **Card border** left-4 colorida por severidade (red/amber/teal/green) | idem |
| 3 | **Breadcrumb 4 nós** [source › categoria › artigo › ruleId] com Tooltips | idem |
| 4 | **Evidence panel** expansível — fonte/pergunta/resposta/confiança | idem |
| 5 | **Modal aprovação** AlertDialog com confirmação + toast verde | idem |
| 6 | **Modal exclusão** AlertDialog, textarea min 10 / max 200 chars, contador | idem |
| 7 | **Filtros** chips severidade + categoria, cumulativos AND, top 5 + "+mais" | idem |
| 8 | **Loading skeleton** 3 cards animados | idem |
| 9 | **Toasts** approve (verde 3s), delete (âmbar 5s + Desfazer), restore (verde 3s), erro (vermelho 6s) | idem |

### PR #B — ActionPlanPage.tsx (items 10-12)

| # | Feature | Arquivos |
|---|---|---|
| 10 | **Sticky traceability banner** 5 chips (source › categoria › artigo › ruleId › titulo) | `client/src/pages/ActionPlanPage.tsx` |
| 11 | **Task lock** quando plan.status=rascunho (opacity-40, cursor-not-allowed, Lock icon, tooltip) | idem |
| 12 | **Global audit log tab** tabela com data/ação/entidade/usuário/motivo | idem + `server/lib/db-queries-risks-v4.ts` + `server/routers/risks-v4.ts` |

### Backend (PR #B)

- `getProjectAuditLog()` em `db-queries-risks-v4.ts` — query sem filtro de entity, ORDER BY created_at DESC, LIMIT parametrizado
- Procedure `getProjectAuditLog` em `risks-v4.ts` — 12a procedure do router risksV4

---

## Arquivos Alterados

```
client/src/components/RiskDashboardV4.tsx     — rewrite completo (577+ / 198-)
client/src/pages/ActionPlanPage.tsx           — rewrite completo (384+ / 117-)
server/lib/db-queries-risks-v4.ts            — +getProjectAuditLog (16 linhas)
server/routers/risks-v4.ts                   — +procedure getProjectAuditLog (17 linhas)
```

**Zero migrations.** Zero alterações de schema. `routers-fluxo-v3.ts` intacto.

---

## Fora do Escopo (backlog futuro)

| Item | Razão |
|---|---|
| Heatmap de riscos por domínio | Requer novo componente de visualização + dados agregados |
| Export PDF da Matriz de Riscos | Requer biblioteca de geração de PDF (jsPDF ou similar) |
| Portal do cliente (read-only) | Requer nova role + rota + auth context |
| Filtros no tab Oportunidades | Baixa prioridade — poucas oportunidades típicas por projeto |
| Drag-and-drop de tarefas (Kanban) | Requer @dnd-kit ou similar — esforço significativo |

---

## Dependências de Dados

O frontend lê campos do schema `risks_v4` (migration 0064) que devem estar populados pelo engine v4:

- `type` (risk/opportunity) — para separar abas
- `evidence` (JSON array) — para painel de evidências
- `breadcrumb` (JSON [4 strings]) — para breadcrumb 4 nós
- `source_priority` — para chip de fonte no breadcrumb
- `status` (active/deleted) — para separar abas
- `approved_at` / `approved_by` — para badge de aprovação e cor da borda

Se algum desses campos for nulo/ausente, o frontend degrada gracefully (sem badge, sem evidências, sem breadcrumb).

---

## Verificação

```bash
pnpm check           # tsc --noEmit: 0 erros
# Rotas:
#   /projetos/:id/risk-dashboard-v4          → RiskDashboardV4
#   /projetos/:id/planos-v4?riskId=<uuid>    → ActionPlanPage com banner
#   /projetos/:id/planos-v4                  → ActionPlanPage sem banner
```
