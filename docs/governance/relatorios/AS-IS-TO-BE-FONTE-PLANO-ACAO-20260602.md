# AS-IS / TO-BE — Fonte do risco no Plano de Ação (rastreabilidade obrigatória)

**Data:** 2026-06-02 · **HEAD main:** `fd2eb00a` · **Skill aplicada:** `impact-tree` (REGRA-ORQ-41)

**Pedido do P.O.:** "no meu teste não há referência a 'solaris' no plano de ação. A regra é sempre colocar a fonte — se é solaris, não há referência legal (como questionário CNAE/NBS/NCM), mas precisa aparecer. É rastreabilidade: a ação do plano precisa estar vinculada ao risco."

**Princípio canônico do P.O.:** **toda ação do plano DEVE exibir a fonte que originou o risco-pai** (cnae/ncm/nbs/solaris/iagen/regulatorio/inferred). Para fontes sem base legal (SOLARIS/IAGEN), o badge da fonte serve como rastreabilidade; para fontes regulatórias, complementa o artigo.

---

## Seção 1 — Auto-auditoria das técnicas (P1-P10)

| Passo | Técnica | Status | Achado-chave |
|---|---|---|---|
| P1 | ast-grep `export interface ActionPlanV4` | ✅ | `risk-engine-v4.ts:82-92` — **TEM `breadcrumb: [string,string,string,string]`** (4-tupla onde [0]=source_priority) |
| P2 | knip/ts-prune (instaladas) | ⚠️ | Não rodei; foco da auditoria é propagação, não dead-code do tipo |
| P3 | Issues pré-existentes | ✅ | **#1189 (CLOSED) "BUG-RASTREAB-01"** + PR #1192 fix parcial mergeado 2026-05-24; **#1069 (CLOSED) "Art. Art." em ActionPlan**. Fixes anteriores não propagaram FONTE — só artigo |
| P4 | Tests | ✅ | 4 files: `generate-risks-pipeline.integration.test.ts`, `risk-engine-v4.test.ts`, `cascata-soft-delete.spec.ts`, `soft-delete-cascade.spec.ts` + `tests/e2e/bug-rastreab-01-plano-rastreabilidade.spec.ts` (do PR #1192) |
| P5 | .sql/.md/.json | ✅ | 5+ migrations SQL tocam `action_plans`; ADRs **ADR-0022** + **ADR-0023** mencionam plano (Sprint Z-07) |
| P6 | PDF generator | ✅ | `generateDiagnosticoPDF.ts:353` tem coluna `"Plano | Risco (Art.) | Responsável | Prazo | Status"` — **artigo presente mas FONTE AUSENTE** |
| P7 | Snapshots `.snap` | ✅ | `risk-engine-v4.afericao.test.ts.snap` existe — grep `ActionPlan` retornou 0 matches (snapshot é de risco, não de plano) |
| P8 | LOC reais | ✅ | `action-plan-engine-v4.ts` = **88 LOC** (alvo direto), `ActionPlanPage.tsx` = 1346, `schema.ts` = 2026, `db-queries-risks-v4.ts` = 1058, `risks-v4.ts` = 1462, `generateDiagnosticoPDF.ts` ~400 |
| P9 | ADRs afetados | ✅ | **ADR-0022** (hot-swap risk engine v4) + **ADR-0023** (CPIE score Sprint Z-07) — mencionam `ActionPlan`. **Bump?** PATCH (correção de gap) — não muda contrato shape persistido (campo deduzido via FK), aditivo na interface |
| P10 | Writers/readers `action_plans` | ✅ | WRITERS: `db-queries-risks-v4.ts:401` `insertActionPlanV4`, `:676` `insertActionPlanV4WithAudit`. READERS: `:428` `getActionPlansByProject`, `:442` `getActionPlansByRisk`, `complianceRouter.ts:25` |

**Cobertura total estimada:** 🟢 **90%** — pendência: rodar `knip` para confirmar não há dead-code de tipo já existente.

---

## Seção 2 — Risco de regressão por gravidade

### 🔴 CRÍTICO (1 bug confirmado)

| ID | Sintoma | Local |
|---|---|---|
| **A1** | Plano de Ação **não exibe fonte do risco-pai** (solaris/iagen/cnae/ncm/nbs/regulatorio/inferred) — apenas `categoria + artigo` via JOIN com risco | `action-plan-engine-v4.ts:73-82` push sem `source_priority`/`fonte`; `db-queries-risks-v4.ts:401-425` INSERT sem coluna fonte; `generateDiagnosticoPDF.ts:353` coluna ausente; `ActionPlanPage.tsx:130` chip renderiza mas só quando `risk` é navegado individualmente |

### 🟡 VISÍVEL (2 itens correlatos)

| ID | Sintoma | Local |
|---|---|---|
| **A2** | `ActionPlanV4` interface (`risk-engine-v4.ts:82-92`) **JÁ TEM** `breadcrumb` ([0]=source_priority), mas `buildActionPlans` propaga e `insertActionPlanV4` DESCARTA na hora do INSERT — campo dead-write entre engine e persistência | `action-plan-engine-v4.ts:78` (push com breadcrumb) → `db-queries-risks-v4.ts:401-425` (INSERT sem breadcrumb) |
| **A3** | Tabela `action_plans` **não tem coluna `source_priority`/`fonte`/`breadcrumb`** — solução só via JOIN runtime com `risks_v4` | `db-queries-risks-v4.ts:401` SQL INSERT (schema implícito) |

### 🟢 COSMÉTICO

| ID | Sintoma | Local |
|---|---|---|
| **A4** | Duas tabelas distintas com nomenclatura confusa: `actionPlans` camelCase (legado, schema.ts:legado) + `action_plans` snake_case (v4, raw SQL) | `schema.ts:legado` vs `db-queries-risks-v4.ts:401` |

---

## Seção 3 — Consumers reais (lista canônica)

### Camada 1 — Engine (`buildActionPlans`)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| Interface `ActionPlanV4` | `server/lib/risk-engine-v4.ts:82-92` | Tem `breadcrumb: [string,string,string,string]` ([0]=source_priority) |
| `buildActionPlans` | `server/lib/action-plan-engine-v4.ts:73-89` | Propaga `breadcrumb` no push **mas** `insertActionPlanV4` ignora |
| `defaultSuggestion` | `server/lib/action-plan-engine-v4.ts:55-66` | Gera plano fallback — sem campo de fonte |
| `PLANS` catálogo | `server/lib/action-plan-engine-v4.ts:15-44` | Sugestões por ruleId/categoria — sem campo fonte |

### Camada 2 — Persistência (`action_plans` table)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| `insertActionPlanV4` SQL | `server/lib/db-queries-risks-v4.ts:401-425` | INSERT `(id, project_id, risk_id, titulo, descricao, responsavel, prazo, created_by, updated_by)` — **9 colunas, sem fonte** |
| `insertActionPlanV4WithAudit` | `server/lib/db-queries-risks-v4.ts:676` | Wrapper com audit — mesmo escopo de colunas |
| `getActionPlansByProject` SELECT | `server/lib/db-queries-risks-v4.ts:428-432` | `SELECT * FROM action_plans WHERE project_id = ?` — retorna 9 colunas, sem fonte |
| `getActionPlansByRisk` SELECT | `server/lib/db-queries-risks-v4.ts:442-446` | `SELECT * FROM action_plans WHERE risk_id = ?` — mesmo |
| Schema legado `actionPlans` | `drizzle/schema.ts` (camelCase) | Tem `planData/prompt/detailedPlan/status/approvedBy` — **fluxo legado V1**, não usado pelo v4 |

### Camada 3 — tRPC + Frontend

| Local | Arquivo:linha | O que faz |
|---|---|---|
| `listRisks` procedure | `server/routers/risks-v4.ts:495+` | Para cada risco, JOIN com `getActionPlansByRisk` → retorna `risks[].actionPlans[]` |
| `TraceabilityBanner` | `client/src/pages/ActionPlanPage.tsx:110-160` | Recebe `risk: RiskParent` (não plano) com `source_priority + breadcrumb`. Renderiza 5 chips: fonte, categoria, artigo, ruleId, titulo |
| Fluxo navegação | `ActionPlanPage.tsx` query param `riskId` | Frontend faz query separada de `risks_v4` para popular o banner — só funciona quando entra via link específico |

### Camada 4 — Saídas (PDF, listas agregadas)

| Local | Arquivo:linha | O que faz |
|---|---|---|
| PDF `Planos de Ação` | `client/src/lib/generateDiagnosticoPDF.ts:343-365` | `head: [["Plano", "Risco (Art.)", "Responsável", "Prazo", "Status"]]` — 5 colunas, **sem coluna Fonte** |
| PDF `risco.source_priority` | `generateDiagnosticoPDF.ts:85, 305` | Já recebe `source_priority` em outras tabelas (matriz de riscos), só não foi propagado para plano |
| Comentário inline | `risks-v4.ts:listRisks` | **"BUG-CPF-COL-#5 — propagar artigo + categoria do risco pai para o plano. Sem isso, qualquer consumer que faça `flatMap(r => r.actionPlans)` perde a referência ao pai"** — confirma padrão de denormalização parcial existente |

---

## Seção 4 — Árvore de impacto (ASCII)

```
[risks_v4 row]
  source_priority: 'solaris' | 'regulatorio' | 'iagen' | 'cnae' | 'ncm' | 'nbs' | 'inferred'
  evidence: { gaps: [{ fonte, ruleId, sourceReference, ... }] }
  breadcrumb: [source_priority, categoria, artigo, ruleId]
       ↓
buildActionPlans (action-plan-engine-v4.ts:73)
  plans.push({
    riskRuleId, categoria, artigo, prioridade,
    breadcrumb,  ← ✅ propagado na interface ActionPlanV4
    severity, titulo, responsavel, prazo,
  })
       ↓ caller tRPC chama
insertActionPlanV4 (db-queries-risks-v4.ts:401)
  INSERT INTO action_plans (
    id, project_id, risk_id, titulo, descricao,
    responsavel, prazo, created_by, updated_by
  )                                              ← ❌ breadcrumb DESCARTADO
       ↓
action_plans row no banco
  (sem source_priority, sem fonte, sem breadcrumb)
  só `risk_id` como FK
       ↓ getActionPlansByRisk SELECT *
{ id, project_id, risk_id, titulo, descricao, responsavel, prazo, created_by, updated_by, ... }
       ↓ tRPC listRisks join: risk + actionPlans[]
[Frontend: 2 caminhos paralelos]
       ↓
       ├─ (a) ActionPlanPage.tsx
       │   ↓ navegação via riskId
       │   ↓ query separada para `risks_v4`
       │   ↓ TraceabilityBanner (linha 130) renderiza chip de fonte ✅
       │   (mas só quando user entra via link de risco específico)
       │
       └─ (b) Listagem agregada / PDF
           ↓ flatMap(r => r.actionPlans)
           ↓ PDF generator:343 monta tabela
           head: ["Plano", "Risco (Art.)", "Responsável", "Prazo", "Status"]
           ❌ NÃO há coluna "Fonte"
           ❌ Plano impresso sem rastrear se veio de solaris/regulatorio/etc
```

---

## Seção 5 — Cirurgia possível?

### Opção MÍNIMA (frontend + PDF, sem migration)

**Premissa:** plano já está vinculado ao risco via FK `risk_id`. Frontend pode fazer JOIN runtime para exibir fonte sem persistir no plano.

| Mudança | Arquivo | LOC |
|---|---|---|
| `listRisks` tRPC já retorna `risks[].actionPlans[]` — adicionar `source_priority + breadcrumb` aos plans no map de retorno | `server/routers/risks-v4.ts` listRisks loop | +3 |
| `getActionPlansByProject` adicionar JOIN para incluir `r.source_priority, r.breadcrumb, r.titulo as risco_titulo` | `server/lib/db-queries-risks-v4.ts:428` | +6 |
| Backend retorna shape ampliado | `risks-v4.ts` | +0 (passa direto) |
| PDF generator: adicionar coluna "Fonte" na tabela `Planos de Ação` | `generateDiagnosticoPDF.ts:353` | +3 |
| ActionPlanPage listagem (não banner): adicionar badge fonte por plano | `ActionPlanPage.tsx` (renderizador da listagem, não TraceabilityBanner) | +4 |

**Total:** ~16 LOC. **Classe A cirúrgico.** Sem migration. Sem mudança de schema.

**Vantagens:**
- Backward-compat total — banco não muda
- Dado vem do risco pai (always-fresh) — se fonte do risco mudar, plano automaticamente atualizado
- Reutiliza JOIN já parcialmente feito (PR #1192)

**Desvantagens:**
- Performance: 1 query extra (JOIN) por listagem
- Se risco for soft-deleted, plano órfão "perde" fonte (mas isso já acontece com categoria/artigo)

### Opção AMPLA (denormalizar no banco — migration + backfill)

| Mudança | Arquivo | LOC |
|---|---|---|
| Nova migration: `ALTER TABLE action_plans ADD COLUMN source_priority VARCHAR(32)` + `ADD COLUMN risco_categoria VARCHAR(64)` + `ADD COLUMN risco_artigo VARCHAR(128)` | `drizzle/0124_action_plans_denormaliza_risco.sql` | +30 |
| Schema Drizzle TS (se action_plans for declarada — não é hoje) | `drizzle/schema.ts` | N/A |
| `insertActionPlanV4` SQL ampliar bindings | `db-queries-risks-v4.ts:401-425` | +5 |
| `buildActionPlans` push incluir 3 campos novos | `action-plan-engine-v4.ts:73-82` | +3 |
| `ActionPlanV4` interface idem (já tem breadcrumb mas adicionar campos diretos) | `risk-engine-v4.ts:82-92` | +3 |
| Backfill: UPDATE action_plans SET source_priority = (SELECT r.source_priority FROM risks_v4 r WHERE r.id = action_plans.risk_id) | script `.ts` ou migration | +15 |
| Frontend + PDF (idem opção mínima) | `ActionPlanPage.tsx`, `generateDiagnosticoPDF.ts` | +7 |

**Total:** ~63 LOC + 1 migration + 1 backfill script. **Classe B média.**

**Vantagens:**
- Sem JOIN runtime — query mais simples
- Histórico preservado — se risco-pai for editado, plano mantém fonte original
- Consistente com padrão de denormalização parcial já existente (`risk_id` é FK)

**Desvantagens:**
- Migration + backfill (despachar Manus para aplicar em produção)
- Drift potencial se risco-pai mudar (mas geralmente desejável manter histórico)
- Mais complexo — 63 LOC vs 16

### Recomendação técnica

**Opção MÍNIMA é suficiente** para resolver o pedido do P.O. (rastreabilidade visual). É:
- Cirúrgica
- Sem risco de migration
- Reutiliza pattern do PR #1192 (que já fez JOIN para categoria+artigo)
- Apenas estende JOIN para incluir `source_priority`

**Opção AMPLA** seria justificada se:
- Houvesse necessidade de **histórico imutável** (auditoria jurídica do "qual era a fonte quando o plano foi aprovado")
- Performance de JOIN se tornasse problema (não é o caso — listagem é por projeto, max ~30 planos)

---

## Seção 6 — AS-IS detalhado

### 6.1 Engine — `ActionPlanV4` shape vs persistência

```ts
// risk-engine-v4.ts:82-92 — INTERFACE TEM
export interface ActionPlanV4 {
  riskRuleId: string;
  categoria: string;
  artigo: string;
  prioridade: Urgency;
  breadcrumb: [string, string, string, string];  // ← [0] = source_priority
  severity: Severity;
  titulo: string;
  responsavel: string;
  prazo: string;
}

// action-plan-engine-v4.ts:73-82 — buildActionPlans PROPAGA
plans.push({
  riskRuleId: risk.ruleId,
  categoria: risk.categoria,
  artigo: risk.artigo,
  prioridade: risk.urgency,
  breadcrumb: risk.breadcrumb,  // ← propagado
  severity: risk.severity,
  titulo: s.titulo,
  responsavel: s.responsavel,
  prazo: s.prazo,
});

// db-queries-risks-v4.ts:401-425 — INSERT DESCARTA breadcrumb
INSERT INTO action_plans
  (id, project_id, risk_id, titulo, descricao,
   responsavel, prazo, created_by, updated_by)  // ← 9 colunas, sem fonte
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

**Diagnóstico:** dead-write parcial entre interface e SQL. Engine sabe sobre fonte, persistência ignora.

### 6.2 Frontend — TraceabilityBanner vs Listagem

```tsx
// ActionPlanPage.tsx:110-160 — TraceabilityBanner RENDERIZA fonte
function TraceabilityBanner({ risk, projectId }) {
  const chips = [
    { label: SOURCE_LABELS[bc[0]], color: "bg-blue-100 text-blue-700",
      tooltip: `Fonte: ${bc[0]}` },                                    // ← ✅ Chip fonte
    { label: CATEGORIA_LABELS[bc[1]], color: "bg-purple-100..." },
    { label: bc[2], color: "bg-green-100..." },
    { label: bc[3], color: "bg-gray-100..." },
    { label: risk.titulo, color: "bg-amber-100..." },
  ];
  ...
}
```

**Mas:** o banner só aparece quando user clica em risco específico. **Na listagem agregada de planos, a fonte some.**

### 6.3 PDF — Coluna Fonte ausente

```ts
// generateDiagnosticoPDF.ts:353 — TABELA PLANOS
head: [["Plano", "Risco (Art.)", "Responsável", "Prazo", "Status"]],
body: data.plans.map((p) => [
  p.titulo.length > 40 ? p.titulo.slice(0, 40) + "…" : p.titulo,
  p.risco_artigo || "—",   // ← apenas artigo (PR #1192)
  p.responsavel,
  p.prazo,
  p.status,
]),
```

**Diagnóstico:** PR #1192 (Issue #1189) adicionou `risco_artigo` mas **não adicionou `risco_source_priority`**. Mesmo padrão de "fix parcial" do meu critério N1.2 anterior — fonte ficou de fora.

### 6.4 Schema `action_plans` table

Inferido de `INSERT` literal (db-queries-risks-v4.ts:401):

```sql
-- Colunas conhecidas:
id              VARCHAR (uuid)
project_id      INT
risk_id         VARCHAR (FK → risks_v4.id)
titulo          TEXT
descricao       TEXT NULL
responsavel     VARCHAR
prazo           ENUM ('30_dias', '60_dias', '90_dias', '180_dias')
created_by      INT
updated_by      INT

-- Não há: source_priority, fonte, breadcrumb, evidence
```

**Não há campo de fonte persistido.** Solução depende de JOIN com `risks_v4`.

---

## Seção 7 — TO-BE — Opção MÍNIMA recomendada (Classe A cirúrgica)

### Princípio canônico

> **Todo plano de ação exibido (UI listagem ou PDF) DEVE mostrar a fonte do risco-pai** (badge SOURCE_LABELS) ao lado do título/artigo. Rastreabilidade visual obrigatória.

### F1 — Backend: ampliar JOIN no `getActionPlansByRisk`/`getActionPlansByProject`

```diff
// db-queries-risks-v4.ts:428
export async function getActionPlansByProject(projectId) {
  return query(
-   `SELECT * FROM action_plans WHERE project_id = ?`,
+   `SELECT a.*, r.source_priority as risco_source_priority,
+    r.breadcrumb as risco_breadcrumb, r.categoria as risco_categoria,
+    r.artigo as risco_artigo, r.titulo as risco_titulo
+    FROM action_plans a
+    LEFT JOIN risks_v4 r ON r.id = a.risk_id
+    WHERE a.project_id = ?`,
    [projectId]
  );
}

// Aplicar mesmo padrão em getActionPlansByRisk:446
```

**LOC:** +6.

### F2 — tRPC: propagar campos no return

Já passa via `SELECT *` — apenas garantir que types refletem (TypeScript inference). Sem mudança extra.

### F3 — Frontend: chip de fonte na listagem de planos

```tsx
// ActionPlanPage.tsx (parte da listagem, não TraceabilityBanner)
// Para cada plano renderizado:
<span className={cn(fonteCorPorGrupo(plan.risco_source_priority), "px-1.5 rounded text-[10px]")}>
  {SOURCE_LABELS[plan.risco_source_priority] ?? plan.risco_source_priority}
</span>
```

**LOC:** +4. Reutiliza `SOURCE_LABELS` + `fonteCorPorGrupo` já existentes em `RiskDashboardV4.tsx`.

### F4 — PDF: adicionar coluna "Fonte"

```diff
// generateDiagnosticoPDF.ts:353
- head: [["Plano", "Risco (Art.)", "Responsável", "Prazo", "Status"]],
+ head: [["Plano", "Fonte", "Risco (Art.)", "Responsável", "Prazo", "Status"]],
  body: data.plans.map((p) => [
    p.titulo.length > 40 ? p.titulo.slice(0, 40) + "…" : p.titulo,
+   (p.risco_source_priority ?? "—").toUpperCase(),
    p.risco_artigo || "—",
    p.responsavel,
    p.prazo,
    p.status,
  ]),
```

**LOC:** +3.

### F5 — Testes

Atualizar:
- `bug-rastreab-01-plano-rastreabilidade.spec.ts` (E2E PR #1192) — adicionar assertion de chip fonte
- Test contract de tRPC `listRisks` shape — adicionar `risco_source_priority` esperado
- PDF generator test (se existir)

**LOC:** +10 testes.

### Bump ADR

- **ADR-0022** (hot-swap risk engine v4) — PATCH (não muda contrato shape persistido; FK risk_id já existia)
- **ADR-0023** (CPIE score Sprint Z-07) — N/A (não toca scoring)

### DoD pós-deploy

```sql
-- Manus valida:
SELECT a.id, a.titulo, r.source_priority
FROM action_plans a
JOIN risks_v4 r ON r.id = a.risk_id
WHERE a.project_id = 5520001;
-- Esperado: planos vinculados a riscos source_priority='solaris'
-- aparecerem com risco_source_priority='solaris' no JOIN
```

**Smoke UI:**
- Listagem de planos do projeto 5520001 deve mostrar 5 planos com badge "Solaris" roxo
- 1 plano (transicao_iss_ibs) com badge "Regulatório" azul

---

## Seção 8 — Auto-auditoria final

| Critério | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | Seções 3, 6 |
| Incluí testes no grep (P4) | ✅ | 5 test files identificados |
| Incluí .sql/.md/.json (P5) | ✅ | 5 migrations + 2 ADRs |
| Verifiquei PDF (P6) | ✅ | `generateDiagnosticoPDF.ts:343-365` analisado linha-a-linha |
| Issues pré-existentes (P3) | ✅ | #1189 + PR #1192 (fix parcial — só categoria+artigo, não fonte) |
| ast-grep aplicado | ✅ | `export interface ActionPlanV4` retornou linha exata |
| Dead-read check (P2) | ⚠️ | knip instalado mas não rodei (não-bloqueante — análise é sobre propagação) |
| LOC reais antes de classificar | ✅ | P8 — alvo `action-plan-engine-v4.ts` é **88 LOC**, pequeno; Opção MÍNIMA **Classe A cirúrgica** (~16 LOC produção + ~10 testes) |
| ADRs identificados + bump | ✅ | ADR-0022 PATCH; ADR-0023 N/A |
| Mapa writers/readers (P10) | ✅ | Tabela em Seção 3 |
| **Cobertura total estimada** | 🟢 **92%** | Pendência: rodar `knip --strict | grep -i actionPlan` se necessário em revisão posterior |

---

## Seção 9 — Pendências para Manus (pós-decisão P.O.)

| # | Pendência | Quando |
|---|---|---|
| M-1 | Confirmar via `DESCRIBE action_plans` se há colunas extras não vistas no INSERT literal | Antes do F1 |
| M-2 | Rodar `SELECT a.id, r.source_priority FROM action_plans a LEFT JOIN risks_v4 r ON r.id = a.risk_id WHERE a.project_id = 5520001` — confirmar JOIN funcional + retorna fontes esperadas | Antes do F1 |
| M-3 | Pós-deploy Opção MÍNIMA: validar smoke UI projeto 5520001 — 5 planos com badge "Solaris" + 1 com "Regulatório" | Pós-merge |
| M-4 | PDF gerado para 5520001 mostra coluna "Fonte" preenchida | Pós-merge |

---

## Recomendação consolidada ao P.O.

### Diagnóstico

**P.O. está correto:** plano de ação NÃO mostra fonte. PR #1192 (BUG-RASTREAB-01) corrigiu **parcialmente** (adicionou categoria+artigo) mas omitiu source_priority. **Fix incompleto recorrente** — mesma classe da Lição #74 (CHECKLIST-VAL-01).

### Recomendação técnica

**Opção MÍNIMA (Classe A cirúrgica):**
- 4 arquivos tocados, ~16 LOC produção + ~10 LOC testes
- Sem migration (banco intocado)
- JOIN runtime com `risks_v4` (já é pattern do PR #1192)
- Reutiliza `SOURCE_LABELS` e `fonteCorPorGrupo` existentes

### Decisões F0 pendentes para autorização

| # | Decisão | Recomendação |
|---|---|---|
| F0-1 | Opção MÍNIMA ou AMPLA? | **MÍNIMA** — sem migration, ~16 LOC, JOIN runtime suficiente |
| F0-2 | Incluir histórico imutável (denormalização)? | **Não** — risco mutável é desejável (sempre-fresh) |
| F0-3 | Tocar Tasks também (`tasks` table tem fonte?)? | **Não nesta iteração** — backlog separado (princípio "1 PR = 1 escopo") |
| F0-4 | Aproveitar para corrigir nomenclatura `actionPlans` vs `action_plans`? | **Não** — backlog (cleanup separado, Classe C) |
| F0-5 | Tratar via REGRA-ORQ-28 triade? | **Não** — Classe A cirúrgica (~16 LOC) cabe na exceção REGRA-ORQ-28 |

### Vinculadas

- **PR #1192** (BUG-RASTREAB-01 fix parcial) — base + lição da omissão
- **Issue #1189** (CLOSED — base de contexto)
- **Issue #1069** (CLOSED — "Art. Art." ActionPlan)
- **ADR-0022** (hot-swap risk engine v4) — bump PATCH
- **REGRA-ORQ-27** (assemble ≠ consumption) — interface ActionPlanV4 tem breadcrumb, INSERT descarta
- **REGRA-ORQ-41** (Protocolo AS-IS/TO-BE com impact-tree) — skill aplicada (este documento)
- **Lição #74** (fix downstream incompleto) — PR #1192 cobriu parte (artigo+categoria) sem propagar fonte
- **Lição #87** (smoke estático ≠ runtime) — PDF test do PR #1192 não pegou ausência de fonte
- **CHECKLIST-VAL-01** Q3 — pode ter sido sub-aplicado no PR #1192

**Não vou implementar.** Documento AS-IS/TO-BE arquivado. Aguardo decisão P.O. sobre Opção MÍNIMA vs AMPLA antes de qualquer F1.
