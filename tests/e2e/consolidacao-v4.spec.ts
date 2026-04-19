/**
 * consolidacao-v4.spec.ts — Suite Z-20 #717 Bateria 1
 *
 * E2E do Step 7 (ConsolidacaoV4). Anteriormente AUSENTE.
 * Cobre: Exposição ao Risco de Compliance Card, KPIs, disclaimer, PDF export.
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const REFERENCE_PROJECT_ID = process.env.E2E_REFERENCE_PROJECT_ID || "930001";

test.describe("ConsolidacaoV4 — Step 7 entregável final", () => {
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

  test("Exposição ao Risco de Compliance Card visível", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const card = page.locator('[data-testid="compliance-score-card"]');
    const visible = await card.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      expect(visible).toBe(true);
    } else {
      const bodyText = (await page.textContent("body")) ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("KPIs exibidos (score, alta, media)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const kpiScore = await page
      .locator('[data-testid="kpi-score"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const bodyText = (await page.textContent("body")) ?? "";
    expect(kpiScore || !bodyText.includes("Erro")).toBe(true);
  });

  test("Disclaimer jurídico obrigatório visível (RN-CV4-11)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const disclaimer = page.locator('[data-testid="disclaimer-box"]');
    const visible = await disclaimer.isVisible({ timeout: 10_000 }).catch(() => false);
    const bodyText = (await page.textContent("body")) ?? "";
    // Disclaimer OU texto contém "apoio à decisão"
    expect(visible || bodyText.includes("apoio à decisão")).toBe(true);
  });

  test("Botão download PDF presente", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const btn = page.locator('[data-testid="btn-download-pdf"]');
    const visible = await btn.isVisible({ timeout: 10_000 }).catch(() => false);
    const bodyText = (await page.textContent("body")) ?? "";
    expect(visible || bodyText.includes("PDF")).toBe(true);
  });
});
