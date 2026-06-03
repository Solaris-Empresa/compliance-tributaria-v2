# AS-IS / TO-BE — BUG-PLAN-TITLE (catálogo PLANS incompleto + artigo duplicado)

**Data:** 2026-06-02 · **HEAD main:** `f42df621` · **Deploy live:** `119e9988` (Manus.space)
**Skill aplicada:** `impact-tree` (REGRA-ORQ-41 — Classe A cirúrgica)
**Origem:** PDF E2E projeto 5640001 (P.O.) + análise Manus `BUG-4_ Títulos dos Planos de Ação — Análise AS-IS _ TO-BE.md`
**Renomeação:** Manus chamou "BUG-4" no arquivo; despacho usa **BUG-PLAN-TITLE** como ID canônico (BUG-4 já ocupado por `project_briefings_v3` dead table no Board Sprint 4)

---

## Sumário executivo

| Item | Status |
|---|---|
| Bug confirmado no PDF | ✅ 4/6 planos com título fallback genérico ilegível |
| Causa raiz identificada | ✅ Catálogo `PLANS` incompleto + `defaultSuggestion` duplica `risk.artigo` |
| Análise Manus aceita | ✅ Diagnóstico correto, propostas válidas |
| Crítica adicional Claude Code | 🟡 3 ajustes (3 níveis REGRA-ORQ-22) |
| Recomendação | **Opção MÍNIMA** — corrigir `defaultSuggestion` + cobertura de PLANS ampliada |

---

## Seção 1 — Auto-auditoria (P1-P10)

| Passo | Técnica | Status | Achado-chave |
|---|---|---|---|
| P1 | Leitura literal action-plan-engine-v4.ts | ✅ | 88 LOC; PLANS tem 8 entries (4 ruleId + 4 categoria); `defaultSuggestion:53` confirma `${risk.categoria} — ${risk.artigo}` |
| P2 | `CATEGORIA_LABELS` shared? | ⚠️ | **4 cópias duplicadas** no codebase — `RiskDashboardV4.tsx:162`, `ActionPlanPage.tsx:72`, `generateDiagnosticoPDF.ts:131`, `ConsolidacaoV4.tsx:56`. Nenhuma em `shared/` ou no backend. Adicionar 5ª cópia local em `action-plan-engine-v4.ts` é débito técnico imediato |
| P3 | Issues pré-existentes | ✅ | **#611 (CLOSED) "fix(engine): fallback hierárquico PLANS por categoria"** — precedente direto do mesmo arquivo, mesma função. #1189/#1192 (BUG-RASTREAB-01) — ortogonal |
| P4 | Tests | ⚠️ | `risk-engine-v4.test.ts` + `generate-risks-pipeline.integration.test.ts` referem `buildActionPlans` — **NENHUM testa `defaultSuggestion` direto.** Test contract precisa ser criado |
| P5 | .sql/.md/.json | ✅ | ADR-0022 (hot-swap risk engine v4) cita ActionPlan — bump PATCH (correção de fallback, comportamento aditivo) |
| P6 | PDF generator | 🔴 | **Achado novo Manus não viu:** `generateDiagnosticoPDF.ts:355` faz `p.titulo.slice(0, 40) + "…"` — títulos longos do fallback ficam ainda mais opacos no PDF (`"Avaliar e mitigar: confissao_automatica…"` perde até o artigo). Planos existentes no PDF continuam ilegíveis até serem re-gerados |
| P7 | Snapshots `.snap` | ✅ | Nenhum snapshot fixa `PLANS` ou `defaultSuggestion` (grep retornou 0) |
| P8 | LOC | ✅ | `action-plan-engine-v4.ts` = **88 LOC** alvo; `ActionPlanPage.tsx` = 1346 (não toca conforme despacho); fix proposto +22/-1 LOC → **Classe A cirúrgica** confirmada |
| P9 | ADRs + bump | ✅ | ADR-0022 PATCH (aditivo: 4 entries no catálogo + ajuste defaultSuggestion preserva semântica) |
| P10 | Writers/readers do título | ✅ | WRITER: `db-queries-risks-v4.ts:401` `insertActionPlanV4` (INSERT inclui `titulo`); `routers/risks-v4.ts:522` `UPDATE action_plans SET titulo = ?`. READERS: PDF generator (truncate) + UI ActionPlanPage (render) |

