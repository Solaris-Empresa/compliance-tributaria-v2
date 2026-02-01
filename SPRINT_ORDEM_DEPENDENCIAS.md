# 🚀 SPRINT - Ordem de Implementação por Dependências Técnicas

**Projeto:** IA SOLARIS - MVP Compliance Tributária  
**Data:** 31/01/2026  
**Metodologia:** Ordem baseada em dependências técnicas (bottom-up)

---

## 📊 Grafo de Dependências

```
CAMADA 1 (FUNDAÇÃO - SEM DEPENDÊNCIAS)
├── #1 Cadastro de Ramos de Atividade
└── #7 Enum de Áreas Responsáveis

CAMADA 2 (DEPENDE DA CAMADA 1)
├── #2 Seleção de Ramos no Projeto (depende de #1)
└── #8 Campo "Tipo de Tarefa" (enum independente)

CAMADA 3 (DEPENDE DA CAMADA 2)
├── #3 Questionário Corporativo (depende de #2)
└── #25 Ajuste do Briefing (depende de #2)

CAMADA 4 (DEPENDE DA CAMADA 3)
├── #4 Questionários por Ramo (depende de #2 e #3)
└── #17 Edição de Prompt Corporativo (depende de #3)

CAMADA 5 (DEPENDE DA CAMADA 4)
├── #5 Plano de Ação Corporativo (depende de #3 e #17)
└── #18 Edição de Prompt por Ramo (depende de #4)

CAMADA 6 (DEPENDE DA CAMADA 5)
├── #6 Planos de Ação por Ramo (depende de #4, #5 e #18)
└── #9 Campo "Status da Tarefa" (depende de #5 e #6)

CAMADA 7 (DEPENDE DA CAMADA 6)
├── #10 Campo "Usuário Responsável" (depende de #5 e #6)
├── #12 Campos "Data Início/Deadline" (depende de #5 e #6)
└── #26 Cálculo Automático de Atraso (depende de #9 e #12)

CAMADA 8 (DEPENDE DA CAMADA 7)
├── #11 Campo "Observadores" (depende de #10)
└── #13 Campo "Dependência" (depende de #10)

CAMADA 9 (DEPENDE DA CAMADA 8)
├── #14 Filtro por Área Responsável (depende de #7 e #10)
├── #15 Filtro por Tipo de Plano (depende de #5 e #6)
└── #16 Filtro por Status (depende de #9)

CAMADA 10 (DEPENDE DA CAMADA 9)
├── #19 Regeneração de Planos (depende de #5, #6, #17 e #18)
└── #21 Sistema de Notificações (depende de #10, #11 e #26)

CAMADA 11 (DEPENDE DA CAMADA 10)
├── #22 Preferências do Usuário (depende de #21)
└── #24 Comentários em Tarefas (depende de #10 e #11)

CAMADA 12 (DEPENDE DA CAMADA 11)
├── #20 Histórico de Versões (depende de #19)
└── #23 Dashboard Separado (depende de #15, #16 e #21)
```

---

## 🎯 Ordem de Implementação (26 Issues)

### **SPRINT 1 - FUNDAÇÃO (Semana 1-2)**

#### Issue #1: Cadastro de Ramos de Atividade
- **Prioridade:** P0 (Crítica)
- **Dependências:** Nenhuma
- **Estimativa:** 2-3 dias
- **Descrição:**
  - Criar tabela `activityBranches` (id, nome, descrição, ativo, criado_em, atualizado_em)
  - Criar seed com 8 ramos iniciais (Comércio, Indústria, Serviços, Agronegócio, Saúde, Imobiliário, Logística, Educação)
  - Criar CRUD admin (listar, criar, editar, desativar)
  - Criar página `/admin/ramos-atividade`
- **Critérios de Aceite:**
  - [ ] Tabela criada com migração
  - [ ] Seed executado com 8 ramos
  - [ ] Admin consegue criar/editar/desativar ramos
  - [ ] Validação: nome obrigatório, descrição obrigatória

---

#### Issue #7: Enum de Áreas Responsáveis
- **Prioridade:** P0 (Crítica)
- **Dependências:** Nenhuma
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar enum `ResponsibleArea` no schema: TI, CONT, FISC, JUR, OPS, COM, ADM
  - Adicionar campo `responsibleArea` na tabela `actions` (se já existir) ou preparar para uso futuro
  - Criar componente dropdown `<ResponsibleAreaSelect>` no frontend
