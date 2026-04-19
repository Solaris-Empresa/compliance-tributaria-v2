# PLAYBOOK DA PLATAFORMA — IA SOLARIS Compliance Tributária

| Campo | Valor |
|---|---|
| **Versão** | 3.0 |
| **Data** | 23 de Março de 2026 |
| **Sprint de referência** | v5.3.0 (versão atual em produção) |
| **Versão anterior** | v2.2 (20/03/2026) |
| **Audiência** | Equipe de desenvolvimento, Product Owner, stakeholders técnicos |

> **Histórico de versões:**
> v1.0 (Sprint V60) → v2.0 (Sprint V69) → v2.1 (Sprint V74) → v2.2 (20/03/2026) → **v3.0 (23/03/2026, Sprint v5.3.0)**
>
> **Mudanças desta versão:** Incorporação da arquitetura de diagnóstico dual V1/V3 (ADR-005 a ADR-008), Shadow Mode com protocolo de migração, gate de retrocesso com limpeza de dados (ADR-007), suite de validação automatizada Onda 1 + Onda 2 (107/107 ✅), protocolo UAT com advogados, tabela de checkpoints atualizada, novos padrões de código para `getDiagnosticSource()` e `createPool`, variável `DIAGNOSTIC_READ_MODE` documentada, e seção de motores de negócio expandida com Consistency Engine (implementado).

---

## Sumário

1. Visão Geral do Produto
2. Princípios de Desenvolvimento
3. Fluxo de Desenvolvimento de Novas Features
4. Padrões de Código
5. Banco de Dados
6. Testes
7. Motores de Negócio
8. **Arquitetura de Diagnóstico Dual V1/V3** *(novo v3.0)*
9. **Shadow Mode — Protocolo de Migração** *(novo v3.0)*
10. **Suite de Validação Automatizada** *(novo v3.0)*
11. **Protocolo UAT com Advogados** *(novo v3.0)*
12. Fluxo de Rollback
13. Variáveis de Ambiente
14. Checklist de Entrega de Feature
15. Contatos e Recursos

---

## 1. Visão Geral do Produto

A **IA SOLARIS** é uma plataforma SaaS de compliance tributário que guia empresas pela adequação à Reforma Tributária Brasileira (EC 132/2023, LC 214/2025 e LC 227/2024). O produto combina um motor de requisitos regulatórios canônicos com inteligência artificial generativa para produzir diagnósticos, planos de ação e relatórios de risco personalizados.

**Proposta de valor central:** Transformar 499 requisitos legais complexos em um diagnóstico empresarial acionável, com exposição ao risco de compliance, identificação de gaps e plano de mitigação priorizado.

### Estado atual da plataforma (23/03/2026)

| Indicador | Valor |
|---|---|
| Projetos no banco | 2.145 |
| Usuários cadastrados | 1.497 |
| CNAEs com embedding | 1.332 / 1.332 (100%) |
| Documentos no corpus RAG | 1.241 |
| Testes automatizados | **107 / 107 ✅** |
| Arquivos de teste | 102 |
| Tabelas no schema | 64 |
| ADRs publicados | 8 |
| Divergências Shadow Mode | 274 (0 críticas) |
| Domínio de produção | iasolaris.manus.space |

---

## 2. Princípios de Desenvolvimento

### 2.1 Governança de Código

Toda feature nova segue o ciclo:

```
PLANEJAMENTO → IMPLEMENTAÇÃO → VALIDAÇÃO → DONE
```

Uma task só é marcada como **DONE** quando:
1. Código funcionando e TypeScript sem erros (`npx tsc --noEmit` → Exit 0)
2. Testes vitest escritos e passando (100%)
3. Persistência validada no banco
4. Evidência visual (screenshot ou log)
5. Checkpoint salvo (`webdev_save_checkpoint`)
6. **Commit no GitHub com mensagem descritiva** *(reforçado v3.0)*

### 2.2 Rastreabilidade Obrigatória

Todos os dados críticos devem ter rastreabilidade completa:
- `canonical_id` em todas as perguntas e gaps
- `session_id` em todas as respostas e análises
- `audit_trail` para operações de diagnóstico
- `created_at` e `updated_at` em todas as tabelas
- **`projectAuditLog`** para operações de retrocesso (novo v3.0)

