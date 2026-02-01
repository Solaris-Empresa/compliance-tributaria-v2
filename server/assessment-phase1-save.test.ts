import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { assessmentPhase1, projects } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Assessment Phase 1 - Save Functionality", () => {
  let testProjectId: number;

  beforeAll(async () => {
    // Criar projeto de teste
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [testProject] = await db
      .insert(projects)
      .values({
        name: "Test Project - Phase1 Save",
        clientId: 1, // ID do cliente de teste
        status: "assessment_fase1",
        createdById: 1, // ID do usuário criador
      })
      .$returningId();
    testProjectId = testProject.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (!db) return;
    await db.delete(assessmentPhase1).where(eq(assessmentPhase1.projectId, testProjectId));
    await db.delete(projects).where(eq(projects.id, testProjectId));
  });

  it("deve salvar Fase 1 SEM campos completed* (usando NULL como padrão)", async () => {
    // Dados de entrada (SEM campos completed*)
    const phase1Data = {
      projectId: testProjectId,
      taxRegime: "lucro_presumido" as const,
      companySize: "media" as const,
      annualRevenue: "5000000",
      businessSector: "construcao",
      mainActivity: "Construção Civil",
      employeeCount: 50,
      hasAccountingDept: "sim",
      currentERPSystem: "SAP",
      mainChallenges: "Adaptação à reforma tributária",
      complianceGoals: "Conformidade total até 2027",
    };

    // Executar INSERT sem campos completed*
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db
      .insert(assessmentPhase1)
      .values(phase1Data)
      .$returningId();

    expect(result.id).toBeGreaterThan(0);

    // Verificar que registro foi criado com campos completed* como NULL
    const [saved] = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.id, result.id));

    expect(saved).toBeDefined();
    expect(saved.projectId).toBe(testProjectId);
    expect(saved.taxRegime).toBe("lucro_presumido");
    expect(saved.completedAt).toBeNull();
    expect(saved.completedBy).toBeNull();
    expect(saved.completedByRole).toBeNull();
  });

  it("deve permitir UPDATE para adicionar campos completed* posteriormente", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar registro existente
    const [existing] = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.projectId, testProjectId));

    expect(existing).toBeDefined();

    // Atualizar com campos completed*
    const now = new Date();
    await db
      .update(assessmentPhase1)
      .set({
        completedAt: now,
        completedBy: 1,
        completedByRole: "advogado_senior",
      })
      .where(eq(assessmentPhase1.id, existing.id));

    // Verificar atualização
    const [updated] = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.id, existing.id));

    expect(updated.completedAt).not.toBeNull();
    expect(updated.completedBy).toBe(1);
    expect(updated.completedByRole).toBe("advogado_senior");
  });

  it("deve aceitar valores explícitos NULL para campos completed*", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar registro existente
    const [existing] = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.projectId, testProjectId));

    expect(existing).toBeDefined();

    // Atualizar com NULL explícito (resetar campos completed*)
    await db
      .update(assessmentPhase1)
      .set({
        completedAt: null,
        completedBy: null,
        completedByRole: null,
      })
      .where(eq(assessmentPhase1.id, existing.id));

    // Verificar que campos foram resetados para NULL
    const [updated] = await db
      .select()
      .from(assessmentPhase1)
      .where(eq(assessmentPhase1.id, existing.id));

    expect(updated.completedAt).toBeNull();
    expect(updated.completedBy).toBeNull();
    expect(updated.completedByRole).toBeNull();
  });
});
