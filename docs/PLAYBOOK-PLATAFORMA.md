# PLAYBOOK DA PLATAFORMA — IA SOLARIS Compliance Tributária
**Versão:** v2.2 | **Data:** 20/03/2026 | **Audiência:** Equipe de desenvolvimento, Product Owner, stakeholders técnicos

---

## 1. Visão Geral do Produto

A **IA SOLARIS** é uma plataforma SaaS de compliance tributário que guia empresas pela adequação à Reforma Tributária Brasileira (LC 214/2025 e LC 227/2025). O produto combina um motor de requisitos regulatórios canônicos com inteligência artificial generativa para produzir diagnósticos, planos de ação e relatórios de risco personalizados.

**Proposta de valor central:** Transformar 499 requisitos legais complexos em um diagnóstico empresarial acionável, com score de compliance, identificação de gaps e plano de mitigação priorizado.

---

## 2. Princípios de Desenvolvimento

### 2.1 Governança de Código

Toda feature nova segue o ciclo:

```
PLANEJAMENTO → IMPLEMENTAÇÃO → VALIDAÇÃO → DONE
```

Uma task só é marcada como **DONE** quando:
1. Código funcionando e TypeScript sem erros
2. Testes vitest escritos e passando (100%)
3. Persistência validada no banco
4. Evidência visual (screenshot ou log)
5. Checkpoint salvo

### 2.2 Rastreabilidade Obrigatória

Todos os dados críticos devem ter rastreabilidade completa:
- `canonical_id` em todas as perguntas e gaps
- `session_id` em todas as respostas e análises
- `audit_trail` para operações de diagnóstico
- `created_at` e `updated_at` em todas as tabelas

### 2.3 Score Honesto

A regra de score é: **score = 100% somente se improve == 0 e rejected == 0**. Nunca inflar métricas. O score_real é sempre `OK / total`.

---

## 3. Fluxo de Desenvolvimento de Novas Features

### 3.1 Backend (tRPC)

```
1. Definir schema no drizzle/schema.ts
2. Executar pnpm db:push
3. Criar query helpers em server/db.ts (se necessário)
4. Criar lógica de negócio em server/<feature>Engine.ts
5. Criar procedures em server/routers/<feature>Router.ts
6. Registrar o router em server/routers.ts
7. Escrever testes em server/<feature>.test.ts
8. Executar pnpm vitest run server/<feature>.test.ts
```

### 3.2 Frontend (React + tRPC)

```
1. Criar página em client/src/pages/<Feature>.tsx
2. Usar trpc.<router>.<procedure>.useQuery/useMutation
3. Registrar rota em client/src/App.tsx
4. Corrigir import do useAuth: "@/_core/hooks/useAuth"
5. Verificar TypeScript: npx tsc --noEmit
```

### 3.3 Checkpoint

```
1. git add -A && git commit -m "feat: descrição"
2. webdev_save_checkpoint
3. Verificar screenshot do preview
```

---

## 4. Padrões de Código

### 4.1 Importações Críticas

```typescript
// ✅ CORRETO — useAuth
import { useAuth } from "@/_core/hooks/useAuth";

// ✅ CORRETO — db
import { getDb } from "../db";
const db = await getDb();

// ✅ CORRETO — uuid
import { v4 as uuidv4 } from "uuid";

// ✅ CORRETO — tRPC procedure
import { protectedProcedure, router } from "../_core/trpc";
```

### 4.2 Estrutura de Router tRPC

```typescript
// server/routers/<feature>Router.ts
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

export const featureRouter = router({
  create: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // lógica...
    }),
});
```

### 4.3 Regra de Tamanho de Router

Routers com mais de 150 linhas devem ser extraídos para sub-routers em `server/routers/<feature>.ts`. Isso evita falhas de inferência de tipos do LSP.

### 4.4 Padrão de Engine Pura

Engines de negócio (gapEngine.ts, riskEngine.ts) devem ser **funções puras** sem acesso direto ao banco. O banco é acessado apenas nos routers. Isso facilita os testes vitest (sem mocks de banco).

```typescript
// ✅ CORRETO — engine pura
export function classifyRisk(input: GapInput): RiskItem { ... }

// ✅ CORRETO — router usa a engine
const riskItem = classifyRisk({ canonicalId, gapStatus, normativeType });
await db.insert(riskAnalysis).values({ ...riskItem });
```

---

## 5. Banco de Dados

### 5.1 Workflow de Migração

```bash
# 1. Editar drizzle/schema.ts
# 2. Executar migração
pnpm db:push

# 3. Verificar tabelas criadas
# (via webdev_execute_sql ou MySQL client)
```

### 5.2 Convenções de Nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Tabelas novas (engines) | `snake_case` | `gap_analysis`, `risk_analysis` |
| Tabelas legadas | `camelCase` | `assessmentPhase1`, `projectBranches` |
| IDs de engines | `uuid` | `gap_id`, `risk_id`, `session_id` |
| IDs de domínio | `CAN-XXXX`, `MAP-XXXX` | `CAN-0001`, `MAP-4EE9C16B` |

### 5.3 Campos Obrigatórios em Novas Tabelas

```typescript
{
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
}
```

---

## 6. Testes

### 6.1 Estrutura de Testes

