/**
 * server/m1-feature-flag.test.ts
 *
 * Testa a lógica da feature flag M1_ARCHETYPE_ENABLED e a função isM1ArchetypeEnabled.
 *
 * Regras validadas:
 *   1. Flag global false → clientes não têm acesso
 *   2. equipe_solaris → sempre tem acesso (independente da flag global)
 *   3. advogado_senior → sempre tem acesso
 *   4. E2E_TEST_MODE=true → sempre tem acesso
 *   5. M1_ARCHETYPE_ALLOWED_PROJECTS → projeto específico tem acesso
 *   6. Flag global true → todos têm acesso
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isM1ArchetypeEnabled, FEATURE_FLAGS } from "./config/feature-flags";

describe("isM1ArchetypeEnabled — Política de rollout controlado M1", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Garantir flag global false (estado padrão de deploy)
    (FEATURE_FLAGS as Record<string, boolean>)["m1-archetype-enabled"] = false;
    delete process.env.E2E_TEST_MODE;
    delete process.env.M1_ARCHETYPE_ALLOWED_PROJECTS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (FEATURE_FLAGS as Record<string, boolean>)["m1-archetype-enabled"] = false;
  });

  // ─── Regra 1: Flag global false → clientes bloqueados ─────────────────────
  it("R1: cliente NÃO tem acesso quando flag global = false", () => {
    expect(isM1ArchetypeEnabled("cliente")).toBe(false);
    expect(isM1ArchetypeEnabled("cliente", 9999)).toBe(false);
  });

  it("R1: advogado_junior NÃO tem acesso quando flag global = false", () => {
    expect(isM1ArchetypeEnabled("advogado_junior")).toBe(false);
  });

  // ─── Regra 2: equipe_solaris → sempre ativo ───────────────────────────────
  it("R2: equipe_solaris TEM acesso independente da flag global", () => {
    expect(isM1ArchetypeEnabled("equipe_solaris")).toBe(true);
    expect(isM1ArchetypeEnabled("equipe_solaris", 1)).toBe(true);
  });

  // ─── Regra 3: advogado_senior → sempre ativo ─────────────────────────────
  it("R3: advogado_senior TEM acesso independente da flag global", () => {
    expect(isM1ArchetypeEnabled("advogado_senior")).toBe(true);
    expect(isM1ArchetypeEnabled("advogado_senior", 42)).toBe(true);
  });

  // ─── Regra 4: E2E_TEST_MODE=true → sempre ativo ──────────────────────────
  it("R4: E2E_TEST_MODE=true habilita para qualquer role", () => {
    process.env.E2E_TEST_MODE = "true";
    expect(isM1ArchetypeEnabled("cliente")).toBe(true);
    expect(isM1ArchetypeEnabled("advogado_junior")).toBe(true);
    expect(isM1ArchetypeEnabled("cliente", 1)).toBe(true);
  });

  it("R4: E2E_TEST_MODE=false NÃO habilita para clientes", () => {
    process.env.E2E_TEST_MODE = "false";
    expect(isM1ArchetypeEnabled("cliente")).toBe(false);
  });

  // ─── Regra 5: M1_ARCHETYPE_ALLOWED_PROJECTS ──────────────────────────────
  it("R5: projeto em whitelist TEM acesso para qualquer role", () => {
    process.env.M1_ARCHETYPE_ALLOWED_PROJECTS = "100,200,300";
    expect(isM1ArchetypeEnabled("cliente", 100)).toBe(true);
    expect(isM1ArchetypeEnabled("cliente", 200)).toBe(true);
    expect(isM1ArchetypeEnabled("advogado_junior", 300)).toBe(true);
  });

  it("R5: projeto fora da whitelist NÃO tem acesso para cliente", () => {
    process.env.M1_ARCHETYPE_ALLOWED_PROJECTS = "100,200";
    expect(isM1ArchetypeEnabled("cliente", 999)).toBe(false);
  });

  it("R5: whitelist vazia não habilita nenhum projeto", () => {
    process.env.M1_ARCHETYPE_ALLOWED_PROJECTS = "";
    expect(isM1ArchetypeEnabled("cliente", 100)).toBe(false);
  });

  it("R5: whitelist com espaços é parseada corretamente", () => {
    process.env.M1_ARCHETYPE_ALLOWED_PROJECTS = " 100 , 200 , 300 ";
    expect(isM1ArchetypeEnabled("cliente", 200)).toBe(true);
  });

  // ─── Regra 6: Flag global true → rollout global ───────────────────────────
  it("R6: flag global true habilita para todos", () => {
    (FEATURE_FLAGS as Record<string, boolean>)["m1-archetype-enabled"] = true;
    expect(isM1ArchetypeEnabled("cliente")).toBe(true);
    expect(isM1ArchetypeEnabled("advogado_junior")).toBe(true);
    expect(isM1ArchetypeEnabled("cliente", 9999)).toBe(true);
  });

  // ─── Invariante: score ≠ gate ─────────────────────────────────────────────
  it("INV: a função não recebe score como parâmetro (score não interfere no gate)", () => {
    // isM1ArchetypeEnabled só aceita role e projectId
    // Este teste garante que a assinatura não muda sem revisão
    expect(isM1ArchetypeEnabled.length).toBe(2); // 2 parâmetros: role, projectId
  });
});
