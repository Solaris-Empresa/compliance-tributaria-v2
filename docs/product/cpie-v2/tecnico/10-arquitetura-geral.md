# CPIE v2 — Arquitetura Geral

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts` · `server/routers/cpieV2Router.ts` · `drizzle/schema.ts` · `client/src/pages/NovoProjeto.tsx`

---

## 1. Visão Geral

O CPIE v2 (Checklist de Perfil e Inconsistências Empresariais v2) é um subsistema da Plataforma de Compliance da Reforma Tributária. Ele opera como uma **camada de validação de coerência** que intercepta o fluxo de criação de projetos antes que qualquer diagnóstico tributário seja produzido.

### 1.1 Posição no sistema

```
[Usuário]
    │
    ▼
[Formulário de Perfil da Empresa]
    │
    ▼
[CPIE v2 — Camada de Validação] ← ponto de interceptação
    │
    ├─ hard_block → [Bloqueio absoluto]
    ├─ soft_block → [Override com justificativa]
    ├─ medium → [Revisão com aceite]
    └─ limpo → [Prosseguir]
    │
    ▼
[Extração de CNAEs]
    │
    ▼
[Diagnóstico Tributário]
```

### 1.2 Princípio de design

O CPIE v2 segue o princípio **"fail-safe by default"**: qualquer falha no sistema (IA indisponível, dados corrompidos, timeout) resulta em bloqueio, nunca em aprovação silenciosa.

---

## 2. Componentes Principais

### 2.1 Motor de Análise (`server/cpie-v2.ts`)

O motor é a peça central do CPIE v2. É uma função pura que recebe um perfil de empresa e retorna um resultado de análise. Não tem efeitos colaterais (não persiste nada no banco).

**Função principal:**
```typescript
runCpieAnalysisV2(input: CpieV2Input): Promise<CpieV2Result>
```

**Subfunções:**
- `calcCompletenessScore(input)` — E2
- `extractInferredProfile(input)` — E1 (chama IA)
- `buildConflictMatrix(input, inferred)` — E3
- `runAiArbitration(input, inferred, detConflicts)` — E4 (chama IA)
- `calcFinalScores(...)` — E5

### 2.2 Router tRPC (`server/routers/cpieV2Router.ts`)

Expõe os endpoints do CPIE v2 via tRPC. Gerencia persistência, autenticação e orquestração.

**Endpoints:**
- `cpieV2.analyzePreview` — análise stateless (sem persistência)
- `cpieV2.analyze` — análise com persistência no banco
- `cpieV2.overrideSoftBlock` — override de soft_block
- `cpieV2.acknowledgeMediumConflicts` — aceite de conflitos MEDIUM
- `cpieV2.getByProject` — recupera última análise de um projeto

### 2.3 Componente de UI — NovoProjeto (`client/src/pages/NovoProjeto.tsx`)

Gerencia o estado do CPIE v2 no frontend durante a criação de projetos.

**Responsabilidades:**
- Disparar `analyzePreview` ao clicar em "Avançar"
- Renderizar o estado correto (hard_block, soft_block, MEDIUM, limpo)
- Gerenciar o fluxo de override e aceite MEDIUM
- Orquestrar a sequência `createProject → analyze → overrideSoftBlock/acknowledgeMedium → extractCnaes`

### 2.4 Componente de UI — PerfilEmpresaIntelligente (`client/src/components/PerfilEmpresaIntelligente.tsx`)

Exibe o resultado da análise CPIE v2 para projetos existentes.

**Responsabilidades:**
- Exibir o `ScorePanel` com os três scores
- Listar os conflitos detectados
- Permitir reanálise via botão "Reexecutar análise"

### 2.5 Schema do Banco (`drizzle/schema.ts`)

Tabela `consistency_checks` — persiste os resultados de análise.

---

## 3. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                                                             │
│  ┌─────────────────────┐   ┌──────────────────────────────┐ │
│  │    NovoProjeto.tsx  │   │ PerfilEmpresaIntelligente.tsx│ │
│  │                     │   │                              │ │
│  │ - analyzePreview    │   │ - ScorePanel                 │ │
│  │ - createProject     │   │ - ConflictList               │ │
│  │ - analyze           │   │ - RerunAnalysis              │ │
│  │ - overrideSoftBlock │   │                              │ │
│  │ - acknowledgeMedium │   │                              │ │
│  └──────────┬──────────┘   └──────────────┬───────────────┘ │
└─────────────┼────────────────────────────┼─────────────────┘
              │ tRPC                        │ tRPC
              ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              cpieV2Router.ts                         │   │
│  │                                                      │   │
│  │  analyzePreview  analyze  overrideSoftBlock          │   │
│  │  acknowledgeMedium  getByProject                     │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              cpie-v2.ts (Motor)                      │   │
│  │                                                      │   │
│  │  E1: extractInferredProfile ──────────────────────┐  │   │
│  │  E2: calcCompletenessScore                        │  │   │
│  │  E3: buildConflictMatrix                          │  │   │
│  │  E4: runAiArbitration ─────────────────────────┐  │  │   │
│  │  E5: calcFinalScores                           │  │  │   │
│  └───────────────────────────────────────────────┼──┼──┘   │
│                                                  │  │       │
│                                                  ▼  ▼       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LLM (invokeLLM)                         │   │
│  │              Manus Built-in AI API                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Database (MySQL/TiDB)                   │   │
│  │              consistency_checks table                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Fluxo de Dados

### 4.1 Entrada do motor

```typescript
interface CpieV2Input {
  description: string;           // Descrição livre do negócio
  companySize: CompanySize;      // "mei"|"micro"|"pequena"|"media"|"grande"
  taxRegime: TaxRegime;          // "mei"|"simples_nacional"|"lucro_presumido"|"lucro_real"
  annualRevenueRange: string;    // Ex: "4800000-78000000"
  operationType: OperationType;  // "comercio"|"servicos"|"industria"|"misto"
  clientType: ClientType[];      // ["b2b"|"b2c"|"b2g"]
  hasImportExport: boolean;
  multiState: boolean;
  // ... outros campos do perfil
}
```

### 4.2 Saída do motor

```typescript
interface CpieV2Result {
  completenessScore: number;       // 0–100
  consistencyScore: number;        // 0–100
  diagnosticConfidence: number;    // 0–100
  allConflicts: CpieConflict[];    // Lista de conflitos detectados
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

---

## 5. Dependências Externas

| Dependência | Uso | Criticidade |
|---|---|---|
| Manus Built-in AI API | E1 (extração) e E4 (arbitragem) | Alta — falha resulta em hard_block |
| MySQL/TiDB | Persistência de análises | Alta — falha impede persistência (não bloqueia análise) |
| tRPC | Comunicação frontend-backend | Alta — sem alternativa |

---

## 6. Características de Performance

| Operação | Tempo típico | Tempo máximo |
|---|---|---|
| `analyzePreview` (com IA) | 3–6 segundos | 15 segundos |
| `analyzePreview` (sem IA — inferência baixa) | 0,5–1 segundo | 3 segundos |
| `analyze` (com persistência) | 4–7 segundos | 20 segundos |
| `overrideSoftBlock` | < 200ms | 1 segundo |
| `acknowledgeMediumConflicts` | < 200ms | 1 segundo |
| `getByProject` | < 100ms | 500ms |

---

## 7. Segurança

### 7.1 Autenticação

Todos os endpoints do `cpieV2Router` exceto `analyzePreview` requerem autenticação via `protectedProcedure`. O `analyzePreview` é público para permitir análise antes da criação do projeto.

### 7.2 Autorização

O `analyze`, `overrideSoftBlock` e `acknowledgeMediumConflicts` verificam se o `projectId` pertence ao usuário autenticado antes de qualquer operação.

### 7.3 Validação de entrada

Todos os inputs são validados via Zod antes de chegar ao motor. Campos inválidos retornam erro 400 antes de qualquer processamento.
