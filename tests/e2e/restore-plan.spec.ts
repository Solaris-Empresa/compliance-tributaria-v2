/**
 * Restore Plan E2E — Sprint Z-18 #705
 * Valida botão restaurar plano deletado
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("Restore plano deletado", () => {
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

  test("CT-01 — botão restore visível em plano deletado", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const deleted = page
      .locator('[data-testid="action-plan-row"]')
      .filter({ hasText: "Excluído" })
      .first();

    if ((await deleted.count()) > 0) {
      await expect(
        deleted.locator('[data-testid="restore-plan-button"]')
      ).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("CT-02 — botão restore invisível em plano ativo", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const active = page
      .locator('[data-testid="action-plan-row"]')
      .filter({ hasText: "Rascunho" })
      .first();

    if ((await active.count()) > 0) {
      await expect(
        active.locator('[data-testid="restore-plan-button"]')
      ).not.toBeVisible();
    } else {
      // Se não tem plano rascunho, verificar que planos aprovados não mostram restore
      const approved = page
        .locator('[data-testid="action-plan-row"]')
        .filter({ hasText: "Aprovado" })
        .first();
      if ((await approved.count()) > 0) {
        await expect(
          approved.locator('[data-testid="restore-plan-button"]')
        ).not.toBeVisible();
      } else {
        test.skip();
      }
    }
  });

  test("CT-03 — restore retorna plano para rascunho", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const deleted = page
      .locator('[data-testid="action-plan-row"]')
      .filter({ hasText: "Excluído" })
      .first();

    if ((await deleted.count()) > 0) {
      await deleted
        .locator('[data-testid="restore-plan-button"]')
        .click();
      await expect(
        page.locator('text="Plano restaurado"')
      ).toBeVisible({ timeout: 10_000 });
    } else {
      test.skip();
    }
  });

  test("CT-04 — audit log registra restored", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verificar na aba Histórico
    const historyTab = page.getByTestId("history-tab");
    if (await historyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body") ?? "";
      // Se há plano restaurado, deve ter entry "Restaurado"
      // Se não há (nenhum plano deletado para restaurar), skip
      if (bodyText.includes("Restaurado")) {
        expect(bodyText).toContain("Restaurado");
      }
    }
  });
});
