# Changelog - Sistema de Compliance Tributária

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [4.4.0] - Sprint V73 - 2026-03-18

### Adicionado

**V73 — Agendamento Automático de Rebuild de Embeddings CNAE**

- **`server/embeddings-scheduler.ts`** — Módulo `node-cron` com cron job `0 3 * * 1` (toda segunda-feira às 03:00 BRT)
  - Executa rebuild completo dos 1.332 CNAEs via OpenAI `text-embedding-3-small` em batches de 95
  - Registra cada execução na tabela `embeddingRebuildLogs` com status, CNAEs processados, erros e duração
  - Envia notificação ao owner via `notifyOwner()` ao concluir (✅) ou falhar (❌)
  - Proteção contra execução dupla via `rebuildState.running`
  - Graceful shutdown: `task.stop()` no evento `SIGTERM`
- **`drizzle/schema.ts`**: Nova tabela `embeddingRebuildLogs` com campos `triggeredBy`, `triggeredByUserId`, `status`, `totalCnaes`, `processedCnaes`, `errorCount`, `lastError`, `durationSeconds`, `startedAt`, `finishedAt`. Migração `0037_aberrant_songbird`
- **`server/routers-admin-embeddings.ts`**: Procedure `adminEmbeddings.getHistory` — retorna as últimas 20 execuções ordenadas por data
- **`client/src/pages/AdminEmbeddings.tsx`**: Duas novas seções:
  - **Rebuild Automático Agendado** — exibe frequência, horário e tipo de notificação
  - **Histórico de Rebuilds** — tabela com data, disparador (cron/manual), status, CNAEs, erros e duração
- **`server/_core/index.ts`**: `initEmbeddingsScheduler()` chamado após WebSocket na inicialização do servidor

### Técnico
- Expressão cron: `0 3 * * 1` com timezone `America/São_Paulo`
- `runRebuild` e `rebuildState` exportados de `routers-admin-embeddings.ts` para reutilização no scheduler
- TypeScript: zero erros após todas as mudanças

---

## [4.3.0] - Sprint V72 - 2026-03-18

### Adicionado

**V72 — Endpoint de Administração de Embeddings CNAE**

- **`server/routers-admin-embeddings.ts`** — Router tRPC exclusivo para `equipe_solaris` com 3 procedures:
  - `adminEmbeddings.getStatus` — retorna cobertura, total no banco e estado do rebuild em andamento
  - `adminEmbeddings.rebuild` — dispara rebuild completo em background (batches de 95 CNAEs via OpenAI `text-embedding-3-small`)
  - `adminEmbeddings.invalidateCache` — invalida o cache em memória do servidor sem chamar a API
- **`client/src/pages/AdminEmbeddings.tsx`** — Página de administração com:
  - Cards de status: CNAEs no banco, cobertura % com barra de progresso, data da última atualização
  - Barra de progresso em tempo real via WebSocket (`embeddings:rebuild:started/progress/completed/error`)
  - Log de eventos com scroll automático e código de cores (info/success/error/progress)
  - Informações técnicas: modelo, dimensões, batch size, métrica de similaridade
- **Sidebar**: Link "Embeddings" com ícone `Cpu` visível apenas para `equipe_solaris`
- **Rota `/admin/embeddings`** registrada no `App.tsx`

### Técnico
- Controle de acesso via middleware `solarisOnly` (lança `FORBIDDEN` para outros papéis)
- Estado singleton `rebuildState` previne execuções paralelas (retorna `CONFLICT` se já rodando)
- Após rebuild: `invalidateEmbeddingCache()` é chamado automaticamente para forçar recarga
- Progresso emitido via `notifyUser()` do WebSocket existente (sem dependências novas)
- TypeScript: zero erros após todas as mudanças

---

## [4.2.0] - Sprint V71 - 2026-03-18

### Adicionado

**V71 — Busca Semântica de CNAEs via Embeddings Vetoriais (OpenAI text-embedding-3-small)**

Substituição completa do RAG baseado em tokens e dicionário de sinônimos hard-coded por busca vetorial semântica, garantindo precisão na identificação de múltiplas atividades distintas em uma mesma descrição de negócio.

