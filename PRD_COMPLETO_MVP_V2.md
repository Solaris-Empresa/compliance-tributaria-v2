# 📘 PRD – MVP IA SOLARIS  
## Diagnóstico, Questionários e Planos de Ação por Ramo de Atividade

**Data:** 31/01/2026  
**Versão:** v2.0 – Consolidada e Completa  
**Fonte:** Reunião com Dr. José Rodrigues (Advogado Tributarista Sênior)  
**Status:** Pronto para implementação

---

## 1. Visão Geral

Este documento define os requisitos funcionais e estruturais do MVP do módulo de **Diagnóstico e Plano de Ação para Reforma Tributária / Compliance**, da plataforma **IA SOLARIS**.

A modelagem respeita rigorosamente:
- A **realidade jurídica**
- A **realidade operacional das empresas**
- A **necessidade de execução prática (tarefas)**

---

## 2. Hierarquia e Cardinalidade (REGRA FUNDACIONAL)

### 2.1 Estrutura Geral

```
Empresa
  └── N Projetos
       ├── 1 Questionário Corporativo
       │    └── 1 Plano de Ação Corporativo
       │         └── N Tarefas Corporativas
       │
       └── N Ramos de Atividade
            └── Para cada ramo:
                 ├── 1 Questionário por Ramo
                 └── 1 Plano de Ação por Ramo
                      └── N Tarefas Específicas
```

### 📌 Resultado Prático

Um Projeto sempre terá **1 + N Planos de Ação**:
- **1 institucional** (corporativo)
- **N específicos** por ramo de atividade

---

## 3. Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| **Empresa** | Cliente/organização que contrata o serviço |
| **Projeto** | Iniciativa de compliance dentro de uma empresa |
| **Ramo de Atividade** | Catálogo de atividades econômicas (Comércio, Indústria, Serviços, etc.) |
| **ProjetoRamo** | Vínculo N:N entre Projeto e Ramo de Atividade |
| **Questionário Corporativo** | Assessment estrutural da empresa |
| **Questionário por Ramo** | Assessment específico por atividade econômica |
| **Plano de Ação Corporativo** | Conjunto de tarefas institucionais |
| **Plano de Ação por Ramo** | Conjunto de tarefas específicas por ramo |
| **Tarefa** | Unidade de execução com responsável, prazo e status |
| **Usuário** | Pessoas que executam ou acompanham tarefas |
| **Observadores de Tarefa** | Usuários que acompanham mas não executam |
| **Preferências do Usuário** | Configurações de notificações |
| **Prompt de IA** | Instruções customizáveis para geração de planos |

---

## 4. Cadastro de Ramos de Atividade (OBRIGATÓRIO)

### 4.1 Conceito

O **Ramo de Atividade** representa a **atividade econômica exercida no projeto**, e **não o CNAE isoladamente**.

O cadastro é:
- ✅ Centralizado (catálogo)
- ✅ Reutilizável entre projetos
- ✅ Expansível

---

### 4.2 Estrutura do Cadastro de Ramos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| **id** | UUID | ✅ | Identificador único |
| **nome** | Texto | ✅ | Nome do ramo (ex: "Comércio") |
| **descrição** | Texto | ✅ | Descrição funcional/jurídica |
| **ativo** | Boolean | ✅ | Controle de uso (permite desativar sem deletar) |
| **criado_em** | Data | ✅ | Auditoria |
| **atualizado_em** | Data | ✅ | Auditoria |

---

### 4.3 Ramos Iniciais (Seed do MVP)

| Código | Ramo de Atividade | Descrição |
|--------|-------------------|-----------|
| **COM** | Comércio | Atividades de compra e venda de mercadorias |
| **IND** | Indústria | Produção e transformação de bens |
| **SER** | Serviços | Prestação de serviços em geral |
| **AGR** | Agronegócio | Produção rural, agroindustrial e cadeias correlatas |
| **SAU** | Saúde | Clínicas, hospitais, laboratórios |
| **IMO** | Imobiliário | Compra, venda, locação e incorporação |
| **LOG** | Logística | Transporte, armazenagem e distribuição |
| **EDU** | Educação | Instituições de ensino e treinamento |

📌 **Obs.:** O cadastro deve permitir **CRUD administrativo** (criar, editar, desativar ramos).