### 2.3 Score Honesto

A regra de score é: **score = 100% somente se improve == 0 e rejected == 0**. Nunca inflar métricas. O score_real é sempre `OK / total`.

### 2.4 Coexistência de Motores *(novo v3.0)*

A plataforma mantém dois motores de diagnóstico coexistentes (V1 e V3). O campo `flowVersion` em cada projeto determina qual motor serve os dados. **Toda leitura de diagnóstico deve passar pelo adaptador `getDiagnosticSource()`** — nunca acessar as tabelas de diagnóstico diretamente.

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
2. git push github main
3. webdev_save_checkpoint
4. Verificar screenshot do preview
```

### 3.4 Features que Tocam o Diagnóstico *(novo v3.0)*

Se a feature lê ou escreve dados de diagnóstico (briefing, matrizes, plano de ação), seguir o fluxo adicional:

```
1. Usar getDiagnosticSource(projectId) para leitura — NUNCA acessar tabelas diretamente
2. Para escrita no fluxo V3: usar as tabelas *V3 (briefingContentV3, etc.)
3. Para retrocesso: chamar cleanupOnRetrocesso() — não deletar dados manualmente
4. Registrar operação em projectAuditLog
5. Verificar no Shadow Monitor se novas divergências foram introduzidas
```

---

## 4. Padrões de Código

### 4.1 Importações Críticas

```typescript
// ✅ CORRETO — useAuth
import { useAuth } from "@/_core/hooks/useAuth";

// ✅ CORRETO — db (query helpers)
import * as db from "../db";

// ✅ CORRETO — db (acesso direto ao pool)
import { getDb } from "../db";
const database = await getDb();
if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

// ✅ CORRETO — uuid
import { v4 as uuidv4 } from "uuid";

// ✅ CORRETO — tRPC procedure
import { protectedProcedure, router } from "../_core/trpc";

// ✅ CORRETO — adaptador de diagnóstico (novo v3.0)
import { getDiagnosticSource, getDiagnosticReadMode } from "../diagnostic-source";

// ✅ CORRETO — gate de retrocesso (novo v3.0)
import { cleanupOnRetrocesso } from "../retrocesso-cleanup";
```

### 4.2 Estrutura de Router tRPC

```typescript
// server/routers/<feature>Router.ts
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

export const featureRouter = router({
  create: protectedProcedure
    .input(z.object({ /* ... */ }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // lógica...
    }),
});
```

### 4.3 Regra de Tamanho de Router

Routers com mais de 150 linhas devem ser extraídos para sub-routers em `server/routers/<feature>.ts`. Isso evita falhas de inferência de tipos do LSP.

### 4.4 Padrão de Engine Pura

Engines de negócio (`gapEngine.ts`, `riskEngine.ts`, `consistencyEngine.ts`) devem ser **funções puras** sem acesso direto ao banco. O banco é acessado apenas nos routers. Isso facilita os testes vitest (sem mocks de banco).

```typescript
// ✅ CORRETO — engine pura
export function classifyRisk(input: GapInput): RiskItem { /* ... */ }

// ✅ CORRETO — router usa a engine
const riskItem = classifyRisk({ canonicalId, gapStatus, normativeType });
await database.insert(riskAnalysis).values({ ...riskItem });
```

### 4.5 Padrão de Conexão em Testes *(novo v3.0)*

Testes que acessam o banco devem usar `createPool` (não `createConnection`) para evitar conflitos quando múltiplos arquivos rodam em paralelo.

```typescript
// ✅ CORRETO — createPool por arquivo de teste
import mysql from "mysql2/promise";

let pool: mysql.Pool;

beforeAll(async () => {
  pool = mysql.createPool({
    host: /* ... */,
    connectionLimit: 5,
    ssl: { rejectUnauthorized: false },
  });
});

afterAll(async () => {
  await pool.end();
});
```

```typescript
// ❌ ERRADO — createConnection causa conflitos em paralelo
const conn = await mysql.createConnection({ /* ... */ });
```

### 4.6 Tratamento de JSON Nativo do mysql2 *(novo v3.0)*

O driver mysql2 retorna colunas JSON como objetos JavaScript nativos (não como strings). Nunca chamar `JSON.parse()` diretamente em valores de colunas JSON.

```typescript
// ✅ CORRETO — tratar JSON nativo
const value = row.stepHistory;
const parsed = typeof value === "string" ? JSON.parse(value) : value;

