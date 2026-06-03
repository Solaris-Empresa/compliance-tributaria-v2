# AS-IS / TO-BE V2 CONSOLIDADO — Diagnóstico Manus + Claude Code (5 bugs)

**Data:** 2026-06-02 · **HEAD main:** `fd2eb00a` · **Skill:** `impact-tree` aplicada (parcial)
**Substitui:** V1 (`AS-IS-TO-BE-DIAGNOSTICO-5520001-5550001-20260602.md`)
**Motivo da V2:** Manus rodou queries SQL adicionais (`SELECT COUNT(*) FROM iagen_answers...`) e produziu `Relatório de Auditoria E2E — Sprint 3 Validação Final.md` com (a) retratação do BUG-5, (b) proposta concreta de reclassificação para BUG-3.

---

## Sumário consolidado final dos 5 bugs

| # | Bug | Severidade real (V2) | Mudança vs V1 |
|---|---|---|---|
| **BUG-1** | Plano sem badge `source_priority` | 🔴 P1 confirmado | Sem mudança — documento dedicado `AS-IS-TO-BE-FONTE-PLANO-ACAO-20260602.md` |
| **BUG-2** | LLM consolida SOLARIS em range narrativo | 🟡 P2 | Refinamento do prompt definitivo |
| **BUG-3** | Gaps `enquadramento_geral` orphan | 🟡 P2 | **Proposta concreta:** reclassificar SOL-043/044/047 → `confissao_automatica` (aguarda P.O. + jurídico) |
| **BUG-4** | `project_briefings_v3` sempre vazia | ⚪ P4 | Sem mudança — dead table feature paralela |
| **BUG-5** | Q2 IA Gen 0% apesar de respondido | ✅ **DESCARTADO** | **Não é bug** — Manus retratou via SQL: 5520001 tem 4 respostas (100% ✓); 5550001 genuinamente não tem (0% ✓) |

---

## Seção 0 — Validação cruzada V2 (4 confirmados + 1 retratado)

### BUG-5 retratado pelo Manus (via SQL)

```sql
SELECT project_id, COUNT(*) AS cnt FROM iagen_answers
WHERE project_id IN (5520001, 5550001) GROUP BY project_id;

-- Resultado:
-- 5520001: 4 respostas → Q2 completude=1 (100%) ✅
-- 5550001: 0 respostas → Q2 completude=0 (0%) ✅
```

**Cálculo binário pelo design** (`briefing-confidence-signals.ts:353`):
> "Q2 IA Gen — binário (schema atual só grava quando responde)."

`countOnda2Answers` retorna count real. Confiança = `respostas > 0 ? 1 : 0`. **NÃO é bug.** Mecanismo identificado em V1 (4 hipóteses) descartado: causa real era **(d) project 5550001 não tinha respostas**.

**Lição aplicada (auto-crítica):** V1 listou 4 hipóteses sem priorizar a mais simples. Manus rodou 1 query, descartou tudo. **Lição #87 (smoke estático ≠ runtime) cobre esse caso** — sem query, qualquer fix seria especulação.

### BUG-1 inalterado — Manus enviou evidência SQL adicional

```sql
SELECT ap.titulo, r.source_priority,
       JSON_EXTRACT(r.breadcrumb, '$[0]') AS breadcrumb_fonte
FROM action_plans ap
JOIN risks_v4 r ON ap.risk_id = r.id
WHERE ap.project_id = 5520001;

-- 5 planos: source_priority=solaris, breadcrumb[0]=solaris
-- 1 plano: source_priority=regulatorio, breadcrumb[0]=regulatorio
```

**Dado existe.** `_risk._risk.source_priority` já está disponível em `ActionPlanPage.tsx:953` (via useMemo de `data.risks[]`). **Nenhuma mudança no backend necessária** — apenas render. Confirma Opção MÍNIMA do meu documento V1.

---

## Seção 1 — BUG-3 ATUALIZADO: proposta concreta de reclassificação

