# 📋 NOVOS REQUISITOS DO MVP - IA SOLARIS
## Questionários e Planos de Ação por Ramo de Atividade

**Data:** 31 de Janeiro de 2026  
**Fonte:** Reunião com Dr. José Rodrigues (Advogado Tributarista Sênior)  
**Status:** Aguardando Validação do Cliente

---

## 🔹 Visão Geral da Mudança Estrutural

| Dimensão | Situação Anterior (INCORRETA) | Nova Diretriz (CORRETA) |
|----------|-------------------------------|-------------------------|
| **Lógica do Questionário** | Questionário único genérico | Dois níveis de questionário |
| **Foco** | Empresa "genérica" | Empresa + Ramo de atividade |
| **Plano de ação** | Único | Plano corporativo + plano por ramo |
| **Destinatários das tarefas** | Não categorizado | TI, Contábil, Jurídico, Fiscal, Operações, Comercial |

---

## 🧩 1. Questionário Corporativo (Obrigatório)

| Requisito | Descrição |
|-----------|-----------|
| **Escopo** | Perguntas estruturais da empresa |
| **Aplicação** | Todas as empresas, independente do ramo |
| **Exemplos de temas** | ERP, emissão de NF-e, contratos, governança, equipe interna |
| **Resultado** | Plano de Ação Corporativo |
| **Relação com ramo** | Base comum para todos os ramos da empresa |

---

## 🧩 2. Questionário por Ramo de Atividade (Obrigatório)

| Requisito | Descrição |
|-----------|-----------|
| **Escopo** | Perguntas específicas por atividade econômica |
| **Vínculo** | Atrelado a 1 ou mais ramos por empresa |
| **Exemplos de ramos** | Comércio varejista, Indústria, Agronegócio, Serviços, Saúde, Imobiliário |
| **Personalização** | Cada ramo tem questionário próprio |
| **Resultado** | Plano de Ação Específico por Ramo |

### 📌 Regra Importante

Uma empresa pode ter:
- **1 questionário corporativo**
- **N questionários por ramo de atividade**

---

## 🛠️ 3. Geração de Planos de Ação (IA Generativa)

| Item | Regra |
|------|-------|
| **Origem** | IA gera planos com base nas respostas |
| **Separação** | Plano corporativo ≠ plano por ramo |
| **Editável** | Usuário pode editar, incluir ou excluir tarefas |
| **Prompt customizável** | Campo "PROMPT" altera a lógica da IA |
| **Persistência** | Planos ficam salvos por empresa e por ramo |

---

## 🧱 4. Categorização Obrigatória das Tarefas

Cada tarefa DEVE conter metadados obrigatórios:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| **Categoria** | ✅ | Corporativo ou Ramo |
| **Ramo** | ⚠️ | Obrigatório se for plano por ramo |
| **Área Responsável** | ✅ | TI, Contábil, Jurídico, Fiscal, Operações, Comercial |
| **Tipo** | ✅ | Estratégica / Operacional / Compliance |
| **Prioridade** | ✅ | Alta / Média / Baixa |
| **Dependência** | ❌ | Se depende de outra tarefa |
| **Status** | ✅ | Sugerido / Em execução / Concluído |

---

## 🧑‍💼 5. Áreas Responsáveis (Enumeração Inicial)

| Código | Área |
|--------|------|
| **TI** | Tecnologia da Informação |
| **CONT** | Contabilidade |
| **FISC** | Fiscal / Tributário |
| **JUR** | Jurídico |
| **OPS** | Operações |
| **COM** | Comercial |
| **ADM** | Administrativo / Governança |

📌 **Essa enumeração deve ser configurável no futuro.**

---

## 🔁 6. Fluxo de Uso (Resumo Funcional)

1. **Cadastro da empresa**
2. **Preenchimento do Questionário Corporativo**
3. **Seleção do(s) ramo(s) de atividade**
4. **Preenchimento de questionário por ramo**
5. **IA gera:**
   - Plano de ação corporativo
   - Plano(s) de ação por ramo
