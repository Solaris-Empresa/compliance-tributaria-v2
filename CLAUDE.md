# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IA SOLARIS Compliance Tributario v2 — a full-stack TypeScript platform for Brazilian corporate tax compliance under the Tax Reform (LC 214/2025). It implements a 6-stage assessment workflow: Assessment Phase 1 (company info) → Phase 2 (AI-generated questionnaire) → Briefing (AI risk analysis) → Risk Matrix → Action Plan → Execution (Kanban + dashboards).

**Stack:** React 19 + Vite 7 frontend, Express + tRPC 11 backend, Drizzle ORM over MySQL/TiDB, pnpm package manager.

## Common Commands

```bash
pnpm dev                # Start dev server (tsx watch, auto-finds port 3000-3019)
pnpm build              # Build frontend (Vite) + backend (esbuild) → dist/
pnpm start              # Run production build
pnpm check              # TypeScript check (tsc --noEmit) — must be zero errors
pnpm format             # Prettier format all files
pnpm test               # Vitest integration tests (180s timeout for LLM ops)
pnpm test:unit          # Vitest unit tests only (vitest.config.unit.ts)
pnpm test:e2e           # Playwright E2E tests
pnpm test:e2e:ui        # Playwright E2E with interactive UI
pnpm db:push            # Generate + run migrations (guarded, blocked in production)
pnpm db:reset           # Clear + seed database
```

Run a single test file: `pnpm vitest run path/to/file.test.ts`

## Architecture

```
client/src/          React 19 frontend
  pages/             Full page components
  components/        Reusable UI (Shadcn/Radix-based)
  hooks/             Custom hooks (tRPC queries, state)
  lib/               Utilities, configs
  contexts/          React context providers

server/              Express + tRPC backend
  _core/             Infrastructure: index.ts (app init), trpc.ts (router factory),
                     context.ts (auth context), llm.ts (LLM integration),
                     oauth.ts, websocket.ts, env.ts
  routers/           Modular tRPC routers by domain (diagnostic, requirementEngine,
                     questionEngine, gapEngine, riskEngine, actionEngine,
                     briefingEngine, cpieRouter, shadowMode, etc.)
  routers.ts         Main router aggregation (imports all routers)
  db.ts              Centralized Drizzle query functions
  ai-helpers.ts      LLM helper functions
  ai-schemas.ts      Zod schemas for structured AI responses
  cnae-*.ts          CNAE classification (embeddings, discovery, health)

shared/              Code shared between client and server
  const.ts, types.ts, translations.ts

drizzle/             Database schemas and migrations
  schema.ts                      Main tables
  schema-assessments-v2.ts       Assessment tables
  schema-action-plans-v2.ts      Action plan tables
  schema-compliance-engine-v3.ts Compliance engine tables
  *.sql                          Auto-generated migration files
```

### Data Flow

Client (tRPC hook) → HTTP POST `/api/trpc` → `protectedProcedure` (JWT auth from cookie) → `validateProjectAccess()` → business logic → Drizzle ORM → MySQL/TiDB. Responses serialized via Superjson (preserves Date, Map, Set).

### Key Subsystems

- **LLM Integration:** `server/_core/llm.ts` — unified `invokeLLM()` with retry logic, used for question generation, briefing creation, action plans
- **RAG:** 2,509 chunks from 10 Brazilian tax laws, OpenAI embeddings, scheduler for periodic rebuilding
- **CNAE Discovery:** Brazilian industry code classification via embeddings-based semantic search
- **Shadow Mode:** Consistency validation system (`server/routers/shadowMode.ts`)
- **Decision Kernel:** NCM/NBS product classification engine (`decision-kernel/datasets/`)

### Path Aliases (tsconfig)

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## Content Engine Rules (Sprint 98% Confidence)

These are inviolable rules enforced across the codebase:

1. **Source required:** Every generated question must have `source_type`, `source_reference`, `requirement_id`, `confidence`. Questions without source are blocked (NO_QUESTION protocol).
2. **100% coverage:** No applicable requirement can lack a question, answer, and gap assessment. Coverage < 100% blocks briefing generation.
3. **Mandatory chain:** `Requisito → Gap → Risco → Acao` is inviolable. Risk without `gap_id` doesn't exist. Action without `risk_id` doesn't exist.
4. **Anti-hallucination:** LLM does not create new knowledge — it transforms validated knowledge via RAG. Every claim must have a verifiable normative basis.
5. **CNAE conditioned:** CNAE without applicable requirements in the RAG corpus does not generate a questionnaire; it is recorded as `skipped` with reason `no_applicable_requirements`.

## Commit Convention

Format: `type(scope): description` — imperative mood, max 72 chars first line, Portuguese or English (consistent within a PR).

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `db`

## PR Workflow

1. Branch from main, never push directly
2. Before opening: `pnpm test` passing + `tsc --noEmit` zero errors
3. Reference issue with `Closes #N`, assign milestone, add domain labels
4. If issue has `shadow-required` label: run Shadow Mode and collect evidence

## Formatting

Prettier with: double quotes, semicolons, trailing commas (es5), 2-space indent, 80 char width, LF line endings.

## Key Documentation

