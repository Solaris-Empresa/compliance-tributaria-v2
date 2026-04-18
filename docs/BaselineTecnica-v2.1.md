# IA SOLARIS — Baseline Técnica da Plataforma

**Data:** 21 de março de 2026  
**Versão do documento:** 2.1  
**Checkpoint de referência:** `9d8f0ac5` (branch `main`)  
**Repositório:** `utapajos/compliance-tributaria-v2`  
**Ambiente de produção:** `https://iasolaris.manus.space`

> **Histórico de versões deste documento:**  
> v1.0 (19/03/2026, checkpoint `a9fd348c`) → v2.1 (21/03/2026, checkpoint `9d8f0ac5`)  
> **Mudanças desta versão:** Migração LLM para GPT-4.1 (v5.1.0), timeout 25s no `extractCnaes`, alertas granulares no cron de rebuild, banner de fallback semântico no frontend (v5.2.0).

---

## Sumário Executivo

A plataforma **IA SOLARIS** é um sistema de gestão de compliance tributário para a Reforma Tributária Brasileira (EC 132/2023 / LC 214/2025). Após 74 sprints de desenvolvimento e 2 sprints de manutenção (v5.1.0 e v5.2.0), o sistema atingiu maturidade técnica significativa: **55 tabelas no banco de dados**, **26 routers tRPC**, **78 arquivos de teste** com mais de 1.100 casos, e um pipeline de IA generativa com RAG híbrido sobre 63 artigos legislativos reais e busca vetorial semântica sobre 1.332 CNAEs via OpenAI `text-embedding-3-small`.

O fluxo principal (Fluxo v3) cobre 5 etapas sequenciais: criação de projeto com extração de CNAEs via IA, questionário adaptativo por CNAE (2 níveis), briefing de compliance, matrizes de riscos (4 áreas), e plano de ação com gestão de tarefas. A cobertura de requisitos funcionais documentados é de **91% (49/54 RFs totalmente implementados)**, com 5 RFs parcialmente implementados e 0 ausentes.

Paralelamente, existe um **módulo de demonstração standalone** (`/demo`) sem necessidade de login, com fluxo de onboarding simplificado, alimentado por dados pré-gerados pelo motor v3 (`solaris-compliance-v3`).

---

## 1. Stack Tecnológico

| Camada | Tecnologia | Detalhe |
|--------|-----------|---------|
| Frontend | React 19 + Tailwind 4 + shadcn/ui | Wouter para roteamento |
| Backend | Express 4 + tRPC 11 | Superjson para serialização |
| Banco | MySQL/TiDB via Drizzle ORM | 55 tabelas, 38 migrações |
| IA Generativa | **OpenAI GPT-4.1** via `invokeLLM` | `generateWithRetry`, temperatura 0.2 — **migrado de Gemini 2.5 Flash na v5.1.0** |
| Embeddings | OpenAI `text-embedding-3-small` | 1.332 CNAEs, 1.536 dimensões |
| RAG | Corpus 63 artigos (EC 132, LC 214, LC 227) | LIKE + re-ranking LLM |
| Auth | Manus OAuth (JWT + cookie) | Papéis: equipe_solaris, advogado_senior, advogado_junior, cliente |
| Storage | S3 via storagePut/storageGet | — |
| Testes | Vitest | 78 arquivos, 1.100+ casos |
| WebSocket | Node.js ws | Notificações em tempo real |

> **Nota crítica de configuração:** A partir da v5.1.0, a variável `OPENAI_API_KEY` é **obrigatória** tanto em desenvolvimento quanto em produção. A ausência desta variável causa falha silenciosa do CNAE discovery — o modal abre vazio sem mensagem de erro visível ao usuário.

---

## 2. Banco de Dados — 55 Tabelas

### 2.1 Domínio: Usuários e Autenticação

| Tabela | Propósito |
|--------|-----------|
| `users` | Usuários com campo `solarisRole` (equipe_solaris / advogado_senior / advogado_junior / cliente) |
| `onboardingProgress` | Progresso do tour interativo por usuário (V69) |

### 2.2 Domínio: Projetos e Clientes

| Tabela | Propósito |
|--------|-----------|
| `projects` | Entidade central com 40+ campos: `confirmedCnaes` (JSON), `questionnaireAnswers` (JSON), `briefingContent`, `riskMatricesData` (JSON), `actionPlansData` (JSON), `scoringData` (JSON), `decisaoData` (JSON) |
| `projectParticipants` | Vínculo N:N entre projeto e usuário |
| `clientMembers` | Membros de um cliente com papel (admin/colaborador/visualizador) |
| `projectPermissions` | Controle de acesso granular por projeto |
| `auditLog` | Log de auditoria de todas as operações críticas |

