# CPIE v2 — Matriz de Regras

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts` linhas 282–535 (Camadas A, B, C) · linhas 578–648 (E4 IA)

---

## Visão Geral

O CPIE v2 organiza suas regras em **quatro camadas** executadas sequencialmente:

| Camada | Nome | Tipo | Linhas no código |
|---|---|---|---|
| A | Regras Objetivas Diretas | Determinístico | 282–338 |
| B | Comparação Descrição vs. Campos | Inferência | 356–472 |
| C | Contradições Compostas | Determinístico | 475–535 |
| E4 | Arbitragem IA | IA | 538–759 |

As camadas A, B e C são executadas pela função `buildConflictMatrix`. A camada E4 é executada por `runAiArbitration`.

---

## Camada A — Regras Objetivas Diretas

Regras baseadas exclusivamente em campos estruturados, sem análise da descrição livre.

### A1 — Regime Tributário vs. Faturamento Declarado

| Atributo | Valor |
|---|---|
| **ID** | A1 |
| **Tipo** | `direct` |
| **Severidade** | `critical` |
| **Campos verificados** | `taxRegime`, `annualRevenueRange` |
| **`consistencyVeto`** | 15 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
REGIME_MAX_REVENUE[taxRegime] < revenueMin
```

**Limites por regime (`REGIME_MAX_REVENUE`):**

| Regime | Faturamento máximo |
|---|---|
| `simples_nacional` | R$ 4.800.000/ano |
| `mei` | R$ 81.000/ano |

**Exemplos:**
- MEI com faturamento de R$ 500K/ano → **A1 ativado** (R$ 500K > R$ 81K)
- Simples Nacional com faturamento de R$ 10M/ano → **A1 ativado** (R$ 10M > R$ 4,8M)
- Lucro Real com qualquer faturamento → **A1 não ativado** (sem limite máximo)

---

### A2 — Porte vs. Faturamento Declarado

| Atributo | Valor |
|---|---|
| **ID** | A2 |
| **Tipo** | `direct` |
| **Severidade** | `high` |
| **Campos verificados** | `companySize`, `annualRevenueRange` |
| **`consistencyVeto`** | 40 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
SIZE_MAX_REVENUE[companySize] < revenueMin
```

**Limites por porte (`SIZE_MAX_REVENUE`):**

| Porte | Faturamento máximo |
|---|---|
| `mei` | R$ 81.000/ano |
| `micro` | R$ 360.000/ano |
| `pequena` | R$ 4.800.000/ano |
| `media` | R$ 300.000.000/ano |
| `grande` | Sem limite |

**Exemplos:**
- Micro empresa com faturamento de R$ 500K/ano → **A2 ativado** (R$ 500K > R$ 360K)
- Empresa média com faturamento de R$ 36M/ano → **A2 não ativado** (R$ 36M < R$ 300M)

---

### A3 — MEI com Operações Multi-Estado

| Atributo | Valor |
|---|---|
| **ID** | A3 |
| **Tipo** | `direct` |
| **Severidade** | `high` |
| **Campos verificados** | `companySize`, `multiState` |
| **`consistencyVeto`** | 40 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
companySize === "mei" AND multiState === true
```

---

### A4 — MEI com Importação/Exportação

| Atributo | Valor |
|---|---|
| **ID** | A4 |
| **Tipo** | `direct` |
| **Severidade** | `critical` |
| **Campos verificados** | `companySize`, `hasImportExport` |
| **`consistencyVeto`** | 15 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
companySize === "mei" AND hasImportExport === true
```

---

## Camada B — Comparação Descrição vs. Campos

Regras que comparam o perfil inferido da descrição livre com os campos estruturados. Só são executadas quando `inferenceConfidence >= 50`.

### B1 — Faturamento Descrito vs. Declarado (Crítico)

| Atributo | Valor |
|---|---|
| **ID** | B1 |
| **Tipo** | `inference` |
| **Severidade** | `critical` |
| **Campos verificados** | `description`, `annualRevenueRange` |
| **`consistencyVeto`** | 30 |
| **`reconciliationRequired`** | true |
| **Fonte** | `inference` |

**Condição de ativação:**
```
estimatedAnnualRevenue / REVENUE_LIMITS[annualRevenueRange].max > 4
```
(Faturamento descrito é mais de 4× o máximo do range declarado)

---

### B1b — Faturamento Descrito vs. Declarado (Alto)

| Atributo | Valor |
|---|---|
| **ID** | B1b |
| **Tipo** | `inference` |
| **Severidade** | `high` |
| **Campos verificados** | `description`, `annualRevenueRange` |
| **`consistencyVeto`** | 45 |
| **`reconciliationRequired`** | true |
| **Fonte** | `inference` |

**Condição de ativação:**
```
estimatedAnnualRevenue / REVENUE_LIMITS[annualRevenueRange].max > 2
E
estimatedAnnualRevenue / REVENUE_LIMITS[annualRevenueRange].max ≤ 4
```

---

### B2 — Tipo de Operação Inferido vs. Declarado

| Atributo | Valor |
|---|---|
| **ID** | B2 |
| **Tipo** | `inference` |
| **Severidade** | `high` (indústria↔serviços) ou `medium` (outros) |
| **Campos verificados** | `description`, `operationType` |
| **`consistencyVeto`** | 40 (high) ou 55 (medium) |
| **`reconciliationRequired`** | true (high) ou false (medium) |
| **Fonte** | `inference` |

**Condição de ativação:**
```
inferredOperationType !== operationType
```

**Severidade `high`:** quando a divergência é entre `industria` e `servicos` (ou vice-versa) — são tipos fundamentalmente incompatíveis.  
**Severidade `medium`:** para outras divergências de tipo de operação.

---

### B3 — Cliente B2G Improvável para o Setor

| Atributo | Valor |
|---|---|
| **ID** | B3 |
| **Tipo** | `inference` |
| **Severidade** | `medium` |
| **Campos verificados** | `description`, `clientType` |
| **`consistencyVeto`** | 55 |
| **`reconciliationRequired`** | false |
| **Fonte** | `inference` |

**Condição de ativação:**
```
clientType.includes("b2g")
E NÃO inferredClientType.includes("b2g")
E setor descrito está em B2G_UNLIKELY_SECTORS
```

---

### B4 — Porte Inferido vs. Declarado

| Atributo | Valor |
|---|---|
| **ID** | B4 |
| **Tipo** | `inference` |
| **Severidade** | `high` |
| **Campos verificados** | `description`, `companySize` |
| **`consistencyVeto`** | 40 |
| **`reconciliationRequired`** | true |
| **Fonte** | `inference` |

**Condição de ativação:**
```
|sizeOrder.indexOf(inferredCompanySize) - sizeOrder.indexOf(companySize)| >= 2
```

Onde `sizeOrder = ["mei", "micro", "pequena", "media", "grande"]`.

**Nota:** diferença de 1 categoria (ex: `media` → `grande`) **não ativa** B4. Apenas diferenças de ≥ 2 categorias.

---

## Camada C — Contradições Compostas Determinísticas

Regras que verificam combinações de múltiplos campos simultaneamente.

### C1 — MEI com Manufatura

| Atributo | Valor |
|---|---|
| **ID** | C1 |
| **Tipo** | `composite` |
| **Severidade** | `critical` |
| **Campos verificados** | `companySize`, `operationType`, `description` |
| **`consistencyVeto`** | 15 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
companySize === "mei"
E (operationType === "industria" OU descrição contém palavras de manufatura)
```

