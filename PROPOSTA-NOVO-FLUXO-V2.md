# Proposta de Implementação — Novo Fluxo v2.0
## Plataforma de Compliance Tributária — Reforma Tributária

**Data:** 16/03/2026  
**Versão:** 1.0  
**Autor:** Manus AI (Implementador)  
**P.O.:** Solaris Empresa  
**Referência:** Diagrama `RIoProjectPrivacy-2026-02-12-181446.svg`

---

## 1. Análise do Novo Fluxo

### 1.1 Mapeamento Completo dos Nós

O diagrama apresenta **55 nós** organizados em 7 grupos funcionais distintos:

| Grupo | Nós | Descrição |
|---|---|---|
| **A. Entrada** | Início → Modo de uso | Ponto de entrada com bifurcação de modo |
| **B. Modo de Uso** | Modo temporário / Modo com histórico | Decisão de persistência de dados |
| **C. Briefing Inteligente** | Entrada simples → IA sugere ramos → Cliente confirma ramos | Coleta de dados com IA |
| **D. Gestão de Ramos** | Escolher ramo → Lista editável → Gerir ramos | CRUD de ramos por projeto |
| **E. Questionário por Ramo** | Gerar questionário → Sintético/Abrangente → Aprofundar? | Questionário adaptativo com IA |
| **F. Plano de Ação** | IA gera plano → Cliente edita/confirma → Aprovado | Geração e aprovação de planos |
| **G. Matriz de Riscos** | IA gera matriz → Cliente ajusta → Ramo concluído | Geração e ajuste de riscos |
| **H. Consolidação** | Consolidar resultado → Usar como gestão? | Decisão de uso pós-conclusão |
| **I. Saída** | Quadro de acompanhamento / Exportar CSV / Fim | Destino final do resultado |

### 1.2 Novidades Críticas vs. Sistema Atual

O novo fluxo introduz **5 conceitos que não existem** no sistema atual:

**1. Modo Temporário (Sem Registro)**
O fluxo começa com uma bifurcação fundamental: o usuário pode usar o sistema **sem criar conta ou salvar dados** ("Simular sem registro"). Isso é um conceito completamente novo — o sistema atual exige login e projeto criado para qualquer operação.

**2. Briefing com IA Sugerindo Ramos**
Atualmente o usuário cadastra ramos manualmente. No novo fluxo, o usuário fornece uma **entrada simples em linguagem natural** e a IA organiza, resume e **sugere automaticamente os ramos** de atividade. O usuário apenas confirma ou edita.

**3. Questionário Adaptativo (Sintético vs. Abrangente)**
O questionário atual é fixo. No novo fluxo, após gerar o questionário sintético (visão geral), o sistema pergunta **"Aprofundar?"** e, se sim, a IA gera perguntas extras para uma versão abrangente. Isso cria um questionário dinâmico e progressivo.

**4. Loop por Ramo com Controle Explícito**
O novo fluxo tem um **loop explícito** por ramo: após concluir um ramo (questionário → plano → matriz de riscos), o sistema pergunta "Há outros ramos?" e retorna ao início do ciclo. O sistema atual não tem esse controle de loop.

**5. Consolidação Final com Bifurcação de Uso**
Após todos os ramos, o sistema consolida tudo (resumo + planos + riscos) e pergunta **"Usar como gestão?"**. Se sim, abre o Quadro de Acompanhamento (Kanban com status, prazos, responsáveis). Se não, exporta CSV e encerra.

---

## 2. Análise de Impacto por Componente

### 2.1 Banco de Dados

| Tabela | Impacto | Ação Necessária |
|---|---|---|
| `projects` | **Alto** | Adicionar campo `mode` (temporario/historico) e `sessionToken` para modo temporário |
| `briefings` | **Alto** | Adicionar campo `rawInput` (texto livre do usuário) e `aiSuggestedBranches` (JSON) |
| `projectBranches` | **Médio** | Adicionar campo `status` (pendente/em_andamento/concluido) para controle do loop |
| `branchAssessments` | **Alto** | Adicionar campo `depth` (sintetico/abrangente) e `extraQuestions` (JSON gerado pela IA) |
| `branchActionPlans` | **Baixo** | Já existe — apenas ajustar fluxo de aprovação |
| `riskMatrix` | **Baixo** | Já existe — apenas ajustar fluxo de ajuste pelo cliente |
| **NOVA: `sessions`** | **Novo** | Tabela para modo temporário (sem usuário registrado) |
| **NOVA: `consolidations`** | **Novo** | Tabela para resultado consolidado (resumo + planos + riscos) |