### 2.3 Domínio: Fluxo v3 (5 Etapas)

| Tabela | Propósito |
|--------|-----------|
| `questionnaireAnswersV3` | Respostas individuais do questionário por CNAE/nível |
| `questionnaireProgressV3` | Estado de progresso do questionário |
| `questionnaireQuestionsCache` | Cache cross-device das perguntas geradas pela IA (V70) |
| `briefingVersions` | Histórico de versões do briefing |
| `riskMatrix` | Matrizes de riscos por área (4 áreas) |
| `riskMatrixVersions` | Histórico de versões das matrizes |
| `actionPlans` | Planos de ação com tarefas por área |
| `actionPlanVersions` | Histórico de versões dos planos |
| `taskHistory` | Histórico de mudanças por tarefa |
| `taskComments` | Comentários por tarefa |
| `taskObservers` | Observadores de tarefas (notificações) |
| `stepComments` | Comentários por etapa do fluxo |

### 2.4 Domínio: IA e RAG

| Tabela | Propósito |
|--------|-----------|
| `cnaeEmbeddings` | 1.332 vetores semânticos de CNAEs (1.536 dim, text-embedding-3-small) — V71 |
| `embeddingRebuildLogs` | Histórico de rebuilds de embeddings (cron + manual) — V73 |
| `ragDocuments` | Corpus legislativo: 63 artigos (EC 132, LC 214, LC 227, Resoluções CG-IBS, IN RFB/CBS, Convênios CONFAZ) — V65/V66 |

### 2.5 Domínio: Módulos de Suporte (Legado v1/v2)

Tabelas de gerações anteriores que ainda existem no schema: `activityBranches`, `projectBranches`, `assessmentPhase1`, `assessmentPhase2`, `assessmentTemplates`, `corporateAssessments`, `branchAssessments`, `branchAssessmentTemplates`, `corporateActionPlans`, `branchActionPlans`, `corporateAssessmentVersions`, `branchAssessmentVersions`, `corporateActionPlanVersions`, `branchActionPlanVersions`, `sessions`, `sessionBranchAnswers`, `sessionActionPlans`, `sessionConsolidations`, `briefings`, `riskMatrixPromptHistory`, `riskMatrixVersions`, `actionPlanPromptHistory`, `actionPlanTemplates`, `actionPlanPrompts`, `phases`, `actions`, `cosoControls`, `milestones`, `notifications`, `notificationPreferences`, `planApprovals`, `planReviews`, `branchSuggestions`.

---

## 3. Backend — 26 Routers tRPC

### 3.1 Router Principal do Fluxo v3 — 28 Procedures

O arquivo `routers-fluxo-v3.ts` é o coração do sistema. Todas as procedures são `protectedProcedure`.

| Procedure | Etapa | Descrição | Mudanças v5.x |
|-----------|-------|-----------|---------------|
| `createProject` | 1 | Cria projeto com nome, descrição e clientId | — |
| `extractCnaes` | 1 | Extrai CNAEs via embeddings vetoriais + LLM | **timeout 25s, maxRetries 1, log TIMEOUT/ERROR, notifyOwner** |
| `refineCnaes` | 1 | Refina CNAEs com feedback do usuário (**backend pronto, frontend AUSENTE**) | — |
| `confirmCnaes` | 1 | Confirma CNAEs selecionados e avança para Etapa 2 | — |
| `createClientOnTheFly` | 1 | Cria cliente durante criação do projeto | — |
| `getProjectStep1` | 1 | Restaura dados da Etapa 1 | — |
| `generateQuestions` | 2 | Gera perguntas por CNAE/nível via LLM + RAG | — |
| `saveAnswer` | 2 | Salva resposta individual no banco | — |
| `getProgress` | 2 | Retorna progresso atual do questionário | — |
| `validateContextNote` | 2 | Valida nota de contexto adicional | — |
| `saveQuestionsCache` | 2 | Persiste perguntas geradas no banco (cross-device) | — |
| `getQuestionsCache` | 2 | Recupera perguntas do cache | — |
| `saveQuestionnaireProgress` | 2 | Salva estado de progresso | — |
| `getRoundsSummary` | 2 | Retorna resumo dos rounds de perguntas | — |
| `generateBriefing` | 3 | Gera briefing via LLM com RAG legislativo | — |
| `approveBriefing` | 3 | Aprova briefing e libera Gate 3 | — |
| `generateRiskMatrices` | 4 | Gera 4 matrizes em paralelo via Promise.all (~45s) | — |
| `approveMatrices` | 4 | Aprova matrizes e libera Gate 4 | — |
| `generateActionPlan` | 5 | Gera plano de ação por área via LLM | — |
| `updateTask` | 5 | Atualiza tarefa (status, %, datas, responsável) | — |
| `getTaskHistory` | 5 | Retorna histórico de mudanças de uma tarefa | — |
| `saveDraftActionPlan` | 5 | Salva rascunho do plano | — |
| `approveActionPlan` | 5 | Aprova plano e libera Gate 5 | — |
| `generateDecision` | 5 | Gera motor de decisão explícito (ação principal, prazo, risco) | — |
| `getProjectSummary` | — | Retorna resumo completo do projeto com scoring financeiro | — |
| `getBriefingInconsistencias` | — | Retorna alertas de inconsistência do briefing | — |
| `checkRevisionAccess` | — | Verifica acesso para revisão de etapas | — |