- **`drizzle/schema.ts`**: Nova tabela `cnaeEmbeddings` com campos `cnaeCode`, `cnaeDescription`, `embeddingJson` (TEXT, 1536 dimensões) e `createdAt`. Migração `0036_cnae_embeddings`
- **`scripts/generate-cnae-embeddings.mjs`**: Script de geração em batch (14 batches de ~95 CNAEs) que chama `text-embedding-3-small` para todos os 1.332 CNAEs e persiste no banco. Idempotente (upsert por código)
- **`server/cnae-embeddings.ts`**: Módulo principal com:
  - `findSimilarCnaes(description, topN)` — gera embedding da query via OpenAI API e calcula similaridade de cosseno contra cache em memória (TTL 1h)
  - `buildSemanticCnaeContext(description, topNPerQuery=20)` — estratégia **multi-query**: divide a descrição em cláusulas por atividade (vírgula, ponto-e-vírgula, "e", "além de"), busca em paralelo para cada cláusula
  - **Estratégia de merge em 2 camadas**: top-5 de cada cláusula individual são "garantidos" (sempre entram no contexto), completado com pool geral até 50 candidatos
  - `invalidateEmbeddingCache()` para re-geração sob demanda
  - `getFallbackCandidates()` para fallback síncrono quando a API OpenAI falha
- **`server/routers-fluxo-v3.ts`**: `extractCnaes` e `refineCnaes` substituem `buildCnaeRagContext` / `findCandidateCnaes` por `buildSemanticCnaeContext`

### Melhorado

**V71 — Prompt de Identificação de CNAEs (extractCnaes)**
- Instrução explícita de 2 passos: (1) decompor a descrição em atividades distintas, (2) selecionar CNAE para cada atividade
- Contexto rotulado como "candidatos selecionados por similaridade semântica" para orientar o modelo

### Técnico
- **Teste validado** (`scripts/test-ze-final.mjs`): descrição com 3 atividades distintas → todos os 3 CNAEs garantidos no contexto:
  - `4632-0/01` Comércio Atacadista De Cereais E Leguminosas (posição 1, 73.2% — GARANTIDO)
  - `4930-2/01` Transporte Rodoviário De Carga (posição 8, 60.6% — GARANTIDO)
  - `4683-4/00` Corretivos Do Solo / Insumos Agrícolas (posição 14, 56.0% — GARANTIDO)
- O módulo `cnae-rag.ts` (RAG por tokens) é mantido como referência histórica mas não é mais chamado pelo fluxo principal
- TypeScript: zero erros após todas as mudanças

---

## [4.1.0] - Sprint V70.3 - 2026-03-18

### Corrigido

**V70.3 — Bug Fix Crítico: Plano de Ação não gerava após Matriz de Riscos**

- **Causa raiz**: `generateActionPlan` fazia 4 chamadas LLM sequenciais (~3 min total), causando timeout HTTP antes da resposta chegar ao browser
- **Fix 1** (`server/routers-fluxo-v3.ts`): Loop `for...of` substituído por `Promise.all` paralelo — as 4 áreas (Contabilidade, Negócio, TI, Jurídico) são geradas simultaneamente. Redução: ~3 min → ~45 s
- **Fix 2** (`server/_core/index.ts`): `server.timeout = 300s` e `keepAliveTimeout = 310s` configurados no HTTP server Express para suportar chamadas LLM longas sem cortar a conexão
- **Fix 3** (`client/src/pages/PlanoAcaoV3.tsx`): Tela de loading atualizada para informar geração paralela das 4 áreas e tempo esperado (~1 min)

### Melhorado

**V70.3 — Otimização: Paralelização de todas as procedures LLM sequenciais**

- **`generateRiskMatrices`** (`server/routers-fluxo-v3.ts`): Loop `for...of areas` → `Promise.all` paralelo. RAG compartilhado (1 busca para 4 áreas). Redução: ~3 min → ~45 s
- **`generateAll`** (`server/routers-assessments.ts`): Loop `for...of projectBranches` → `Promise.allSettled` paralelo. Não falha tudo se 1 ramo falhar. Retorna contador de falhas (`failed`)
- **`notifyNewComment`** (`server/routers-notifications.ts`): Loop `for...of recipientIds` → `Promise.allSettled` paralelo. Melhora latência em grupos com muitos destinatários

