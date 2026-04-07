/**
 * Helpers de criação e navegação de projetos para testes E2E — Gate E2E v4.5
 */
import { type Page, request as playwrightRequest } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL ?? 'https://iasolaris.manus.space'
const E2E_CLIENT_ID = 9999

export type OperationType = 'produto' | 'servico' | 'comercio' | 'misto'

export interface CriarProjetoOptions {
  nome?: string
  operationType?: OperationType
}

/**
 * Cria um projeto via tRPC API com payload mínimo válido.
 * Retorna o ID do projeto criado (string).
 */
export async function criarProjetoViaApi(
  page: Page,
  options: CriarProjetoOptions = {}
): Promise<string> {
  const { nome = 'UAT E2E Auto', operationType = 'produto' } = options
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL })
  const cookies = await page.context().cookies()
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

  const payload = {
    name: nome,
    description: `Projeto de teste E2E criado em ${new Date().toISOString()}.`,
    clientId: E2E_CLIENT_ID,
    companyProfile: {
      cnpj: '00.000.000/0001-00',
      companyType: 'ltda' as const,
      companySize: 'media' as const,
      taxRegime: 'lucro_real' as const,
    },
    operationProfile: {
      operationType,
      clientType: ['b2b'],
      multiState: false,
    },
  }

  const res = await ctx.post('/api/trpc/fluxoV3.createProject', {
    data: { json: payload },
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
  })
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`createProject falhou: ${res.status()} — ${body}`)
  }
  const json = await res.json() as { result?: { data?: { json?: number } } }
  const projectId = json?.result?.data?.json
  if (!projectId) throw new Error(`createProject não retornou projectId: ${JSON.stringify(json)}`)
  await ctx.dispose()
  return String(projectId)
}

/**
 * Aguarda que o projeto atinja o status esperado (polling via API).
 * Timeout padrão: 30s.
 */
export async function aguardarStatus(
  page: Page,
  projectId: string,
  expectedStatus: string,
  timeoutMs = 30_000
): Promise<void> {
  const cookies = await page.context().cookies()
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL })
    const res = await ctx.get(`/api/trpc/fluxoV3.getProject?input=${encodeURIComponent(JSON.stringify({ json: { projectId: Number(projectId) } }))}`, {
      headers: { Cookie: cookieHeader },
    })
    await ctx.dispose()
    if (res.ok()) {
      const json = await res.json() as { result?: { data?: { json?: { status?: string } } } }
      const status = json?.result?.data?.json?.status
      if (status === expectedStatus) return
    }
    await page.waitForTimeout(1_000)
  }
  throw new Error(`Projeto ${projectId} não atingiu status '${expectedStatus}' em ${timeoutMs}ms`)
}
