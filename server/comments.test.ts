import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { createMockContext } from "./test-helpers";
import { getDb } from "./db";
import { projects, users, actions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let testProjectId: number;
let testUserId: number;
let testTaskId: number;

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB connection failed");

  const [user] = await db.insert(users).values({
    openId: `comments-test-user-${Date.now()}`,
    name: "Comments Test User",
    email: `comments-test-${Date.now()}@test.com`,
    role: "equipe_solaris",
  }).$returningId();
  testUserId = user.id;

  const [project] = await db.insert(projects).values({
    name: `Comments Test Project ${Date.now()}`,
    clientId: testUserId,
    createdById: testUserId,
    createdByRole: "equipe_solaris",
    status: "rascunho",
  }).$returningId();
  testProjectId = project.id;

  const [task] = await db.insert(actions).values({
    projectId: testProjectId,
    title: "Comments Test Task",
    category: "corporate",
    responsibleArea: "ADM",
    taskType: "COMPLIANCE",
    status: "SUGGESTED",
    priority: "media",
    ownerId: testUserId,
    startDate: new Date(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdBy: testUserId,
  }).$returningId();
  testTaskId = task.id;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (testTaskId) await db.delete(actions).where(eq(actions.id, testTaskId));
  if (testProjectId) await db.delete(projects).where(eq(projects.id, testProjectId));
  if (testUserId) await db.delete(users).where(eq(users.id, testUserId));
});

describe("Comments Router", () => {
  it("should create a comment", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.comments.create({
      taskId: testTaskId,
      comment: "Test comment",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list comments for a task", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const comments = await caller.comments.list({ taskId: testTaskId });
    expect(Array.isArray(comments)).toBe(true);
  });

  it("should delete a comment", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // Criar comentário primeiro
    const created = await caller.comments.create({
      taskId: testTaskId,
      comment: "Comment to delete",
    });

    // Deletar
    const result = await caller.comments.delete({ id: created.id });
    expect(result).toEqual({ success: true });
  });
});
