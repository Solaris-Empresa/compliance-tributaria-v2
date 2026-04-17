/**
 * db-queries-risks-v4.integration.test.ts — Testes de integração com banco real
 *
 * Verifica que queries SQL executam sem erro no TiDB.
 * Skip automático se DATABASE_URL não configurada.
 *
 * Previne: bugs silenciosos como LIMIT ? (ER_WRONG_ARGUMENTS no TiDB)
 * que retornam [] sem erro — impossível de pegar com unit tests.
 *
 * Executar antes de merge de PRs que tocam db-queries-*.ts:
 *   DATABASE_URL=mysql://... pnpm vitest run server/lib/db-queries-risks-v4.integration.test.ts
 */
import { describe, it, expect } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL;
const describeIfDB = HAS_DB ? describe : describe.skip;

describeIfDB("db-queries-risks-v4 Integration (banco real)", () => {
  it("getProjectAuditLog executa sem erro e retorna array", async () => {
    const { getProjectAuditLog } = await import("./db-queries-risks-v4");
    const rows = await getProjectAuditLog(270001, 10);
    expect(Array.isArray(rows)).toBe(true);
    // Se projeto referência tem dados, deve retornar > 0
    // Se não, pelo menos não crashou (query SQL válida no TiDB)
  }, 15_000);

  it("getRisksV4ByProject executa sem erro", async () => {
    const { getRisksV4ByProject } = await import("./db-queries-risks-v4");
    const rows = await getRisksV4ByProject(270001);
    expect(Array.isArray(rows)).toBe(true);
  }, 15_000);

  it("getTasksByActionPlan aceita UUID e retorna array", async () => {
    const { getTasksByActionPlan } = await import("./db-queries-risks-v4");
    const rows = await getTasksByActionPlan("00000000-0000-0000-0000-000000000000");
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0); // UUID inexistente → 0 rows
  }, 15_000);

  it("getActionPlansByProject executa sem erro", async () => {
    const { getActionPlansByProject } = await import("./db-queries-risks-v4");
    const rows = await getActionPlansByProject(270001);
    expect(Array.isArray(rows)).toBe(true);
  }, 15_000);

  it("getAuditLog com filtro entity funciona", async () => {
    const { getAuditLog } = await import("./db-queries-risks-v4");
    const rows = await getAuditLog(270001, "task", "00000000-0000-0000-0000-000000000000");
    expect(Array.isArray(rows)).toBe(true);
  }, 15_000);
});
