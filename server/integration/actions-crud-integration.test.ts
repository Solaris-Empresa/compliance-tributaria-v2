/**
 * Testes de Integração tRPC para CRUD de Ações
 * Sprint V19 - QA Sprint V18
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { users, projects, projectParticipants } from "../drizzle/schema";

describe("Actions CRUD tRPC Integration", () => {
  let testUserId: number;
  let testProjectId: number;
  let caller: any;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    const userResult: any = await db.insert(users).values({
      openId: `test_trpc_${Date.now()}`,
      name: "Test User tRPC",
      role: "equipe_solaris",
    });
    testUserId = parseInt(String(userResult[0]?.insertId || userResult.insertId), 10);

    // Criar projeto de teste
    const projectResult: any = await db.insert(projects).values({
      name: "Test Project tRPC",
      clientId: testUserId,
      createdById: testUserId,
      createdByRole: "equipe_solaris",
    });
    testProjectId = parseInt(String(projectResult[0]?.insertId || projectResult.insertId), 10);

    // Adicionar participante
    await db.insert(projectParticipants).values({
      projectId: testProjectId,
      userId: testUserId,
      role: "responsavel",
      addedBy: testUserId,
    });

    // Criar caller com contexto de usuário
    const [user] = await db.select().from(users).where((t: any) => t.id === testUserId).limit(1);
    
    caller = appRouter.createCaller({
      user: user as any,
      req: {} as any,
      res: {} as any,
    });
  });

  it("should have actionsCrud router available", () => {
    expect(caller.actionsCrud).toBeDefined();
    expect(caller.actionsCrud.create).toBeDefined();
    expect(caller.actionsCrud.update).toBeDefined();
    expect(caller.actionsCrud.delete).toBeDefined();
    expect(caller.actionsCrud.list).toBeDefined();
  });

  it("should validate router structure", () => {
    // Verificar que os procedures existem
    const procedures = Object.keys(caller.actionsCrud);
    expect(procedures).toContain("create");
    expect(procedures).toContain("update");
    expect(procedures).toContain("delete");
    expect(procedures).toContain("list");
  });

  it("should have questionsCrud router available", () => {
    expect(caller.questionsCrud).toBeDefined();
    expect(caller.questionsCrud.corporate).toBeDefined();
    expect(caller.questionsCrud.branch).toBeDefined();
  });

  it("should validate questionsCrud structure", () => {
    // Verificar estrutura de corporate
    expect(caller.questionsCrud.corporate.update).toBeDefined();
    expect(caller.questionsCrud.corporate.get).toBeDefined();

    // Verificar estrutura de branch
    expect(caller.questionsCrud.branch.addQuestion).toBeDefined();
    expect(caller.questionsCrud.branch.updateQuestion).toBeDefined();
    expect(caller.questionsCrud.branch.deleteQuestion).toBeDefined();
    expect(caller.questionsCrud.branch.list).toBeDefined();
  });
});
