# CPIE — Mapeamento dos 4 Scores

## IA SOLARIS · Compliance Tributário v2
## Versão 1.0 · 2026-04-18 · Audiência: P.O. · Orquestrador · Advogado · Auditoria
## Escopo: **Company Profile Intelligence Engine (CPIE) em todas as suas formas**

---

## 0. Por que este documento existe

O termo "CPIE" é usado na plataforma para referenciar **4 motores distintos** com
fórmulas, fontes de dados e finalidades diferentes. A ambiguidade entre eles é
fonte frequente de insegurança por parte do P.O., dos advogados parceiros e da
equipe técnica. Este documento **consolida os 4 scores** em um único local
autoritativo, com fórmulas, pontos de atualização no fluxo E2E e estado atual
em produção.

> **Escopo:** apenas CPIE. Não trata da Matriz de Riscos, do Score de Compliance
> da Consolidação (Step 7) nem da suite de testes Z-20. Para esses, ver
> `MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` e artefatos relacionados.

---

## 1. Os 4 scores — tabela definitiva

| # | Nome | Arquivo fonte | Propósito | Determinístico? |
|---|---|---|---|---|
| A | **CPIE v1 (Profile)** | `server/cpie.ts` | Qualidade/completude do perfil (5 dimensões) | Sim (score puro) — LLM usado só para perguntas dinâmicas |
| B | **CPIE v2 (Conflict Intelligence)** | `server/cpie-v2.ts` | Coerência de realidade — 3 scores + vetos | Parcial (veto determinístico + veto IA) |
| C | **CPIE-B (Scoring Engine)** | `server/routers/scoringEngine.ts` | Score consolidado Gaps 40% + Riscos 35% + Ações 25% | Sim |
| D | **Compliance Score v4** | `server/lib/compliance-score-v4.ts` | Exposição tributária sobre riscos aprovados (Step 7) | Sim |

**Nota:** Este documento cobre A, B, C em profundidade. O Score D é detalhado em
`MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md §6-§7` (sprint Z-20, separada).

---

## 2. Score A — CPIE v1 (Profile)

**Arquivo:** `server/cpie.ts` (Sprint v6.0 Issue C1)
**Persistência:** `projects.profileCompleteness` + `projects.profileConfidence` + `cpie_analysis_history`
**Exibido em:** `AdminCpieDashboard.tsx`, `CpieScoreBadge.tsx`
**Determinismo:** cálculo dos 5 dimensões é **100% determinístico**. LLM é chamado
apenas para gerar `dynamicQuestions`, `suggestions` e `insights` — não afeta o score.

### 2.1 Fórmula global

```
overallScore = ROUND( Σ(score_dimensão × peso_dimensão) / Σ(pesos) )
```

Onde Σ(pesos) = 20 + 25 + 20 + 20 + 15 = **100**.

### 2.2 Score por dimensão

```
score_dimensão = ROUND( campos_preenchidos / total_campos_dimensão × 100 )
```

### 2.3 As 5 dimensões e seus pesos

| # | Dimensão | Peso | Campos avaliados | Total |
|---|---|---|---|---|
| 1 | Identificação | 20% | `cnpj` (14 dígitos válidos) · `companyType` · `companySize` | 3 |
| 2 | Regime Tributário | 25% | `taxRegime` · `annualRevenueRange` | 2 |
| 3 | Operações | 20% | `operationType` · `clientType` (array não vazio) · `multiState` | 3 |
| 4 | Complexidade Tributária | 20% | `hasMultipleEstablishments` · `hasImportExport` · `hasSpecialRegimes` | 3 |
| 5 | Governança Tributária | 15% | `hasTaxTeam` · `hasAudit` · `hasTaxIssues` | 3 |

Referência: `server/cpie.ts:99-193`.

### 2.4 Penalidades da Dimensão 2 (Regime Tributário)

