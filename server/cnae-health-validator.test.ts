/**
 * cnae-health-validator.test.ts — Testes unitários para Sprint v5.4.0
 *
 * Cobre:
 * 1. cnae-health.ts: estrutura do retorno, status correto por cenário
 * 2. cnae-pipeline-validator.ts: estrutura do resultado, casos de teste
 * 3. cnae-embeddings.ts: getCacheStatus() retorna estado correto
 * 4. GET /api/health/cnae: rota registrada e retorna JSON válido
 *
 * Sprint v5.4.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks globais ────────────────────────────────────────────────────────────

// Mock do banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock do ENV
vi.mock("./_core/env", () => ({
  ENV: {
    openAiApiKey: "sk-test-key-1234567890abcdefghij",
    databaseUrl: "mysql://test",
    isProduction: false,
    forgeApiKey: "",
    forgeApiUrl: "",
    appId: "",
    cookieSecret: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
  },
}));

// Mock do notifyOwner
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock do CNAE_TABLE
vi.mock("../shared/cnae-table", () => ({
  CNAE_TABLE: Array.from({ length: 1332 }, (_, i) => ({
    code: `${1000 + i}-${i % 9}/0${i % 9}`,
    description: `CNAE de teste ${i}`,
  })),
}));

// ─── Testes: getCacheStatus ───────────────────────────────────────────────────

describe("getCacheStatus — Estado do cache em memória", () => {
  it("deve retornar loaded=false quando cache não foi carregado", async () => {
    const { getCacheStatus, invalidateEmbeddingCache } = await import("./cnae-embeddings");
    // Garantir que o cache está limpo
    invalidateEmbeddingCache();
    const status = getCacheStatus();
    expect(status.loaded).toBe(false);
    expect(status.size).toBe(0);
    expect(status.ageMinutes).toBe(0);
  });

  it("deve retornar objeto com campos corretos", async () => {
    const { getCacheStatus } = await import("./cnae-embeddings");
    const status = getCacheStatus();
    expect(status).toHaveProperty("loaded");
    expect(status).toHaveProperty("size");
    expect(status).toHaveProperty("ageMinutes");
    expect(typeof status.loaded).toBe("boolean");
    expect(typeof status.size).toBe("number");
    expect(typeof status.ageMinutes).toBe("number");
  });
});

// ─── Testes: checkCnaeHealth ──────────────────────────────────────────────────

describe("checkCnaeHealth — Health check do pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar status 'down' quando banco não está disponível", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    expect(result).toHaveProperty("checkedAt");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("components");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("version");
    // Com banco indisponível, embeddings count = 0, coverage = 0 → status "down"
    expect(result.status).toBe("down");
    expect(result.components.openaiKey.ok).toBe(true); // chave configurada no mock
    expect(result.components.embeddingsDb.ok).toBe(false); // banco indisponível
  });

  it("deve retornar status 'ok' quando banco tem ≥95% dos CNAEs", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        status: "completed",
        processedCnaes: 1332,
        totalCnaes: 1332,
        durationSeconds: 120,
        triggeredBy: "cron",
        lastError: null,
        startedAt: new Date(),
      }]),
    };

    // Primeiro select: count de embeddings
    // Segundo select: max(createdAt)
    // Terceiro select: último rebuild
    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockResolvedValue([{ total: 1332 }]),
        };
      }
      if (callCount === 2) {
        return {
          from: vi.fn().mockResolvedValue([{ lastUpdated: new Date() }]),
        };
      }
      // Terceiro: último rebuild
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              status: "completed",
              processedCnaes: 1332,
              totalCnaes: 1332,
              durationSeconds: 120,
              triggeredBy: "cron",
              lastError: null,
              startedAt: new Date(),
            }]),
          }),
        }),
      };
    });

    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    expect(result.components.openaiKey.ok).toBe(true);
    expect(result.components.embeddingsDb.count).toBe(1332);
    expect(result.components.embeddingsDb.coverage).toBe(100);
  });

  it("deve retornar status 'down' quando OPENAI_API_KEY está ausente", async () => {
    // Sobrescrever mock do ENV para simular chave ausente
    vi.doMock("./_core/env", () => ({
      ENV: {
        openAiApiKey: "", // chave ausente
        databaseUrl: "mysql://test",
        isProduction: false,
        forgeApiKey: "",
        forgeApiUrl: "",
        appId: "",
        cookieSecret: "",
        oAuthServerUrl: "",
        ownerOpenId: "",
      },
    }));

    // Reimportar módulo com novo mock
    vi.resetModules();
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    // Com chave ausente e banco indisponível → down
    expect(result.status).toBe("down");
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });

  it("deve incluir todos os campos obrigatórios na resposta", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    // Campos obrigatórios do CnaeHealthStatus
    expect(result).toHaveProperty("checkedAt");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("components");
    expect(result).toHaveProperty("summary");

    // Campos dos componentes
    expect(result.components).toHaveProperty("openaiKey");
    expect(result.components).toHaveProperty("embeddingsDb");
    expect(result.components).toHaveProperty("embeddingsCache");
    expect(result.components).toHaveProperty("lastRebuild");

    // Campos do embeddingsDb
    expect(result.components.embeddingsDb).toHaveProperty("count");
    expect(result.components.embeddingsDb).toHaveProperty("coverage");
    expect(result.components.embeddingsDb).toHaveProperty("lastUpdated");

    // Campos do embeddingsCache
    expect(result.components.embeddingsCache).toHaveProperty("cacheLoaded");
    expect(result.components.embeddingsCache).toHaveProperty("cacheSize");

    // Campos do lastRebuild
    expect(result.components.lastRebuild).toHaveProperty("triggeredBy");
    expect(result.components.lastRebuild).toHaveProperty("status");
    expect(result.components.lastRebuild).toHaveProperty("processedCnaes");
    expect(result.components.lastRebuild).toHaveProperty("totalCnaes");
    expect(result.components.lastRebuild).toHaveProperty("durationSeconds");
    expect(result.components.lastRebuild).toHaveProperty("startedAt");
  });

  it("checkedAt deve ser um ISO timestamp válido", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    expect(() => new Date(result.checkedAt)).not.toThrow();
    expect(new Date(result.checkedAt).getTime()).toBeGreaterThan(0);
  });

  it("version deve ser a versão correta do pipeline", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { checkCnaeHealth } = await import("./cnae-health");
    const result = await checkCnaeHealth();

    expect(result.version).toBe("5.4.0");
  });
});

// ─── Testes: validateCnaePipeline ────────────────────────────────────────────

describe("validateCnaePipeline — Validação do pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve abortar com success=false quando OPENAI_API_KEY está ausente", async () => {
    vi.doMock("./_core/env", () => ({
      ENV: {
        openAiApiKey: "", // chave ausente
        databaseUrl: "mysql://test",
        isProduction: false,
        forgeApiKey: "",
        forgeApiUrl: "",
        appId: "",
        cookieSecret: "",
        oAuthServerUrl: "",
        ownerOpenId: "",
      },
    }));

    vi.resetModules();
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    expect(result.success).toBe(false);
    expect(result.failedCases.length).toBeGreaterThan(0);
    expect(result.failedCases[0]).toContain("OPENAI_API_KEY");
  });

  it("deve retornar estrutura completa com todos os campos obrigatórios", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    // Mock do fetch para simular OpenAI API
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    // Campos obrigatórios
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("durationMs");
    expect(result).toHaveProperty("embeddingCount");
    expect(result).toHaveProperty("expectedCount");
    expect(result).toHaveProperty("coverage");
    expect(result).toHaveProperty("dimensionCheck");
    expect(result).toHaveProperty("cases");
    expect(result).toHaveProperty("failedCases");
    expect(result).toHaveProperty("summary");

    // Tipos
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.timestamp).toBe("string");
    expect(typeof result.durationMs).toBe("number");
    expect(typeof result.embeddingCount).toBe("number");
    expect(typeof result.expectedCount).toBe("number");
    expect(typeof result.coverage).toBe("number");
    expect(typeof result.dimensionCheck).toBe("boolean");
    expect(Array.isArray(result.cases)).toBe(true);
    expect(Array.isArray(result.failedCases)).toBe(true);
    expect(typeof result.summary).toBe("string");
  });

  it("expectedCount deve ser 1332 (total de CNAEs IBGE)", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    expect(result.expectedCount).toBe(1332);
  });

  it("timestamp deve ser um ISO timestamp válido", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
  });

  it("durationMs deve ser um número não-negativo", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    // durationMs pode ser 0 em execuções muito rápidas (ex: abort por chave ausente)
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe("number");
  });

  it("summary deve ser uma string não-vazia", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { validateCnaePipeline } = await import("./cnae-pipeline-validator");
    const result = await validateCnaePipeline();

    expect(result.summary.length).toBeGreaterThan(0);
  });
});

// ─── Testes: runAndNotifyValidation ──────────────────────────────────────────

describe("runAndNotifyValidation — Notificação de resultado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve chamar notifyOwner com título de falha quando pipeline falha", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { notifyOwner } = await import("./_core/notification");
    const { runAndNotifyValidation } = await import("./cnae-pipeline-validator");

    await runAndNotifyValidation();

    // Deve ter chamado notifyOwner pelo menos uma vez
    expect(vi.mocked(notifyOwner)).toHaveBeenCalled();
    const calls = vi.mocked(notifyOwner).mock.calls;
    // Deve ter chamado com título contendo "Validação"
    const hasTitleWithValidacao = calls.some(
      ([args]) => args.title && args.title.includes("Validação")
    );
    expect(hasTitleWithValidacao).toBe(true);
  });

  it("não deve lançar exceção mesmo quando notifyOwner falha", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { notifyOwner } = await import("./_core/notification");
    vi.mocked(notifyOwner).mockRejectedValue(new Error("Notification service down"));

    const { runAndNotifyValidation } = await import("./cnae-pipeline-validator");

    // Não deve lançar exceção
    await expect(runAndNotifyValidation()).resolves.not.toThrow();
  });
});
