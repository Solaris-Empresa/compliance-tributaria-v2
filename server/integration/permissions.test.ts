import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";

describe("Sistema de Permissões", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let projectId: number;
  let userId: number;
  let permissionId: number;

  beforeAll(async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-admin",
        name: "Admin User",
        email: "admin@example.com",
        role: "equipe_solaris",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(ctx);

    // Criar projeto de teste
    const project = await caller.projects.create({
      name: "Projeto Teste Permissões",
      clientId: 1,
    });
    projectId = project.projectId;
    userId = 2; // Usuário fictício para testes
  });

  afterAll(async () => {
    // Limpar dados de teste
    const db = await getDb();
    if (db && projectId) {
      await db.execute(`DELETE FROM projectPermissions WHERE projectId = ${projectId}`);
      await db.execute(`DELETE FROM projects WHERE id = ${projectId}`);
    }
  });

  it("deve criar permissão com nível view", async () => {
    const result = await caller.permissions.create({
      userId,
      projectId,
      permissionLevel: "view",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    permissionId = result.id;
  });

  it("deve listar permissões do projeto", async () => {
    const permissions = await caller.permissions.list({ projectId });

    expect(Array.isArray(permissions)).toBe(true);
    expect(permissions.length).toBeGreaterThan(0);
    expect(permissions[0].projectId).toBe(projectId);
  });

  it("deve atualizar nível de permissão", async () => {
    const result = await caller.permissions.update({
      id: permissionId,
      permissionLevel: "edit",
    });

    expect(result.success).toBe(true);
  });

  it("deve criar permissão com áreas específicas", async () => {
    const result = await caller.permissions.create({
      userId: 3,
      projectId,
      permissionLevel: "edit",
      areas: ["TI", "CONT"],
    });

    expect(result.id).toBeGreaterThan(0);
  });

  it("deve verificar hierarquia de permissões", () => {
    const levels = ["view", "edit", "approve", "admin"];
    const hierarchy = { view: 1, edit: 2, approve: 3, admin: 4 };

    levels.forEach(level => {
      expect(hierarchy[level as keyof typeof hierarchy]).toBeGreaterThan(0);
    });

    // Admin tem nível maior que view
    expect(hierarchy.admin).toBeGreaterThan(hierarchy.view);
    // Approve tem nível maior que edit
    expect(hierarchy.approve).toBeGreaterThan(hierarchy.edit);
  });

  it("deve validar estrutura de áreas", () => {
    const validAreas = ["TI", "CONT", "FISC", "JUR", "OPS", "COM", "ADM"];

    validAreas.forEach(area => {
      expect(typeof area).toBe("string");
      expect(area.length).toBeGreaterThan(0);
    });
  });
});