**Cobertura total:** 🟢 **94%** — pendência: confirmar com Manus quantos planos em produção têm `titulo LIKE 'Avaliar e mitigar:%'` (Lição #87).

---

## Seção 2 — Risco de regressão por gravidade

### 🔴 CRÍTICO (4 instâncias confirmadas no PDF)

| ID | Sintoma no PDF 5640001 | Local |
|---|---|---|
| **B1** | Título do plano `regime_diferenciado` = fallback genérico (regulatorio) | `action-plan-engine-v4.ts:53` |
| **B2** | Título do plano `obrigacao_acessoria` = fallback genérico (Solaris) | mesmo |
| **B3** | Título do plano `confissao_automatica` = fallback genérico (Solaris) | mesmo |
| **B4** | Título do plano `inscricao_cadastral` = fallback genérico (Solaris) | mesmo |

### 🟡 VISÍVEL (1 sub-bug embutido em todos os 4)

| ID | Sintoma | Local |
|---|---|---|
| **B5** | Artigo aparece **2x** na UI — no título (fallback) + badge verde separado | `action-plan-engine-v4.ts:53` (título) vs `ActionPlanPage.tsx:556` (badge) |

### 🟢 COSMÉTICO

| ID | Sintoma | Local |
|---|---|---|
| **B6** | PDF trunca título em 40 chars: `"Avaliar e mitigar: confissao_automatica…"` perde até o artigo. Planos existentes seguem ilegíveis até re-geração | `generateDiagnosticoPDF.ts:355` |

---

## Seção 3 — Consumers reais (canônica)

### Engine

| Local | Arquivo:linha | O que faz |
|---|---|---|
| Catálogo `PLANS` | `server/lib/action-plan-engine-v4.ts:15-44` | 8 entries (4 ruleId + 4 categoria) — cobre apenas 4/11 categorias do `Categoria` type |
| `defaultSuggestion` | `server/lib/action-plan-engine-v4.ts:46-58` | Gera fallback com `${risk.categoria} — ${risk.artigo}` (snake_case + duplicação) |
| `buildActionPlans` lookup chain | `server/lib/action-plan-engine-v4.ts:68-69` | `PLANS[ruleId] ?? PLANS[categoria] ?? [defaultSuggestion(risk)]` |

### Persistência

| Local | Arquivo:linha | O que faz |
|---|---|---|
| INSERT titulo | `server/lib/db-queries-risks-v4.ts:401` | Persiste título exato como gerado pelo engine |
| UPDATE titulo | `server/routers/risks-v4.ts:522` | Permite override manual via UI (user pode editar título) |

### UI / PDF

| Local | Arquivo:linha | O que faz |
|---|---|---|
| ActionPlanPage card | `client/src/pages/ActionPlanPage.tsx` | Renderiza `plan.titulo` (long flex-wrap) + badge verde separado para `plan._risk.artigo` |
| PDF generator | `client/src/lib/generateDiagnosticoPDF.ts:355` | Trunca `p.titulo` em 40 chars + `"…"` — fallback longo fica `"Avaliar e mitigar: categoria…"` |

### CATEGORIA_LABELS (relacionado — débito técnico)

| Local | Linha | Cópia # |
|---|---|---|
| RiskDashboardV4.tsx | 162 | 1 |
| ActionPlanPage.tsx | 72 | 2 |
| generateDiagnosticoPDF.ts | 131 | 3 |
| ConsolidacaoV4.tsx | 56 | 4 |

**Backend (`server/`):** zero cópias. Manus propõe **adicionar 5ª cópia local** em `action-plan-engine-v4.ts`. Decisão tecnicamente válida (zero shared abstraction overhead), mas amplia o débito técnico.

---

## Seção 4 — Árvore de impacto (ASCII)

```
risks_v4 row (gerada pelo risk-engine-v4):
  ruleId    = "confissao_automatica::op:agronegocio::geo:mono"
  categoria = "confissao_automatica"
  artigo    = "Art. 45 LC 214/2025; Arts. 44, 46 Decreto 12.955/2026; ..."
       ↓
buildActionPlans (action-plan-engine-v4.ts:68-69) lookup chain:
  1. PLANS["confissao_automatica::op:agronegocio::geo:mono"]  → MISS (não em catálogo)
  2. PLANS["confissao_automatica"]                            → MISS (não em catálogo)
  3. defaultSuggestion(risk)                                  → HIT (fallback)
       ↓
defaultSuggestion retorna:
  titulo: "Avaliar e mitigar: confissao_automatica — Art. 45 LC 214/2025; Arts. 44, 46..."
  ❌ Inclui snake_case da categoria
  ❌ Inclui o artigo completo (100+ chars com decreto/CGIBS/portaria)
       ↓
INSERT INTO action_plans (titulo, ...)
       ↓
Frontend ActionPlanPage card:
  ┌─────────────────────────────────────────────────────┐
  │ "Avaliar e mitigar: confissao_automatica — Art. 45  │ ← título ilegível
  │   LC 214/2025; Arts. 44, 46 Decreto 12.955/2026;    │
  │   Arts. 44-46 Resolução CGIBS 6/2026; Art. 1        │
  │   Portaria MF/CGIBS 7/2026"                         │
  │                                                      │
  │ Risco: [Solaris] › [Confissão Automática]            │
  │ [Art. 45 LC 214/2025; Arts. 44, 46...]               │ ← badge verde com MESMO conteúdo
  └─────────────────────────────────────────────────────┘

PDF generator:355:
  p.titulo.slice(0, 40) + "…"
  → "Avaliar e mitigar: confissao_automatica…"  ← perde o artigo no PDF (ainda mais opaco)
```

---

## Seção 5 — Crítica em 3 níveis (REGRA-ORQ-22) à proposta do despacho

### 🔴 Nível 1 — Bloqueante (1 item)

#### N1.1 — Catálogo proposto cobre 4 categorias, mas **deixa órfãs as outras**

Adicionar `confissao_automatica`/`inscricao_cadastral`/`obrigacao_acessoria`/`regime_diferenciado` cobre apenas 4 do `Categoria` type (que tem 11 valores em `risk-engine-v4.ts:27-37`):

| Categoria | Já em PLANS? | Proposto despacho | Pós-fix |
|---|---|---|---|
| `imposto_seletivo` | ✅ | — | ✅ |
| `split_payment` | ✅ | — | ✅ |
| `aliquota_zero` | ✅ | — | ✅ |
| `transicao_iss_ibs` | ✅ | — | ✅ |
| **`confissao_automatica`** | ❌ | ➕ Adicionar | ✅ |
| **`inscricao_cadastral`** | ❌ | ➕ Adicionar | ✅ |
| **`obrigacao_acessoria`** | ❌ | ➕ Adicionar | ✅ |
| **`regime_diferenciado`** | ❌ | ➕ Adicionar | ✅ |
| `aliquota_reduzida` | ❌ | ❌ não coberto | 🔴 órfã |
| `credito_presumido` | ❌ | ❌ não coberto | 🔴 órfã (oportunidade — não gera plano) |
| `enquadramento_geral` | ❌ | ❌ não coberto | N/A (gate `risk-engine-v4.ts:547` bloqueia) |

**Filtro RN-AP-09** (`buildActionPlans:67`): `if (risk.severity === "oportunidade") continue;` — categorias `oportunidade` (aliquota_zero, aliquota_reduzida, credito_presumido) **não geram plano**. Logo:
- `aliquota_zero` está em PLANS (catálogo) mas nunca é usado (severity=oportunidade)
- `aliquota_reduzida` e `credito_presumido` também — não preciso adicionar

**Filtro `enquadramento_geral`** (`:547`): gate bloqueia geração de risco — não precisa adicionar.

**Conclusão revista:** as 4 categorias propostas pelo despacho são exatamente as **únicas faltando**:
- `confissao_automatica`, `inscricao_cadastral`, `obrigacao_acessoria`, `regime_diferenciado`
- Todas têm `severity` ≠ `oportunidade` → geram plano
- Todas faltam no catálogo atual

**Resultado:** 4 entradas propostas são **suficientes para zerar o uso de `defaultSuggestion`** em projetos canônicos. ✅ **Despacho está correto.**

**Mas atenção:** se Sprint 5 adicionar categoria nova ao `Categoria` type (ex: `regime_diferenciado_produtor_rural_credito` mencionado por Manus anteriormente no drift N1), ela cairia no `defaultSuggestion` de novo. **Fix do `defaultSuggestion` é estrutural**, complementar e necessário independente do catálogo.

### 🟡 Nível 2 — Design improvement (2 itens)

#### N2.1 — Duplicar `CATEGORIA_LABELS` no backend amplia débito técnico

Já existem 4 cópias no frontend. Adicionar 5ª no backend é solução pragmática mas:
- Quando categoria nova é adicionada, devs precisam atualizar 5 lugares
- Risco de divergência entre frontend/backend (label diferente do mesmo enum)

**Recomendação:**
- **Curto prazo (este PR):** duplicar localmente em `action-plan-engine-v4.ts` com comentário `// sync com client/src/pages/ActionPlanPage.tsx:72 — quando atualizar, atualizar AMBOS`
- **Backlog Sprint 5:** consolidar em `shared/categoria-labels.ts` — refactor Classe B (~30 LOC mudança em 5 arquivos + 1 novo)

### 🟢 Nível 3 — Observação/backlog (3 itens)

#### N3.1 — PDF generator trunca em 40 chars (Manus não viu)

`generateDiagnosticoPDF.ts:355`:
```ts
p.titulo.length > 40 ? p.titulo.slice(0, 40) + "…" : p.titulo,
```

Pós-fix, títulos passam de ~120 chars (fallback) para ~50-60 chars (catálogo). **Ainda excedem 40 char limit** — alguns títulos seguem truncados no PDF:
- "Implantar controle preventivo de confissão automática de débitos" = 65 chars → "Implantar controle preventivo de confissão a…"

**Backlog opcional (não bloqueia este PR):**
- Aumentar `slice(0, 40)` para `slice(0, 60)` no PDF
- Ou usar quebra de linha em vez de truncate
- Decisão de UX

#### N3.2 — Planos existentes em produção ficam órfãos

Despacho diz "NÃO retroativo" — planos com título fallback em projetos pré-fix permanecem ilegíveis no banco. Decisão consciente (sem migration), mas precisa documentar:

- Projetos pré-fix continuam com título fallback até users **editarem manualmente** ou **re-aprovarem matriz** (que regenera planos)
- Workaround opcional: script SQL para UPDATE retroativo dos títulos fallback. **Não recomendado** sem aval explícito P.O. + jurídico (planos podem ter sido aprovados com aquele texto literal)

**Recomendação:** documentar no PR body que aplicação é prospectiva (apenas novos projetos / regenerações).

#### N3.3 — Tests faltando para `defaultSuggestion` direto

Despacho propõe Vitest DoD:
```ts
expect(defaultSuggestion(mockRisk).titulo).not.toContain(mockRisk.artigo);
expect(PLANS["confissao_automatica"]).toBeDefined();
// ...
```

**Validar:** `defaultSuggestion` está atualmente **não-exportada** (`function defaultSuggestion(...)`, não `export function`). Para testar, precisa exportá-la. Adiciona +1 LOC mas é necessário.

---

## Seção 6 — TO-BE recomendada

### Fase F1 — `action-plan-engine-v4.ts` (1 arquivo, +22/-1 LOC)

```ts
// ─── CATEGORIA_LABELS local (sync com client/src/pages/ActionPlanPage.tsx:72) ───
// Backlog Sprint 5: consolidar em shared/categoria-labels.ts (atualmente 4 cópias frontend)
const CATEGORIA_LABELS: Record<string, string> = {
  imposto_seletivo: "Imposto Seletivo",
  confissao_automatica: "Confissão Automática",
  split_payment: "Split Payment",
  inscricao_cadastral: "Inscrição Cadastral",
  regime_diferenciado: "Regime Diferenciado",
  transicao_iss_ibs: "Transição ISS/IBS",
  obrigacao_acessoria: "Obrigação Acessória",
  aliquota_zero: "Alíquota Zero",
  aliquota_reduzida: "Alíquota Reduzida",
  credito_presumido: "Crédito Presumido",
  enquadramento_geral: "Enquadramento Geral",
};

export const PLANS: Record<string, ActionPlanSuggestion[]> = {
  // ... entradas existentes ...

  // ─── BUG-PLAN-TITLE (2026-06-02): 4 categorias faltando ───
  "confissao_automatica": [
    { titulo: "Implantar controle preventivo de confissão automática de débitos",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "inscricao_cadastral": [
    { titulo: "Regularizar inscrição cadastral IBS/CBS",
      responsavel: "advogado", prazo: "30_dias" },
  ],
  "obrigacao_acessoria": [
    { titulo: "Mapear e adequar obrigações acessórias IBS/CBS",
      responsavel: "gestor_fiscal", prazo: "60_dias" },
  ],
  "regime_diferenciado": [
    { titulo: "Avaliar enquadramento em regime diferenciado aplicável",
      responsavel: "advogado", prazo: "60_dias" },
  ],
};

export function defaultSuggestion(risk: RiskV4): ActionPlanSuggestion {  // export para test
  const prazoMap: Record<string, "30_dias" | "60_dias" | "90_dias" | "180_dias"> = {
    imediata: "30_dias",
    curto_prazo: "60_dias",
    medio_prazo: "90_dias",
  };
  const label = CATEGORIA_LABELS[risk.categoria] ?? risk.categoria;
  return {
    titulo: `Avaliar e mitigar risco de ${label}`,  // BUG-PLAN-TITLE: sem ${risk.artigo}, com label PT-BR
    responsavel: "advogado",
    prazo: prazoMap[risk.urgency] ?? "60_dias",
  };
}
```

**LOC:** +22 / -1 (cataloque +20 LOC, defaultSuggestion +3 / -1 LOC, export keyword +1 LOC).

### Fase F2 — Test contract (1 arquivo novo, ~30 LOC)

```ts
// server/lib/action-plan-engine-v4.test.ts (novo)
import { describe, it, expect } from "vitest";
import { buildActionPlans, defaultSuggestion, PLANS } from "./action-plan-engine-v4";
import type { RiskV4 } from "./risk-engine-v4";

describe("BUG-PLAN-TITLE — catálogo PLANS + defaultSuggestion", () => {
  it("PLANS catálogo contém as 4 categorias do BUG-PLAN-TITLE", () => {
    expect(PLANS["confissao_automatica"]).toBeDefined();
    expect(PLANS["inscricao_cadastral"]).toBeDefined();
    expect(PLANS["obrigacao_acessoria"]).toBeDefined();
    expect(PLANS["regime_diferenciado"]).toBeDefined();
  });

  it("defaultSuggestion NÃO inclui risk.artigo no título", () => {
    const mockRisk: RiskV4 = {
      ruleId: "x", categoria: "imposto_seletivo",
      artigo: "Art. 45 LC 214/2025; Arts. 44, 46 Decreto 12.955/2026",
      urgency: "imediata", severity: "alta",
      breadcrumb: ["regulatorio", "imposto_seletivo", "Art. 45", "x"],
      fonte: "regulatorio", gapClassification: "ausencia",
      requirementId: "x", sourceReference: "x", domain: "tributario",
    };
    const sug = defaultSuggestion(mockRisk);
    expect(sug.titulo).not.toContain(mockRisk.artigo);
    expect(sug.titulo).not.toContain("Art. 45");
  });

  it("defaultSuggestion usa label PT-BR via CATEGORIA_LABELS", () => {
    const mockRisk = { categoria: "confissao_automatica", urgency: "imediata", /* ... */ } as RiskV4;
    expect(defaultSuggestion(mockRisk).titulo).toBe("Avaliar e mitigar risco de Confissão Automática");
  });

  it("defaultSuggestion fallback gracioso para categoria desconhecida", () => {
    const mockRisk = { categoria: "categoria_inventada", urgency: "imediata", /* ... */ } as RiskV4;
    expect(defaultSuggestion(mockRisk).titulo).toBe("Avaliar e mitigar risco de categoria_inventada");
  });

  it("buildActionPlans para confissao_automatica usa PLANS, não defaultSuggestion", () => {
    const risk = {
      ruleId: "confissao_automatica::op:agronegocio::geo:mono",
      categoria: "confissao_automatica", severity: "alta",
      /* ... */
    } as RiskV4;
    const [plan] = buildActionPlans([risk]);
    expect(plan.titulo).toBe("Implantar controle preventivo de confissão automática de débitos");
  });
});
```

**LOC:** ~50 LOC test (5 specs).

### DoD pós-deploy

| # | Verificação | Esperado |
|---|---|---|
| **D1** | `pnpm tsc --noEmit` | 0 erros |
| **D2** | `pnpm vitest server/lib/action-plan-engine-v4.test.ts` | 5/5 PASS |
| **D3** | Novo projeto E2E gerar planos | 4 categorias `confissao_automatica/inscricao_cadastral/obrigacao_acessoria/regime_diferenciado` com títulos customizados |
| **D4** | SQL pós-deploy | `SELECT titulo FROM action_plans WHERE created_at > NOW() - INTERVAL 1 HOUR AND titulo LIKE 'Avaliar e mitigar:%'` → 0 rows |

---

## Seção 7 — Auto-auditoria final

| Critério | Status | Evidência |
|---|---|---|
| Toda afirmação tem arquivo:linha | ✅ | Seções 3, 5 |
| Testes no grep (P4) | ✅ | 2 test files; nenhum cobre `defaultSuggestion` diretamente — backlog |
| ADR (P9) | ✅ | ADR-0022 PATCH (aditivo + correção) |
| PDF generator (P6) | ✅ | Achado novo: truncate 40 chars amplifica problema |
| Issues pré-existentes (P3) | ✅ | #611 (CLOSED — precedente exato) |
| ast-grep aplicado | ✅ | PLANS, defaultSuggestion, CATEGORIA_LABELS |
| Dead-read check (P2) | ⚠️ | knip instalado mas não rodei — não-bloqueante (mudança aditiva) |
| LOC antes de classificar | ✅ | 88 LOC alvo + 22 mudanças = **Classe A cirúrgica** |
| Mapa writers/readers (P10) | ✅ | Tabela em Seção 3 |
| Crítica REGRA-ORQ-22 em 3 níveis | ✅ | N1.1 (categorias órfãs analisadas), N2.1 (CATEGORIA_LABELS débito), N3.1-3 (PDF truncate, retroativo, tests) |
| **Cobertura total** | 🟢 **94%** | Pendência: P.O./Manus confirma run-rate de planos fallback em produção (LIKE 'Avaliar e mitigar:%') |

---

## Seção 8 — Conclusão crítica

### O que o despacho do Orquestrador acerta

| # | Acerto |
|---|---|
| 1 | Diagnóstico Manus correto e validado empiricamente (PDF + leitura do código) |
| 2 | 4 categorias propostas são exatamente as faltantes (mostrei em N1.1 que `aliquota_reduzida`/`credito_presumido` são oportunidade → filtradas pelo RN-AP-09) |
| 3 | Fix `defaultSuggestion` sem `${risk.artigo}` resolve duplicação |
| 4 | Renomeação BUG-4 → BUG-PLAN-TITLE evita colisão no board |
| 5 | DoD Vitest claros + SQL pós-deploy |
| 6 | "NÃO retroativo" é decisão consciente — preserva planos aprovados em produção |

### Ajustes propostos

| # | Ajuste | Severidade | Bloqueante? |
|---|---|---|---|
| 1 | Adicionar `CATEGORIA_LABELS` local com comentário "sync com 4 cópias frontend" | 🟡 design | Não |
| 2 | Exportar `defaultSuggestion` para test (era `function`, virar `export function`) | 🟢 trivial | Não — bloqueia o test DoD |
| 3 | Documentar no PR body que truncate PDF 40 chars persiste (backlog separado) | 🟢 doc | Não |
| 4 | Backlog Sprint 5: consolidar `CATEGORIA_LABELS` em `shared/` (5 cópias em 5 arquivos) | 🟢 refactor | Não |
| 5 | Backlog Sprint 5: revisitar truncate PDF (40 → 60 ou quebra de linha) | 🟢 UX | Não |

### Recomendação final

**Opção MÍNIMA = despacho do Orquestrador + 2 ajustes:**

1. Adicionar `CATEGORIA_LABELS` local (~15 LOC) com comentário de sync
2. Mudar `function defaultSuggestion` → `export function defaultSuggestion` (+1 LOC)

**Total revisado:** ~38 LOC produção + ~50 LOC testes = ~88 LOC totais.

Classe A cirúrgica (≤50 LOC produção). Sem migration, sem mudança de schema, sem mudança em frontend.

---

## Seção 9 — Decisões F0 ao P.O.

| # | Decisão | Recomendação |
|---|---|---|
| **F0-1** | Opção MÍNIMA (catálogo + defaultSuggestion + label local) | **Aplicar** |
| **F0-2** | Aplicar retroativo (UPDATE títulos fallback em produção)? | **NÃO** — preserva planos aprovados; documentar no PR body |
| **F0-3** | Backlog `CATEGORIA_LABELS` consolidação Sprint 5 (5 cópias → 1 shared)? | **Sim, separar** — Classe B, fora deste PR |
| **F0-4** | Backlog truncate PDF (Sprint 5)? | **Sim, separar** — decisão de UX |
| **F0-5** | Aprovação dos 4 títulos propostos (jurídico/produto)? | **P.O. decide** — textos parecem razoáveis tecnicamente; jurídico valida cunho técnico |

---

## Seção 10 — Pendências para Manus

| # | Pendência | Quando |
|---|---|---|
| M-1 | Query: `SELECT COUNT(*) FROM action_plans WHERE titulo LIKE 'Avaliar e mitigar:%'` — quantos planos órfãos em produção (informativo)? | Pré-PR — informa escopo do não-retroativo |
| M-2 | Pós-deploy: gerar matriz em projeto novo + confirmar D3/D4 do DoD | Pós-merge |

---

## Vinculações

- **PDF E2E projeto 5640001** (origem do report)
- **Manus análise:** `BUG-4_ Títulos dos Planos de Ação — Análise AS-IS _ TO-BE.md`
- **Despacho Orquestrador:** "Despacho — BUG-PLAN-TITLE · 02/06/2026 · 15:20"
- **Issue #611** (CLOSED) — precedente direto: fallback hierárquico PLANS por categoria
- **Issue #1189** + PR #1192 — BUG-RASTREAB-01 (ortogonal — não é causa, mas mesma classe de bug downstream)
- **PR #1337** (BUG-1 badge fonte, mergeado) — não toca este arquivo
- **PR #1338** (BUG-2 prompt briefing, mergeado) — não toca este arquivo
- **ADR-0022** (hot-swap risk engine v4) — bump PATCH
- **REGRA-ORQ-22** (crítica 3 níveis) — aplicada
- **REGRA-ORQ-27** (assemble ≠ consumption) — `defaultSuggestion` propaga `risk.artigo` mas UI já tem badge separado
- **REGRA-ORQ-41** (impact-tree) — skill aplicada
- **Lição #74** (fix downstream incompleto) — `defaultSuggestion` foi cobertura de erro mas não foi revisitado quando UI passou a renderizar badge artigo separado
- **Lição #87** (smoke estático ≠ runtime) — M-1 query confirma escopo do não-retroativo
- **Lição #93** (mecanismo verificado) — leitura literal do engine confirmou todos os pontos do despacho

**Não vou implementar.** Documento arquivado. Aguardo P.O. confirmar F0-1 a F0-5 antes de qualquer PR.
