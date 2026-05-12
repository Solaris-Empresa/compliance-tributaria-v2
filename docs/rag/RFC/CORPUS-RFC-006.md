# CORPUS-RFC-006 — Sprint 0 RAG: LIMIT 20 + Pass 3 NCM + Telemetria + CNAES_ALIMENTAR

| Campo | Valor |
|---|---|
| **ID** | CORPUS-RFC-006 |
| **Título** | Sprint 0 RAG — D4 (LIMIT 20) + P3 (Pass 3 NCM-Targeted) + A0 (Telemetria) + A4 (CNAES_ALIMENTAR + 4623-1/09) |
| **Status** | EXECUTED |
| **Sprint** | Sprint RAG P3 / Sprint 0 |
| **PR** | (a definir) |
| **Branch** | `feat/rag-sprint0-corpus-rfc-006` |
| **Data** | 2026-05-12 |
| **Autor** | claude-code (impl) + manus (migration 0060) |
| **Aprovador** | utapajos (P.O.) — autorização em 12/05/2026 18:46 |

---

## Contexto

A Sprint 0 RAG é **fix de pipeline/retrieval** — NÃO é curadoria do Cap. 23 NCM (essa entra em sprints posteriores). O escopo formaliza 4 mudanças desbloqueadoras identificadas no diagnóstico do projeto canônico #5040001 (NCMs 2306/2304 — farelos de soja) e na análise CORPUS-RFC-005/PV-03:

1. **D4 — LIMIT 20:** Pass 1 e Pass 2 do retriever limitavam a 10 candidatos. Quando a categoria tem mais de 10 artigos potencialmente relevantes (típico em LC 214 setoriais), a janela superior cortava conteúdo antes do re-ranking. Subir para 20 dobra a janela sem afetar latência (LIKE indexado).

2. **P3 — Pass 3 NCM-Targeted:** Issue #997 introduziu Two-Pass Retrieval (Pass 1 genérico + Pass 2 setorial via `isSetorialArtigo`). Projetos com NCMs específicos (2304, 2306, 2902, etc.) continuam dependendo apenas do Pass 2 setorial — quando o artigo do Cap. 23 não é setorial-marcado, fica fora do topo. Pass 3 NCM-Targeted faz LIKE específico em `conteudo + topicos` por NCM extraído do `contextQuery`, agregando até 15 candidatos extras (5 por NCM, top-3 NCMs).

3. **A0 — Telemetria de retrieval (`rag_usage_log`):** observabilidade do pipeline. Já existia em `drizzle/0060_soft_skin.sql:68-80` mas não havia ainda RFC formalizando o uso. Manus criou a tabela em produção em 12/05/2026.

4. **A4 — CNAES_ALIMENTAR + `4623-1/09`:** "Comércio Atacadista de Alimentos para Animais" (farelos de soja, rações) não estava nos Sets `CNAES_ALIMENTAR`/`CNAES_ATACADISTA` em `server/lib/normative-inference.ts`. Caso canônico: projeto #5040001 não disparava `aliquota_zero` nem `credito_presumido` por gatilho semântico CNAE → engine inferia menos riscos/oportunidades do que deveria.

---

## Diagnóstico empírico

### D4 — LIMIT 10 vs 20

| Arquivo:linha | Antes | Depois |
|---|---|---|
| `server/rag-retriever.ts:444` | `fetchCandidates(cnaes, keywords, 10, leiFilter)` | `fetchCandidates(cnaes, keywords, 20, leiFilter)` |
| `server/rag-retriever.ts:449` | `fetchSetorialCandidates(cnaeGroups, 10, leiFilter)` | `fetchSetorialCandidates(cnaeGroups, 20, leiFilter)` |

Validação `grep -n "\.limit(10)" server/rag-retriever.ts` → **zero ocorrências** nos passes RAG (Pass 1, 2, 3). As funções internas `fetchCandidates`/`fetchSetorialCandidates` continuam aceitando `limit` parametrizado, mas o **callsite** sobe a janela para 20.

### P3 — Pass 3 NCM-Targeted

Função pura adicionada (testável sem DB):

```typescript
export function extractNcmsFromContext(contextQuery: string): string[] {
  // Regex \b\d{4}(?:\.\d{2})?\b captura NCM 4 dígitos OU 6 dígitos com ponto
  // (heading + subheading). Dedup preservando ordem de primeira ocorrência.
  // Caller (fetchNcmCandidates) aplica slice(0, 3) para top-3 NCMs.
}
```

Função integration (depende de DB):

```typescript
async function fetchNcmCandidates(contextQuery: string, leiFilter?: string[]) {
  // Para cada NCM ∈ slice(0, 3):
  //   LIKE em conteudo + topicos, LIMIT 5/NCM, respeita leiFilter
  // Retorna candidatos para mergeAndDedup
}
```

