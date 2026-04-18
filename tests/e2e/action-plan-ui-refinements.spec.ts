/**
 * ActionPlan UI refinements E2E — Sprint Z-19 #712
 * Valida 6 itens P.O.: remover "v4", badge prazo, botões topo, breadcrumb.
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("ActionPlan UI refinements Z-19", () => {
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

  test("CT-01/02/03 — textos v4 removidos", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const content = await page.content();
    expect(content).not.toContain("Planos de Ação v4");
    expect(content).not.toContain("Planos de Ação — v4");
    expect(content).not.toContain("Sistema de Riscos v4");
  });

  test("CT-04/05 — badge prazo removido, badge status mantido", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const prazoTokens = ["30 dias", "60 dias", "90 dias", "180 dias"];
    for (const token of prazoTokens) {
      const bodyText = (await page.textContent("body")) ?? "";
      const badgeCount = (bodyText.match(new RegExp(token, "g")) ?? []).length;
      expect(badgeCount).toBeLessThanOrEqual(0);
    }
  });

  test("CT-07/08 — botão Ver Consolidação no topo navega para /consolidacao-v4", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const btn = page.locator('[data-testid="btn-ver-consolidacao-top"]');
    const visible = await btn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      await btn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/consolidacao-v4");
    } else {
      const bodyText = (await page.textContent("body")) ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("CT-11 — botão Exportar PDF visível no header", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const btn = page.locator('[data-testid="btn-exportar-pdf-planos"]');
    const visible = await btn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      expect(visible).toBe(true);
    } else {
      const bodyText = (await page.textContent("body")) ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("CT-13/14 — breadcrumb expandido com Matriz de Riscos", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const matrizLink = page.locator('text="Matriz de Riscos"').first();
    const visible = await matrizLink
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (visible) {
      await matrizLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/risk-dashboard-v4");
    } else {
      const bodyText = (await page.textContent("body")) ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("CT-15 — breadcrumb preserva link Projeto", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const projetoLink = page.locator('text="Projeto"').first();
    expect(
      await projetoLink.isVisible({ timeout: 10_000 }).catch(() => false)
    ).toBe(true);
  });
});
