# CPIE v2 — Decision Contract

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado — Contrato Vinculante  
**Rastreabilidade:** `server/cpie-v2.ts` linhas 859–907 · `server/routers/cpieV2Router.ts` linhas 251–265

---

## Propósito

Este documento define o contrato formal de decisão do CPIE v2. Todas as regras aqui descritas são **vinculantes** — qualquer alteração requer revisão e aprovação do P.O. e deve ser refletida nos testes de regressão (doc 23).

---

## 1. Contrato de Bloqueio

### 1.1 Hard Block — Bloqueio Absoluto

**Condição de ativação (qualquer uma das seguintes):**

```
diagnosticConfidence < 15
OU
allConflicts.some(c => c.severity === "critical")
```

**Efeitos:**
- `canProceed = false`
- `blockType = "hard_block"`
- O botão "Avançar" fica desabilitado na UI
- O endpoint `overrideSoftBlock` retorna `FORBIDDEN` se chamado
- **Nenhuma justificativa pode desbloquear um hard_block**

**Mensagem padrão ao usuário:** "Contradições críticas impedem o avanço. Corrija o perfil antes de continuar."

### 1.2 Soft Block com Override — Bloqueio Superável

**Condição de ativação (todas as seguintes):**

```
diagnosticConfidence >= 15
E
allConflicts.some(c => c.severity === "high")
E
NÃO allConflicts.some(c => c.severity === "critical")
```

**Efeitos:**
- `canProceed = false`
- `blockType = "soft_block_with_override"`
- O painel de justificativa é exibido na UI
- O override é permitido mediante justificativa ≥ 50 caracteres

**Requisitos do override:**
- Justificativa mínima: 50 caracteres
- Registro obrigatório em `consistency_checks.acceptedRiskReason`
- Notificação automática ao owner da plataforma
- `consistency_checks.acceptedRisk = 1` gravado no banco

### 1.3 Aprovado com Ressalvas — Confirmação Obrigatória

**Condição de ativação:**

```
canProceed = true
E
allConflicts.some(c => c.severity === "medium" || c.severity === "low")
```

**Efeitos:**
- `canProceed = true`
- `blockType = undefined`
- O painel de revisão MEDIUM é exibido na UI
- O usuário deve confirmar ciência antes de avançar
- `consistency_checks.mediumAcknowledged = 1` gravado no banco após confirmação

### 1.4 Aprovado Limpo

**Condição de ativação:**

```
canProceed = true
E
allConflicts.length === 0
```

**Efeitos:**
- `canProceed = true`
- `blockType = undefined`
- Banner verde exibido na UI
- Avanço direto para CNAEs sem confirmação adicional

---

## 2. Contrato de Override

### 2.1 Condições para override ser aceito

O endpoint `overrideSoftBlock` aceita o override **somente se**:

```
check.blockType === "soft_block_with_override"
E
check.diagnosticConfidence >= 15
E
justification.length >= 50
```

### 2.2 Condições para override ser rejeitado

O endpoint retorna erro `FORBIDDEN` se:

```
check.blockType === "hard_block"
OU
check.diagnosticConfidence < 15
```

O endpoint retorna erro `BAD_REQUEST` se:

```
check.blockType !== "soft_block_with_override"
```

### 2.3 Dados gravados no override

```typescript
{
  acceptedRisk: 1,
  acceptedRiskAt: Date.now(),
  acceptedRiskBy: String(ctx.user.id),
  acceptedRiskReason: `[CPIE v2 Override] ${justification.slice(0, 450)} | Log: ${JSON.stringify(overrideLog)}`
}
```

O `overrideLog` inclui: timestamp, userId, userName, justificativa, checkId, projectId, `diagnosticConfidenceAtOverride`.

---

## 3. Contrato de Aceite MEDIUM

### 3.1 Condições para aceite MEDIUM ser aceito

O endpoint `acknowledgeMediumConflicts` aceita o aceite **somente se**:

```
check.overallLevel === "medium"
E
check.canProceed === true (via v2Data.canProceed)
```

### 3.2 Dados gravados no aceite MEDIUM

```typescript
{
  mediumAcknowledged: 1,
  updatedAt: Date.now()
}
```

---

## 4. Contrato de Scores

### 4.1 Invariantes dos scores

As seguintes invariantes **nunca podem ser violadas**:

```
0 ≤ completenessScore ≤ 100
0 ≤ consistencyScore ≤ 100
0 ≤ diagnosticConfidence ≤ 100
diagnosticConfidence = round(consistencyScore × completenessScore / 100)
consistencyScore ≤ deterministicVeto (quando deterministicVeto ≠ null)
consistencyScore ≤ effectiveAiVeto (quando effectiveAiVeto ≠ null)
```

### 4.2 Contrato de exibição na UI

| Score | Onde exibir | Onde NÃO exibir |
|---|---|---|
| `completenessScore` | Barra "Completude do formulário" | Como indicador de qualidade da análise |
| `consistencyScore` | Barra "Consistência interna" | Como confiança diagnóstica |
| `diagnosticConfidence` | Barra "Confiança diagnóstica" | Como completude |

Os três scores devem ser exibidos **separadamente** com rótulos distintos. Nunca exibir um único score agregado.

---

## 5. Contrato de Versão

### 5.1 Identificação de versão

Todas as análises CPIE v2 são identificadas por:

```typescript
analysisVersion: "cpie-v2.0"
```

Análises v1 têm `analysisVersion: "cpie-v1"` ou ausência do campo.

### 5.2 Retrocompatibilidade

O endpoint `getByProject` detecta automaticamente a versão e retorna o formato adequado. Projetos v1 continuam funcionando sem migração.

### 5.3 Critério de upgrade de versão

Qualquer mudança nas regras de bloqueio (thresholds, condições de hard/soft block) requer incremento de versão (`cpie-v2.1`, `cpie-v3.0`, etc.) e migração dos testes de regressão.

---

## 6. Contrato de Falha da IA

### 6.1 Comportamento em caso de falha da IA

Se a chamada à IA falhar (timeout, erro de API, resposta malformada), o sistema **não bloqueia silenciosamente**. Em vez disso:

```typescript
// Retorno em caso de falha da IA
{
  aiCoherenceScore: 0,
  aiVeto: 0,           // ← Veto zero = bloqueia tudo
  aiFindings: [{
    id: "AI-ERR",
    severity: "critical",
    title: "Falha na arbitragem IA",
    description: "O motor de arbitragem IA falhou. Por segurança, o avanço está bloqueado."
  }]
}
```

**Princípio:** falha da IA resulta em `hard_block`, não em aprovação silenciosa. Segurança por padrão.

### 6.2 Validação de sanidade pós-IA

Se a IA retornar `aiFindings` com `severity = "critical"` mas `aiVeto = null` ou `aiVeto > 20`, o sistema força:

```typescript
aiVeto = 20
aiBlockReason = "Veto forçado por validação de sanidade: findings críticos detectados sem veto aplicado."
```
