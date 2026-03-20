# BASELINE TÉCNICA — Plataforma IA SOLARIS Compliance Tributária
**Versão:** v2.2 | **Data:** 20/03/2026 | **Checkpoint:** `a65014d6`

---

## 1. Resumo Executivo

A plataforma **IA SOLARIS** é um sistema SaaS de compliance tributário construído sobre a Reforma Tributária Brasileira (LC 214/2025 e LC 227/2025). O produto guia empresas por um fluxo diagnóstico completo — da coleta de perfil à geração de plano de ação — utilizando inteligência artificial generativa, motor de requisitos regulatórios canônicos, Gap Engine e Risk Engine.

O sistema está em produção na versão **v2.1** com 67 projetos cadastrados, 3 em andamento e 2 em avaliação. A próxima sprint (**v2.2**) introduzirá o Consistency Engine como gate obrigatório antes do diagnóstico.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React | 19 |
| Estilização | Tailwind CSS | 4 |
| Componentes UI | shadcn/ui | — |
| Roteamento client | Wouter | — |
| Backend | Express | 4 |
| API layer | tRPC | 11 |
| ORM | Drizzle ORM | — |
| Banco de dados | MySQL / TiDB | — |
| Autenticação | Manus OAuth | — |
| IA Generativa | OpenAI API (via invokeLLM) | — |
| Embeddings / RAG | cnaeEmbeddings + ragDocuments | — |
| Linguagem | TypeScript | 5 |
| Build tool | Vite | 7 |
| Testes | Vitest | 2.1.9 |
| Hospedagem | Manus Platform | — |

---

## 3. Arquitetura de Módulos

### 3.1 Regulatory Engine (Motor de Requisitos)

O Regulatory Engine é o núcleo de dados da plataforma. Ele ingere, normaliza e persiste os requisitos legais da Reforma Tributária.

**Fontes normativas ingeridas:**

| Fonte | Artigos | Requisitos brutos | Requisitos canônicos |
|---|---|---|---|
| LC 214/2025 | 156 páginas | 482 | — |
| LC 227/2025 | — | 32 | — |
| **Total** | — | **514** | **499** |

O algoritmo de deduplicação utiliza **Union-Find com similaridade Jaccard** (threshold 0.72, 51.370 comparações), resultando em 499 grupos canônicos (dedup 2.92%). Sete grupos multi-source foram identificados entre LC 214 e LC 227.

**Tabelas do banco:**

| Tabela | Função |
|---|---|
| `regulatory_sources` | Fontes normativas (LC 214, LC 227) |
| `regulatory_articles` | Artigos jurídicos extraídos |
| `regulatory_requirements` | Requisitos individuais (514 brutos) |
| `canonical_requirements` | Grupos canônicos (499 únicos) |
| `requirement_question_mapping` | 499 perguntas de diagnóstico mapeadas |
| `coverage_reports` | Relatórios de cobertura por auditoria |

**Qualidade das perguntas (TASK 3R.3):** score_real = 100% (499/499 approved), após 4 passagens de correção de artefatos e otimização de legibilidade empresarial.

### 3.2 Gap Engine (Motor de Diagnóstico)

Compara respostas do questionário com requisitos canônicos e classifica lacunas.

**Regras `classifyGap`:**

| Resposta | Gap Status | Severity | Tipo |
|---|---|---|---|
| `sim` | `compliant` | — | — |
| `nao` | `nao_compliant` | alta | ausencia_controle |
| `parcial` | `parcial` | media | implementacao_parcial |
| `nao_aplicavel` | `nao_aplicavel` | — | excluído do score |

**Fórmula de score:** `score = round((compliant + 0.5×parcial) / total_aplicavel × 100)`

**Tabelas do banco:** `compliance_sessions`, `questionnaire_responses`, `gap_analysis`, `gap_audit_trail`

**Testes:** 18 vitest — 100% passando.

### 3.3 Risk Engine (Motor de Risco)

Classifica, prioriza e quantifica o impacto dos gaps usando a fórmula `risk_score = base_score × gap_multiplier`.

**Regras de base_score por normative_type:**

