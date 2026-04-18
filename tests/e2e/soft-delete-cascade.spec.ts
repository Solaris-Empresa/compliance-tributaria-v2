/**
 * soft-delete-cascade.spec.ts — Suite Z-20 #717 Bateria 1
 *
 * E2E da cascata de soft delete:
 *   risk → action_plans → tasks (todos status='deleted')
 *
 * Usa E2E_DESTRUCTIVE_PROJECT_ID (projeto dedicado) — NÃO usar 930001.
 * Motivo: este teste muta dados irreversivelmente.
 *
 * Pré-condições:
 *   - DATABASE_URL configurada
 *   - E2E_DESTRUCTIVE_PROJECT_ID aponta para projeto limpo (Manus cria antes de B1)
 *   - O projeto tem pelo menos 1 risco aprovado com plano + tarefas
 */
import { test, expect } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const DESTRUCTIVE_ID = process.env.E2E_DESTRUCTIVE_PROJECT_ID;
const isDestructiveConfigured = Boolean(DESTRUCTIVE_ID);

test.describe("Soft delete cascade — risco → planos → tarefas", () => {
  test.skip(
    !isDestructiveConfigured,
    "E2E_DESTRUCTIVE_PROJECT_ID ausente — projeto destrutivo não configurado"
  );

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

  test("RiskDashboardV4 carrega com projeto destrutivo", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${DESTRUCTIVE_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toContain("Carregando...");
  });

  test("Aba Histórico acessível (para verificar deleted_reason)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/projetos/${DESTRUCTIVE_ID}/risk-dashboard-v4`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const tab = page.locator('[data-testid="history-tab"]');
    const visible = await tab.isVisible({ timeout: 10_000 }).catch(() => false);
    expect(visible).toBe(true);
  });

  // Testes de mutação efetiva são delegados a audit-risk-matrix.mjs
  // (lá podemos inspecionar audit_log directly via DB).
  // E2E visual apenas valida que a UI existe — cascata é verificada
  // via SQL no script de aferição após execução.

  // Testes pendentes (Bateria 2+) — usar test.fixme() pois
  // Playwright 1.58.x NÃO suporta test.todo() (sintaxe Vitest).
  test.fixme("deleteRisk cascata planos → status=deleted", () => {});
  test.fixme("deleteRisk cascata tasks → status=deleted", () => {});
  test.fixme("audit_log registra cascata com before_state + reason", () => {});
  test.fixme("restoreRisk restaura todos os filhos (RI-07)", () => {});
});
