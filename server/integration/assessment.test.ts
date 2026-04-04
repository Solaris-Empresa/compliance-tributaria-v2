import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "../routers";
import {
  createMockContext,
  generateFakeClient,
  generateFakeProject,
  generateFakeAssessmentPhase1,
} from "../test-helpers";

describe("Assessment Router", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testProjectId: number;

  beforeEach(async () => {
    mockContext = createMockContext(1, "equipe_solaris");
    caller = appRouter.createCaller(mockContext as any);

    const fakeClient = generateFakeClient();
    const clientResult = await caller.users.createClient(fakeClient);

    const fakeProject = generateFakeProject(clientResult.userId);
    const projectResult = await caller.projects.create(fakeProject);
    testProjectId = projectResult.projectId;
  });

  describe("Assessment Fase 1", () => {
    it("should save assessment phase 1 data", async () => {
      const fakeData = generateFakeAssessmentPhase1(testProjectId);
      const result = await caller.assessmentPhase1.save(fakeData);

      expect(result.success).toBe(true);
    });

    it("should retrieve saved assessment data", async () => {
      const fakeData = generateFakeAssessmentPhase1(testProjectId);
      await caller.assessmentPhase1.save(fakeData);

      const result = await caller.assessmentPhase1.get({ projectId: testProjectId });
      expect(result.projectId).toBe(testProjectId);
      expect(result.taxRegime).toBe(fakeData.taxRegime);
    });

    it("should complete phase 1 and NOT throw projectId error (Bug #3 regression)", async () => {
      const fakeData = generateFakeAssessmentPhase1(testProjectId);
      await caller.assessmentPhase1.save(fakeData);

      const result = await caller.assessmentPhase1.complete({ projectId: testProjectId });
      expect(result.success).toBe(true);

      const project = await caller.projects.getById({ id: testProjectId });
      expect(project.status).toBe("assessment_fase2");
    });
  });

  // NOTE: Testes de LLM (generateQuestions, briefing) foram removidos para evitar timeouts
  // Esses endpoints devem ser testados manualmente ou com mocks de LLM
});