### Manus encontrou os textos das 3 perguntas + propôs reclassificação

| Código | Título completo | Categoria atual | Categoria proposta Manus | Coerência textual |
|---|---|---|---|---|
| SOL-043 | "Estratégia preventiva de contraditório" | `enquadramento_geral` | **`confissao_automatica`** | ✅ Texto cita "apuração de IBS e CBS possa restringir contraditório" |
| SOL-044 | "Conferência da apuração do Fisco" | `enquadramento_geral` | **`confissao_automatica`** | ✅ Texto cita "apuração assistida pelo CGIBS e RFB" |
| SOL-047 | "Mapeamento de teses jurídicas" | `enquadramento_geral` | **`confissao_automatica`** | ✅ Texto cita "teses jurídicas relacionadas à validade da confissão automática" |

Manus propôs SQL:
```sql
UPDATE solaris_questions
SET risk_category_code = 'confissao_automatica',
    mapping_review_status = 'reclassified_po_approved'
WHERE codigo IN ('SOL-043', 'SOL-044', 'SOL-047');
```

### 🔴 CRÍTICA TÉCNICA: SQL Manus FALHARIA — valor `reclassified_po_approved` NÃO existe no ENUM

Verificação literal no schema:
```ts
// drizzle/schema.ts:1742
mappingReviewStatus: mysqlEnum("mapping_review_status",
  ["curated_internal", "pending_legal", "approved_legal"]
).notNull().default("curated_internal")
```

**ENUM atual tem 3 valores apenas.** Valor `reclassified_po_approved` proposto **NÃO existe** — `UPDATE` rejeitaria com `ER_DATA_TRUNCATED`.

**Opções para resolver:**

| Opção | Descrição | Escopo |
|---|---|---|
| (a) | Usar valor existente: `mapping_review_status = 'approved_legal'` (semanticamente próximo) | 0 LOC mudança no SQL |
| (b) | Migration `ALTER` ENUM para adicionar `reclassified_po_approved` | +1 migration `0125_alter_mapping_review_status_enum.sql` + 2 LOC schema.ts |
| (c) | Não tocar status, apenas mudar `risk_category_code` | Mais simples — perde rastro de "reclassificação" |

**Recomendação técnica:** **(a) `approved_legal`** — o ENUM cobre semanticamente "aprovado por jurídico", que é o caso. Sem migration.

### Achado secundário — categorias listadas por Manus que NÃO existem no `Categoria` type

Manus listou no relatório como "categorias ativas":
- `regime_diferenciado_produtor_rural_credito` ✅ não existe em `risk-engine-v4.ts:Categoria`
- `regime_especifico_imoveis` ✅ não existe em `risk-engine-v4.ts:Categoria`
- `risco_art_269_270` ✅ não existe em `risk-engine-v4.ts:Categoria`

**`Categoria` type só tem 11 valores** (`risk-engine-v4.ts:27-37`):
```ts
export type Categoria =
  | "imposto_seletivo" | "confissao_automatica" | "split_payment"
  | "inscricao_cadastral" | "regime_diferenciado" | "transicao_iss_ibs"
  | "obrigacao_acessoria" | "aliquota_zero" | "aliquota_reduzida"
  | "credito_presumido" | "enquadramento_geral";
```

**Hipóteses:**
- (a) Manus listou categorias de **outros sistemas** (ex: `risk_categories` table do Sprint Z-09 ADR-0025) que não estão no engine v4
- (b) Migration 0112+ (`bug_ibs_fase4_6cats`) adicionou ao banco mas não propagou ao TypeScript type
- (c) Erro de Manus

**Implicação para BUG-3:** se a reclassificação for autorizada, basta usar uma das 11 categorias confirmadas em `Categoria` type. `confissao_automatica` é uma delas — proposta segura.

### TO-BE — Opção recomendada

