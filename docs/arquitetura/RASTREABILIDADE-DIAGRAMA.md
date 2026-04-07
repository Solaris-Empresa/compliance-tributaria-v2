# Rastreabilidade do Diagrama de Visão Geral — IA SOLARIS

**Versão:** 1.0 · **Data:** 2026-04-07 · **HEAD:** `1a995c9` (feat/z02-risk-categorizer-gate-b)
**Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Visão Geral do Diagrama

O diagrama representa o pipeline completo de compliance tributário da Reforma (LC 214/2025), com 6 fontes de entrada, 2 consolidadores, 4 saídas intermediárias, 1 motor de geração de ações, e 2 saídas finais. O fluxo é orquestrado pelo `flowStateMachine.ts` e executado via procedures tRPC no servidor Express.

---

## Tabela de Rastreabilidade

### Fontes de Entrada (nós superiores)

| Nó | Tipo | Regra / Requisito | Entrada | Saída | Como é Produzido | Arquivo(s) Principal(is) | Premissas |
|---|---|---|---|---|---|---|---|
| **Perfil da Empresa** | Fonte de dados | Dados cadastrais obrigatórios para iniciar o fluxo. Gate A: `consistencia_pendente` exige `consistencyCheckStatus` preenchido. | CNPJ, tipo jurídico, porte, regime tributário, faturamento, UF, setor | `CorporateAnswers`, `operationProfile` (JSON persistido em `projects`) | Preenchimento manual pelo usuário no formulário de onboarding (Step 1–3 do fluxo V3). Persistido via `trpc.fluxoV3.updateProject`. | `server/routers-fluxo-v3.ts` (l. 80–145), `server/routers-onboarding.ts`, `drizzle/schema.ts` (`projects.operationProfile`) | CNPJ válido (14 dígitos). Regime tributário deve ser consistente com faturamento (validado pelo CPIE). |
| **SOLARIS** | Fonte de perguntas (Onda 1) | K-2: perguntas jurídicas curadas da base `solaris_questions`, injetadas ANTES das perguntas de diagnóstico. `fonte = "solaris"`. | CNAE do projeto (código) | Array de `Onda1Question[]` com `fonte: "solaris"`, `source_reference: "SOLARIS — {categoria}"` | `getOnda1Questions(cnaeCode)` busca em `solaris_questions` WHERE `cnae_code = ?` AND `ativo = true`. Injetadas no `questionEngine` antes das perguntas RAG. | `server/routers/onda1Injector.ts` (l. 55–84), `server/routers/questionEngine.ts`, `drizzle/schema.ts` (`solaris_questions`) | Tabela `solaris_questions` deve ter registros ativos para o CNAE. Banco: 36 perguntas ativas (pós Z-06). |
| **IA GEN** | Fonte de perguntas (Onda 2) | K-3: perguntas geradas por LLM quando não há cobertura suficiente no RAG. `fonte = "ia_gen"`, `confidence_score = 0.5`. | Perfil da empresa + CNAEs confirmados + contexto RAG insuficiente | Array de perguntas com `fonte: "ia_gen"` | `trpc.fluxoV3.getOnda2Questions`: LLM (`invokeLLM`) gera 5 perguntas contextuais. Fallback: 5 perguntas estáticas pré-definidas (ia-gen-001 a ia-gen-005). Respostas salvas via `trpc.fluxoV3.saveOnda2Answers`. | `server/routers-fluxo-v3.ts` (l. 2370–2510), `server/_core/llm.ts` | `confidence_score` sempre 0.5 para IA GEN. Fonte "ia_gen" indica ausência de base documental RAG. |
| **CNAE** | Corpus de embeddings | Descoberta e confirmação de CNAEs via similaridade semântica. Gate B: `cnaes_confirmados` exige `confirmedCnaes` array não-vazio. | Descrição da atividade empresarial (texto livre) | Lista de CNAEs sugeridos com score de similaridade | `trpc.fluxoV3.extractCnaes`: busca por similaridade em `cnaeEmbeddings` (1.332 chunks). `trpc.fluxoV3.refineCnaes`: refina com LLM. `trpc.fluxoV3.confirmCnaes`: persiste em `projects.confirmedCnaes`. | `server/routers-fluxo-v3.ts` (l. 147–460), `server/routers-admin-embeddings.ts`, `drizzle/schema.ts` (`cnaeEmbeddings`) | Tabela `cnaeEmbeddings` deve ter embeddings gerados (1.332 registros). Mínimo 1 CNAE confirmado para avançar. |
| **NCM** | Parâmetro de entrada | Códigos de produtos (Nomenclatura Comum do Mercosul) para análise de IBS/CBS sobre mercadorias. DEC-M3-05 v3 · ADR-0009. | Array de `{ ncm_code: string, descricao: string }` | Campo `principaisProdutos` em `operationProfile` (JSON) | Preenchido pelo usuário no Step de Perfil Operacional. Persistido via `trpc.fluxoV3.updateOperationProfile` (Bloco E). Lido em `generateBriefingV3` e `deriveRisksFromGaps`. | `server/routers-fluxo-v3.ts` (l. 88–105, 2483–2520), `server/lib/engine-gap-analyzer.ts` | NCM não persistido em coluna separada — armazenado dentro de `operationProfile` JSON. Fallback: parâmetro direto (compatibilidade legada). |
| **NBS** | Parâmetro de entrada | Códigos de serviços (Nomenclatura Brasileira de Serviços) para análise de IBS/CBS sobre serviços. DEC-M3-05 v3 · ADR-0009. | Array de `{ nbs_code: string, descricao: string }` | Campo `principaisServicos` em `operationProfile` (JSON) | Idêntico ao NCM: preenchido no Step de Perfil Operacional, persistido em `operationProfile.principaisServicos`. Lido nos engines de briefing e risco. | `server/routers-fluxo-v3.ts` (l. 88–105, 2483–2520), `server/lib/engine-gap-analyzer.ts` | NBS não persistido em coluna separada — armazenado dentro de `operationProfile` JSON. |

