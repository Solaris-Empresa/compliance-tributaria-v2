/**
 * Compliance Dashboard E2E — Sprint Z-22 CPIE v3 (#725) Wave A.1
 * Valida 5 CTs da spec SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.md Bloco 7.
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff).
 *
 * NOTAS ANTI-FLAKY (aplicadas apos E2E run4 — 1/5 PASS → 5/5 alvo):
 * - `waitForLoadState("networkidle")` removido: React Query refaz polling e
 *   networkidle nunca dispara → goto aborta com ERR_ABORTED no teste seguinte.
 *   Em SPA, aguarda-se pelo testid-alvo (Playwright ja faz auto-wait).
 * - `goto` usa `{ waitUntil: "domcontentloaded" }` — mais determinista que o
 *   default ("load") para paginas com chunk tRPC lazy.
 * - CT-4 (fix #731): testa botao contextual btn-ver-score-projeto em ProjetoDetalhesV2.
 *   Item removido do sidebar global — acesso preservado via botao contextual.
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";
const DASHBOARD_PATH = `/projetos/${PROJECT_ID}/compliance-dashboard`;
const NAV_TIMEOUT = 30_000;

test.describe("Compliance Dashboard v3 (#725)", () => {
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

  test("CT-1 — rota /compliance-dashboard carrega", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(DASHBOARD_PATH, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId("compliance-dashboard-page")
    ).toBeVisible({ timeout: NAV_TIMEOUT });
  });

  test("CT-2 — 'Gerar Dashboard' renderiza os 3 cards", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(DASHBOARD_PATH, { waitUntil: "domcontentloaded" });
    await page.getByTestId("btn-gerar-dashboard").click({ timeout: NAV_TIMEOUT });

    await expect(page.getByTestId("score-card-compliance")).toBeVisible({
      timeout: NAV_TIMEOUT,
    });
    await expect(page.getByTestId("score-card-execution")).toBeVisible();
    await expect(page.getByTestId("score-card-data-quality")).toBeVisible();
  });

  test("CT-3 — modal da formula abre com breakdown", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(DASHBOARD_PATH, { waitUntil: "domcontentloaded" });

    await page.getByTestId("btn-gerar-dashboard").click({ timeout: NAV_TIMEOUT });
    await page
      .getByTestId("score-card-compliance")
      .waitFor({ timeout: NAV_TIMEOUT });

    await page.getByTestId("btn-formula-modal").click();
    await expect(page.getByTestId("formula-modal")).toBeVisible();
    await expect(page.getByTestId("formula-modal-breakdown")).toBeVisible();

    await page.getByTestId("formula-modal-close").click();
    await expect(page.getByTestId("formula-modal")).not.toBeVisible();
  });

  test("CT-4 — botão contextual 'Dashboard de Compliance' em ProjetoDetalhesV2 navega para dashboard", async ({
    page,
  }) => {
    // fix(z22) #731: item removido do sidebar global — acesso via botao contextual em ProjetoDetalhesV2
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("nav", { timeout: NAV_TIMEOUT });
    const btnContextual = page.getByTestId("btn-ver-score-projeto");
    await expect(btnContextual).toBeVisible({ timeout: NAV_TIMEOUT });
    await btnContextual.click();
    await expect(page).toHaveURL(
      new RegExp(`/projetos/${PROJECT_ID}/compliance-dashboard`),
      { timeout: NAV_TIMEOUT }
    );
  });

  test("CT-5 — botão Exportar PDF visível apos gerar", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(DASHBOARD_PATH, { waitUntil: "domcontentloaded" });

    const btnPdf = page.getByTestId("btn-exportar-pdf-compliance");
    await expect(btnPdf).toBeVisible({ timeout: NAV_TIMEOUT });
  });
});
