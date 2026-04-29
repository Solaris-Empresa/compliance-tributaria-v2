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

## FLUXO M1 — Confirmação do Perfil da Entidade (Epic #830)

**Status:** DRAFT — implementação bloqueada por REGRA-M1-GO-NO-GO.
**Referências:** ADR-0031 (modelo dimensional), ADR-0032 (imutabilidade), SPEC-RUNNER-RODADA-D.md, DE-PARA-CAMPOS-PERFIL-ENTIDADE.md.

### Novos STEPs (inseridos no fluxo principal após GO M1)

#### STEP 1.1: NovoProjeto — ajustes M1 (decisão P.O. 2026-04-24)

**Rota:** `/projetos/novo` (mesmo path atual)
**Componente:** `NovoProjeto.tsx` (ajustado, não novo)
**Mudanças:**
- Remove campo "Cliente Vinculado" do form (permanece em `projects.clientId` gravado via contexto)
- Adiciona botão **"Identificar CNAEs"** após campo `descricao_negocio_livre`
- Botão "Avançar" **não** abre modal CNAE (apenas valida `cnaes[]` confirmados + descrição)
- Modal CNAE reusa RAG/LLM existente — **código NÃO é tocado**

**Saída:** projeto com `confirmedCnaes` (múltiplos, editáveis) + `description`.

#### STEP 1.5: Confirmação do Perfil (NOVO)

**Rota:** `/projetos/:id/perfil` (a definir)
**Componente:** `ConfirmacaoPerfil.tsx` (novo)
**Quando aparece:** entre Assessment Fase 2 e Briefing, após derivação dimensional completa
**Saída:** snapshot imutável do arquétipo com `status_arquetipo = confirmado`

**Estados exibidos:**
| status_arquetipo | UI | Avança para Briefing? |
|---|---|---|
| pendente | Preview read-only + botão "Confirmar perfil" | ❌ (exige confirmação) |
| inconsistente | Lista de blockers (missing fields, conflitos lógicos, AmbiguityError) | ❌ (exige correção) |
| bloqueado | `motivo_bloqueio` + orientação terminal | ❌ (terminal) |
| confirmado | Resumo imutável + opção "Iniciar nova versão" | ✅ |

**Integração upstream:** questionário dimensional (a definir)
**Integração downstream:** Briefing — só avança se `status_arquetipo = confirmado`
**Triggers automáticos:**
- Clique em "Confirmar perfil" → escreve snapshot com `perfil_hash`, `rules_hash`, `data_version`, `archetype_version='m1-v1.0.0'`, `imutavel=true`
- Edição após confirmado → cria **novo snapshot** em `status=pendente` (anterior preservado por ADR-0032 §1)

### Efeitos cascata obrigatórios (REGRA-ORQ-14)

| Ação | Efeito imediato | Efeito cascata | Formato dos dados | Navegação |
|---|---|---|---|---|
| Clica "Confirmar perfil" (pendente→confirmado) | Snapshot imutável gravado + **`projects.status = perfil_confirmado`** | M2 RAG filtro disponível para Briefing | `archetype` JSON + 4 colunas metadata em `projects` | Redireciona para `/projetos/:id/briefing-v3` |
| Edita projeto após confirmado | **Novo** snapshot `pendente` + **`projects.status = perfil_pendente`**; antigo preservado read-only | Briefing antigo **não regenera** (ADR-0032 §3) | Novo registro `archetype` com `data_version` incrementada | Volta a `/projetos/:id/perfil` (novo preview) |

### Mapping `status_arquetipo` → `projects.status` (Q-8 RESOLVIDA 2026-04-24)

4 valores novos no enum `projects.status` entre `cnaes_confirmados` e `assessment_fase1`:

| status_arquetipo | projects.status | Tela renderizada |
|---|---|---|
| (sem snapshot) | `cnaes_confirmados` ou anterior | NovoProjeto / CNAE modal |
| `pendente` | `perfil_pendente` | Formulário dimensional ou preview |
| `inconsistente` | `perfil_inconsistente` | Lista de blockers para corrigir |
| `bloqueado` | `perfil_bloqueado` | Mensagem terminal (ex.: V-05-DENIED) |
| `confirmado` | `perfil_confirmado` | Resumo read-only + botão "Próximo passo" |

### Saída terminal — estado `bloqueado` / V-05-DENIED (Q-4 + Q-6)

**Origem:** blocker `V-05-DENIED` com `severity="BLOCK_FLOW"` dispara `status_arquetipo = "bloqueado"` (SPEC-RUNNER §4.2.1 regra 1).

**Condição de entrada:**
- `seed.integra_grupo_economico == true` **E** `seed.analise_1_cnpj_operacional == false`
- Empresa pertence a grupo econômico **E** escopo solicitado é análise consolidada (>1 CNPJ)

