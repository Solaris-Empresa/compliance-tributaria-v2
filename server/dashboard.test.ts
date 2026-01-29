import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { createTestContext, generateTestProject, generateTestTask, generateTestRisk } from "./test-helpers";

describe("Dashboard Router", () => {
  it("should return KPIs for a project", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project KPIs",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const kpis = await caller.dashboard.getKPIs({ projectId });

    expect(kpis).toBeDefined();
    expect(kpis).toHaveProperty("totalTasks");
    expect(kpis).toHaveProperty("completedTasks");
    expect(kpis).toHaveProperty("overdueTasks");
    expect(kpis).toHaveProperty("completionRate");
    expect(kpis).toHaveProperty("totalRisks");
    expect(kpis).toHaveProperty("mitigatedRisks");
  });

  it("should return task distribution", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Distribution",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const distribution = await caller.dashboard.getTaskDistribution({ projectId });

    expect(Array.isArray(distribution)).toBe(true);
    distribution.forEach(item => {
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("count");
    });
  });

  it("should return risk distribution", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Risks",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const distribution = await caller.dashboard.getRiskDistribution({ projectId });

    expect(Array.isArray(distribution)).toBe(true);
  });

  it("should return overdue tasks", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Overdue",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const overdue = await caller.dashboard.getOverdueTasks({ projectId });

    expect(Array.isArray(overdue)).toBe(true);
  });
});
