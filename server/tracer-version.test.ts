/**
 * tracer-version.test.ts — Testes unitários para Sprint v5.5.0
 *
 * Cobre:
 * 1. tracer.ts: requestId único, etapas com latência, finish/error emitem logs corretos
 * 2. build-version.ts: estrutura do retorno, campos obrigatórios, tipos corretos
 * 3. GET /api/version: endpoint retorna JSON válido com campos esperados
 *
 * Sprint v5.5.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Testes: createTrace ──────────────────────────────────────────────────────

describe("createTrace — Tracing estruturado", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar um objeto com requestId, step e finish", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op", { projectId: 1 });

    expect(trace).toHaveProperty("requestId");
    expect(trace).toHaveProperty("step");
    expect(trace).toHaveProperty("finish");
    expect(trace).toHaveProperty("error");
    expect(typeof trace.requestId).toBe("string");
    expect(trace.requestId.length).toBeGreaterThan(0);
  });

  it("requestId deve ter 8 caracteres alfanuméricos maiúsculos", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op");

    expect(trace.requestId).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("dois traces simultâneos devem ter requestIds diferentes", async () => {
    const { createTrace } = await import("./tracer");
    const t1 = createTrace("op1");
    const t2 = createTrace("op2");

    expect(t1.requestId).not.toBe(t2.requestId);
  });

  it("finish deve retornar TraceResult com campos obrigatórios", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op", { projectId: 42 });
    trace.step("step1");
    trace.step("step2", { data: "value" });
    const result = trace.finish("ok", { cnaesReturned: 3 });

    expect(result).toHaveProperty("requestId");
    expect(result).toHaveProperty("operation", "test_op");
    expect(result).toHaveProperty("status", "ok");
    expect(result).toHaveProperty("totalMs");
    expect(result).toHaveProperty("steps");
    expect(result).toHaveProperty("context");
    expect(result.steps.length).toBe(2);
    expect(result.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("error deve retornar TraceResult com status 'error' e campo error", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op");
    const result = trace.error("Algo deu errado", { detail: "test" });

    expect(result.status).toBe("error");
    expect(result.error).toBe("Algo deu errado");
    expect(result.operation).toBe("test_op");
  });

  it("error deve emitir via console.error (sempre visível)", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op");
    trace.error("Erro crítico");

    expect(console.error).toHaveBeenCalled();
    const call = (console.error as any).mock.calls[0][0];
    expect(call).toContain("Erro crítico");
    expect(call).toContain("test_op");
  });

  it("step deve registrar etapas com t (ms desde início)", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op");
    trace.step("step_a");
    await new Promise((r) => setTimeout(r, 10));
    trace.step("step_b");
    const result = trace.finish("ok");

    expect(result.steps[0].step).toBe("step_a");
    expect(result.steps[1].step).toBe("step_b");
    expect(result.steps[0].t).toBeGreaterThanOrEqual(0);
    expect(result.steps[1].t).toBeGreaterThanOrEqual(result.steps[0].t);
  });

  it("finish com status 'fallback' deve ser aceito", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("extractCnaes");
    const result = trace.finish("fallback", { cnaesReturned: 5 });

    expect(result.status).toBe("fallback");
  });

  it("finish com status 'timeout' deve ser aceito", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("extractCnaes");
    const result = trace.finish("timeout");

    expect(result.status).toBe("timeout");
  });

  it("context deve ser preservado no resultado final", async () => {
    const { createTrace } = await import("./tracer");
    const trace = createTrace("test_op", { projectId: 99, userId: "u1" });
    const result = trace.finish("ok");

    expect(result.context).toEqual({ projectId: 99, userId: "u1" });
  });

  it("deve emitir log de início via console.log", async () => {
    const { createTrace } = await import("./tracer");
    createTrace("test_op", { projectId: 1 });

    expect(console.log).toHaveBeenCalled();
    const call = (console.log as any).mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.trace).toBe("start");
    expect(parsed.operation).toBe("test_op");
    expect(parsed.requestId).toBeTruthy();
  });
});

// ─── Testes: getBuildVersionInfo ──────────────────────────────────────────────

describe("getBuildVersionInfo — Versão do build", () => {
  it("deve retornar objeto com todos os campos obrigatórios", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(info).toHaveProperty("version");
    expect(info).toHaveProperty("gitHash");
    expect(info).toHaveProperty("commitTime");
    expect(info).toHaveProperty("commitMessage");
    expect(info).toHaveProperty("serverTime");
    expect(info).toHaveProperty("env");
    expect(info).toHaveProperty("uptimeSeconds");
    expect(info).toHaveProperty("nodeVersion");
    expect(info).toHaveProperty("howToVerify");
  });

  it("version deve ser '5.5.0'", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(info.version).toBe("5.5.0");
  });

  it("gitHash deve ser uma string não-vazia", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(typeof info.gitHash).toBe("string");
    expect(info.gitHash.length).toBeGreaterThan(0);
  });

  it("serverTime deve ser um ISO timestamp válido", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(() => new Date(info.serverTime)).not.toThrow();
    expect(new Date(info.serverTime).getTime()).toBeGreaterThan(0);
  });

  it("env deve ser 'development' em ambiente de teste", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    // Em vitest, NODE_ENV pode ser 'test' ou 'development'
    expect(["development", "test"]).toContain(info.env);
  });

  it("uptimeSeconds deve ser um número não-negativo", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(typeof info.uptimeSeconds).toBe("number");
    expect(info.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("nodeVersion deve começar com 'v'", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it("howToVerify deve conter instrução de comparação de hash", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    expect(info.howToVerify).toContain("gitHash");
    expect(info.howToVerify).toContain("checkpoint");
  });

  it("gitHash em dev deve ter 7 chars (short hash do git)", async () => {
    const { getBuildVersionInfo } = await import("./build-version");
    const info = getBuildVersionInfo();

    // Em dev, getLiveGitHash() retorna 7 chars
    if (info.gitHash !== "unknown") {
      expect(info.gitHash.length).toBeGreaterThanOrEqual(7);
    }
  });
});

// ─── Testes: endpoint GET /api/version ───────────────────────────────────────

describe("GET /api/version — Endpoint de versão", () => {
  it("deve retornar JSON com campo version via curl local", async () => {
    // Teste de integração leve: verifica que o servidor responde ao endpoint
    const response = await fetch("http://localhost:3000/api/version");
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty("version");
    expect(json).toHaveProperty("gitHash");
    expect(json).toHaveProperty("env");
  });
});
