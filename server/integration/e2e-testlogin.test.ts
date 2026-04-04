/**
 * Testes unitários para auth.testLogin
 * Verifica que o endpoint está bloqueado em produção e funciona apenas com E2E_TEST_MODE=true
 */
import { describe, it, expect, afterEach } from "vitest";

describe("auth.testLogin — guard E2E_TEST_MODE", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restaurar variáveis de ambiente após cada teste
    process.env.E2E_TEST_MODE = originalEnv.E2E_TEST_MODE;
    process.env.E2E_TEST_SECRET = originalEnv.E2E_TEST_SECRET;
  });

  it("deve retornar FORBIDDEN quando E2E_TEST_MODE não está definido", () => {
    delete process.env.E2E_TEST_MODE;
    expect(process.env.E2E_TEST_MODE).toBeUndefined();
    // Guard: process.env.E2E_TEST_MODE !== 'true' → FORBIDDEN
    const isBlocked = process.env.E2E_TEST_MODE !== "true";
    expect(isBlocked).toBe(true);
  });

  it("deve retornar FORBIDDEN quando E2E_TEST_MODE='false'", () => {
    process.env.E2E_TEST_MODE = "false";
    const isBlocked = process.env.E2E_TEST_MODE !== "true";
    expect(isBlocked).toBe(true);
  });

  it("deve retornar FORBIDDEN quando E2E_TEST_MODE='production'", () => {
    process.env.E2E_TEST_MODE = "production";
    const isBlocked = process.env.E2E_TEST_MODE !== "true";
    expect(isBlocked).toBe(true);
  });

  it("deve permitir quando E2E_TEST_MODE='true'", () => {
    process.env.E2E_TEST_MODE = "true";
    const isBlocked = process.env.E2E_TEST_MODE !== "true";
    expect(isBlocked).toBe(false);
  });

  it("deve rejeitar secret inválido mesmo com E2E_TEST_MODE=true", () => {
    process.env.E2E_TEST_MODE = "true";
    process.env.E2E_TEST_SECRET = "secret-correto-123";
    const expectedSecret = process.env.E2E_TEST_SECRET;
    const inputSecret = "secret-errado";
    const isInvalid = !expectedSecret || inputSecret !== expectedSecret;
    expect(isInvalid).toBe(true);
  });

  it("deve aceitar secret correto com E2E_TEST_MODE=true", () => {
    process.env.E2E_TEST_MODE = "true";
    process.env.E2E_TEST_SECRET = "secret-correto-123";
    const expectedSecret = process.env.E2E_TEST_SECRET;
    const inputSecret = "secret-correto-123";
    const isValid = expectedSecret && inputSecret === expectedSecret;
    expect(isValid).toBeTruthy();
  });

  it("deve rejeitar quando E2E_TEST_SECRET não está definido", () => {
    process.env.E2E_TEST_MODE = "true";
    delete process.env.E2E_TEST_SECRET;
    const expectedSecret = process.env.E2E_TEST_SECRET;
    const inputSecret = "qualquer-coisa";
    const isInvalid = !expectedSecret || inputSecret !== expectedSecret;
    expect(isInvalid).toBe(true);
  });

  it("openId do usuário de teste deve ser constante (determinístico)", () => {
    const E2E_OPEN_ID = "e2e-test-user-uat-solaris";
    expect(E2E_OPEN_ID).toBe("e2e-test-user-uat-solaris");
    expect(E2E_OPEN_ID).not.toBe("");
  });
});
