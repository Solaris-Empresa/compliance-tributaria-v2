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

## Sprint Z-07 — Sistema de Riscos v4

**Sprint ativa:** Z-07
**Objetivo:** Substituir `generateRiskMatrices` (`routers-fluxo-v3.ts` linha 1113) por engine determinístico via module hot-swap.
**Estratégia:** ADR-0022 — construir do zero em arquivos novos, testar com dados simulados, fazer swap quando aprovado.

### Arquivos a criar (NÃO editar existentes)

- `server/lib/risk-engine-v4.ts`
- `server/lib/action-plan-engine-v4.ts`
- `server/lib/risk-engine-v4.test.ts` (30 testes já existem — fazer todos passarem)

### Regras invioláveis

- **NUNCA editar:** `routers-fluxo-v3.ts`, `riskEngine.ts`, `MatrizesV3.tsx`, `project_risks_v3`
- **SEVERITY** é tabela fixa no código — nunca LLM
- `inscricao_cadastral` = **alta** (não media)
- `oportunidade` retorna `[]` de planos — sempre
- Breadcrumb sempre 4 nos: `[fonte] > [categoria] > [artigo] > [ruleId]`
- **SOURCE_RANK:** cnae=1, ncm=2, nbs=3, solaris=4, iagen=5

### Docs de referencia

- `docs/sprints/Z-07/HANDOFF-MANUS-Z07.md`
- `docs/sprints/Z-07/SKELETON-SPEC-ADR-0021.md`
- `docs/governance/ESTADO-ATUAL.md`
