import { describe, it, expect } from "vitest";
import { createCaller } from "../_core/trpc";

describe("Comments Router", () => {
  it("should create a comment", async () => {
    const caller = await createCaller({
      user: { id: 1, name: "Test User", email: "test@example.com", role: "user" },
    });

    const result = await caller.comments.create({
      taskId: 1,
      comment: "Test comment",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list comments for a task", async () => {
    const caller = await createCaller({
      user: { id: 1, name: "Test User", email: "test@example.com", role: "user" },
    });

    const comments = await caller.comments.list({ taskId: 1 });

    expect(Array.isArray(comments)).toBe(true);
  });

  it("should delete a comment", async () => {
    const caller = await createCaller({
      user: { id: 1, name: "Test User", email: "test@example.com", role: "user" },
    });

    // Criar comentário primeiro
    const created = await caller.comments.create({
      taskId: 1,
      comment: "Comment to delete",
    });

    // Deletar
    const result = await caller.comments.delete({ id: created.id });

    expect(result).toEqual({ success: true });
  });
});
