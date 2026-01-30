# TODO - Sistema de Compliance Tributária

## Configuração Inicial
- [x] Atualizar schema do banco de dados com todas as tabelas necessárias
- [x] Configurar tema visual (cores, tipografia)
- [ ] Criar componentes base reutilizáveis

## Sistema de Autenticação e Controle de Acesso
- [x] Expandir roles de usuário (admin, client, team_member)
- [x] Adicionar campos extras ao perfil (companyName, phone)
- [x] Criar middleware de verificação de acesso a projetos
- [x] Implementar procedures de autorização

## Módulo de Projetos
- [x] Criar CRUD de projetos
- [x] Implementar listagem de projetos com filtros por role
- [ ] Criar página de detalhes do projeto
- [x] Implementar gestão de participantes (adicionar, remover, alterar papel)
- [ ] Criar dashboard de projetos do usuário

## Assessment Fase 1
- [ ] Criar formulário de perguntas básicas
- [ ] Implementar validação de campos
- [ ] Adicionar salvamento automático (draft)
- [x] Criar procedures tRPC para fase 1
- [ ] Implementar página de visualização de respostas

## Assessment Fase 2 (IA Generativa)
- [x] Implementar geração de perguntas via LLM
- [ ] Criar renderizador de formulário dinâmico
- [ ] Implementar validação de respostas dinâmicas
- [x] Criar procedures tRPC para fase 2
- [ ] Adicionar indicador de progresso

## Módulo de Briefing
- [x] Implementar geração de briefing via LLM
- [ ] Criar página de visualização do briefing
- [ ] Adicionar renderização de markdown para análise
- [ ] Implementar indicadores visuais de risco
- [x] Criar procedures tRPC para briefing

## Geração de Plano de Ação
- [x] Implementar busca de templates compatíveis
- [x] Criar geração de plano via LLM (sem template)
- [x] Implementar adaptação de template existente via LLM
- [x] Criar sistema de aprovação de plano
- [ ] Adicionar visualização do plano gerado
- [x] Implementar procedures tRPC para planos

## Sistema de Templates
- [x] Criar tabela de templates
- [x] Implementar criação automática de template após primeira geração
- [x] Adicionar listagem de templates
- [ ] Criar página de gerenciamento de templates (admin)
- [x] Implementar contador de uso de templates

## Dashboard Scrum
- [x] Criar gestão de sprints (CRUD)
- [ ] Implementar sprint board (kanban)
- [ ] Adicionar backlog de tarefas
- [ ] Criar burndown chart
- [ ] Implementar métricas de sprint

## Gestão de Tarefas
- [x] Criar CRUD de tarefas
- [x] Implementar atribuição de tarefas
- [x] Adicionar sistema de comentários
- [ ] Criar visualização de dependências
- [ ] Implementar filtros e busca de tarefas
- [ ] Adicionar drag-and-drop no kanban

## Dashboard COSO
- [x] Criar gestão de controles COSO
- [ ] Implementar visualização por categoria
- [ ] Adicionar indicadores de status e risco
- [ ] Criar gráficos de progresso COSO
- [x] Implementar procedures tRPC para COSO

## Sistema de Marcos (Milestones)
- [ ] Criar CRUD de milestones
- [ ] Implementar visualização de timeline
- [ ] Adicionar notificações de marcos atingidos

## Sistema de Notificações
- [ ] Criar tabela de notificações
- [ ] Implementar notificações in-app
- [ ] Adicionar painel de notificações
- [ ] Criar sistema de configuração de frequência
- [ ] Implementar templates de notificação
- [ ] Adicionar integração com email (placeholder para futuro)

## UX e Interface
- [ ] Implementar DashboardLayout com sidebar
- [ ] Criar navegação contextual por role
- [ ] Adicionar breadcrumbs
- [ ] Implementar loading states consistentes
- [ ] Adicionar empty states informativos
- [ ] Criar feedback visual para ações (toasts)
- [ ] Implementar responsividade mobile

## Testes
- [ ] Criar testes para procedures de autenticação
- [ ] Adicionar testes para módulo de projetos
- [ ] Implementar testes para assessment
- [ ] Criar testes para geração de plano via LLM
- [ ] Adicionar testes para dashboard

## Documentação
- [ ] Documentar estrutura do banco de dados
- [ ] Criar guia de uso para administradores
- [ ] Adicionar documentação de APIs tRPC
- [ ] Documentar prompts LLM utilizados


