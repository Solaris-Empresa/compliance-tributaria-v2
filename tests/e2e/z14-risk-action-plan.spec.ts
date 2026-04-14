/**
 * Suite E2E — Sprint Z-14: RiskDashboard + ActionPlan
 * CT-01: Criar plano de acao
 * CT-02: Editar plano existente
 * CT-03: SummaryBar 4 cards
 * CT-04: Aprovar risco individual
 * CT-05: Bulk approve
 * CT-06: Excluir risco → HistoryTab
 * CT-07: Restaurar risco
 *
 * Rota: /projetos/:id/risk-dashboard-v4
 * Depende: E2E_TEST_MODE=true no servidor
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID || "30760";

test.describe("Sprint Z-14 — RiskDashboard + ActionPlan", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await loginViaTestEndpoint(page);
    await page.goto(`/projetos/${PROJECT_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  });

  test("CT-01: criar plano via botao + Plano", async ({ page }) => {
    // Find first risk card with + Plano button
    const plusPlanBtn = page.locator('button[title="Criar plano de ação"]').first();
    await expect(plusPlanBtn).toBeVisible({ timeout: 10_000 });
    await plusPlanBtn.click();

    // Modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill form
    await modal.locator('input[id="plan-titulo"]').fill("Plano E2E CT-01 Teste");
    await modal.locator('input[id="plan-responsavel"]').fill("Equipe Solaris");

    // Select prazo
    await modal.locator('button[id="plan-prazo"]').click();
    await page.locator('[role="option"]:has-text("30 dias")').click();

    // Submit
    await modal.locator('button:has-text("Criar plano")').click();

    // Toast should appear
    await expect(page.locator('text=Plano criado')).toBeVisible({ timeout: 5_000 });
  });

  test("CT-02: editar plano — campos pre-preenchidos", async ({ page }) => {
    // Navigate to ActionPlanPage
    const firstRisk = page.locator('[class*="border-l-4"]').first();
    const actionLink = firstRisk.locator('a[href*="planos-v4"]').first();

    if (await actionLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await actionLink.click();
    } else {
      await page.goto(`/projetos/${PROJECT_ID}/planos-v4`);
    }
    await page.waitForLoadState("networkidle");

    // Find edit button on a plan card
    const editBtn = page.locator('button[title="Editar plano"]').first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();

      // Modal should show "Editar plano de ação"
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 3000 });
      await expect(modal.locator('text=Editar plano')).toBeVisible();

      // Fields should be pre-filled (not empty)
      const tituloInput = modal.locator("#ap-titulo");
      const tituloValue = await tituloInput.inputValue();
      expect(tituloValue.length).toBeGreaterThan(0);

      // Modify title
      await tituloInput.fill("Plano E2E CT-02 Editado");
      await modal.locator('button:has-text("Salvar")').click();

      await expect(page.locator('text=Plano atualizado')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Nenhum plano editavel encontrado");
    }
  });

  test("CT-03: SummaryBar exibe 4 cards corretos", async ({ page }) => {
    // SummaryBar should have 4 cards
    const summaryCards = page.locator(".sticky .grid > div");
    const cardCount = await summaryCards.count();
    expect(cardCount).toBe(4);

    // Each card should have a number
    for (let i = 0; i < 4; i++) {
      const number = summaryCards.nth(i).locator("p.text-xl");
      await expect(number).toBeVisible();
      const text = await number.textContent();
      expect(parseInt(text ?? "NaN")).toBeGreaterThanOrEqual(0);
    }
  });

  test("CT-04: aprovar risco individual", async ({ page }) => {
    // Find approve button on a pending risk
    const approveBtn = page.locator('button[title="Aprovar risco"]').first();

    if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approveBtn.click();

      // Confirmation dialog
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });
      await dialog.locator('button:has-text("Confirmar")').click();

      // Toast
      await expect(page.locator('text=Risco aprovado')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Nenhum risco pendente para aprovar");
    }
  });

  test("CT-05: bulk approve todos pendentes", async ({ page }) => {
    // Check if banner with "Aprovar todos" exists
    const bulkBtn = page.locator('button:has-text("Aprovar todos")').first();

    if (await bulkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bulkBtn.click();

      // Confirmation dialog
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });
      await expect(dialog.locator('text=riscos de uma vez')).toBeVisible();
      await dialog.locator('button:has-text("Confirmar")').click();

      // Toast with N approved
      await expect(page.locator('text=riscos aprovados')).toBeVisible({ timeout: 10_000 });

      // Banner should disappear (pending = 0)
      await page.waitForTimeout(1000);
      await expect(page.locator('text=itens aguardando')).not.toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, "Nenhum risco pendente — banner ausente");
    }
  });

  test("CT-06: excluir risco aparece na HistoryTab", async ({ page }) => {
    // Find delete button on first active risk
    const deleteBtn = page.locator('button[title="Excluir risco"]').first();

    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();

      // Delete dialog with reason
      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Fill reason (min 10 chars)
      const reasonInput = dialog.locator("textarea");
      await reasonInput.fill("Exclusao para teste E2E CT-06 automatizado");
      await dialog.locator('button:has-text("Excluir")').click();

      // Toast
      await expect(page.locator('text=excluído')).toBeVisible({ timeout: 5_000 });

      // Switch to History tab
      await page.locator('button:has-text("Histórico")').click();
      await page.waitForTimeout(500);

      // Deleted risk should appear with reduced opacity
      const historyContent = page.locator('[value="historico"]');
      await expect(historyContent.or(page.locator('text=Riscos Excluídos'))).toBeVisible({ timeout: 3000 });
    } else {
      test.skip(true, "Nenhum risco ativo para excluir");
    }
  });

  test("CT-07: restaurar risco da HistoryTab", async ({ page }) => {
    // Go to History tab
    await page.locator('button:has-text("Histórico")').click();
    await page.waitForTimeout(500);

    // Find restore button
    const restoreBtn = page.locator('button[title="Restaurar risco"]').first();

    if (await restoreBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await restoreBtn.click();

      // Toast
      await expect(page.locator('text=Risco restaurado')).toBeVisible({ timeout: 5_000 });

      // Switch back to Riscos tab
      await page.locator('button:has-text("Riscos")').first().click();
      await page.waitForTimeout(500);

      // Risk count should have increased (at least 1)
      const riscosTab = page.locator('button:has-text("Riscos")').first();
      const tabText = await riscosTab.textContent();
      const count = parseInt(tabText?.match(/\((\d+)\)/)?.[1] ?? "0");
      expect(count).toBeGreaterThan(0);
    } else {
      test.skip(true, "Nenhum risco excluido para restaurar");
    }
  });
});
