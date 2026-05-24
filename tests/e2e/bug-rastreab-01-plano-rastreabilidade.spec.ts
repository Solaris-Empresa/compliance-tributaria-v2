/**
 * BUG-RASTREAB-01 (#1189) E2E — rastreabilidade Ação→Risco visível na listagem de planos.
 * Causa-raiz: flatMap descartava o risco-pai; cards mostravam só titulo/responsável.
 * Fix: cada plano exibe categoria + artigo do risco vinculado (chips por card).
 * Auth pattern: z17-pipeline-completo (retry 3x com backoff).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

// Projeto auditado 1620001 (construtora, 6 planos). Override via E2E_PROJECT_ID.
const PROJECT_ID = process.env.E2E_PROJECT_ID || "1620001";

test.describe("BUG-RASTREAB-01 — rastreabilidade Ação→Risco no plano de ação", () => {
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

  // Golden path — cada plano exibe a rastreabilidade do risco (categoria + artigo)
  test("CT-01 — listagem de planos mostra categoria + artigo do risco vinculado", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const rows = page.locator('[data-testid="action-plan-row"]');
    const traces = page.locator('[data-testid="plan-risk-trace"]');

    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Todo plano deve exibir a rastreabilidade do risco
    await expect(traces.first()).toBeVisible();
    expect(await traces.count()).toBe(rowCount);
  });

  // Edge — o chip de artigo contém uma referência normativa ("Art.")
  test("CT-02 — chip de artigo do risco contém referência normativa", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const artigo = page.locator('[data-testid="plan-risk-artigo"]').first();
    await expect(artigo).toBeVisible();
    const txt = (await artigo.textContent()) ?? "";
    expect(txt).toMatch(/Art\.|Arts\./);
  });
});
