import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { createMockContext, generateFakeClient } from "./test-helpers";

describe("Users Router", () => {
  let mockContext: ReturnType<typeof createMockContext>;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    mockContext = createMockContext(1, "equipe_solaris");
    caller = appRouter.createCaller(mockContext as any);
  });

  describe("users.createClient", () => {
    it("should create client and return valid userId", async () => {
      const fakeClient = generateFakeClient();
      const result = await caller.users.createClient(fakeClient);
      
      expect(result).toBeDefined();
      expect(result.userId).toBeGreaterThan(0);
      expect(Number.isInteger(result.userId)).toBe(true);
    });
  });

  describe("users.listClients", () => {
    it("should list clients", async () => {
      const result = await caller.users.listClients();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
