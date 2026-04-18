# CPIE v2 — Pipeline de Análise

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts` linhas 762–907

---

## Visão Geral

O pipeline do CPIE v2 é composto por cinco etapas executadas sequencialmente. As etapas E1 e E4 envolvem chamadas à IA; as demais são determinísticas.

```
Input (CpieV2Input)
    │
    ▼
E1: extractInferredProfile     ← IA (extração semântica)
    │
    ▼
E2: calcCompletenessScore      ← Determinístico
    │
    ▼
E3: buildConflictMatrix        ← Determinístico (Camadas A, B, C)
    │
    ▼
E4: runAiArbitration           ← IA (árbitro de coerência)
    │
    ▼
E5: calcFinalScores            ← Determinístico (decisão final)
    │
    ▼
Output (CpieV2Result)
```

---

## E1 — Extração de Perfil Inferido

**Função:** `extractInferredProfile(input: CpieV2Input): Promise<InferredProfile>`

**Propósito:** Extrair o perfil real da empresa a partir da descrição livre, usando IA para interpretar linguagem natural.

**Quando é executada:** sempre, independentemente do conteúdo da descrição.

**Prompt enviado à IA:** analista de perfil empresarial brasileiro. Recebe a descrição livre e os campos estruturados. Retorna JSON estruturado com o perfil inferido.

**Campos retornados:**

| Campo | Tipo | Descrição |
|---|---|---|
| `sector` | string | Setor principal da empresa |
| `estimatedMonthlyRevenue` | number \| null | Faturamento mensal estimado em R$ |
| `estimatedAnnualRevenue` | number \| null | Faturamento anual estimado em R$ |
| `inferredCompanySize` | CompanySize \| null | Porte inferido |
| `inferredTaxRegime` | TaxRegime \| null | Regime tributário compatível |
| `inferredOperationType` | OperationType \| null | Tipo de operação inferido |
| `inferredClientType` | ClientType[] | Tipos de cliente inferidos |
| `inferenceConfidence` | number | Confiança na inferência (0–100) |

**Tabela de porte usada pela IA (BNDES/Sebrae/Receita Federal):**

| Porte | Faturamento anual máximo |
|---|---|
| MEI | R$ 81.000 |
| Microempresa | R$ 360.000 |
| Pequena | R$ 4.800.000 |
| Média | R$ 300.000.000 |
| Grande | Acima de R$ 300.000.000 |

**Comportamento em caso de falha:** retorna `inferenceConfidence = 0` e todos os campos como `null`. A etapa E3 não executa a Camada B quando `inferenceConfidence < 50`.

---

## E2 — Cálculo de Completude

**Função:** `calcCompletenessScore(input: CpieV2Input): number`

**Propósito:** Calcular o percentual de campos preenchidos corretamente.

**Fórmula:**
```
completenessScore = (campos_válidos / 17) × 100
```

**Os 17 campos verificados:**

| # | Campo | Peso |
|---|---|---|
| 1 | `description` (≥ 20 chars) | 1 |
| 2 | `companySize` | 1 |
| 3 | `taxRegime` | 1 |
| 4 | `annualRevenueRange` | 1 |
| 5 | `operationType` | 1 |
| 6 | `clientType` (não vazio) | 1 |
| 7 | `hasImportExport` | 1 |
| 8 | `multiState` | 1 |
| 9 | `sector` (do perfil) | 1 |
| 10 | `employeeCount` | 1 |
| 11 | `yearsInOperation` | 1 |
| 12 | `hasDigitalPresence` | 1 |
| 13 | `mainProducts` (não vazio) | 1 |
| 14 | `targetMarket` | 1 |
| 15 | `hasSpecialRegimes` | 1 |
| 16 | `hasTaxTeam` | 1 |
| 17 | `hasAudit` | 1 |

**Nota:** campos opcionais não preenchidos reduzem o `completenessScore`, o que por sua vez reduz o `diagnosticConfidence`.

---

## E3 — Matriz de Conflitos Determinísticos

**Função:** `buildConflictMatrix(input, inferred): CpieConflict[]`

**Propósito:** Executar todas as regras determinísticas (Camadas A, B e C) e retornar a lista de conflitos detectados.

**Execução das camadas:**

```typescript
// Camada A — sempre executada
const camadaA = checkCamadaA(input);

// Camada B — executada apenas se inferenceConfidence >= 50
const camadaB = inferred.inferenceConfidence >= 50
  ? checkCamadaB(input, inferred)
  : [];

// Camada C — sempre executada (não depende da IA)
const camadaC = checkCamadaC(input, inferred);