Além da proporção de campos preenchidos, a Dimensão 2 aplica penalidades por
inconsistência, **ambas com floor em 0** (`Math.max(0, taxScore - penalidade)`):

| Condição | Penalidade | Ref |
|---|---|---|
| `taxRegime = 'simples_nacional'` E `annualRevenueRange` com min > R$ 4.800.000 | −40 pontos | `cpie.ts:123-126` |
| `companySize = 'mei'` E `taxRegime ≠ 'simples_nacional'` | −30 pontos | `cpie.ts:127-129` |

**Constantes de faixa de faturamento** (`cpie.ts:89-94`):
```
"0-360000":           min 0        max 360.000
"360000-4800000":     min 360.001  max 4.800.000
"4800000-78000000":   min 4.800.001 max 78.000.000
"78000000+":          min 78.000.001 max Infinity
```

### 2.5 Confidence Score (métrica secundária)

O `confidenceScore` (`projects.profileConfidence`) mede o preenchimento dos **16
campos totais** do perfil — **independente dos pesos** das dimensões:

```
confidenceScore = ROUND( campos_preenchidos_de_16 / 16 × 100 )
```

**Nota:** a função específica que computa `confidenceScore` está inline em
`runCpieAnalysis` (cpie.ts:447+). Os 16 campos correspondem a todos os campos
de `CpieProfileInput` exceto `description` (que é texto livre).

### 2.6 Readiness Level (classificação final)

| Nível | Threshold | Mensagem ao usuário |
|---|---|---|
| Excelente | `score >= 85` | "Perfil excelente. A IA identificará CNAEs e riscos com alta precisão." |
| Bom | `65 ≤ score < 85` | "Perfil bom. Adicione os dados faltantes para maximizar a precisão." |
| Básico | `40 ≤ score < 65` | "Perfil básico. Complete as informações para um diagnóstico confiável." |
| Insuficiente | `score < 40` | "Perfil insuficiente. Preencha os campos obrigatórios para prosseguir." |

Referência: `cpie.ts:202-207`.

**Nota sobre limites:** por serem condições `>=` avaliadas em ordem, `score = 85`
é **Excelente** (não "Bom"). "Bom" é aberto no 85.

### 2.7 Exemplo de cálculo — projeto 930001 (hipotético)

Dados reais do projeto (`Manus SELECT 2026-04-18`):
- `cnpj = 00.394.460/0058-87` (14 dígitos válidos) ✓
- `companyType = ltda` ✓
- `companySize = media` ✓
- `taxRegime = lucro_real` ✓
- `annualRevenueRange = 4800000-78000000` ✓
- Demais campos: conteúdo depende de `operationProfile` — assumindo **apenas os 5
  campos acima preenchidos** (cenário mínimo):

| Dimensão | Campos preenchidos | Score | Peso | Contribuição |
|---|---|---|---|---|
| Identificação | 3/3 | 100 | 20 | 2.000 |
| Regime Tributário | 2/2 | 100 | 25 | 2.500 |
| Operações | 0/3 | 0 | 20 | 0 |
| Complexidade | 0/3 | 0 | 20 | 0 |
| Governança | 0/3 | 0 | 15 | 0 |
| **Total** | | | **100** | **4.500** |

```
overallScore    = ROUND(4500 / 100) = 45%     → Readiness: Básico
confidenceScore = ROUND(5/16 × 100) = 31%
```

**Nota:** se `operationProfile.tipoOperacao='comercio'` e `multiestadual=false`
também forem mapeados para `operationType` e `multiState` do `CpieProfileInput`,
os valores sobem. O cálculo exato depende do adaptador entre o perfil do banco
e o input do CPIE.

Porém, na prática, `projects.profileCompleteness = 0` para 930001 — a análise
**nunca foi executada** (ver §6).

### 2.8 Saídas adicionais do engine

Além do score, `runCpieAnalysis` retorna via LLM (em paralelo, não afeta score):

