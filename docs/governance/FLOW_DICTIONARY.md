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
**Saida:** plano aprovado → tarefas liberadas → STEP 7 disponivel

**INTEGRACOES OBRIGATORIAS:**
- Banner rastreabilidade sempre visivel (sticky)
- Tarefas bloqueadas ate plano aprovado (status='rascunho' → opacity 40%)
- Botao "Ver Consolidacao" visivel apos todos os planos aprovados → redirect /consolidacao-v4

---

### STEP 7: Consolidacao (ConsolidacaoV4) — A IMPLEMENTAR (Z-16)

**Rota:** `/projetos/:id/consolidacao-v4`
**Componente:** `ConsolidacaoV4.tsx` (A CRIAR)
**Entrada:** `action_plans.status='aprovado'` (redirect apos approveActionPlan)
**Saida:** PDF "Diagnostico de Adequacao LC 214/2025" + snapshot scoringData

**INTEGRACOES:**
- `risks_v4` (riscos aprovados — rastreabilidade)
- `action_plans` + `tasks` (planos aprovados + tarefas)
- `projects.scoringData` (score calculado + historico de snapshots)

**EFEITOS CASCATA:**
- Imediato: score calculado via `calculateComplianceScore(risks_v4)` (hot swap Z-12 / ADR-0022) + snapshot salvo em `projects.scoringData`
- Cascata: PDF gerado sob demanda (jsPDF, client-side)
- Formato: `ConsolidacaoV4Output` (ver DATA_DICTIONARY)
- Navegacao: 4 botoes — PDF / Ver Projetos (`/projetos`) / Voltar (`/planos-v4`) / Ver Projeto (`/projetos/:id`)

**INTEGRACOES OBRIGATORIAS:**
- Score calculado no mount (nao LLM — determinístico)
- Snapshot persistido em `projects.scoringData` no mount
- Disclaimer juridico obrigatorio visivel
- Base legal escalavel por lei (LC 214/2025 + futuras)

---

## Integracoes criticas do fluxo

| De | Para | Trigger | Status |
|---|---|---|---|
| STEP 4 (Briefing) | STEP 5 (Dashboard) | redirect L275 | implementado |
| STEP 5 mount | generateRisks auto | risks=0 → useEffect | Issue B-01 #554 |
| STEP 5 generateRisks | action_plans criados | buildActionPlans() | implementado |
| STEP 5 (aprovar risco) | STEP 6 disponivel | approved_at preenchido | implementado |
| STEP 6 (aprovar plano) | tarefas liberadas | status=aprovado | implementado |
| STEP 6 (todos planos aprovados) | STEP 7 disponivel | redirect apos approveActionPlan | A IMPLEMENTAR (Z-16) |

---

## Efeitos cascata obrigatorios por acao (REGRA-ORQ-14)

Toda issue que implementa uma ACAO deve declarar no Bloco 1:
1. O efeito imediato da acao
2. O efeito cascata (o que acontece depois)
3. O formato correto dos dados gerados
4. A navegacao obrigatoria (se houver)

Sem esses 4 itens documentados = issue invalida no F3.

| Acao | Efeito imediato | Efeito cascata | Formato obrigatorio | Navegacao |
|---|---|---|---|---|
| Briefing aprovado | redirect STEP 5 | risks=0 → generateRisks auto | risks_v4 com rag_validated | permanecer no dashboard |
| Risco aprovado (individual) | approved_at preenchido | plano gerado auto | status='rascunho', prazo=ENUM | nenhuma |
| Bulk approve | N riscos approved_at | N planos gerados auto | status='rascunho', prazo=ENUM | redirect /planos-v4 |
| Risco deletado | status='deleted' | aparece HistoryTab | opacity 55% | permanecer no dashboard |
| Risco restaurado | status='active' | volta aba Riscos | card normal | permanecer no dashboard |
| Plano aprovado | status='aprovado' | tarefas desbloqueadas | tasks.status='todo' | permanecer na ActionPlanPage |
| Todos planos aprovados | score calculado + snapshot | scoringData atualizado | redirect /consolidacao-v4 |
| Plano editado | campos atualizados | status NAO muda | mesmo status anterior | permanecer na ActionPlanPage |
| ConsolidacaoV4 mount | score recalculado | snapshot salvo em scoringData | permanecer na ConsolidacaoV4 |
| PDF solicitado | PDF gerado (jsPDF) | nenhum efeito no banco | download no browser |