| normative_type | Criticidade alta | Criticidade media | Criticidade baixa |
|---|---|---|---|
| `obrigacao` | 80 | 60 | 40 |
| `vedacao` | 80 | 60 | 40 |
| `direito` | 50 | 35 | 20 |
| `opcao` | 30 | 20 | 15 |

**Multiplicadores por gap_status:** `nao_compliant` = 1.0 | `parcial` = 0.5 | `compliant` = 0 | `nao_aplicavel` = 0

**Classificação risk_level:** `critico` (≥70) | `alto` (50–69) | `medio` (25–49) | `baixo` (0–24)

**Tabelas do banco:** `risk_analysis`, `risk_session_summary`

**Testes:** 37 vitest — 100% passando.

### 3.4 Action Engine (Motor de Ações)

Gera planos de ação priorizados a partir dos gaps e riscos identificados. Integrado ao workflow de aprovação jurídica e ao Quadro Kanban.

**Tabelas:** `actionPlans`, `actionPlanVersions`, `actions`, `phases`, `milestones`, `planApprovals`, `planReviews`

### 3.5 Briefing Engine

Consolida as 3 camadas de diagnóstico (Corporativo + Operacional + CNAE) e gera briefing via IA (OpenAI). Suporta versionamento e histórico de prompts.

**Tabelas:** `briefings`, `briefingVersions`, `riskMatrix`, `riskMatrixVersions`

### 3.6 RAG / Embeddings

Sistema de busca semântica sobre os CNAEs para sugestão automática de atividades econômicas.

**Tabelas:** `cnaeEmbeddings`, `ragDocuments`, `embeddingRebuildLogs`

---

## 4. Fluxo Funcional Atual (v2.1)

```
1. Perfil da Empresa (GATE obrigatório — 7 campos)
2. Questionário CNAE (descoberta de atividades)
3. Diagnóstico 3 camadas:
   a. Corporativo (QC-01 a QC-10)
   b. Operacional (QO-01 a QO-10)
   c. CNAE (QCNAE-01 a QCNAE-05)
4. Briefing (consolidação IA)
5. Matriz de Riscos
6. Plano de Ação
7. Dashboard Executivo
```

**Máquina de estados do projeto:**

| Estado | Descrição |
|---|---|
| `rascunho` | Projeto criado, perfil incompleto |
| `diagnostico_corporativo` | Questionário corporativo em andamento |
| `diagnostico_operacional` | Questionário operacional em andamento |
| `diagnostico_cnae` | Questionário CNAE em andamento |
| `briefing` | Diagnóstico completo, briefing em geração |
| `riscos` | Briefing concluído, matriz de riscos |
| `plano` | Riscos identificados, plano de ação |
| `aprovacao` | Plano aguardando aprovação jurídica |
| `concluido` | Plano aprovado e executando |

---

## 5. Inventário de Tabelas do Banco (62 tabelas)

| Grupo | Tabelas |
|---|---|
| Usuários e Projetos | `users`, `projects`, `projectParticipants`, `projectPermissions`, `clientMembers` |
| Assessment Legacy | `assessmentPhase1`, `assessmentPhase2`, `assessmentTemplates` |
| Briefing | `briefings`, `briefingVersions`, `riskMatrixPromptHistory` |
| Matriz de Riscos | `riskMatrix`, `riskMatrixVersions` |
| Plano de Ação | `actionPlans`, `actionPlanVersions`, `actionPlanPromptHistory`, `actionPlanTemplates`, `actionPlanPrompts` |
| Fases e Ações | `phases`, `actions`, `milestones`, `cosoControls` |
| Aprovação | `planApprovals`, `planReviews` |
| Questionários v2 | `corporateAssessments`, `branchAssessments`, `corporateActionPlans`, `branchActionPlans` + versões |
| Sessões | `sessions`, `sessionBranchAnswers`, `sessionActionPlans`, `sessionConsolidations` |
| Questionários v3 | `questionnaireAnswersV3`, `questionnaireProgressV3`, `questionnaireQuestionsCache` |
| Branches / CNAEs | `activityBranches`, `projectBranches`, `branchSuggestions`, `branchAssessmentTemplates` |
| RAG / Embeddings | `ragDocuments`, `cnaeEmbeddings`, `embeddingRebuildLogs` |
| Regulatory Engine | `regulatory_sources`, `regulatory_articles`, `regulatory_requirements`, `canonical_requirements`, `requirement_question_mapping` |
| Gap Engine | `compliance_sessions`, `questionnaire_responses`, `gap_analysis`, `gap_audit_trail` |
| Risk Engine | `risk_analysis`, `risk_session_summary` |
| Auditoria | `auditLog`, `taskHistory`, `stepComments`, `taskObservers`, `taskComments` |
| Sistema | `notifications`, `notificationPreferences`, `onboardingProgress` |