| Saída | Descrição |
|---|---|
| `dynamicQuestions` | Perguntas personalizadas para completar o perfil |
| `suggestions` | Sugestões de campos a preencher (com confidence 0-100) |
| `insights` | Observações relevantes para o compliance |
| `readinessMessage` | Mensagem textual do nível de readiness |
| `analysisVersion` | String `"cpie-v1.0"` |

### 2.9 Referência bibliográfica

**Nenhuma.** Modelo home-grown IA SOLARIS (Sprint v6.0 · Issue C1). Os pesos
20/25/20/20/15, as penalidades −30/−40, os thresholds de readiness 85/65/40 e
a escolha dos 16 campos **não citam nenhuma norma** (COSO ERM, ISO 31000,
NIST RMF, OECD Tax Guidelines). São decisões de produto documentadas apenas
no cabeçalho do arquivo.

---

## 3. Score B — CPIE v2 (Conflict Intelligence)

**Arquivo:** `server/cpie-v2.ts` (Sprint v6.0.R1 · Reset Conceitual · 22/03/2026)
**Status operacional:** **NÃO ATIVO em produção.** Router `cpieV2Router.ts` tem
`analyzePreview` usado em `NovoProjeto.tsx` como **gate** antes de `createProject`,
mas **não persiste** os 3 scores em banco. "Fase 3" (substituição total) nunca
foi mergeada.

### 3.1 Mudança conceitual fundamental (cpie-v2.ts:3-25)

> v1: mede **completude de formulário** → confunde preenchimento com coerência
> v2: mede **coerência de realidade** → detecta contradições compostas

**Papel da IA:** "Árbitro de realidade, não assistente de preenchimento."
Pergunta central: *"Essa empresa pode existir na realidade brasileira?"*

### 3.2 Três scores separados (nunca misturar)

| Score | Significado | Range |
|---|---|---|
| `completenessScore` | Quantos campos foram preenchidos (pode ser 100% com dados ruins) | 0-100 |
| `consistencyScore` | Coerência interna — **sujeito a veto** | 0-100 |
| `diagnosticConfidence` | Confiança diagnóstica real = `consistencyScore × completeness/100` | 0-100 |

### 3.3 Regras de veto

`aiVeto` e `deterministicVeto` são **tetos numéricos** que o `consistencyScore`
não pode ultrapassar.

**Exemplos:**
- Um único conflito composto crítico → teto ≤ 15, independente de completude
- MEI + faturamento 50M → veto 15 (inviável na realidade brasileira)

### 3.4 Tipos e severidade de conflito

| Atributo | Valores possíveis |
|---|---|
| `ConflictType` | `direct` · `inference` · `composite` |
| `ConflictSeverity` | `critical` · `high` · `medium` · `low` |

### 3.5 Gate no NovoProjeto

`trpc.cpieV2.analyzePreview` é chamado em `client/src/pages/NovoProjeto.tsx:226`
antes do `createProject`. Baseado no resultado:
- `canProceed = true` → prossegue com `createProject`
- `blockType = 'hard_block'` → bloqueia avanço
- `blockType = 'soft_block_with_override'` → permite override P.O. com motivo

### 3.6 Referência bibliográfica

**Nenhuma.** Reset Conceitual próprio (22/03/2026).

---

## 4. Score C — CPIE-B (Scoring Engine)

**Arquivo:** `server/routers/scoringEngine.ts` (Sprint I · B8 · Lote B AUDIT-C-003)
**Persistência:** `cpie_score_history`
**Invocado via:** `persistCpieScoreForProject()` em `approveActionPlan`
  (`routers-fluxo-v3.ts:1655`) — fire-and-forget, não bloqueia pipeline.

### 4.1 Fórmula global

```
cpieScore = ROUND(
  gapScore    × 0.40 +
  riskScore   × 0.35 +
  actionScore × 0.25
)
```

### 4.2 Pesos por dimensão (scoringEngine.ts:20-45)

**Dimensão Gap — por criticidade:**

