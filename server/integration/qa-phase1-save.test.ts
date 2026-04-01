import { describe, it, expect, beforeAll } from "vitest";
import { createCaller } from "../routers";
import { getDb } from "../db";

describe("QA: Assessment Phase 1 - Save Flow", () => {
  const testUser = {
    id: 99999,
    openId: "test-qa-phase1-" + Date.now(),
    name: "QA Test User",
    email: "qa@test.com",
    role: "equipe_solaris" as const,
  };

  let projectId: number;

  beforeAll(async () => {
    // Criar projeto de teste
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const result = await database.execute(
      `INSERT INTO projects (name, clientId, createdById, status, planPeriodMonths) 
       VALUES (?, ?, ?, ?, ?)`,
      ["QA Test Project - Phase 1", 1, testUser.id, "rascunho", 12]
    );
    projectId = Number(result.insertId);
  });

  it("deve salvar Fase 1 sem erros de campos obrigatórios", async () => {
    const caller = createCaller({ user: testUser });

    const result = await caller.assessmentPhase1.save({
      projectId,
      taxRegime: "lucro_real",
      companySize: "grande",
      annualRevenue: "500000000",
      businessSector: "servicos",
      mainActivity: "comercio e serviço",
      employeeCount: 500,
      hasAccountingDept: "terceirizado",
      currentERPSystem: "sap",
      mainChallenges: "fazer a nota fiscal",
      complianceGoals: "agender a lc 214",
    });

    expect(result.success).toBe(true);
  });

  it("deve recuperar Fase 1 salva corretamente", async () => {
    const caller = createCaller({ user: testUser });

    const phase1 = await caller.assessmentPhase1.get({ projectId });

    expect(phase1).toBeDefined();
    expect(phase1?.taxRegime).toBe("lucro_real");
    expect(phase1?.companySize).toBe("grande");
    expect(phase1?.mainActivity).toBe("comercio e serviço");
  });
});
