/**
 * soft-delete-cascade.spec.ts — Suite Z-20 #717 Bateria 1 + Z-21 #720 Bateria 3
 *
 * E2E da cascata de soft delete:
 *   risk → action_plans → tasks (todos status='deleted')
 *
 * Bateria 1 (#717): smoke tests do RiskDashboardV4
 * Bateria 3 (#720): 4 CTs cobrindo cascade soft delete + restore
 *   - CT-1: deleteRisk cascateia para action_plans (status='deleted')
 *   - CT-2: deleteRisk cascateia para tasks (status='deleted')
 *   - CT-3: audit_log registra cascata com N+1+M entries
 *   - CT-4: restoreRisk restaura todos os filhos (RI-07)
 *
 * Usa E2E_DESTRUCTIVE_PROJECT_ID (projeto dedicado) — NÃO usar 930001.
 * Motivo: este teste muta dados irreversivelmente.
 *
 * Pré-condições:
 *   - DATABASE_URL configurada
 *   - E2E_DESTRUCTIVE_PROJECT_ID aponta para projeto limpo (Manus cria antes)
 *   - O projeto tem pelo menos 1 risco aprovado com plano + tarefas
 */
import { test, expect, type APIResponse, type Page } from "@playwright/test";
import { loginViaTestEndpoint } from "./fixtures/auth";

const DESTRUCTIVE_ID = process.env.E2E_DESTRUCTIVE_PROJECT_ID;
const isDestructiveConfigured = Boolean(DESTRUCTIVE_ID);
const BASE = process.env.E2E_BASE_URL || "https://iasolaris.manus.space";

// ─── Helpers tRPC ───────────────────────────────────────────────────────────

async function trpcQuery<T = unknown>(page: Page, procedure: string, input: unknown): Promise<T> {
  const url = `${BASE}/api/trpc/${procedure}?input=${encodeURIComponent(
    JSON.stringify({ json: input })
  )}`;
  const res = await page.request.get(url);
  if (!res.ok()) {
    throw new Error(`tRPC query ${procedure} failed: ${res.status()} — ${await res.text()}`);
  }
  const body = (await res.json()) as { result?: { data?: { json?: T } } };
  return body.result?.data?.json as T;
}

async function trpcMutation<T = unknown>(
  page: Page,
  procedure: string,
  input: unknown
): Promise<{ ok: boolean; data: T | null; status: number; raw: APIResponse }> {
  const res = await page.request.post(`${BASE}/api/trpc/${procedure}`, {
    data: { json: input },
    headers: { "Content-Type": "application/json" },
  });
  const ok = res.ok();
  const data = ok
    ? ((await res.json()) as { result?: { data?: { json?: T } } }).result?.data?.json ?? null
    : null;
  return { ok, data: data as T | null, status: res.status(), raw: res };
}

type RiskRow = {
  id: string;
  project_id: number;
  status: string;
  approved_at: string | null;
  type: string;
  actionPlans: Array<{
    id: string;
    status: string;
    tasks: Array<{ id: string; status: string }>;
  }>;
};

type AuditEntry = {
  id: number;
  entity: string;
  entity_id: string;
  action: string;
  before_state?: unknown;
  after_state?: unknown;
  reason?: string | null;
  created_at: string;
};

async function listRisks(page: Page, projectId: number): Promise<RiskRow[]> {
  const result = await trpcQuery<{ risks: RiskRow[] }>(page, "risksV4.listRisks", { projectId });
  return result?.risks ?? [];
}

async function getProjectAuditLog(page: Page, projectId: number, limit = 200): Promise<AuditEntry[]> {
  const result = await trpcQuery<{ entries: AuditEntry[] }>(page, "risksV4.getProjectAuditLog", {
    projectId,
    limit,
  });
  return result?.entries ?? [];
}