| Criticidade | Peso |
|---|---|
| critica | 3.0 |
| alta | 2.0 |
| media | 1.0 |
| baixa | 0.5 |

**Dimensão Risco — por nível:**

| Nível | Peso |
|---|---|
| critico | 4.0 |
| alto | 3.0 |
| medio | 2.0 |
| baixo | 1.0 |

**Dimensão Ação — por prioridade:**

| Prioridade | Peso |
|---|---|
| imediata | 3.0 |
| curto_prazo | 2.0 |
| medio_prazo | 1.5 |
| planejamento | 1.0 |

### 4.3 Fórmulas internas

```
# Gap Score (penalidade normalizada)
gapPenalty  = Σ((1 - score_i) × w_i × confidence_i) / Σ w_i
gapScore    = (1 - gapPenalty) × 100

# Risk Score (proporção do máximo possível)
riskPenalty = Σ w_i / (N × 4.0)
riskScore   = (1 - riskPenalty) × 100

# Action Score (completion rate ponderada)
actionScore = (Σ w_completed / Σ w_total) × 100
```

### 4.4 Níveis de maturidade (scoringEngine.ts:218-223)

| Nível | Threshold | Cor |
|---|---|---|
| Excelente | score ≥ 85 | `#16a34a` (verde) |
| Alto | score ≥ 70 | `#2563eb` (azul) |
| Médio | score ≥ 50 | `#d97706` (âmbar) |
| Baixo | score ≥ 30 | `#dc2626` (vermelho) |
| Crítico | score < 30 | `#7f1d1d` (vermelho escuro) |

### 4.5 Fonte de dados

Lê **tabelas v3 legadas** (confirmado ADR-0023):
- `project_gaps_v3`
- `project_risks_v3`
- `project_actions_v3`

**Débito conhecido ADR-0023:**
> "Score CPIE-B continua lendo tabelas legadas até PR #E.
> Projetos novos com engine v4 terão CPIE-B zerado até PR #E."

Isto significa que todos os projetos criados após a Sprint Z-07 (hot swap engine
v4) têm CPIE-B = 0 automaticamente — não porque o engine está quebrado, mas
porque as v3 tables não são populadas para projetos v4.

### 4.6 Referência bibliográfica

**Nenhuma.** Sprint I · Lote B (AUDIT-C-003) · 2026-04-09.

---

## 5. Dashboard Admin (`AdminCpieDashboard.tsx`)

**Rota:** `/admin/cpie-dashboard` · 410 linhas
**Fonte única:** `projects.profileCompleteness` — **apenas Score A (CPIE v1 Profile)**

### 5.1 Elementos exibidos

| Elemento | Dados |
|---|---|
| KPI Total de Projetos | `COUNT(*) FROM projects` |
| KPI Projetos Analisados | `COUNT(*) WHERE profileCompleteness > 0` |
| KPI Score Médio CPIE | `AVG(profileCompleteness)` filtrado por analisados |
| KPI Precisam de Atenção | `COUNT(*) WHERE profileCompleteness < 50` |
| Bar chart | Distribuição em 5 faixas (0-20, 21-40, 41-60, 61-80, 81-100) |
| Pie chart | Readiness (insufficient/basic/good/excellent) derivado do score |
| Line chart | Evolução do score médio — últimos 6 meses |
| Tabela "Ação imediata" | 8 projetos com score < 50 |
| Tabela "Top" | 5 projetos com score >= 80 |

### 5.2 O que o dashboard NÃO exibe

- ❌ Score B (CPIE v2) — três scores separados nunca expostos
- ❌ Score C (CPIE-B / Scoring Engine) — valores em `cpie_score_history`, não renderizado
- ❌ Score D (Compliance Score v4) — exibido na `ConsolidacaoV4` (Step 7), não no admin

### 5.3 Estado atual em produção (2026-04-18)

