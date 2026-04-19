/**
 * Compliance Dashboard E2E — Sprint Z-22 CPIE v3 (#725) Wave A.1
 * Valida 5 CTs da spec SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.md Bloco 7.
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

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
    await page.goto(`/projetos/${PROJECT_ID}/compliance-dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByTestId("compliance-dashboard-page")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("CT-2 — 'Gerar Dashboard' renderiza os 3 cards", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/compliance-dashboard`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("btn-gerar-dashboard").click();

    await expect(page.getByTestId("score-card-compliance")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("score-card-execution")).toBeVisible();
    await expect(page.getByTestId("score-card-data-quality")).toBeVisible();
  });

  test("CT-3 — modal da formula abre com breakdown", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/compliance-dashboard`);
    await page.waitForLoadState("networkidle");

    await page.getByTestId("btn-gerar-dashboard").click();
    await page.getByTestId("score-card-compliance").waitFor({ timeout: 15_000 });

    await page.getByTestId("btn-formula-modal").click();
    await expect(page.getByTestId("formula-modal")).toBeVisible();
    await expect(page.getByTestId("formula-modal-breakdown")).toBeVisible();

    await page.getByTestId("formula-modal-close").click();
    await expect(page.getByTestId("formula-modal")).not.toBeVisible();
  });

  test("CT-4 — link menu 'Dashboard Compliance' navega para lista de projetos", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    const menuLink = page.getByTestId("menu-link-compliance-dashboard");
    await expect(menuLink).toBeVisible();
    await menuLink.click();
    await expect(page).toHaveURL(/\/projetos$/, { timeout: 10_000 });
  });

  test("CT-5 — botão Exportar PDF visível apos gerar", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/compliance-dashboard`);
    await page.waitForLoadState("networkidle");

    const btnPdf = page.getByTestId("btn-exportar-pdf-compliance");
    await expect(btnPdf).toBeVisible();
  });
});
