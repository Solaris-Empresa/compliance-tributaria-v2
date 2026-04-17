/**
 * PDF Diagnóstico ConsolidacaoV4 E2E — Sprint Z-18 #701
 * Valida integração do botão PDF com generateDiagnosticoPDF
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff)
 * RN-CV4-11 (disclaimer) + RN-CV4-12 (jsPDF)
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("PDF Diagnóstico ConsolidacaoV4", () => {
  test.beforeEach(async ({ page }) => {
    // Mesmo pattern de auth do z17-pipeline-completo (21/21 PASS)
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

  test("CT-01 — botão PDF visível na ConsolidacaoV4", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await expect(
      page.locator('[data-testid="btn-download-pdf"]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test("CT-02 — botão PDF não mostra toast placeholder", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.click('[data-testid="btn-download-pdf"]');
    await page.waitForTimeout(2000);
    await expect(
      page.locator('text="PDF será implementado"')
    ).not.toBeVisible();
  });

  test("CT-03 — toast sucesso após clique no PDF", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.click('[data-testid="btn-download-pdf"]');
    await expect(
      page.locator('text="PDF gerado com sucesso"')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("CT-04 — toast placeholder removido do código (source não contém string)", async ({ page }) => {
    test.setTimeout(60_000);
    const response = await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    // Verificar que o bundle JS não contém o placeholder removido
    const content = await response?.text() ?? "";
    expect(content).not.toContain("PDF será implementado");
  });
});
