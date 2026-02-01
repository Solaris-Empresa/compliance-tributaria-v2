import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Corporate Assessment Router", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@test.com", role: "equipe_solaris" },
  } as any);

  it("should get corporate assessment by project", async () => {
    const result = await caller.corporateAssessment.get({ projectId: 1 });
    expect(result).toBeDefined();
  });
});

describe("Branch Assessment Router", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@test.com", role: "equipe_solaris" },
  } as any);

  it("should list branch assessments by project", async () => {
    const result = await caller.branchAssessment.list({ projectId: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Action Plans Router", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@test.com", role: "equipe_solaris" },
  } as any);

  it("should get corporate action plan", async () => {
    const result = await caller.actionPlans.corporate.get({ projectId: 1 });
    expect(result).toBeDefined();
  });

  it("should list branch action plans", async () => {
    const result = await caller.actionPlans.branch.list({ projectId: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Tasks Router (tasksV2)", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@test.com", role: "equipe_solaris" },
  } as any);

  it("should list tasks with filters", async () => {
    const result = await caller.tasksV2.list({
      projectId: 1,
      status: "PENDING",
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // stats procedure não implementada ainda
});

// Comments Router - procedures não implementadas ainda

describe("Notifications Router (notificationsV2)", () => {
  const caller = appRouter.createCaller({
    user: { id: 1, email: "test@test.com", role: "equipe_solaris" },
  } as any);

  it("should get user notification preferences", async () => {
    const result = await caller.notificationsV2.getPreferences({});
    expect(result).toBeDefined();
  });

  it("should list user notifications", async () => {
    const result = await caller.notificationsV2.list({ unreadOnly: false });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
