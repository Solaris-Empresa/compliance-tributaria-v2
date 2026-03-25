import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createMockContext } from "./test-helpers";
import { getDb } from "./db";
import { projects, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let testProjectId: number;
let testUserId: number;

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  // Criar usuário de teste
  const [user] = await db.insert(users).values({
    openId: `tasks-test-user-${Date.now()}`,
    name: "Tasks Test User",
    email: `tasks-test-${Date.now()}@test.com`,
    role: "equipe_solaris",
  }).$returningId();
  testUserId = user.id;

  // Criar projeto de teste
  const [project] = await db.insert(projects).values({
    name: `Tasks Test Project ${Date.now()}`,
    clientId: testUserId,
    createdById: testUserId,
    createdByRole: "equipe_solaris",
    status: "rascunho",
  }).$returningId();
  testProjectId = project.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (testProjectId) await db.delete(projects).where(eq(projects.id, testProjectId));
  if (testUserId) await db.delete(users).where(eq(users.id, testUserId));
});

describe("Tasks Router (Kanban)", () => {
  describe("tasks.list", () => {
    it("deve listar tarefas de um projeto", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.tasks.list({ projectId: testProjectId });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tasks.create", () => {
    it("deve criar nova tarefa com dados válidos", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.tasks.create({
        projectId: testProjectId,
        title: "Tarefa de Teste",
        description: "Descrição da tarefa",
        status: "SUGGESTED",
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
        projectId: testProjectId,
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
        projectId: testProjectId,
        title: "Tarefa para Atualizar",
      });

      // Atualizar status
      await caller.tasks.updateStatus({
        projectId: testProjectId,
        taskId,
        status: "IN_PROGRESS",
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
        projectId: testProjectId,
        title: "Tarefa Original",
      });

      // Atualizar
      await caller.tasks.update({
        projectId: testProjectId,
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
        projectId: testProjectId,
        title: "Tarefa para Deletar",
      });

      // Deletar
      await caller.tasks.delete({ projectId: testProjectId, taskId });

      expect(taskId).toBeGreaterThan(0);
    });
  });
});
