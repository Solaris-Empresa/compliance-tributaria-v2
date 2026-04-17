# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IA SOLARIS Compliance Tributario v2 — a full-stack TypeScript platform for Brazilian corporate tax compliance under the Tax Reform (LC 214/2025). It implements a 6-stage assessment workflow: Assessment Phase 1 → Phase 2 → Briefing → Risk Matrix → Action Plan → Execution.

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
pnpm db:push            # Generate + run migrations (guarded, blocked in production)
pnpm db:reset           # Clear + seed database
```

Run a single test file: `pnpm vitest run path/to/file.test.ts`

## Architecture

```
client/src/          React 19 frontend (pages, components, hooks, lib, contexts)
server/              Express + tRPC backend
  _core/             Infrastructure (index.ts, trpc.ts, context.ts, llm.ts, env.ts)
  routers/           Modular tRPC routers by domain
  db.ts              Centralized Drizzle query functions
  ai-helpers.ts      LLM helper functions
shared/              Code shared between client and server (const, types, translations)
drizzle/             Database schemas and migrations
```

### Path Aliases (tsconfig)

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

### Data Flow

Client (tRPC hook) → HTTP POST `/api/trpc` → `protectedProcedure` (JWT auth) → `validateProjectAccess()` → business logic → Drizzle ORM → MySQL/TiDB. Responses serialized via Superjson.

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

## Important Constraints

- **DIAGNOSTIC_READ_MODE** is currently `shadow` — do NOT change to `new`
- Database migrations are guarded by `scripts/db-push-guard.mjs` (blocks in production)
- Auth uses OAuth + JWT cookies with role-based access (equipe_solaris, advogado_senior, cliente)
- Health endpoints: `/api/health`, `/api/health/cnae`, `/api/health/cnae/validate`

## Detailed Rules

All governance, backend, frontend, testing, and database rules are in `.claude/rules/`:

| File | Scope | Contents |
|------|-------|----------|
| `governance.md` | `docs/governance/**` | ORQ-00 through ORQ-18, all gates (Gate 0, Gate UX, Gate 7), F1-F7 flow, R-SYNC-01, PRE-CLOSE-CHECKLIST, Manus prompt conventions |
| `backend.md` | `server/**` | tRPC patterns, LLM integration, content engine rules, risk engine v4, sprint Z-07/Z-09 state |
| `frontend.md` | `client/**` | React patterns, data-testid conventions, Tooltip wrappers, safeStr for Date objects |
| `testing.md` | `tests/**`, `*.test.ts`, `*.spec.ts` | E2E Playwright, Vitest, LLM test conventions, timeouts |
| `database.md` | `drizzle/**`, `server/lib/db-queries*` | TiDB LIMIT ? rule, Date objects, migration guard, Gate 0 schema validation |

These rule files are automatically loaded by Claude Code based on glob patterns when working in the relevant directories.
