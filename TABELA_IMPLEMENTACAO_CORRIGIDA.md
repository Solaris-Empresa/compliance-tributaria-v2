# 🧭 Tabela de Implementação por Ordem de Dependência – MVP IA SOLARIS

**Versão:** v2.1 - Corrigida e Alinhada com Implementação Real  
**Data:** 31/01/2026  
**Status:** Validado para desenvolvimento

---

## 🟥 CAMADA 0 — FUNDAÇÃO ABSOLUTA (SEM ISSO, NADA FUNCIONA)

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **0.1** | **Usuário** | Sistema de autenticação OAuth | — | Projetos, Tarefas | ✅ **EXISTE** |
| **0.2** | **Projeto** | Entidade central do MVP | Usuário | Questionários, Planos | ✅ **EXISTE** |
| **0.3** | **Briefing** | Levantamento inicial do projeto | Projeto | Questionários | ✅ **EXISTE** |

### 📌 Observação:
- **Empresa** não é entidade separada no MVP atual - o conceito de "cliente" está implícito no projeto
- **Projeto** é o container lógico. Tudo acontece dentro dele.
- **Briefing** já existe e precisa ser ajustado para incluir ramos selecionados

---

## 🟥 CAMADA 1 — CATÁLOGOS E ESTRUTURA BASE

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **1.1** | **Cadastro de Ramos de Atividade** | Catálogo mestre (CRUD) | — | Seleção de ramos | ❌ **IMPLEMENTAR** |
| **1.2** | **ProjetoRamo (N:N)** | Projeto ↔ Ramo | Projeto + Ramos | Questionários por ramo | ❌ **IMPLEMENTAR** |
| **1.3** | **Enum de Áreas Responsáveis** | TI, CONT, FISC, JUR, OPS, COM, ADM (fixo) | — | Tarefas | ❌ **IMPLEMENTAR** |
| **1.4** | **Enum de Tipo de Tarefa** | STRATEGIC, OPERATIONAL, COMPLIANCE (fixo) | — | Categorização | ❌ **IMPLEMENTAR** |

### 📌 Sem isso:
- Não existe questionário por ramo nem categorização de tarefas.
- **Áreas Responsáveis** são enum fixo no MVP (não CRUD dinâmico)

---

## 🟥 CAMADA 2 — QUESTIONÁRIOS (ORIGEM DE TUDO)

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **2.1** | **Ajuste do Briefing** | Incluir ramos selecionados | ProjetoRamo | Contexto para IA | ❌ **AJUSTAR** |
| **2.2** | **Questionário Corporativo** | Assessment institucional | Projeto | Plano corporativo | ❌ **IMPLEMENTAR** |
| **2.3** | **Respostas Corporativas** | Persistência das respostas | Questionário corp. | IA | ❌ **IMPLEMENTAR** |
| **2.4** | **Questionário por Ramo** | Assessment específico | ProjetoRamo | Plano por ramo | ❌ **IMPLEMENTAR** |
| **2.5** | **Respostas por Ramo** | Persistência das respostas | Quest. por ramo | IA | ❌ **IMPLEMENTAR** |

### 📌 Regra de ouro:
👉 **Sem questionário, não existe plano.**

### 📊 Contexto Atual:
- ✅ **Assessment Fase 1 e Fase 2** já existem mas são genéricos (não separados por corporativo/ramo)
- ❌ Precisam ser **refatorados** para nova estrutura

---

## 🟥 CAMADA 3 — PLANOS DE AÇÃO (NÍVEL ESTRATÉGICO)

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **3.1** | **Prompt Corporativo** | Campo editável para customizar IA | Projeto | Plano corp. | ❌ **IMPLEMENTAR** |
| **3.2** | **Plano de Ação Corporativo** | Plano institucional | Respostas corp. + Prompt | Tarefas corp. | ❌ **IMPLEMENTAR** |
| **3.3** | **Prompt por Ramo** | Campo editável por ramo | ProjetoRamo | Plano por ramo | ❌ **IMPLEMENTAR** |
| **3.4** | **Plano de Ação por Ramo** | Plano específico | Respostas por ramo + Prompt | Tarefas por ramo | ❌ **IMPLEMENTAR** |
| **3.5** | **Versionamento de Plano** | Histórico de versões | Plano | Auditoria | ⚠️ **ADAPTAR** |

