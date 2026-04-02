/**
 * Testes de Integração para Router auditLogs
 * Sprint V19 - Feature 2
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("auditLogs Router - Integration Tests", () => {
  let testProjectId: number;
  let testUserId: number;

  beforeAll(() => {
    // Usar IDs de teste conhecidos
    testProjectId = 1;
    testUserId = 1;
  });

  it("should have auditLogs router registered", () => {
    expect(appRouter.auditLogs).toBeDefined();
  });

  it("should have list procedure", () => {
    expect(appRouter.auditLogs.list).toBeDefined();
  });

  it("should have get procedure", () => {
    expect(appRouter.auditLogs.get).toBeDefined();
  });

  it("should have stats procedure", () => {
    expect(appRouter.auditLogs.stats).toBeDefined();
  });
});