**Consequências operacionais:**
- `projects.status` = `perfil_bloqueado` (mapping Q-8)
- Snapshot emitido com `status_arquetipo = "bloqueado"` + `motivo_bloqueio = "empresa integra grupo econômico E análise consolidada solicitada — fora do escopo M1 (1 CNPJ)"`
- Snapshot **imutável** (ADR-0032 §1) — IS-1 garante `motivo_bloqueio != null`
- **Fluxo E2E terminal:** usuário **não pode** avançar para briefing (gate §4.6 bloqueia)
- **Edição não desbloqueia** — resolver exige **criar novo projeto** por CNPJ individual

**UX esperada (TELA M1.2 estado bloqueado — ver UX_DICTIONARY):**
- Card vermelho com `motivo_bloqueio` literal
- Orientação: "Este projeto precisa ser dividido em projetos separados por CNPJ operacional para prosseguir"
- Link secundário: documentação sobre escopo M1 (1 CNPJ)
- SEM botão "Voltar e editar" (não resolve — é escopo, não dado)
- SEM botão "Iniciar nova versão" (terminal absoluto)

**Diferença vs V-05-INFO (3 estados NONE/INFO/DENIED — Q-4):**
- NONE (`integra_grupo_economico=false`): não emite blocker; fluxo normal
- INFO (`integra_grupo_economico=true` + `analise_1_cnpj_operacional=true`): emite `V-05-INFO` severity INFO; **não altera** `status_arquetipo` (IS-7); fluxo normal segue
- DENIED (`integra_grupo_economico=true` + `analise_1_cnpj_operacional=false`): este estado terminal — perfil bloqueado

**Auditoria:** snapshot `bloqueado` fica persistido imutável em `projects.archetype` JSON (ADR-0032 §1). Pode ser consultado posteriormente para decisão de desmembramento do projeto.

### Integração M1 → M2 (filtro RAG)

Formaliza no contrato `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md`. M2 consome snapshot imutável via `archetype_version` + `perfil_hash` para filtro pré-RAG determinístico.

---

## Fluxo M2 — Perfil da Entidade (PR-A #865 + PR-B #867 + PR-C)

> **Branch dual-path** controlado por feature flag `m2-perfil-entidade-enabled` (default false após merges).

### Sequência canônica (flag = true)

```
/projetos/novo
  ↓ handleSubmit + createProject
  ↓ extractCnaes (LLM) → modal CNAE
  ↓ confirmCnaes (mutation) — projects.confirmedCnaes persistido
  ↓ trpcUtils.featureFlags.isM2Enabled.fetch({projectId})
  ↓ flag === true →
/projetos/:id/perfil-entidade  (ConfirmacaoPerfil.tsx)
  ↓ perfil.build (auto, read-only)
  ↓ usuário revisa dimensões + Painel de Confiança PC-01..PC-06
  ↓ CTA "Confirmar Perfil da Entidade" (gate: status==='confirmado' AND 0 HARD_BLOCK)
  ↓ perfil.confirm (mutation)
  ↓ projects.archetype* persistido (write-once ADR-0031)
  ↓ FSM transition: cnaes_confirmados → perfil_entidade_confirmado
  ↓ CTA PC-06 habilitado
/projetos/:id/questionario-solaris  (Onda 1 — comportamento legado)
```

### Sequência legada (flag = false — default produção)

```
/projetos/novo
  ↓ confirmCnaes
  ↓ flag === false →
/projetos/:id/questionario-solaris  (sem passar por /perfil-entidade)
```

### Gate de entrada `/questionario-solaris` (frontend useEffect)

| flag | perfil.confirmed | Ação |
|---|---|---|
| `false` | qualquer | render normal (legado preservado) |
| `true` | `true` | render normal |
| `true` | `false` | redirect para `/perfil-entidade` (replace) |

### FSM transitions (server/flowStateMachine.ts)

```
cnaes_confirmados → onda1_solaris             (legado, preservado para flag=false)
cnaes_confirmados → perfil_entidade_confirmado (M2, ativada por flag=true)
perfil_entidade_confirmado → onda1_solaris    (NOVA, M2 PR-A)
```

### Procedures envolvidas

| Procedure | Tipo | Persiste? | Idempotente? | Guard |
|---|---|---|---|---|
| `featureFlags.isM2Enabled` | query | não | sim | `protectedProcedure` |
| `perfil.build` | query | não | sim | `assertM2Enabled` |
| `perfil.confirm` | mutation | sim (write-once) | não (409 se 2ª chamada) | `assertM2Enabled` |
| `perfil.get` | query | não | sim | `assertM2Enabled` |

### Trilha paralela `/admin/m1-perfil` — preservada (regressão E2E C8)

Tela admin do Runner v3 (M1 Monitor) **não conectada** ao fluxo cliente. Persiste em `m1_runner_logs` (monitoring). PR-C confirma via teste Playwright que `/admin/m1-perfil` continua acessível e funcional.
