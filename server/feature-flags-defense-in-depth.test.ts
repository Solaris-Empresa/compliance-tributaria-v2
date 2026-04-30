/**
 * server/feature-flags-defense-in-depth.test.ts
 *
 * PR defesa em profundidade — E2E_TEST_MODE guard prod.
 *
 * Bug histórico (Issue #874): bypass `if (E2E_TEST_MODE === "true") return true;`
 * em isM1ArchetypeEnabled (linha 83) e isM2PerfilEntidadeEnabled (linha 126)
 * fazia qualquer role retornar true em produção, anulando a política de rollout.
 *
 * Detectado em smoke R3-A Cenário 5 (2026-04-30).
 *
 * Fix: detectar prod via NODE_ENV ou DATABASE_URL hostname; em prod o bypass
 * é ignorado (com warning) e os checks normais (role/whitelist/flag) prosseguem.
 *
 * Regras validadas:
 *   T1: E2E_TEST_MODE=true + NODE_ENV=test → bypass funciona (CI Playwright)
 *   T2: E2E_TEST_MODE=true + NODE_ENV=production → bypass rejeitado, vai para checks normais
 *   T3: E2E_TEST_MODE=true + DATABASE_URL contém iasolaris.manus.space → bypass rejeitado
 *   T4: E2E_TEST_MODE não setado + NODE_ENV=production → comportamento normal preservado
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isM1ArchetypeEnabled,
  isM2PerfilEntidadeEnabled,
  FEATURE_FLAGS,
} from "./config/feature-flags";

describe("PR defesa em profundidade — E2E_TEST_MODE guard prod", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset flags globais
    (FEATURE_FLAGS as Record<string, boolean>)["m1-archetype-enabled"] = false;
    (FEATURE_FLAGS as Record<string, boolean>)["m2-perfil-entidade-enabled"] =
      false;
    delete process.env.E2E_TEST_MODE;
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
    delete process.env.M1_ARCHETYPE_ALLOWED_PROJECTS;
    delete process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    (FEATURE_FLAGS as Record<string, boolean>)["m1-archetype-enabled"] = false;
    (FEATURE_FLAGS as Record<string, boolean>)["m2-perfil-entidade-enabled"] =
      false;
  });

  it("T1: E2E_TEST_MODE=true + NODE_ENV=test → bypass funciona (CI Playwright)", () => {
    process.env.E2E_TEST_MODE = "true";
    process.env.NODE_ENV = "test";
    // DATABASE_URL ausente — claramente fora de prod
    expect(isM1ArchetypeEnabled("cliente")).toBe(true);
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(true);
  });

  it("T2: E2E_TEST_MODE=true + NODE_ENV=production → bypass rejeitado, vai para checks normais", () => {
    process.env.E2E_TEST_MODE = "true";
    process.env.NODE_ENV = "production";
    // Sem M2_PERFIL_ENTIDADE_ENABLED nem INTERNAL_ROLES → checks normais → false para cliente
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
    // M1: cliente tem só whitelist e flag global → false
    expect(isM1ArchetypeEnabled("cliente")).toBe(false);
  });

  it("T3: E2E_TEST_MODE=true + DATABASE_URL contém iasolaris.manus.space → bypass rejeitado", () => {
    process.env.E2E_TEST_MODE = "true";
    process.env.NODE_ENV = "test"; // teste explícito que hostname tb conta independente de NODE_ENV
    process.env.DATABASE_URL =
      "mysql://user:pass@gateway01.iasolaris.manus.space:4000/db";
    // Bypass deve ser rejeitado pelo hostname → checks normais → false
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
    expect(isM1ArchetypeEnabled("cliente")).toBe(false);
  });

  it("T4: E2E_TEST_MODE não setado + NODE_ENV=production → comportamento normal preservado", () => {
    // E2E_TEST_MODE ausente — guard nem é exercitado
    process.env.NODE_ENV = "production";
    process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES = "true";
    // equipe_solaris com INTERNAL_ROLES=true → true (rollout step 3)
    expect(isM2PerfilEntidadeEnabled({ role: "equipe_solaris" })).toBe(true);
    // cliente em prod sem flag global → false
    expect(isM2PerfilEntidadeEnabled({ role: "cliente" })).toBe(false);
    // M1: equipe_solaris sempre passa
    expect(isM1ArchetypeEnabled("equipe_solaris")).toBe(true);
    expect(isM1ArchetypeEnabled("cliente")).toBe(false);
  });
});