### 2.2 Backend (tRPC Procedures)

| Router | Impacto | Ação Necessária |
|---|---|---|
| `routers-branches.ts` | **Alto** | Adicionar procedure `suggestBranches` (IA sugere baseado em texto livre) |
| `routers-assessments.ts` | **Alto** | Adicionar procedure `generateAdaptive` (sintético/abrangente com loop de perguntas extras) |
| `routers-action-plans.ts` | **Médio** | Ajustar procedure de aprovação para novo fluxo |
| **NOVO: `routers-sessions.ts`** | **Novo** | Gerenciar modo temporário (criar, ler, expirar sessões) |
| **NOVO: `routers-consolidation.ts`** | **Novo** | Consolidar resultado final e exportar CSV |

### 2.3 Frontend (Páginas)

| Página | Impacto | Ação Necessária |
|---|---|---|
| `NovoProjeto.tsx` | **Alto** | Adicionar tela de escolha de modo (temporário vs. histórico) |
| `Briefing.tsx` | **Alto** | Substituir formulário por entrada de texto livre + confirmação de ramos sugeridos pela IA |
| `QuestionariosPorRamo.tsx` | **Alto** | Adicionar modo adaptativo (sintético → abrangente) com controle de profundidade |
| `PlanoAcao.tsx` | **Médio** | Ajustar para loop por ramo com controle de progresso |
| `MatrizRiscos.tsx` | **Médio** | Ajustar para loop por ramo |
| **NOVA: `ModoTemporario.tsx`** | **Novo** | Fluxo completo sem login (simulação) |
| **NOVA: `ConsolidacaoFinal.tsx`** | **Novo** | Tela de consolidação + bifurcação (gestão vs. exportar) |

---

## 3. Proposta de Implementação em 4 Fases

### Fase 1 — Fundação: Modo de Uso e Briefing Inteligente
**Duração estimada:** 3 sprints  
**Prioridade:** P0 (bloqueante para as demais fases)

Esta fase estabelece a nova arquitetura de entrada do sistema. O objetivo é implementar a bifurcação de modo (temporário vs. histórico) e o novo briefing com IA sugerindo ramos automaticamente a partir de texto livre.

**Entregas:**
- Tela de escolha de modo na entrada do sistema
- Sessões temporárias (sem login) com token de sessão e expiração automática
- Briefing com campo de texto livre em linguagem natural
- Procedure `suggestBranches` — IA analisa o texto e sugere ramos com justificativa
- Tela de confirmação de ramos sugeridos (aceitar, editar, adicionar, remover)
- Migração de banco: campos `mode`, `sessionToken` em `projects`; tabela `sessions`

**Critério de aceite (P.O.):** Usuário consegue iniciar um fluxo sem login, digitar uma descrição da empresa em linguagem natural e receber sugestão de ramos da IA para confirmar.

---

### Fase 2 — Questionário Adaptativo por Ramo
**Duração estimada:** 3 sprints  
**Prioridade:** P0 (depende da Fase 1)

Esta fase substitui o questionário fixo por um questionário dinâmico e progressivo. O sistema gera primeiro uma versão sintética (visão geral) e, se o usuário quiser aprofundar, a IA gera perguntas extras para uma versão abrangente.

**Entregas:**
- Questionário sintético gerado pela IA (perguntas essenciais por ramo)
- Decisão "Aprofundar?" com opção de manter sintético ou ir para abrangente
- Procedure `generateExtraQuestions` — IA gera perguntas adicionais baseadas nas respostas do sintético
- Controle de progresso por ramo (pendente / em andamento / concluído)
- Salvar progresso parcial quando em modo com histórico
- Migração de banco: campo `depth` e `extraQuestions` em `branchAssessments`

**Critério de aceite (P.O.):** Usuário responde questionário sintético, decide aprofundar, recebe perguntas extras da IA e consegue salvar progresso parcial.

---

### Fase 3 — Loop por Ramo: Plano de Ação + Matriz de Riscos
**Duração estimada:** 2 sprints  
**Prioridade:** P1 (depende da Fase 2)

Esta fase implementa o loop explícito por ramo. Após o questionário, o sistema gera automaticamente o plano de ação e a matriz de riscos para aquele ramo. O usuário edita/confirma e o sistema pergunta se há outros ramos para processar.

**Entregas:**
- Geração automática de plano de ação por ramo após conclusão do questionário
- Tela de edição/confirmação do plano (inline, sem sair da página)
- Geração automática de matriz de riscos por ramo após aprovação do plano
- Tela de ajuste de riscos pelo cliente
- Controle de loop: "Há outros ramos?" com navegação para o próximo ramo pendente
- Indicador visual de progresso geral (X de Y ramos concluídos)