```typescript
// server/<feature>.test.ts
import { describe, it, expect } from "vitest";
import { functionToTest } from "./<feature>Engine";

describe("functionToTest", () => {
  it("caso nominal", () => {
    expect(functionToTest(input)).toEqual(expected);
  });

  it("caso de borda — valor zero", () => {
    expect(functionToTest(0)).toBe(0);
  });
});
```

### 6.2 Cobertura Mínima por Engine

Cada engine deve ter testes para:
1. Casos nominais (todos os valores válidos de cada enum)
2. Casos de borda (0, null, vazio, máximo)
3. Fórmulas matemáticas (verificar arredondamento)
4. Integração entre funções (runXxxAnalysis)

### 6.3 Executar Testes

```bash
# Todos os testes
pnpm vitest run

# Apenas um arquivo
pnpm vitest run server/gapEngine.test.ts

# Watch mode
pnpm vitest
```

---

## 7. Motores de Negócio

### 7.1 Gap Engine — Referência Rápida

```
Resposta "sim"          → compliant (não entra no denominador de gaps)
Resposta "nao"          → nao_compliant + severity alta
Resposta "parcial"      → parcial + severity media
Resposta "nao_aplicavel"→ excluído do score

score = round((compliant + 0.5×parcial) / total_aplicavel × 100)
```

### 7.2 Risk Engine — Referência Rápida

```
base_score:
  obrigacao/vedacao + critica = 100 | alta = 80 | media = 60 | baixa = 40
  direito           + critica = 70  | alta = 50 | media = 35 | baixa = 20
  opcao             + critica = 45  | alta = 30 | media = 20 | baixa = 15

gap_multiplier:
  nao_compliant = 1.0 | parcial = 0.5 | compliant = 0 | nao_aplicavel = 0

risk_score = base_score × gap_multiplier (cap: 100)

risk_level:
  critico (≥70) | alto (50–69) | medio (25–49) | baixo (0–24)

mitigation_priority:
  critico → imediata | alto+obrigacao → curto_prazo | medio → medio_prazo | baixo → monitoramento
```

### 7.3 Consistency Engine (v2.2 — a implementar)

```
Análise determinística:
  - Faturamento vs. porte declarado
  - Regime tributário vs. faturamento
  - Número de funcionários vs. porte
  - CNAE vs. setor declarado

Análise IA (OpenAI):
  - Consistência entre perfil e atividades
  - Coerência dos dados financeiros
  - Identificação de inconsistências sutis

Classificação:
  critical | high | medium | low

Gate:
  - critical → bloqueia diagnóstico (usuário deve corrigir)
  - high → exige confirmação explícita ("assumir risco")
  - medium/low → exibe aviso, não bloqueia
```

---

## 8. Fluxo de Rollback

Em caso de problema crítico:

```bash
# 1. Identificar checkpoint estável
git log --oneline

# 2. Rollback via UI do Manus (preferencial)
# Clicar em "Rollback" no checkpoint desejado

# 3. Ou via webdev_rollback_checkpoint
# (informar version_id do checkpoint)
```

**Checkpoints de segurança conhecidos:**

| Versão | Checkpoint | Estado |
|---|---|---|
| Risk Engine completo | `a65014d6` | ✅ Estável |
| Gap Engine validado | `7fc259b1` | ✅ Estável |
| v2.1 Diagnostic Flow | `f74273e` | ✅ Estável |
| BASELINE v2.1 | `6922c6d` | ✅ Estável |

---

## 9. Variáveis de Ambiente

Todas as variáveis são injetadas automaticamente pela plataforma Manus. Não commitar `.env`.

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão MySQL/TiDB |
| `JWT_SECRET` | Assinatura de cookies de sessão |
| `OPENAI_API_KEY` | Chamadas ao LLM (invokeLLM) |
| `BUILT_IN_FORGE_API_KEY` | APIs built-in Manus (server-side) |
| `VITE_APP_ID` | OAuth application ID |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Dados do owner para notificações |

---

## 10. Checklist de Entrega de Feature

Antes de marcar qualquer feature como DONE:

- [ ] TypeScript: `npx tsc --noEmit` → 0 erros
- [ ] Testes vitest escritos e passando (100%)
- [ ] Persistência validada no banco (dados gravados e recuperados)
- [ ] Evidência visual (screenshot ou log de output)
- [ ] `todo.md` atualizado com item marcado como `[x]`
- [ ] Commit com mensagem descritiva
- [ ] `webdev_save_checkpoint` executado
- [ ] Documentação atualizada (se feature crítica)

---

## 11. Contatos e Recursos

| Recurso | URL / Referência |
|---|---|
| Plataforma (dev) | https://3000-ik11uudjlm6c7nvuw4470-fb9680b9.us2.manus.computer |
| Domínio produção | iasolaris.manus.space |
| Repositório | GitHub (compliance-tributaria-v2) |
| Baseline técnica | `docs/BASELINE-v2.2.md` |
| Status das sprints | `docs/SPRINT-STATUS-REPORT.md` |
| Histórico de sprint | `docs/SPRINT-HISTORICO-MENU-QUESTIONARIOS.md` |
| Docs TASK 3R | `docs/task3r1_hard_validation_report.md` |
| Docs TASK 4.1 | `docs/task4_1_gap_engine_validation.md` |

---

*Documento gerado automaticamente em 20/03/2026 — IA SOLARIS Compliance Tributária*
