/**
 * Testes unitários — endpoint retrocesso.check (Issue #54)
 *
 * Verifica o comportamento do endpoint tRPC `retrocesso.check`:
 * - Retorna requiresCleanup=false para avanços
 * - Retorna requiresCleanup=true para retrocessos com dados
 * - Retorna lista correta de colunas afetadas
 * - Retorna mensagem de aviso descritiva
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getProjectById: vi.fn(),
  isUserInProject: vi.fn(),
}));

vi.mock("./diagnostic-source", () => ({
  getDiagnosticSource: vi.fn(),
}));

import * as db from "./db";
import { getDiagnosticSource } from "./diagnostic-source";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mockUser = {
  id: 1,
  openId: "user-123",
  name: "Consultor Teste",
  email: "consultor@test.com",
  role: "admin" as const,
};

const mockCtx = { user: mockUser, req: {} as any, res: {} as any };

const mockProject = {
  id: 42,
  name: "Projeto Reforma Tributária",
  status: "plano_acao",
  currentStep: 5,
};

// ─── Testes ───────────────────────────────────────────────────────────────────
describe("retrocesso.check — endpoint tRPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProjectById).mockResolvedValue(mockProject as any);
    vi.mocked(getDiagnosticSource).mockResolvedValue({
      flowVersion: "v3",
      questionnaireAnswersV3: [],
      briefingContentV3: "# Briefing",
      riskMatricesDataV3: {},
      actionPlansDataV3: {},
    } as any);
  });

  it("retrocesso de etapa 5 para etapa 2 — requer limpeza (V3)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 5,
      toStep: 2,
    });

    expect(result.requiresCleanup).toBe(true);
    expect(result.affectedColumns.length).toBeGreaterThan(0);
    expect(result.warningMessage).toContain("Ao retroceder");
    expect(result.flowVersion).toBe("v3");
  });

  it("retrocesso de etapa 3 para etapa 1 — requer limpeza (V3)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 3,
      toStep: 1,
    });

    expect(result.requiresCleanup).toBe(true);
    expect(result.affectedColumns).toContain("briefingContent");
  });

  it("avanço de etapa 2 para etapa 3 — não requer limpeza", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 2,
      toStep: 3,
    });

    expect(result.requiresCleanup).toBe(false);
    expect(result.affectedColumns).toHaveLength(0);
    expect(result.warningMessage).toBe("");
  });

  it("mesma etapa — não requer limpeza", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 3,
      toStep: 3,
    });

    expect(result.requiresCleanup).toBe(false);
    expect(result.affectedColumns).toHaveLength(0);
  });

  it("projeto não encontrado — lança NOT_FOUND", async () => {
    vi.mocked(db.getProjectById).mockResolvedValue(null);
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const { TRPCError } = await import("@trpc/server");

    await expect(
      caller.retrocesso.check({ projectId: 999, fromStep: 5, toStep: 2 })
    ).rejects.toThrow(TRPCError);
  });

  it("projeto V1 — retrocesso de etapa 9 para etapa 5 inclui briefingContent", async () => {
    vi.mocked(getDiagnosticSource).mockResolvedValue({
      flowVersion: "v1",
      questionnaireAnswersV3: null,
      briefingContentV3: null,
      riskMatricesDataV3: null,
      actionPlansDataV3: null,
    } as any);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 9,
      toStep: 5,
    });

    expect(result.requiresCleanup).toBe(true);
    expect(result.affectedColumns).toContain("briefingContent");
    expect(result.affectedColumns).toContain("riskMatricesData");
  });

  it("projeto sem dados (flowVersion=none) — não requer limpeza", async () => {
    vi.mocked(getDiagnosticSource).mockResolvedValue({
      flowVersion: "none",
      questionnaireAnswersV3: null,
      briefingContentV3: null,
      riskMatricesDataV3: null,
      actionPlansDataV3: null,
    } as any);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(mockCtx);
    const result = await caller.retrocesso.check({
      projectId: 42,
      fromStep: 5,
      toStep: 1,
    });

    expect(result.requiresCleanup).toBe(false);
    expect(result.affectedColumns).toHaveLength(0);
  });
});
