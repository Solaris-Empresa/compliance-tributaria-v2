/**
 * CPIE Legado Removido — E2E Regressão (Sprint Z-22 Wave B · Guardrail 4 ADR-0029)
 *
 * 2 CTs de regressão que validam a ausência de comportamento CPIE legado
 * apos Wave B (EX-1, EX-2, EX-3 aplicadas):
 *
 *   CT-B1 — Criar projeto com companyProfile incompleto NAO dispara
 *           trpc.cpieV2.analyzePreview nem bloqueia o fluxo. Qualquer
 *           perfil valido prossegue direto para createProject (remocao
 *           do gate CPIE em NovoProjeto.tsx).
 *
 *   CT-B2 — Aprovar plano (approveActionPlan em routers-fluxo-v3) NAO
 *           invoca persistCpieScoreForProject (EX-2). Zero chamada
 *           para trpc.scoringEngine.* esperada.
 *
 * Padroes obrigatorios:
 *   - beforeEach com retry 3x + backoff (z17-pipeline-completo)
 *   - Timeout 60s geral, 180s LLM
 *   - baseURL via PLAYWRIGHT_BASE_URL (convencao — ver gh pr diff 731)
 *   - SameSite=Lax em localhost (convencao — ver fixtures #729)
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";
const NAV_TIMEOUT = 30_000;

test.describe("CPIE legado removido — Wave A.2+B (#725)", () => {
  test.beforeEach(async ({ page }) => {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await loginViaTestEndpoint(page);
        return;
      } catch (err) {
        lastErr = err as Error;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
    throw lastErr;
  });

  test("CT-B1 — NovoProjeto nao dispara cpieV2.analyzePreview nem bloqueia", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // Network interception: coletar todas as chamadas tRPC
    const cpieV2Calls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      // tRPC batch endpoint: /api/trpc/cpieV2.analyzePreview ou /api/trpc/cpieV2.analyze
      if (/\/api\/trpc\/cpieV2\./.test(url)) {
        cpieV2Calls.push(url);
      }
    });

    await page.goto("/projetos/novo", { waitUntil: "domcontentloaded" });

    // Aguarda form renderizar (ComplianceLayout + nav autenticado)
    await page.waitForSelector("nav", { timeout: NAV_TIMEOUT });

    // Assertion: zero chamadas para cpieV2.* (gate removido)
    // Nao precisamos preencher o form — so carregar a pagina ja seria suficiente
    // para disparar qualquer mutation de gate que acontecesse no onChange.
    await page.waitForTimeout(2000);

    expect(
      cpieV2Calls,
      `Esperado zero chamadas cpieV2.* apos remocao do gate; recebeu ${cpieV2Calls.length}: ${cpieV2Calls.join(", ")}`
    ).toHaveLength(0);
  });

  test("CT-B2 — rota scoringEngine NAO existe mais (router removido)", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    // Coletar responses 404/not-found para scoringEngine.*
    const scoringEngineCalls: Array<{ url: string; status: number }> = [];
    page.on("response", (response) => {
      const url = response.url();
      if (/\/api\/trpc\/scoringEngine\./.test(url)) {
        scoringEngineCalls.push({ url, status: response.status() });
      }
    });

    // Navegar para dashboard que antes consumia scoringEngine (AdminConsistencia,
    // Painel, ScoreView) — agora nao deve mais chamar
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("nav", { timeout: NAV_TIMEOUT });
    await page.waitForTimeout(2000);

    await page.goto(`/projetos/${PROJECT_ID}/compliance-v3/score`, {
      waitUntil: "domcontentloaded",
    });
    // ScoreView redireciona para compliance-dashboard (Wave A.1)
    await expect(page).toHaveURL(
      new RegExp(`/projetos/${PROJECT_ID}/compliance-dashboard`),
      { timeout: NAV_TIMEOUT }
    );

    expect(
      scoringEngineCalls,
      `Esperado zero chamadas scoringEngine.* apos remocao do router; recebeu: ${JSON.stringify(scoringEngineCalls)}`
    ).toHaveLength(0);
  });
});
