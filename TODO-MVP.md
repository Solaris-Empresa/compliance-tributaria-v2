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