---

## 5. Questionário Corporativo

### 5.1 Finalidade

Avaliar aspectos **estruturais e transversais** da empresa no contexto do projeto.

### 5.2 Características

- ✅ Obrigatório
- ✅ Único por projeto
- ✅ Base para o plano de ação institucional

### 5.3 Exemplos de Temas

- ERP e sistemas fiscais
- Emissão de NF-e / NFS-e
- Governança e contratos
- Estrutura contábil e jurídica
- Capacidade interna de adaptação
- Equipe interna disponível

### 5.4 Output

➡️ **Plano de Ação Corporativo** (tarefas transversais)

---

## 6. Questionário por Ramo de Atividade

### 6.1 Finalidade

Avaliar impactos **específicos da Reforma Tributária conforme o ramo selecionado no projeto**.

### 6.2 Características

- ✅ Obrigatório para cada ramo do projeto
- ✅ Questionários distintos por ramo
- ✅ Independentes entre si

### 6.3 Exemplos por Ramo

**Comércio:**
- Gestão de estoque
- Vendas interestaduais
- Regime de substituição tributária

**Indústria:**
- Cadeia produtiva
- Créditos de ICMS/IPI
- Importação de insumos

**Serviços:**
- ISS x IBS
- Serviços digitais
- Exportação de serviços

### 6.4 Output

➡️ **Plano de Ação Específico por Ramo** (tarefas operacionais)

---

## 7. Plano de Ação

### 7.1 Conceito

Um **Plano de Ação é um conjunto de tarefas estruturadas**, não um texto narrativo.

### 7.2 Tipos

| Tipo | Origem | Escopo |
|------|--------|--------|
| **Plano de Ação Corporativo** | Questionário Corporativo | Tarefas institucionais/transversais |
| **Plano de Ação por Ramo** | Questionário por Ramo | Tarefas operacionais específicas |

### 7.3 Características

- ✅ Gerado automaticamente pela IA
- ✅ Editável manualmente (adicionar, remover, modificar tarefas)
- ✅ Recalculável via prompt customizado
- ✅ Versionado (histórico de alterações)

---

## 8. Tarefas (UNIDADE DE EXECUÇÃO)

### 8.1 Campos Obrigatórios da Tarefa

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| **Descrição** | ✅ | Texto | O que deve ser feito |
| **Origem** | ✅ | Enum | Corporativo / Ramo |
| **Ramo** | ⚠️ | FK | Obrigatório se origem = Ramo |
| **Área Responsável** | ✅ | Enum | TI, Contábil, Jurídico, Fiscal, Operações, Comercial, ADM |
| **Tipo** | ✅ | Enum | Estratégica / Operacional / Compliance |
| **Prioridade** | ✅ | Enum | Alta / Média / Baixa |
| **Usuário Responsável (Owner)** | ✅ | FK | Quem executa |
| **Data de Início** | ✅ | Date | Quando começa |
| **Deadline** | ✅ | Date | Prazo final |
| **Data de Conclusão** | ❌ | Date | Quando foi concluída (preenchido ao marcar como concluído) |
| **Status** | ✅ | Enum | Sugerido / Em execução / Concluído / Atrasado |
| **Dependência** | ❌ | FK | Tarefa que deve ser concluída antes |
| **Observações** | ❌ | Texto | Notas adicionais |

---

### 8.2 Áreas Responsáveis (Dinâmicas)

| Código | Área | Descrição |
|--------|------|-----------|
| **TI** | Tecnologia da Informação | Sistemas, ERP, infraestrutura |
| **CONT** | Contabilidade | Escrituração, balanços, relatórios |
| **FISC** | Fiscal / Tributário | Apuração, declarações, obrigações acessórias |
| **JUR** | Jurídico | Contratos, compliance legal, litígios |
| **OPS** | Operações | Processos internos, logística, produção |
| **COM** | Comercial | Vendas, relacionamento com clientes |
| **ADM** | Administrativo / Governança | Gestão, RH, políticas internas |

📌 **Obs.:** Deve ser configurável no futuro (permitir adicionar novas áreas).

---

### 8.3 Status de Tarefa