---

### Consolidadores (nós centrais superiores)

| Nó | Tipo | Regra / Requisito | Entrada | Saída | Como é Produzido | Arquivo(s) Principal(is) | Premissas |
|---|---|---|---|---|---|---|---|
| **Consolidador de Completude** | Motor de análise | Avalia se o perfil da empresa tem dados suficientes para diagnóstico confiável. Produz status `insuficiente / parcial / completo` baseado em cobertura RAG (≥3 chunks = completa, 1–2 = parcial, 0 = insuficiente). | `CorporateAnswers`, `OperationalAnswers`, respostas do questionário, chunks RAG utilizados | `cobertura: "completa" | "parcial" | "insuficiente"`, `confiabilidade: number`, `alertas: string[]` | `calcFundamentacao()` em `server/ai-schemas.ts` (l. 255–300): conta `chunks_utilizados` por item. Score CPIE (`calcOverallScore`) complementa a avaliação de completude do perfil. | `server/ai-schemas.ts` (l. 212–300), `server/cpie.ts` (`calcDimensionScores`, `calcOverallScore`), `server/routers/cpieRouter.ts` | Requer que o RAG tenha sido consultado antes da avaliação. CPIE avalia 5 dimensões: Identificação (20%), Regime Tributário (25%), Operações (20%), Compliance (20%), Contexto (15%). |
| **Consolidador de Diagnóstico** | Motor de agregação | Agrega as 3 camadas de diagnóstico (corporativo + operacional + CNAE) em payload único para os engines downstream. `consolidateDiagnosticLayers()`. | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` (3 camadas independentes) | `aggregatedDiagnosticAnswers: DiagnosticAnswer[]` — array plano de pares `{ question, answer }` compatível com `generateBriefing`, `generateRiskMatrices` e `generateActionPlan` | `consolidateDiagnosticLayers({ corporateAnswers, operationalAnswers, cnaeAnswers })` mapeia cada campo estruturado para texto legível usando labels canônicos (`COMPANY_TYPE_LABELS`, etc.). Chamado em `server/routers/diagnostic.ts` (l. 126, 242). | `server/diagnostic-consolidator.ts` (l. 303–395), `server/routers/diagnostic.ts` (l. 16–20, 126, 242) | As 3 camadas são independentes e podem ser preenchidas em sessões separadas. `isDiagnosticComplete()` verifica se todas estão em status `"completed"`. |

---

### Saídas Intermediárias

| Nó | Tipo | Regra / Requisito | Entrada | Saída | Como é Calculado/Produzido | Arquivo(s) Principal(is) | Premissas |
|---|---|---|---|---|---|---|---|
| **Status: insuficiente / parcial / completo** | Saída do Consolidador de Completude | Derivado de `chunks_utilizados` por item de fundamentação. Regra: ≥3 chunks = `completa`, 1–2 = `parcial`, 0 = `insuficiente`. | `fundamentacoes[]` (array de itens com `chunks_utilizados`) | `cobertura: "completa" | "parcial" | "insuficiente"`, `itens_cobertura_parcial: number`, `itens_cobertura_insuficiente: number`, `alerta_cobertura: string` | `calcFundamentacaoSummary(fundamentacoes)` em `server/ai-schemas.ts` (l. 282–302): conta parciais e insuficientes. Se `insuficiente > 0` ou `confiabilidade < 0.5` → alerta de revisão por especialista. | `server/ai-schemas.ts` (l. 212–302) | Exibido no frontend como badge de confiança no briefing. Não bloqueia o fluxo — é informativo. |
| **Gaps Unificados** | Saída do Consolidador de Diagnóstico | B4 — Gap Engine: gaps derivam de `requirement_id` (obrigatório). Classificação: `ausencia | parcial | inadequado`. Tipo: `normativo | processo | sistema | cadastro | contrato | financeiro | acessorio`. | `aggregatedDiagnosticAnswers[]`, `requirement_id`, NCM/NBS, respostas Onda 1 e Onda 2 | `project_gaps_v3` (tabela): `gap_classification`, `gap_type`, `gap_description`, `evaluation_confidence`, `source_reference`, `lei_ref` | `deriveGapsFromAnswers()` em `server/lib/engine-gap-analyzer.ts`: analisa respostas contra requisitos normativos. Persistido em `project_gaps_v3` via `server/routers/gapEngine.ts`. Onda 2 (`ia_gen`) também gera gaps via `analyzeIagenAnswers()`. | `server/routers/gapEngine.ts`, `server/lib/engine-gap-analyzer.ts`, `server/lib/iagen-gap-analyzer.ts`, `drizzle/schema.ts` (`project_gaps_v3`) | Gap sem `requirement_id` é impossível (regra B4). `source_reference` obrigatório para gaps não-IA. |
| **Riscos** | Saída do Consolidador de Diagnóstico | ADR-010 — Risk Engine B5: riscos derivados de gaps (`direto`), inferidos (`derivado`) e contextuais (`contextual`). Severidade: `baixo | medio | alto | critico`. | `project_gaps_v3` (gaps unificados), perfil da empresa, NCM/NBS | `project_risks_v3` (tabela): `risk_title`, `risk_description`, `severity`, `origin`, `risk_category_l1/l2/l3`, `lei_ref`, `source_reference` | `deriveRisksFromGaps(projectId)` em `server/routers/riskEngine.ts` (l. 325–424): 3 origens. `categorizeRisk()` (Z-02, novo) classifica em 9 categorias canônicas LC 214/2025, gravada em `risk_category_l2`. `calculateRiskScore()` calcula `probability × impact`. | `server/routers/riskEngine.ts`, `server/lib/risk-categorizer.ts` (Z-02), `drizzle/schema.ts` (`project_risks_v3`) | Requer gaps gerados antes. `risk_category_l2` recebe categoria canônica desde Z-02. |
| **Score CPIE** | Saída do Consolidador de Completude | CPIE = Company Profile Intelligence Engine. Score 0–100 ponderado em 5 dimensões. Penalidades por inconsistências (ex: MEI com Lucro Real = -30 pts). | `CpieProfileInput`: CNPJ, tipo jurídico, porte, regime tributário, faturamento, operações, compliance, contexto | `overallScore: number (0–100)`, `dimensions: ScoreDimension[]`, `confidenceScore: number`, `questions: string[]`, `suggestions: string[]` | `calcDimensionScores(input)` → 5 dimensões ponderadas. `calcOverallScore(dimensions)` → média ponderada. Persistido em `projects.profileCompleteness` e `cpieAnalysisHistory`. Chamado via `trpc.cpie.analyze`. | `server/cpie.ts` (l. 96–200), `server/routers/cpieRouter.ts`, `drizzle/schema.ts` (`cpieAnalysisHistory`, `cpieSettings`) | Penalidades automáticas por inconsistência regime × faturamento. Score < 50 = perfil insuficiente para diagnóstico confiável. |

---

### Briefing Final

| Nó | Tipo | Regra / Requisito | Entrada | Saída | Como é Produzido | Arquivo(s) Principal(is) | Premissas |
|---|---|---|---|---|---|---|---|
| **Briefing Final** | Documento consolidado | ADR-010 — Briefing Engine B7. Gate `briefing_gerado`: `briefingContentV3` deve ser não-nulo para avançar para Step "Riscos". Seções obrigatórias: `identificacao`, `escopo`, `resumo_executivo`, `perfil_regulatorio`, `gaps`, `riscos`, `plano_acao`, `proximos_passos`. | `aggregatedDiagnosticAnswers[]`, gaps unificados, riscos, Score CPIE, status de completude, NCM/NBS, CNAEs confirmados | `briefingContentV3` (JSON estruturado em `projects`): `CompleteBriefing` com 8 seções validadas por Zod | `generateBriefingV3(projectId)` em `server/routers/briefingEngine.ts`: invoca LLM com prompt estruturado contendo todas as entradas. `checkCoverage()` valida cobertura mínima das seções. `checkConsistency()` detecta conflitos entre seções. Persistido via `trpc.briefingEngine.generate`. | `server/routers/briefingEngine.ts`, `server/routers-fluxo-v3.ts` (l. 600–700), `drizzle/schema.ts` (`projects.briefingContentV3`) | Requer diagnóstico completo (3 camadas). Fluxo V3: usa `briefingContentV3`; Fluxo V1 (legado): usa `briefingContent`. `checkCoverage()` e `checkConsistency()` são exportados e testados. |

---

### Gerador de Ações e Saídas Finais

| Nó | Tipo | Regra / Requisito | Entrada | Saída | Como é Produzido | Arquivo(s) Principal(is) | Premissas |
|---|---|---|---|---|---|---|---|
| **Gerador de Ações** | Motor de derivação | ADR-010 — Action Engine. Gate `riscos_gerados`: `riskMatricesDataV3` deve ser não-nulo. Prioridades: `imediata | curto_prazo | medio_prazo | planejamento`. Tipos: `adaptacao_fiscal`, `revisao_contratual`, `adequacao_sistema`, `treinamento`, `consultoria`, `monitoramento`, `documentacao`. | `project_risks_v3` (riscos gerados), perfil da empresa, briefing final | `project_action_plans_v3` (tabela): `DerivedAction[]` com `title`, `description`, `priority`, `action_type`, `responsible`, `deadline`, `risk_id` | `deriveActionsFromRisks(projectId)` em `server/routers/actionEngine.ts` (l. 325–430): para cada risco, seleciona template via `getTemplateByType(riskType, domain)` e personaliza com LLM. Persistido via `persistActions()`. Chamado via `trpc.actionEngine.deriveActions`. | `server/routers/actionEngine.ts`, `drizzle/schema.ts` (`project_action_plans_v3`) | Requer riscos gerados. Templates pré-definidos por tipo de risco garantem consistência. LLM personaliza o conteúdo. |
| **Plano de Ação** | Saída estruturada | Gate `plano_gerado`: `actionPlansDataV3` deve ser não-nulo para avançar para Dashboard. Estrutura: ações agrupadas por prioridade e tipo. | `DerivedAction[]` (saída do Gerador de Ações) | `actionPlansDataV3` (JSON em `projects`): ações agrupadas + metadados de geração | Consolidação das `DerivedAction[]` em estrutura de plano. Persistido em `projects.actionPlansDataV3` e em `project_action_plans_v3` (tabela relacional). Visualizado no frontend via `trpc.actionPlans.*`. | `server/routers-action-plans.ts`, `server/routers-session-action-plan.ts`, `drizzle/schema.ts` (`project_action_plans_v3`, `projects.actionPlansDataV3`) | Fluxo V3: usa `actionPlansDataV3`; Fluxo V1 (legado): usa `actionPlansData`. |
| **Tarefas Atômicas** | Saída operacional | Sprint K · Issue #151 — TaskBoard. Decomposição do Plano de Ação em tarefas individuais com responsável, prazo e status. | `DerivedAction[]` (plano de ação) | Snapshot do TaskBoard: tarefas agrupadas por status (`pendente`, `em_andamento`, `concluida`), por responsável e por prazo | `trpc.taskboard.getSnapshot`: lê `project_action_plans_v3`, agrupa e formata para o TaskBoard do P.O. Não persiste dados adicionais — é uma view calculada sobre o plano. | `server/routers/taskboard.ts` (l. 187–end), `drizzle/schema.ts` (`project_action_plans_v3`) | Tarefas são as próprias `DerivedAction[]` do plano — não há tabela separada de tarefas. O TaskBoard é uma view de leitura. |

---

## Fluxo de Status (Máquina de Estados)

O pipeline é orquestrado por `server/flowStateMachine.ts` com 11 steps e gates de validação:

```
rascunho
  → [Gate: consistência] → consistencia_pendente
  → [Gate: cnaes_descobertos] → cnaes_confirmados
  → [Gate: cnaes_confirmados] → diagnostico_corporativo / operacional / cnae
  → [Gate: diagnostico_*_completo] → briefing
  → [Gate: briefing_gerado] → riscos
  → [Gate: riscos_gerados] → plano
  → [Gate: plano_gerado] → dashboard