### 3.2 Routers de Módulos de Suporte (25 routers)

`onboarding`, `adminEmbeddings`, `notifications`, `audit`, `auditLogs`, `permissions`, `permissionsCheck`, `approvals`, `comments`, `tasks`, `analytics`, `reports`, `branches`, `assessments`, `actionPlans`, `actionsCrud`, `questionsCrud`, `sessions`, `sessionQuestionnaire`, `sessionActionPlan`, `sessionConsolidation`, `complianceV3`, `system`, `auth`, `users`.

---

## 4. Pipeline de IA Generativa

### 4.1 Camada 1 — Busca Vetorial Semântica de CNAEs (`cnae-embeddings.ts`)

A função `buildSemanticCnaeContext` usa estratégia **multi-query**: divide a descrição do negócio em cláusulas por atividade (separadas por vírgula, ponto-e-vírgula, "e", "além de"), gera embedding para cada cláusula via OpenAI `text-embedding-3-small`, e calcula similaridade de cosseno contra cache em memória (TTL 1h) com os 1.332 vetores pré-computados. O merge final usa 2 camadas: top-5 por cláusula garantidos + pool geral até 50 candidatos.

### 4.2 Camada 2 — RAG Híbrido Legislativo (`rag-retriever.ts` + `rag-corpus.ts`)

Corpus de 63 artigos reais: EC 132/2023, LC 214/2025, LC 227/2024, 12 Resoluções CG-IBS, 11 IN RFB/CBS, 14 Convênios CONFAZ. O motor usa dois modos: `retrieveArticlesFast` (busca LIKE para velocidade) e `retrieveArticles` (re-ranking LLM com temperatura 0.0 para precisão). Precisão de citação estimada: ~95%.

### 4.3 Camada 3 — Geração com Resiliência (`ai-helpers.ts`)

A função `generateWithRetry` encapsula todas as chamadas LLM com: retry automático (configurável por procedure), temperatura 0.2 para consistência, validação de schema Zod na saída, cache de resposta habilitado por padrão, e `OUTPUT_CONTRACT` (contrato de saída explícito) em todos os prompts para reduzir alucinações.

**Configuração de timeout por procedure (v5.2.0):**

| Procedure | `timeoutMs` | `maxRetries` |
|---|---|---|
| `extractCnaes` | **25.000ms** | **1** |
| Demais procedures | 180.000ms (padrão) | 2 |

### 4.4 Camada 4 — Paralelização

`generateRiskMatrices` usa `Promise.all` para gerar as 4 matrizes em paralelo (~45s vs ~3min sequencial). `generateAll` em assessments usa `Promise.allSettled` para não falhar tudo se 1 ramo falhar.

### 4.5 Pontos de Injeção de IA no Fluxo

| Etapa | Procedure | IA Utilizada |
|-------|-----------|-------------|
| 1 | `extractCnaes` | Embeddings vetoriais + GPT-4.1 (timeout 25s) |
| 1 | `refineCnaes` | GPT-4.1 para reanalise com feedback |
| 2 | `generateQuestions` | GPT-4.1 + RAG legislativo |
| 3 | `generateBriefing` | GPT-4.1 + RAG legislativo |
| 3 | `getBriefingInconsistencias` | GPT-4.1 para detecção de inconsistências |
| 4 | `generateRiskMatrices` | GPT-4.1 + RAG (4 matrizes em paralelo) |
| 5 | `generateActionPlan` | GPT-4.1 para plano por área |
| 5 | `generateDecision` | GPT-4.1 para motor de decisão |

