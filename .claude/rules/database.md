---
description: Database rules — TiDB/MySQL query conventions, migration guard, Gate 0 schema validation, Drizzle ORM
globs:
  - "drizzle/**"
  - "server/lib/db-queries*"
---

# Database Rules

## TiDB/MySQL Query Conventions

PR que modifica queries SQL em `server/lib/db-queries-*.ts`:

### 1. LIMIT/OFFSET — TiDB NAO aceita `?` como parametro

TiDB NAO aceita `?` como parametro em LIMIT/OFFSET.
Usar interpolacao com clamp: `` LIMIT ${Math.max(1, Math.min(500, limit))} ``
O `?` causa `ER_WRONG_ARGUMENTS` silencioso — query retorna `[]` sem erro.

CI automatico: `post-merge-gate.yml` job `tidb-query-safety` detecta `LIMIT ?` em queries.

Licao aprendida Sprint Z-17: `LIMIT ?` causou aba Historico vazia por horas.
Bug trivial que passou por tsc, unit tests, E2E, e code review.

### 2. SELECT * — Date objects

`SELECT *` retorna campos Date como objetos `Date` do JavaScript.
No frontend, NAO renderizar Date diretamente em JSX (React error #31).
Usar `safeStr()` ou `toLocaleDateString()` antes de renderizar.

### 3. CI automatico

`post-merge-gate.yml` job `tidb-query-safety` detecta `LIMIT ?` em queries.

## Drizzle ORM Schema Files

```
drizzle/
  schema.ts                      Main tables
  schema-assessments-v2.ts       Assessment tables
  schema-action-plans-v2.ts      Action plan tables
  schema-compliance-engine-v3.ts Compliance engine tables
  *.sql                          Auto-generated migration files
```

## Migration Guard

Database migrations are guarded by `scripts/db-push-guard.mjs` (blocks in production).

```bash
pnpm db:push            # Generate + run migrations (guarded, blocked in production)
pnpm db:reset           # Clear + seed database
```

## Gate 0 — Schema Validation (OBRIGATORIO)

ANTES de qualquer implementacao que toca banco de dados:

1. **Orquestrador** consulta `docs/governance/DATA_DICTIONARY.md`
2. Se campo nao estiver documentado:
   - Acionar agente: `.claude/agents/db-schema-validator.md`
   - **Manus** executa: `SHOW FULL COLUMNS FROM [tabela]`
   - **Manus** executa: `SELECT JSON_KEYS([campo]) FROM [tabela] WHERE [campo] IS NOT NULL LIMIT 3`
3. **Orquestrador** confirma nomes reais e atualiza DATA_DICTIONARY se necessario
4. **Claude Code** implementa somente com nomes confirmados

**SEM EXCECAO** — nem para fixes "simples".
Violacao desta regra = causa raiz garantida de bug (post-mortem B-Z13.5-001/002).

## risk_categories Table (Sprint Z-09, ADR-0025)

Tabela: `risk_categories` (nao hardcode)
  - Engine le via `getRiskCategories()` com cache TTL 1h
  - `vigencia_fim = NULL` → vigencia indeterminada
  - `vigencia_fim = DATE` → expira automaticamente

Labels em portugues:
  - status: `ativo` · `sugerido` · `pendente_revisao` · `inativo` · `legado`
  - origem: `lei_federal` · `regulamentacao` · `rag_sensor` · `manual`
  - escopo: `nacional` · `estadual` · `setorial`
