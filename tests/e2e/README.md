# UAT E2E Automatizado — IA SOLARIS

Testes de ponta a ponta com Playwright cobrindo o caminho crítico do fluxo UAT SOLARIS.

## Pré-requisitos

- Node.js 18+ e pnpm instalados
- Variáveis de ambiente configuradas (ver abaixo)
- Playwright browsers instalados: `pnpm exec playwright install chromium`

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `E2E_BASE_URL` | URL base do ambiente de teste | `https://iasolaris.manus.space` |
| `E2E_TEST_SECRET` | Secret compartilhado com o servidor para `auth.testLogin` | `e2e-solaris-2026-UAT-xK9mP3` |

> ⚠️ `E2E_TEST_SECRET` deve coincidir com o valor configurado no servidor via `E2E_TEST_SECRET` env var.
> O endpoint `auth.testLogin` só funciona quando `E2E_TEST_MODE=true` no servidor.

## Executar

```bash
E2E_BASE_URL=https://iasolaris.manus.space \
E2E_TEST_SECRET=e2e-solaris-2026-UAT-xK9mP3 \
pnpm test:e2e
```

## Ver relatório HTML

```bash
pnpm test:e2e:report
```

## Casos cobertos

| Caso | Suite | Descrição |
|---|---|---|
| CT-01 | `01-onda1-solaris.spec.ts` | CNAE universal carrega perguntas SOLARIS (SOL-001) |
| CT-04 | `01-onda1-solaris.spec.ts` | Badge "Equipe técnica SOLARIS", progresso 0%, Etapa 1 de 8 |
| CT-06 | `01-onda1-solaris.spec.ts` | Campo obrigatório bloqueia avanço sem preenchimento |
| CT-07 | `01-onda1-solaris.spec.ts` | Concluir Onda 1 → "Questionário por IA" aparece no stepper |
| CT-37 | `02-e2e-completo.spec.ts` | E2E completo: Onda 1 → Onda 2 → Corporativo desbloqueado |

## Estrutura

```
tests/e2e/
  fixtures/
    auth.ts              — loginViaTestEndpoint + criarProjetoViaApi
  01-onda1-solaris.spec.ts  — CT-01, CT-04, CT-06, CT-07
  02-e2e-completo.spec.ts   — CT-37 (E2E completo)
  reports/               — Relatórios HTML gerados pelo Playwright
  README.md              — Este arquivo
```

## Critério de done

- [ ] `pnpm test:e2e` executa sem erro de configuração
- [ ] CT-01, CT-04, CT-06, CT-07 passando
- [ ] CT-37 passando (Corporativo desbloqueado após Onda 2)
- [ ] `pnpm test` (unit) → sem regressão
- [ ] TypeScript: 0 erros

## Notas técnicas

- A fixture `loginViaTestEndpoint` usa `trpc.auth.testLogin` — disponível apenas com `E2E_TEST_MODE=true`.
- A fixture `criarProjetoViaApi` usa `trpc.fluxoV3.createProject` com payload mínimo válido e `clientId=9999` (demo fixo).
- O CT-37 verifica o fix do **BUG-UAT-03**: após concluir Onda 2, o status deve avançar para `diagnostico_corporativo`.