### 📌 Aqui nasce o **1 + N planos** por projeto.

### 📊 Contexto Atual:
- ✅ **Plano de Ação** já existe mas é único (não separado por corporativo/ramo)
- ✅ **Sistema de versionamento** já existe para Matriz de Riscos
- ❌ Precisa **refatorar** para suportar múltiplos planos

---

## 🟥 CAMADA 4 — TAREFAS (EXECUÇÃO REAL)

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **4.1** | **Modelo de Tarefa Base** | Estrutura base (já existe) | Plano | Execução | ✅ **EXISTE** |
| **4.2** | **Campo Origem** | Corporativo / Ramo | Tarefa | Filtros | ❌ **IMPLEMENTAR** |
| **4.3** | **Campo Ramo** | FK para ramo (se origem = Ramo) | Tarefa + ProjetoRamo | Rastreabilidade | ❌ **IMPLEMENTAR** |
| **4.4** | **Campo Área Responsável** | Enum (TI, CONT, etc.) | Tarefa | Filtros | ❌ **IMPLEMENTAR** |
| **4.5** | **Campo Tipo** | Estratégica, Operacional, Compliance | Tarefa | Ordenação | ❌ **IMPLEMENTAR** |
| **4.6** | **Campo Prioridade** | Alta, Média, Baixa | Tarefa | Ordenação | ⚠️ **EXISTE** |
| **4.7** | **Campo Status** | Sugerido, Em execução, Concluído, Atrasado | Tarefa | Fluxo | ❌ **IMPLEMENTAR** |
| **4.8** | **Campo Owner (Dono)** | FK para usuário responsável | Tarefa + Usuário | Notificação | ❌ **IMPLEMENTAR** |
| **4.9** | **Campos Datas** | startDate, deadline | Tarefa | Atraso | ❌ **IMPLEMENTAR** |
| **4.10** | **Cálculo de Atraso** | Job automático | Datas + Status | Alertas | ❌ **IMPLEMENTAR** |
| **4.11** | **Campo Dependência** | FK para outra tarefa (opcional) | Tarefa | Ordenação | ❌ **IMPLEMENTAR** |

### 📌 Sem essa camada, o sistema vira "texto bonito".

### 📊 Contexto Atual:
- ✅ **Tabela `actions`** já existe com campos básicos
- ❌ Precisa **adicionar novos campos** (origem, ramo, área, tipo, status, owner, datas, dependência)

---

## 🟥 CAMADA 5 — COLABORAÇÃO E GOVERNANÇA

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **5.1** | **Observadores** | Watchers da tarefa (N:N) | Tarefa + Usuário | Comunicação | ❌ **IMPLEMENTAR** |
| **5.2** | **Comentários** | Histórico humano | Tarefa + Usuário | Auditoria | ❌ **IMPLEMENTAR** |
| **5.3** | **Logs de Alteração** | Quem mudou o quê | Tudo acima | Compliance | ❌ **IMPLEMENTAR** |

---

## 🟥 CAMADA 6 — NOTIFICAÇÕES (EVENT-DRIVEN)

| Ordem | Item | O que é | Depende de | Destrava | Status Atual |
|-------|------|---------|------------|----------|--------------|
| **6.1** | **Preferências do Usuário** | Opt-in/out | Usuário | Emails | ❌ **IMPLEMENTAR** |
| **6.2** | **Eventos de Tarefa** | Start, atraso, fim, comentário | Status + Datas | Notificações | ❌ **IMPLEMENTAR** |
| **6.3** | **Envio de E-mail** | Canal MVP | Eventos | Comunicação | ❌ **IMPLEMENTAR** |
| **6.4** | **Avisos Pré-Deadline** | Job agendado | Datas | Prevenção | ❌ **IMPLEMENTAR** |

### 📌 Regra importante:
👉 **Notificação nunca é hardcoded → sempre respeita preferências.**

---

## 🟥 CAMADA 7 — UX / CONTROLE

