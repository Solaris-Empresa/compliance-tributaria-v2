# Spec — Sprint Z-09
## Categorias Configuráveis + RAG Sensor + Score CPIE v4
## `docs/sprints/Z-09/SPEC-Z09.md`
## 2026-04-09

---

## Objetivo

Eliminar os 4 gaps arquiteturais (GAP-ARCH-06..09) identificados
após Z-07/Z-08 e tornar o engine de riscos evoluível sem deploy.

---

## PRs — ordem de execução

```
PR #A (Manus)        → tabela + seed
PR #B (Claude Code)  → engine lê do banco   (paralelo com #A)
       merge A+B
PR #C (Manus)        → migration VARCHAR    (depende de #B)
PR #D (Manus)        → RAG sensor + admin   (depende de #C)
```

---

## PR #A — Tabela risk_categories + seed (Manus)

**Branch:** `feat/risk-categories-table`

**Arquivos a criar:**
```
drizzle/0065_risk_categories.sql
server/lib/db-queries-risk-categories.ts
```

**Schema:** conforme ADR-0025 (15 campos + status/origem/escopo em português)

**Funções obrigatórias em db-queries-risk-categories.ts:**
```typescript
listActiveCategories(): Promise<RiskCategory[]>
  // WHERE status='ativo' AND vigencia_inicio <= NOW()
  // AND (vigencia_fim IS NULL OR vigencia_fim >= NOW())

getCategoryByCode(codigo: string): Promise<RiskCategory | null>

upsertCategory(data: InsertRiskCategory): Promise<RiskCategory>

suggestCategory(data: SuggestedCategory): Promise<void>
  // INSERT com status='sugerido'

approveSuggestion(id: number, aprovadoPor: string): Promise<void>
  // UPDATE status='ativo' + aprovado_por + aprovado_at

rejectSuggestion(id: number, motivo: string): Promise<void>
  // UPDATE status='inativo'

listPendingSuggestions(): Promise<RiskCategory[]>
  // WHERE status='sugerido'
```

**Seed:** 10 categorias atuais conforme ADR-0025
(transicao_iss_ibs com vigencia_fim = '2032-12-31')

**Gate:**
```
tsc 0 erros
SELECT COUNT(*) FROM risk_categories WHERE status='ativo' → 10
SELECT * FROM risk_categories WHERE vigencia_fim IS NOT NULL → 1 (transicao_iss_ibs)
```

---

## PR #B — Engine lê do banco (Claude Code)

**Branch:** `feat/engine-db-categories`

**Arquivo a atualizar:** `server/lib/risk-engine-v4.ts`

**Mudança:**
```typescript
// REMOVER:
export const SEVERITY_TABLE = { ... } // hardcode

// ADICIONAR:
import { listActiveCategories } from './db-queries-risk-categories'

// Cache em memória com TTL 1 hora
let categoriesCache: RiskCategoryMap | null = null
let cacheLoadedAt: number = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hora

export async function getRiskCategories(): Promise<RiskCategoryMap> {
  if (categoriesCache && Date.now() - cacheLoadedAt < CACHE_TTL) {
    return categoriesCache
  }
  const rows = await listActiveCategories()
  categoriesCache = Object.fromEntries(rows.map(r => [r.codigo, r]))
  cacheLoadedAt = Date.now()
  return categoriesCache
}
```

**Testes a atualizar (30 → 32 testes):**
```
Novos testes:
  R-31: cache retorna mesmos dados na segunda chamada (sem query)
  R-32: categoria com vigencia_fim expirada não aparece nos resultados
```

**Gate:**
```
32/32 testes PASS
tsc 0 erros
```

---

## PR #C — Migration VARCHAR (Manus)

**Branch:** `feat/risks-v4-categoria-varchar`

**Arquivo:**
```
drizzle/0066_risks_v4_categoria_varchar.sql
```

**Conteúdo:**
```sql
-- Migration 0066 — Sprint Z-09
-- Remove ENUM hardcoded de risks_v4.categoria
ALTER TABLE risks_v4
  MODIFY COLUMN categoria VARCHAR(100) NOT NULL;
```

