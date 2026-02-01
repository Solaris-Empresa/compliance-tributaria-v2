import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";

describe("Branches System - Complete Tests", () => {
  let testUserId: number;
  let testProjectId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Criar usuário de teste
    const userResult = await db.execute(
      `INSERT INTO users (openId, name, email, role) VALUES ('test-branches-complete', 'Test User Branches', 'branches@test.com', 'equipe_solaris')`
    );
    testUserId = Number(userResult[0].insertId);

    // Criar projeto de teste
    const projectResult = await db.execute(
      `INSERT INTO projects (name, clientId, createdById, createdByRole) VALUES ('Test Project Branches', ${testUserId}, ${testUserId}, 'equipe_solaris')`
    );
    testProjectId = Number(projectResult[0].insertId);
  });

  it("should list all active branches", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const branches = await caller.branches.list();

    expect(branches.length).toBeGreaterThan(0);
    expect(branches[0]).toHaveProperty("id");
    expect(branches[0]).toHaveProperty("name");
    expect(branches[0]).toHaveProperty("code");
    expect(branches[0].isActive).toBe(true);
  });

  it("should get branch by id", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const branches = await caller.branches.list();
    const firstBranch = branches[0];

    const branch = await caller.branches.getById({ id: firstBranch.id });

    expect(branch).toBeDefined();
    expect(branch?.id).toBe(firstBranch.id);
    expect(branch?.name).toBe(firstBranch.name);
  });

  it("should add branches to project", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const branches = await caller.branches.list();
    const branchIds = branches.slice(0, 3).map(b => b.id);

    const result = await caller.branches.addToProject({
      projectId: testProjectId,
      branchIds,
    });

    expect(result.success).toBe(true);
    expect(result.added).toBe(3);
  });

  it("should list project branches", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const projectBranches = await caller.branches.listByProject({
      projectId: testProjectId,
    });

    expect(projectBranches.length).toBe(3);
    expect(projectBranches[0]).toHaveProperty("id");
    expect(projectBranches[0]).toHaveProperty("name");
  });

  it("should remove branch from project", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const projectBranches = await caller.branches.listByProject({
      projectId: testProjectId,
    });
    const branchToRemove = projectBranches[0];

    const result = await caller.branches.removeFromProject({
      projectId: testProjectId,
      branchId: branchToRemove.id,
    });

    expect(result.success).toBe(true);

    const updatedBranches = await caller.branches.listByProject({
      projectId: testProjectId,
    });

    expect(updatedBranches.length).toBe(2);
  });

  it("should prevent duplicate branches in project", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    const branches = await caller.branches.list();
    const branchId = branches[0].id;

    // Adicionar primeira vez
    await caller.branches.addToProject({
      projectId: testProjectId,
      branchIds: [branchId],
    });

    // Tentar adicionar novamente
    const result = await caller.branches.addToProject({
      projectId: testProjectId,
      branchIds: [branchId],
    });

    expect(result.added).toBe(0); // Não deve adicionar duplicados
  });

  it("should validate branch exists before adding to project", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "equipe_solaris" },
    });

    await expect(
      caller.branches.addToProject({
        projectId: testProjectId,
        branchIds: [99999], // ID inexistente
      })
    ).rejects.toThrow();
  });
});