---

## 6. Inventário de Rotas (52 rotas)

As rotas estão organizadas em grupos funcionais no `App.tsx`:

| Grupo | Rotas principais |
|---|---|
| Core | `/`, `/projetos`, `/projetos/:id`, `/clientes`, `/usuarios` |
| Assessment Legacy | `/projetos/:id/avaliacao/fase1`, `/projetos/:id/avaliacao/fase2` |
| Fluxo v2.0 | `/modo-uso`, `/briefing`, `/questionario-ramos`, `/consolidacao` |
| Diagnóstico v2.1 | `/projetos/:id/questionario-corporativo-v2`, `/projetos/:id/questionario-operacional`, `/projetos/:id/questionario-cnae` |
| Compliance Engine v3 | `/projetos/:id/compliance-v3`, `/gaps`, `/risks`, `/actions`, `/tasks`, `/exports` |
| Gap Engine | `/diagnostico`, `/projetos/:projectId/diagnostico` |
| Risk Engine | `/risk-engine`, `/projetos/:projectId/risk-engine` |
| Demo | `/demo`, `/demo/assessment`, `/demo/dashboard`, `/demo/gaps`, `/demo/riscos`, `/demo/acoes`, `/demo/tarefas` |
| Admin | `/admin/embeddings`, `/gerenciar-equipe`, `/gestao-permissoes` |

---

## 7. Arquivos Críticos do Servidor

| Arquivo | Função |
|---|---|
| `server/routers.ts` | AppRouter principal — agrega todos os sub-routers |
| `server/gapEngine.ts` | Lógica do Gap Engine (classifyGap, calculateComplianceScore) |
| `server/riskEngine.ts` | Lógica do Risk Engine (classifyRisk, risk_score = base × multiplier) |
| `server/routers/gapRouter.ts` | Procedures tRPC do Gap Engine |
| `server/routers/riskRouter.ts` | Procedures tRPC do Risk Engine |
| `server/routers/diagnostic.ts` | Máquina de estados do diagnóstico v2.1 |
| `server/db.ts` | Query helpers do Drizzle ORM |
| `drizzle/schema.ts` | Schema completo do banco (62 tabelas) |
| `server/_core/llm.ts` | Helper invokeLLM (OpenAI) |
| `server/_core/context.ts` | Contexto tRPC (auth, user) |

---

## 8. Cobertura de Testes

| Módulo | Testes | Status |
|---|---|---|
| Gap Engine | 18 vitest | ✅ 100% |
| Risk Engine | 37 vitest | ✅ 100% |
| Auth (logout) | — | ✅ |
| TypeScript | tsc --noEmit | ✅ 0 erros |

---

## 9. Domínios e Acessos

| Recurso | URL |
|---|---|
| Plataforma (dev) | https://3000-ik11uudjlm6c7nvuw4470-fb9680b9.us2.manus.computer |
| Domínio customizado | compliancet-a6u3gslm.manus.space |
| Domínio alternativo | iasolaris.manus.space |
| Checkpoint atual | `a65014d6` |

---

## 10. Próxima Sprint (v2.2)

A sprint v2.2 introduz o **Consistency Engine** como gate obrigatório entre o Perfil da Empresa e o Diagnóstico. O novo fluxo será:

```
1. Projeto / Perfil da empresa
2. Análise de Consistência (NOVO — gate obrigatório)
3. Descoberta de CNAEs
4. Confirmação de CNAEs
5. Diagnóstico (Corporativo + Operacional + CNAE)
6. Briefing
7. Riscos
8. Plano
9. Dashboard
```

---

*Documento gerado automaticamente em 20/03/2026 — IA SOLARIS Compliance Tributária*
