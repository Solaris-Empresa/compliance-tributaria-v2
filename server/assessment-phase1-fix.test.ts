import { describe, it, expect, beforeAll } from "vitest";
import { createCaller } from "./routers";
import { getDb } from "./db";
import { users, projects, assessmentPhase1 } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Assessment Phase 1 - Correção de Campos Completed*", () => {
  let testUserId: number;
  let testProjectId: number;
  let caller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    // Criar usuário de teste
    const userResult = await database
      .insert(users)
      .values({
        openId: `test-phase1-fix-${Date.now()}`,
        name: "Test User Phase1 Fix",
        role: "equipe_solaris",
      })
      .$returningId();
    testUserId = userResult[0].id;

    // Criar projeto de teste
    const projectResult = await database
      .insert(projects)
      .values({
        name: "Test Project Phase1 Fix",
        clientId: testUserId,
        createdById: testUserId,
        status: "assessment_fase1",
      })
      .$returningId();
    testProjectId = projectResult[0].id;

    // Criar caller
    caller = createCaller({
      user: {
        id: testUserId,
        openId: `test-phase1-fix-${Date.now()}`,
        name: "Test User Phase1 Fix",
        role: "equipe_solaris",
      },
    });
  });

  it("deve salvar Fase 1 SEM incluir campos completed* no INSERT", async () => {
    const result = await caller.assessmentPhase1.save({
      projectId: testProjectId,
      taxRegime: "lucro_real",
      companySize: "grande",
      annualRevenue: 50000000,
      businessSector: "servicos",
      mainActivity: "Teste de correção",
      employeeCount: 100,
      hasAccountingDept: "terceirizado",
      currentERPSystem: "sap",
      mainChallenges: "Validar correção",
      complianceGoals: "Garantir que campos completed* não causam erro",
    });

    expect(result).toEqual({ success: true });

    // Verificar que o registro foi salvo
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const saved = await database
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.projectId, testProjectId))
      .limit(1);

    expect(saved.length).toBe(1);
    expect(saved[0].projectId).toBe(testProjectId);
    expect(saved[0].taxRegime).toBe("lucro_real");
    
    // Verificar que campos completed* são NULL (não foram preenchidos)
    expect(saved[0].completedAt).toBeNull();
    expect(saved[0].completedBy).toBeNull();
    expect(saved[0].completedByRole).toBeNull();
  });

  it("deve atualizar Fase 1 existente sem erro", async () => {
    const result = await caller.assessmentPhase1.save({
      projectId: testProjectId,
      taxRegime: "lucro_presumido", // Mudando regime
      companySize: "media", // Mudando porte
      annualRevenue: 10000000,
      businessSector: "comercio",
      mainActivity: "Teste de atualização",
      employeeCount: 50,
      hasAccountingDept: "proprio",
      currentERPSystem: "totvs",
      mainChallenges: "Atualizar dados",
      complianceGoals: "Validar UPDATE",
    });

    expect(result).toEqual({ success: true });

    // Verificar que o registro foi atualizado
    const database = await getDb();
    if (!database) throw new Error("Database not available");

    const updated = await database
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.projectId, testProjectId))
      .limit(1);

    expect(updated.length).toBe(1);
    expect(updated[0].taxRegime).toBe("lucro_presumido");
    expect(updated[0].companySize).toBe("media");
  });
});