### Invariantes do estado final

Apos bulk approve:
- Todos os riscos: approved_at IS NOT NULL
- Todos os planos: status='rascunho', prazo=ENUM valido
- UI: redireciona para /planos-v4
- USA insertActionPlanV4WithAudit (formato novo)

Apos aprovar risco individual:
- risco: approved_at preenchido
- plano: status='rascunho' (nao 'pendente', nao null)
- prazo: ENUM('30_dias','60_dias','90_dias')

### Como auditar efeitos cascata no F3

Para cada issue de acao, o auditor F3 verifica:
- [ ] Bloco 1: efeito imediato documentado?
- [ ] Bloco 1: efeito cascata documentado?
- [ ] Bloco 1: formato dos dados gerados documentado?
- [ ] Bloco 1: navegacao pos-acao documentada?
- [ ] Bloco 7: criterio de aceite para CADA efeito?
- [ ] Bloco 7: invariante do estado final verificavel?

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

---

## STEP M1: Perfil da Entidade (Sprint M1 · 2026-04-24)

> **REGRA:** Este step é introduzido pelo milestone M1. Não implementar sem aprovação P.O. e prompt do Orquestrador. Artefato pré-M1.

### Posição no fluxo principal

```
STEP 1 (NovoProjeto) → STEP M1 (Perfil da Entidade) → STEP 2 (QuestionarioV3) → ...
```

**Rota:** `/projetos/:id/perfil-entidade`  
**Componente:** `ConfirmacaoPerfil.tsx` (a criar em M1+)  
**Integração upstream:** STEP 1 — `NovoProjeto.tsx` — saída: `confirmedCnaes[]` + `descricao_negocio_livre`  
**Integração downstream:** STEP 2 — `QuestionarioV3.tsx` — entrada: `status_arquetipo = 'confirmado'`  
**Gate de saída:** `status_arquetipo === 'confirmado'` AND `erros_estruturais.length === 0` AND `hard_blocks.length === 0`  
**Saída:** snapshot imutável em `projects.archetype` + `archetype_version = 'm1-v1.0.0'`

### Diagrama de transições de status_arquetipo

```
[pendente] ──── campos ausentes / conflito / AmbiguityError ──→ [inconsistente]
[pendente] ──── V-05-DENIED (multi-CNPJ) ──────────────────→ [bloqueado]
[pendente] ──── user_confirmed = true ─────────────────────→ [confirmado] ✓ gate liberado
[inconsistente] ── correção dos dados ─────────────────────→ [pendente]
[bloqueado] ──── terminal (sem saída) ─────────────────────→ [bloqueado]
[confirmado] ─── terminal (snapshot imutável) ─────────────→ [confirmado]
```

### Efeitos cascata do STEP M1

| Ação | Efeito imediato | Efeito cascata | Formato obrigatório | Navegação |
|---|---|---|---|---|
| Usuário confirma perfil | `status_arquetipo = 'confirmado'` | Snapshot imutável gravado em `projects.archetype` | JSON com 5 dimensões + metadata ADR-0032 | redirect → STEP 2 |
| Usuário edita após confirmação | Novo snapshot criado | Snapshot anterior preservado (ADR-0032 §4) | `archetype_version` incrementado | permanecer no STEP M1 |
| HARD_BLOCK ativo | `status_arquetipo = 'bloqueado'` | Botão "Confirmar" desabilitado | `motivo_bloqueio` preenchido | permanecer no STEP M1 |

### Regras invariantes do STEP M1

1. Estado `inconsistente` exige correção dos dados — sem override, sem `acknowledgeInconsistency`
2. `acceptRisk()` é mecanismo AS-IS (gate pré-diagnóstico) — não se aplica ao gate M1
3. Score/confiança NÃO libera o gate
4. Botão "Identificar CNAEs" abre modal existente (reuso — não reimplementar RAG/LLM)
5. Botão "Avançar" NÃO abre modal CNAE — apenas valida e avança
6. "Cliente Vinculado" não aparece nesta tela
7. Snapshot é imutável após confirmação (ADR-0032)

### Referência de mockup

`docs/sprints/M1-arquetipo-negocio/MOCKUP_perfil_entidade_v5_1.html` (branch `docs/m1-arquetipo-exploracao`)
