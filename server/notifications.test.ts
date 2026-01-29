import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./test-helpers";

describe("Notifications Router", () => {
  it("should list notifications for user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const notifications = await caller.notifications.list({});

    expect(Array.isArray(notifications)).toBe(true);
  });

  it("should create notification (as equipe_solaris)", async () => {
    const ctx = createTestContext({ role: "equipe_solaris" });
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Notification",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const result = await caller.notifications.create({
      projectId,
      recipientId: ctx.user.id,
      type: "lembrete",
      title: "Test Notification",
      message: "This is a test notification",
    });

    expect(result).toHaveProperty("notificationId");
    expect(typeof result.notificationId).toBe("number");
  });

  it("should mark notification as read", async () => {
    const ctx = createTestContext({ role: "equipe_solaris" });
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Read",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const { notificationId } = await caller.notifications.create({
      projectId,
      recipientId: ctx.user.id,
      type: "lembrete",
      title: "Test Read",
      message: "Mark as read test",
    });

    const result = await caller.notifications.markAsRead({ notificationId });

    expect(result).toEqual({ success: true });
  });

  it("should filter notifications by projectId", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const { projectId } = await caller.projects.create({
      name: "Test Project Filter",
      clientId: ctx.user.id,
      actionPlanPeriod: 12,
    });

    const notifications = await caller.notifications.list({ projectId });

    expect(Array.isArray(notifications)).toBe(true);
  });
});
