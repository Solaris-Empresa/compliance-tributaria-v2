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

## Enforcement Mecânico

PreToolUse hook bloqueia Edit em arquivos críticos do pipeline sem evidência de investigação prévia. Implementado Sprint M3.10 Fase 3b para fechar a porta que produziu 4 PRs consecutivos errados em M3.10.

### Arquivos protegidos

- `server/lib/db-queries-*.ts` — writers/readers do pipeline gaps/riscos
- `server/routers/*.ts` — procedures tRPC que orquestram pipeline
- `server/_core/trpc.ts` — infraestrutura tRPC compartilhada

Edits em qualquer outro path passam direto. Read/Write/Bash não são afetados (matcher é apenas `Edit`).

### Como funciona

1. Edit em arquivo crítico dispara `.claude/hooks/require-investigation.sh` (PreToolUse, matcher `Edit`).
2. Hook extrai `session_id` e `file_path` do JSON stdin que o Claude Code envia.
3. Hook procura evidência em `.claude/.investigate-cache/${SESSION_ID}-${BASENAME}.md` (ou fallback session-less `.claude/.investigate-cache/${BASENAME}.md`).
4. Se evidência existe → exit 0, Edit prossegue.
5. Se ausente → exit 2, Edit BLOQUEADO com mensagem em stderr instruindo `/investigate-deep`.

### Como desbloquear

Invoque a skill `investigate-deep`:

```
/investigate-deep <basename>
```

A skill instrui o Claude a:
- Ler o arquivo-alvo + imports + callers + tests
- Mapear writers/readers da tabela tocada (Lição #65)
- Documentar findings em `.claude/.investigate-cache/${SESSION_ID}-${BASENAME}.md` (path relativo ao cwd, criado automaticamente; gitignored)

Após a evidência existir, o próximo Edit no mesmo arquivo passa pelo hook.

Para o pipeline completo (investigate → plan → implement → verify), use `safe-fix-pipeline`.

### Bypass legítimo

- **Edits em paths não-críticos:** automático, sem ação necessária
- **Hotfix P0 (REGRA-ORQ-11):** evidência ainda obrigatória, mas pode ser mínima (5 min é o piso); skill aceita evidence enxuta
- **Bug no hook (parse falha):** fallback gracioso → exit 0, edit prossegue

### Fallback gracioso

- Parse JSON do stdin falha → exit 0 (não trava o usuário)
- `session_id` ausente → usa fallback session-less
- Node não disponível → exit 0 (mesmo padrão de poc-edit-detector.sh)

### Achados empíricos Sprint M3.10 Fase 3a/3b (gotchas Windows)

- `CLAUDE_SESSION_ID` **NÃO** é env var — chega no JSON stdin como `session_id`
- `tool_input.file_path` chega Windows-style (`\path\to\file`) mesmo em paths originalmente forward-slash; hook normaliza com `tr '\\' '/'`
- `jq` não instalado no ambiente Windows do projeto; hook usa Node como parser JSON
- stderr de PreToolUse só é surfaceado ao assistant em `exit ≠ 0`; em `exit 0` o stderr é silencioso para o modelo (mas usuário pode ver)
- Mudanças em `settings.local.json` exigem reload de sessão (gotcha PoC Fase 3a); `settings.json` recarrega mid-session (validado Fase 3b)
- `/tmp` em Git Bash mapeia para `C:/Users/<user>/AppData/Local/Temp` mas Node (Write tool) resolve `/tmp` como `D:\tmp` — paths divergentes. Por isso o cache de evidência usa `.claude/.investigate-cache/` (path relativo, consistente entre bash e Node)

### Vinculadas

- REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol
- Lições #65/#66 — fluxo end-to-end + spec sem dados
- Hook script: `.claude/hooks/require-investigation.sh`
- Skills: `.claude/skills/investigate-deep/`, `.claude/skills/safe-fix-pipeline/`
- Post-mortem: `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`

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
