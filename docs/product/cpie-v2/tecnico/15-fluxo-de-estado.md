# CPIE v2 — Fluxo de Estado (Frontend)

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `client/src/pages/NovoProjeto.tsx`

---

## 1. Estados Principais

O CPIE v2 no frontend é gerenciado por uma máquina de estados implícita composta pelos seguintes `useState`:

| State | Tipo | Valor inicial | Descrição |
|---|---|---|---|
| `cpieV2Gate` | `CpieV2GateResult \| null` | `null` | Resultado da última análise |
| `cpieOverrideMode` | `boolean` | `false` | Usuário está no fluxo de override |
| `cpieOverrideJustification` | `string` | `""` | Texto da justificativa de override |
| `showConflictReview` | `boolean` | `false` | Painel de revisão MEDIUM visível |
| `mediumAcknowledgedByUser` | `boolean` | `false` | Usuário confirmou ciência dos conflitos MEDIUM |
| `alreadyApproved` | `boolean` | `false` | Análise já aprovada (evita re-análise) |

---

## 2. Diagrama de Transições

```
[INICIAL]
    │
    │ Usuário clica "Avançar"
    ▼
[ANALISANDO]  ← analyzePreview em execução
    │
    ├─ hard_block ──────────────────────────────► [HARD_BLOCK]
    │                                                  │
    │                                                  │ Usuário edita formulário
    │                                                  ▼
    │                                             [INICIAL]
    │
    ├─ soft_block ──────────────────────────────► [SOFT_BLOCK]
    │                                                  │
    │                                            ┌─────┴──────┐
    │                                            │            │
    │                                     "Justificar"  "Cancelar"
    │                                            │            │
    │                                            ▼            ▼
    │                                     [OVERRIDE]     [INICIAL]
    │                                            │
    │                                     Justificativa ≥ 50 chars
    │                                     + clica "Justificar e continuar"
    │                                            │
    │                                            ▼
    │                                     [APROVADO_COM_OVERRIDE]
    │                                            │
    │                                            │ createProject → analyze → overrideSoftBlock
    │                                            ▼
    │                                     [MODAL_CNAE]
    │
    ├─ canProceed=true + medium ────────────────► [CONFLICT_REVIEW]
    │                                                  │
    │                                            ┌─────┴──────────┐
    │                                            │                │
    │                                     "Estou ciente"    "Corrigir perfil"
    │                                            │                │
    │                                            ▼                ▼
    │                                     [APROVADO_MEDIUM]  [INICIAL]
    │                                            │
    │                                            │ createProject → analyze → acknowledgeMedium
    │                                            ▼
    │                                     [MODAL_CNAE]
    │
    └─ canProceed=true + limpo ─────────────────► [APROVADO_LIMPO]
                                                       │
                                                       │ createProject → analyze
                                                       ▼
                                                 [MODAL_CNAE]
```

---

## 3. Transições de Estado Detalhadas

### 3.1 INICIAL → ANALISANDO

**Gatilho:** `handleSubmit()` chamado  
**Condição:** `!alreadyApproved`  
**Ação:** `analyzePreviewInline.mutate(formData)`  
**Estado resultante:** loading indicator ativo

### 3.2 ANALISANDO → HARD_BLOCK

**Gatilho:** `analyzePreviewInline.onSuccess`  
**Condição:** `result.canProceed === false && result.blockType === "hard_block"`  
**Ação:** `setCpieV2Gate(result)`  
**Estado resultante:** banner vermelho, botão "Avançar" desabilitado

### 3.3 ANALISANDO → SOFT_BLOCK

**Gatilho:** `analyzePreviewInline.onSuccess`  
**Condição:** `result.canProceed === false && result.blockType === "soft_block_with_override"`  
**Ação:** `setCpieV2Gate(result)`  
**Estado resultante:** banner amarelo, link "Justificar e continuar →"

### 3.4 ANALISANDO → CONFLICT_REVIEW

**Gatilho:** `analyzePreviewInline.onSuccess`  
**Condição:** `result.canProceed === true && result.mediumCount > 0`  
**Ação:** `setCpieV2Gate(result)`, `setShowConflictReview(true)`  
**Estado resultante:** painel de revisão MEDIUM visível

### 3.5 ANALISANDO → APROVADO_LIMPO

**Gatilho:** `analyzePreviewInline.onSuccess`  
**Condição:** `result.canProceed === true && result.mediumCount === 0`  
**Ação:** `setCpieV2Gate(result)`, `setAlreadyApproved(true)`, `createProject.mutate(...)`  
**Estado resultante:** banner verde, modal CNAE abre automaticamente

### 3.6 SOFT_BLOCK → OVERRIDE

**Gatilho:** Usuário clica "Justificar e continuar →"  
**Ação:** `setCpieOverrideMode(true)`  
**Estado resultante:** textarea de justificativa visível

### 3.7 OVERRIDE → APROVADO_COM_OVERRIDE

**Gatilho:** Usuário clica "Justificar e continuar" com justificativa ≥ 50 chars  
**Ação:** `setAlreadyApproved(true)`, `createProject.mutate(...)`  
**Estado resultante:** projeto criado, analyze + overrideSoftBlock chamados em sequência

### 3.8 CONFLICT_REVIEW → APROVADO_MEDIUM

**Gatilho:** Usuário clica "Estou ciente, prosseguir"  
**Ação:** `setMediumAcknowledgedByUser(true)`, `setAlreadyApproved(true)`, `createProject.mutate(...)`  
**Estado resultante:** projeto criado, analyze + acknowledgeMedium chamados em sequência

### 3.9 Qualquer estado → INICIAL (reset)

**Gatilho:** Usuário edita qualquer campo do formulário  
**Ação:**
```typescript
setCpieV2Gate(null);
setCpieOverrideMode(false);
setCpieOverrideJustification("");
setShowConflictReview(false);
setMediumAcknowledgedByUser(false);
setAlreadyApproved(false);
```

---

## 4. Sequência de Chamadas Backend

### 4.1 Fluxo limpo (sem conflitos)

```
analyzePreview → createProject → analyze → extractCnaes → [modal CNAE]
```

### 4.2 Fluxo com override (soft_block)

```
analyzePreview → createProject → analyze → overrideSoftBlock → extractCnaes → [modal CNAE]
```

### 4.3 Fluxo com aceite MEDIUM

```
analyzePreview → createProject → analyze → acknowledgeMediumConflicts → extractCnaes → [modal CNAE]
```

### 4.4 Hard block

```
analyzePreview → [bloqueio — nenhuma chamada adicional]
```

---

## 5. Invariantes do Sistema

As seguintes invariantes devem ser verdadeiras em qualquer momento:

1. `alreadyApproved === true` implica `cpieV2Gate !== null`
2. `cpieOverrideMode === true` implica `cpieV2Gate?.blockType === "soft_block_with_override"`
3. `showConflictReview === true` implica `cpieV2Gate?.canProceed === true && cpieV2Gate?.mediumCount > 0`
4. `mediumAcknowledgedByUser === true` implica `showConflictReview` foi `true` em algum momento
5. Se `cpieV2Gate === null`, todos os outros estados são `false`/`""`
