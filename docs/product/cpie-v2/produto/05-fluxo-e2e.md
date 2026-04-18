# CPIE v2 — Fluxo End-to-End

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `client/src/pages/NovoProjeto.tsx` · `server/routers/cpieV2Router.ts` · `server/cpie-v2.ts`

---

## 1. Visão Geral do Fluxo

O CPIE v2 opera em dois contextos distintos:

1. **Novo Projeto** — o `projectId` ainda não existe; usa `analyzePreview` (sem persistência)
2. **Projeto Existente** — o `projectId` já existe; usa `analyze` (com persistência)

---

## 2. Fluxo de Novo Projeto

### 2.1 Diagrama de Sequência

```
Usuário          Frontend (NovoProjeto)        Backend (cpieV2Router)      Motor (cpie-v2.ts)
   │                      │                            │                          │
   │ Preenche formulário   │                            │                          │
   │─────────────────────>│                            │                          │
   │                      │                            │                          │
   │ Clica "Avançar"      │                            │                          │
   │─────────────────────>│                            │                          │
   │                      │ analyzePreview(perfil)     │                          │
   │                      │───────────────────────────>│                          │
   │                      │                            │ runCpieAnalysisV2(input) │
   │                      │                            │─────────────────────────>│
   │                      │                            │                          │ E1: extractInferredProfile
   │                      │                            │                          │ E2: calcCompletenessScore
   │                      │                            │                          │ E3: buildConflictMatrix
   │                      │                            │                          │ E4: runAiArbitration
   │                      │                            │                          │ E5: calcFinalScores
   │                      │                            │<─────────────────────────│
   │                      │<───────────────────────────│                          │
   │                      │                            │                          │
   │                      │ [Decisão de roteamento]    │                          │
   │                      │                            │                          │
   │ [hard_block]         │                            │                          │
   │<─────────────────────│ Banner vermelho             │                          │
   │                      │ Botão desabilitado          │                          │
   │                      │                            │                          │
   │ [soft_block]         │                            │                          │
   │<─────────────────────│ Painel de justificativa    │                          │
   │ Digita justificativa │                            │                          │
   │─────────────────────>│                            │                          │
   │                      │                            │                          │
   │ [canProceed + MEDIUM]│                            │                          │
   │<─────────────────────│ Painel de revisão MEDIUM   │                          │
   │ Confirma ciência     │                            │                          │
   │─────────────────────>│                            │                          │
   │                      │                            │                          │
   │ [canProceed limpo]   │                            │                          │
   │<─────────────────────│ Banner verde               │                          │
   │                      │                            │                          │
   │ Clica "Avançar"      │                            │                          │
   │─────────────────────>│ createProject(dados)       │                          │
   │                      │───────────────────────────>│                          │
   │                      │<───────────────────────────│ { projectId }            │
   │                      │                            │                          │
   │                      │ analyze(projectId + perfil)│                          │
   │                      │───────────────────────────>│                          │
   │                      │<───────────────────────────│ { checkId, ... }         │
   │                      │                            │                          │
   │                      │ [se soft_block + justificativa]                       │
   │                      │ overrideSoftBlock(checkId) │                          │
   │                      │───────────────────────────>│                          │
   │                      │<───────────────────────────│ { overridden: true }     │
   │                      │                            │                          │
   │                      │ [se MEDIUM + acknowledged] │                          │
   │                      │ acknowledgeMediumConflicts │                          │
   │                      │───────────────────────────>│                          │
   │                      │<───────────────────────────│ { acknowledged: true }   │
   │                      │                            │                          │
   │                      │ fluxoV3.extractCnaes       │                          │
   │                      │───────────────────────────>│                          │
   │<─────────────────────│ Modal de CNAEs aberto      │                          │
```

### 2.2 Detalhamento das Etapas

**Etapa 1 — Preenchimento do formulário:**
O usuário preenche os 17 campos do perfil da empresa. A descrição livre é analisada em tempo real para feedback de qualidade (mínimo de caracteres, indicador de suficiência).

**Etapa 2 — Disparo do analyzePreview:**
Ao clicar em "Avançar", o frontend dispara `cpieV2.analyzePreview` com todos os campos do perfil. Esta chamada é **stateless** — não persiste nada no banco.

**Etapa 3 — Execução do motor (E1→E5):**
O motor executa as cinco etapas do pipeline em sequência. A etapa E4 (arbitragem IA) é a mais lenta (1–5 segundos). O frontend exibe um spinner durante a análise.

**Etapa 4 — Roteamento pela decisão:**
O frontend recebe o `CpieV2GateResult` e roteia para um dos quatro estados de UI (hard_block, soft_block, MEDIUM, limpo).