6. **Usuário edita tarefas**
7. **Usuário ajusta prompt (opcional)**
8. **IA recalcula planos (on-demand)**

---

## ⚠️ 7. Impactos Técnicos (para DEV)

| Impacto | Observação |
|---------|------------|
| **Modelo de dados** | Relação empresa → ramos → questionários → planos |
| **IA** | Prompt precisa receber contexto corporativo + contexto do ramo |
| **UX** | Interface deve deixar claro o que é corporativo x ramo |
| **Auditoria** | Cada plano precisa de rastreabilidade |
| **Escalabilidade** | Fácil inclusão de novos ramos |

---

## 📊 8. Tabela Consolidada de Funcionalidades

| # | Funcionalidade | Descrição Detalhada | Impacto no MVP Atual | Prioridade | Estimativa |
|---|----------------|---------------------|----------------------|------------|------------|
| **1** | **Questionário Corporativo** | Criar questionário único e obrigatório para aspectos gerais da empresa (dados cadastrais, estrutura organizacional, sistemas ERP, governança, equipe interna) | 🔴 **ALTO** - Requer nova tabela `corporateAssessment` + nova página no frontend | **CRÍTICA** | 5-8 dias |
| **2** | **Cadastro de Ramos de Atividade** | Tabela mestra de ramos (Comércio, Indústria, Serviços, Saúde, Agronegócio, Imobiliário, etc.) com CRUD admin | 🟡 **MÉDIO** - Nova tabela `activityBranches` + página admin | **ALTA** | 2-3 dias |
| **3** | **Seleção de Ramos no Projeto** | Ao criar projeto, cliente seleciona 1 ou N ramos de atividade que possui | 🟡 **MÉDIO** - Relacionamento N:N (projects ↔ activityBranches) + ajustar formulário | **CRÍTICA** | 2-3 dias |
| **4** | **Questionários por Ramo** | Cada ramo selecionado gera questionário específico (ex: Indústria tem perguntas sobre produção, Comércio sobre vendas) | 🔴 **ALTO** - Requer tabela `branchAssessments` + lógica de geração por ramo | **CRÍTICA** | 5-8 dias |
| **5** | **Plano de Ação Corporativo** | Gerar plano baseado apenas no questionário corporativo (tarefas transversais) | 🟡 **MÉDIO** - Adaptar lógica de geração existente + adicionar campo `category: 'corporate'` | **ALTA** | 3-4 dias |
| **6** | **Planos de Ação por Ramo** | Gerar um plano específico para cada ramo de atividade respondido | 🔴 **ALTO** - Requer múltiplos planos por projeto + relacionamento com ramo | **CRÍTICA** | 5-7 dias |
| **7** | **Campo "Área Responsável"** | Adicionar campo obrigatório em cada tarefa: TI, Contábil, Jurídico, Fiscal, Operações, Comercial, ADM | 🟡 **MÉDIO** - Adicionar campo `responsibleArea` (enum) + ajustar prompt da IA | **CRÍTICA** | 2-3 dias |
| **8** | **Campo "Tipo de Tarefa"** | Categorizar tarefas como: Estratégica, Operacional, Compliance | 🟢 **BAIXO** - Adicionar campo `taskType` (enum) | **MÉDIA** | 1 dia |
| **9** | **Campo "Status da Tarefa"** | Adicionar status: Sugerido, Em execução, Concluído | 🟢 **BAIXO** - Adicionar campo `status` (enum) + atualização manual | **ALTA** | 1-2 dias |
| **10** | **Campo "Dependência"** | Permitir marcar se tarefa depende de outra (opcional) | 🟢 **BAIXO** - Campo opcional `dependsOn` (foreign key) | **BAIXA** | 1 dia |
| **11** | **Filtro por Área Responsável** | Permitir filtrar tarefas do plano por departamento (TI, Contábil, etc.) | 🟢 **BAIXO** - Feature de UI apenas (filtro dropdown) | **MÉDIA** | 1 dia |
| **12** | **Filtro por Tipo de Plano** | Permitir visualizar separadamente: Plano Corporativo vs. Planos por Ramo | 🟡 **MÉDIO** - UI com tabs ou filtro para separar visualização | **ALTA** | 2 dias |
| **13** | **Edição de Prompt Corporativo** | Campo editável para ajustar como IA gera plano corporativo | 🟢 **BAIXO** - Campo `corporatePrompt` na tabela projects | **MÉDIA** | 1 dia |
| **14** | **Edição de Prompt por Ramo** | Campo editável para ajustar como IA gera plano de cada ramo | 🟢 **BAIXO** - Campo `branchPrompt` na tabela branchAssessments | **MÉDIA** | 1 dia |
| **15** | **Regeneração de Planos** | Botão para recalcular plano (corporativo ou por ramo) após editar prompt | 🟢 **BAIXO** - Reutilizar lógica existente de regeneração | **MÉDIA** | 1 dia |
| **16** | **Histórico de Versões** | Manter histórico de versões de planos gerados (já existe para Matriz de Riscos) | 🟡 **MÉDIO** - Adaptar sistema existente para planos corporativos e por ramo | **BAIXA** | 3-4 dias |
| **17** | **Dashboard Separado** | Exibir métricas separadas: tarefas corporativas vs. por ramo | 🟡 **MÉDIO** - Ajustar dashboard existente com filtros | **BAIXA** | 2-3 dias |
| **18** | **Ajuste do Briefing** | Briefing deve capturar ramos de atividade selecionados | 🟢 **BAIXO** - Adicionar campo `selectedBranches` no briefing | **ALTA** | 1 dia |