| Ordem | Item | O que é | Depende de | Status Atual |
|-------|------|---------|------------|--------------|
| **7.1** | **Filtro por Plano** | Corporativo x Ramo | Planos | ❌ **IMPLEMENTAR** |
| **7.2** | **Filtro por Área** | TI, Jurídico, etc. | Tarefas | ❌ **IMPLEMENTAR** |
| **7.3** | **Filtro por Status** | Atrasadas, etc. | Status | ❌ **IMPLEMENTAR** |
| **7.4** | **Filtro por Responsável** | Owner | Tarefas | ❌ **IMPLEMENTAR** |
| **7.5** | **Dashboard** | Visão geral | Tudo acima | ❌ **IMPLEMENTAR** |

---

## 🧠 Resumo Executivo (para alinhar com DEV)

### ✅ Ordem Não Negociável:

```
1. Usuário → Projeto → Briefing (já existe)
   ↓
2. Ramos + Áreas (catálogos)
   ↓
3. Questionários (corporativo + por ramo)
   ↓
4. Prompts (customização IA)
   ↓
5. Planos (corporativo + por ramo)
   ↓
6. Tarefas (com todos os campos)
   ↓
7. Atribuições (owner + observadores)
   ↓
8. Notificações (eventos + preferências)
   ↓
9. Dashboard (filtros + métricas)
```

---

## 📊 Mapeamento para Issues GitHub

| Camada | Issues Correspondentes | Prioridade |
|--------|------------------------|------------|
| **Camada 0** | ✅ Já implementado | - |
| **Camada 1** | #1, #7, #8, #2, #25 | P0 (Crítica) |
| **Camada 2** | #3, #4 | P0 (Crítica) |
| **Camada 3** | #17, #5, #18, #6, #20 | P0 (Crítica) |
| **Camada 4** | #9, #10, #12, #26, #13 | P0-P1 (Crítica/Alta) |
| **Camada 5** | #11, #24 | P1-P3 (Alta/Baixa) |
| **Camada 6** | #21, #22 | P1 (Alta) |
| **Camada 7** | #14, #15, #16, #23 | P2-P3 (Média/Baixa) |

---

## 🎯 Diferenças vs. Sistema Atual

### ✅ **O que JÁ existe:**
- Autenticação OAuth (Manus)
- Projetos
- Briefing
- Assessment Fase 1 e Fase 2 (genérico)
- Matriz de Riscos
- Plano de Ação (único, genérico)
- Tabela `actions` (estrutura básica)
- Sistema de versionamento (Matriz de Riscos)

### ❌ **O que precisa ser CRIADO:**
- Cadastro de Ramos de Atividade
- Relacionamento Projeto ↔ Ramos (N:N)
- Questionário Corporativo (separado)
- Questionários por Ramo (múltiplos)
- Plano de Ação Corporativo (separado)
- Planos de Ação por Ramo (múltiplos)
- Campos novos em `actions`: origem, ramo, área, tipo, status, owner, datas, dependência
- Sistema de Observadores
- Sistema de Notificações
- Preferências do Usuário
- Comentários em Tarefas
- Filtros e Dashboard

### ⚠️ **O que precisa ser REFATORADO:**
- Assessment Fase 1/2 → Questionário Corporativo + Questionários por Ramo
- Plano de Ação único → Plano Corporativo + Planos por Ramo
- Briefing → Incluir ramos selecionados
- Sistema de versionamento → Adaptar para múltiplos planos

---

## ⚠️ Observações Importantes

### 1. **Empresa vs. Projeto**
No MVP atual, não existe entidade "Empresa" separada. O conceito de cliente está implícito no projeto. Se quiser adicionar, seria Camada 0.0, mas aumenta complexidade.

### 2. **Áreas Responsáveis**
Definidas como **enum fixo** no MVP (TI, CONT, FISC, JUR, OPS, COM, ADM). Não é CRUD dinâmico. Pode ser tornado configurável no futuro.

### 3. **Assessment Fase 1/2 Existente**
O sistema atual tem Assessment Fase 1 (dados da empresa) e Fase 2 (perguntas personalizadas). Esses devem ser **refatorados** para:
- **Assessment Fase 1** → **Questionário Corporativo**
- **Assessment Fase 2** → **Questionários por Ramo** (múltiplos)

### 4. **Plano de Ação Existente**
O sistema atual tem um plano de ação único. Deve ser **refatorado** para:
- **Plano de Ação** → **Plano Corporativo** + **Planos por Ramo** (múltiplos)

---

**Documento validado para desenvolvimento.**  
**Alinhado com:** PRD v2.0 + Código atual do projeto  
**Data:** 31/01/2026