**Palavras-chave de manufatura (`MANUFACTURING_KEYWORDS`):** verificadas na descrição livre.

---

### C2 — MEI com Múltiplos Canais de Venda

| Atributo | Valor |
|---|---|
| **ID** | C2 |
| **Tipo** | `composite` |
| **Severidade** | `high` |
| **Campos verificados** | `companySize`, `description` |
| **`consistencyVeto`** | 35 |
| **`reconciliationRequired`** | true |
| **Fonte** | `deterministic` |

**Condição de ativação:**
```
companySize === "mei"
E descrição menciona ≥ 2 canais de: ["varejo", "atacado", "e-commerce", "marketplace", "distribui"]
```

---

### C3 — Simples Nacional + B2G + Faturamento Alto

| Atributo | Valor |
|---|---|
| **ID** | C3 |
| **Tipo** | `composite` |
| **Severidade** | `high` |
| **Campos verificados** | `taxRegime`, `clientType`, `description` |
| **`consistencyVeto`** | 35 |
| **`reconciliationRequired`** | true |
| **Fonte** | `inference` |

**Condição de ativação:**
```
taxRegime === "simples_nacional"
E clientType.includes("b2g")
E estimatedAnnualRevenue > 4.800.000
```

---

## Camada E4 — Arbitragem IA

A IA detecta contradições compostas não cobertas pelas camadas A, B e C. Os findings têm `source: "ai"` e IDs no formato `AI-001`, `AI-002`, etc.

### Regras da IA (do prompt do árbitro)

| Situação | `aiVeto` | Severidade esperada |
|---|---|---|
| Contradição composta crítica | ≤ 15 | `critical` |
| Múltiplos conflitos high sem explicação | ≤ 30 | `high` |
| Faturamento descrito vs. declarado > 300% | ≤ 30 | `high` |
| Tipo de operação incompatível com setor | ≤ 40 | `high` |
| Sem contradições significativas | `null` | — |

### Filtro de falsos positivos da IA

Após a arbitragem, o sistema filtra findings da IA que contradizem os limites oficiais de porte:

```
Se finding.conflictingFields inclui "companySize"
E (inclui "annualRevenueRange" OU inclui "description")
E REVENUE_LIMITS[annualRevenueRange].min ≤ SIZE_MAX_REVENUE[companySize]
→ finding é removido (falso positivo)
```

---

## Resumo Executivo das Regras

| ID | Camada | Severidade | `consistencyVeto` | Override possível? |
|---|---|---|---|---|
| A1 | A | critical | 15 | Não |
| A2 | A | high | 40 | Sim (≥50 chars) |
| A3 | A | high | 40 | Sim (≥50 chars) |
| A4 | A | critical | 15 | Não |
| B1 | B | critical | 30 | Não |
| B1b | B | high | 45 | Sim (≥50 chars) |
| B2 | B | high/medium | 40/55 | Sim se high |
| B3 | B | medium | 55 | N/A (canProceed=true) |
| B4 | B | high | 40 | Sim (≥50 chars) |
| C1 | C | critical | 15 | Não |
| C2 | C | high | 35 | Sim (≥50 chars) |
| C3 | C | high | 35 | Sim (≥50 chars) |
| AI-xxx | E4 | variable | variable | Depende da severidade |
| AI-ERR | E4 | critical | 0 (aiVeto=0) | Não |
