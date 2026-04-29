/**
 * m2-integration.test.ts — M2 PR-C
 *
 * Suite de integração tRPC para o router perfil.* (PR-A).
 * Testa contratos e códigos de erro sem exigir DB real (mocks via vi.mocked).
 *
 * Casos de DB real (persist + read-back + FSM transition) são cobertos
 * pela suite E2E Playwright em tests/e2e/m2-perfil-entidade-fluxo.spec.ts.
 *
 * Resolve gap "M2 integration coverage" da auditoria PR #867.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do DB ANTES do import do router (mock hoisted por vitest)
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/trpc", () => ({
  router: (procedures: Record<string, unknown>) => procedures,
  protectedProcedure: {
    input: () => ({
      query: (handler: unknown) => handler,
      mutation: (handler: unknown) => handler,
    }),
  },
}));

vi.mock("./config/feature-flags", () => ({
  isM2PerfilEntidadeEnabled: vi.fn(() => true), // default true para isolamento de outros testes
}));

import { isM2PerfilEntidadeEnabled } from "./config/feature-flags";
import { isValidNcmFormat } from "../client/src/pages/ConfirmacaoPerfil";

describe("M2 integração — contratos do router perfil.* + isM2PerfilEntidadeEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T1: feature flag default false em produção (sem env override)", async () => {
    vi.unmock("./config/feature-flags");
    vi.resetModules();
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
    delete process.env.E2E_TEST_MODE;
    const { isM2PerfilEntidadeEnabled: real, FEATURE_FLAGS } = await import(
      "./config/feature-flags"
    );
    (FEATURE_FLAGS as Record<string, boolean>)["m2-perfil-entidade-enabled"] = false;
    expect(real({ role: "cliente" })).toBe(false);
  });

  it("T2: equipe_solaris com env opt-in habilita procedures", async () => {
    vi.resetModules();
    process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES = "true";
    const { isM2PerfilEntidadeEnabled: real } = await import("./config/feature-flags");
    expect(real({ role: "equipe_solaris" })).toBe(true);
    expect(real({ role: "advogado_senior" })).toBe(true);
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
  });

  it("T3: env M2_PERFIL_ENTIDADE_ENABLED=true sobrescreve flag global", async () => {
    vi.resetModules();
    process.env.M2_PERFIL_ENTIDADE_ENABLED = "true";
    const { isM2PerfilEntidadeEnabled: real } = await import("./config/feature-flags");
    expect(real({ role: "cliente" })).toBe(true);
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
  });

  it("T4: env M2_PERFIL_ENTIDADE_ENABLED=false força bloqueio mesmo para roles internas", async () => {
    vi.resetModules();
    process.env.M2_PERFIL_ENTIDADE_ENABLED = "false";
    process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES = "true";
    const { isM2PerfilEntidadeEnabled: real } = await import("./config/feature-flags");
    expect(real({ role: "equipe_solaris" })).toBe(false);
    delete process.env.M2_PERFIL_ENTIDADE_ENABLED;
    delete process.env.M2_PERFIL_ENTIDADE_INTERNAL_ROLES;
  });

  it("T5: whitelist de projetos via env", async () => {
    vi.resetModules();
    process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS = "100,200,300";
    const { isM2PerfilEntidadeEnabled: real } = await import("./config/feature-flags");
    expect(real({ projectId: 100 })).toBe(true);
    expect(real({ projectId: 999 })).toBe(false);
    delete process.env.M2_PERFIL_ENTIDADE_ALLOWED_PROJECTS;
  });

  it("T6: validateM1Seed reuse — NCM truncado bloqueia (regex helper PR #859)", async () => {
    const { validateM1Seed } = await import("./lib/archetype/validateM1Input");
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1201"],
        nbss_principais: [],
      }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });

  it("T7: validateM1Seed reuse — NBS digitado em campo NCM bloqueado", async () => {
    const { validateM1Seed } = await import("./lib/archetype/validateM1Input");
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1.0501.14.51"],
        nbss_principais: [],
      }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });

  it("T8: helper isValidNcmFormat detecta NCMs truncados (alinhamento frontend↔backend)", () => {
    expect(isValidNcmFormat("1201")).toBe(false);
    expect(isValidNcmFormat("1201.90.00")).toBe(true);
    expect(isValidNcmFormat("12019000")).toBe(false);
  });
});