| Status | Descrição | Comportamento |
|--------|-----------|---------------|
| **Sugerido** | Tarefa gerada pela IA, ainda não iniciada | Status inicial |
| **Em execução** | Tarefa em andamento | Usuário marcou como iniciada |
| **Concluído** | Tarefa finalizada | Data de conclusão preenchida automaticamente |
| **Atrasado** | Deadline passou e tarefa não foi concluída | Calculado automaticamente |

---

## 9. Dono da Tarefa e Observadores

### 9.1 Dono da Tarefa (Owner)

- ✅ Responsável direto pela execução
- ✅ Recebe notificações conforme preferência
- ✅ Pode editar status e detalhes da tarefa
- ✅ Pode adicionar observadores

### 9.2 Observadores

- ✅ Usuários que acompanham a tarefa
- ❌ Não executam
- ✅ Recebem notificações conforme configuração pessoal
- ✅ Podem comentar e visualizar histórico

### 9.3 Relacionamento

```
Tarefa (1) ──── (1) Usuário Responsável (Owner)
Tarefa (1) ──── (N) Observadores
```

---

## 10. Notificações

### 10.1 Eventos Possíveis

| Evento | Quando dispara | Destinatários |
|--------|----------------|---------------|
| **Tarefa criada** | Nova tarefa atribuída | Owner + Observadores |
| **Início da tarefa** | Status mudou para "Em execução" | Owner + Observadores |
| **Aviso prévio** | X dias antes do deadline | Owner + Observadores |
| **Atraso** | Deadline passou sem conclusão | Owner + Observadores + Admin |
| **Conclusão** | Status mudou para "Concluído" | Observadores + Admin |
| **Comentário adicionado** | Alguém comentou na tarefa | Owner + Observadores |

### 10.2 Canal MVP

- ✅ **E-mail** (único canal no MVP)
- 🔜 Futuro: In-app, WhatsApp, Slack

### 10.3 Configuração

Cada usuário pode configurar:
- ✅ Receber ou não notificações
- ✅ Quais eventos deseja receber
- ✅ Frequência (imediato, diário, semanal)

---

## 11. Preferências do Usuário

### 11.1 Tela de Perfil

Cada usuário terá acesso a uma tela de configurações para definir:

| Configuração | Opções |
|--------------|--------|
| **Notificações ativas** | Sim / Não |
| **Eventos de interesse** | Criação, Início, Aviso prévio, Atraso, Conclusão, Comentários |
| **Frequência** | Imediato, Diário (resumo), Semanal (resumo) |
| **Papel padrão** | Owner / Observador |
| **Fuso horário** | UTC-3 (São Paulo) / Outros |

---

## 12. Prompt de IA

### 12.1 Tipos de Prompt

| Tipo | Escopo | Finalidade |
|------|--------|------------|
| **Prompt Corporativo** | Por projeto | Customiza geração do Plano de Ação Corporativo |
| **Prompt por Ramo** | Por ramo do projeto | Customiza geração do Plano de Ação por Ramo |

### 12.2 Características

- ✅ Campo editável pelo usuário
- ✅ Alterações não apagam histórico
- ✅ Reprocessamento on-demand (botão "Regenerar Plano")
- ✅ Versionamento (histórico de prompts)

### 12.3 Exemplo de Prompt Corporativo

```
Gere um plano de ação focado em:
- Adequação de sistemas ERP
- Treinamento da equipe contábil
- Revisão de contratos com fornecedores
- Priorize tarefas de curto prazo (até 3 meses)
- Considere que a empresa tem equipe interna de TI
```

### 12.4 Exemplo de Prompt por Ramo (Comércio)

```
Gere um plano de ação focado em:
- Gestão de estoque e tributação de mercadorias
- Adequação de vendas interestaduais ao novo regime
- Revisão de contratos com distribuidores
- Priorize tarefas operacionais
```

---

## 13. Fluxo de Uso (Resumo Funcional)

### 13.1 Fluxo Completo

