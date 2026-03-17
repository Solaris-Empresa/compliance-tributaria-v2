# Changelog - Sistema de Compliance Tributária

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
