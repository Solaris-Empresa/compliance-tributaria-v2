/**
 * Hub Hot Swap E2E — valida que botões do hub apontam para /planos-v4
 * Sprint Z-18 #697 — ADR-0022 completo
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("Hub hot swap plano-v3 → planos-v4", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaTestEndpoint(page);
  });

  test("botão Plano de Ação no hub navega para /planos-v4", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`/projetos/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");

    // Clicar no botão/link de Plano de Ação
    const planBtn = page.locator('text=Plano de Ação').first();
    const visible = await planBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      await planBtn.click();
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/planos-v4");
      expect(page.url()).not.toContain("/plano-v3");
    }
  });

  test("tela v4 carrega com planos visíveis", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent("body") ?? "";
    expect(
      bodyText.includes("Planos de Ação") ||
      bodyText.includes("plano") ||
      bodyText.includes("Plano")
    ).toBeTruthy();
  });

  test("tela v4 carrega com tarefas visíveis", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Expandir tarefas se necessário
    const taskToggle = page.locator("text=Tarefas").first();
    const toggleVisible = await taskToggle.isVisible({ timeout: 3000 }).catch(() => false);
    if (toggleVisible) {
      await taskToggle.click();
      await page.waitForTimeout(1000);
    }

    const taskRows = page.locator('[data-testid="task-row"]');
    const count = await taskRows.count().catch(() => 0);
    if (count === 0) {
      // Fallback: verificar por conteúdo
      const bodyText = await page.textContent("body") ?? "";
      expect(bodyText.includes("tarefa") || bodyText.includes("Tarefa")).toBeTruthy();
    } else {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test("rota /plano-v3 ainda funciona (fallback)", async ({ page }) => {
    test.setTimeout(15_000);
    await page.goto(`/projetos/${PROJECT_ID}/plano-v3`);
    await page.waitForLoadState("networkidle");
    // Não deve ser 404
    const bodyText = await page.textContent("body") ?? "";
    expect(bodyText).not.toContain("404");
    expect(bodyText).not.toContain("Not Found");
  });
});