```
1. Cadastro da Empresa
   ↓
2. Criação de Projeto
   ↓
3. Seleção de Ramos de Atividade (1 ou N)
   ↓
4. Preenchimento do Questionário Corporativo
   ↓
5. IA gera Plano de Ação Corporativo
   ↓
6. Para cada ramo selecionado:
   6.1. Preenchimento do Questionário por Ramo
   6.2. IA gera Plano de Ação por Ramo
   ↓
7. Usuário visualiza todos os planos (corporativo + ramos)
   ↓
8. Usuário edita tarefas (adicionar, remover, modificar)
   ↓
9. Usuário atribui responsáveis e observadores
   ↓
10. Usuário ajusta prompts (opcional)
   ↓
11. IA recalcula planos (on-demand)
   ↓
12. Execução e acompanhamento de tarefas
```

---

## 14. Impactos Técnicos (para DEV)

### 14.1 Banco de Dados

| Impacto | Observação |
|---------|------------|
| **Modelo de dados** | Relação empresa → projetos → ramos → questionários → planos → tarefas |
| **Relacionamentos N:N** | Projeto ↔ Ramo de Atividade (tabela pivot `ProjetoRamo`) |
| **Versionamento** | Histórico de planos e prompts (tabela `ActionPlanVersions`) |
| **Notificações** | Tabela `Notifications` + `UserPreferences` |

### 14.2 IA

| Impacto | Observação |
|---------|------------|
| **Contexto corporativo** | Prompt deve receber respostas do questionário corporativo |
| **Contexto por ramo** | Prompt deve receber respostas do questionário específico + contexto corporativo |
| **Geração de tarefas** | IA deve retornar JSON estruturado com campos obrigatórios |
| **Categorização automática** | IA deve sugerir área responsável, tipo e prioridade |

### 14.3 UX

| Impacto | Observação |
|---------|------------|
| **Separação visual** | Interface deve deixar claro o que é corporativo x ramo |
| **Filtros** | Permitir filtrar tarefas por: origem, ramo, área, status, responsável |
| **Dashboard** | Métricas separadas: tarefas corporativas vs. por ramo |
| **Notificações in-app** | Badge de notificações não lidas |

### 14.4 Auditoria

| Impacto | Observação |
|---------|------------|
| **Rastreabilidade** | Cada plano precisa registrar: quem gerou, quando, com qual prompt |
| **Histórico de alterações** | Log de edições manuais em tarefas |
| **Versionamento** | Manter versões anteriores de planos |

### 14.5 Escalabilidade

| Impacto | Observação |
|---------|------------|
| **Novos ramos** | Fácil inclusão via CRUD administrativo |
| **Novas áreas responsáveis** | Enum configurável no futuro |
| **Múltiplos projetos** | Empresa pode ter N projetos simultâneos |

---

## 15. Tabela Consolidada de Funcionalidades