| KPI | Valor | Causa |
|---|---|---|
| Total de Projetos | 2.367 | Dados reais |
| Projetos Analisados | **0** | `saveAnalysis` nunca chamado (ver §7) |
| Score Médio CPIE | **0%** | Consequência do anterior |
| Precisam de Atenção | **2.367** | 100% com score < 50 (porque todos têm score = 0) |
| `cpie_analysis_history` | **0 registros** | Nenhuma análise salva |
| `cpie_score_history` | **0 registros** | `persistCpieScore` nunca inseriu |
| `project_scores_v3` | **0 registros** | CPIE-B nunca populou (ADR-0023 não resolvido) |
| `cpie_settings.last_monthly_report_at` | **NULL** | Cron mensal nunca rodou |

---

## 6. Onde cada score é atualizado no fluxo E2E

```
┌────────────────────────────────────────────────────────────────────┐
│ Step 1-3 — Perfil da Empresa                                       │
│                                                                    │
│ Usuário preenche CNPJ, CNAEs, regime, operações                    │
│   ↓                                                                │
│ ┌──────────────────────────────────┐                               │
│ │ trpc.cpieV2.analyzePreview       │  ← CHAMADO                    │
│ │ (cpie-v2.ts)                     │    calcula Score B            │
│ │                                  │    NÃO persiste em banco      │
│ │ retorna: canProceed + 3 scores   │                               │
│ └──────────────────────────────────┘                               │
│   ↓                                                                │
│ Gate: bloqueia/permite createProject                               │
│   ↓                                                                │
│ ┌──────────────────────────────────┐                               │
│ │ trpc.fluxoV3.createProject       │  ← CHAMADO                    │
│ │                                  │    cria projeto               │
│ │ ❌ NÃO chama cpie.saveAnalysis   │    profileCompleteness = 0   │
│ └──────────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 4 — Briefing                                                  │
│                                                                    │
│ Gate CPIE v1: cpie_settings.gate_enabled=1                         │
│   min_score_to_advance = 30                                        │
│   COMPORTAMENTO INDEFINIDO: score=0 é < 30 por default             │
│   mas a UI pode estar aplicando fallback (a confirmar)             │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 5 — Matriz de Riscos (engine v4)                              │
│                                                                    │
│ Nenhuma atualização de CPIE aqui                                   │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 6 — Planos de Ação                                            │
│                                                                    │
│ trpc.fluxoV3.approveActionPlan                                     │
│   ↓                                                                │
│ ┌──────────────────────────────────┐                               │
│ │ void persistCpieScoreForProject  │  ← FIRE-AND-FORGET            │
│ │ (scoringEngine.ts)               │    calcula Score C (CPIE-B)   │
│ │                                  │    lê v3 legadas (ADR-0023)   │
│ │ INSERT cpie_score_history        │    se v3 vazia: cpieScore = 0 │
│ └──────────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 7 — Consolidação V4                                           │
│                                                                    │
│ trpc.risksV4.calculateAndSaveScore                                 │
│   ↓                                                                │
│ ┌──────────────────────────────────┐                               │
│ │ calculateComplianceScore         │  ← Score D                    │
│ │ (compliance-score-v4.ts)         │    determinístico, engine v4  │
│ │                                  │                               │
│ │ UPDATE projects.scoringData      │                               │
│ │ (snapshots[] acumulado)          │                               │
│ └──────────────────────────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
```

### 6.1 Procedures que persistem Score A (CPIE v1)

| Procedure | Local | Invocada em produção? |
|---|---|---|
| `cpie.saveAnalysis` | `cpieRouter.ts:135+` | ❌ **NÃO** (grep: 0 invocações no frontend) |
| `cpie.saveAnalysisToHistory` | `cpieRouter.ts` | ✅ em `PerfilEmpresaIntelligente.tsx:833` — mas só grava em `cpie_analysis_history`, não em `projects.profileCompleteness` |
| `cpie.batchAnalyze` | `cpieRouter.ts:450+` | ✅ via `CpieBatchPanel.tsx` — **mas nunca clicado em produção** |
| `monthlyReportJob` | `server/jobs/monthlyReportJob.ts` | ❌ **Cron nunca configurado** (`last_monthly_report_at = NULL`) |

