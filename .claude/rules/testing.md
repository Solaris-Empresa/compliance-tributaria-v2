---
description: Testing conventions — E2E Playwright, Vitest unit/integration, LLM test patterns, timeouts
globs:
  - "tests/**"
  - "*.test.ts"
  - "*.spec.ts"
---

# Testing Rules

## Commands

```bash
pnpm test               # Vitest integration tests (180s timeout for LLM ops)
pnpm test:unit           # Vitest unit tests only (vitest.config.unit.ts)
pnpm test:e2e            # Playwright E2E tests
pnpm test:e2e:ui         # Playwright E2E with interactive UI
```

Run a single test file: `pnpm vitest run path/to/file.test.ts`

## Vitest Conventions

- Integration tests: 180s timeout (LLM operations are slow)
- Unit tests: use `vitest.config.unit.ts`
- Test files: `*.test.ts` for unit, `*.integration.test.ts` for integration

## Playwright E2E Conventions

- E2E test files: `tests/e2e/*.spec.ts`
- Every interactive UI element must have `data-testid` attributes
- Before merge: all E2E tests must pass (`pnpm test:e2e`)

## LLM Test Conventions

Features that involve LLM must include:

1. **Unit test for extractJson** (`server/lib/extract-json.test.ts`)
   Coverage: arrays [], objects {}, markdown fences, thinking blocks.
   CI: `llm-integration-gate.yml` runs automatically on PRs touching LLM.

2. **Integration test with real LLM** (`server/lib/*.integration.test.ts`)
   Run locally before merge:
   `OPENAI_API_KEY=sk-... pnpm vitest run server/lib/*.integration.test.ts`
   CI: runs if OPENAI_API_KEY configured in secrets.

3. **audit_log for observability** (not console.warn as only output)
   Every failing LLM call must write `insertAuditLog`.
   Errors visible in History tab (entity='task', entity_id='llm_error').

4. **Gate 7 PROVA 5:** `tasks >= 10` in reference project.

Lesson learned Sprint Z-17: 5 hotfixes (#664 #666 #667 #673 #674)
because LLM failed silently without test coverage.

## Pre-merge Checklist

1. `pnpm test` passing
2. `pnpm check` (tsc --noEmit) zero errors
3. `pnpm test:e2e` passing (if frontend changes)
4. Integration Checkpoint F4.5: all tRPC procedures from the issue are called