---

## 5. Frontend — Rotas e Páginas

### 5.1 Fluxo Principal v3 (5 Etapas)

| Rota | Etapa | Componente | Mudanças v5.x |
|------|-------|-----------|---------------|
| `/projetos/novo` | 1 | `NovoProjeto.tsx` — Criação + extração de CNAEs | **Banner amber de fallback semântico (v5.2.0)** |
| `/projetos/:id/questionario-v3` | 2 | `QuestionarioV3.tsx` — Questionário adaptativo | — |
| `/projetos/:id/briefing-v3` | 3 | `BriefingV3.tsx` — Briefing de compliance | — |
| `/projetos/:id/matrizes-v3` | 4 | `MatrizesV3.tsx` — Matrizes de riscos | — |
| `/projetos/:id/plano-v3` | 5 | `PlanoAcaoV3.tsx` — Plano de ação | — |

### 5.2 Compliance Engine v3 (Motor Externo)

| Rota | Componente |
|------|-----------|
| `/projetos/:id/compliance-v3` | `ComplianceDashboardV3.tsx` — Dashboard com radar, matriz 4×4, KPIs |
| `/projetos/:id/compliance-v3/gaps` | `GapsV3.tsx` |
| `/projetos/:id/compliance-v3/risks` | `RisksV3.tsx` |
| `/projetos/:id/compliance-v3/actions` | `ActionsV3.tsx` |
| `/projetos/:id/compliance-v3/tasks` | `TasksV3.tsx` |
| `/projetos/:id/compliance-v3/exports` | `ExportsV3.tsx` |

### 5.3 Demo Standalone (Sem Login)

| Rota | Componente | Função |
|------|-----------|--------|
| `/demo` | `DemoLanding.tsx` | Landing com 3 cenários + botão "Iniciar Diagnóstico" |
| `/demo/assessment` | `DemoAssessment.tsx` | Onboarding: nome+descrição → CNAEs → 5 perguntas |
| `/demo/dashboard` | `DemoDashboard.tsx` | Dashboard com dados do motor v3 |
| `/demo/gaps` | `DemoGaps.tsx` | Gaps de compliance |
| `/demo/riscos` | `DemoRiscos.tsx` | Matriz de riscos |
| `/demo/acoes` | `DemoAcoes.tsx` | Plano de ação |
| `/demo/tarefas` | `DemoTarefas.tsx` | Tarefas atômicas |

### 5.4 Módulos de Suporte

| Rota | Função |
|------|--------|
| `/projetos` | Lista de projetos com filtros e status |
| `/projetos/:id` | Detalhes e acesso ao Compliance Engine v3 |
| `/clientes` | Gestão de clientes |
| `/gerenciar-equipe` | Membros por cliente com papéis |
| `/usuarios` | Gestão de usuários do sistema |
| `/admin/embeddings` | Administração de embeddings CNAE (equipe_solaris) |
| `/auditoria` | Log de auditoria |
| `/aprovacao-planos` | Aprovação de planos |
| `/exportar-relatorios` | Exportação de relatórios |
| `/gestao-permissoes` | Gestão de permissões |

---

## 6. Mapeamento de Requisitos Funcionais

### 6.1 Estado dos 54 RFs (Baseline 21/03/2026)

| Etapa | Total | IMPL | PARC | AUSE |
|-------|-------|------|------|------|
| Etapa 1 — Criação do Projeto | 8 | 7 | 1 | 0 |
| Etapa 2 — Questionário Adaptativo | 10 | 9 | 1 | 0 |
| Etapa 3 — Briefing de Compliance | 8 | 8 | 0 | 0 |
| Etapa 4 — Matrizes de Riscos | 11 | 11 | 0 | 0 |
| Etapa 5 — Plano de Ação | 17 | 14 | 3 | 0 |
| **Total** | **54** | **49** | **5** | **0** |

**Cobertura:** 91% dos RFs totalmente implementados.

### 6.2 Gaps Ativos (5 RFs Parciais)