### Técnico
- Padrão adotado: `Promise.all` para operações críticas que devem falhar juntas (LLM), `Promise.allSettled` para operações independentes (notificações, ramos opcionais)
- TypeScript: zero erros após todas as mudanças

---

## [4.0.0] - Sprint V69 - 2026-03-17

### Adicionado

**V69 — Onboarding Guiado para Advogados**
- **Tour interativo step-by-step** (6 passos) com overlay escuro, spotlight no elemento alvo e tooltip posicionado dinamicamente
- **Disparo automático no primeiro login**: `getStatus` detecta `isNew = true` e abre o tour sem ação do usuário
- **Botão "Retomar Tour"** no sidebar com badge "Novo" quando o usuário tem progresso parcial
- **Persistência por usuário**: tabela `onboardingProgress` no banco (migração 0029), procedures `getStatus`, `markStep`, `skip`, `reset`
- **Barra de progresso** (X/6 etapas) e botões Próximo / Pular / Concluir Tour
- `server/routers-onboarding.ts`: router tRPC com 4 procedures protegidas
- `client/src/components/OnboardingTour.tsx`: componente com `createPortal`, spotlight via `box-shadow`, posicionamento dinâmico
- `client/src/components/ComplianceLayout.tsx`: integração do tour e botão de retomada no sidebar

### Testes
- `sprint-v69-e2e.test.ts`: 19 testes (fluxo completo, skip, reset, idempotência, validação Zod, edge cases)
- **160/160 testes passando** (141 anteriores + 19 V69)

---

## [3.9.0] - Sprint V66 - 2026-03-17

### Adicionado

**V66 — Expansão do Corpus RAG (25 → 63 artigos)**
- `server/rag-corpus.ts` expandido: +12 Resoluções CG-IBS, +11 IN RFB/CBS, +14 Convênios CONFAZ
- **CG-IBS**: alíquotas de referência, split payment (PIX/cartão), cashback baixa renda, contencioso TA-IBS, regimes especiais setoriais, cooperativas, distribuição entre entes
- **RFB/CBS**: migração PIS/COFINS→CBS, EFD-Contribuições, NF-e/NFS-e, Simples Nacional, CBS-Importação, serviços financeiros (método de adição)
- **Convênios CONFAZ**: transição geral, créditos acumulados, ICMS-ST, benefícios fiscais, DIFAL, obrigações acessórias, energia, telecom, Zona Franca, agronegócio, construção civil, e-commerce, farmacêutico, automotivo
- Enum `lei` expandido: `cg_ibs`, `rfb_cbs`, `conv_icms` (migração 0028)
- Script `rag-ingest.mjs` atualizado: importa do `rag-corpus.ts` via `tsx` em tempo real
- **Banco limpo** para testes da equipe de advogados (users + projetos zerados, corpus preservado)

### Testes
- `sprint-v66-e2e.test.ts`: 32 testes (integridade, busca semântica, cobertura setorial, prazos críticos)
- **141/141 testes passando** (86 V60-V63 + 23 V64-V65 + 32 V66)
- Precisão de citação RAG estimada: ~90% (25 artigos) → ~95% (63 artigos)

---

## [3.8.0] - Sprints V64+V65 - 2026-03-17

### Adicionado

**V65 — RAG Híbrido (LIKE + Re-ranking LLM)**
- `server/rag-corpus.ts` — Corpus de 25 artigos reais: EC 132/2023, LC 214/2025, LC 227/2024
- `server/rag-retriever.ts` — Motor de busca híbrido: `retrieveArticlesFast` (LIKE) + `retrieveArticles` (re-ranking LLM temperatura 0.0)
- `server/rag-ingest.mjs` — Script de ingerão do corpus no banco (25 chunks)
- Tabela `ragDocuments` no schema + migração 0027
- Substituição completa do `cnae-articles-map.ts` nos 5 pontos de injeção de contexto
- Instrução anti-alucinação: "cite apenas artigos fornecidos no contexto"
- Fallback silencioso quando banco indisponível ou corpus vazio

