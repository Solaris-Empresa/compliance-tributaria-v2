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
 * - CT-4 navega para "/" (Painel) em vez de /projetos/:id. ComplianceLayout
 *   e garantido la, independente do estado do projeto de referencia.
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

  test("CT-4 — link menu 'Dashboard Compliance' aparece no layout global", async ({
    page,
  }) => {
    test.setTimeout(120_000); // Fix run8: CT-4 leva ~1.6min quando roda após CT-3 (tRPC cache warming)
    // Painel inicial (rota "/") — ComplianceLayout garantido, sem dependencia
    // do estado de um projeto especifico.
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Aguarda useAuth resolver. Enquanto `loading=true`, ComplianceLayout
    // renderiza spinner (sem <nav>), depois troca para o layout autenticado.
    // Sem esse wait, o goto retorna enquanto ainda ha spinner → menu ausente.
    await page.waitForSelector("nav", { timeout: NAV_TIMEOUT });

    const menuLink = page.getByTestId("menu-link-compliance-dashboard");
    await expect(menuLink).toBeVisible({ timeout: NAV_TIMEOUT });
    await menuLink.click();
    await expect(page).toHaveURL(/\/projetos$/, { timeout: NAV_TIMEOUT });
  });

  test("CT-5 — botão Exportar PDF visível apos gerar", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(DASHBOARD_PATH, { waitUntil: "domcontentloaded" });

    const btnPdf = page.getByTestId("btn-exportar-pdf-compliance");
    await expect(btnPdf).toBeVisible({ timeout: NAV_TIMEOUT });
  });
});
