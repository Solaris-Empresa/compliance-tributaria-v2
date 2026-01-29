# TODO - MVP IA SOLARIS

## Backend
- [x] db.ts - Funções de usuários e projetos
- [x] db-assessment.ts - Funções de assessment
- [x] db-risks.ts - Funções de matriz de riscos
- [x] db-plans.ts - Funções de plano de ação
- [x] routers.ts - Todos os routers tRPC

## Frontend - Core
- [x] translations.ts - Traduções em português
- [x] ComplianceLayout.tsx - Layout principal
- [x] App.tsx - Rotas

## Frontend - Páginas
- [x] Painel.tsx - Dashboard inicial
- [x] Projetos.tsx - Listagem
- [x] NovoProjeto.tsx - Criar projeto
- [ ] ProjetoDetalhes.tsx - Detalhes e navegação
- [ ] AssessmentFase1.tsx - Formulário fase 1
- [ ] AssessmentFase2.tsx - Formulário dinâmico
- [ ] MatrizRiscos.tsx - Com campo Prompt
- [ ] PlanoAcao.tsx - Com aprovação

## Componentes
- [ ] CampoPrompt.tsx - Reutilizável
- [ ] WorkflowAprovacao.tsx - Status e ações

## Entrega
- [ ] Testar fluxo completo
- [ ] Checkpoint final


## Cadastro de Clientes (URGENTE)
- [x] Criar página de listagem de clientes
- [x] Criar formulário de cadastro de cliente
- [x] Adicionar seleção de cliente no formulário de projeto
- [x] Implementar routers tRPC para clientes

## Páginas Restantes
- [ ] ProjetoDetalhes.tsx - Detalhes e navegação
- [ ] AssessmentFase1.tsx - Formulário fase 1
- [ ] AssessmentFase2.tsx - Formulário dinâmico
- [ ] MatrizRiscos.tsx - Com campo Prompt
- [ ] PlanoAcao.tsx - Com aprovação
- [ ] QuadroTarefas.tsx - Gestão de tarefas e fases


## Assessment Fase 1 (EM ANDAMENTO)
- [x] Criar página AssessmentFase1.tsx
- [x] Implementar formulário com campos estruturados
- [x] Adicionar salvamento automático (draft)
- [x] Criar botão de finalizar fase 1
- [x] Implementar navegação para fase 2


## Página de Detalhes do Projeto (EM ANDAMENTO)
- [x] Criar ProjetoDetalhes.tsx
- [x] Implementar stepper de progresso visual
- [x] Adicionar resumo de status atual
- [x] Criar botões de ação contextuais
- [x] Implementar navegação entre fases


## Assessment Fase 2 (CONCLUÍDO)
- [x] Criar AssessmentFase2.tsx
- [x] Implementar geração de perguntas via LLM
- [x] Criar renderizador de formulário dinâmico
- [x] Adicionar validação de 70% de completude
- [x] Implementar salvamento automático
- [x] Criar botão de finalizar fase 2


## Briefing (CONCLUÍDO)
- [x] Criar Briefing.tsx
- [x] Implementar geração de briefing via LLM
- [x] Criar visualização de análise de gaps
- [x] Adicionar categorização por áreas de risco
- [x] Implementar indicadores visuais de prioridade
- [x] Criar botão para avançar para Matriz de Riscos


## Plano de Ação (CONCLUÍDO)
- [x] Criar PlanoAcao.tsx
- [x] Implementar geração de plano via LLM
- [x] Criar visualização do plano gerado
- [x] Implementar campo Prompt editável
- [x] Adicionar histórico de versões do Prompt
- [x] Criar workflow de aprovação (Advogado Sênior)
- [x] Implementar comentários e solicitação de ajustes
- [x] Criar botão de aprovar/rejeitar
- [x] Implementar transição para fase de execução


## Matriz de Riscos (CONCLUÍDO)
- [x] Criar MatrizRiscos.tsx
- [x] Implementar listagem de riscos
- [x] Criar formulário de novo risco
- [x] Implementar campo Prompt editável
- [x] Adicionar categorização pelos 5 componentes COSO
- [x] Criar matriz visual de probabilidade vs impacto (4x4)
- [x] Implementar histórico de versões do Prompt
- [x] Adicionar filtros por componente COSO e nível de risco
- [x] Criar indicadores visuais de risco (cores)


## Dashboard Executivo (CONCLUÍDO)
- [x] Criar página DashboardExecutivo.tsx
- [x] Implementar KPIs de compliance (% tarefas concluídas, riscos mitigados, prazos cumpridos)
- [x] Criar gráfico de burndown por fase
- [x] Implementar gráfico de distribuição de riscos por componente COSO
- [x] Adicionar gráfico de status de tarefas (pizza/donut)
- [x] Criar lista de alertas para tarefas atrasadas
- [x] Implementar filtros por projeto e período
- [x] Adicionar indicadores visuais de progresso
- [x] Criar cards de resumo executivo

## Quadro de Tarefas (Kanban) (CONCLUÍDO)
- [x] Criar tabela tasks no schema do banco
- [x] Adicionar funções de gestão de tarefas no db.ts
- [x] Criar endpoints tRPC para tarefas (list, create, update, updateStatus, delete)
- [x] Criar endpoints tRPC para fases (list, create)
- [x] Implementar página QuadroKanban.tsx com drag-and-drop
- [x] Adicionar 4 colunas (Pendências, A Fazer, Em Andamento, Concluído)
- [x] Implementar drag-and-drop entre colunas
- [x] Criar modal de criação de tarefa
- [x] Adicionar filtro por prioridade
- [x] Implementar badges de prioridade com cores
- [x] Adicionar indicadores de data de vencimento
- [x] Mostrar tarefas atrasadas em vermelho
- [x] Adicionar estatísticas por coluna
- [x] Implementar exclusão de tarefa
- [x] Adicionar traduções de status e prioridade no translations.ts
- [x] Adicionar rota no App.tsx
- [x] Adicionar atalho rápido na página ProjetoDetalhes


## Templates de Planos de Ação (CONCLUÍDO)
- [x] Revisar schema da tabela actionPlanTemplates
- [x] Criar funções no db.ts para templates (create, list, getById, delete, incrementUsage, search)
- [x] Criar endpoints tRPC para templates (list, search, getById, create, delete, applyTemplate)
- [x] Implementar página BibliotecaTemplates.tsx
- [x] Adicionar listagem de templates com filtros (regime tributário, porte)
- [x] Criar modal de visualização de template com metadados
- [x] Implementar exclusão de template com confirmação
- [x] Adicionar estatísticas de templates (total, mais usado, uso total)
- [x] Implementar contador de uso de template automático
- [x] Criar navegação para biblioteca de templates no menu
- [x] Adicionar rota no App.tsx
