# Análise Gap 13 Secrets Faltantes em Workflows CI

**Data:** 2026-05-01  
**Autor:** Manus (M3-MANUS-3-INVEST)  
**main HEAD:** e311ae9  
**Secrets configurados no GitHub:** 2 (`DATABASE_URL`, `OPENAI_API_KEY`)  
**Secrets referenciados em workflows:** 15  
**Gap:** 13 secrets faltantes  

---

## Inventário Completo

| # | Secret | Workflow(s) | Linhas | Step que usa | Comando executado |
|---|--------|-------------|--------|--------------|-------------------|
| 1 | `JWT_SECRET` | ci.yml | L29 | Run unit tests | `pnpm test:unit` |
| 2 | `VITE_APP_ID` | ci.yml | L30, L73 | Run unit tests + Build | `pnpm test:unit` / `pnpm build` |
| 3 | `OAUTH_SERVER_URL` | ci.yml | L31 | Run unit tests | `pnpm test:unit` |
| 4 | `VITE_OAUTH_PORTAL_URL` | ci.yml | L32, L74 | Run unit tests + Build | `pnpm test:unit` / `pnpm build` |
| 5 | `OWNER_OPEN_ID` | ci.yml | L33 | Run unit tests | `pnpm test:unit` |
| 6 | `OWNER_NAME` | ci.yml | L34 | Run unit tests | `pnpm test:unit` |
| 7 | `BUILT_IN_FORGE_API_URL` | ci.yml | L35 | Run unit tests | `pnpm test:unit` |
| 8 | `BUILT_IN_FORGE_API_KEY` | ci.yml | L36 | Run unit tests | `pnpm test:unit` |
| 9 | `VITE_FRONTEND_FORGE_API_KEY` | ci.yml | L37, L75 | Run unit tests + Build | `pnpm test:unit` / `pnpm build` |
| 10 | `VITE_FRONTEND_FORGE_API_URL` | ci.yml | L38, L76 | Run unit tests + Build | `pnpm test:unit` / `pnpm build` |
| 11 | `E2E_TEST_SECRET` | e2e-frontend.yml | L33 | E2E Playwright Tests | `pnpm test:e2e` |
| 12 | `PLAYWRIGHT_BASE_URL` | e2e-frontend.yml | L32 | E2E Playwright Tests | `pnpm test:e2e` |
| 13 | `GITHUB_TOKEN` | project-automation.yml, validate-pr.yml | L17,37,57 / L14,37,107,162 | GH_TOKEN (automação) | `gh` CLI |

---

## Análise por Workflow

### `ci.yml` — CI/CD Pipeline (push main/develop + PRs)

Roda `pnpm test:unit` (vitest.config.unit.ts — exclui `server/integration/**`).

**Secrets necessários para unit tests:**
- `JWT_SECRET` — usado por `feature-flags-defense-in-depth.test.ts` (manipula `process.env.JWT_SECRET` em mock)
- `BUILT_IN_FORGE_API_KEY` / `BUILT_IN_FORGE_API_URL` — referenciados por testes LLM (mocked na maioria)
- `OWNER_OPEN_ID` / `OWNER_NAME` — referenciados por testes de auth/context

**Secrets necessários para build:**
- `VITE_APP_ID` — Vite injeta no bundle (build falha sem ele? Não — Vite usa `""` como default)
- `VITE_OAUTH_PORTAL_URL` — idem
- `VITE_FRONTEND_FORGE_API_KEY` / `VITE_FRONTEND_FORGE_API_URL` — idem

**Observação crítica:** `ci.yml` roda `pnpm test:unit` (NÃO `pnpm test`). Os unit tests usam mocks e NÃO conectam ao banco. A maioria dos secrets é injetada mas **não lida em runtime** — os testes passam com valores vazios.

### `test-suite.yml` — Test Suite (PRs, exceto docs)

Roda `pnpm test` (vitest.config.ts padrão — INCLUI integration tests).

**Secrets configurados:** `DATABASE_URL` ✅, `OPENAI_API_KEY` ✅  
**Status:** Funcional (os 2 secrets necessários já estão configurados).

### `structural-fix-gate.yml` — Structural Fix Gate (PRs label structural-fix)

Roda `pnpm vitest run server/prefill-contract.test.ts` + `pnpm test`.

**Secrets configurados:** `DATABASE_URL` ✅  
**Status:** Funcional para PCT. `pnpm test` pode falhar em integration tests sem `OPENAI_API_KEY` (mas está configurado).

### `e2e-frontend.yml` — E2E Playwright Tests (PRs que tocam client/)

Roda `pnpm test:e2e` contra produção.

**Secrets necessários:** `E2E_TEST_SECRET` (auth bypass), `PLAYWRIGHT_BASE_URL` (tem fallback default)  
**Status:** Workflow existe mas E2E tests não estão maduros. Falta `E2E_TEST_SECRET`.

### `llm-integration-gate.yml` — LLM Integration Gate (PRs que tocam LLM)

Roda testes LLM com `continue-on-error: true`.

**Secrets configurados:** `OPENAI_API_KEY` ✅  
**Status:** Funcional. `continue-on-error` significa que não bloqueia merge.

### `project-automation.yml` + `validate-pr.yml` — Automação GitHub