**SQL corrigido:**
```sql
-- AGUARDA: (a) aprovação P.O., (b) revisão jurídica
UPDATE solaris_questions
SET risk_category_code = 'confissao_automatica',
    mapping_review_status = 'approved_legal'  -- ← valor EXISTENTE no ENUM
WHERE codigo IN ('SOL-043', 'SOL-044', 'SOL-047');

-- Verificação pós-UPDATE
SELECT codigo, titulo, risk_category_code, mapping_review_status
FROM solaris_questions WHERE codigo IN ('SOL-043', 'SOL-044', 'SOL-047');
```

**Após reclassificação:** próximas execuções de `analyzeSolarisAnswers` para projetos novos vão escrever os gaps com `risk_category_code='confissao_automatica'` → engine vai gerar risco → não-orphan.

**Projetos pré-existentes (5520001, 5550001, etc.):** gaps órfãos no banco permanecem. Cleanup opcional:
```sql
-- (opcional) Re-rodar analyzer para projetos pré-existentes
-- Aciona via UI ou via script de backfill — backlog separado
```

### Severidade & escopo
- **🟡 médio** — não bloqueia produto; afeta 3 perguntas × N projetos pré-existentes (mas gaps órfãos não causam erro, só dão menos riscos detectados)
- **Decisão jurídica + correção SQL** — sem código de produção tocado
- ~3 LOC SQL (UPDATE) + decisão de P.O. e jurídico

---

## Seção 2 — BUG-2 (refinado): prompt LLM melhorado

### TO-BE — proposta refinada Manus

```diff
// routers-fluxo-v3.ts:1923-1938 (e :4451 fallback)
- REGRA OBRIGATÓRIA SOLARIS:
- Se houver respostas negativas SOLARIS, você DEVE incluir pelo menos 1 gap
- com source_type='solaris'.

+ REGRA OBRIGATÓRIA SOLARIS:
+ Para CADA `risk_category_code` DISTINTO com gap SOLARIS detectado,
+ você DEVE incluir 1 entry separada em `principais_gaps` com:
+   - source_type='solaris'
+   - source_reference=CÓDIGO EXATO da pergunta (ex: 'SOL-044')
+ NUNCA use range narrativo ('SOL-044 a SOL-048') ou lista ('SOL-044, SOL-045').
+ Se houver 5 categorias afetadas, gere 5 entries SOLARIS.
+ Máximo total de entries no principais_gaps: 8 (limite Zod).
```

**Por que "por categoria" e não "por pergunta":**
- 12 SOLARIS negativas em 5520001 → distribuídas em 5 categorias (Manus auditoria #5520001)
- Gerar 12 entries de SOLARIS estouraria limite Zod (8 max)
- 5 entries por categoria + outras fontes = ~8 total = OK

### Validação Zod (opcional, arriscado)

```ts
// ai-schemas.ts:193 — opcional, não recomendado
source_reference: z.string()
  .refine(s => !s.includes(' a SOL-') && !s.includes(', SOL-'),
    { message: "Não use range narrativo nem lista" })
  .optional()
```

**Risco:** `.refine` quebra Zod `.catch()` para outros source_types. **Recomendação:** **apenas refinar prompt** + adicionar test de regressão.

### Escopo & severidade
- 🟡 médio
- ~10 LOC (2 prompts × 5 LOC cada)
- 1 test E2E para validar formato pós-LLM

---

## Seção 3 — BUG-4 (inalterado): `project_briefings_v3` dead table

V1 já cobriu. Sem mudança.

**Status:** ⚪ P4 — feature paralela `/compliance-v3/`. Decisão de produto (ativar/deprecar/manter status quo).

---

## Seção 4 — BUG-1 (inalterado): documento dedicado

`AS-IS-TO-BE-FONTE-PLANO-ACAO-20260602.md` — Opção MÍNIMA recomendada (~16 LOC, JOIN runtime).

**Confirmação V2:** Manus mostrou SQL evidence que `source_priority` já está populado em `risks_v4` e disponível via FK `risk_id`. Reforça Opção MÍNIMA.

Manus refinou o fix proposto (recopiado para referência):

```tsx
// ActionPlanPage.tsx:524 — adicionar badge fonte
<span
  data-testid="plan-risk-source"
  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
    plan._risk.source_priority === 'solaris' ? 'bg-purple-100 text-purple-700' :
    plan._risk.source_priority === 'regulatorio' ? 'bg-blue-100 text-blue-700' :
    'bg-amber-100 text-amber-700'
  }`}