- **Critérios de Aceite:**
  - [ ] Enum criado no schema
  - [ ] Componente dropdown funcional
  - [ ] Tradução de códigos para nomes (TI → Tecnologia da Informação)

---

#### Issue #8: Campo "Tipo de Tarefa"
- **Prioridade:** P1 (Alta)
- **Dependências:** Nenhuma
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar enum `TaskType` no schema: STRATEGIC, OPERATIONAL, COMPLIANCE
  - Adicionar campo `taskType` na tabela `actions`
  - Criar componente dropdown `<TaskTypeSelect>` no frontend
- **Critérios de Aceite:**
  - [ ] Enum criado no schema
  - [ ] Campo adicionado na tabela
  - [ ] Componente dropdown funcional

---

### **SPRINT 2 - PROJETOS E RAMOS (Semana 2-3)**

#### Issue #2: Seleção de Ramos no Projeto
- **Prioridade:** P0 (Crítica)
- **Dependências:** #1
- **Estimativa:** 2-3 dias
- **Descrição:**
  - Criar tabela pivot `projectBranches` (projectId, branchId, createdAt)
  - Adicionar step "Seleção de Ramos" no formulário de criação de projeto
  - Permitir selecionar múltiplos ramos (checkboxes)
  - Exibir ramos selecionados na página do projeto
- **Critérios de Aceite:**
  - [ ] Tabela pivot criada
  - [ ] Formulário permite selecionar 1 ou N ramos
  - [ ] Ramos salvos corretamente no banco
  - [ ] Página do projeto exibe ramos selecionados

---

#### Issue #25: Ajuste do Briefing
- **Prioridade:** P1 (Alta)
- **Dependências:** #2
- **Estimativa:** 1 dia
- **Descrição:**
  - Adicionar campo `selectedBranches` (JSON ou relacionamento) na tabela `briefings`
  - Exibir ramos selecionados no briefing
  - Ajustar geração do briefing para incluir contexto dos ramos
- **Critérios de Aceite:**
  - [ ] Campo adicionado na tabela
  - [ ] Briefing exibe ramos selecionados
  - [ ] Contexto de ramos enviado para IA

---

### **SPRINT 3 - QUESTIONÁRIO CORPORATIVO (Semana 3-4)**

#### Issue #3: Questionário Corporativo
- **Prioridade:** P0 (Crítica)
- **Dependências:** #2
- **Estimativa:** 5-8 dias
- **Descrição:**
  - Criar tabela `corporateAssessment` (projectId, questions, answers, completedAt, completedBy)
  - Criar página `/projeto/:id/questionario-corporativo`
  - Gerar perguntas via IA focadas em: ERP, NF-e, governança, estrutura contábil, equipe interna
  - Salvar respostas no banco
  - Marcar como concluído ao finalizar
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Página funcional com formulário
  - [ ] IA gera perguntas personalizadas
  - [ ] Respostas salvas corretamente
  - [ ] Status "concluído" atualizado

---

#### Issue #17: Edição de Prompt Corporativo
- **Prioridade:** P2 (Média)
- **Dependências:** #3
- **Estimativa:** 1 dia
- **Descrição:**
  - Adicionar campo `corporatePrompt` (TEXT) na tabela `projects`
  - Criar campo editável na página do projeto
  - Usar prompt customizado ao gerar plano corporativo
- **Critérios de Aceite:**
  - [ ] Campo adicionado na tabela
  - [ ] Interface permite editar prompt
  - [ ] Prompt customizado usado na geração

---

### **SPRINT 4 - QUESTIONÁRIOS POR RAMO (Semana 4-5)**

#### Issue #4: Questionários por Ramo
- **Prioridade:** P0 (Crítica)
- **Dependências:** #2, #3
- **Estimativa:** 5-8 dias
- **Descrição:**
  - Criar tabela `branchAssessments` (projectId, branchId, questions, answers, completedAt, completedBy)
  - Criar página `/projeto/:id/questionario-ramo/:branchId`
  - Gerar perguntas específicas por ramo via IA
  - Salvar respostas no banco
  - Exibir lista de questionários pendentes/concluídos por ramo
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Página funcional para cada ramo
  - [ ] IA gera perguntas específicas por ramo
  - [ ] Respostas salvas corretamente
  - [ ] Lista de questionários por ramo exibida

---

