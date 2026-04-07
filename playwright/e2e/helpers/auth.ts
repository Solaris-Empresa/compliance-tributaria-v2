/**
 * Helpers de autenticação para testes E2E — Gate E2E v4.5
 * Reutiliza o padrão loginViaTestEndpoint estabelecido em tests/e2e/fixtures/auth.ts
 *
 * NOTA: O projeto usa Manus OAuth (não email/senha direta).
 * O endpoint auth.testLogin requer E2E_TEST_MODE=true no servidor.
 * Credenciais via: E2E_TEST_SECRET (env var / GitHub Secret)
 */
import { type Page, request as playwrightRequest } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL ?? 'https://iasolaris.manus.space'
const TEST_SECRET = process.env.E2E_TEST_SECRET ?? ''

// clientId fixo: usuário demo que sempre existe no banco
const E2E_CLIENT_ID = 9999

/**
 * Autentica a página via endpoint testLogin (sem OAuth).
 * Injeta o cookie app_session_id na página e navega para /projetos.
 * Requer: E2E_TEST_MODE=true no servidor + E2E_TEST_SECRET correto.
 */
export async function loginViaTestEndpoint(page: Page): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL })
  const res = await ctx.post('/api/trpc/auth.testLogin', {
    data: { json: { testSecret: TEST_SECRET } },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`testLogin falhou: ${res.status()} — ${body}`)
  }
  const storageState = await ctx.storageState()
  await page.context().addCookies(storageState.cookies)
  await ctx.dispose()
  await page.goto('/projetos')
  await page.waitForURL(/\/projetos/, { timeout: 15_000 })
}