**Critério de aceite (P.O.):** Usuário conclui um ramo completo (questionário → plano → riscos), confirma e o sistema navega automaticamente para o próximo ramo pendente.

---

### Fase 4 — Consolidação Final e Saída
**Duração estimada:** 2 sprints  
**Prioridade:** P1 (depende da Fase 3)

Esta fase implementa a consolidação de todos os ramos em um resultado unificado e a bifurcação final: usar como gestão (Quadro Kanban) ou exportar CSV e encerrar.

**Entregas:**
- Tela de consolidação: resumo executivo + todos os planos + todas as matrizes de riscos
- IA gera resumo consolidado em linguagem natural
- Bifurcação "Usar como gestão?":
  - **Sim:** Abre Quadro de Acompanhamento com status, prazos e responsáveis (Kanban existente adaptado)
  - **Não:** Exporta CSV completo (planos + riscos + resumo) e encerra
- Exportação CSV estruturada (compatível com Excel)
- Tabela `consolidations` no banco de dados
- Para modo temporário: exportar antes de expirar sessão

**Critério de aceite (P.O.):** Após concluir todos os ramos, usuário vê consolidação completa, escolhe exportar CSV e recebe arquivo estruturado; ou escolhe gestão e é direcionado ao Quadro Kanban com tarefas pré-populadas.

---

## 4. Roadmap Visual

```
FASE 1 (Sprints V39-V41)     FASE 2 (Sprints V42-V44)     FASE 3 (Sprints V45-V46)     FASE 4 (Sprints V47-V48)
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│ Modo Temporário         │   │ Questionário Sintético   │   │ Plano de Ação por Ramo  │   │ Consolidação Final      │
│ Sessões sem Login       │──▶│ Questionário Abrangente  │──▶│ Matriz de Riscos/Ramo   │──▶│ Exportar CSV            │
│ Briefing com IA         │   │ Salvar Progresso Parcial │   │ Loop por Ramo           │   │ Quadro de Acompanhamento│
│ Sugestão de Ramos       │   │ Controle de Profundidade │   │ Indicador de Progresso  │   │ Resumo Executivo IA     │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
     P0 - BLOQUEANTE               P0 - BLOQUEANTE               P1 - ALTA                    P1 - ALTA
```

---

## 5. Resumo de Impacto Técnico

| Dimensão | Quantidade | Detalhe |
|---|---|---|
| **Novas tabelas** | 2 | `sessions`, `consolidations` |
| **Tabelas modificadas** | 4 | `projects`, `briefings`, `projectBranches`, `branchAssessments` |
| **Novos routers** | 2 | `routers-sessions.ts`, `routers-consolidation.ts` |
| **Routers modificados** | 3 | `routers-branches.ts`, `routers-assessments.ts`, `routers-action-plans.ts` |
| **Novas páginas** | 2 | `ModoTemporario.tsx`, `ConsolidacaoFinal.tsx` |
| **Páginas modificadas** | 5 | `NovoProjeto.tsx`, `Briefing.tsx`, `QuestionariosPorRamo.tsx`, `PlanoAcao.tsx`, `MatrizRiscos.tsx` |
| **Sprints estimados** | 10 | V39 a V48 |
| **Testes unitários** | ~50 | Novos testes por fase |

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Modo temporário com dados sensíveis | Média | Alto | Expiração automática de sessão (24h) + aviso explícito ao usuário |
| IA sugerindo ramos incorretos | Alta | Médio | Sempre permitir edição manual; sugestão é ponto de partida, não obrigatória |
| Loop por ramo com muitos ramos (>10) | Baixa | Médio | Indicador de progresso + opção de pausar e retomar |
| Compatibilidade do CSV exportado | Baixa | Baixo | Usar formato padrão (UTF-8 com BOM para Excel) |
| Migração de dados existentes | Média | Alto | Scripts de migração com rollback; testar em staging antes de produção |

---

## 7. Próximos Passos (Aguardando Aprovação do P.O.)

1. **Aprovação desta proposta** — P.O. revisa e aprova as 4 fases, critérios de aceite e roadmap
2. **Início da Fase 1** — Implementar modo temporário e briefing com IA (Sprint V39)
3. **Checkpoint de validação** — Ao final de cada fase, P.O. valida os critérios de aceite antes de avançar

---

*Documento gerado por Manus AI em 16/03/2026 — Aguardando aprovação do P.O. para início da implementação.*