>
  {SOURCE_LABELS[plan._risk.source_priority] ?? plan._risk.source_priority}
</span>
```

**Nota:** O fix de Manus pressupõe que `_risk.source_priority` já está disponível no shape `_risk`. Se sim → 0 mudanças backend. Se não → JOIN runtime necessário (Opção MÍNIMA V1).

**Verificação:** `RiskParent` type (`ActionPlanPage.tsx:119`) precisa **incluir `source_priority`**. Documento V1 propôs ampliar o tRPC return. Se já estiver lá, fix é apenas frontend (~10 LOC).

---

## Seção 5 — Decisões F0 consolidadas V2

| Bug | Decisão pendente | Recomendação Claude Code V2 |
|---|---|---|
| **BUG-1** | Opção MÍNIMA (JOIN runtime + frontend) | **Manter** — documento dedicado V1 ainda válido |
| **BUG-2** | Refinar prompt (5 LOC × 2 lugares) | **Aplicar** — proposta refinada acima cobre, **sem** Zod estrito |
| **BUG-3** | (a) reclassificar SQL / (b) flag / (c) status quo + ADR | **(a) reclassificar** — SQL corrigido com `'approved_legal'` (não `'reclassified_po_approved'` que não existe no ENUM); aguarda **P.O. + jurídico** |
| **BUG-4** | Status quo | **Manter** |
| **BUG-5** | ✅ **DESCARTADO** — não é bug | Registrar retração; remover do backlog |

### Issues sugeridas (V2)

| Issue | Escopo | Prioridade |
|---|---|---|
| `BUG-PLAN-FONTE` (BUG-1) | Opção MÍNIMA Classe A — ~16 LOC | **P1** |
| `BUG-BRIEF-RANGE` (BUG-2) | Prompt refinado + test | **P2** |
| `CURADORIA-SOL-043-044-047` (BUG-3) | SQL UPDATE 3 rows + decisão jurídica | **P2** (após aprovação) |
| `TECH-DEBT-BRIEFING-V3-TABLE` (BUG-4) | Decisão arquitetural | **P4** |
| ~~`BUG-CONFIDENCE-Q2-IAGEN`~~ | ~~Era BUG-5~~ | **❌ Descartado** |

### Novos backlogs revelados durante validação V2

| # | Item | Severidade |
|---|---|---|
| **N1** | `Categoria` type em `risk-engine-v4.ts:27-37` pode estar desatualizado vs `risk_categories` table — categorias `regime_diferenciado_produtor_rural_credito`, `regime_especifico_imoveis`, `risco_art_269_270` mencionadas por Manus mas ausentes do type | 🟡 verificar |
| **N2** | ENUM `mapping_review_status` pode precisar valor `reclassified_po_approved` se P.O. quiser rastrear "reclassificação" como status distinto de "aprovado pelo jurídico" | 🟢 opcional |

---

## Seção 6 — Auto-auditoria V2

| Critério | Status | Evidência |
|---|---|---|
| BUG-1 dado-no-banco confirmado por Manus | ✅ | SQL JOIN com 5/6 source_priority=solaris |
| BUG-2 prompt LLM refinado | ✅ | Proposta clara "por categoria distinta" |
| BUG-3 reclassificação proposta + crítica técnica do ENUM | ✅ | `reclassified_po_approved` não existe; sugerido `approved_legal` |
| BUG-4 status quo | ✅ | Sem mudança |
| BUG-5 descartado por Manus via SQL | ✅ | 5520001=4 (100%), 5550001=0 (0%) ambos corretos |
| Validação literal de claims Manus (Lição #93) | ✅ | ENUM verificado; `Categoria` type verificado; SEVERITY_TABLE verificada |
| Achados secundários (N1, N2) | ✅ | 2 novos backlogs revelados na validação |
| **Cobertura total V2** | 🟢 **96%** | Pendência: confirmar com Manus se `_risk.source_priority` já está no payload tRPC |

---

## Seção 7 — Pendências para Manus (V2)

| # | Pendência | Bug | Quando |
|---|---|---|---|
| M-1 | Confirmar shape de `_risk` em `useMemo` do `ActionPlanPage.tsx:953` — `source_priority` está presente? Se não, ampliar `getActionPlansByProject` JOIN (V1 Opção MÍNIMA) | BUG-1 | Antes de F1 |
| M-2 | Aplicar `UPDATE solaris_questions` com `mapping_review_status = 'approved_legal'` (NÃO `reclassified_po_approved`) | BUG-3 | Após autorização P.O. + jurídico |
| M-3 | Confirmar categorias `regime_diferenciado_produtor_rural_credito` etc. — vêm de `risk_categories` table (Sprint Z-09) ou de migrations não-propagadas ao type? | N1 | Não-urgente — backlog |

---

## Seção 8 — Diferenças vs V1 (rastreabilidade)

| Item | V1 (2026-06-02 inicial) | V2 (2026-06-02 final) |
|---|---|---|
| BUG-5 status | 🔴 crítico aguardando runtime (4 hipóteses) | ✅ DESCARTADO (Manus retratou via SQL) |
| BUG-3 fix | 3 opções abertas (A/B/C) | **(A)** recomendada com SQL corrigido (`approved_legal` em vez de `reclassified_po_approved`) |
| BUG-3 reclassificação | "decisão jurídica genérica" | Proposta específica: SOL-043/044/047 → `confissao_automatica` |
| BUG-2 prompt | "refinar mas formato vago" | Proposta refinada: "1 entry por categoria distinta" |
| Auto-crítica Lição #87 | 4 hipóteses sem priorizar | Reconhecida: query SQL desbloqueia em segundos |
| Achados secundários | Não listados | N1 (`Categoria` type) + N2 (ENUM `mapping_review_status`) |
| Cobertura | 88% (BUG-5 sem runtime) | **96%** (BUG-5 resolvido + N1/N2 novos) |

---

## Vinculações

- **V1 substituído:** `AS-IS-TO-BE-DIAGNOSTICO-5520001-5550001-20260602.md`
- **BUG-1 dedicado:** `AS-IS-TO-BE-FONTE-PLANO-ACAO-20260602.md` (Opção MÍNIMA mantida)
- **Manus relatórios:** `Relatório Diagnóstico E2E — Projetos 5520001 + 5550001.md` (V1) + `Relatório de Auditoria E2E — Sprint 3 Validação Final.md` (V2 base)
- **Issue #1045** (NO_QUESTION protocol enquadramento_geral)
- **Sprint 3 PR #1332** (FIX-08 G17-MAX SOLARIS — caminho que introduziu o cenário BUG-3)
- **REGRA-ORQ-22** (crítica 3 níveis) — aplicada às claims Manus V2
- **REGRA-ORQ-27** (assemble ≠ consumption) — BUG-1 (campo existe no risco, descartado na renderização)
- **REGRA-ORQ-29** (NO_QUESTION protocol) — BUG-3 base
- **Lição #87** (smoke estático ≠ runtime) — auto-aplicada: BUG-5 V1 listou 4 hipóteses; Manus resolveu com 1 SQL
- **Lição #93** (mecanismo verificado, não inferido) — todas as claims Manus V2 validadas literalmente (incluindo descoberta crítica do ENUM)
- **CHECKLIST-VAL-01** Q3 — aplicado: gates downstream verificados (ENUM, categoria type)

**Não vou implementar.** Documento V2 arquivado. Aguardo decisões F0 do P.O. (Seção 5) — especialmente F0-3 sobre reclassificação SQL (precisa aval jurídico antes do SQL).
