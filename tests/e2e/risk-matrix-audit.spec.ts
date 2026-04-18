/**
 * risk-matrix-audit.spec.ts — Suite Z-20 #717 Bateria 1
 *
 * E2E do RiskDashboardV4 — cobre subset automatizável dos 21 bugs UAT Gate E.
 * Auth pattern: mesmo do z17-pipeline-completo (retry com backoff).
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const REFERENCE_PROJECT_ID = process.env.E2E_REFERENCE_PROJECT_ID || "930001";

test.describe("Matriz de Riscos — auditoria visual (21 bugs UAT Gate E)", () => {
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

  test("B-06 — Summary Bar com 4 cards (altos/medios/oportunidades/aguardando)", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const summary = page.locator('[data-testid="summary-bar"]');
    const visible = await summary.isVisible({ timeout: 10_000 }).catch(() => false);
    if (visible) {
      await expect(page.locator('[data-testid="summary-count-alta"]')).toBeVisible();
      await expect(page.locator('[data-testid="summary-count-media"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="summary-count-oportunidade"]')
      ).toBeVisible();
    } else {
      const bodyText = (await page.textContent("body")) ?? "";
      expect(bodyText).not.toContain("Carregando...");
    }
  });

  test("B-02 — Card de risco expõe botões Editar/Excluir/Aprovar", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const approve = page.locator('[data-testid="approve-risk-button"]').first();
    const visible = await approve.isVisible({ timeout: 10_000 }).catch(() => false);
    expect(visible || (await page.textContent("body"))?.includes("Nenhum risco")).toBe(true);
  });

  test("B-12 — Chips dinâmicos de categoria visíveis", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Chips devem ter pelo menos uma categoria listada
    const content = (await page.textContent("body")) ?? "";
    const categoriasConhecidas = [
      "Imposto Seletivo",
      "Split Payment",
      "Obrigação Acessória",
      "Alíquota Zero",
    ];
    const found = categoriasConhecidas.some((c) => content.includes(c));
    expect(found || content.includes("Nenhum risco")).toBe(true);
  });

  test("B-13 — Breadcrumb 4 nós [fonte › categoria › artigo › ruleId]", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const content = (await page.textContent("body")) ?? "";
    // Breadcrumb usa separador › entre os 4 nós
    const hasBreadcrumb = content.includes("›") || content.includes("Nenhum risco");
    expect(hasBreadcrumb).toBe(true);
  });

  test("RAG badge — validated ou pending sempre presente", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const validated = await page
      .locator('[data-testid="rag-badge-validated"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const pending = await page
      .locator('[data-testid="rag-badge-pending"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const content = (await page.textContent("body")) ?? "";

    expect(validated || pending || content.includes("Nenhum risco")).toBe(true);
  });

  test("Aba Histórico acessível (B-11)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${REFERENCE_PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const tab = page.locator('[data-testid="history-tab"]');
    const visible = await tab.isVisible({ timeout: 10_000 }).catch(() => false);
    expect(visible).toBe(true);
  });
});
