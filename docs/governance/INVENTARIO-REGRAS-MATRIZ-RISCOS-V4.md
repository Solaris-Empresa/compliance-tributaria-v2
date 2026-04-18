# INVENTÁRIO DE REGRAS — MATRIZ DE RISCOS v4

> **IA SOLARIS · Compliance Tributária — Reforma Tributária (LC 214/2025)**
> **Versão:** 1.0 · **Data:** 2026-04-18 · **Audiência:** P.O. · Orquestrador · Implementador
> **Fonte de verdade:** repositório `Solaris-Empresa/compliance-tributaria-v2` (branch `main` SHA `3afc592`)
> **Propósito:** converter conhecimento tácito em explícito, com rastreabilidade determinística de cada regra ao arquivo e linha de origem.

---

## Índice

1. [Visão Geral E2E](#1-visão-geral-e2e)
2. [Camada de Dados — Schema e Migrations](#2-camada-de-dados--schema-e-migrations)
3. [Catálogo de Categorias (risk_categories)](#3-catálogo-de-categorias-risk_categories)
4. [Engine de Geração — Constantes Determinísticas](#4-engine-de-geração--constantes-determinísticas)
5. [Pipeline de Geração (generate-risks-pipeline.ts)](#5-pipeline-de-geração-generate-risks-pipelinets)
6. [Consolidação de Riscos (consolidateRisks)](#6-consolidação-de-riscos-consolidaterisks)
7. [Inferência Normativa (normative-inference.ts)](#7-inferência-normativa-normative-inferencets)
8. [Validação RAG (rag-risk-validator.ts)](#8-validação-rag-rag-risk-validatorts)
9. [Regras de Negócio — Geração (RN-RISK)](#9-regras-de-negócio--geração-rn-risk)
10. [Procedures tRPC — risks-v4 Router](#10-procedures-trpc--risks-v4-router)
11. [Regras de Negócio — Planos de Ação (RN-AP)](#11-regras-de-negócio--planos-de-ação-rn-ap)
12. [Regras de Negócio — Tarefas (RN-TASK)](#12-regras-de-negócio--tarefas-rn-task)
13. [Score de Compliance v4 (RN-CV4)](#13-score-de-compliance-v4-rn-cv4)
14. [Score CPIE (Scoring Engine)](#14-score-cpie-scoring-engine)
15. [Frontend — RiskDashboardV4](#15-frontend--riskdashboardv4)
16. [Frontend — ActionPlanPage](#16-frontend--actionplanpage)
17. [Frontend — ConsolidacaoV4](#17-frontend--consolidacaov4)
18. [Artefatos do Fluxo E2E](#18-artefatos-do-fluxo-e2e)
19. [Audit Log — Regras de Imutabilidade](#19-audit-log--regras-de-imutabilidade)
20. [Cascata de Soft Delete](#20-cascata-de-soft-delete)
21. [Testes — Cobertura Atual](#21-testes--cobertura-atual)
22. [Regras Implícitas Detectadas](#22-regras-implícitas-detectadas)
23. [Pendências e Lacunas Conhecidas](#23-pendências-e-lacunas-conhecidas)

---

## 1. Visão Geral E2E

A Matriz de Riscos v4 é o **artefato central** do produto IA SOLARIS. Ela transforma gaps de compliance (identificados via questionários e engine de gaps) em riscos jurídicos rastreáveis, vinculados a artigos da LC 214/2025, validados pelo corpus RAG e organizados em planos de ação com tarefas atômicas.

O fluxo completo percorre **7 etapas sequenciais**:

```
[Questionários] → [Gaps v3] → [Briefing] → [Riscos v4] → [Planos de Ação] → [Tarefas] → [Score + PDF]
   Step 1-3          Step 4       Step 4        Step 5          Step 6          Step 6      Step 7
```

A Matriz de Riscos ocupa o **Step 5** do fluxo, mas seus dados alimentam todos os artefatos subsequentes (planos, tarefas, score, PDF). Toda a cadeia é **determinística**: severidade, categoria e artigo legal nunca são gerados por LLM — vêm de tabelas hardcoded ou do banco `risk_categories`.

**Rastreabilidade:** `RN_CONSOLIDACAO_V4.md` · `docs/governance/RN_GERACAO_RISCOS_V4.md`

---

## 2. Camada de Dados — Schema e Migrations

### 2.1 Tabela `risks_v4` — Schema Canônico

**Arquivo:** `drizzle/0064_risks_v4.sql` (migration principal, Sprint Z-07)

| Coluna | Tipo SQL | Constraint | Descrição |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado pelo servidor |
| `project_id` | `INT` | NOT NULL | FK → `projects.id` |
| `rule_id` | `VARCHAR(255)` | NOT NULL | Chave da regra de origem (ex: `GAP-IS-001` ou `risk_key`) |
| `type` | `ENUM('risk','opportunity')` | NOT NULL | Tipo do item |
| `categoria` | `VARCHAR(100)` | NOT NULL, FK → `risk_categories.codigo` | Categoria (migration 0066/0067) |
| `titulo` | `VARCHAR(500)` | NOT NULL | Título jurídico gerado deterministicamente |
| `descricao` | `TEXT` | NULL | Descrição textual (pode ser LLM) |
| `artigo` | `VARCHAR(255)` | NOT NULL | Artigo legal — **NUNCA NULL** (RN-RISK-01) |
| `severidade` | `ENUM('alta','media','oportunidade')` | NOT NULL | Determinístico — **NUNCA vem do LLM** (RN-RISK-02) |
| `urgencia` | `ENUM('imediata','curto_prazo','medio_prazo')` | NOT NULL | Determinístico — **NUNCA vem do LLM** |
| `evidence` | `JSON` | NOT NULL | Array de evidências ordenado por SOURCE_RANK |
| `breadcrumb` | `JSON` | NOT NULL | Array de 4 nós: `[fonte, categoria, artigo, ruleId]` |
| `source_priority` | `ENUM('cnae','ncm','nbs','solaris','iagen')` | NOT NULL | Fonte de maior prioridade (menor SOURCE_RANK) |
| `confidence` | `DECIMAL(5,4)` | NOT NULL DEFAULT 1.0 | Confiança ponderada (0.0–1.0) |
| `status` | `ENUM('active','deleted')` | NOT NULL DEFAULT 'active' | Soft delete |
| `approved_by` | `INT` | NULL | ID do usuário aprovador |
| `approved_at` | `TIMESTAMP` | NULL | NULL = pendente de aprovação |
| `deleted_reason` | `TEXT` | NULL | Obrigatório quando `status='deleted'` |
| `created_by` | `INT` | NOT NULL | |
| `updated_by` | `INT` | NOT NULL | |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT NOW() | |
| `updated_at` | `TIMESTAMP` | NOT NULL DEFAULT NOW() ON UPDATE | |

**Colunas adicionadas em migrations posteriores** (`drizzle/0075_risks_v4_rag_fields.sql`, Sprint Z-13.5):

| Coluna | Tipo | Descrição |
|---|---|---|
| `risk_key` | `VARCHAR(255)` NULL | Chave de dedup: `{categoria}::op:{tipoOperacao}::geo:{multi\|mono}` |
| `operational_context` | `JSON` NULL | Contexto operacional do projeto (CNAEs, regime, porte, etc.) |
| `evidence_count` | `INT` NOT NULL DEFAULT 0 | Número de gaps consolidados neste risco |
| `rag_validated` | `TINYINT(1)` NOT NULL DEFAULT 0 | 1 = validado pelo RAG |
| `rag_confidence` | `DECIMAL(3,2)` NOT NULL DEFAULT 0 | Confiança RAG (0.00–1.00) |
| `rag_artigo_exato` | `VARCHAR(255)` NULL | Artigo exato encontrado no corpus |
| `rag_paragrafo` | `VARCHAR(100)` NULL | Parágrafo do artigo |
| `rag_inciso` | `VARCHAR(100)` NULL | Inciso do artigo |
| `rag_trecho_legal` | `TEXT` NULL | Trecho legal exato (primeiros 500 chars) |
| `rag_query` | `VARCHAR(500)` NULL | Query usada na busca RAG |
| `rag_validation_note` | `TEXT` NULL | Nota de validação (motivo de falha ou observação) |

**Índices:** `project_id`, `status`, `rule_id`

**Regra implícita detectada:** `categoria` foi originalmente `ENUM` hardcoded (migration 0064), depois convertida para `VARCHAR(100)` (migration 0066) e vinculada por FK à tabela `risk_categories` (migration 0067). Qualquer nova categoria deve ser inserida em `risk_categories` antes de ser usada em `risks_v4`.

---

### 2.2 Tabela `action_plans`

**Arquivo:** `drizzle/0064_risks_v4.sql` + `drizzle/0077_add_180_dias_prazo.sql`

| Coluna | Tipo SQL | Constraint | Descrição |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PK | UUID v4 |
| `project_id` | `INT` | NOT NULL | |
| `risk_id` | `VARCHAR(36)` | NOT NULL, FK → `risks_v4.id` | Vínculo obrigatório ao risco |
| `titulo` | `VARCHAR(500)` | NOT NULL | |
| `descricao` | `TEXT` | NULL | |
| `responsavel` | `VARCHAR(100)` | NOT NULL | |
| `prazo` | `ENUM('30_dias','60_dias','90_dias','180_dias')` | NOT NULL | `180_dias` adicionado na migration 0077 |
| `status` | `ENUM('rascunho','aprovado','em_andamento','concluido','deleted')` | NOT NULL DEFAULT 'rascunho' | |
| `approved_by` | `INT` | NULL | |
| `approved_at` | `TIMESTAMP` | NULL | |
| `deleted_reason` | `TEXT` | NULL | |
| `created_by` / `updated_by` | `INT` | NOT NULL | |

**Índices:** `project_id`, `risk_id`, `status`

---

### 2.3 Tabela `tasks`

**Arquivo:** `drizzle/0064_risks_v4.sql` + `drizzle/0087_tasks_data_inicio_fim.sql`

| Coluna | Tipo SQL | Constraint | Descrição |
|---|---|---|---|
| `id` | `VARCHAR(36)` | PK | UUID v4 |
| `project_id` | `INT` | NOT NULL | |
| `action_plan_id` | `VARCHAR(36)` | NOT NULL, FK → `action_plans.id` | |
| `titulo` | `VARCHAR(500)` | NOT NULL | |
| `descricao` | `TEXT` | NULL | |
| `responsavel` | `VARCHAR(100)` | NOT NULL | |
| `prazo` | `DATE` | NULL | |
| `status` | `ENUM('todo','doing','done','blocked','deleted')` | NOT NULL DEFAULT 'todo' | |
| `ordem` | `INT` | NOT NULL DEFAULT 0 | Para ordenação manual futura |
| `deleted_reason` | `TEXT` | NULL | |
| `data_inicio` | `DATE` | NULL | Adicionado migration 0087 |
| `data_fim` | `DATE` | NULL | Adicionado migration 0087 |

---

### 2.4 Tabela `audit_log`

**Arquivo:** `drizzle/0064_risks_v4.sql`

| Coluna | Tipo SQL | Constraint | Descrição |
|---|---|---|---|
| `id` | `BIGINT` | PK AUTO_INCREMENT | |
| `project_id` | `INT` | NOT NULL | |
| `entity` | `ENUM('risk','action_plan','task')` | NOT NULL | |
| `entity_id` | `VARCHAR(36)` | NOT NULL | UUID do objeto afetado |
| `action` | `ENUM('created','updated','deleted','restored','approved')` | NOT NULL | |
| `user_id` | `INT` | NOT NULL | |
| `user_name` | `VARCHAR(255)` | NOT NULL | |
| `user_role` | `VARCHAR(100)` | NOT NULL | |
| `before_state` | `JSON` | NULL | Obrigatório no `deleted` |
| `after_state` | `JSON` | NULL | |
| `reason` | `TEXT` | NULL | Obrigatório no `deleted` |
| `created_at` | `TIMESTAMP` | NOT NULL DEFAULT NOW() | Imutável — sem `ON UPDATE` |

**Regra implícita:** `audit_log` não tem `ON UPDATE CURRENT_TIMESTAMP` em `created_at`, garantindo imutabilidade do timestamp de criação. Nunca é deletado.

---

## 3. Catálogo de Categorias (risk_categories)

**Arquivo:** `drizzle/0065_risk_categories.sql` (seed inicial, Sprint Z-09)
**Tabela:** `risk_categories` — categorias configuráveis via banco (ADR-0025)

| `codigo` | `nome` | `severidade` | `urgencia` | `tipo` | `artigo_base` | `vigencia_fim` |
|---|---|---|---|---|---|---|
| `imposto_seletivo` | Imposto Seletivo | `alta` | `imediata` | `risk` | Art. 2 LC 214/2025 | NULL (indeterminada) |
| `confissao_automatica` | Confissão Automática | `alta` | `imediata` | `risk` | Art. 45 LC 214/2025 | NULL |
| `split_payment` | Split Payment | `alta` | `imediata` | `risk` | Art. 9 LC 214/2025 | NULL |
| `inscricao_cadastral` | Inscrição Cadastral IBS/CBS | `alta` | `imediata` | `risk` | Art. 213 LC 214/2025 | NULL |
| `regime_diferenciado` | Regime Diferenciado | `media` | `curto_prazo` | `risk` | Art. 29 LC 214/2025 | NULL |
| `transicao_iss_ibs` | Transição ISS para IBS | `media` | `medio_prazo` | `risk` | Arts. 6-12 LC 214/2025 | **2032-12-31** |
| `obrigacao_acessoria` | Obrigação Acessória | `media` | `curto_prazo` | `risk` | Art. 102 LC 214/2025 | NULL |
| `aliquota_zero` | Alíquota Zero | `oportunidade` | `curto_prazo` | `opportunity` | Art. 14 LC 214/2025 | NULL |
| `aliquota_reduzida` | Alíquota Reduzida | `oportunidade` | `curto_prazo` | `opportunity` | Art. 24 LC 214/2025 | NULL |
| `credito_presumido` | Crédito Presumido | `oportunidade` | `curto_prazo` | `opportunity` | Art. 58 LC 214/2025 | NULL |

**Regras implícitas:**
- `transicao_iss_ibs` tem `vigencia_fim = 2032-12-31`: após essa data, a categoria é automaticamente excluída do engine (filtro em `getRiskCategories()` — `server/lib/risk-engine-v4.ts` linha ~120).
- O engine lê do banco com cache em memória de **1 hora** (`CACHE_TTL_MS = 60 * 60 * 1000`). Alterações no banco levam até 1h para refletir em produção sem restart.
- FK `risks_v4.categoria → risk_categories.codigo` com `ON UPDATE CASCADE, ON DELETE RESTRICT` (migration 0067): não é possível deletar uma categoria que tenha riscos associados.

**Artigos no frontend vs. seed:** O frontend (`RiskDashboardV4.tsx`) mantém um mapa `CATEGORIA_ARTIGOS` hardcoded com artigos **diferentes** dos artigos do seed. Isso é uma inconsistência implícita:

| Categoria | Artigo no seed (banco) | Artigo no frontend (hardcoded) |
|---|---|---|
| `split_payment` | Art. 9 LC 214/2025 | Art. 29 LC 214/2025 |
| `inscricao_cadastral` | Art. 213 LC 214/2025 | Art. 21 LC 214/2025 |
| `regime_diferenciado` | Art. 29 LC 214/2025 | Art. 258 LC 214/2025 |
| `obrigacao_acessoria` | Art. 102 LC 214/2025 | Art. 88 LC 214/2025 |
| `aliquota_zero` | Art. 14 LC 214/2025 | Art. 125 LC 214/2025 |
| `aliquota_reduzida` | Art. 24 LC 214/2025 | Art. 120 LC 214/2025 |
| `credito_presumido` | Art. 58 LC 214/2025 | Art. 185 LC 214/2025 |

> **Atenção:** O frontend usa `CATEGORIA_ARTIGOS` apenas como fallback de exibição no `Breadcrumb4`. O artigo canônico persiste no banco via `catArtigo = dbCat.artigo_base`. A inconsistência visual existe mas não afeta a persistência.

---

## 4. Engine de Geração — Constantes Determinísticas

**Arquivo:** `server/lib/risk-engine-v4.ts`

### 4.1 SEVERITY_TABLE (fallback hardcoded)

```typescript
// server/lib/risk-engine-v4.ts — linhas ~60-75
export const SEVERITY_TABLE: Record<Categoria, { severity: Severity; urgency: Urgency }> = {
  imposto_seletivo:     { severity: "alta",         urgency: "imediata"    },
  confissao_automatica: { severity: "alta",         urgency: "imediata"    },
  split_payment:        { severity: "alta",         urgency: "imediata"    },
  inscricao_cadastral:  { severity: "alta",         urgency: "imediata"    },
  regime_diferenciado:  { severity: "media",        urgency: "curto_prazo" },
  transicao_iss_ibs:    { severity: "media",        urgency: "medio_prazo" },
  obrigacao_acessoria:  { severity: "media",        urgency: "curto_prazo" },
  aliquota_zero:        { severity: "oportunidade", urgency: "curto_prazo" },
  aliquota_reduzida:    { severity: "oportunidade", urgency: "curto_prazo" },
  credito_presumido:    { severity: "oportunidade", urgency: "curto_prazo" },
};
```

**Regra implícita:** `SEVERITY_TABLE` é o fallback quando o banco não retorna a categoria. A prioridade é: **banco (`risk_categories`) > `SEVERITY_TABLE`**. Se o banco retornar `null` para uma categoria, o engine usa `SEVERITY_TABLE`; se a categoria não existir nem no banco nem na tabela, `severity = "media"` e `urgency = "curto_prazo"` são usados como default final.

### 4.2 SOURCE_RANK (prioridade de fonte)

```typescript
// server/lib/risk-engine-v4.ts
export const SOURCE_RANK: Record<Fonte, number> = {
  cnae: 1,   // maior prioridade
  ncm:  2,
  nbs:  3,
  solaris: 4,
  iagen:   5, // menor prioridade
};
```

**Regra:** menor número = maior confiabilidade. A `source_priority` persistida no risco é a fonte de **menor rank** (maior prioridade) entre todos os gaps consolidados. A `evidence[]` é ordenada por SOURCE_RANK crescente.

### 4.3 TITULO_TEMPLATES (títulos jurídicos determinísticos)

```typescript
// server/lib/risk-engine-v4.ts — função buildLegalTitle
const TITULO_TEMPLATES: Record<string, string> = {
  imposto_seletivo:     "Risco de incidência do Imposto Seletivo nas operações de {op}",
  confissao_automatica: "Risco de confissão automática de débitos nas operações de {op}",
  split_payment:        "Risco de não conformidade com Split Payment nas operações de {op}",
  inscricao_cadastral:  "Risco de irregularidade cadastral no IBS/CBS nas operações de {op}",
  regime_diferenciado:  "Risco de enquadramento incorreto em regime diferenciado nas operações de {op}",
  transicao_iss_ibs:    "Risco de inconsistência na transição ISS/IBS nas operações de {op}",
  obrigacao_acessoria:  "Risco de descumprimento de obrigações acessórias nas operações de {op}",
  aliquota_zero:        "Oportunidade de alíquota zero sobre produtos elegíveis nas operações de {op}",
  aliquota_reduzida:    "Oportunidade de alíquota reduzida nas operações de {op}",
  credito_presumido:    "Oportunidade de aproveitamento de crédito presumido nas operações de {op}",
};
```

`{op}` é substituído por `context.tipoOperacao ?? "geral"`. Quando `tipoOperacao` é nulo (perfil incompleto), o título usa literalmente "geral".

### 4.4 TYPE — Mapeamento implícito

`type = 'opportunity'` quando `severidade = 'oportunidade'`. Regra implícita: o campo `tipo` da tabela `risk_categories` define o tipo; quando o fallback `SEVERITY_TABLE` é usado, `catTipo = catSeverity === "oportunidade" ? "opportunity" : "risk"`.

**Invariante:** `type = 'opportunity'` → **sem plano de ação gerado** (verificado em `RiskDashboardV4.tsx` linha ~344: botão `create-action-plan-button` não é renderizado para `opportunity-card`).

---

## 5. Pipeline de Geração (generate-risks-pipeline.ts)

**Arquivo:** `server/lib/generate-risks-pipeline.ts` (Sprint Z-13.5)

O pipeline orquestra 5 etapas sequenciais e é chamado pela procedure `generateRisks` do router `risks-v4.ts`:

```
1. extractProjectProfile(projectId)     → ProjectProfile (CNAEs, regime, porte, tipoOperacao, NCMs)
2. consolidateRisks(gaps, context)      → InsertRiskV4[] (agrupados por categoria+contexto)
3. inferNormativeRisks(profile)         → InsertRiskV4[] (riscos por NCM/CNAE/regime)
4. mergeByRiskKey([...consolidated, ...inferred])  → dedup por risk_key (último vence)
5. enrichAllWithRag(merged, timeout=3s) → InsertRiskV4[] (com campos rag_*)
```

**Regras implícitas do pipeline:**

- **Etapa 3 é não-fatal:** se `inferNormativeRisks` lançar exceção, o pipeline continua com `inferred = []`. Falha silenciosa intencional (`try/catch` sem rethrow).
- **Etapa 5 tem timeout de 3 segundos:** se o RAG não responder em 3s, os riscos são persistidos **sem validação RAG** (`rag_validated = 0`). Isso é aceitável — o risco nunca é bloqueado por falha de RAG.
- **Dedup por risk_key:** quando `consolidateRisks` e `inferNormativeRisks` produzem o mesmo `risk_key`, o risco da inferência normativa **sobrescreve** o consolidado (último vence no `Map`).
- **O pipeline NÃO persiste:** a persistência é responsabilidade do router (`risks-v4.ts`, procedure `generateRisks`), que itera sobre os resultados e chama `insertRiskV4` para cada um.

---

## 6. Consolidação de Riscos (consolidateRisks)

**Arquivo:** `server/lib/risk-engine-v4.ts` — função `consolidateRisks`

A consolidação agrupa N gaps em riscos únicos por `risk_key = {categoria}::op:{tipoOperacao}::geo:{multi|mono}`.

**Algoritmo:**

1. Agrupa gaps por `risk_key` em um `Map<string, GapRule[]>`.
2. Para cada grupo: tenta buscar a categoria no banco (`getCategoryByCode`); se não encontrar, usa `SEVERITY_TABLE`.
3. Calcula `maxSeverity`: percorre todos os gaps do grupo e retorna a severidade mais alta (menor `SEVERITY_ORDER`).
4. Calcula `confidence` ponderada: `sum(evidence.confidence × evidence.weight) / sum(weight)`, onde `weight = 1 / SOURCE_RANK[fonte]`.
5. Constrói `breadcrumb = [bestSource, categoria, catArtigo, riskKey]`.
6. Ordena o resultado final por `SEVERITY_ORDER` crescente (alta → media → oportunidade).

**Fórmula de confiança ponderada:**

```
confidence = Σ(conf_i × (1/rank_i)) / Σ(1/rank_i)
```

onde `rank_i = SOURCE_RANK[gap.fonte]`. Fontes com menor rank (maior prioridade) têm maior peso na confiança final.

**buildRiskKey:**

```typescript
// server/lib/risk-engine-v4.ts
export function buildRiskKey(categoria: string, ctx: OperationalContext): string {
  const op = ctx.tipoOperacao ?? "na";
  const multi = ctx.multiestadual ? "multi" : "mono";
  return `${categoria}::op:${op}::geo:${multi}`;
}
```

**Regra implícita:** dois projetos com o mesmo `tipoOperacao` e `multiestadual` produzirão o mesmo `risk_key` para a mesma categoria. O `risk_key` **não inclui `project_id`**, portanto não é globalmente único — é único apenas dentro de um projeto (a unicidade global é garantida pelo `project_id` na tabela).

---

## 7. Inferência Normativa (normative-inference.ts)

**Arquivo:** `server/lib/normative-inference.ts` (Sprint Z-13.5, migration 0076)

A inferência normativa gera riscos adicionais a partir do perfil do projeto, independentemente dos gaps. Usa a tabela `normative_product_rules` (migration 0076).

**Triggers de inferência:**

| Trigger | Condição | Risco gerado |
|---|---|---|
| NCM elegível | NCM do produto consta em `normative_product_rules` para o regime do projeto | `aliquota_zero` ou `aliquota_reduzida` |
| CNAE alimentar | CNAE em `CNAES_ALIMENTAR` (set hardcoded de 5 CNAEs) | `credito_presumido` |
| CNAE atacadista | CNAE em `CNAES_ATACADISTA` (set hardcoded de 8 CNAEs) | `regime_diferenciado` |
| Pagamento/intermediário | `meiosPagamento` contém cartão/pix/marketplace OU `intermediarios` não vazio | `split_payment` |

**CNAEs hardcoded no arquivo:**

```typescript
// server/lib/normative-inference.ts
const CNAES_ALIMENTAR = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
]);
const CNAES_ATACADISTA = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
  "4637-1/07", "4633-8/01", "4636-2/02",
]);
```

**Regra implícita:** os CNAEs de `CNAES_ALIMENTAR` são um subconjunto de `CNAES_ATACADISTA`. Um projeto com CNAE `4639-7/01` receberá **dois** riscos inferidos: `credito_presumido` (alimentar) e `regime_diferenciado` (atacadista). Isso é intencional mas não documentado explicitamente.

---

## 8. Validação RAG (rag-risk-validator.ts)

**Arquivo:** `server/lib/rag-risk-validator.ts` (Sprint Z-13.5)
**Corpus:** tabela `ragDocuments` — 2.515 chunks (LC 214/2025 + normas relacionadas)
**Método:** busca FULLTEXT via `LIKE` (sem embeddings/vetores)

### 8.1 Queries por categoria

```typescript
// server/lib/rag-risk-validator.ts — validado em 2026-04-13
const RAG_QUERIES: Record<string, string> = {
  split_payment:        "split payment",        // ~20 hits
  confissao_automatica: "apuração do IBS",       // ~10 hits
  aliquota_zero:        "cesta básica",          // ~5 hits
  credito_presumido:    "crédito presumido",     // ~32 hits
  obrigacao_acessoria:  "obrigação acessória",   // ~7 hits
  inscricao_cadastral:  "sujeito passivo",       // ~74 hits (proxy)
  transicao_iss_ibs:    "prestação de serviços", // ~34 hits (proxy)
  imposto_seletivo:     "imposto seletivo",      // ~54 hits
  regime_diferenciado:  "regime diferenciado",   // ~3 hits
  aliquota_reduzida:    "alíquota reduzida",     // ~8 hits
};
```

**Regra implícita:** `inscricao_cadastral` e `transicao_iss_ibs` usam **proxies** (termos genéricos) porque os termos exatos não têm hits suficientes no corpus. Isso significa que o `rag_artigo_exato` retornado para essas categorias pode não ser o artigo mais relevante.

### 8.2 Lógica de enriquecimento

**Quando o RAG encontra resultado:**
- `rag_validated = 1`
- `rag_confidence = 0.85` (fixo)
- `confidence_final = confidence_base × 0.8 + 0.85 × 0.2` (blend)
- `rag_artigo_exato`, `rag_trecho_legal` (500 chars), `rag_query` preenchidos

**Quando o RAG não encontra resultado (ou timeout):**
- `rag_validated = 0`
- `confidence_final = confidence_base × 0.75` (penalidade de 25%)
- `rag_validation_note = "Base legal não localizada no corpus RAG"`

**Regra implícita crítica:** o risco **nunca é bloqueado** por falha de RAG. A penalidade de confiança (×0.75) é a única consequência. Isso garante que todos os riscos gerados sejam persistidos, independentemente da cobertura do corpus.

---

## 9. Regras de Negócio — Geração (RN-RISK)

**Arquivo fonte:** `docs/governance/RN_GERACAO_RISCOS_V4.md`

| Código | Regra | Arquivo de implementação |
|---|---|---|
| **RN-RISK-01** | `artigo` NUNCA pode ser NULL — vem de `GapRule.artigo` ou `risk_categories.artigo_base` | `risk-engine-v4.ts` → `consolidateRisks` |
| **RN-RISK-02** | `severidade` NUNCA vem do LLM — sempre de `SEVERITY_TABLE` ou `risk_categories` | `risk-engine-v4.ts` → `SEVERITY_TABLE` |
| **RN-RISK-03** | `categoria` NUNCA vem do LLM — vem de `risk_category_code` do gap | `db-queries-risks-v4.ts` → `CategoriaV4` |
| **RN-RISK-04** | 1 gap mapeado → 1 risco por categoria (N gaps da mesma categoria → 1 risco consolidado) | `risk-engine-v4.ts` → `consolidateRisks` |
| **RN-RISK-05** | `type = 'opportunity'` → `buildActionPlans` retorna `[]` (sem plano gerado) | `RiskDashboardV4.tsx` linha ~344 |
| **RN-RISK-06** | `ruleId` nunca NULL — rastreável ao gap-engine | `db-queries-risks-v4.ts` → `InsertRiskV4` |
| **RN-RISK-07** | `approved_at = NULL` ao ser criado (estado pendente) | `0064_risks_v4.sql` — coluna NULL |
| **RN-RISK-08** | `status = 'active'` ao ser criado | `0064_risks_v4.sql` — DEFAULT 'active' |
| **RN-RISK-09** | `evidence[]` ordenada por SOURCE_RANK crescente | `risk-engine-v4.ts` → `sortBySourceRank` |
| **RN-RISK-10** | `confidence` = confiança ponderada dos gaps (0.0–1.0) | `risk-engine-v4.ts` → `calcWeightedConfidence` |

---

## 10. Procedures tRPC — risks-v4 Router

**Arquivo:** `server/routers/risks-v4.ts`

| # | Procedure | Tipo | Sprint | Descrição |
|---|---|---|---|---|
| 1 | `generateRisks` | mutation | Z-07 | Orquestra pipeline completo: gaps → consolidação → RAG → persistência + planos + tarefas LLM |
| 2 | `listRisks` | query | Z-07 | Lista riscos ativos com planos e tarefas aninhados |
| 3 | `getActionPlanSuggestion` | query | Z-07 | Gera sugestão de plano via LLM para um risco |
| 4 | `deleteRisk` | mutation | Z-07 | Soft delete com cascata em planos e tarefas |
| 5 | `restoreRisk` | mutation | Z-07 | Restaura risco deletado (disponível por 90 dias) |
| 6 | `approveRisk` | mutation | Z-07 | Aprova risco: `approved_at = NOW()`, `approved_by = ctx.user.id` |
| 7 | `bulkApprove` | mutation | Z-14 #533 | Aprova todos os riscos pendentes de um projeto de uma vez |
| 8 | `upsertActionPlan` | mutation | Z-07 | Cria ou edita plano de ação |
| 9 | `deleteActionPlan` | mutation | Z-07 | Soft delete de plano com cascata em tarefas |
| 10 | `restoreActionPlan` | mutation | Z-07 | Restaura plano deletado |
| 11 | `approveActionPlan` | mutation | Z-07 | Aprova plano; dispara `persistCpieScore` fire-and-forget |
| 12 | `upsertTask` | mutation | Z-07 | Cria ou edita tarefa |
| 13 | `deleteTask` | mutation | Z-07 | Soft delete de tarefa |
| 14 | `mapGapsToRules` | mutation | Z-10 | Mapeia gaps de `project_gaps_v3` para regras de risco |
| 15 | `generateRisksFromGaps` | mutation | Z-10 | Versão simplificada de `generateRisks` (sem LLM de tarefas) |
| 16 | `getAuditLog` | query | Z-07 | Retorna audit_log de um projeto |
| 17 | `bulkGenerateActionPlans` | mutation | Z-14 | Gera planos para todos os riscos aprovados (chamado após `bulkApprove`) |
| 18 | `getProjectAuditLog` | query | Z-14 | Audit log completo do projeto |
| 19 | `calculateAndSaveScore` | mutation | Z-16 #622 | Calcula score v4 e salva snapshot em `projects.scoringData` |

**Regra implícita em `generateRisks`:** a procedure gera tarefas via LLM com **concorrência = 3** (`CONCURRENCY = 3`). Falhas individuais de geração de tarefa são capturadas e registradas no `audit_log` com `action = 'created'` e `after_state.error`, mas não interrompem o fluxo.

**Regra implícita em `approveActionPlan`:** dispara `persistCpieScore` como **fire-and-forget** (sem await). Falha silenciosa intencional — o score CPIE é atualizado de forma assíncrona.

---

## 11. Regras de Negócio — Planos de Ação (RN-AP)

**Arquivo fonte:** `docs/governance/RN_PLANOS_TAREFAS_V4.md`

| Código | Regra | Implementação |
|---|---|---|
| **RN-AP-01** | `risk_id` NUNCA NULL — plano sempre vinculado a um risco | FK `action_plans.risk_id → risks_v4.id` |
| **RN-AP-02** | `status` inicial = `'rascunho'` ao ser criado | `0064_risks_v4.sql` DEFAULT 'rascunho' |
| **RN-AP-03** | `titulo.length >= 5` — validação no router | `risks-v4.ts` → `upsertActionPlan` input validation |
| **RN-AP-04** | `responsavel` obrigatório (não vazio) | `risks-v4.ts` → `upsertActionPlan` |
| **RN-AP-05** | `prazo` obrigatório — ENUM `30_dias\|60_dias\|90_dias\|180_dias` | `0077_add_180_dias_prazo.sql` |
| **RN-AP-06** | Soft delete — NUNCA DELETE físico | `deleteActionPlan` → `status = 'deleted'` |
| **RN-AP-07** | Excluir plano → cascata soft delete em todas as tarefas filhas | `deleteActionPlan` → `deleteTasksByActionPlan` |
| **RN-AP-08** | `audit_log` registrado em toda mutação de plano | `risks-v4.ts` → `insertAuditLog` após cada mutação |
| **RN-AP-09** | `type = 'opportunity'` → sem plano de ação (botão não renderizado) | `RiskDashboardV4.tsx` linha ~344 |

**Catálogo canônico de responsáveis:**

| Valor | Label |
|---|---|
| `gestor_fiscal` | Gestor fiscal |
| `diretor` | Diretor |
| `ti` | TI |
| `juridico` | Jurídico / Advogado tributário |
| `advogado` | Advogado |

---

## 12. Regras de Negócio — Tarefas (RN-TASK)

**Arquivo fonte:** `docs/governance/RN_PLANOS_TAREFAS_V4.md`

| Código | Regra | Implementação |
|---|---|---|
| **RN-TASK-01** | `actionPlanId` NUNCA NULL — tarefa sempre vinculada a um plano | FK `tasks.action_plan_id → action_plans.id` |
| **RN-TASK-02** | `status` inicial = `'todo'` ao ser criada | `0064_risks_v4.sql` DEFAULT 'todo' |
| **RN-TASK-03** | Tarefa BLOQUEADA (`pointer-events:none, opacity:40%`) quando `action_plan.status = 'rascunho'` | `ActionPlanPage.tsx` → `isLocked = plan.status === 'rascunho'` |
| **RN-TASK-04** | Tarefa LIBERADA apenas quando `action_plan.status = 'aprovado'` | `ActionPlanPage.tsx` → `isLocked` |
| **RN-TASK-05** | Soft delete — NUNCA DELETE físico | `deleteTask` → `status = 'deleted'` |
| **RN-TASK-06** | Excluir plano → cascata soft delete em tarefas filhas | `deleteActionPlan` → cascata |
| **RN-TASK-07** | `audit_log` registrado em toda mutação de tarefa | `risks-v4.ts` → `insertAuditLog` |
| **RN-TASK-08** | Barra de progresso = `COUNT(status='done') / COUNT(*)` | `ActionPlanPage.tsx` → cálculo inline |

**Máquina de estados de tarefa:**

```
todo → doing → done → todo (toggle)
doing → blocked → todo
```

**Regra implícita:** `titulo.length >= 3` é a validação mínima de tarefa (vs. `>= 5` para planos). Implementado no input schema do `upsertTask`.

---

## 13. Score de Compliance v4 (RN-CV4)

**Arquivo:** `server/lib/compliance-score-v4.ts` (Sprint Z-16 #622)
**Fórmula:** `score = round(Σ(peso × max(confidence, 0.5)) / (n × 9) × 100)`

### 13.1 Constantes

```typescript
// server/lib/compliance-score-v4.ts
export const SEVERIDADE_SCORE_MAP: Record<string, number> = {
  alta:        7,
  media:       5,
  oportunidade: 1,  // incluída no denominador mas com peso baixo
};
export const CONFIDENCE_FLOOR = 0.5;  // RN-CV4-04
export const MAX_PESO = 9;            // peso máximo possível (alta=7, mas denominador usa 9)
```

**Nota:** `MAX_PESO = 9` é maior que `SEVERIDADE_SCORE_MAP.alta = 7`. Isso significa que o score máximo teórico é `7/9 × 100 ≈ 77.8%` para um projeto com apenas riscos `alta` todos com `confidence = 1.0`. O score de 100% é **matematicamente impossível** com a fórmula atual para riscos `alta`.

### 13.2 Regras RN-CV4

| Código | Regra |
|---|---|
| **RN-CV4-01** | Apenas riscos com `approved_at != NULL` entram no cálculo |
| **RN-CV4-02** | Oportunidades (`type = 'opportunity'`) ficam **fora** do denominador |
| **RN-CV4-03** | Snapshot acumulado — nunca deletado (`projects.scoringData.snapshots[]`) |
| **RN-CV4-04** | `confidence` mínima = 0.5 (floor) — evita score zero por confiança baixa |
| **RN-CV4-10** | Cada cálculo adiciona snapshot com timestamp; histórico preservado |
| **RN-CV4-14** | Nível determinístico: `critico` (≥75%) · `alto` (≥50%) · `medio` (≥25%) · `baixo` (<25%) |

**Regra implícita:** o score é calculado **no frontend** via `calculateAndSaveScore` mutation, disparada ao montar `ConsolidacaoV4.tsx` (useEffect). Não há cálculo automático no backend — o score só é atualizado quando o usuário visita a página de consolidação.

---

## 14. Score CPIE (Scoring Engine)

**Arquivo:** `server/routers/scoringEngine.ts` (Sprint I)

O Score CPIE é um score **diferente** do Score de Compliance v4. Ele usa dados das tabelas **legadas** (`project_gaps_v3`, `project_risks_v3`, `project_actions_v3`) e não da `risks_v4`.

### 14.1 Fórmula CPIE

```
cpieScore = round(
  gapScore   × 0.40 +
  riskScore  × 0.35 +
  actionScore × 0.25
)
```

### 14.2 Pesos por dimensão

| Dimensão | Peso | Fonte de dados |
|---|---|---|
| Gap Score | 40% | `project_gaps_v3` — ponderado por criticidade |
| Risk Score | 35% | `project_risks_v3` — ponderado por nível de risco |
| Action Score | 25% | `project_actions_v3` — proporção de ações concluídas |

**Pesos de criticidade de gap:** `critica=3.0, alta=2.0, media=1.0, baixa=0.5`
**Pesos de nível de risco:** `critico=4.0, alto=3.0, medio=2.0, baixo=1.0`
**Pesos de prioridade de ação:** `imediata=3.0, curto_prazo=2.0, medio_prazo=1.5, planejamento=1.0`

### 14.3 Níveis de maturidade CPIE

| Score | Nível | Label | Cor |
|---|---|---|---|
| ≥ 85 | `excelente` | Excelente | `#16a34a` (verde) |
| ≥ 70 | `alto` | Alto | `#2563eb` (azul) |
| ≥ 50 | `medio` | Médio | `#d97706` (âmbar) |
| ≥ 30 | `baixo` | Baixo | `#dc2626` (vermelho) |
| < 30 | `critico` | Crítico | `#7f1d1d` (vermelho escuro) |

**Regra implícita crítica:** Score CPIE e Score de Compliance v4 são **dois scores independentes** com fontes de dados diferentes. O Score CPIE usa tabelas v3 (legadas); o Score v4 usa `risks_v4`. Eles coexistem no produto e são exibidos em páginas diferentes. Não há sincronização automática entre eles.

---

## 15. Frontend — RiskDashboardV4

**Arquivo:** `client/src/components/RiskDashboardV4.tsx` (1.272 linhas, Sprint Z-07)
**Rota:** `/projetos/:projectId/risk-dashboard-v4`
**Wrapper:** `client/src/pages/RiskDashboardV4Page.tsx`

### 15.1 Estrutura de abas

| Aba | `data-testid` | Conteúdo |
|---|---|---|
| Riscos | — | Cards de riscos ativos filtrados |
| Oportunidades | — | Cards de oportunidades ativas |
| Histórico | `history-tab` | Riscos deletados (soft delete) |

### 15.2 Filtros disponíveis

- **Severidade:** `todos` · `alta` · `media` · `oportunidade`
- **Categoria:** `todos` + todas as 10 categorias ativas

**Regra implícita:** os filtros são aplicados apenas sobre `activeRisks` (status='active' AND type='risk'). Oportunidades e histórico têm suas próprias listas não filtradas.

### 15.3 Summary Bar (`data-testid="summary-bar"`)

Exibe contadores em tempo real:
- `summary-count-alta` — riscos com severidade `alta`
- `summary-count-media` — riscos com severidade `media`
- `summary-count-oportunidade` — oportunidades

### 15.4 Botão "Ver Planos de Ação" (`data-testid="btn-ver-planos"`)

**Regra condicional (Sprint Z-17 #668):**
- Exibido **habilitado** se `activeRisks.some(r => r.approved_at)` (pelo menos 1 risco aprovado)
- Exibido **desabilitado** se nenhum risco aprovado
- **Não exibido** se não há riscos ativos

### 15.5 Breadcrumb4 — 4 nós obrigatórios

```
[fonte] › [categoria] › [Art. X] › [ruleId]
```

Cores: `fonte=azul`, `categoria=roxo`, `artigo=verde`, `ruleId=cinza`

### 15.6 RAG Badge

- `data-testid="rag-badge-validated"` — exibido quando `rag_validated = 1`
- `data-testid="rag-badge-pending"` — exibido quando `rag_validated = 0`

### 15.7 Aprovação de risco

- Botão `data-testid="approve-risk-button"` — visível apenas quando `!risk.approved_at`
- Após aprovação: card muda de borda âmbar para verde; botão some
- `bulkApprove` (`data-testid="bulk-approve-button"`) — aprova todos de uma vez

---

## 16. Frontend — ActionPlanPage

**Arquivo:** `client/src/pages/ActionPlanPage.tsx`
**Rota:** `/projetos/:projectId/planos-de-acao`

### 16.1 Labels de status

| Status | Label | Cor |
|---|---|---|
| `rascunho` | Rascunho | âmbar |
| `aprovado` | Aprovado | verde |
| `em_andamento` | Em Andamento | azul |
| `concluido` | Concluído | cinza |
| `deleted` | Excluído | dashed |

### 16.2 Traceability Banner (`data-testid="traceability-banner"`)

Banner sticky no topo com 5 chips de rastreabilidade:
`[fonte] › [categoria] › [artigo] › [ruleId] › [risco]`

Construído a partir do `breadcrumb` do risco pai. Regra implícita: se `breadcrumb` não for array válido, faz fallback para `[source_priority, categoria, artigo, rule_id]` do risco.

### 16.3 Lock de tarefas

`isLocked = plan.status === 'rascunho'` → `pointer-events: none, opacity: 40%` nas tarefas.

### 16.4 Indicador de atraso (`data-testid="task-overdue-indicator"`)

```typescript
// ActionPlanPage.tsx
function isOverdue(task): boolean {
  if (task.status === "done" || task.status === "deleted") return false;
  if (!task.data_fim) return false;
  return new Date(task.data_fim) < new Date();
}
```

### 16.5 Ordenação de tarefas

```typescript
// ActionPlanPage.tsx — sortTasks
// Ordem: overdue primeiro → todo → doing → blocked → done → deleted
// Dentro de cada grupo: por data_fim crescente
```

### 16.6 Botão "Ver Consolidação" (`data-testid="btn-ver-consolidacao"`)

Adicionado no Sprint Z-19 #712 (PR aberto). Navega para `/projetos/:projectId/consolidacao-v4`.

### 16.7 Botão "Exportar PDF" (`data-testid="btn-exportar-pdf"`)

Visível no header. Usa `generateDiagnosticoPDF` de `client/src/lib/generateDiagnosticoPDF.ts` — geração **no browser** via jsPDF, sem tráfego de servidor.

---

## 17. Frontend — ConsolidacaoV4

**Arquivo:** `client/src/pages/ConsolidacaoV4.tsx`
**Rota:** `/projetos/:projectId/consolidacao-v4`

### 17.1 KPI Grid (`data-testid="kpi-grid"`)

| `data-testid` | Métrica |
|---|---|
| `kpi-score` | Score de compliance (%) |
| `kpi-alta` | Total de riscos `alta` aprovados |
| `kpi-media` | Total de riscos `media` aprovados |

### 17.2 Compliance Score Card (`data-testid="compliance-score-card"`)

Exibe score calculado via `trpc.risksV4.calculateAndSaveScore` (disparado no `useEffect` do mount). Inclui `data-testid="score-transparencia"` com texto: "Calculado com base em X riscos aprovados".

### 17.3 Tabela de riscos aprovados (`data-testid="tabela-riscos-aprovados"`)

Colunas: Risco · Severidade · Origem · Base Legal · RAG · (ações)

### 17.4 Disclaimer obrigatório (`data-testid="disclaimer-box"`)

Exibido sempre no topo. Texto: aviso de que o diagnóstico é orientativo e não substitui assessoria jurídica especializada.

### 17.5 Timeline da Reforma

Exibe marcos fixos hardcoded:

| Ano | Label |
|---|---|
| 2026 | Início da transição IBS/CBS |
| 2027 | Fase de calibragem |
| 2029 | Extinção do PIS/COFINS |
| 2033 | Extinção do ISS/ICMS |

---

## 18. Artefatos do Fluxo E2E

**Arquivo fonte:** `docs/governance/RN_CONSOLIDACAO_V4.md`

| # | Artefato | Tabela/Campo | Gerado por | Destinatário |
|---|---|---|---|---|
| 1 | Respostas dos questionários | `solaris_answers`, `iagen_answers` | Usuário | Sistema |
| 2 | Gaps de compliance | `project_gaps_v3` | Gap Engine | Sistema |
| 3 | Briefing aprovado | `projects.briefingData` (JSON) | LLM + RAG | Advogado |
| 4 | **Matriz de Riscos** | `risks_v4` | Pipeline v4 (determinístico) | Advogado |
| 5 | Planos de Ação | `action_plans` + `tasks` | LLM (tarefas) + manual | Advogado |
| 6 | Score de Compliance | `projects.scoringData` (JSON) | `calculateComplianceScore` (puro) | Sistema |
| 7 | PDF de Diagnóstico | arquivo local | jsPDF (browser) | Cliente final |
| 8 | Audit Log | `audit_log` | Toda mutação | Auditoria fiscal |

---

## 19. Audit Log — Regras de Imutabilidade

**Arquivo:** `drizzle/0064_risks_v4.sql` + `server/lib/db-queries-risks-v4.ts`

Toda mutação nas entidades `risk`, `action_plan` e `task` gera uma entrada no `audit_log`. As regras são:

- `before_state` é **obrigatório** quando `action = 'deleted'`
- `reason` é **obrigatório** quando `action = 'deleted'` e `reason.length >= 10`
- `audit_log` é **permanente** — nunca deletado, base para auditoria fiscal
- `created_at` não tem `ON UPDATE` — timestamp imutável
- Falha de LLM na geração de tarefas também gera entrada com `after_state.error`

---

## 20. Cascata de Soft Delete

**Arquivo:** `server/routers/risks-v4.ts` — procedures `deleteRisk`, `deleteActionPlan`, `deleteTask`

```
Excluir RISCO:
  risks_v4.status = 'deleted', deleted_reason = reason
  → action_plans WHERE risk_id = riskId → status = 'deleted'
  → tasks WHERE action_plan_id IN [planIds] → status = 'deleted'
  audit_log: entity='risk', action='deleted', before_state=risco, reason=reason

Excluir PLANO:
  action_plans.status = 'deleted', deleted_reason = reason
  → tasks WHERE action_plan_id = planId → status = 'deleted'
  audit_log: entity='action_plan', action='deleted', before_state=plano, reason=reason

Excluir TAREFA:
  tasks.status = 'deleted'
  Sem cascata (nível folha)
  audit_log: entity='task', action='deleted'

Restaurar RISCO:
  risks_v4.status = 'active'
  → action_plans: status restaurado
  → tasks: status restaurado
  audit_log: entity='risk', action='restored'
```

**Regra implícita:** restore de risco restaura **todos** os planos e tarefas filhos, independentemente do estado em que estavam antes da exclusão. Não há granularidade de restore parcial.

---

## 21. Testes — Cobertura Atual

### 21.1 Unit Tests (Vitest)

| Arquivo | Bloco | Casos | Cobertura |
|---|---|---|---|
| `server/lib/risk-engine-v4.test.ts` | Bloco A: `classifyRisk` | 3 | Severidade/urgência determinísticas |
| | Bloco B: `buildBreadcrumb` | 2 | 4 nós obrigatórios |
| | Bloco C: `sortBySourceRank` | 2 | Ordenação por SOURCE_RANK |
| | Bloco D: `computeRiskMatrix` | 2 | Ordenação por SEVERITY_ORDER |
| | Bloco E: `getRiskCategories` | 3 | Cache + vigência_fim + DB |
| | Bloco F: `consolidateRisks` | 4 | Agrupamento, dedup, evidence_count |
| `server/lib/rag-risk-validator.test.ts` | T-04 | 3 | Import, tipos RAG, penalidade sem resultado |
| `server/routers/scoringEngine.test.ts` | T-B8-01..10 | 10 | Score CPIE, dimensões, maturidade |

### 21.2 E2E Tests (Playwright)

| Arquivo | Casos | Cobertura |
|---|---|---|
| `tests/e2e/z14-risk-action-plan.spec.ts` | CT-01..09 | Dashboard, cards, aprovação, oportunidade sem plano |
| `tests/e2e/z17-pipeline-completo.spec.ts` | CT-01..20 | Pipeline completo: questionários → gaps → riscos → planos → tarefas |
| `tests/e2e/action-plan-ui-refinements.spec.ts` | CT-01..16 | UI Sprint Z-19: textos, badges, botões, breadcrumb |
| `tests/e2e/pdf-consolidacao.spec.ts` | — | Geração de PDF na ConsolidacaoV4 |

### 21.3 Lacunas de cobertura identificadas

- Sem teste para `normative-inference.ts` (inferência normativa)
- Sem teste para `generate-risks-pipeline.ts` (pipeline completo)
- Sem teste para `compliance-score-v4.ts` (score v4)
- Sem teste E2E para `ConsolidacaoV4.tsx` (fluxo completo de consolidação)
- Sem teste para cascata de soft delete (risco → planos → tarefas)

---

## 22. Regras Implícitas Detectadas

As regras a seguir **não estão documentadas explicitamente** nos docs de governança mas foram identificadas na varredura do código-fonte:

| ID | Regra Implícita | Arquivo | Impacto |
|---|---|---|---|
| **RI-01** | `CATEGORIA_ARTIGOS` no frontend é hardcoded e diverge dos artigos do seed do banco | `RiskDashboardV4.tsx` + `0065_risk_categories.sql` | Inconsistência visual (não afeta persistência) |
| **RI-02** | Cache de categorias tem TTL de 1h — alterações no banco levam até 1h para refletir | `risk-engine-v4.ts` linha ~85 | Delay de propagação de mudanças em `risk_categories` |
| **RI-03** | `risk_key` não inclui `project_id` — não é globalmente único | `risk-engine-v4.ts` → `buildRiskKey` | Dedup funciona apenas dentro de um projeto |
| **RI-04** | Score de Compliance v4 só é calculado quando o usuário visita `ConsolidacaoV4` | `ConsolidacaoV4.tsx` → `useEffect` | Score pode estar desatualizado se usuário não visitar a página |
| **RI-05** | Score CPIE usa tabelas v3 legadas, não `risks_v4` | `scoringEngine.ts` | Dois scores independentes coexistem; não há sincronização |
| **RI-06** | `MAX_PESO = 9` torna score de 100% matematicamente impossível para riscos `alta` | `compliance-score-v4.ts` | Score máximo teórico ≈ 77.8% para projetos com apenas riscos `alta` |
| **RI-07** | Restore de risco restaura **todos** os filhos sem granularidade | `risks-v4.ts` → `restoreRisk` | Não é possível restaurar risco sem restaurar planos/tarefas |
| **RI-08** | CNAEs de `CNAES_ALIMENTAR` são subconjunto de `CNAES_ATACADISTA` — projeto alimentar recebe 2 riscos inferidos | `normative-inference.ts` | Comportamento intencional mas não documentado |
| **RI-09** | `inscricao_cadastral` e `transicao_iss_ibs` usam proxies no RAG — artigo retornado pode não ser o mais relevante | `rag-risk-validator.ts` → `RAG_QUERIES` | Qualidade do `rag_artigo_exato` para essas categorias é menor |
| **RI-10** | Falha de geração de tarefa via LLM não interrompe o fluxo — registrada no audit_log com `action='created'` e `after_state.error` | `risks-v4.ts` → `generateRisks` | Risco pode ter plano sem tarefas sem alerta explícito ao usuário |
| **RI-11** | `prazo` de `action_plans` originalmente era ENUM de 3 valores; `180_dias` foi adicionado em migration posterior (0077) — código legado pode não suportar `180_dias` | `0077_add_180_dias_prazo.sql` | Verificar compatibilidade em código legado que usa `action_plans` |
| **RI-12** | `titulo` do risco é construído a partir de `TITULO_TEMPLATES` com `{op} = "geral"` quando `tipoOperacao` é null | `risk-engine-v4.ts` → `buildLegalTitle` | Projetos sem perfil operacional completo recebem títulos genéricos ("nas operações de geral") |

---

## 23. Pendências e Lacunas Conhecidas

| ID | Pendência | Arquivo/Issue | Status |
|---|---|---|---|
| **P-01** | Inconsistência de artigos entre `CATEGORIA_ARTIGOS` (frontend) e seed do banco | `RiskDashboardV4.tsx` vs `0065_risk_categories.sql` | Aberto |
| **P-02** | Sem testes unitários para `normative-inference.ts` | — | Backlog |
| **P-03** | Sem testes unitários para `compliance-score-v4.ts` | — | Backlog |
| **P-04** | Sem testes E2E para `ConsolidacaoV4.tsx` | — | Backlog |
| **P-05** | `PENDENCIA_RAG_EXPANSAO_NCM_NBS.md` — expansão do corpus RAG para NCM/NBS pendente | `docs/governance/PENDENCIA_RAG_EXPANSAO_NCM_NBS.md` | Aberto |
| **P-06** | Score CPIE e Score v4 coexistem sem sincronização — usuário pode ver scores conflitantes | `scoringEngine.ts` vs `compliance-score-v4.ts` | Decisão de produto pendente |
| **P-07** | PR #714 (Sprint Z-19 UI refinements) aberto — aguardando teste manual P.O. | `feat/z19-712-ui-refinements` | Aguardando ETAPA 3 |
| **P-08** | `RN_GERACAO_RISCOS_V4.md` linha 92 contém `tributacao_servicos` — categoria descartada, nunca implementada (D8 falso positivo) | `docs/governance/RN_GERACAO_RISCOS_V4.md:92` | Remover linha |
| **P-09** | Thresholds RN-CV4-14 divergem: código usa 75/50/25, `RN_CONSOLIDACAO_V4.md §3` usa 70/50/30 — decisão de produto pendente (E1) | `compliance-score-v4.ts:46` vs `RN_CONSOLIDACAO_V4.md §3` | Decisão P.O. |
| **P-10** | Score CPIE zerado em produção para projetos v4 — tabelas v3 não populadas (ADR-0023, E3) | `scoringEngine.ts` | Decisão P.O. |

---

## 24. Errata — Revisão 2026-04-18 (Sessão Z-19)

Após revisão pelo Orquestrador (Claude), as seguintes correções foram aplicadas a este inventário:

| Item | Correção |
|---|---|
| **D8 (falso positivo)** | `tributacao_servicos` **não existe** no banco live. SELECT confirmou 10 registros (IDs 1–10), todos do seed de 2026-04-10. A categoria aparece apenas em `RN_GERACAO_RISCOS_V4.md:92` como artefato descartado. |
| **RI-06 (MAX_PESO)** | Reclassificado de "bug" para "comportamento a confirmar com P.O." — pode ser reserva de margem intencional. |
| **E1 (thresholds)** | Divergência real confirmada: código usa `critico≥75/alto≥50/medio≥25/baixo<25`; RN doc usa `70 ou totalAlta≥2 / 50 ou totalAlta≥1 / 30 / <30`. Decisão de produto pendente. |
| **E3 (CPIE zerado)** | Score CPIE zerado em produção para projetos v4 — `profileCompleteness=0` no projeto 930001 confirma. Tabelas v3 não são populadas pelo pipeline v4. |

---

*IA SOLARIS · Inventário de Regras · Matriz de Riscos v4*
*Gerado em: 2026-04-18 · Varredura: repositório completo (branch main SHA 3afc592)*
*Revisão: 2026-04-18 (Sessão Z-19) — errata D8/E1/E3/RI-06 aplicada*
*Próxima revisão recomendada: após Sprint Z-20 ou merge do PR #714*
