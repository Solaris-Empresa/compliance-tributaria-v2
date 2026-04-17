---
description: Backend patterns — tRPC, LLM integration, content engine rules, key subsystems, risk engine v4
globs:
  - "server/**"
---

# Backend Rules

## Data Flow

Client (tRPC hook) → HTTP POST `/api/trpc` → `protectedProcedure` (JWT auth from cookie) → `validateProjectAccess()` → business logic → Drizzle ORM → MySQL/TiDB. Responses serialized via Superjson (preserves Date, Map, Set).

## Key Subsystems

- **LLM Integration:** `server/_core/llm.ts` — unified `invokeLLM()` with retry logic, used for question generation, briefing creation, action plans
- **RAG:** 2,509 chunks from 10 Brazilian tax laws, OpenAI embeddings, scheduler for periodic rebuilding
- **CNAE Discovery:** Brazilian industry code classification via embeddings-based semantic search
- **Shadow Mode:** Consistency validation system (`server/routers/shadowMode.ts`)
- **Decision Kernel:** NCM/NBS product classification engine (`decision-kernel/datasets/`)

## Content Engine Rules (Sprint 98% Confidence)

These are inviolable rules enforced across the codebase:

1. **Source required:** Every generated question must have `source_type`, `source_reference`, `requirement_id`, `confidence`. Questions without source are blocked (NO_QUESTION protocol).
2. **100% coverage:** No applicable requirement can lack a question, answer, and gap assessment. Coverage < 100% blocks briefing generation.
3. **Mandatory chain:** `Requisito → Gap → Risco → Acao` is inviolable. Risk without `gap_id` doesn't exist. Action without `risk_id` doesn't exist.
4. **Anti-hallucination:** LLM does not create new knowledge — it transforms validated knowledge via RAG. Every claim must have a verifiable normative basis.
5. **CNAE conditioned:** CNAE without applicable requirements in the RAG corpus does not generate a questionnaire; it is recorded as `skipped` with reason `no_applicable_requirements`.

## Sprint Z-07 — Sistema de Riscos v4 — CONCLUIDA (Z-12)

**Status:** CONCLUIDA — Hot swap final executado na Sprint Z-12 (PR feat/z12-hot-swap-final).
**ADR:** `docs/adr/ADR-0022-hot-swap-risk-engine-v4.md`

`generateRiskMatrices` em `routers-fluxo-v3.ts` esta **desativado** (throw METHOD_NOT_SUPPORTED).
O frontend usa `useNewRiskEngine=true` → `/risk-dashboard-v4` → `risksV4.generateRisks` (deterministico).

### Arquivos do engine v4 (criados e ativos)

- `server/lib/risk-engine-v4.ts` — `computeRiskMatrix`, `classifyRisk`, `buildBreadcrumb`, `sortBySourceRank`
- `server/lib/action-plan-engine-v4.ts` — `buildActionPlans`
- `server/routers/risks-v4.ts` — 11 procedures (Skeleton Spec ADR-0021)

### Regras inviolaveis (mantidas)

- **SEVERITY** e tabela fixa no codigo — nunca LLM
- `inscricao_cadastral` = **alta** (nao media)
- `oportunidade` retorna `[]` de planos — sempre
- Breadcrumb sempre 4 nos: `[fonte] > [categoria] > [artigo] > [ruleId]`
- **SOURCE_RANK:** cnae=1, ncm=2, nbs=3, solaris=4, iagen=5

## Sprint Z-09 — Categorias Configuraveis (ADR-0025)

Sprint: Z-09 · Status: em execucao · HEAD: 8df07b7

Tabela: `risk_categories` (nao hardcode)
  - Engine le via `getRiskCategories()` com cache TTL 1h
  - `vigencia_fim = NULL` → vigencia indeterminada
  - `vigencia_fim = DATE` → expira automaticamente

Labels em portugues:
  - status: `ativo` · `sugerido` · `pendente_revisao` · `inativo` · `legado`
  - origem: `lei_federal` · `regulamentacao` · `rag_sensor` · `manual`
  - escopo: `nacional` · `estadual` · `setorial`

NAO tocar: `SEVERITY_TABLE` (fallback) · `risks_v4` dados existentes

GAPs resolvidos: ARCH-06 · ARCH-07 · ARCH-08 · ARCH-09

Correcoes pendentes: CONTRACT-01 · CONTRACT-02 · CONTRACT-03

## Convencao de testes LLM

Features que envolvem LLM devem incluir:

1. **Teste unitario para extractJson** (`server/lib/extract-json.test.ts`)
   Cobertura: arrays [], objetos {}, markdown fences, thinking blocks.
   CI: `llm-integration-gate.yml` roda automaticamente em PRs que tocam LLM.

2. **Teste de integracao com LLM real** (`server/lib/*.integration.test.ts`)
   Executar localmente antes do merge:
   `OPENAI_API_KEY=sk-... pnpm vitest run server/lib/*.integration.test.ts`
   CI: roda se OPENAI_API_KEY configurada nos secrets.

3. **audit_log para observabilidade** (nao console.warn como unica saida)
   Toda chamada LLM que falha deve gravar `insertAuditLog`.
   Erros visiveis na aba Historico (entity='task', entity_id='llm_error').

4. **Gate 7 PROVA 5:** `tasks >= 10` no projeto de referencia.

Licao aprendida Sprint Z-17: 5 hotfixes (#664 #666 #667 #673 #674)
porque LLM falhava silenciosamente sem cobertura de testes.