return [...camadaA, ...camadaB, ...camadaC];
```

**Cálculo do `deterministicVeto`:**
```typescript
const deterministicVeto = detConflicts.length > 0
  ? Math.min(...detConflicts.map(c => c.consistencyVeto))
  : null;
```

---

## E4 — Arbitragem IA

**Função:** `runAiArbitration(input, inferred, detConflicts): Promise<AiArbitrationResult>`

**Propósito:** Detectar contradições compostas não cobertas pelas regras determinísticas.

**Prompt enviado à IA:** árbitro de realidade empresarial brasileira. Recebe o perfil completo, o perfil inferido e os conflitos já detectados. Retorna JSON com `aiCoherenceScore`, `aiVeto`, `aiFindings` e `reconciliationQuestions`.

**Instrução crítica no prompt:** "Não repita conflitos já detectados pelas regras determinísticas. Foque exclusivamente em contradições compostas que emergem da combinação de múltiplos campos."

**Validação de sanidade pós-IA:**
```typescript
// Se IA retornou findings críticos sem veto → forçar veto
if (aiFindings.some(f => f.severity === "critical") && (aiVeto === null || aiVeto > 20)) {
  aiVeto = 20;
  aiBlockReason = "Veto forçado por validação de sanidade.";
}
```

**Filtro de falsos positivos:**
```typescript
// Remover findings de porte quando faturamento está dentro dos limites oficiais
filteredAiFindings = aiFindings.filter(finding => {
  if (!finding.conflictingFields.includes("companySize")) return true;
  const revenueMin = REVENUE_LIMITS[input.annualRevenueRange]?.min ?? 0;
  const sizeMax = SIZE_MAX_REVENUE[input.companySize] ?? Infinity;
  return revenueMin > sizeMax; // só mantém se o faturamento realmente excede o limite
});
```

**Cálculo do `effectiveAiVeto`:**
```typescript
effectiveAiVeto =
  // IA silenciosa + conflitos high det. → veto conservador
  (aiVeto === null && filteredAiFindings.length === 0 && hasHighOrCriticalDet && deterministicVeto === null)
    ? 40
  // Todos os findings da IA eram falsos positivos → anular veto da IA
  : (filteredAiFindings.length === 0 && aiResult.aiFindings.length > 0 && aiVeto !== null)
    ? null
  : aiVeto;
```

**Comportamento em caso de falha:**
```typescript
// Falha da IA → hard_block por segurança
return {
  aiCoherenceScore: 0,
  aiVeto: 0,
  aiFindings: [{ id: "AI-ERR", severity: "critical", ... }],
  reconciliationQuestions: []
};
```

---

## E5 — Cálculo de Scores Finais e Decisão

**Função:** `calcFinalScores(completeness, detConflicts, filteredAiFindings, deterministicVeto, effectiveAiVeto): CpieV2Result`

**Propósito:** Calcular os scores finais e determinar a decisão de bloqueio.

### Cálculo do `consistencyScore`

```typescript
// 1. Penalizações acumulativas
const penalties = [...detConflicts, ...filteredAiFindings].reduce((sum, c) => {
  return sum + SEVERITY_PENALTIES[c.severity]; // critical=-35, high=-20, medium=-10, low=-5
}, 0);

// 2. Score bruto
const rawScore = Math.max(0, 100 - penalties);

// 3. Aplicar vetos (tetos)
const consistencyScore = Math.min(
  rawScore,
  deterministicVeto ?? 100,
  effectiveAiVeto ?? 100
);
```

### Cálculo do `diagnosticConfidence`

```typescript
diagnosticConfidence = Math.round(consistencyScore * completenessScore / 100);
```

### Decisão de bloqueio

```typescript
const allConflicts = [...detConflicts, ...filteredAiFindings];
const hasCriticalConflict = allConflicts.some(c => c.severity === "critical");
const hasHighConflict = allConflicts.some(c => c.severity === "high");
const hasCompositeConflict = allConflicts.some(c => c.type === "composite" && c.severity === "critical");

if (diagnosticConfidence < 15 || hasCriticalConflict) {
  canProceed = false;
  blockType = "hard_block";
} else if (hasCompositeConflict || hasHighConflict) {
  canProceed = false;
  blockType = "soft_block_with_override";
} else {
  canProceed = true;
  blockType = undefined;
}
```

### Cálculo do `overallLevel`

```typescript
overallLevel =
  hasCriticalConflict ? "critical" :
  hasHighConflict ? "high" :
  allConflicts.some(c => c.severity === "medium") ? "medium" :
  allConflicts.some(c => c.severity === "low") ? "low" :
  "none";
```