// ❌ ERRADO — causa "Unexpected end of JSON input" quando o valor já é objeto
const parsed = JSON.parse(row.stepHistory);
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
| Tabelas V3 (diagnóstico dual) | `camelCase` com sufixo V3 | `questionnaireAnswersV3` |
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

### 5.4 Tabelas de Diagnóstico Dual *(novo v3.0)*

O schema mantém colunas paralelas para suportar os dois motores:

| Coluna V1 (legado) | Coluna V3 (novo) | Tabela |
|---|---|---|
| `briefingContent` | `briefingContentV3` | `projects` |
| `riskMatricesData` | `riskMatricesDataV3` | `projects` |
| `actionPlansData` | `actionPlansDataV3` | `projects` |
| `questionnaireAnswers` | `questionnaireAnswersV3` (tabela separada) | `projects` / `questionnaireAnswersV3` |

**Regra:** Nunca ler essas colunas diretamente. Sempre usar `getDiagnosticSource(projectId)`.

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
4. Integração entre funções (`runXxxAnalysis`)

### 6.3 Executar Testes

```bash
# Todos os testes
pnpm vitest run

# Apenas um arquivo
pnpm vitest run server/gapEngine.test.ts

# Suite Onda 1 (75 asserções)
pnpm vitest run server/onda1-t01-t05.test.ts server/onda1-t06-t10.test.ts

# Suite Onda 2 (32 asserções)
pnpm vitest run server/onda2-t11-carga.test.ts server/onda2-t12-t13.test.ts server/onda2-t14-retrocesso.test.ts

# Watch mode
pnpm vitest
```

### 6.4 Suite de Validação Onda 1 + Onda 2 *(novo v3.0)*

A plataforma possui 107 testes de stress e integração organizados em duas ondas:

| Suite | Arquivo | Foco | Asserções |
|---|---|---|---|
| T01–T05 | `onda1-t01-t05.test.ts` | Criação paralela, race conditions, retrocesso, persistência, limpeza | 37 |
| T06–T10 | `onda1-t06-t10.test.ts` | Leituras concorrentes, integridade, auditoria, permissões, rollback | 38 |
| T11 | `onda2-t11-carga.test.ts` | 50 projetos em paralelo, race conditions extremas | 9 |
| T12–T13 | `onda2-t12-t13.test.ts` | Integridade de CNAEs e respostas do questionário | 13 |
| T14 | `onda2-t14-retrocesso.test.ts` | Retrocesso múltiplo acumulado, loop adversarial 10x | 10 |
| **Total** | | | **107 / 107 ✅** |

---

## 7. Motores de Negócio

### 7.1 Gap Engine — Referência Rápida

```
Resposta "sim"           → compliant (não entra no denominador de gaps)
Resposta "nao"           → nao_compliant + severity alta
Resposta "parcial"       → parcial + severity media
Resposta "nao_aplicavel" → excluído do score

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

### 7.3 Consistency Engine *(implementado v3.0)*

O `consistencyEngine.ts` realiza análise determinística e IA de consistência dos dados do projeto:

```
Análise determinística:
  - Faturamento vs. porte declarado
  - Regime tributário vs. faturamento
  - Número de funcionários vs. porte
  - CNAE vs. setor declarado

Análise IA (GPT-4.1):
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

### 7.4 Motor de IA Generativa — Referência Rápida

O pipeline de IA tem 5 etapas sequenciais com 7 pontos de integração com GPT-4.1:

| Etapa | Procedure | Temperatura | Timeout |
|---|---|---|---|
| 1 — Extração de CNAEs | `extractCnaes` | 0.1 | **25s** (fallback semântico) |
| 1b — Refinamento | `refineCnaes` | 0.2 | 180s |
| 2 — Questionário | `generateQuestions` | 0.3 | 180s |
| 3 — Briefing | `generateBriefing` | 0.2 | 180s |
| 4 — Matrizes de Riscos | `generateRiskMatrices` | 0.1 | 180s |
| 5 — Plano de Ação | `generateActionPlan` | 0.2 | 180s |
| 5b — Decisão Executiva | `generateDecision` | 0.35 | 180s |