| Prioridade | RF | Gap | Esforço |
|-----------|-----|-----|---------|
| **Alta** | RF-1.05 | `refineCnaes` backend pronto, frontend não conectado — botão "Pedir nova análise" presente no modal mas não conectado ao endpoint de refinamento | 2h |
| **Média** | RF-2 UX | Sem tela de entrada por CNAE antes das perguntas (PE2-07 — UX estilo Typeform) | 3h |
| **Média** | RF-5.07 | Lista de responsáveis não filtrada por membros do cliente vinculado ao projeto | 2h |
| **Baixa** | RF-5.08 | Painel de notificações por tarefa: toggles OK, disparo de e-mail não conectado | 4h |
| **Baixa** | RF-2.07 | Sem modal de confirmação ao retornar a CNAE já concluído | 1h |

### 6.3 Funcionalidades Adicionadas Após a Baseline v1.0 (Sprints V53–v5.2.0)

| Sprint | Funcionalidade | Status |
|--------|---------------|--------|
| V53 | Máscara CNPJ + RF-5.08 UI + Badge "Revisado" | IMPL |
| V55 | Controle de status com permissões por papel (36 testes) | IMPL |
| V60–V63 | Resiliência LLM: retry, Zod, temperatura 0.2, OUTPUT_CONTRACT | IMPL |
| V64 | Alertas visuais de inconsistência no briefing | IMPL |
| V65 | RAG híbrido LIKE + re-ranking LLM (25 artigos) | IMPL |
| V66 | Corpus RAG expandido para 63 artigos | IMPL |
| V69 | Tour de onboarding interativo 6 passos (19 testes) | IMPL |
| V70 | Cache de perguntas cross-device | IMPL |
| V70.3 | Paralelização de todas as procedures LLM (~45s vs ~3min) | IMPL |
| V71 | Busca vetorial semântica 1.332 CNAEs (embeddings) | IMPL |
| V72 | Admin de embeddings com UI + WebSocket progress | IMPL |
| V73 | Cron de rebuild automático semanal (segunda 3h) | IMPL |
| **v5.1.0** | **Migração LLM: Gemini 2.5 Flash → GPT-4.1 (OpenAI)** | **IMPL** |
| **v5.1.0** | **Fix CNAE discovery: OPENAI_API_KEY configurada em produção** | **IMPL** |
| **v5.1.0** | **Monitoramento LLM: log estruturado TIMEOUT/ERROR + notifyOwner** | **IMPL** |
| **v5.2.0** | **Timeout 25s no extractCnaes (maxRetries: 1)** | **IMPL** |
| **v5.2.0** | **Banner de fallback semântico no modal de CNAEs** | **IMPL** |
| **v5.2.0** | **Alertas granulares no cron: chave expirada, falha parcial >10%** | **IMPL** |

---

## 7. Testes — Cobertura Atual

| Conjunto | Arquivo | Testes |
|----------|---------|--------|
| Sprint V69 — Onboarding | `sprint-v69-e2e.test.ts` | 19 |
| Sprint V66 — RAG expandido | `sprint-v66-e2e.test.ts` | 34 |
| Sprints V64+V65 — RAG híbrido | `sprint-v64-v65-e2e.test.ts` | 23 |
| Sprints V60–V63 — Resiliência LLM | `sprint-v60-v63-e2e.test.ts` | 86 |
| Sprint V55 — Status de projeto | `sprint-v55-status-transitions.test.ts` | 36 |
| Sprint V53 — Bugfixes | `bugfix-sprint-v53.test.ts` | 14 |
| Sprint V53 — Badge Revisado | `audit-rf207-badge-revisado.test.ts` | 9 |
| Demais arquivos (71 arquivos) | `*.test.ts` | ~900 |
| **Total** | **78 arquivos** | **>1.100 casos** |

---

## 8. Módulo Demo Standalone (`/demo`)

Criado nos Sprints 8–8.5. Funciona sem login. Dados pré-gerados pelo motor `solaris-compliance-v3` (repositório separado, 205 testes passando).

### 8.1 Fluxo de Onboarding

```
/demo → [Iniciar Diagnóstico] → /demo/assessment
  Passo 1: Nome da empresa + Descrição (mín. 80 chars)
  Passo 2: CNAEs gerados por regras de palavras-chave (simulado)
  Passo 3: 5 perguntas fixas (Sim/Parcial/Não)
  → Score determina cenário (simples/médio/complexo)
  → /demo/dashboard?scenario=X&company=Y
```

### 8.2 Limitações Conhecidas do Demo