### 6.2 Procedures que persistem Score B (CPIE v2)

**Nenhuma.** `cpieV2.analyzePreview` calcula e retorna, mas não há procedure
paralela `saveAnalysisV2` — portanto nada é persistido.

### 6.3 Procedures que persistem Score C (CPIE-B)

| Procedure | Local | Invocada em produção? |
|---|---|---|
| `persistCpieScoreForProject` | `scoringEngine.ts:286+` | ✅ em `approveActionPlan` (fire-and-forget) — mas lê v3 legadas que estão vazias em projetos v4 |

---

## 7. Causa raiz do dashboard zerado

**Duas causas raiz distintas, ambas precisam ser resolvidas.**

### 7.1 Causa operacional

- `batchAnalyze` nunca rodado pelo admin
- `monthlyReportJob` não configurado como cron no servidor
- `cpie_settings.last_monthly_report_at = NULL` → confirma que job nunca executou

**Efeito:** sem ação manual ou cron, nada popula `profileCompleteness` em massa.

### 7.2 Causa de fluxo/código

- `createProject` não encadeia `cpie.saveAnalysis` no `onSuccess`
- `cpieV2.analyzePreview` calcula mas não persiste
- Migração v1→v2 incompleta (Fase 3 anunciada 22/03/2026, nunca mergeada)

**Efeito:** todo projeto novo nasce com `profileCompleteness = 0 DEFAULT` e
assim permanece, mesmo se o admin rodar `batchAnalyze` hoje.

### 7.3 Por que as 2 causas coexistem

| Cenário | Projetos legados (2367) | Projetos novos |
|---|---|---|
| Só resolver operacional (batchAnalyze) | ✅ Ganham score | ❌ Continuam 0% |
| Só resolver código (plugar createProject) | ❌ Continuam 0% | ✅ Ganham score |
| **Ambas juntas** | ✅ Backfill + forward fix | ✅ Forward fix permanente |

---

## 8. Impacto no produto

| Módulo | Impacto atual |
|---|---|
| `AdminCpieDashboard` | Todos os KPIs zerados — sem valor para o P.O. |
| `CpieScoreBadge` nos projetos | Exibe "Score CPIE não disponível" em todos os projetos |
| Gate CPIE (`min_score_to_advance=30`) | Habilitado mas comportamento indefinido (fallback a confirmar) |
| Aferição §13.5 critério 8 da suite Z-20 | Passa como ✅ porque lê `projects.scoringData` (Score D), não `profileCompleteness`. Se trocar critério para CPIE v1: 0/2367 passam |
| Relatório mensal | Nunca gerado |
| Bateria 2 E2E (Z-20) | CpieScoreBadge retorna 0 em todos os projetos v4 — achado colateral |

---

## 9. Ações possíveis (decisão P.O.)

| Opção | Descrição | Esforço | Risco | Duração |
|---|---|---|---|---|
| **A** | Admin clica "Analisar em Lote" (batch 50/vez × 48 lotes para 2367) | Baixo | Baixo | ~30 min operacional |
| **B** | Plugar `cpie.saveAnalysis` no `createProject.onSuccess` | Médio | Baixo | 2-3h código |
| **C** | Configurar `monthlyReportJob` como cron (node-cron ou systemd) | Médio | Baixo | 1-2h config |
| **D** | Migrar scores v3→CPIE via `cpie.scoreSync` | Baixo | Médio | 15 min (se v3 tiver dados — não tem: 0 registros) |
| **E** | Desabilitar CPIE na UI v4 (esconder `CpieScoreBadge` + dashboard) | Baixo | Nenhum | 30 min |
| **F** | Ativar CPIE v2 Fase 3 (substituir v1 em produção, persistir 3 scores) | Alto | Alto | 1 sprint |
| **G** | Fechar PR #E (ADR-0023) — reconciliar CPIE-B com engine v4 | Médio | Baixo | 1 sprint |