**V64 — Alertas Visuais de Inconsistência**
- `client/src/components/AlertasInconsistencia.tsx` — Badge + painel expansível + modal de detalhes
- Codificação por cor: alto=vermelho, medio=laranja, baixo=amarelo
- Procedure `getBriefingInconsistencias` no router
- `getProjectSummary` agora expõe `inconsistencias[]` e `briefingStructured`
- `BriefingV3` integrado com refetch automático após gerar novo briefing

### Testes
- `sprint-v64-v65-e2e.test.ts`: 23 testes — V64 (4 testes) + V65 (10 testes) + Edge Cases (6) + Integração (3)
- `sprint-v60-v63-e2e.test.ts`: 86 testes — atualizados para compatibilidade com RAG V65
- **Total acumulado: 109/109 testes passando**

---

## [3.7.0] - Sprints V60-V63 - 2026-03-17

### Adicionado

**V60 — Production Pack**
- `server/ai-schemas.ts` — Schemas Zod enriquecidos para todos os outputs de IA
- `server/ai-helpers.ts` — `generateWithRetry`, `invokeLLMStructured`, `calculateGlobalScore`
- Temperatura 0.2 em todos os 7 pontos de diagnóstico; 0.4 no `momento_wow`; 0.0 no re-ranking
- System prompts com papéis definidos: Auditor de Riscos, Consultor Sênior, Sócio de Tributação

**V61 — Scoring Financeiro + Confidence Score**
- `calculateGlobalScore` com `impacto_estimado`, `custo_inacao`, `prioridade`
- `ConfidenceSchema` com `nivel_confianca` + `recomendacao` enum
- Campos `scoringData`, `briefingStructured`, `faturamentoAnual` no banco

**V62 — Pré-RAG Estático** (substituído pelo RAG dinâmico na V65)
- `server/cnae-articles-map.ts` — 20 grupos CNAE mapeados para artigos regulatórios

