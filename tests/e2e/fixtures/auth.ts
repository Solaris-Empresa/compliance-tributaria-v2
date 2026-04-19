/**
 * Fixtures de autenticação e criação de projeto para testes E2E SOLARIS.
 *
 * loginViaTestEndpoint: usa auth.testLogin (E2E_TEST_MODE=true) para criar sessão sem OAuth.
 * criarProjetoViaApi: cria projeto via tRPC fluxoV3.createProject com payload mínimo válido.
 *
 * COOKIE: app_session_id (definido em shared/const.ts)
 * CLIENT_ID fixo: 9999 (demo@iasolaris.com.br — Advocacia & Contabilidade Ltda)
 *
 * Fix v2: usar page.request em vez de playwrightRequest.newContext para evitar
 * fechamento acidental do browser context ao chamar ctx.dispose().
 * Fix v3 (run6): PLAYWRIGHT_BASE_URL tem prioridade sobre E2E_BASE_URL para garantir
 * que o goto pós-login aponte para localhost em vez de produção.
 */
import { type Page } from '@playwright/test';

// PLAYWRIGHT_BASE_URL tem prioridade (passado via CLI); E2E_BASE_URL é fallback; produção é último recurso
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || 'https://iasolaris.manus.space';
const TEST_SECRET = process.env.E2E_TEST_SECRET || '';

// clientId fixo: usuário demo que sempre existe no banco
const E2E_CLIENT_ID = 9999;

/**
 * Autentica a página via endpoint testLogin (sem OAuth).
 * Usa page.request para manter o mesmo contexto do browser.
 */
export async function loginViaTestEndpoint(page: Page): Promise<void> {
  const res = await page.request.post(`${BASE_URL}/api/trpc/auth.testLogin`, {
    data: { json: { testSecret: TEST_SECRET } },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`testLogin falhou: ${res.status()} — ${body}`);
  }
  await page.goto(`${BASE_URL}/projetos`);
  await page.waitForURL(/\/projetos/, { timeout: 15000 });
}

/**
 * Cria um projeto via tRPC API com payload mínimo válido.
 * Retorna o ID do projeto criado (string).
 *
 * Fix: description >= 50 chars (schema validation).
 * Fix: API retorna { projectId: N } — extrair corretamente.
 * Fix v2: usa page.request para manter cookies do browser context.
 */
export async function criarProjetoViaApi(page: Page, nome: string = 'UAT E2E Auto'): Promise<string> {
  const payload = {
    name: nome,
    // Fix: descrição mínima de 50 caracteres exigida pelo schema do servidor
    description: `Projeto de teste E2E automatizado — validação do pipeline completo Sprint Z-17. Criado em ${new Date().toISOString()}.`,
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

  const res = await page.request.post(`${BASE_URL}/api/trpc/fluxoV3.createProject`, {
    data: { json: payload },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`createProject falhou: ${res.status()} — ${body}`);
  }

  // Fix: API retorna { projectId: N } — não um número direto
  const json = await res.json() as { result?: { data?: { json?: { projectId?: number } | number } } };
  const raw = json?.result?.data?.json;
  const projectId = typeof raw === 'object' && raw !== null
    ? (raw as { projectId?: number }).projectId
    : (raw as number | undefined);

  if (!projectId) {
    throw new Error(`createProject não retornou projectId: ${JSON.stringify(json)}`);
  }

  return String(projectId);
}