**Sequência recomendada:** A + B juntos (backfill + forward fix). C se quiser
recalculação periódica automática. F é decisão arquitetural maior. G é
independente e afeta apenas Score C.

---

## 10. Referências cruzadas

**Arquivos fonte (repo):**
- `server/cpie.ts` — Score A completo
- `server/cpie-v2.ts` — Score B
- `server/routers/cpieRouter.ts` — procedures v1
- `server/routers/cpieV2Router.ts` — procedures v2
- `server/routers/scoringEngine.ts` — Score C
- `server/lib/compliance-score-v4.ts` — Score D (ver doc separada)
- `server/jobs/monthlyReportJob.ts` — cron mensal
- `server/routers-fluxo-v3.ts:1655` — invocação `persistCpieScoreForProject`

**Frontend:**
- `client/src/pages/AdminCpieDashboard.tsx` — dashboard admin
- `client/src/components/CpieScoreBadge.tsx` — badge em projetos
- `client/src/components/CpieBatchPanel.tsx` — painel batch
- `client/src/components/CpieHistoryPanel.tsx` — histórico
- `client/src/components/CpieSettingsPanel.tsx` — settings
- `client/src/components/PerfilEmpresaIntelligente.tsx` — componente de perfil (invoca `cpie.analyze`)
- `client/src/pages/NovoProjeto.tsx` — invoca `cpieV2.analyzePreview`

**Schema DB:**
- `drizzle/schema.ts:1619-1635` — `cpieAnalysisHistory`
- `drizzle/schema.ts:1642-1660` — `cpieSettings`
- `projects.profileCompleteness` / `profileConfidence` / `profileLastAnalyzedAt` / `profileIntelligenceData`
- `cpie_score_history` (Score C)
- `project_gaps_v3` / `project_risks_v3` / `project_actions_v3` (fonte do Score C)

**ADRs:**
- `docs/adr/ADR-0023-cpie-score-opcao-a-sprint-z07.md` — débito CPIE-B × engine v4

**Documentos relacionados (escopo separado):**
- `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` §6 — Score D e contexto Matriz
- `docs/specs/SPEC-TESTE-MATRIZ-RISCOS-v1.md` — suite Z-20 (não CPIE)

---

## 11. Recomendação para sprint dedicada

Este documento consolida o estado atual do CPIE em 2026-04-18. Para avançar:

1. **Validar cobertura:** P.O. revisa §2-§4 e confirma que nenhum score foi
   omitido
2. **Decidir roadmap:** escolher combinação de ações A-G conforme §9
3. **Abrir sprint dedicada** (Z-21-CPIE ou numeração à escolha do Orquestrador)
   com issue de backfill (A) + fix de fluxo (B) como primeiro lote
4. **Criar ADR** para decisão sobre CPIE v2 Fase 3 (F) — definir se ativa,
   descontinua ou mantém híbrido
5. **Atualizar `DATA_DICTIONARY.md`** com as 4 tabelas CPIE e seus campos
6. **Alinhar nomenclatura na UI** — usuário/advogado vê "score" em 3 lugares com
   semânticas diferentes. Renomear para clareza:
   - "Qualidade do Perfil" (Score A)
   - "Coerência de Realidade" (Score B, se ativado)
   - "Maturidade de Compliance" (Score C)
   - "Score de Exposição" (Score D)

---

*IA SOLARIS · CPIE Mapeamento dos 4 Scores · 2026-04-18*
*Fonte de verdade: repositório `Solaris-Empresa/compliance-tributaria-v2` (branch main SHA `6b5bbfe`)*
*Escopo: apenas CPIE — Matriz de Riscos tratada em doc separada*
*Status: aguardando revisão P.O. + priorização da sprint dedicada*