**Fallback semântico do `extractCnaes`:** Se o GPT-4.1 não responder em 25s, o sistema retorna os top-5 CNAEs por similaridade de cosseno do cache de embeddings. O frontend exibe um banner amber informativo.

---

## 8. Arquitetura de Diagnóstico Dual V1/V3 *(novo v3.0)*

### 8.1 Contexto

A plataforma mantém dois motores de diagnóstico coexistentes para garantir compatibilidade retroativa com os 2.145 projetos existentes. O campo `flowVersion` na tabela `projects` determina qual motor serve cada projeto.

### 8.2 Adaptador `getDiagnosticSource()`

**Regra de ouro:** Toda leitura de dados de diagnóstico deve passar por este adaptador. Nunca acessar as colunas de diagnóstico diretamente.

```typescript
// server/diagnostic-source.ts
import { getDiagnosticSource } from "../diagnostic-source";

// ✅ CORRETO — usar o adaptador
const source = await getDiagnosticSource(projectId);
const briefing = source.briefingContent; // normalizado para ambos os fluxos

// ❌ ERRADO — acesso direto às colunas
const project = await db.getProjectById(projectId);
const briefing = project.briefingContentV3 ?? project.briefingContent; // não fazer isso
```

### 8.3 Fases de Implementação (ADR-005)

| Fase | Escopo | Status |
|---|---|---|
| F-01 | Criação do `diagnostic-source.ts` + 75 testes unitários | ✅ Concluído |
| F-02A–D | Migração de 121 leituras diretas para o adaptador | ✅ Concluído |
| F-03 | Gate de limpeza no retrocesso (`retrocesso-cleanup.ts`) | ✅ Concluído |
| F-04 | Estratégia de migração de schema (ADR-008) | 🔄 Em implementação |

### 8.4 Gate de Retrocesso (ADR-007)

Ao retroceder da Etapa N para N-1, o sistema executa `cleanupOnRetrocesso()` automaticamente via `saveStep` no `flowRouter.ts`. O gate:
1. Remove fisicamente os dados gerados pela IA na Etapa N
2. Registra a operação em `projectAuditLog`
3. Exibe modal de confirmação ao usuário

```typescript
// ✅ CORRETO — retrocesso via flowRouter (gate automático)
await trpc.flow.saveStep.mutate({ projectId, step: currentStep - 1 });

// ❌ ERRADO — deletar dados manualmente sem passar pelo gate
await db.delete(briefingTable).where(eq(briefingTable.projectId, projectId));
```

---

## 9. Shadow Mode — Protocolo de Migração *(novo v3.0)*

### 9.1 Variável de Controle

A variável `DIAGNOSTIC_READ_MODE` controla o comportamento do adaptador:

| Valor | Comportamento | Quando usar |
|---|---|---|
| `legacy` | Apenas V1. Padrão de produção | Antes da migração completa |
| `shadow` | V1 + V3 em paralelo. V1 retornado ao usuário. Divergências registradas | Durante o período de observação |
| `new` | Apenas V3 | Após UAT aprovado e 0 divergências críticas |

**Atenção:** Nunca alterar para `new` sem aprovação formal do UAT.

### 9.2 Critérios para Ativar o Modo `new`

1. **0 divergências críticas** (tipo "ambos com valores diferentes")
2. **0 projetos UAT com divergência**
3. **Total de divergências ≤ 288** (5% acima do baseline de 274)
4. **UAT aprovado** (≥ 80% de aprovação nos 8 cenários, feedback jurídico positivo)

### 9.3 Monitoramento

O Shadow Monitor está disponível em `/admin/shadow-monitor` (acesso restrito a `equipe_solaris`). Verificar:
- **T+24h** após qualquer deploy que toque o diagnóstico
- **T+48h e T+72h** durante o período de UAT
- Sempre que `DIAGNOSTIC_READ_MODE` for alterado

### 9.4 Rollback Rápido

Se divergências críticas surgirem após ativar o modo `new`:

```bash
# Rollback imediato — apenas mudança de variável de ambiente (sem deploy)
# 1. Acessar Manus → Settings → Secrets
# 2. Alterar DIAGNOSTIC_READ_MODE de "new" para "legacy"
# 3. Tempo estimado: < 2 minutos
```

