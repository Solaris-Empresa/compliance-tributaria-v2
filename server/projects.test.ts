import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createMockContext, generateFakeClient, generateFakeProject } from "./test-helpers";

describe("Projects Router", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testClientId: number;

  beforeEach(async () => {
    mockContext = createMockContext(1, "equipe_solaris");
    caller = appRouter.createCaller(mockContext as any);
    
    const fakeClient = generateFakeClient();
    const clientResult = await caller.users.createClient(fakeClient);
    testClientId = clientResult.userId;
  });

  describe("projects.create", () => {
    it("should create project and NOT return NaN (Bug #4 regression)", async () => {
      const fakeProject = generateFakeProject(testClientId);
      const result = await caller.projects.create(fakeProject);
      
      expect(result.projectId).not.toBeNaN();
      expect(Number.isInteger(result.projectId)).toBe(true);
      expect(result.projectId).toBeGreaterThan(0);
    });
  });

  describe("projects.getById", () => {
    it("should retrieve created project", async () => {
      const fakeProject = generateFakeProject(testClientId);
      const createResult = await caller.projects.create(fakeProject);
      
      const result = await caller.projects.getById({ id: createResult.projectId });
      expect(result.id).toBe(createResult.projectId);
      expect(result.name).toBe(fakeProject.name);
    });
  });

  describe("projects.list", () => {
    it("should list projects", async () => {
      const result = await caller.projects.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
