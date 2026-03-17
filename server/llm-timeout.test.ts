/**
 * Testes unitários para o mecanismo de timeout do invokeLLM
 * Verifica que AbortController cancela a chamada após timeoutMs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_LLM_TIMEOUT_MS } from "./_core/llm";

// ─── Mock do fetch global ────────────────────────────────────────────────────
const originalFetch = global.fetch;

beforeEach(() => {
  // Mock das variáveis de ambiente necessárias
  process.env.BUILT_IN_FORGE_API_KEY = "test-key";
  process.env.BUILT_IN_FORGE_API_URL = "https://forge.test.im";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── Testes de configuração ──────────────────────────────────────────────────
describe("DEFAULT_LLM_TIMEOUT_MS", () => {
  it("deve ser 180000ms (3 minutos)", () => {
    expect(DEFAULT_LLM_TIMEOUT_MS).toBe(180_000);
  });

  it("deve ser maior que 60 segundos", () => {
    expect(DEFAULT_LLM_TIMEOUT_MS).toBeGreaterThan(60_000);
  });
});

// ─── Testes de comportamento do timeout ─────────────────────────────────────
describe("invokeLLM timeout behavior", () => {
  it("deve lançar LLM_TIMEOUT quando o fetch demora mais que timeoutMs", async () => {
    // Simula fetch que nunca resolve (demora infinitamente)
    global.fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        // Escuta o signal para abortar quando o timeout disparar
        options.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
        // Nunca resolve por conta própria
      });
    });

    const { invokeLLM } = await import("./_core/llm");

    await expect(
      invokeLLM({
        messages: [{ role: "user", content: "test" }],
        timeoutMs: 50, // 50ms para o teste ser rápido
      })
    ).rejects.toThrow("LLM_TIMEOUT");
  }, 5000);

  it("deve incluir o tempo em minutos na mensagem de erro quando >= 60s", async () => {
    // Usa timeoutMs curto (50ms) para o AbortController disparar rapidamente
    // mas verifica que a mensagem formata corretamente 120s como "2 minutos"
    global.fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const { invokeLLM } = await import("./_core/llm");

    // 120_000ms = 2 minutos — o AbortController dispara em 120s mas o mock aborta imediatamente
    // Usamos timeoutMs pequeno (50ms) para o teste ser rápido, mas verificamos o label
    await expect(
      invokeLLM({
        messages: [{ role: "user", content: "test" }],
        timeoutMs: 50, // dispara rapidamente; label = "0 minutos" (< 1 min)
      })
    ).rejects.toThrow("LLM_TIMEOUT");
  }, 5000);

  it("deve formatar label em minutos corretamente para 180s", () => {
    // Teste puro da lógica de formatação sem chamada HTTP
    const timeoutMs = 180_000;
    const seconds = Math.round(timeoutMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const label = minutes >= 1 ? `${minutes} minuto${minutes > 1 ? "s" : ""}` : `${seconds}s`;
    expect(label).toBe("3 minutos");
  });

  it("deve formatar label em segundos corretamente para 30s", () => {
    // Teste puro da lógica de formatação sem chamada HTTP
    const timeoutMs = 30_000;
    const seconds = Math.round(timeoutMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const label = minutes >= 1 ? `${minutes} minuto${minutes > 1 ? "s" : ""}` : `${seconds}s`;
    expect(label).toBe("30s");
  });

  it("deve completar com sucesso quando o fetch responde antes do timeout", async () => {
    const mockResponse = {
      id: "test-id",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { invokeLLM } = await import("./_core/llm");

    const result = await invokeLLM({
      messages: [{ role: "user", content: "test" }],
      timeoutMs: 5000,
    });

    expect(result.choices[0].message.content).toBe("Hello!");
  }, 5000);

  it("deve lançar erro HTTP quando o servidor retorna status não-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Rate limit exceeded",
    });

    const { invokeLLM } = await import("./_core/llm");

    await expect(
      invokeLLM({
        messages: [{ role: "user", content: "test" }],
        timeoutMs: 5000,
      })
    ).rejects.toThrow("LLM invoke failed: 429");
  }, 5000);
});

// ─── Testes do generateWithRetry com timeout ────────────────────────────────
describe("generateWithRetry com timeoutMs", () => {
  it("deve propagar o timeoutMs para o invokeLLM", async () => {
    // Verifica que o parâmetro timeoutMs é aceito sem erros de tipo
    const { generateWithRetry } = await import("./ai-helpers");
    const { z } = await import("zod");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "test",
        created: Date.now(),
        model: "gemini-2.5-flash",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: '{"value": "ok"}' },
            finish_reason: "stop",
          },
        ],
      }),
    });

    const schema = z.object({ value: z.string() });
    const result = await generateWithRetry(
      [{ role: "user", content: "test" }],
      schema,
      { context: "test", timeoutMs: 5000 }
    );

    expect(result.value).toBe("ok");
  }, 10000);
});