| # | Funcionalidade | Descrição Detalhada | Impacto | Prioridade | Estimativa |
|---|----------------|---------------------|---------|------------|------------|
| **1** | **Cadastro de Ramos de Atividade** | Tabela mestra de ramos (Comércio, Indústria, Serviços, etc.) com CRUD admin | 🟡 MÉDIO | **CRÍTICA** | 2-3 dias |
| **2** | **Seleção de Ramos no Projeto** | Ao criar projeto, cliente seleciona 1 ou N ramos (relacionamento N:N) | 🟡 MÉDIO | **CRÍTICA** | 2-3 dias |
| **3** | **Questionário Corporativo** | Criar questionário único e obrigatório para aspectos gerais da empresa | 🔴 ALTO | **CRÍTICA** | 5-8 dias |
| **4** | **Questionários por Ramo** | Cada ramo selecionado gera questionário específico | 🔴 ALTO | **CRÍTICA** | 5-8 dias |
| **5** | **Plano de Ação Corporativo** | Gerar plano baseado no questionário corporativo (tarefas transversais) | 🟡 MÉDIO | **CRÍTICA** | 3-4 dias |
| **6** | **Planos de Ação por Ramo** | Gerar um plano específico para cada ramo de atividade | 🔴 ALTO | **CRÍTICA** | 5-7 dias |
| **7** | **Campo "Área Responsável"** | Adicionar campo obrigatório: TI, Contábil, Jurídico, Fiscal, Operações, Comercial, ADM | 🟡 MÉDIO | **CRÍTICA** | 2-3 dias |
| **8** | **Campo "Tipo de Tarefa"** | Categorizar tarefas: Estratégica, Operacional, Compliance | 🟢 BAIXO | **ALTA** | 1 dia |
| **9** | **Campo "Status da Tarefa"** | Adicionar status: Sugerido, Em execução, Concluído, Atrasado | 🟢 BAIXO | **CRÍTICA** | 1-2 dias |
| **10** | **Campo "Usuário Responsável"** | Atribuir owner (dono) para cada tarefa | 🟡 MÉDIO | **CRÍTICA** | 2 dias |
| **11** | **Campo "Observadores"** | Permitir adicionar N observadores por tarefa | 🟡 MÉDIO | **ALTA** | 2-3 dias |
| **12** | **Campo "Data Início/Deadline"** | Adicionar campos de prazo obrigatórios | 🟢 BAIXO | **CRÍTICA** | 1 dia |
| **13** | **Campo "Dependência"** | Permitir marcar se tarefa depende de outra (opcional) | 🟢 BAIXO | **BAIXA** | 1 dia |
| **14** | **Filtro por Área Responsável** | Filtrar tarefas por departamento (TI, Contábil, etc.) | 🟢 BAIXO | **MÉDIA** | 1 dia |
| **15** | **Filtro por Tipo de Plano** | Visualizar separadamente: Plano Corporativo vs. Planos por Ramo | 🟡 MÉDIO | **ALTA** | 2 dias |
| **16** | **Filtro por Status** | Filtrar tarefas por status (Sugerido, Em execução, Concluído, Atrasado) | 🟢 BAIXO | **ALTA** | 1 dia |
| **17** | **Edição de Prompt Corporativo** | Campo editável para ajustar como IA gera plano corporativo | 🟢 BAIXO | **MÉDIA** | 1 dia |
| **18** | **Edição de Prompt por Ramo** | Campo editável para ajustar como IA gera plano de cada ramo | 🟢 BAIXO | **MÉDIA** | 1 dia |
| **19** | **Regeneração de Planos** | Botão para recalcular plano (corporativo ou por ramo) após editar prompt | 🟢 BAIXO | **MÉDIA** | 1 dia |
| **20** | **Histórico de Versões** | Manter histórico de versões de planos gerados | 🟡 MÉDIO | **BAIXA** | 3-4 dias |
| **21** | **Sistema de Notificações** | Enviar emails para eventos: criação, início, aviso prévio, atraso, conclusão | 🔴 ALTO | **ALTA** | 5-7 dias |
| **22** | **Preferências do Usuário** | Tela de configurações para gerenciar notificações | 🟡 MÉDIO | **ALTA** | 3-4 dias |
| **23** | **Dashboard Separado** | Exibir métricas separadas: tarefas corporativas vs. por ramo | 🟡 MÉDIO | **MÉDIA** | 2-3 dias |
| **24** | **Comentários em Tarefas** | Permitir adicionar comentários/notas em tarefas | 🟡 MÉDIO | **BAIXA** | 2-3 dias |
| **25** | **Ajuste do Briefing** | Briefing deve capturar ramos de atividade selecionados | 🟢 BAIXO | **ALTA** | 1 dia |
| **26** | **Cálculo Automático de Atraso** | Marcar tarefas como "Atrasado" automaticamente após deadline | 🟢 BAIXO | **ALTA** | 1 dia |

---

## 16. Priorização Sugerida (Fases de Implementação)

### **FASE 1 - FUNDAÇÃO (Crítico - 2 semanas)**

**Objetivo:** Estabelecer estrutura base de ramos e questionário corporativo

- [ ] #1 - Cadastro de Ramos de Atividade
- [ ] #2 - Seleção de Ramos no Projeto
- [ ] #3 - Questionário Corporativo
- [ ] #7 - Campo "Área Responsável"
- [ ] #25 - Ajuste do Briefing

**Entregável:** Projeto pode ter múltiplos ramos + questionário corporativo funcional

---

### **FASE 2 - QUESTIONÁRIOS E PLANOS (Crítico - 3 semanas)**

**Objetivo:** Implementar questionários por ramo e geração de planos separados

- [ ] #4 - Questionários por Ramo
- [ ] #5 - Plano de Ação Corporativo
- [ ] #6 - Planos de Ação por Ramo
- [ ] #15 - Filtro por Tipo de Plano
- [ ] #17 - Edição de Prompt Corporativo
- [ ] #18 - Edição de Prompt por Ramo
- [ ] #19 - Regeneração de Planos