#### Issue #18: Edição de Prompt por Ramo
- **Prioridade:** P2 (Média)
- **Dependências:** #4
- **Estimativa:** 1 dia
- **Descrição:**
  - Adicionar campo `branchPrompt` (TEXT) na tabela `branchAssessments`
  - Criar campo editável na página do questionário por ramo
  - Usar prompt customizado ao gerar plano por ramo
- **Critérios de Aceite:**
  - [ ] Campo adicionado na tabela
  - [ ] Interface permite editar prompt
  - [ ] Prompt customizado usado na geração

---

### **SPRINT 5 - PLANOS DE AÇÃO (Semana 5-7)**

#### Issue #5: Plano de Ação Corporativo
- **Prioridade:** P0 (Crítica)
- **Dependências:** #3, #17
- **Estimativa:** 3-4 dias
- **Descrição:**
  - Criar tabela `corporateActionPlans` (projectId, prompt, detailedPlan, version, generatedAt)
  - Criar procedimento tRPC `corporateActionPlan.generate`
  - Gerar plano via IA baseado no questionário corporativo + prompt
  - Criar página `/projeto/:id/plano-corporativo`
  - Exibir tarefas corporativas estruturadas
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Procedimento tRPC funcional
  - [ ] IA gera plano com tarefas estruturadas
  - [ ] Página exibe plano corporativo
  - [ ] Campo `category: 'corporate'` nas tarefas

---

#### Issue #6: Planos de Ação por Ramo
- **Prioridade:** P0 (Crítica)
- **Dependências:** #4, #5, #18
- **Estimativa:** 5-7 dias
- **Descrição:**
  - Criar tabela `branchActionPlans` (projectId, branchId, prompt, detailedPlan, version, generatedAt)
  - Criar procedimento tRPC `branchActionPlan.generate`
  - Gerar plano via IA baseado no questionário por ramo + prompt
  - Criar página `/projeto/:id/plano-ramo/:branchId`
  - Exibir tarefas específicas do ramo estruturadas
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Procedimento tRPC funcional
  - [ ] IA gera plano com tarefas estruturadas
  - [ ] Página exibe plano por ramo
  - [ ] Campo `category: 'branch'` nas tarefas
  - [ ] Relacionamento com ramo correto

---

#### Issue #9: Campo "Status da Tarefa"
- **Prioridade:** P0 (Crítica)
- **Dependências:** #5, #6
- **Estimativa:** 1-2 dias
- **Descrição:**
  - Criar enum `TaskStatus`: SUGGESTED, IN_PROGRESS, COMPLETED, OVERDUE
  - Adicionar campo `status` na tabela `actions`
  - Criar componente `<TaskStatusBadge>` no frontend
  - Permitir alterar status manualmente
- **Critérios de Aceite:**
  - [ ] Enum criado no schema
  - [ ] Campo adicionado na tabela
  - [ ] Badge visual por status
  - [ ] Usuário pode alterar status

---

### **SPRINT 6 - GESTÃO DE TAREFAS (Semana 7-9)**

#### Issue #10: Campo "Usuário Responsável"
- **Prioridade:** P0 (Crítica)
- **Dependências:** #5, #6
- **Estimativa:** 2 dias
- **Descrição:**
  - Adicionar campo `ownerId` (FK para `users`) na tabela `actions`
  - Criar componente `<UserSelect>` para atribuir responsável
  - Exibir nome do responsável nas tarefas
  - Filtrar tarefas por responsável
- **Critérios de Aceite:**
  - [ ] Campo adicionado na tabela
  - [ ] Componente de seleção funcional
  - [ ] Nome do responsável exibido
  - [ ] Filtro por responsável funcional

---

#### Issue #12: Campos "Data Início/Deadline"
- **Prioridade:** P0 (Crítica)
- **Dependências:** #5, #6
- **Estimativa:** 1 dia
- **Descrição:**
  - Adicionar campos `startDate` e `deadline` (DATE) na tabela `actions`
  - Criar componente `<DateRangePicker>` no frontend
  - Validar que deadline >= startDate
  - Exibir prazos nas tarefas
- **Critérios de Aceite:**
  - [ ] Campos adicionados na tabela
  - [ ] Componente de seleção funcional
  - [ ] Validação de datas implementada
  - [ ] Prazos exibidos corretamente

---

#### Issue #26: Cálculo Automático de Atraso
- **Prioridade:** P1 (Alta)
- **Dependências:** #9, #12
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar job/cron que verifica tarefas com deadline < hoje e status != COMPLETED
  - Atualizar status para OVERDUE automaticamente
  - Exibir badge vermelho para tarefas atrasadas