## Fluxo End-to-End - Criação de Projeto
- [x] Criar página de novo projeto (/projetos/novo)
- [x] Implementar formulário de dados do projeto
- [ ] Adicionar seleção de cliente/empresa
- [ ] Implementar adição de participantes com papéis
- [x] Criar confirmação e redirecionamento

## Fluxo End-to-End - Assessment
- [x] Criar página de detalhes do projeto (/projetos/:id)
- [x] Implementar formulário de Assessment Fase 1
- [x] Adicionar validação e salvamento automático
- [x] Criar botão de avançar para Fase 2
- [x] Implementar geração de perguntas dinâmicas (Fase 2)
- [x] Criar renderizador de formulário dinâmico
- [x] Adicionar indicador de progresso
- [x] Implementar finalização do assessment

## Fluxo End-to-End - Briefing e Plano
- [x] Criar página de visualização de briefing
- [x] Implementar renderização de análise de gaps
- [x] Adicionar indicadores de risco
- [x] Criar página de visualização de plano de ação
- [x] Implementar botão de aprovação
- [x] Adicionar indicação de uso de templateo plano de ação
- [ ] Adicionar botão de aprovar plano
- [ ] Implementar transição para execução

## Fluxo End-to-End - Execução
- [ ] Criar Kanban Board de tarefas
- [ ] Implementar drag-and-drop
- [ ] Adicionar filtros por sprint/responsável
- [ ] Criar modal de detalhes da tarefa
- [ ] Implementar sistema de comentários
- [ ] Criar página de gestão de sprints
- [ ] Adicionar burndown chart
- [ ] Implementar dashboard COSO

## Fluxo End-to-End - Navegação
- [ ] Adicionar breadcrumbs em todas as páginas
- [ ] Implementar navegação contextual no projeto
- [ ] Criar stepper visual do fluxo
- [ ] Adicionar botões de ação contextual

## Bugs Corrigidos - 29/01/2026
- [x] BUG #1: Salvamento automático da Fase 2 (assessmentPhase2.save não existia)
- [x] BUG #2: Geração do Briefing (projectAccessMiddleware usado incorretamente)
- [x] BUG #3: Erros na geração do Plano de Ação (projectAccessMiddleware usado incorretamente)

## Bugs Pendentes
- [ ] BUG #4: Geração automática do Plano de Ação não está sendo acionada (useEffect não dispara)
- [ ] BUG #5: Verificar e corrigir todos os outros usos de projectAccessMiddleware no routers.ts

## Melhorias de Arquitetura Recomendadas
- [ ] Remover completamente projectAccessMiddleware como procedure base
- [ ] Padronizar uso de protectedProcedure + validateProjectAccess em todos os endpoints
- [ ] Adicionar testes unitários para validação de acesso a projetos

## Testes Unitários - Validação de Acesso a Projetos
- [x] Criar testes para validateProjectAccess (acesso permitido, negado, projeto inexistente)
- [x] Criar testes para briefing.get e briefing.generate (skipped - geração LLM lenta 13-29s)
- [x] Criar testes para actionPlan.get e actionPlan.generate (skipped - geração LLM lenta 29-60s)
- [x] Criar testes para assessmentPhase1 e assessmentPhase2
- [x] Criar testes para verificação de roles (equipe_solaris, advogado_senior, cliente)
- [x] Executar todos os testes e garantir cobertura nos endpoints críticos (11 passed, 4 skipped)
- [x] Adicionar validateProjectAccess aos procedimentos assessmentPhase2.get e generateQuestions
- [x] Corrigir estrutura de dados dos testes (generatedQuestions vs questions, answers como string)
- [ ] Implementar mocks para invokeLLM para habilitar 4 testes skipped (briefing/action plan)
- [ ] Implementar procedimento projects.addParticipant para testar acesso de cliente vinculado

## Configuração de Testes - Timeout Global
- [x] Aumentar timeout global no vitest.config.ts para 60 segundos
- [x] Reativar testes skipped que envolvem geração LLM (parcial - 4 testes permanecem skipped)
- [x] Executar todos os testes e validar sucesso (11 passed, 4 skipped em 13.8s)

## Refatoração de Segurança - projectAccessMiddleware
- [x] Identificar todos os usos restantes de projectAccessMiddleware no routers.ts (15 usos encontrados)
- [x] Refatorar cada procedimento para usar protectedProcedure + validateProjectAccess (10 procedimentos)
- [x] Remover completamente a definição de projectAccessMiddleware
- [x] Executar todos os testes para validar refatoração (10 passed, 5 skipped)
- [ ] Documentar padrão de validação de acesso no README