- `docs/governance/ESTADO-ATUAL.md` — Current sprint state
- `docs/governance/HANDOFF-IMPLEMENTADOR.md` — Developer operational guide
- `docs/adr/` — Architecture Decision Records (ADR-010 content architecture, etc.)
- `.github/CONTRIBUTING.md` — Full contribution guidelines
- `.github/MANUS-GOVERNANCE.md` — AI implementer operational rules

## Important Constraints

- **DIAGNOSTIC_READ_MODE** is currently `shadow` — do NOT change to `new`
- Database migrations are guarded by `scripts/db-push-guard.mjs` (blocks in production)
- Auth uses OAuth + JWT cookies with role-based access (equipe_solaris, advogado_senior, cliente)
- Health endpoints: `/api/health`, `/api/health/cnae`, `/api/health/cnae/validate`

## Gate 0 — Verificacao de Schema (OBRIGATORIO)

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

## Gate UX — Verificacao de spec (obrigatorio para frontend)

ANTES de qualquer implementacao de componente frontend:

1. **Orquestrador** consulta `docs/governance/UX_DICTIONARY.md` — verificar estado atual da tela
2. **Claude Code** executa agente `.claude/agents/ux-spec-validator.md` — reportar gaps vs spec
3. **Orquestrador** cria issue com spec HIBRIDA:
   - Conteudo copiado no corpo da issue
   - Link para arquivo fonte
   - Lock apos aprovacao P.O.
   - PATCH (<=5 linhas): comentario na issue
   - AMENDMENT (estrutural): nova issue
4. **P.O.** aprova issue com spec congelada
5. **Claude Code** implementa somente apos aprovacao — todo prompt DEVE iniciar com `gh issue view [N]`

**SEM EXCECAO** — nem para ajustes visuais "simples".
Violacao desta regra = causa raiz do retrabalho Z-07 (spec existia mas nao foi incluida no prompt).

### REGRA-ORQ-08
Todo prompt de implementacao DEVE iniciar com `gh issue view [N]`.
O implementador le a issue diretamente do GitHub. Nunca depende do orquestrador copiar a spec.

### REGRA-ORQ-09
Gate UX obrigatorio antes de qualquer frontend.
`ux-spec-validator` deve reportar LIBERAR antes de codar.

### REGRA-ORQ-10
Integration Checkpoint (F4.5) obrigatorio antes do merge:
- `grep -n "trpc\." [componente]` executado
- Cruzar com Contrato API da issue
- 100% das procedures da issue devem estar sendo chamadas
- Procedure nao chamada = merge bloqueado

## Sprint Z-07 — Sistema de Riscos v4 — CONCLUÍDA (Z-12)

**Status:** CONCLUÍDA — Hot swap final executado na Sprint Z-12 (PR feat/z12-hot-swap-final).
**ADR:** `docs/adr/ADR-0022-hot-swap-risk-engine-v4.md`

`generateRiskMatrices` em `routers-fluxo-v3.ts` está **desativado** (throw METHOD_NOT_SUPPORTED).
O frontend usa `useNewRiskEngine=true` → `/risk-dashboard-v4` → `risksV4.generateRisks` (determinístico).

### Arquivos do engine v4 (criados e ativos)

- `server/lib/risk-engine-v4.ts` — `computeRiskMatrix`, `classifyRisk`, `buildBreadcrumb`, `sortBySourceRank`
- `server/lib/action-plan-engine-v4.ts` — `buildActionPlans`
- `server/routers/risks-v4.ts` — 11 procedures (Skeleton Spec ADR-0021)

### Regras invioláveis (mantidas)

- **SEVERITY** é tabela fixa no código — nunca LLM
- `inscricao_cadastral` = **alta** (não media)
- `oportunidade` retorna `[]` de planos — sempre
- Breadcrumb sempre 4 nos: `[fonte] > [categoria] > [artigo] > [ruleId]`
- **SOURCE_RANK:** cnae=1, ncm=2, nbs=3, solaris=4, iagen=5

## Sprint Z-09 — Categorias Configuráveis (ADR-0025)

Sprint: Z-09 · Status: em execução · HEAD: 8df07b7

Tabela: `risk_categories` (não hardcode)
  - Engine lê via `getRiskCategories()` com cache TTL 1h
  - `vigencia_fim = NULL` → vigência indeterminada
  - `vigencia_fim = DATE` → expira automaticamente

Labels em português:
  - status: `ativo` · `sugerido` · `pendente_revisao` · `inativo` · `legado`
  - origem: `lei_federal` · `regulamentacao` · `rag_sensor` · `manual`
  - escopo: `nacional` · `estadual` · `setorial`

NÃO tocar: `SEVERITY_TABLE` (fallback) · `risks_v4` dados existentes

GAPs resolvidos: ARCH-06 · ARCH-07 · ARCH-08 · ARCH-09

Correções pendentes: CONTRACT-01 · CONTRACT-02 · CONTRACT-03

## R-SYNC-01 — Regra anti-bifurcação — Manus + Claude Code

Quando Claude Code e Manus trabalham em paralelo,
o S3 (storage de checkpoint do Manus) pode divergir
do GitHub se o Claude Code mergear PRs diretamente.

OBRIGATÓRIO antes de qualquer checkpoint ou push:
  git fetch origin && git reset --hard origin/main

Isso garante que o S3 sempre espelha o GitHub.
Causa raiz documentada: PRs #473/#474 (Claude Code)
criaram bifurcação detectada na Sprint Z-12.