**Etapa 5 — Ação do usuário:**
O usuário toma a ação correspondente ao estado (corrige o perfil, digita justificativa, confirma ciência, ou avança diretamente).

**Etapa 6 — createProject:**
Após aprovação (com ou sem override/aceite), o frontend chama `createProject` para criar o projeto no banco.

**Etapa 7 — Persistência da análise:**
Imediatamente após `createProject.onSuccess`, o frontend chama `cpieV2.analyze` com o `projectId` real para persistir o resultado no banco.

**Etapa 8 — Override/Aceite (se necessário):**
Se houver override de soft_block, chama `overrideSoftBlock`. Se houver aceite de MEDIUM, chama `acknowledgeMediumConflicts`.

**Etapa 9 — Extração de CNAEs:**
Após todas as persistências, o frontend chama `fluxoV3.extractCnaes` e abre o modal de seleção de CNAEs.

---

## 3. Fluxo de Projeto Existente (Reanálise)

### 3.1 Diagrama simplificado

```
Usuário          PerfilEmpresaIntelligente     Backend (cpieV2Router)
   │                      │                            │
   │ Acessa projeto       │                            │
   │─────────────────────>│ getByProject(projectId)   │
   │                      │───────────────────────────>│
   │                      │<───────────────────────────│ último resultado
   │<─────────────────────│ Exibe ScorePanel + conflitos│
   │                      │                            │
   │ Clica "Reexecutar"   │                            │
   │─────────────────────>│ analyze(projectId + perfil)│
   │                      │───────────────────────────>│
   │                      │<───────────────────────────│ novo resultado
   │<─────────────────────│ Atualiza ScorePanel        │
```

### 3.2 Comportamento da reanálise

A reanálise substitui o resultado anterior no banco (novo `checkId`, novo registro em `consistency_checks`). O resultado anterior não é deletado — fica como histórico.

---

## 4. Estados de Transição do Frontend

```
[Formulário preenchido]
        │
        ▼ clica "Avançar"
[Analisando... (spinner)]
        │
        ├─ hard_block ──────────────────> [Banner vermelho] → [Corrigir perfil]
        │                                                            │
        │                                                            ▼
        │                                                    [Formulário editável]
        │
        ├─ soft_block_with_override ────> [Painel justificativa]
        │                                        │
        │                                        ├─ Cancelar ──> [Formulário editável]
        │                                        │
        │                                        └─ Justificar (≥50 chars) ──> [Avançar habilitado]
        │
        ├─ canProceed + MEDIUM ─────────> [Painel revisão MEDIUM]
        │                                        │
        │                                        ├─ Corrigir perfil ──> [Formulário editável]
        │                                        │
        │                                        └─ Estou ciente ──> [Avançar habilitado]
        │
        └─ canProceed limpo ────────────> [Banner verde] → [Avançar habilitado]
                                                                │
                                                                ▼
                                                    [createProject → analyze → Modal CNAEs]
```

---

## 5. Gestão de Estado no Frontend

### 5.1 States relevantes no NovoProjeto

| State | Tipo | Descrição |
|---|---|---|
| `cpieV2Gate` | `CpieV2GateResult \| null` | Resultado da última análise |
| `cpieOverrideMode` | `boolean` | Se o painel de justificativa está ativo |
| `cpieOverrideText` | `string` | Texto da justificativa |
| `showConflictReview` | `boolean` | Se o painel de revisão MEDIUM está ativo |
| `mediumAcknowledgedByUser` | `boolean` | Se o usuário confirmou ciência dos conflitos MEDIUM |
| `projectId` | `number \| null` | ID do projeto criado (após createProject) |

### 5.2 Regra de reset

Quando o usuário edita qualquer campo do formulário após uma análise, os seguintes states são resetados:

```typescript
setCpieV2Gate(null)
setCpieOverrideMode(false)
setCpieOverrideText("")
setShowConflictReview(false)
setMediumAcknowledgedByUser(false)
```

Isso garante que o usuário não possa avançar com uma análise baseada em dados desatualizados.

---

## 6. Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| `analyzePreview` falha (timeout/erro de rede) | Toast de erro, botão Avançar reabilitado |
| IA falha durante análise | Motor retorna `AI-ERR` com `hard_block` — usuário vê banner de erro técnico |
| `createProject` falha | Toast de erro, análise local mantida (usuário pode tentar novamente) |
| `analyze` falha após `createProject` | Projeto criado sem análise persistida — reanálise disponível na tela do projeto |
| `overrideSoftBlock` retorna FORBIDDEN | Toast "Hard block não pode ser ignorado" |
| `acknowledgeMediumConflicts` falha | Projeto avança para CNAEs (aceite é best-effort, não bloqueia o fluxo) |