---

## 10. Suite de Validação Automatizada *(novo v3.0)*

### 10.1 Executar a Suite Completa

```bash
# Suite completa (107 testes)
pnpm vitest run server/onda1-t01-t05.test.ts \
                 server/onda1-t06-t10.test.ts \
                 server/onda2-t11-carga.test.ts \
                 server/onda2-t12-t13.test.ts \
                 server/onda2-t14-retrocesso.test.ts

# Resultado esperado: 107/107 ✅ em < 5s
```

### 10.2 Métricas de Performance (Baseline 23/03/2026)

| Operação | Tempo Medido | Limite Aceitável |
|---|---|---|
| 50 projetos criados em paralelo | 141ms | 10.000ms |
| 50 updates concorrentes | 38ms | 8.000ms |
| 35 inserts CNAE em paralelo | 67ms | 8.000ms |
| Retrocesso loop adversarial 10x | < 1s | 5.000ms |
| Deadlocks detectados | 0 | 0 |

### 10.3 Quando Executar a Suite

A suite deve ser executada obrigatoriamente:
- Antes de qualquer deploy para produção
- Após alterações no schema do banco (`pnpm db:push`)
- Após alterações em `diagnostic-source.ts`, `retrocesso-cleanup.ts` ou `flowRouter.ts`
- Após alterações nas tabelas `projects`, `questionnaireAnswersV3` ou `projectAuditLog`

---

## 11. Protocolo UAT com Advogados *(novo v3.0)*

### 11.1 Documentos de Referência

| Documento | Localização | Descrição |
|---|---|---|
| Guia UAT v2 | `docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md` | 8 cenários, critérios de aceite, formulário de feedback |
| Baseline Shadow Monitor | `docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md` | Estado T=0, protocolo T+24/48/72h |
| E-mail modelo | `docs/product/cpie-v2/produto/EMAIL-MODELO-CONVITE-UAT.md` | Template de convite para advogados |

### 11.2 Prefixo Obrigatório

Todos os projetos criados durante o UAT devem usar o prefixo `[UAT]` no nome. Isso permite:
- Monitoramento automático no Shadow Monitor (`/admin/shadow-monitor` → aba "Progresso UAT")
- Limpeza pós-UAT via SQL: `DELETE FROM projects WHERE name LIKE '[UAT]%'`
- Separação dos projetos de teste dos projetos reais

### 11.3 Limpeza Pós-Testes

Antes de iniciar o UAT com advogados, remover os projetos de teste automático:

```sql
-- Remover projetos das suites Onda 1 e Onda 2
DELETE FROM projects WHERE name LIKE '[ONDA%]';

-- Verificar resultado
SELECT COUNT(*) FROM projects WHERE name LIKE '[ONDA%]';
-- Esperado: 0
```

---

## 12. Fluxo de Rollback

Em caso de problema crítico:

```bash
# 1. Identificar checkpoint estável
git log --oneline --no-pager

# 2. Rollback via UI do Manus (preferencial)
# Clicar em "Rollback" no checkpoint desejado

# 3. Ou via webdev_rollback_checkpoint
# (informar version_id do checkpoint)
```

### Checkpoints de segurança conhecidos

| Versão | Checkpoint | Data | Estado |
|---|---|---|---|
| TypeScript limpo (tsc Exit 0) | `a45bcead` | 23/03/2026 | ✅ Estável |
| Documentação v6.0/v5.0 | `0774db0c` | 23/03/2026 | ✅ Estável |
| Kit UAT completo | `1f079c80` | 23/03/2026 | ✅ Estável |
| Onda 2 completa (107/107) | `d19d193b` | 23/03/2026 | ✅ Estável |
| Onda 1 completa (75/75) | `f10cc327` | 22/03/2026 | ✅ Estável |
| ADR-007 gate retrocesso | `270f5f78` | 22/03/2026 | ✅ Estável |
| ADR-005 diagnóstico dual | `3a49480b` | 21/03/2026 | ✅ Estável |
| v2.1 Diagnostic Flow | `f74273e` | 20/03/2026 | ✅ Estável |
| Risk Engine completo | `a65014d6` | — | ✅ Estável |
| Gap Engine validado | `7fc259b1` | — | ✅ Estável |
| BASELINE v2.1 | `6922c6d` | — | ✅ Estável |