- **Critérios de Aceite:**
  - [ ] Job criado e agendado
  - [ ] Status OVERDUE atualizado automaticamente
  - [ ] Badge vermelho exibido para atrasadas

---

#### Issue #11: Campo "Observadores"
- **Prioridade:** P1 (Alta)
- **Dependências:** #10
- **Estimativa:** 2-3 dias
- **Descrição:**
  - Criar tabela `taskObservers` (taskId, userId, createdAt)
  - Criar componente `<ObserversSelect>` (multi-select de usuários)
  - Exibir lista de observadores na tarefa
  - Permitir adicionar/remover observadores
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Componente multi-select funcional
  - [ ] Lista de observadores exibida
  - [ ] Adicionar/remover funciona corretamente

---

#### Issue #13: Campo "Dependência"
- **Prioridade:** P3 (Baixa)
- **Dependências:** #10
- **Estimativa:** 1 dia
- **Descrição:**
  - Adicionar campo `dependsOn` (FK para `actions`) na tabela `actions`
  - Criar componente `<TaskDependencySelect>` (select de tarefas do mesmo projeto)
  - Exibir dependência na tarefa
  - Validar que não cria ciclos
- **Critérios de Aceite:**
  - [ ] Campo adicionado na tabela
  - [ ] Componente de seleção funcional
  - [ ] Dependência exibida
  - [ ] Validação de ciclos implementada

---

### **SPRINT 7 - FILTROS E UI (Semana 9-10)**

#### Issue #14: Filtro por Área Responsável
- **Prioridade:** P2 (Média)
- **Dependências:** #7, #10
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar dropdown de filtro por área responsável
  - Filtrar tarefas na listagem
  - Manter filtro no estado da URL (query params)
- **Critérios de Aceite:**
  - [ ] Dropdown funcional
  - [ ] Filtro aplicado corretamente
  - [ ] URL reflete filtro selecionado

---

#### Issue #15: Filtro por Tipo de Plano
- **Prioridade:** P1 (Alta)
- **Dependências:** #5, #6
- **Estimativa:** 2 dias
- **Descrição:**
  - Criar tabs ou dropdown: "Corporativo" / "Por Ramo" / "Todos"
  - Filtrar tarefas por categoria (corporate vs. branch)
  - Exibir contador de tarefas por tipo
- **Critérios de Aceite:**
  - [ ] Tabs/dropdown funcional
  - [ ] Filtro aplicado corretamente
  - [ ] Contador de tarefas exibido

---

#### Issue #16: Filtro por Status
- **Prioridade:** P1 (Alta)
- **Dependências:** #9
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar dropdown de filtro por status
  - Filtrar tarefas na listagem
  - Exibir contador de tarefas por status
- **Critérios de Aceite:**
  - [ ] Dropdown funcional
  - [ ] Filtro aplicado corretamente
  - [ ] Contador de tarefas exibido

---

### **SPRINT 8 - REGENERAÇÃO E NOTIFICAÇÕES (Semana 10-12)**

#### Issue #19: Regeneração de Planos
- **Prioridade:** P2 (Média)
- **Dependências:** #5, #6, #17, #18
- **Estimativa:** 1 dia
- **Descrição:**
  - Criar botão "Regenerar Plano" nas páginas de plano corporativo e por ramo
  - Reutilizar lógica de geração existente
  - Criar nova versão do plano (não sobrescrever)
  - Exibir indicador de loading durante regeneração
- **Critérios de Aceite:**
  - [ ] Botão funcional
  - [ ] Nova versão criada
  - [ ] Plano anterior mantido no histórico
  - [ ] Loading exibido durante geração

---

#### Issue #21: Sistema de Notificações
- **Prioridade:** P1 (Alta)
- **Dependências:** #10, #11, #26
- **Estimativa:** 5-7 dias
- **Descrição:**
  - Criar tabela `notifications` (userId, taskId, event, sentAt, readAt)
  - Criar serviço de envio de email
  - Implementar eventos: criação, início, aviso prévio, atraso, conclusão, comentários
  - Criar template de email para cada evento
  - Enviar emails para owner + observadores
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Serviço de email funcional
  - [ ] 6 eventos implementados
  - [ ] Templates de email criados
  - [ ] Emails enviados corretamente

---

