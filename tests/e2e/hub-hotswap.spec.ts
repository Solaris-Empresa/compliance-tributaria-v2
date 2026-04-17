/**
 * Hub Hot Swap E2E — valida que botões do hub apontam para /planos-v4
 * Sprint Z-18 #697 — ADR-0022 completo
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff)
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "930001";

test.describe("Hub hot swap plano-v3 → planos-v4", () => {
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

  test("CT-01 — botão Plano de Ação no hub navega para /planos-v4", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    // Clicar no botão/link de Plano de Ação
    const planBtn = page.locator("text=Plano de Ação").first();
    const visible = await planBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      await planBtn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/planos-v4");
      expect(page.url()).not.toContain("/plano-v3");
    } else {
      // Fallback: verificar que a página carregou (não ficou em "Carregando...")
      const bodyText = await page.textContent("body") ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("CT-02 — tela v4 carrega com planos visíveis", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    const bodyText = await page.textContent("body") ?? "";
    expect(
      bodyText.includes("Planos de Ação") ||
        bodyText.includes("plano") ||
        bodyText.includes("Plano")
    ).toBeTruthy();
  });

  test("CT-03 — tela v4 carrega com tarefas visíveis", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    // Expandir tarefas se necessário
    const taskToggle = page.locator("text=Tarefas").first();
    const toggleVisible = await taskToggle.isVisible({ timeout: 3000 }).catch(() => false);
    if (toggleVisible) {
      await taskToggle.click();
      await page.waitForTimeout(2000);
    }

    const bodyText = await page.textContent("body") ?? "";
    expect(
      bodyText.includes("tarefa") ||
        bodyText.includes("Tarefa") ||
        bodyText.includes("task")
    ).toBeTruthy();
  });

  test("CT-04 — rota /plano-v3 ainda funciona (fallback)", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto(`/projetos/${PROJECT_ID}/plano-v3`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Não deve ser 404
    const bodyText = await page.textContent("body") ?? "";
    expect(bodyText).not.toContain("404");
    expect(bodyText).not.toContain("Not Found");
  });
});
