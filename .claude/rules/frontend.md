---
description: Frontend patterns — React conventions, data-testid, Tooltip wrappers, safeStr for Date objects
globs:
  - "client/**"
---

# Frontend Rules

## React Patterns

- React 19 with Vite 7
- UI components: Shadcn/Radix-based (`client/src/components/`)
- Custom hooks for tRPC queries and state (`client/src/hooks/`)
- Context providers (`client/src/contexts/`)
- Full page components (`client/src/pages/`)

## Path Aliases (tsconfig)

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

## data-testid Conventions

Every interactive element must have a `data-testid` attribute for E2E testing.
Before implementing frontend, verify `data-testid` values from:
1. The issue's Bloco 9
2. The mockup HTML (`docs/sprints/Z-XX/MOCKUP_*.html`)

Gap between mockup and component data-testid must be zero before merge.

## Tooltip Wrapper for Disabled Buttons

Disabled buttons must be wrapped in a Tooltip component to explain why they are disabled.
Radix Tooltip does not trigger on disabled elements — wrap with a `<span>` if needed.

## safeStr for Date Objects

`SELECT *` from TiDB returns Date fields as JavaScript `Date` objects.
React error #31 occurs when rendering Date objects directly in JSX.

**Always** use `safeStr()` or `toLocaleDateString()` before rendering any database date field.

## Gate UX Compliance

Before any frontend implementation:
1. Run `ux-spec-validator` agent
2. Ensure LIBERAR status before coding
3. Every prompt MUST start with `gh issue view [N]`

See `.claude/rules/governance.md` for full Gate UX and REGRA-ORQ-09 details.
