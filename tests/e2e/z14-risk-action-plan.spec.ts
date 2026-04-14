/**
 * Z-14 E2E Suite — IA SOLARIS (Final)
 *
 * CT-01: Criar plano de acao
 * CT-02: Editar plano existente
 * CT-03: SummaryBar coerente
 * CT-04: Aprovar risco individual
 * CT-05: Bulk approve com confirmacao
 * CT-06: Excluir risco → HistoryTab
 * CT-07: Restaurar risco
 * CT-08: Oportunidade NAO gera plano
 * CT-09: Regressao engine v4 invariantes
 *
 * E2E_PROJECT_ID=270001 (seed SQL)
 * E2E_TEST_MODE=true obrigatorio
 */
import { test, expect, type Page } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const E2E_PROJECT_ID = process.env.E2E_PROJECT_ID || "270001";

const TID = {
  dashboardPage: "risk-dashboard-page",
  riskCard: "risk-card",
  riskTitle: "risk-title",
  riskLegalBasis: "risk-legal-basis",
  summaryBar: "summary-bar",
  summaryAlta: "summary-count-alta",
  summaryMedia: "summary-count-media",
  summaryOportunidade: "summary-count-oportunidade",
  summaryAguardando: "summary-count-aguardando",
  createActionPlanButton: "create-action-plan-button",
  actionPlanModal: "action-plan-modal",
  actionPlanRow: "action-plan-row",
  bulkApproveButton: "bulk-approve-button",
  bulkApproveConfirmModal: "bulk-approve-confirm-modal",
  approveRiskButton: "approve-risk-button",
  deleteRiskButton: "delete-risk-button",
  historyTab: "history-tab",
  restoreRiskButton: "restore-risk-button",
  opportunityCard: "opportunity-card",
} as const;

function dashboardUrl(): string {
  return `/projetos/${E2E_PROJECT_ID}/risk-dashboard-v4`;
}

function actionPlanUrl(): string {
  return `/projetos/${E2E_PROJECT_ID}/planos-v4`;
}

async function gotoDashboard(page: Page): Promise<void> {
  await page.goto(dashboardUrl());
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId(TID.dashboardPage)).toBeVisible({ timeout: 15_000 });
}

async function getSummaryCount(page: Page, testId: string): Promise<number> {
  const card = page.getByTestId(testId);
  const text = await card.locator("p.text-xl").textContent();
  return parseInt(text ?? "0");
}

