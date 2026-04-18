# Auditoria de Reconciliação Pós-v2.2
## Preservação do Motor CNAE e Alinhamento da Baseline

**Data:** 20/03/2026  
**Autoridade:** Product Owner Uires Tapajós  
**Modo:** STRICT MODE — Auditoria de Conformidade Arquitetural  
**Status:** VALIDATION

---

## 1. Resumo Executivo

A sprint v2.2 entregou o **ConsistencyEngine** e o **DiagnosticoStepper** corretamente. O motor de CNAE pré-existente (`cnae-rag.ts`, `cnae-embeddings.ts`, `fluxoV3Router`) **foi preservado integralmente** — nenhum arquivo foi removido ou substituído. Os 3 questionários v2.1 também foram preservados. A sugestão de "implementar descoberta automática via LLM" no status report foi um **erro de comunicação**: o motor já existe e está funcional. A máquina de estados do `DiagnosticoStepper` está **parcialmente alinhada** com a baseline — os estados `consistencia` e `cnaes_descoberta/confirmacao` existem no stepper, mas **não foram adicionados ao enum de status do banco** (`drizzle/schema.ts`), que ainda não inclui `consistencia` nem `cnaes_confirmadas`.

---

## 2. Tabela de Conformidade

| Item | Classificação | Evidência |
|---|---|---|
| Motor CNAE (`cnae-rag.ts`) | **PRESERVADO** | Arquivo intacto em `server/cnae-rag.ts` (1332 subclasses IBGE) |
| Motor CNAE Embeddings (`cnae-embeddings.ts`) | **PRESERVADO** | Arquivo intacto em `server/cnae-embeddings.ts` (busca semântica vetorial) |
| Procedures `discoverCnaes`, `refineCnaes`, `confirmCnaes` | **PRESERVADO** | `server/routers-fluxo-v3.ts` linhas 108, 203, 265 — registrado no `appRouter` como `fluxoV3` |
| Questionário Corporativo V2 | **PRESERVADO** | `client/src/pages/QuestionarioCorporativoV2.tsx` (394 linhas) |
| Questionário Operacional | **PRESERVADO** | `client/src/pages/QuestionarioOperacional.tsx` (423 linhas) |
| Questionário por CNAE | **PRESERVADO** | `client/src/pages/QuestionarioCNAE.tsx` (411 linhas) |
| ConsistencyEngine (v2.2) | **ADICIONADO CORRETAMENTE** | `server/consistencyEngine.ts`, `server/routers/consistencyRouter.ts`, tabela `consistency_checks` |
| ConsistencyGate (v2.2) | **ADICIONADO CORRETAMENTE** | `client/src/pages/ConsistencyGate.tsx` com gate bloqueante e aceite de risco |
| DiagnosticoStepper (v2.2) | **PARCIALMENTE ALINHADO** | Máquina de estados no frontend correto, mas estados `consistencia` e `cnaes_confirmadas` ausentes no enum do banco |
| Enum de status do banco | **PARCIALMENTE ALINHADO** | `drizzle/schema.ts` linha 35: enum não inclui `consistencia` nem `cnaes_confirmadas` |
| Briefing (3 camadas) | **PRESERVADO** | `BriefingV3.tsx` consome `cnaeCode`, `cnaeDescription` — integra camada CNAE |
| Matriz de Riscos | **PRESERVADO** | `MatrizesV3.tsx` e `routers.ts` com `matriz_riscos` no enum |
| Plano de Ação | **PRESERVADO** | `PlanoAcaoV3.tsx` e `routers.ts` com `plano_acao` no enum |

---

## 3. Blocos de Auditoria

### BLOCO 1 — Motor CNAE

**Classificação: PRESERVADO**

Evidências diretas:

- `server/cnae-rag.ts` — RAG com dicionário de sinônimos e tabela IBGE (1332 subclasses). **Intacto.**
- `server/cnae-embeddings.ts` — Busca semântica via OpenAI `text-embedding-3-small`. **Intacto.**
- `server/cnae-table.ts` e `shared/cnae-table.ts` — Tabela oficial CNAE IBGE. **Intactos.**
- `server/routers-fluxo-v3.ts` linha 108: `discoverCnaes` — extrai CNAEs via IA com RAG semântico. **Funcional.**
- `server/routers-fluxo-v3.ts` linha 203: `refineCnaes` — refina com feedback do usuário. **Funcional.**
- `server/routers-fluxo-v3.ts` linha 265: `confirmCnaes` — confirma e persiste. **Funcional.**
- `server/routers.ts` linha 52 e 87: `fluxoV3Router` registrado no `appRouter`. **Ativo.**
- `client/src/pages/FormularioProjeto.tsx` linha 47: exibe `confirmedCnaes` com confidence e descrição. **Funcional.**

**Conclusão:** A sugestão de "implementar descoberta automática via LLM" no status report foi **incorreta**. O motor já existe, é maduro (RAG + embeddings vetoriais + refinamento iterativo + confirmação manual) e está ativo. Não há necessidade de reimplementação.

---

### BLOCO 2 — Fluxo v2.1 / v2.2

**Classificação: PARCIALMENTE ALINHADO**

O que está correto:

- Os 3 questionários v2.1 (`QuestionarioCorporativoV2`, `QuestionarioOperacional`, `QuestionarioCNAE`) estão preservados e com rotas ativas no `App.tsx` (linhas 110–112).
- O `ConsistencyGate` foi inserido no ponto correto — antes do diagnóstico, com gate obrigatório.
- O `DiagnosticoStepper` modela corretamente a sequência: `perfil → consistencia → cnaes_descoberta → cnaes_confirmacao → diagnostico_corporativo → diagnostico_operacional → diagnostico_cnae → briefing → riscos → plano → dashboard`.
- As rotas `cnaes_descoberta` e `cnaes_confirmacao` no Stepper apontam para `/projetos/:id/formulario` — que é onde o motor de CNAE já vive (`FormularioProjeto.tsx`).

