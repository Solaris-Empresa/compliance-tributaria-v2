/**
 * Fixtures de autenticação e criação de projeto para testes E2E SOLARIS.
 *
 * loginViaTestEndpoint: usa auth.testLogin (E2E_TEST_MODE=true) para criar sessão sem OAuth.
 * criarProjetoViaApi: cria projeto via tRPC fluxoV3.createProject com payload mínimo válido.
 *
 * COOKIE: app_session_id (definido em shared/const.ts)
 * CLIENT_ID fixo: 9999 (demo@iasolaris.com.br — Advocacia & Contabilidade Ltda)
 */
import { type Page, request as playwrightRequest } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://iasolaris.manus.space';
const TEST_SECRET = process.env.E2E_TEST_SECRET || '';

// clientId fixo: usuário demo que sempre existe no banco
const E2E_CLIENT_ID = 9999;

/**
 * Autentica a página via endpoint testLogin (sem OAuth).
 * Injeta o cookie app_session_id na página e navega para /projetos.
 */
export async function loginViaTestEndpoint(page: Page): Promise<void> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

  const res = await ctx.post('/api/trpc/auth.testLogin', {
    data: { json: { testSecret: TEST_SECRET } },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`testLogin falhou: ${res.status()} — ${body}`);
  }

  // Transferir cookies da sessão para a página
  const storageState = await ctx.storageState();
  await page.context().addCookies(storageState.cookies);
  await ctx.dispose();

  await page.goto('/projetos');
  await page.waitForURL(/\/projetos/, { timeout: 15000 });
}

/**
 * Cria um projeto via tRPC API com payload mínimo válido.
 * Retorna o ID do projeto criado (string).
 */
export async function criarProjetoViaApi(page: Page, nome: string = 'UAT E2E Auto'): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

  // Transferir cookies de autenticação para o contexto da API
  const cookies = await page.context().cookies();
  await ctx.storageState(); // inicializar
  // Usar fetch direto com cookies no header
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const payload = {
    name: nome,
    description: `Projeto de teste E2E automatizado criado em ${new Date().toISOString()}. Utilizado para validação do fluxo UAT SOLARIS Onda 1 → Onda 2 → Corporativo.`,
    clientId: E2E_CLIENT_ID,
    companyProfile: {
      cnpj: '00.000.000/0001-00',
      companyType: 'ltda' as const,
      companySize: 'media' as const,
      taxRegime: 'lucro_real' as const,
    },
    operationProfile: {
      operationType: 'servico' as const,
      clientType: ['b2b'],
      multiState: false,
    },
  };

  const res = await ctx.post('/api/trpc/fluxoV3.createProject', {
    data: { json: payload },
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`createProject falhou: ${res.status()} — ${body}`);
  }

  const json = await res.json() as { result?: { data?: { json?: number } } };
  const projectId = json?.result?.data?.json;

  if (!projectId) {
    throw new Error(`createProject não retornou projectId: ${JSON.stringify(json)}`);
  }

  await ctx.dispose();
  return String(projectId);
}