---

## 🎯 Priorização Sugerida (Fases de Implementação)

### **FASE 1 - FUNDAÇÃO (Crítico - 2 semanas)**
- [ ] #2 - Cadastro de Ramos de Atividade
- [ ] #3 - Seleção de Ramos no Projeto
- [ ] #1 - Questionário Corporativo
- [ ] #7 - Campo "Área Responsável"

### **FASE 2 - QUESTIONÁRIOS E PLANOS (Crítico - 2-3 semanas)**
- [ ] #4 - Questionários por Ramo
- [ ] #5 - Plano de Ação Corporativo
- [ ] #6 - Planos de Ação por Ramo
- [ ] #12 - Filtro por Tipo de Plano

### **FASE 3 - REFINAMENTO (Alta - 1 semana)**
- [ ] #8 - Campo "Tipo de Tarefa"
- [ ] #9 - Campo "Status da Tarefa"
- [ ] #11 - Filtro por Área Responsável
- [ ] #18 - Ajuste do Briefing

### **FASE 4 - MELHORIAS (Média/Baixa - 1-2 semanas)**
- [ ] #13 - Edição de Prompt Corporativo
- [ ] #14 - Edição de Prompt por Ramo
- [ ] #15 - Regeneração de Planos
- [ ] #10 - Campo "Dependência"
- [ ] #16 - Histórico de Versões
- [ ] #17 - Dashboard Separado

---

## ✅ Critérios de Sucesso do MVP

1. ✅ Usuário entende claramente o que é corporativo x ramo
2. ✅ Planos de ação são percebidos como acionáveis
3. ✅ Advogado / contador reconhece aderência jurídica
4. ✅ Base pronta para escalar novos ramos
5. ✅ Cada tarefa tem área responsável definida
6. ✅ Sistema suporta múltiplos ramos por empresa

---

## ⚠️ Observação Final

Este PRD reflete uma **decisão jurídica estrutural** e deve ser tratado como **fundação do produto**, não como ajuste cosmético.

Qualquer implementação que misture diagnóstico corporativo com ramo de atividade compromete a confiabilidade do sistema.

---

**Documento criado por:** Manus AI  
**Revisão necessária:** Cliente (Uires Tapajós) + Dr. José Rodrigues