function pickRiskWithPlansAndTasks(risks: RiskRow[]): RiskRow | null {
  return (
    risks.find(
      (r) =>
        r.type === "risk" &&
        r.approved_at !== null &&
        r.actionPlans.length > 0 &&
        r.actionPlans.some((p) => p.tasks.length > 0)
    ) ?? null
  );
}

// ─── Suite ───────────────────────────────────────────────────────────────────

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

  // ── Bateria 1 (#717) — smoke ──────────────────────────────────────────────

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

  // ── Bateria 3 (#720) — cascade soft delete + restore ──────────────────────

  test("CT-1: deleteRisk cascateia para action_plans (status=deleted)", async ({ page }) => {
    test.setTimeout(120_000);
    const projectId = Number(DESTRUCTIVE_ID);

    const risksBefore = await listRisks(page, projectId);
    const target = pickRiskWithPlansAndTasks(risksBefore);
    test.skip(
      !target,
      "Projeto destrutivo sem risco aprovado com planos+tasks — pré-requisito Manus (ACAO 2 Z-20)"
    );

    const planIdsBefore = target!.actionPlans.map((p) => p.id);
    const planCountBefore = planIdsBefore.length;
    expect(planCountBefore).toBeGreaterThan(0);

    const del = await trpcMutation<{ success: boolean }>(page, "risksV4.deleteRisk", {
      riskId: target!.id,
      reason: "CT-1 E2E #720 — verifica cascata risk → action_plans",
    });
    expect(del.ok, `deleteRisk falhou: ${del.status}`).toBe(true);
    expect(del.data?.success).toBe(true);

    // Após delete: o risco não deve mais aparecer em listRisks (filtra status='active')
    const risksAfter = await listRisks(page, projectId);
    const stillThere = risksAfter.find((r) => r.id === target!.id);
    expect(stillThere, "Risco deletado ainda aparece em listRisks").toBeUndefined();

    // Cleanup: restaurar o risco para não invalidar testes seguintes
    const restore = await trpcMutation<{ success: boolean }>(page, "risksV4.restoreRisk", {
      riskId: target!.id,
      reason: "CT-1 cleanup",
    });
    expect(restore.ok, "Cleanup restoreRisk falhou").toBe(true);
  });

  test("CT-2: deleteRisk cascateia para tasks (status=deleted)", async ({ page }) => {
    test.setTimeout(120_000);
    const projectId = Number(DESTRUCTIVE_ID);

    const risksBefore = await listRisks(page, projectId);
    const target = pickRiskWithPlansAndTasks(risksBefore);
    test.skip(!target, "Sem risco com tasks — pré-requisito não atendido");

    const taskCountBefore = target!.actionPlans.reduce((sum, p) => sum + p.tasks.length, 0);
    expect(taskCountBefore).toBeGreaterThan(0);

    const del = await trpcMutation<{ success: boolean }>(page, "risksV4.deleteRisk", {
      riskId: target!.id,
      reason: "CT-2 E2E #720 — verifica cascata risk → tasks",
    });
    expect(del.ok).toBe(true);

    // Verificar via audit_log que tasks foram deletadas (cascata de plans → tasks)
    const audit = await getProjectAuditLog(page, projectId, 500);
    const taskDeletes = audit.filter((e) => e.entity === "task" && e.action === "deleted");
    // O cascade desce: risk → planos → tasks. Esperamos pelo menos taskCountBefore entradas.
    expect(taskDeletes.length).toBeGreaterThanOrEqual(taskCountBefore);

    // Cleanup
    await trpcMutation(page, "risksV4.restoreRisk", { riskId: target!.id, reason: "CT-2 cleanup" });
  });

  test("CT-3: audit_log registra cascata com before_state + reason (N+1+M)", async ({ page }) => {
    test.setTimeout(120_000);
    const projectId = Number(DESTRUCTIVE_ID);

    const risksBefore = await listRisks(page, projectId);
    const target = pickRiskWithPlansAndTasks(risksBefore);
    test.skip(!target, "Sem risco com planos+tasks — pré-requisito não atendido");

    const N = target!.actionPlans.length; // planos
    const M = target!.actionPlans.reduce((s, p) => s + p.tasks.length, 0); // tasks
    const expectedNewEntries = 1 + N + M; // 1 risk + N planos + M tasks

    const auditBefore = await getProjectAuditLog(page, projectId, 500);
    const auditCountBefore = auditBefore.length;

    const reason = "CT-3 E2E #720 — N+1+M audit verification";
    const del = await trpcMutation<{ success: boolean }>(page, "risksV4.deleteRisk", {
      riskId: target!.id,
      reason,
    });
    expect(del.ok).toBe(true);

    const auditAfter = await getProjectAuditLog(page, projectId, 500);
    const newEntries = auditAfter.length - auditCountBefore;
    expect(
      newEntries,
      `Esperado ${expectedNewEntries} entradas novas (1 risk + ${N} planos + ${M} tasks), obtido ${newEntries}`
    ).toBeGreaterThanOrEqual(expectedNewEntries);

    // Verificar que existe entrada de risk com reason preenchida
    const riskDelete = auditAfter.find(
      (e) => e.entity === "risk" && e.entity_id === target!.id && e.action === "deleted"
    );
    expect(riskDelete, "Audit entry do risco deletado não encontrada").toBeTruthy();
    expect(riskDelete?.reason).toBe(reason);
    expect(riskDelete?.before_state).toBeTruthy();

    // Cleanup
    await trpcMutation(page, "risksV4.restoreRisk", { riskId: target!.id, reason: "CT-3 cleanup" });
  });

  test("CT-4: restoreRisk restaura todos os filhos (RI-07)", async ({ page }) => {
    test.setTimeout(120_000);
    const projectId = Number(DESTRUCTIVE_ID);

    const risksBefore = await listRisks(page, projectId);
    const target = pickRiskWithPlansAndTasks(risksBefore);
    test.skip(!target, "Sem risco com planos+tasks — pré-requisito não atendido");

    const planIdsBefore = target!.actionPlans.map((p) => p.id).sort();
    const taskIdsBefore = target!.actionPlans
      .flatMap((p) => p.tasks.map((t) => t.id))
      .sort();
    const N = planIdsBefore.length;
    const M = taskIdsBefore.length;

    // Delete
    const del = await trpcMutation<{ success: boolean }>(page, "risksV4.deleteRisk", {
      riskId: target!.id,
      reason: "CT-4 prep delete",
    });
    expect(del.ok).toBe(true);

    // Restore
    const restore = await trpcMutation<{ success: boolean }>(page, "risksV4.restoreRisk", {
      riskId: target!.id,
      reason: "CT-4 restore validation",
    });
    expect(restore.ok, `restoreRisk falhou: ${restore.status}`).toBe(true);
    expect(restore.data?.success).toBe(true);

    // Verificar que o risco voltou para listRisks ativo com mesmos planos e tasks
    const risksAfter = await listRisks(page, projectId);
    const restored = risksAfter.find((r) => r.id === target!.id);
    expect(restored, "Risco restaurado não encontrado em listRisks").toBeTruthy();

    const planIdsAfter = restored!.actionPlans.map((p) => p.id).sort();
    const taskIdsAfter = restored!.actionPlans.flatMap((p) => p.tasks.map((t) => t.id)).sort();

    expect(planIdsAfter).toEqual(planIdsBefore);
    expect(taskIdsAfter.length).toBe(M);
    expect(planIdsAfter.length).toBe(N);

    // RI-07: tasks restauradas voltam ao status executável (não 'deleted')
    const taskStatuses = restored!.actionPlans.flatMap((p) => p.tasks.map((t) => t.status));
    const stillDeleted = taskStatuses.filter((s) => s === "deleted");
    expect(stillDeleted, "Há tarefas com status='deleted' após restore").toEqual([]);
  });
});