#### Issue #22: Preferências do Usuário
- **Prioridade:** P1 (Alta)
- **Dependências:** #21
- **Estimativa:** 3-4 dias
- **Descrição:**
  - Criar tabela `userPreferences` (userId, notificationsEnabled, events, frequency, timezone)
  - Criar página `/perfil/notificacoes`
  - Permitir habilitar/desabilitar notificações
  - Permitir selecionar eventos de interesse
  - Permitir escolher frequência (imediato, diário, semanal)
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Página funcional
  - [ ] Preferências salvas corretamente
  - [ ] Notificações respeitam preferências

---

#### Issue #24: Comentários em Tarefas
- **Prioridade:** P3 (Baixa)
- **Dependências:** #10, #11
- **Estimativa:** 2-3 dias
- **Descrição:**
  - Criar tabela `taskComments` (taskId, userId, comment, createdAt)
  - Criar componente `<TaskComments>` na página da tarefa
  - Permitir adicionar comentários
  - Exibir lista de comentários com autor e data
  - Notificar owner + observadores ao adicionar comentário
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Componente funcional
  - [ ] Comentários salvos corretamente
  - [ ] Lista exibida corretamente
  - [ ] Notificações enviadas

---

### **SPRINT 9 - MELHORIAS FINAIS (Semana 12-13)**

#### Issue #20: Histórico de Versões
- **Prioridade:** P3 (Baixa)
- **Dependências:** #19
- **Estimativa:** 3-4 dias
- **Descrição:**
  - Criar tabela `actionPlanVersions` (planId, version, prompt, detailedPlan, createdAt, createdBy)
  - Salvar nova versão ao regenerar plano
  - Criar página de histórico de versões
  - Permitir visualizar versões anteriores
  - Permitir restaurar versão anterior
- **Critérios de Aceite:**
  - [ ] Tabela criada
  - [ ] Versões salvas automaticamente
  - [ ] Página de histórico funcional
  - [ ] Visualização de versões anteriores funciona
  - [ ] Restauração funciona corretamente

---

#### Issue #23: Dashboard Separado
- **Prioridade:** P3 (Baixa)
- **Dependências:** #15, #16, #21
- **Estimativa:** 2-3 dias
- **Descrição:**
  - Criar página `/projeto/:id/dashboard`
  - Exibir métricas separadas: tarefas corporativas vs. por ramo
  - Exibir gráficos: status, área responsável, prioridade
  - Exibir tarefas atrasadas em destaque
  - Exibir progresso geral do projeto
- **Critérios de Aceite:**
  - [ ] Página criada
  - [ ] Métricas separadas exibidas
  - [ ] Gráficos funcionais
  - [ ] Tarefas atrasadas destacadas
  - [ ] Progresso calculado corretamente

---

## 📊 Resumo por Sprint

| Sprint | Issues | Duração | Prioridade |
|--------|--------|---------|------------|
| **Sprint 1** | #1, #7, #8 | 2 semanas | P0 (Fundação) |
| **Sprint 2** | #2, #25 | 1 semana | P0 (Projetos e Ramos) |
| **Sprint 3** | #3, #17 | 1-2 semanas | P0 (Questionário Corporativo) |
| **Sprint 4** | #4, #18 | 1-2 semanas | P0 (Questionários por Ramo) |
| **Sprint 5** | #5, #6, #9 | 2 semanas | P0 (Planos de Ação) |
| **Sprint 6** | #10, #12, #26, #11, #13 | 2 semanas | P0-P1 (Gestão de Tarefas) |
| **Sprint 7** | #14, #15, #16 | 1 semana | P1-P2 (Filtros e UI) |
| **Sprint 8** | #19, #21, #22, #24 | 2-3 semanas | P1-P2 (Regeneração e Notificações) |
| **Sprint 9** | #20, #23 | 1-2 semanas | P3 (Melhorias Finais) |
| **TOTAL** | 26 issues | **11-13 semanas** | - |

---

## 🎯 Prioridades

- **P0 (Crítica):** Bloqueante, deve ser implementado primeiro
- **P1 (Alta):** Importante, deve ser implementado logo após P0
- **P2 (Média):** Desejável, pode ser implementado depois
- **P3 (Baixa):** Nice-to-have, pode ser adiado

---

## ✅ Critérios de Conclusão da Sprint

- [ ] Todas as issues P0 e P1 concluídas
- [ ] Testes manuais realizados
- [ ] Bugs críticos corrigidos
- [ ] Checkpoint criado no Manus
- [ ] Documentação atualizada
- [ ] PRD validado com cliente

---

**Documento criado por:** Manus AI  
**Data:** 31/01/2026