O que está parcialmente alinhado:

- O **enum de status do banco** (`drizzle/schema.ts` linha 35) não inclui os estados `consistencia` e `cnaes_confirmadas`. A máquina de estados do Stepper existe apenas no frontend — não há persistência de qual etapa o projeto está no banco para os novos estados v2.2.
- O `ConsistencyGate` não redireciona automaticamente para o Stepper após aprovação — o fluxo de navegação pós-gate não está integrado.
- A máquina de estados do `routers.ts` (linha 175) ainda usa os estados antigos (`diagnostico_corporativo`, `diagnostico_operacional`, `diagnostico_cnae`) sem incluir `consistencia` antes deles.

---

### BLOCO 3 — Regressões

| Funcionalidade | Status | Evidência |
|---|---|---|
| Descoberta de CNAEs | **SEM REGRESSÃO** | `discoverCnaes` em `routers-fluxo-v3.ts` intacto e ativo |
| Refinamento de CNAEs | **SEM REGRESSÃO** | `refineCnaes` em `routers-fluxo-v3.ts` intacto e ativo |
| Confirmação de CNAEs | **SEM REGRESSÃO** | `confirmCnaes` em `routers-fluxo-v3.ts` intacto e ativo |
| Inclusão manual de CNAE | **SEM REGRESSÃO** | `FormularioProjeto.tsx` preservado com UI de CNAEs confirmados |
| Exclusão de CNAE da lista | **SEM REGRESSÃO** | `FormularioProjeto.tsx` preservado |
| Questionário Corporativo | **SEM REGRESSÃO** | `QuestionarioCorporativoV2.tsx` (394 linhas) intacto |
| Questionário Operacional | **SEM REGRESSÃO** | `QuestionarioOperacional.tsx` (423 linhas) intacto |
| Questionário por CNAE | **SEM REGRESSÃO** | `QuestionarioCNAE.tsx` (411 linhas) intacto |
| Briefing | **SEM REGRESSÃO** | `BriefingV3.tsx` e procedures `briefing.*` intactos |
| Matriz de Riscos | **SEM REGRESSÃO** | `MatrizesV3.tsx` e procedures intactos |
| Plano de Ação | **SEM REGRESSÃO** | `PlanoAcaoV3.tsx` e procedures intactos |

**Conclusão de regressões:** Nenhuma regressão funcional identificada. Todos os componentes pré-existentes estão intactos.

---

### BLOCO 4 — Decisão Arquitetural

**1. O próximo passo correto é:**

**B. Integrar Consistency → Gap → Risk** — com um ajuste adicional obrigatório:

Antes da integração, é necessário corrigir o alinhamento parcial identificado:

- Adicionar `consistencia` e `cnaes_confirmadas` ao enum de status do banco (`drizzle/schema.ts`) e executar `db:push`.
- Atualizar a máquina de estados do `routers.ts` para incluir a transição `rascunho → consistencia → cnaes_confirmadas → diagnostico_corporativo`.
- Conectar o `ConsistencyGate` ao `DiagnosticoStepper` (navegação pós-gate).

**2. A sugestão "Tela de CNAEs (FASE 3): implementar descoberta automática via LLM" deve ser:**

**DESCARTADA** — O motor já existe e é maduro. A FASE 3 correta é:

> **REFORMULADA para:** "Integrar o motor CNAE existente (`fluxoV3.discoverCnaes`) ao `DiagnosticoStepper`, garantindo que as etapas `cnaes_descoberta` e `cnaes_confirmacao` do Stepper chamem as procedures já existentes e persistam o estado no banco."

---

## 4. Recomendação Final

### O que foi preservado corretamente

- Motor CNAE completo (RAG + embeddings + refinamento + confirmação)
- 3 questionários v2.1 (corporativo, operacional, CNAE)
- Briefing, matriz de riscos e plano de ação
- ConsistencyEngine e ConsistencyGate (adicionados corretamente)

### O que foi alterado indevidamente

- Nada foi alterado indevidamente. Todos os componentes pré-existentes estão intactos.

### O que deve ser corrigido antes da próxima sprint

1. **Enum do banco** — adicionar `consistencia` e `cnaes_confirmadas` ao enum de status do projeto.
2. **Máquina de estados do servidor** — incluir transições `rascunho → consistencia → cnaes_confirmadas → diagnostico_corporativo` no `routers.ts`.
3. **Navegação pós-gate** — `ConsistencyGate` deve redirecionar para o `DiagnosticoStepper` após aprovação/aceite de risco.
4. **Persistência do Stepper** — salvar `current_step` no banco para que o usuário retome onde parou.

### Próxima sprint recomendada

**TASK v2.3 — CONSISTENCY→DIAGNOSTIC INTEGRATION (Alinhamento de Estado + Navegação)**

Escopo:
1. Corrigir enum do banco (+ migração `db:push`)
2. Atualizar máquina de estados do servidor
3. Conectar `ConsistencyGate` → `DiagnosticoStepper` (navegação automática)
4. Persistir `current_step` no banco (campo na tabela `projects`)
5. Integrar `DiagnosticoStepper` → `GapDiagnostic` → `RiskDashboard` (ciclo completo)

**NÃO implementar:** CNAE discovery via LLM (já existe e está funcional).

---

## 5. Status

**Status: VALIDATION**

Auditoria concluída com base em evidências diretas do código. Nenhuma suposição foi feita sem evidência.