`mergeAndDedup` foi estendido para aceitar 3 argumentos (terceiro opcional para retrocompat). Ordem: `pass1 → pass2 → pass3`, primeira ocorrência preservada.

### A0 — Migration 0060 (rag_usage_log)

```sql
-- Aplicado em produção por Manus em 12/05/2026
-- Definição copiada de drizzle/0060_soft_skin.sql:68-80
CREATE TABLE rag_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anchor_id VARCHAR(255),
  query_hash VARCHAR(64),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source ENUM('pass1','pass2','pass3','setorial'),
  rank_position INT,
  similarity_score DECIMAL(5,4),
  contexto JSON,
  created_by INT,
  INDEX idx_rag_usage_anchor (anchor_id),
  INDEX idx_rag_usage_query (query_hash),
  INDEX idx_rag_usage_time (used_at)
);
```

**Nota técnica:** `pnpm db:push` não foi utilizado porque a migration `drizzle/0060_soft_skin.sql` é "fat" (8 CREATE TABLEs + ALTERs) e 7 das 8 tabelas já existiam em produção. Manus aplicou apenas `rag_usage_log` via SQL direto, copiando a definição exata do arquivo `drizzle/0060_soft_skin.sql:68-80` + os 3 índices (`idx_rag_usage_anchor`, `idx_rag_usage_query`, `idx_rag_usage_time`). Verificação pós-aplicação: `SHOW TABLES LIKE 'rag_usage_log'` retorna 1 row.

### A4 — CNAES_ALIMENTAR

```typescript
// ANTES (5 alimentar, 8 atacadista):
const CNAES_ALIMENTAR = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
]);

// DEPOIS (6 alimentar, 9 atacadista) — CORPUS-RFC-006 A4:
export const CNAES_ALIMENTAR: ReadonlySet<string> = new Set([
  "4639-7/01", "4632-0/01", "4631-1/00", "4634-6/01", "4635-4/01",
  "4623-1/09", // NOVO — Comércio Atacadista de Alimentos para Animais
]);
```

Os helpers `hasAlimentarCnae`/`hasAtacadistaCnae` continuam intactos (private). Adicionalmente, expusemos `hasAlimentarCnaeFn`/`hasAtacadistaCnaeFn` como **funções puras exportadas** para teste isolado sem mock de DB (padrão usado em normative-inference-corpus-rfc-006.test.ts).

---

## Execução

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `server/rag-retriever.ts` | LIMIT 10→20 (L444, L449); novo `extractNcmsFromContext`, `fetchNcmCandidates`; `mergeAndDedup` 3-arg; chamada Pass 3 em `retrieveArticles` |
| `server/lib/normative-inference.ts` | `CNAES_ALIMENTAR`/`CNAES_ATACADISTA` exportados como `ReadonlySet<string>`; adicionado `"4623-1/09"`; novos exports `hasAlimentarCnaeFn`/`hasAtacadistaCnaeFn` |
| `server/lib/normative-inference.afericao.test.ts` | Snapshot test atualizado: 5→6 (ALIMENTAR), 8→9 (ATACADISTA) com referência ao A4 |

### Arquivos criados (testes)

