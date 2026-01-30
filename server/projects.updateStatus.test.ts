import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./test-helpers";
import * as db from "./db";

describe("projects.updateStatus", () => {
  let projectId: number;
  let equipeUserId: number;
  let advogadoUserId: number;
  let clienteUserId: number;

  beforeEach(async () => {
    // Criar IDs de usuários de teste
    equipeUserId = Math.floor(Math.random() * 1000000) + 1;
    advogadoUserId = Math.floor(Math.random() * 1000000) + 1;
    clienteUserId = Math.floor(Math.random() * 1000000) + 1;

    // Criar projeto de teste
    projectId = await db.createProject({
      name: "Projeto Teste Update Status",
      clientId: clienteUserId,
      status: "rascunho",
      createdById: equipeUserId,
      createdByRole: "equipe_solaris",
      notificationFrequency: "semanal",
    });
  });

  it("should allow equipe_solaris to update project status", async () => {
    const ctx = createTestContext({ userId: equipeUserId, role: "equipe_solaris" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.updateStatus({
      projectId,
      status: "em_andamento",
    });

    expect(result).toEqual({ success: true });

    // Verificar se o status foi atualizado
    const project = await db.getProjectById(projectId);
    expect(project?.status).toBe("em_andamento");
  });

  it("should allow cliente to update their own project status", async () => {
    const ctx = createTestContext({ userId: clienteUserId, role: "cliente" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.updateStatus({
      projectId,
      status: "em_andamento",
    });

    expect(result).toEqual({ success: true });

    // Verificar se o status foi atualizado
    const project = await db.getProjectById(projectId);
    expect(project?.status).toBe("em_andamento");
  });

  it("should deny cliente not in project from updating status", async () => {
    const otherClienteId = Math.floor(Math.random() * 1000000) + 1;
    const ctx = createTestContext({ userId: otherClienteId, role: "cliente" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.updateStatus({
        projectId,
        status: "em_andamento",
      })
    ).rejects.toThrow("Access denied");
  });

  it("should allow advogado_senior to update project status", async () => {
    const ctx = createTestContext({ userId: advogadoUserId, role: "advogado_senior" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.updateStatus({
      projectId,
      status: "em_andamento",
    });

    expect(result).toEqual({ success: true });

    // Verificar se o status foi atualizado
    const project = await db.getProjectById(projectId);
    expect(project?.status).toBe("em_andamento");
  });

  it("should deny update for non-existent project", async () => {
    const ctx = createTestContext({ userId: equipeUserId, role: "equipe_solaris" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.updateStatus({
        projectId: 999999,
        status: "em_andamento",
      })
    ).rejects.toThrow("Project not found");
  });

  it("should update status to all valid enum values", async () => {
    const ctx = createTestContext({ userId: equipeUserId, role: "equipe_solaris" });
    const caller = appRouter.createCaller(ctx);

    const statuses: Array<"rascunho" | "em_andamento" | "concluido" | "arquivado"> = [
      "rascunho",
      "em_andamento",
      "concluido",
      "arquivado",
    ];

    for (const status of statuses) {
      await caller.projects.updateStatus({ projectId, status });
      const project = await db.getProjectById(projectId);
      expect(project?.status).toBe(status);
    }
  });
});