**Gate:**
```
Migration executada
SHOW COLUMNS FROM risks_v4 LIKE 'categoria' → VARCHAR(100)
SELECT COUNT(*) FROM risks_v4 → mesmo número (dados íntegros)
tsc 0 erros
```

---

## PR #D — RAG Sensor + Painel Admin (Manus)

**Branch:** `feat/rag-category-sensor`

**Arquivos a criar:**
```
server/lib/rag-category-sensor.ts
server/routers/adminCategoriesRouter.ts
client/src/pages/AdminCategorias.tsx
```

### rag-category-sensor.ts

```typescript
// Executado após pnpm rag:ingest
export async function detectNewCategories(
  newChunkIds: number[]
): Promise<void> {

  for (const chunkId of newChunkIds) {
    const chunk = await getChunkById(chunkId)
    const activeCategories = await listActiveCategories()

    // Verificar se artigos do chunk mapeiam para categorias existentes
    const confidence = await matchChunkToCategories(chunk, activeCategories)

    if (confidence.maxScore < 0.70) {
      // Confiança < 70% → arquivar sem alerta
      continue
    }

    if (confidence.maxScore < 0.90) {
      // 70-90% → sugerir para aprovação
      await suggestCategory({
        codigo: generateCodigo(chunk),
        nome: extractNome(chunk),
        artigo_base: extractArtigo(chunk),
        lei_codigo: chunk.leiCodigo,
        origem: 'rag_sensor',
        status: 'sugerido',
        chunk_origem_id: chunkId,
        sugerido_por: 'rag-sensor-v1'
      })
    }
    // > 90% → categoria já existe, sem ação
  }
}
```

### adminCategoriesRouter.ts — procedures

```
listSuggestions    → listPendingSuggestions()
approveSuggestion  → approveSuggestion() + invalida cache
rejectSuggestion   → rejectSuggestion()
listAllCategories  → todas (admin vê inativas também)
upsertCategory     → CRUD manual
```

### AdminCategorias.tsx — painel

```
Tabela: sugestões pendentes
  Colunas: codigo · nome sugerido · artigo_base · chunk de origem
  Ação: expandir chunk original (para o Dr. Rodrigues ler antes de aprovar)
  Botões: Aprovar (abre modal para preencher severidade+urgência) · Rejeitar

Tabela: categorias ativas
  Colunas: codigo · nome · severidade · vigência · origem · escopo
  Ação: editar · desativar

Badge de SLA:
  Sugestão com > 15 dias sem aprovação → linha destacada em âmbar
```

**Gate:**
```
tsc 0 erros
Teste: ingerir chunk sintético com artigo fictício
→ INSERT em risk_categories com status='sugerido' ✅
→ aparece no painel admin ✅
→ Dr. Rodrigues aprova → status='ativo' ✅
→ engine usa na próxima geração (após TTL 1h) ✅
```

---

## Badge de análise desatualizada (todos os PRs)

Campo a adicionar em `projects`:
```sql
ALTER TABLE projects ADD COLUMN ultima_analise_at TIMESTAMP NULL;
```

Lógica:
```
Se ultima_analise_at < MAX(created_at FROM risk_categories WHERE status='ativo')
→ exibir badge "Análise desatualizada — nova categoria disponível"
→ botão "Re-diagnosticar"
```

---

## Critério de encerramento Z-09

```
[ ] risk_categories: 10 categorias ativas em produção
[ ] Engine lendo do banco com cache 1h
[ ] risks_v4.categoria = VARCHAR(100)
[ ] RAG sensor operacional (teste com chunk real)
[ ] Painel admin: sugestão → aprovação → engine usa
[ ] Badge "análise desatualizada" funcionando
[ ] 32/32 testes PASS
[ ] ADR-0025 mergeado
[ ] ESTADO-ATUAL e BASELINE atualizados
```

---

*IA SOLARIS · Spec Sprint Z-09 · 2026-04-09*
*Resolve: GAP-ARCH-06 · GAP-ARCH-07 · GAP-ARCH-08 · GAP-ARCH-09*
