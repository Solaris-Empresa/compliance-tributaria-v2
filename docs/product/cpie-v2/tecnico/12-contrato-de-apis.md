# CPIE v2 — Contrato de APIs

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/routers/cpieV2Router.ts`

---

## Convenções

Todos os endpoints são expostos via **tRPC** no namespace `cpieV2`. O transporte é HTTP POST para mutations e HTTP GET para queries. Autenticação via cookie de sessão JWT.

**Base URL:** `/api/trpc/cpieV2.{procedureName}`

---

## 1. `cpieV2.analyzePreview`

**Tipo:** `mutation` (publicProcedure)  
**Autenticação:** Não requerida  
**Propósito:** Análise stateless do perfil — não persiste nada no banco. Usado antes da criação do projeto.

### Input

```typescript
{
  description: string;           // min 1 char
  companySize: CompanySize;
  taxRegime: TaxRegime;
  annualRevenueRange: string;
  operationType: OperationType;
  clientType: ClientType[];
  hasImportExport: boolean;
  multiState: boolean;
  employeeCount?: string;
  yearsInOperation?: string;
  hasDigitalPresence?: boolean;
  mainProducts?: string[];
  targetMarket?: string;
  hasSpecialRegimes?: boolean;
  hasTaxTeam?: boolean;
  hasAudit?: boolean;
}
```

### Output

```typescript
{
  completenessScore: number;         // 0–100
  consistencyScore: number;          // 0–100
  diagnosticConfidence: number;      // 0–100
  allConflicts: CpieConflict[];
  canProceed: boolean;
  blockType?: "hard_block" | "soft_block_with_override";
  blockReason?: string;
  deterministicVeto: number | null;
  effectiveAiVeto: number | null;
  overallLevel: "none" | "low" | "medium" | "high" | "critical";
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  analysisVersion: "cpie-v2.0";
  inferredProfile: InferredProfile;
  reconciliationQuestions?: string[];
}
```

### Erros possíveis

| Código | Condição |
|---|---|
| `BAD_REQUEST` | Input inválido (falha na validação Zod) |
| `INTERNAL_SERVER_ERROR` | Falha na chamada à IA (retorna AI-ERR com hard_block) |

---

## 2. `cpieV2.analyze`

**Tipo:** `mutation` (protectedProcedure)  
**Autenticação:** Requerida  
**Propósito:** Análise com persistência no banco. Usado após a criação do projeto.

### Input

```typescript
{
  projectId: number;
  // + todos os campos do analyzePreview
}
```

### Output

```typescript
{
  checkId: number;               // ID do registro em consistency_checks
  // + todos os campos do analyzePreview
}
```

### Erros possíveis

| Código | Condição |
|---|---|
| `UNAUTHORIZED` | Usuário não autenticado |
| `NOT_FOUND` | `projectId` não existe ou não pertence ao usuário |
| `BAD_REQUEST` | Input inválido |

### Efeito no banco

Insere um registro em `consistency_checks` com:
```typescript
{
  projectId,
  userId: ctx.user.id,
  completenessScore,
  consistencyScore,
  diagnosticConfidence,
  overallLevel,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  canProceed,
  blockType,
  blockReason,
  conflictsJson: JSON.stringify(allConflicts),
  analysisVersion: "cpie-v2.0",
  createdAt: Date.now()
}
```

---

## 3. `cpieV2.overrideSoftBlock`

**Tipo:** `mutation` (protectedProcedure)  
**Autenticação:** Requerida  
**Propósito:** Registrar override de soft_block com justificativa formal.

### Input

```typescript
{
  checkId: number;
  justification: string;   // min 50 chars
}
```

### Output

```typescript
{
  overridden: boolean;   // sempre true se bem-sucedido
}
```

### Erros possíveis

| Código | Condição |
|---|---|
| `UNAUTHORIZED` | Usuário não autenticado |
| `NOT_FOUND` | `checkId` não existe ou não pertence ao usuário |
| `FORBIDDEN` | `blockType === "hard_block"` ou `diagnosticConfidence < 15` |
| `BAD_REQUEST` | `blockType !== "soft_block_with_override"` ou justificativa < 50 chars |

### Efeito no banco

Atualiza o registro em `consistency_checks`:
```typescript
{
  acceptedRisk: 1,
  acceptedRiskAt: Date.now(),
  acceptedRiskBy: String(ctx.user.id),
  acceptedRiskReason: `[CPIE v2 Override] ${justification.slice(0, 450)} | Log: ${JSON.stringify(overrideLog)}`
}
```

O `overrideLog` contém: `{ timestamp, userId, userName, justification, checkId, projectId, diagnosticConfidenceAtOverride }`.

---

## 4. `cpieV2.acknowledgeMediumConflicts`

**Tipo:** `mutation` (protectedProcedure)  
**Autenticação:** Requerida  
**Propósito:** Registrar aceite formal de conflitos MEDIUM pelo usuário.

### Input

```typescript
{
  checkId: number;
}
```

### Output

```typescript
{
  acknowledged: boolean;   // sempre true se bem-sucedido
}
```

### Erros possíveis

| Código | Condição |
|---|---|
| `UNAUTHORIZED` | Usuário não autenticado |
| `NOT_FOUND` | `checkId` não existe ou não pertence ao usuário |
| `BAD_REQUEST` | `canProceed !== true` ou `overallLevel !== "medium"` |

### Efeito no banco

Atualiza o registro em `consistency_checks`:
```typescript
{
  mediumAcknowledged: 1,
  updatedAt: Date.now()
}
```

---

## 5. `cpieV2.getByProject`

**Tipo:** `query` (protectedProcedure)  
**Autenticação:** Requerida  
**Propósito:** Recuperar o resultado mais recente de análise CPIE v2 de um projeto.

### Input

```typescript
{
  projectId: number;
}
```

### Output

```typescript
{
  // Dados do registro em consistency_checks
  id: number;
  projectId: number;
  completenessScore: number;
  consistencyScore: number;
  diagnosticConfidence: number;
  overallLevel: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  canProceed: boolean;
  blockType: string | null;
  blockReason: string | null;
  conflictsJson: string;         // JSON.stringify(allConflicts)
  analysisVersion: string;
  acceptedRisk: boolean;
  acceptedRiskAt: number | null;
  acceptedRiskBy: string | null;
  acceptedRiskReason: string | null;
  mediumAcknowledged: boolean;
  createdAt: number;
  updatedAt: number | null;
} | null
```

Retorna `null` se não houver análise para o projeto.

### Erros possíveis

| Código | Condição |
|---|---|
| `UNAUTHORIZED` | Usuário não autenticado |
| `NOT_FOUND` | `projectId` não existe ou não pertence ao usuário |

---

## 6. Tipos Compartilhados

### `CpieConflict`

```typescript
interface CpieConflict {
  id: string;                    // Ex: "A1", "B2", "AI-001"
  type: "direct" | "inference" | "composite";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  conflictingFields: string[];
  consistencyVeto: number;       // Teto para consistencyScore
  reconciliationRequired: boolean;
  source: "deterministic" | "inference" | "ai";
}
```

### `InferredProfile`

```typescript
interface InferredProfile {
  sector: string;
  estimatedMonthlyRevenue: number | null;
  estimatedAnnualRevenue: number | null;
  inferredCompanySize: CompanySize | null;
  inferredTaxRegime: TaxRegime | null;
  inferredOperationType: OperationType | null;
  inferredClientType: ClientType[];
  inferenceConfidence: number;   // 0–100
}
```

### Enums

```typescript
type CompanySize = "mei" | "micro" | "pequena" | "media" | "grande";
type TaxRegime = "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
type OperationType = "comercio" | "servicos" | "industria" | "misto";
type ClientType = "b2b" | "b2c" | "b2g";
```