| Limitação | Impacto | Solução Futura |
|-----------|---------|---------------|
| CNAEs por regras simples (palavras-chave) | Baixa precisão para descrições complexas | Conectar ao `extractCnaes` real via tRPC público |
| Dados fixos (3 cenários pré-gerados) | Não reflete a empresa real do usuário | Pipeline real: descrição → motor v3 em tempo real |
| 5 perguntas fixas | Não adaptativo por CNAE | Usar `generateQuestions` real |
| Sem persistência | Cada acesso é uma sessão nova | Conectar ao sistema de sessões temporárias |

---

## 9. Dívida Técnica Identificada

### 9.1 Coexistência de 3 Gerações de Fluxo

O schema tem tabelas de 3 gerações: v1 (`assessmentPhase1/2`), v2 (`corporateAssessments`, `branchAssessments`, `corporateActionPlans`, `branchActionPlans`) e v3 (`questionnaireAnswersV3`, `briefingVersions`, etc.). Os routers v1/v2 ainda estão registrados no `appRouter`. Uma limpeza arquitetural que deprecie formalmente os fluxos v1/v2 reduziria a complexidade cognitiva do projeto.

### 9.2 Sessão Temporária 24h (PG-04)

A infraestrutura existe (tabelas `sessions`, routers de sessão) mas o fluxo de entrada para usuários não autenticados não está exposto na UI principal. O módulo `/demo` cobre parcialmente este caso com dados mockados.

### 9.3 Timeout no `refineCnaes` (Pendente)

O `refineCnaes` ainda usa o timeout padrão de 180s. Recomenda-se aplicar `timeoutMs: 30_000` para consistência com o `extractCnaes`.

### 9.4 Teste de Integração do Fallback Semântico (Pendente)

Não há teste automatizado que simule falha do LLM e verifique que o fallback semântico retorna os top-5 CNAEs por cosseno. Recomenda-se adicionar este teste na próxima sprint.

---

## 10. Histórico de Versões

| Versão | Sprint | Data | Marco |
|--------|--------|------|-------|
| 1.0.0 | V1–V33 | Fev 2026 | MVP v1 — Fluxo básico com ramos de atividade |
| 3.0.0 | V45 | Mar 2026 | Fluxo v3 completo (5 etapas com IA) |
| 3.3.0 | V53 | Mar 2026 | Bugfixes críticos + RF-5.08 UI |
| 3.4.0 | V55 | Mar 2026 | Controle de status com permissões |
| 3.7.0 | V60–V63 | Mar 2026 | Resiliência LLM |
| 3.8.0 | V64–V65 | Mar 2026 | RAG híbrido + alertas |
| 3.9.0 | V66 | Mar 2026 | Corpus RAG 63 artigos |
| 4.0.0 | V69 | Mar 2026 | Onboarding interativo |
| 4.1.0 | V70–V70.3 | Mar 2026 | Cache cross-device + paralelização |
| 4.2.0 | V71 | Mar 2026 | Busca vetorial semântica |
| 4.3.0 | V72 | Mar 2026 | Admin de embeddings |
| 4.4.0 | V73 | Mar 2026 | Cron de rebuild automático |
| — | Sprint 8–8.5 | Mar 2026 | Demo standalone `/demo` |
| **5.1.0** | **v5.1.0** | **21 Mar 2026** | **Migração LLM para GPT-4.1 + fix CNAE discovery em produção + monitoramento LLM** |
| **5.2.0** | **v5.2.0** | **21 Mar 2026** | **Timeout 25s no extractCnaes + banner fallback + alertas granulares no cron** |

---

## 11. Variáveis de Ambiente Obrigatórias

| Variável | Uso | Status |
|---|---|---|
| `OPENAI_API_KEY` | LLM GPT-4.1 + embeddings text-embedding-3-small | **Obrigatória** — ausência causa falha silenciosa do CNAE discovery |
| `DATABASE_URL` | Conexão TiDB | Obrigatória |
| `JWT_SECRET` | Cookies de sessão | Obrigatória |
| `VITE_APP_ID` | Manus OAuth | Obrigatória |
| `BUILT_IN_FORGE_API_KEY` | Forge API (legado, não mais usado para LLM) | Opcional |

---

*Baseline atualizada em 21/03/2026 — Checkpoint `9d8f0ac5` — branch `main`*  
*Versão anterior: v1.0 (19/03/2026, checkpoint `a9fd348c`)*  
*Próxima revisão recomendada: após implementação dos gaps RF-1.05 (refineCnaes frontend) e RF-5.07*