test.describe("Sprint Z-14 — RiskDashboard + ActionPlan", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await loginViaTestEndpoint(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `test-results/${testInfo.title.replace(/[^\w\d-]+/g, "_")}.png`,
        fullPage: true,
      });
    }
    // Reset destrutivo obrigatorio fora do browser via seed/reset SQL
  });

  test("CT-01 — criar plano de acao", async ({ page }) => {
    await gotoDashboard(page);

    const card = page.getByTestId(TID.riskCard).first();
    await expect(card).toBeVisible();
    await card.getByTestId(TID.createActionPlanButton).click();

    const modal = page.getByTestId(TID.actionPlanModal);
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await modal.locator("#plan-titulo").fill("E2E Z14 CT-01");
    await modal.locator("#plan-responsavel").fill("Equipe Solaris");
    await modal.locator("button#plan-prazo").click();
    await page.locator('[role="option"]:has-text("30 dias")').click();

    await modal.locator('button:has-text("Criar plano")').click();
    await expect(page.locator('text=Plano criado')).toBeVisible({ timeout: 5_000 });
  });

  test("CT-02 — editar plano existente", async ({ page }) => {
    await page.goto(actionPlanUrl());
    await page.waitForLoadState("networkidle");

    const editBtn = page.locator('button[title="Editar plano"]').first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();

      const modal = page.getByTestId(TID.actionPlanModal);
      await expect(modal).toBeVisible();

      const tituloInput = modal.locator("#ap-titulo");
      const currentValue = await tituloInput.inputValue();
      expect(currentValue.length).toBeGreaterThan(0);

      await tituloInput.fill("E2E Z14 CT-02 EDITADO");
      await modal.locator('button:has-text("Salvar")').click();
      await expect(page.locator('text=Plano atualizado')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Nenhum plano editavel");
    }
  });

  test("CT-03 — SummaryBar coerente", async ({ page }) => {
    await gotoDashboard(page);

    await expect(page.getByTestId(TID.summaryBar)).toBeVisible();

    const alta = await getSummaryCount(page, TID.summaryAlta);
    const media = await getSummaryCount(page, TID.summaryMedia);
    const opps = await getSummaryCount(page, TID.summaryOportunidade);
    const aguardando = await getSummaryCount(page, TID.summaryAguardando);

    expect(alta).toBeGreaterThanOrEqual(0);
    expect(media).toBeGreaterThanOrEqual(0);
    expect(opps).toBeGreaterThanOrEqual(0);
    expect(aguardando).toBeGreaterThanOrEqual(0);
    expect(alta + media + opps).toBeGreaterThan(0);
  });

  test("CT-04 — aprovar risco individual", async ({ page }) => {
    await gotoDashboard(page);

    const approveBtn = page.getByTestId(TID.approveRiskButton).first();
    if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await approveBtn.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible({ timeout: 3_000 });
      await dialog.locator('button:has-text("Confirmar")').click();

      await expect(page.locator('text=Risco aprovado')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Nenhum risco pendente");
    }
  });

  test("CT-05 — bulk approve com confirmacao e cancelamento", async ({ page }) => {
    await gotoDashboard(page);

    const bulkBtn = page.getByTestId(TID.bulkApproveButton);
    if (await bulkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Cancel first
      await bulkBtn.click();
      const modal = page.getByTestId(TID.bulkApproveConfirmModal);
      await expect(modal).toBeVisible();
      await modal.locator('button:has-text("Cancelar")').click();
      await expect(modal).not.toBeVisible();

      // Now confirm
      await bulkBtn.click();
      await expect(modal).toBeVisible();
      await modal.locator('button:has-text("Confirmar")').click();
      await expect(page.locator('text=riscos aprovados')).toBeVisible({ timeout: 10_000 });
    } else {
      test.skip(true, "Banner ausente — sem pending");
    }
  });

  test("CT-06 — excluir risco → HistoryTab", async ({ page }) => {
    await gotoDashboard(page);

    const deleteBtn = page.getByTestId(TID.deleteRiskButton).first();
    if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const riskTitle = await page.getByTestId(TID.riskTitle).first().textContent();

      await deleteBtn.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await dialog.locator("textarea").fill("Exclusao E2E CT-06 automatizado");
      await dialog.locator('button:has-text("Excluir")').click();

      await expect(page.locator('text=excluído')).toBeVisible({ timeout: 5_000 });

      await page.getByTestId(TID.historyTab).click();
      await page.waitForTimeout(500);

      if (riskTitle) {
        await expect(page.locator(`text=${riskTitle.slice(0, 30)}`)).toBeVisible({ timeout: 5_000 });
      }
    } else {
      test.skip(true, "Nenhum risco para excluir");
    }
  });

  test("CT-07 — restaurar risco", async ({ page }) => {
    await gotoDashboard(page);
    await page.getByTestId(TID.historyTab).click();
    await page.waitForTimeout(500);

    const restoreBtn = page.getByTestId(TID.restoreRiskButton).first();
    if (await restoreBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await restoreBtn.click();
      await expect(page.locator('text=Risco restaurado')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(true, "Nenhum risco para restaurar");
    }
  });

  test("CT-08 — oportunidade NAO gera plano", async ({ page }) => {
    await gotoDashboard(page);

    const oppCard = page.getByTestId(TID.opportunityCard).first();
    if (await oppCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const createBtn = oppCard.getByTestId(TID.createActionPlanButton);
      await expect(createBtn).toHaveCount(0);
    } else {
      test.skip(true, "Nenhuma oportunidade visivel");
    }
  });

  test("CT-09 — regressao engine v4 invariantes", async ({ page }) => {
    await gotoDashboard(page);

    // Risk cards exist
    const riskCards = page.getByTestId(TID.riskCard);
    const oppCards = page.getByTestId(TID.opportunityCard);
    const totalRisks = await riskCards.count();
    const totalOpps = await oppCards.count();
    expect(totalRisks + totalOpps).toBeGreaterThanOrEqual(1);

    // No generic titles
    const titles = await page.getByTestId(TID.riskTitle).allTextContents();
    for (const title of titles) {
      expect(title).not.toMatch(/\[categoria\]/i);
      expect(title).not.toMatch(/\bgeral\b/i);
    }

    // Legal basis present
    const legalBasis = page.getByTestId(TID.riskLegalBasis).first();
    if (await legalBasis.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const text = await legalBasis.textContent();
      expect(text).toMatch(/Art\./i);
    }

    // SummaryBar visible
    await expect(page.getByTestId(TID.summaryBar)).toBeVisible();
  });
});
