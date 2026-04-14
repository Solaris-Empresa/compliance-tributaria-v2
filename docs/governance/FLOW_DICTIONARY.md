# FLOW DICTIONARY — IA SOLARIS

**Criado:** Sprint Z-14 | **Motivo:** Issue B-01 nao especificada porque issues nao declaravam fluxo
**Regra:** Este documento e fonte autoritativa para fluxos E2E do produto.

## Regra de ouro

**Toda issue de frontend DEVE declarar em qual fluxo ela se encaixa.**
Issue sem fluxo declarado = INVALIDA no F3.

Se o step nao estiver aqui, verificar com o Orquestrador antes de criar a issue.

---

## FLUXO PRINCIPAL — Diagnostico Tributario

Este e o unico fluxo critico do produto.
Todas as features de UX fazem parte dele.

### STEP 1: Formulario (5 JSONs)

**Rota:** `/projetos/novo`
**Componente:** `FormularioProjeto.tsx`
**Saida:** projeto criado com `confirmedCnaes` + `operationProfile`

### STEP 2: Questionario SOLARIS (Onda 1)

**Rota:** `/projetos/:id/questionario-solaris`
**Componente:** `QuestionarioSolaris.tsx`
**Saida:** `solaris_answers` preenchidas (22 perguntas SOL-015..036)

### STEP 3: Questionario IA Gen (Onda 2)

**Rota:** `/projetos/:id/questionario-iagen`
**Componente:** `QuestionarioIaGen.tsx`
**Saida:** `iagen_answers` preenchidas

### STEP 4: Briefing

**Rota:** `/projetos/:id/briefing-v3`
**Componente:** `BriefingV3.tsx`
**Saida:** briefing aprovado → redirect para STEP 5

**INTEGRACAO OBRIGATORIA:**
- Aprovacao do briefing (L268-275) faz redirect para `/risk-dashboard-v4`
- O redirect DEVE levar ao STEP 5

### STEP 5: Matriz de Riscos (RiskDashboardV4)

**Rota:** `/projetos/:id/risk-dashboard-v4`
**Componente:** `RiskDashboardV4.tsx` (1100 linhas)
**Entrada:** vindo do STEP 4 → gerar riscos AUTOMATICAMENTE
**Saida:** riscos aprovados → STEP 6 disponivel

**INTEGRACOES OBRIGATORIAS:**
- Ao montar: se `risks=0` → dispara `generateRisks` auto (Issue B-01 #554)
- Ao aprovar risco: plano disponivel em STEP 6
- `buildActionPlans()` roda dentro de `generateRisks` — planos criados automaticamente

### STEP 6: Plano de Acao (ActionPlanPage)

**Rota:** `/projetos/:id/planos-v4`
**Componente:** `ActionPlanPage.tsx` (870 linhas)
**Entrada:** risco aprovado do STEP 5
**Saida:** plano aprovado → tarefas liberadas

**INTEGRACOES OBRIGATORIAS:**
- Banner rastreabilidade sempre visivel (sticky)
- Tarefas bloqueadas ate plano aprovado (status='rascunho' → opacity 40%)

---

## Integracoes criticas do fluxo

| De | Para | Trigger | Status |
|---|---|---|---|
| STEP 4 (Briefing) | STEP 5 (Dashboard) | redirect L275 | implementado |
| STEP 5 mount | generateRisks auto | risks=0 → useEffect | Issue B-01 #554 |
| STEP 5 generateRisks | action_plans criados | buildActionPlans() | implementado |
| STEP 5 (aprovar risco) | STEP 6 disponivel | approved_at preenchido | implementado |
| STEP 6 (aprovar plano) | tarefas liberadas | status=aprovado | implementado |

---

## Efeitos colaterais obrigatorios por acao

| Acao | Efeito imediato | Efeito cascata obrigatorio |
|---|---|---|
| Briefing aprovado | redirect STEP 5 | risks=0 → generateRisks auto |
| Risco aprovado (individual) | approved_at preenchido | plano de acao gerado auto (buildActionPlans) |
| Bulk approve | N riscos approved_at | N planos gerados auto |
| Risco deletado | status=deleted | aparece HistoryTab |
| Risco restaurado | status=active | volta aba Riscos |
| Plano aprovado | status=aprovado | tarefas desbloqueadas |

**REGRA:** Toda issue que implementa uma ACAO deve documentar no Bloco 1 os efeitos cascata.

Se uma acao tem efeito cascata:
- O efeito cascata e criterio de aceite obrigatorio (Bloco 7)
- O efeito cascata tem CT dedicado na suite E2E
- Sem efeito cascata implementado = issue incompleta

---

## Regra obrigatoria para issues

Todo Bloco 1 de issue de frontend DEVE conter:

```
### Fluxo relacionado (obrigatorio para frontend)
**Step:** [numero] — [nome do step]
**Fluxo:** [step anterior] → [AQUI] → [step seguinte]
**Integracao upstream:** [de onde vem o usuario]
**Integracao downstream:** [para onde vai apos esta tela]
**Triggers automaticos:** [useEffect ou outros, se aplicavel]
```

### Checklist de integracao (adicionar ao F3)
- [ ] Issue declara em qual step do fluxo se encaixa?
- [ ] Integracoes upstream e downstream documentadas?
- [ ] Trigger automatico (se aplicavel) documentado?
- [ ] Efeitos cascata documentados no Bloco 1? (REGRA-ORQ-14)
- [ ] Criterio de aceite para cada efeito cascata no Bloco 7?
