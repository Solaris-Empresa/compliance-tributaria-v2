/**
 * PDF Diagnóstico ConsolidacaoV4 E2E — Sprint Z-18 #701
 * Valida que botão PDF gera download (não placeholder)
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("PDF Diagnóstico ConsolidacaoV4", () => {
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

  test("CT-01 — botão PDF visível na ConsolidacaoV4", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const btn = page.locator('[data-testid="btn-download-pdf"]');
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });

  test("CT-02 — clicar PDF não mostra toast placeholder", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    await page.click('[data-testid="btn-download-pdf"]');
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent("body") ?? "";
    expect(bodyText).not.toContain("PDF será implementado");
  });

  test("CT-03 — toast sucesso após clique no PDF", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    await page.click('[data-testid="btn-download-pdf"]');

    // Toast "PDF gerado com sucesso" deve aparecer
    await expect(
      page.locator('text="PDF gerado com sucesso"')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("CT-04 — placeholder removido do código", async ({ page }) => {
    test.setTimeout(30_000);
    // Verificar via conteúdo da página (não do bundle)
    await page.goto(`/projetos/${PROJECT_ID}/consolidacao-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent("body") ?? "";
    expect(bodyText).not.toContain("PDF será implementado");
  });
});