```

**BUG-E2E-01 (PR #372, mergeado):** Transição `rascunho → cnaes_confirmados` agora é atômica — passa por `consistencia_pendente` internamente.

---

## Rastreabilidade de Regras Normativas

| Regra | Nó Impactado | Arquivo | Linha |
|---|---|---|---|
| LC 214/2025 — IBS/CBS | Riscos, Briefing, Gaps | `server/lib/risk-categorizer.ts` | l. 1–120 |
| LC 214/2025 Art. 2–4 — Imposto Seletivo | Riscos (`imposto_seletivo`) | `server/lib/risk-categorizer.ts` | l. 69–77 |
| LC 214/2025 Art. 9 — Split Payment | Riscos (`split_payment`) | `server/lib/risk-categorizer.ts` | l. 79–87 |
| LC 214/2025 Art. 16–20 — Créditos IBS/CBS | Riscos (`creditos_ibs_cbs`) | `server/lib/risk-categorizer.ts` | l. 89–97 |
| LC 214/2025 Art. 25–30 — Período de Transição | Riscos (`transicao`) | `server/lib/risk-categorizer.ts` | l. 99–107 |
| ADR-010 — Risk Engine B5 | Riscos | `server/routers/riskEngine.ts` | l. 1–560 |
| ADR-010 — Briefing Engine B7 | Briefing Final | `server/routers/briefingEngine.ts` | l. 1–end |
| K-2 — Onda 1 SOLARIS | SOLARIS (fonte) | `server/routers/onda1Injector.ts` | l. 1–90 |
| K-3 — Onda 2 IA GEN | IA GEN (fonte) | `server/routers-fluxo-v3.ts` | l. 2370–2510 |
| DEC-M3-05 v3 · ADR-0009 — NCM/NBS | NCM, NBS (fontes) | `server/routers-fluxo-v3.ts` | l. 47, 88–105 |
| B4 — Gap Engine | Gaps Unificados | `server/routers/gapEngine.ts` | l. 1–end |
| Sprint K #151 — TaskBoard | Tarefas Atômicas | `server/routers/taskboard.ts` | l. 187–end |

---

## Resumo de Cobertura

| Nó do Diagrama | Implementado | Arquivo Principal | Status |
|---|---|---|---|
| Perfil da Empresa | ✅ | `routers-fluxo-v3.ts`, `routers-onboarding.ts` | Produção |
| SOLARIS | ✅ | `routers/onda1Injector.ts` | Produção |
| IA GEN | ✅ | `routers-fluxo-v3.ts` (l. 2370+) | Produção |
| CNAE | ✅ | `routers-fluxo-v3.ts` (extractCnaes/confirmCnaes) | Produção |
| NCM | ✅ | `routers-fluxo-v3.ts` (operationProfile) | Produção (Bloco E) |
| NBS | ✅ | `routers-fluxo-v3.ts` (operationProfile) | Produção (Bloco E) |
| Consolidador de Completude | ✅ | `ai-schemas.ts`, `cpie.ts` | Produção |
| Consolidador de Diagnóstico | ✅ | `diagnostic-consolidator.ts` | Produção |
| Status insuf./parcial/completo | ✅ | `ai-schemas.ts` | Produção |
| Gaps Unificados | ✅ | `routers/gapEngine.ts`, `lib/engine-gap-analyzer.ts` | Produção |
| Riscos | ✅ | `routers/riskEngine.ts`, `lib/risk-categorizer.ts` | Produção (Z-02) |
| Score CPIE | ✅ | `cpie.ts`, `routers/cpieRouter.ts` | Produção |
| Briefing Final | ✅ | `routers/briefingEngine.ts` | Produção |
| Gerador de Ações | ✅ | `routers/actionEngine.ts` | Produção |
| Plano de Ação | ✅ | `routers-action-plans.ts` | Produção |
| Tarefas Atômicas | ✅ | `routers/taskboard.ts` | Produção |

**Cobertura total: 16/16 nós implementados (100%)**