**V63 — Motor de Decisão Explícito**
- `DecisaoResponseSchema` com `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `momento_wow`
- Procedure `generateDecision` integrada ao `approveActionPlan`
- Tela de conclusão do `PlanoAcaoV3` exibe a decisão executiva

### Testes
- `sprint-v60-v63-e2e.test.ts`: 86 testes — 5 projetos × 3 CNAEs cada, cobertura completa V60-V63

---

## [3.6.0] - Sprint V56 - 2026-03-17

### Corrigido

**Bug BUG-04: 404 em /usuarios**
- Criada página `Usuarios.tsx` completa com listagem, filtros, busca e gerenciamento de papéis
- Rota `/usuarios` registrada no `App.tsx`
- Procedures `users.updateRole` e `users.deleteUser` adicionadas ao servidor com controle de acesso por papel

**Bug BUG-05 / BUG-06: 0 Riscos Mapeados e 0 Tarefas Criadas**
- Causa raiz: campos `briefingContent`, `riskMatricesData` e `actionPlansData` não existiam na tabela `projects`
- Adicionados os 3 campos ao schema Drizzle (`drizzle/schema.ts`) como `text` nullable
- Migração executada via `pnpm db:push`
- `getProjectStep1` atualizado para retornar os 3 novos campos
- `getProjectSummary` agora lê corretamente `riskMatricesData` e `actionPlansData` do banco

**Bug BUG-07: Questionário bloqueado para edição**
- `cnaeProgress` agora restaura o estado de progresso a partir das respostas salvas no banco (`savedProgress.answers`)
- CNAEs já respondidos aparecem como concluídos ao reabrir o questionário

**Bug BUG-08: Re-edição de Briefing, Matrizes e Plano de Ação**
- `BriefingV3`: carrega conteúdo salvo do banco ao invés de sempre regenerar; aviso azul "Briefing aprovado anteriormente" exibido
- `MatrizesV3`: carrega matrizes salvas do banco; aviso azul "Matrizes de riscos aprovadas anteriormente" exibido
- `PlanoAcaoV3`: carrega plano salvo do banco; tela de conclusão exibida automaticamente quando projeto está aprovado; botão "Editar Plano de Ação" adicionado

### Adicionado

**Página de Usuários (`/usuarios`) — Completa**
- Listagem de todos os usuários com avatar, nome, email e data de último login
- Filtro por papel (equipe_solaris, advogado_senior, advogado_junior, cliente)
- Busca por nome ou email em tempo real
- Seleção de papel via `Select` com confirmação por modal de diálogo
- Estatínticas no topo: total de usuários, ativos nos últimos 7 dias, por papel
- Controle de acesso: apenas `equipe_solaris` pode alterar papéis

**Notificações de Re-geração**
- Banner azul no `BriefingV3` quando o briefing já foi aprovado anteriormente
- Banner azul no `MatrizesV3` quando as matrizes já foram aprovadas anteriormente

**Limpeza Completa do Banco**
- Todas as tabelas de dados de teste truncadas (projetos, clientes, questionários, briefings, matrizes, planos, tarefas)
- Tabela `users` preservada (1.264 registros)

**Testes de Regressão — Sprint V56 (33 testes)**
- `sprint-v56-regression.test.ts`: 33 testes cobrindo:
  - Verificação de limpeza do banco
  - Fluxo de upsertUser (criação de novos usuários via OAuth)
  - Controle de acesso para `users.updateRole`
  - Estatísticas de usuários (`getStats`)
  - Schema dos novos campos (`briefingContent`, `riskMatricesData`, `actionPlansData`)
  - Contagem de riscos e tarefas no `getProjectSummary`
  - Retorno de campos de conteúdo no `getProjectStep1`
  - Fluxo completo de re-edição (regressão end-to-end)

---

## [3.5.0] - Sprint V55 - 2026-03-17

### Adicionado

**Dropdown de "Situação do Projeto" na ProjetoDetalhesV2**
- Substituiu o badge estático de status por um `Select` interativo do shadcn/ui no header da página de detalhes
- Ícone `Tag` ao lado do dropdown para sinalizar visualmente o campo de situação
- Indicador circular colorido em cada opção do dropdown (ponto colorido por status)
- Spinner de carregamento (`RefreshCw` animado) durante a mutação de atualização
- Controle de permissões: equipe SOLARIS vê todos os 11 status; clientes vêem apenas o status atual + "Em Avaliação"
- Persistência via mutação tRPC `projects.updateStatus` com feedback de toast

**Filtros de Status na Lista de Projetos (Projetos.tsx)**
- Dropdown de filtro por status com todas as 11 opções + "Todos os status"
- Indicador colorido (ponto) em cada opção do filtro
- Botão de limpar filtros (X) quando há filtros ativos
- Contador de resultados com informação sobre filtros ativos
- Skeleton de carregamento nos cards de projetos
- Estado vazio melhorado com botão "Limpar Filtros" quando há filtros ativos

**Testes Unitários — Sprint V55 (36 testes)**
- `sprint-v55-status-transitions.test.ts`: 36 testes cobrindo:
  - Permissões por papel (equipe_solaris, advogado_senior, cliente, advogado_junior)
  - Transições permitidas e bloqueadas por papel
  - Opções do dropdown filtradas por papel
  - Traduções de status em português
  - Filtros de status na lista de projetos
  - Lógica de auto-avanço de status no servidor

### Alterado

**Procedure `projects.updateStatus` (routers.ts)**
- Adicionado log de auditoria no console com papel do usuário e IDs
- Retorno enriquecido com `changedBy` (papel do usuário que realizou a mudança)

---

## [3.3.0] - Sprint V53 - 2026-03-17

### Adicionado

**Máscara de CNPJ no Modal "Novo Cliente" (NovoProjeto.tsx)**
- Função `maskCnpj()` aplicada ao input em tempo real: formata como `XX.XXX.XXX/XXXX-XX` enquanto o usuário digita
- Validação inline: borda vermelha e mensagem de erro quando CNPJ tem número de dígitos inválido (diferente de 0 ou 14)
- Botão "Criar Cliente" desabilitado enquanto CNPJ está incompleto (exceto campo vazio)
- Limite `maxLength={18}` no input para impedir entrada excessiva

**RF-5.08 UI — Painel de Notificações por Tarefa (PlanoAcaoV3)**
- Substituiu checkboxes HTML nativos por `Switch` do shadcn/ui com `Label` acessível por ID único por tarefa
- Painel com borda e fundo sutil (`bg-muted/30`) para delimitar visualmente a seção de notificações
- Badge "Âmbar — Ativas" exibido no cabeçalho do painel quando ao menos uma opção está ativa
- Ícone de sino preenchido (`fill-amber-500`) no header do card quando há notificações ativas
- Campo `beforeDays` com clamping automático (1–30) e mensagem de erro se fora do intervalo
- Três toggles independentes: Mudança de status, Atualização de progresso, Novo comentário

**Badge "Revisado" no Stepper de CNAEs (RF-2.07 UX)**
- Badge âmbar exibido ao lado do código CNAE quando o usuário retorna a um CNAE concluído e confirma navegação
- Badge desaparece automaticamente ao re-concluir o CNAE via `handleFinishLevel1`

### Corrigido

**Bug 1 — CNPJ overflow no INSERT de novo cliente**
- Sanitização server-side no `routers-fluxo-v3.ts`: extrai dígitos, formata `XX.XXX.XXX/XXXX-XX` se 14 dígitos, trunca para 18 chars
- Migração de schema: `cnpj varchar(18)` → `varchar(20)` para margem de segurança

**Bug 2 — Botão "Avançar" não habilitava após criar cliente via modal**
- Estado `pendingClientName` adicionado ao `NovoProjeto.tsx`
- `selectedClient` usa `pendingClientName` como fallback imediato enquanto o refetch não retorna o novo cliente

**Bug 3 — Tela branca ao solicitar aprofundamento no QuestionarioV3**
- `loadedQuestionsRef` movido para antes dos `useEffect`s que o utilizam (ordem de declaração corrigida)
- `handleAcceptDeepDive` pré-registra `cacheKey` no ref antes de `setCurrentLevel` para evitar chamada dupla sem `previousAnswers`

### Testes
- 14 novos testes unitários passando (`bugfix-sprint-v53.test.ts`): Bug 1 (6), Bug 2 (4), Bug 3 (4)
- 9 testes para badge "Revisado" (`audit-rf207-badge-revisado.test.ts`)
- Checkpoints: `4f6f0b7e` (bugfix), `747892b3` (badge Revisado)

---

## [3.0.0] - Sprint V45 - 2026-03-16

### Adicionado

**Etapa 1 — Criação de Projeto com Extração de CNAEs via IA**
- Novo formulário de criação de projeto com 3 campos: Nome, Descrição (texto longo) e Cliente vinculado
- Busca de cliente com filtro em tempo real e botão "+ Novo Cliente" on-the-fly
- Extração automática de CNAEs via IA Gen (OpenAI) a partir da descrição da empresa
- Modal de confirmação de CNAEs com cards de relevância percentual (adicionar/editar/remover)
- Stepper visual das 5 etapas do fluxo

**Etapa 2 — Questionário Adaptativo por CNAE (2 Níveis)**
- Questionário gerado dinamicamente pela IA para cada CNAE confirmado
- Nível 1: até 10 perguntas essenciais por CNAE; Nível 2: aprofundamento opcional
- UX inspirada em SurveyMonkey: sim/não, escala Likert, múltipla escolha, texto livre, slider
- Salvamento automático de respostas a cada avanço

**Etapa 3 — Briefing de Compliance**
- Geração automática do Briefing via IA com renderização em Markdown
- Ciclo de aprovação: aprovar, solicitar correção ou fornecer mais informações
- Regeneração incorporando feedback até aprovação

**Etapa 4 — Matrizes de Riscos (4 Áreas)**
- 4 matrizes independentes: Contabilidade, T.I., Advocacia Tributária, Áreas de Negócio
- Colunas: Evento, Probabilidade, Impacto, Severidade (calculada), Plano de Ação
- Edição inline com ciclo de aprovação e regeneração parcial ou total

**Etapa 5 — Plano de Ação com Gestão de Tarefas**
- Plano gerado por área (Contabilidade, TI, Jurídico, Negócio)
- Gestão completa: status, % andamento, datas início/fim, responsável, notificações por e-mail
- Filtros por status, área, prazo e responsável
- Exportação CSV e PDF simples

### Alterado
- Menu lateral limpo: removidos 4 itens (Dashboard de Tarefas, Questionário Corporativo, Modelos Padrões, Painel de Indicadores Executivos)
- Corrigido nested `<a>` no ComplianceLayout
- Instalado `react-markdown` para renderização do briefing

### Testes
- 35 testes unitários passando: 14 (Etapa 1) + 21 (Etapas 2-5)
- Checkpoint: `5d49b4ab`

---

## [2.0.0] - Sprint V44 - 2026-03-16

### Adicionado
- Teste E2E completo do fluxo v2.0: 20/20 testes passando
- Fluxo validado: ModoUso → BriefingInteligente → QuestionarioRamos → PlanoAcaoSession → MatrizRiscosSession → Consolidacao
- Exportação de dados (JSON + CSV) com integridade cruzada validada
- Checkpoint: `b47e1af8`

---

## [1.0.0] - 2026-02-01

### 🎉 Release Inicial - Baseline v1.0

Esta é a primeira versão estável do Sistema de Compliance Tributária para Reforma Tributária Brasileira, pronta para produção. O sistema oferece fluxo completo end-to-end desde criação de projetos até geração de planos de ação personalizados via IA.

### ✨ Funcionalidades Principais

#### Gestão de Projetos
- Criação e gerenciamento de projetos de compliance tributário
- Controle de acesso baseado em roles (admin, user)
- Autenticação via Manus OAuth
- Dashboard com listagem e filtros de projetos

#### Assessment Tributário (Fase 1 e Fase 2)
- **Fase 1**: Formulário estruturado com dados básicos da empresa (regime tributário, porte, setor, receita anual)
- **Fase 2**: Questionário dinâmico gerado via IA baseado nas respostas da Fase 1
- Salvamento automático de progresso
- Validação de campos obrigatórios

#### Questionários Corporativos e por Ramo de Atividade
- Geração automática de questionário corporativo via IA
- Geração de questionários específicos por ramo de atividade (CNAE)
- Suporte a múltiplos ramos por projeto
- Histórico de versões de questionários

#### Geração de Planos de Ação
- **Plano Corporativo**: Gerado com base no assessment e questionário corporativo
- **Planos por Ramo**: Gerados individualmente para cada ramo de atividade
- Parsing robusto de JSON retornado pela IA (suporta markdown code blocks)
- Histórico completo de versões de planos

#### Matriz de Riscos
- Identificação e categorização de riscos tributários
- Avaliação de probabilidade e impacto
- Sugestão de controles e evidências
- Histórico de versões da matriz

### 🔧 Tecnologias e Arquitetura

**Frontend:**
- React 19 com TypeScript
- Tailwind CSS 4 para estilização
- Wouter para roteamento
- tRPC Client para comunicação type-safe com backend
- Shadcn/ui para componentes de UI

**Backend:**
- Node.js 22 com Express 4
- tRPC 11 para APIs type-safe
- Drizzle ORM para acesso ao banco de dados
- MySQL/TiDB como banco de dados
- Superjson para serialização avançada (suporte a Date, Map, Set)

**Integrações:**
- Manus OAuth para autenticação
- Manus LLM API para geração de conteúdo via IA
- Manus Storage (S3) para armazenamento de arquivos

### 🐛 Bugs Corrigidos

#### Sprint V27-V28: Erro de Salvamento Assessment Fase 1
- **Problema**: Drizzle ORM convertia `undefined` para `default` no SQL INSERT, causando erro em campos `completedAt`, `completedBy`, `completedByRole`
- **Solução**: Migração do banco (ALTER TABLE para aceitar NULL) + correção do código (destructuring explícito sem campos completed*)
- **Testes**: 3/3 testes unitários validados
- **Issues**: #58 (GitHub)

#### Sprint V29: Erro "Ramo não encontrado" na Geração de Planos
- **Problema**: Frontend enviava `branch.id` (ID do relacionamento) ao invés de `branch.branchId` (ID do ramo)
- **Solução**: Correção em PlanoAcao.tsx linhas 309 e 322
- **Testes**: 4/4 testes unitários validados
- **Issues**: #59 (GitHub)

#### Sprint V30: Erro de Parsing JSON na Geração de Planos
- **Problema**: IA retornava JSON envolvido em markdown code blocks (\`\`\`json ... \`\`\`), causando erro no `JSON.parse()`
- **Solução**: Adição de `.trim()` e `replace()` para remover markdown antes do parsing
- **Testes**: 6/6 testes unitários validados
- **Issues**: #60 (GitHub)

#### Sprint V31: Erro 404 Após Geração de Planos por Ramo
- **Problema**: Redirecionamento para URL incorreta (`/visualizar-planos-por-ramo` sem prefixo `/planos-acao/`)
- **Solução**: Correção da URL em PlanoAcao.tsx linha 328
- **Testes**: 5/5 testes unitários validados
- **Issues**: #61 (GitHub)

### 📚 Documentação

- **baseline.md**: Documentação técnica completa do sistema (arquitetura, módulos, banco de dados, APIs, frontend)
- **erros-conhecidos.md**: Registro de bugs encontrados e soluções aplicadas
- **ROLLBACK.md**: Procedimentos detalhados para rollback para v1.0.0

### 🧪 Cobertura de Testes

**Testes Unitários:**
- Assessment Fase 1: 3/3 testes (100%)
- Branch Assessment Generate: 4/4 testes (100%)
- Action Plans JSON Parsing: 6/6 testes (100%)
- Branch Plans Redirect: 5/5 testes (100%)
- **Total**: 18/18 testes passaram (100%)

**Testes End-to-End:**
- Fluxo completo validado manualmente em produção
- Criação de projeto → Assessment → Questionários → Planos de Ação

### 📦 Banco de Dados

**Tabelas Principais:**
- `user`: Usuários do sistema (autenticação Manus OAuth)
- `projects`: Projetos de compliance
- `assessmentPhase1`: Dados básicos da empresa (Fase 1)
- `assessmentPhase2`: Questionário dinâmico (Fase 2)
- `corporateQuestionnaire`: Questionário corporativo
- `activityBranches`: Ramos de atividade (CNAE)
- `projectBranches`: Relacionamento projeto ↔ ramos
- `branchAssessments`: Questionários por ramo
- `actionPlans`: Planos de ação corporativos
- `branchActionPlans`: Planos de ação por ramo
- `riskMatrix`: Matriz de riscos tributários
- `briefingVersions`: Histórico de versões de briefing
- `actionPlanVersions`: Histórico de versões de planos
- `riskMatrixVersions`: Histórico de versões da matriz

### 🚀 Deploy e Infraestrutura

- **Ambiente de Produção**: iasolaris.manus.space
- **Sistema de Checkpoints**: Versionamento automático via Manus Platform
- **Repositório GitHub**: Solaris-Empresa/reforma-tributaria-plano-compliance
- **Checkpoint v1.0.0**: `93e36265` (Sprint V31)

### 🔐 Segurança

- Autenticação via Manus OAuth com sessão persistente
- Controle de acesso baseado em roles (admin/user)
- Validação de acesso a projetos em todos os endpoints
- Proteção contra SQL Injection via Drizzle ORM (prepared statements)
- Sanitização de inputs do usuário

### 📊 Métricas de Desenvolvimento

- **Sprints Concluídos**: 33 sprints (V1-V33)
- **Issues Resolvidas**: 61 issues no GitHub
- **Commits**: 100+ commits
- **Linhas de Código**: ~15.000 linhas (frontend + backend)
- **Tempo de Desenvolvimento**: 4 semanas

### 🎯 Próximos Passos (Roadmap v1.1)

- Implementar validação inline nos formulários de Assessment
- Adicionar indicadores de progresso visual no fluxo end-to-end
- Criar testes E2E automatizados com Playwright
- Implementar sistema de notificações para proprietários de projetos
- Adicionar exportação de planos de ação em PDF
- Melhorar feedback visual durante operações LLM longas

---

## Formato de Versionamento

- **MAJOR.MINOR.PATCH** (Semantic Versioning)
- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades compatíveis com versões anteriores
- **PATCH**: Correções de bugs compatíveis com versões anteriores

---

**Autor**: Manus AI  
**Data de Release**: 01 de Fevereiro de 2026  
**Checkpoint**: 93e36265  
**GitHub**: https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance
