# CPIE v2 — Modelo Conceitual

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts` linhas 1–25, 762–908

---

## 1. Premissa Fundamental

O CPIE v2 parte de uma premissa diferente do CPIE v1:

> **v1:** "O perfil está completo?" → mede preenchimento de campos  
> **v2:** "O perfil é coerente com a realidade?" → mede consistência de dados

Um formulário pode estar 100% preenchido com dados contraditórios. O CPIE v2 detecta essas contradições antes que gerem diagnósticos tributários incorretos.

---

## 2. Os Três Scores Independentes

O CPIE v2 produz três scores que medem aspectos diferentes e **nunca devem ser somados ou misturados**.

### 2.1 `completenessScore` — Completude do Formulário

**Definição:** Percentual de campos preenchidos corretamente, de 0 a 100.

**Fórmula:**
```
completenessScore = (campos_válidos / 17) × 100
```

**Características:**
- Não é afetado por vetos
- Pode ser 100% mesmo com dados completamente inconsistentes
- Serve como multiplicador do `diagnosticConfidence`
- Um perfil com `completenessScore = 0` tem `diagnosticConfidence = 0` independentemente da consistência

**Exemplo:** empresa com todos os 17 campos preenchidos → `completenessScore = 100%`

### 2.2 `consistencyScore` — Coerência Interna

**Definição:** Medida da coerência interna dos dados declarados, de 0 a 100, sujeita a vetos.

**Fórmula base:**
```
rawScore = max(0, 100 − soma_das_penalizações)
consistencyScore = min(rawScore, deterministicVeto ?? 100, aiVeto ?? 100)
```

**Penalizações por severidade:**

| Severidade | Penalização |
|---|---|
| `critical` | −35 pontos |
| `high` | −20 pontos |
| `medium` | −10 pontos |
| `low` | −5 pontos |

**Características:**
- Sujeito a vetos (tetos numéricos que não podem ser ultrapassados)
- Um único conflito crítico pode zerar o score via veto ≤ 15
- Penalizações são acumulativas

**Exemplo:** 1 conflito `high` + 2 conflitos `medium` → penalização = 20 + 10 + 10 = 40 → `rawScore = 60`. Se `deterministicVeto = null` e `aiVeto = null` → `consistencyScore = 60`.

### 2.3 `diagnosticConfidence` — Confiança Diagnóstica Real

**Definição:** Medida da confiança real no diagnóstico tributário que será produzido a partir deste perfil.

**Fórmula:**
```
diagnosticConfidence = round(consistencyScore × completenessScore / 100)
```

**Características:**
- É o score que governa a decisão de bloqueio
- Combina qualidade dos dados (consistência) com quantidade de dados (completude)
- Um perfil consistente mas incompleto terá `diagnosticConfidence` baixo
- Um perfil completo mas inconsistente também terá `diagnosticConfidence` baixo

**Exemplo:** `consistencyScore = 60`, `completenessScore = 100` → `diagnosticConfidence = 60`  
**Exemplo:** `consistencyScore = 60`, `completenessScore = 50` → `diagnosticConfidence = 30`

---

## 3. Regras de Veto

Vetos são **tetos numéricos** aplicados ao `consistencyScore`. Eles existem para garantir que contradições graves não sejam mascaradas por alta completude.

### 3.1 `deterministicVeto`

Gerado pelas regras determinísticas (Camadas A, B e C do `buildConflictMatrix`). O valor é o mínimo entre todos os `consistencyVeto` dos conflitos detectados.

```typescript
deterministicVeto = Math.min(...conflitos.map(c => c.consistencyVeto))
```

**Valores possíveis por regra:**

| Regra | Conflito | `consistencyVeto` |
|---|---|---|
| A1 | Regime vs. faturamento | 15 |
| A2 | Porte vs. faturamento | 40 |
| A3 | MEI + multi-estado | 40 |
| A4 | MEI + importação/exportação | 15 |
| B1 | Faturamento descrito >4x declarado | 30 |
| B1b | Faturamento descrito >2x declarado | 45 |
| B2 (high) | Operação incompatível (indústria/serviços) | 40 |
| B2 (medium) | Operação incompatível (outros) | 55 |
| B3 | B2G improvável para o setor | 55 |
| B4 | Porte inferido vs. declarado (≥2 categorias) | 40 |
| C1 | MEI + manufatura | 15 |
| C2 | MEI + múltiplos canais | 35 |
| C3 | Simples Nacional + B2G + faturamento alto | 35 |

### 3.2 `aiVeto`

Gerado pela arbitragem IA (E4). A IA pode aplicar veto quando detecta contradições compostas que as regras determinísticas não cobrem.

**Tabela de veto da IA (do prompt do árbitro):**

| Situação | `aiVeto` máximo |
|---|---|
| Contradição composta crítica (empresa não pode existir) | ≤ 15 |
| Múltiplos conflitos high sem explicação plausível | ≤ 30 |
| Faturamento descrito vs. declarado > 300% | ≤ 30 |
| Tipo de operação claramente incompatível com setor | ≤ 40 |
| Sem contradições significativas | `null` |

**Validação de sanidade pós-IA:** se a IA retornar `aiFindings` com severidade `critical` mas `aiVeto = null`, o sistema força `aiVeto = 20` automaticamente.

### 3.3 Veto efetivo

O `effectiveAiVeto` tem lógica adicional para tratar falsos positivos:

```typescript
effectiveAiVeto = 
  // IA silenciosa + sem deterministicVeto + conflitos high det. → veto conservador
  (aiVeto === null && filteredAiFindings.length === 0 && hasHighOrCriticalDet && deterministicVeto === null)
    ? 40
  // Todos os findings da IA eram falsos positivos → anular veto da IA
  : (filteredAiFindings.length === 0 && aiResult.aiFindings.length > 0 && aiVeto !== null)
    ? null
  : aiVeto
```

---

## 4. Papel da IA

A IA atua em dois momentos distintos no pipeline:

### 4.1 E1 — Extração Semântica (`extractInferredProfile`)

**Papel:** Analista de perfil empresarial. Extrai o perfil real da empresa a partir da descrição livre.

**O que produz:**
- `sector` — setor principal da empresa
- `estimatedMonthlyRevenue` / `estimatedAnnualRevenue` — faturamento estimado
- `inferredCompanySize` — porte inferido (baseado na tabela BNDES/Sebrae)
- `inferredTaxRegime` — regime tributário compatível
- `inferredOperationType` — tipo de operação
- `inferredClientType` — tipos de cliente (b2b, b2c, b2g)
- `inferenceConfidence` — confiança na inferência (0–100)

**Tabela de porte usada (BNDES/Sebrae/Receita Federal):**

| Porte | Faturamento anual máximo |
|---|---|
| MEI | R$ 81.000 |
| Microempresa | R$ 360.000 |
| Pequena | R$ 4.800.000 |
| Média | R$ 300.000.000 |
| Grande | Acima de R$ 300.000.000 |

### 4.2 E4 — Arbitragem IA (`runAiArbitration`)

**Papel:** Árbitro de realidade empresarial brasileira. Detecta contradições compostas que as regras determinísticas não cobrem.

**O que produz:**
- `aiCoherenceScore` — score de coerência da IA (0–100)
- `aiVeto` — teto para o `consistencyScore` (ou `null`)
- `aiFindings` — conflitos compostos detectados
- `reconciliationQuestions` — perguntas para reconciliar conflitos críticos

**Regra fundamental da IA:** a IA não repete conflitos já detectados pelas regras determinísticas. Ela foca exclusivamente em contradições compostas que emergem da combinação de múltiplos campos.

---

## 5. Inconsistências Compostas

Uma **inconsistência composta** é uma contradição que só é detectável quando se analisa a combinação de múltiplos campos simultaneamente. Nenhum campo isolado está errado — a combinação é que é impossível.

### 5.1 Exemplos de inconsistências compostas determinísticas

**C1 — MEI + Manufatura:**
- Campo `companySize = "mei"` está correto isoladamente
- Campo `operationType = "industria"` está correto isoladamente
- A combinação é juridicamente impossível: MEI não pode exercer atividade industrial (limite de faturamento de R$ 81K/ano e restrições de CNAE tornam inviável)

**C3 — Simples Nacional + B2G + Faturamento Alto:**
- `taxRegime = "simples_nacional"` está correto isoladamente
- `clientType = ["b2g"]` está correto isoladamente
- `estimatedAnnualRevenue > 4.800.000` está correto isoladamente
- A combinação é impossível: contratos B2G com esse faturamento excedem o limite do Simples Nacional

### 5.2 Exemplos de inconsistências compostas detectadas pela IA

A IA detecta padrões como:
- Empresa descrita como "startup de tecnologia" com regime de lucro real e faturamento de R$ 50M/ano (combinação incomum que merece reconciliação)
- Empresa descrita como "loja de bairro" com importação/exportação e múltiplos estados (combinação implausível)
- Empresa descrita como "consultoria" com operação de manufatura e múltiplos estabelecimentos industriais

### 5.3 Filtro de falsos positivos

O sistema inclui um filtro pós-IA que remove conflitos de porte quando o faturamento declarado está dentro dos limites oficiais:

```typescript
// Se companySize = "media" e annualRevenueRange = "4800000-78000000"
// → revenueRange.min (4.800.001) ≤ SIZE_MAX_REVENUE["media"] (300.000.000)
// → conflito da IA sobre porte é falso positivo → removido
```

---

## 6. Decisão de Bloqueio

A decisão final é determinada por três condições verificadas em ordem de prioridade:

```typescript
// Prioridade 1: Hard Block
if (diagnosticConfidence < 15 || hasCriticalConflict) {
  canProceed = false;
  blockType = "hard_block";
}
// Prioridade 2: Soft Block
else if (hasCompositeConflict || allConflicts.some(c => c.severity === "high")) {
  canProceed = false;
  blockType = "soft_block_with_override";
}
// Prioridade 3: Aprovado
else {
  canProceed = true;
  blockType = undefined;
}
```

**Nota importante:** `hasCompositeConflict` verifica especificamente conflitos do tipo `composite` com severidade `critical`. Conflitos compostos `high` são tratados pela segunda condição.
