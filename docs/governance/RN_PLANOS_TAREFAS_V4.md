# Regras de Negócio — Geração de Planos de Ação e Tarefas
## IA SOLARIS · action_plans + tasks · Sprint Z-07 a Z-14

---

## Cardinalidade

```
risks_v4         (1 risco)
    │
    └── action_plans  (N planos)      ← nível operacional
              │
              └── tasks  (N tarefas)  ← nível atômico
```

### Definição dos níveis

**Nível operacional — Plano de ação:**
Conjunto de tarefas em torno de um objetivo. Tem responsável, prazo, status
de aprovação e rastreabilidade para o risco de origem. Requer aprovação do
advogado antes de liberar as tarefas.

**Nível atômico — Tarefa:**
Ação concreta e indivisível. Status gerenciado inline pelo gestor.
Não requer aprovação própria — é liberada quando o plano pai é aprovado.

---

## Origem dos planos — 2 formas

### Forma 1: Geração automática pelo engine

```typescript
// server/lib/action-plan-engine.ts — buildActionPlans()
// Chamado logo após buildRiskItems()
// Gera sugestões baseadas no ruleId do gap

const PLANS: Record<string, ActionPlanSuggestion[]> = {
  'GAP-IS-001': [
    { titulo: 'Implantar controle de apuração do IS',
      responsavel: 'gestor_fiscal', prazo: '90_dias' },
    { titulo: 'Contratar assessoria tributária IS',
      responsavel: 'diretor', prazo: '30_dias' },
  ],
  'GAP-AZ-001': [
    { titulo: 'Parametrizar alíquota zero nos produtos elegíveis',
      responsavel: 'gestor_fiscal', prazo: '60_dias' },
  ],
  'GAP-SP-001': [
    { titulo: 'Adequar sistema para split payment',
      responsavel: 'ti', prazo: '90_dias' },
  ],
  'GAP-TR-001': [
    { titulo: 'Plano de transição ISS → IBS (2026-2032)',
      responsavel: 'juridico', prazo: '180_dias' },
  ],
  // Gaps sem entrada no catálogo → defaultPlan():
  // "Avaliar e mitigar: {titulo_do_risco}"
  // responsavel: 'advogado', prazo: '60_dias'
}
```

**Invariante absoluta:** `type === 'opportunity'` → `buildActionPlans` retorna `[]`.
Riscos de oportunidade nunca geram planos automaticamente.

### Forma 2: Criação manual pelo usuário

```
Botão "+ Novo plano" no card de risco ou na ActionPlanPage
Procedure: trpc.risksV4.upsertActionPlan
Formulário: título (obrig.) · responsável (obrig.) · prazo (obrig.) · descrição (opt.)
"Sugestão da IA": pré-preenche com ActionPlanSuggestion do catálogo. Editável.
```

---

## Estrutura do ActionPlan

```typescript
interface ActionPlan {
  id:            string      // 'AP-{riskId}-{seq}'
  projectId:     number
  riskId:        string      // FK → risks_v4.id
  titulo:        string      // do catálogo ou digitado pelo usuário
  descricao:     string      // opcional
  responsavel:   string      // gestor_fiscal | diretor | ti | juridico | advogado
  prazo:         string      // 30_dias | 60_dias | 90_dias | 180_dias
  status:        string      // rascunho → aprovado → em_andamento → concluido
  approvedBy:    number      // user_id do advogado
  approvedAt:    Date        // NULL = pendente
  deletedReason: string      // NULL ou texto (soft delete)
  createdBy:     number
  createdAt:     Date
  updatedAt:     Date
}
```

---

## Fluxo de status do plano

```
[gerado/criado]
      │
      ▼
  rascunho  ─── tarefas BLOQUEADAS (opacity 40%)
      │         advogado vê e analisa
      │
  [✓ Aprovar plano]
      │
      ▼
  aprovado  ─── tarefas LIBERADAS para execução
      │         gestor inicia execução
      │
  [gestor atualiza progresso]
      │
      ▼
  em_andamento
      │
  [todas tarefas = done]
      │
      ▼
  concluido
      │
  [excluir com motivo]
      │
      ▼
  deleted  ─── soft delete · restore disponível 90 dias
```

---

## Regras de negócio — planos

```
RN-AP-01: riskId NUNCA NULL — plano sempre vinculado a um risco
RN-AP-02: status inicial = 'rascunho' ao ser criado
RN-AP-03: approvedAt = NULL ao ser criado (pendente)
RN-AP-04: tarefas BLOQUEADAS enquanto status = 'rascunho'
RN-AP-05: tarefas LIBERADAS após status = 'aprovado'
RN-AP-06: motivoExclusão obrigatório (mín. 10 chars) ao excluir
RN-AP-07: excluir plano → cascata soft delete em todas as tarefas
RN-AP-08: audit_log registrado em toda mutação do plano
RN-AP-09: plano de oportunidade NUNCA gerado automaticamente
RN-AP-10: 1 risco pode ter N planos (sem limite definido)
```

---

## Aprovação do plano

```
Quem aprova: advogado
Procedure: trpc.risksV4.approveActionPlan({ planId })
  SET status = 'aprovado'
      approved_at = NOW()
      approved_by = ctx.user.id
  INSERT audit_log: action = 'approved', entity = 'action_plan'

Efeito imediato:
  - Tarefas do plano ficam interativas (opacity 100%)
  - Badge muda de âmbar para verde
  - Toast: "Plano aprovado · Tarefas liberadas" (verde · 3s)
```

---

## Criação manual de plano (upsertActionPlan)

