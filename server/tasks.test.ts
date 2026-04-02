import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { createMockContext } from "./test-helpers";

describe("Tasks Router (Kanban)", () => {
  describe("tasks.list", () => {
    it("deve listar tarefas de um projeto", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.tasks.list({ projectId: 1 });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tasks.create", () => {
    it("deve criar nova tarefa com dados válidos", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.tasks.create({
        projectId: 1,
        title: "Tarefa de Teste",
        description: "Descrição da tarefa",
        status: "a_fazer",
        priority: "alta",
        estimatedHours: 8,
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe("number"); // taskId
      expect(result).toBeGreaterThan(0);
    });

    it("deve criar tarefa com valores padrão", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.tasks.create({
        projectId: 1,
        title: "Tarefa Mínima",
      });
      
      expect(result).toBeDefined();
      expect(typeof result).toBe("number");
    });
  });

  describe("tasks.updateStatus", () => {
    it("deve atualizar status de tarefa existente", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      // Criar tarefa primeiro
      const taskId = await caller.tasks.create({
        projectId: 1,
        title: "Tarefa para Atualizar",
      });
      
      // Atualizar status
      await caller.tasks.updateStatus({
        projectId: 1,
        taskId,
        status: "em_andamento",
      });
      
      // Verificar que não lançou erro
      expect(taskId).toBeGreaterThan(0);
    });
  });

  describe("tasks.update", () => {
    it("deve atualizar dados completos da tarefa", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      // Criar tarefa primeiro
      const taskId = await caller.tasks.create({
        projectId: 1,
        title: "Tarefa Original",
      });
      
      // Atualizar
      await caller.tasks.update({
        projectId: 1,
        taskId,
        title: "Tarefa Atualizada",
        description: "Nova descrição",
        priority: "critica",
        estimatedHours: 16,
      });
      
      expect(taskId).toBeGreaterThan(0);
    });
  });

  describe("tasks.delete", () => {
    it("deve deletar tarefa existente", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);
      
      // Criar tarefa primeiro
      const taskId = await caller.tasks.create({
        projectId: 1,
        title: "Tarefa para Deletar",
      });
      
      // Deletar
      await caller.tasks.delete({ projectId: 1, taskId });
      
      expect(taskId).toBeGreaterThan(0);
    });
  });
});