| Arquivo | Cobertura |
|---|---|
| `server/rag-retriever-corpus-rfc-006.test.ts` | 28 tests — extractNcmsFromContext (captura, dedup, boundary), mergeAndDedup 3-pass (retrocompat 2-arg, merge ordenado, dedup, caso canônico #5040001), regressão Issue #997 (isSetorialArtigo, matchesCnaeBoundary) |
| `server/lib/normative-inference-corpus-rfc-006.test.ts` | 31 tests — Sets (size 6/9, 4623-1/09 presente), hasAlimentarCnaeFn/hasAtacadistaCnaeFn, regressão de CNAEs originais, controle negativo, DoD POSITIVO/NEGATIVO |

**Execução de testes:**

```
✓ server/rag-retriever-corpus-rfc-006.test.ts (28)
✓ server/lib/normative-inference-corpus-rfc-006.test.ts (31)
✓ server/lib/normative-inference.afericao.test.ts (8)

Test Files  3 passed (3)
     Tests  67 passed (67)
```

**TypeScript:** `pnpm tsc --noEmit` → zero erros.

### A0 — Telemetria (aplicação manual em produção)

> Tabela `rag_usage_log` criada manualmente em produção por Manus em 12/05/2026.
> Migration `drizzle/0060_soft_skin.sql` já existia no repositório.
> `pnpm db:push` não aplicável (migration fat — 7/8 tabelas já existiam).
> Aplicação manual via SQL direto. Verificado: 1 row em `SHOW TABLES LIKE 'rag_usage_log'`.

---

## Evidência JSON

```json
{
  "rfc": "CORPUS-RFC-006",
  "sprint": "Sprint RAG P3 / Sprint 0",
  "branch": "feat/rag-sprint0-corpus-rfc-006",
  "mudancas": {
    "D4_limit_20": {
      "arquivos": ["server/rag-retriever.ts"],
      "linhas_alteradas": ["L444", "L449"],
      "antes": "limit(10)",
      "depois": "limit(20)"
    },
    "P3_pass3_ncm_targeted": {
      "funcoes_novas": ["extractNcmsFromContext", "fetchNcmCandidates"],
      "funcoes_alteradas": ["mergeAndDedup (3-arg)", "retrieveArticles"],
      "max_candidatos_p3": 15,
      "ncms_top": 3,
      "limit_por_ncm": 5
    },
    "A0_telemetria": {
      "tabela": "rag_usage_log",
      "aplicada_em_producao": true,
      "data_aplicacao": "2026-05-12",
      "aplicador": "manus",
      "via": "SQL direto (migration 0060 já existia)",
      "verificacao": "SHOW TABLES LIKE 'rag_usage_log' → 1 row"
    },
    "A4_cnaes_alimentar": {
      "cnae_adicionado": "4623-1/09",
      "descricao": "Comércio Atacadista de Alimentos para Animais",
      "alimentar_size": { "antes": 5, "depois": 6 },
      "atacadista_size": { "antes": 8, "depois": 9 },
      "exports_novos": ["CNAES_ALIMENTAR (readonly)", "CNAES_ATACADISTA (readonly)", "hasAlimentarCnaeFn", "hasAtacadistaCnaeFn"]
    }
  },
  "tests": {
    "novos": { "rag_retriever_corpus_rfc_006": 28, "normative_inference_corpus_rfc_006": 31 },
    "ajustados": { "normative_inference_afericao": 8 },
    "total_pass": 67
  },
  "tsc": "0 errors"
}
```

---

## Critérios de aceite (DoD)

- [x] `grep -n "\.limit(10)" server/rag-retriever.ts` → zero nos passes RAG (Pass 1/2/3)
- [x] Pass 3 NCM-Targeted presente em `retrieveArticles` e incluído em `mergeAndDedup`
- [x] `SHOW TABLES LIKE 'rag_usage_log'` → 1 row em produção (Manus)
- [x] `CNAES_ALIMENTAR` contém `"4623-1/09"` (verificado via test)
- [x] `pnpm test` → todos passando (67/67 tests cobertura RFC-006)
- [x] `pnpm tsc --noEmit` → zero erros

---

## Rollback

| Mudança | Estratégia de rollback |
|---|---|
| D4 (LIMIT 20) | Trivial — reverter L444/L449 para `limit(10)`. Sem impacto em dados. |
| P3 (Pass 3) | Remover chamada `await fetchNcmCandidates(...)` em `retrieveArticles` e reverter `mergeAndDedup` para 2-arg. Funções puras (`extractNcmsFromContext`) podem permanecer sem dano (não chamadas) ou serem removidas. |
| A0 (rag_usage_log) | `DROP TABLE rag_usage_log;` (sem dependências FK — tabela apenas para telemetria). |
| A4 (4623-1/09) | Remover entry dos dois Sets. Reverter snapshot test para 5/8. |

Rollback completo: revertcommit do PR + revert manual da DROP TABLE pelo Manus (similar ao processo de aplicação).

---

## Próximas sprints

- **Sprint 1+ RAG:** curadoria do Cap. 23 NCM (escopo separado — NÃO faz parte desta Sprint 0)
- **Telemetria operacional:** começar a popular `rag_usage_log` em chamadas de `retrieveArticles` (instrumentação backlog — Sprint 1+)
- **Avaliação de eficácia P3:** após X dias de produção, medir % de queries onde Pass 3 contribuiu com artigo no top-5 final

---

## Vinculadas

- **Issue #997** — Two-Pass Retrieval (Pass 1 + Pass 2 setorial); P3 é a 3ª camada
- **CORPUS-RFC-005** — última RFC de ingestão (LC 87/1996)
- **REGRA-ORQ-19** — Audit fim de sessão (v7.67 — última auditoria)
- **REGRA-ORQ-27** — Validação de consumo (Lição #59) — testes confirmam consumo real das mudanças
- **REGRA-ORQ-32** — Anti-hardcode (visão sistêmica) — Sets ainda hardcoded; backlog: migrar para tabela de config em sprint futura
- **REGRA-ORQ-34** — Pipeline de Dados Bugfix Protocol — esta Sprint formaliza protocolos preventivos
- **Projeto canônico #5040001** — NCMs 2306/2304 (farelos de soja) — motivador empírico das 4 mudanças