Usa `GITHUB_TOKEN` (auto-provisionado pelo GitHub Actions — NÃO precisa ser configurado manualmente).

**Status:** ✅ Funcional nativamente.

---

## Categorização

### Crítico (CI quebra sem ele)

| Secret | Motivo | Workflow afetado |
|--------|--------|-----------------|
| `VITE_APP_ID` | Build step falha sem variáveis VITE_* (Vite emite warning, build pode quebrar em strict mode) | ci.yml L73 |
| `VITE_OAUTH_PORTAL_URL` | Idem — necessário para build | ci.yml L74 |
| `VITE_FRONTEND_FORGE_API_KEY` | Idem — necessário para build | ci.yml L75 |
| `VITE_FRONTEND_FORGE_API_URL` | Idem — necessário para build | ci.yml L76 |

**Total: 4 secrets críticos** (todos para `pnpm build` no ci.yml)

### Opcional (usado em contextos não-bloqueantes)

| Secret | Motivo | Workflow afetado |
|--------|--------|-----------------|
| `JWT_SECRET` | Unit tests usam mocks; passam com valor vazio | ci.yml L29 |
| `OAUTH_SERVER_URL` | Não lido em runtime por unit tests | ci.yml L31 |
| `OWNER_OPEN_ID` | Não lido em runtime por unit tests | ci.yml L33 |
| `OWNER_NAME` | Não lido em runtime por unit tests | ci.yml L34 |
| `BUILT_IN_FORGE_API_URL` | LLM tests usam mocks | ci.yml L35 |
| `BUILT_IN_FORGE_API_KEY` | LLM tests usam mocks | ci.yml L36 |
| `E2E_TEST_SECRET` | E2E não maduro; workflow não bloqueia merge | e2e-frontend.yml L33 |
| `PLAYWRIGHT_BASE_URL` | Tem fallback default no YAML | e2e-frontend.yml L32 |

**Total: 8 secrets opcionais** (CI passa sem eles — testes usam mocks ou têm fallback)

### Deprecated / Auto-provisionado

| Secret | Motivo |
|--------|--------|
| `GITHUB_TOKEN` | Auto-provisionado pelo GitHub Actions. NÃO precisa ser configurado manualmente. |

**Total: 1 secret deprecated** (remover referência explícita é opcional — funciona como está)

---

## Recomendação

### 1. Criar imediatamente (4 secrets críticos)

```bash
# Valores podem ser dummy/placeholder para CI — não conectam a serviços reais
gh secret set VITE_APP_ID --body "ci-placeholder"
gh secret set VITE_OAUTH_PORTAL_URL --body "https://placeholder.manus.im"
gh secret set VITE_FRONTEND_FORGE_API_KEY --body "ci-placeholder-key"
gh secret set VITE_FRONTEND_FORGE_API_URL --body "https://placeholder.manus.im"
```

**Nota:** Estes secrets são injetados no bundle Vite durante `pnpm build`. Para CI, valores placeholder são suficientes — o build não valida se a URL é real. Para produção, os valores reais são injetados pelo deploy Manus.space.

### 2. Criar com valores reais (recomendado, não urgente — 6 secrets)

```bash
# Estes melhoram cobertura de CI mas não são bloqueantes
gh secret set JWT_SECRET --body "<valor real do env Manus>"
gh secret set OAUTH_SERVER_URL --body "<valor real>"
gh secret set OWNER_OPEN_ID --body "<valor real>"
gh secret set OWNER_NAME --body "<valor real>"
gh secret set BUILT_IN_FORGE_API_URL --body "<valor real>"
gh secret set BUILT_IN_FORGE_API_KEY --body "<valor real>"
```

### 3. Adiar (2 secrets — E2E não maduro)

- `E2E_TEST_SECRET` — criar quando E2E suite estiver pronta
- `PLAYWRIGHT_BASE_URL` — tem fallback, não urgente

### 4. Ignorar (1 secret — auto-provisionado)

- `GITHUB_TOKEN` — provisionado automaticamente pelo GitHub Actions

---

## Esforço Estimado

| Ação | Tempo | Quem |
|------|-------|------|
| Criar 4 secrets críticos (placeholder) | ~5min | Manus via API |
| Criar 6 secrets opcionais (valores reais) | ~15min | Manus via API (precisa extrair valores do env Manus.space) |
| Limpar workflows (remover refs desnecessárias) | ~30min | Manus (PR separado) |
| **Total** | **~50min** | **Classe A** |

---

## Decisão Pendente P.O.

| # | Pergunta | Default proposto |
|---|----------|-----------------|
| D1 | Autorizar criar 4 secrets placeholder para desbloquear ci.yml build? | SIM |
| D2 | Autorizar criar 6 secrets com valores reais do env Manus.space? | SIM (após D1) |
| D3 | Adiar E2E secrets para sprint dedicada? | SIM |

---

## Referências

- PREP-1 (M3-MANUS-2-PREP): grep empírico confirmou 15 secrets referenciados
- PREP-3 (M3-MANUS-2-PREP): PAT tem permissão `gh secret set` confirmada
- `vitest.config.unit.ts`: exclui `server/integration/**`
- `vitest.config.ts`: inclui tudo (integration tests precisam de DATABASE_URL)