```
Procedure: trpc.risksV4.upsertActionPlan(input)
Input:
  id?:         string   (omitir para criar, passar para editar)
  projectId:   number
  riskId:      string   (FK obrigatória)
  titulo:      string   (mín. 5 chars)
  descricao?:  string
  responsavel: string   (obrigatório)
  prazo:       string   (obrigatório)

Validações:
  titulo.length >= 5   → "Título muito curto"
  responsavel != ''    → "Selecione o responsável"
  prazo != ''          → "Selecione o prazo"

Resultado: plano criado com status = 'rascunho'
Toast: "Plano criado com sucesso" (verde · 3s)
```

---

## Estrutura da Tarefa

```typescript
interface Task {
  id:            string     // 'TASK-{planId}-{seq}'
  projectId:     number
  actionPlanId:  string     // FK → action_plans.id
  titulo:        string
  descricao:     string
  responsavel:   string
  prazo:         Date
  status:        string     // todo | doing | done | blocked | deleted
  ordem:         number     // para ordenação manual futura
  deletedReason: string
  createdBy:     number
  createdAt:     Date
  updatedAt:     Date
}
```

---

## Estados da tarefa

| Status | Ícone | Significado | Transição possível |
|---|---|---|---|
| `todo` | ○ | Não iniciada | → `doing` |
| `doing` | ● azul | Em execução | → `done` · → `blocked` |
| `done` | ✓ verde | Concluída | → `todo` (desfazer) |
| `blocked` | ✗ vermelho | Impedida | → `todo` (quando desbloqueada) |
| `deleted` | — | Excluída (soft) | visível só no histórico |

---

## Controle de status — inline

```
Mudança de status: select dropdown inline na linha da tarefa
  Sem modal — atualiza imediatamente via upsertTask
  Feedback: apenas inline (sem toast)
  Hover na linha: aparecem [Editar] [×]

NEXT_STATUS map (comportamento atual implementado):
  todo    → doing
  doing   → done
  done    → todo  (toggle)
  blocked → todo
```

---

## Regras de negócio — tarefas

```
RN-TASK-01: actionPlanId NUNCA NULL — tarefa sempre vinculada a um plano
RN-TASK-02: status inicial = 'todo' ao ser criada
RN-TASK-03: tarefa BLOQUEADA (pointer-events:none, opacity:40%)
            enquanto action_plan.status = 'rascunho'
RN-TASK-04: tarefa LIBERADA apenas quando action_plan.status = 'aprovado'
RN-TASK-05: soft delete — NUNCA DELETE físico
RN-TASK-06: excluir plano → cascata soft delete em todas as tarefas filhas
RN-TASK-07: audit_log registrado em toda mutação de tarefa
RN-TASK-08: barra de progresso = COUNT(status='done') / COUNT(*)
```

---

## Criação de tarefa (upsertTask)

```
Procedure: trpc.risksV4.upsertTask(input)
Input:
  id?:          string  (omitir para criar, passar para editar)
  projectId:    number
  actionPlanId: string  (FK obrigatória)
  titulo:       string  (mín. 3 chars)
  descricao?:   string
  responsavel?: string
  prazo?:       Date
  status?:      string  (default: 'todo')
  ordem?:       number

Validações:
  titulo.length >= 3  → "Descreva a tarefa"
  actionPlanId != ''  → FK obrigatória

Regra: tarefa criada em plano com status = 'rascunho'
       fica automaticamente bloqueada na UI (RN-TASK-03)
```

---

## Cascata de soft delete

```
Excluir risco:
  risks_v4.status = 'deleted'
  → action_plans WHERE risk_id = riskId → status = 'deleted'
  → tasks WHERE action_plan_id IN [...] → status = 'deleted'
  audit_log: reason = 'cascata de risco [riskId]'

Excluir plano:
  action_plans.status = 'deleted'
  → tasks WHERE action_plan_id = planId → status = 'deleted'
  audit_log: reason = 'cascata de plano [planId]'

Excluir tarefa:
  tasks.status = 'deleted'
  Sem cascata (nível folha)

Restore risco:
  risks_v4.status = 'active'
  → action_plans: status restaurado
  → tasks: status restaurado
```

---

## Audit log — registros obrigatórios

```
Toda mutação gera entrada em audit_log:

entity:      'risk' | 'action_plan' | 'task'
action:      'created' | 'updated' | 'deleted' | 'restored' | 'approved'
before_state: JSON do estado anterior (obrigatório no delete)
after_state:  JSON do estado posterior
reason:       texto (obrigatório quando action = 'deleted')
user_id:      ctx.user.id
user_name:    ctx.user.name
user_role:    ctx.user.role
```

---

## Barra de progresso por plano

```
Cálculo:
  total = COUNT(tasks WHERE action_plan_id = planId AND status != 'deleted')
  done  = COUNT(tasks WHERE action_plan_id = planId AND status = 'done')
  pct   = done / total (0–100%)

Exibição: "X/N tarefas" + barra preenchida proporcionalmente
Atualização: tempo real ao mudar status de tarefa (sem reload)
```

---

## Catálogo canônico de responsáveis e prazos

```
Responsáveis válidos:
  gestor_fiscal   → Gestor fiscal
  diretor         → Diretor
  ti              → TI
  juridico        → Jurídico / Advogado tributário
  advogado        → Advogado

Prazos válidos:
  30_dias   → 30 dias
  60_dias   → 60 dias
  90_dias   → 90 dias
  180_dias  → 180 dias (6 meses)
```

---

*IA SOLARIS · Regras de Negócio · Planos de Ação e Tarefas*
*Cardinalidade: 1 risco → N planos (operacional) → N tarefas (atômico)*