---

## 13. Variáveis de Ambiente

Todas as variáveis são injetadas automaticamente pela plataforma Manus. Não commitar `.env`.

| Variável | Uso | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Conexão MySQL/TiDB | **Sim** |
| `JWT_SECRET` | Assinatura de cookies de sessão | **Sim** |
| `OPENAI_API_KEY` | Chamadas ao LLM GPT-4.1 e embeddings | **Sim** |
| `VITE_APP_ID` | OAuth application ID | **Sim** |
| `OAUTH_SERVER_URL` | Backend Manus OAuth | **Sim** |
| `VITE_OAUTH_PORTAL_URL` | Portal de login Manus (frontend) | **Sim** |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Dados do owner para notificações | **Sim** |
| `BUILT_IN_FORGE_API_KEY` | APIs built-in Manus (server-side) | **Sim** |
| `BUILT_IN_FORGE_API_URL` | URL base das APIs Manus | **Sim** |
| `VITE_FRONTEND_FORGE_API_KEY` | APIs Manus (frontend) | **Sim** |
| `DIAGNOSTIC_READ_MODE` | Controle do motor de diagnóstico | **Sim** |

> **Atenção crítica — `DIAGNOSTIC_READ_MODE`:** Valores aceitos: `legacy`, `shadow`, `new`. O valor padrão é `legacy`. Alterar para `new` somente após aprovação formal do UAT com todos os critérios atendidos (0 divergências críticas, ≥ 80% de aprovação nos cenários UAT).

> **Atenção crítica — `OPENAI_API_KEY`:** A ausência desta variável causa o erro "OPENAI_API_KEY is not configured" no servidor, fazendo o `extractCnaes` falhar silenciosamente e o modal de CNAEs abrir vazio.

---

## 14. Checklist de Entrega de Feature

Antes de marcar qualquer feature como DONE:

- [ ] TypeScript: `npx tsc --noEmit` → 0 erros (Exit 0)
- [ ] Testes vitest escritos e passando (100%)
- [ ] Persistência validada no banco (dados gravados e recuperados)
- [ ] Evidência visual (screenshot ou log de output)
- [ ] `todo.md` atualizado com item marcado como `[x]`
- [ ] Commit com mensagem descritiva (`git commit -m "feat: descrição"`)
- [ ] Push no GitHub (`git push github main`)
- [ ] `webdev_save_checkpoint` executado
- [ ] Documentação atualizada (se feature crítica)
- [ ] **Suite Onda 1+2 executada (se feature toca diagnóstico)** *(novo v3.0)*
- [ ] **Shadow Monitor verificado (se feature toca diagnóstico)** *(novo v3.0)*

---

## 15. Contatos e Recursos

| Recurso | URL / Referência |
|---|---|
| Plataforma (dev) | https://3000-ik11uudjlm6c7nvuw4470-fb9680b9.us2.manus.computer |
| Domínio produção | https://iasolaris.manus.space |
| Repositório GitHub | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| Shadow Monitor | `/admin/shadow-monitor` (acesso: equipe_solaris) |
| Admin Embeddings | `/admin/embeddings` (acesso: equipe_solaris) |
| Requisitos Funcionais | `docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md` |
| Documentação IA | `docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md` |
| Guia UAT | `docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md` |
| Baseline Shadow Monitor | `docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md` |
| Relatório de Testes | `docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md` |
| ADR-001 | `docs/product/cpie-v2/produto/ADR-001-arquitetura-diagnostico.md` |
| ADR-005 | `docs/product/cpie-v2/produto/ADR-005-isolamento-fisico-diagnostico.md` |
| ADR-007 | `docs/product/cpie-v2/produto/ADR-007-gate-limpeza-retrocesso.md` |
| ADR-008 | `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` |

---

*Documento atualizado em 23/03/2026 — IA SOLARIS Compliance Tributária v3.0 (Sprint v5.3.0)*
*Versão anterior: v2.2 (20/03/2026)*
*Próxima revisão prevista: Após ativação do modo `new` (Sprint v5.4.0)*
*Mantido por: Equipe SOLARIS*