**Entregável:** Sistema gera planos corporativos e por ramo com prompts customizáveis

---

### **FASE 3 - GESTÃO DE TAREFAS (Alta - 2 semanas)**

**Objetivo:** Implementar campos obrigatórios e gestão de responsáveis

- [ ] #8 - Campo "Tipo de Tarefa"
- [ ] #9 - Campo "Status da Tarefa"
- [ ] #10 - Campo "Usuário Responsável"
- [ ] #11 - Campo "Observadores"
- [ ] #12 - Campo "Data Início/Deadline"
- [ ] #14 - Filtro por Área Responsável
- [ ] #16 - Filtro por Status
- [ ] #26 - Cálculo Automático de Atraso

**Entregável:** Tarefas com responsáveis, prazos e status funcionais

---

### **FASE 4 - NOTIFICAÇÕES (Alta - 2 semanas)**

**Objetivo:** Implementar sistema de notificações por email

- [ ] #21 - Sistema de Notificações
- [ ] #22 - Preferências do Usuário

**Entregável:** Usuários recebem emails sobre eventos de tarefas

---

### **FASE 5 - MELHORIAS (Média/Baixa - 2 semanas)**

**Objetivo:** Adicionar features complementares

- [ ] #13 - Campo "Dependência"
- [ ] #20 - Histórico de Versões
- [ ] #23 - Dashboard Separado
- [ ] #24 - Comentários em Tarefas

**Entregável:** Sistema completo com auditoria e colaboração

---

## 17. Estimativa Total

| Fase | Duração | Complexidade |
|------|---------|--------------|
| **Fase 1** | 2 semanas | 🔴 Alta |
| **Fase 2** | 3 semanas | 🔴 Alta |
| **Fase 3** | 2 semanas | 🟡 Média |
| **Fase 4** | 2 semanas | 🟡 Média |
| **Fase 5** | 2 semanas | 🟢 Baixa |
| **TOTAL** | **11 semanas** | - |

📌 **Obs.:** Estimativa considera 1 desenvolvedor full-time. Com 2 devs, pode reduzir para 7-8 semanas.

---

## 18. Critérios de Sucesso do MVP

### 18.1 Funcional

- ✅ Usuário entende claramente o que é corporativo x ramo
- ✅ Planos de ação são percebidos como acionáveis (tarefas reais)
- ✅ Advogado / contador reconhece aderência jurídica
- ✅ Base pronta para escalar novos ramos
- ✅ Cada tarefa tem área responsável definida
- ✅ Sistema suporta múltiplos projetos por empresa
- ✅ Notificações funcionam e são configuráveis

### 18.2 Técnico

- ✅ Separação clara entre institucional e ramo no código
- ✅ Responsabilidades definidas (owner + observadores)
- ✅ Escalável juridicamente e tecnicamente
- ✅ Auditoria completa (histórico de alterações)
- ✅ Performance adequada (até 100 projetos simultâneos)

### 18.3 Negócio

- ✅ Cliente consegue executar compliance de forma prática
- ✅ Redução de atrasos em tarefas críticas
- ✅ Visibilidade clara do progresso do projeto
- ✅ Diferencial competitivo (separação corporativo x ramo)

---

## 19. Observação Final

Este PRD representa uma **decisão estrutural de produto e jurídica**.

### ⚠️ Misturar os seguintes conceitos compromete a confiabilidade da IA SOLARIS:

❌ **Empresa com Projeto**  
❌ **Corporativo com Ramo**  
❌ **Plano com Texto Narrativo**

### ✅ Princípios Inegociáveis:

1. **Projeto ≠ Empresa** (uma empresa pode ter N projetos)
2. **Corporativo ≠ Ramo** (são níveis distintos de diagnóstico)
3. **Plano = Tarefas** (não é texto, é conjunto de ações executáveis)
4. **Tarefa = Responsável + Prazo + Status** (não é sugestão genérica)

---

**Documento validado para desenvolvimento.**  
**Aprovado por:** Dr. José Rodrigues (Advogado Tributarista Sênior)  
**Consolidado por:** Manus AI  
**Data:** 31/01/2026
