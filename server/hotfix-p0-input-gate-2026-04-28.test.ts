/**
 * hotfix-p0-input-gate-2026-04-28.test.ts
 *
 * Testes do Gate P0 de input M1 — CNAE/NCM/NBS obrigatório e coerente.
 *
 * Decisões P.O.:
 *   C1: Intermediação = MISTO (Bens/mercadorias + Servicos)
 *   C2: Validação simétrica frontend + backend
 *   C3: P0 valida formato apenas (regex); existência no dataset = P1
 *
 * Ref: REGRA-ORQ-11 fast-track P0
 */
import { describe, it, expect } from "vitest";
import { validateM1Seed, deriveTipoObjetoEconomico } from "./lib/archetype/validateM1Input";

// ─── deriveTipoObjetoEconomico ────────────────────────────────────────────────

describe("deriveTipoObjetoEconomico", () => {
  it("Produção própria → Bens/mercadorias", () => {
    expect(deriveTipoObjetoEconomico(["Produção própria"])).toEqual(["Bens/mercadorias"]);
  });

  it("Comércio → Bens/mercadorias", () => {
    expect(deriveTipoObjetoEconomico(["Comércio"])).toEqual(["Bens/mercadorias"]);
  });

  it("Transporte → Servicos (sem acento — enum canônico)", () => {
    expect(deriveTipoObjetoEconomico(["Transporte"])).toEqual(["Servicos"]);
  });

  it("Prestação de serviço → Servicos", () => {
    expect(deriveTipoObjetoEconomico(["Prestação de serviço"])).toEqual(["Servicos"]);
  });

  it("Locação → Servicos", () => {
    expect(deriveTipoObjetoEconomico(["Locação"])).toEqual(["Servicos"]);
  });

  it("Intermediação → MISTO [Bens/mercadorias, Servicos] (Decisão C1)", () => {
    const result = deriveTipoObjetoEconomico(["Intermediação"]);
    expect(result).toContain("Bens/mercadorias");
    expect(result).toContain("Servicos");
    expect(result).toHaveLength(2);
  });

  it("Comércio + Prestação de serviço → [Bens/mercadorias, Servicos]", () => {
    const result = deriveTipoObjetoEconomico(["Comércio", "Prestação de serviço"]);
    expect(result).toContain("Bens/mercadorias");
    expect(result).toContain("Servicos");
  });

  it("Array vazio → []", () => {
    expect(deriveTipoObjetoEconomico([])).toEqual([]);
  });
});

// ─── validateM1Seed — CNAE ────────────────────────────────────────────────────

describe("Hotfix P0 — Input Gate M1 (CNAE)", () => {
  it("CNAE vazio bloqueia", () => {
    expect(() => validateM1Seed({ cnae_principal_confirmado: "" })).toThrow(/CNAE_INVALID/);
  });

  it("CNAE undefined bloqueia", () => {
    expect(() => validateM1Seed({})).toThrow(/CNAE_INVALID/);
  });

  it("CNAE placeholder 'ex: 6110-8/01' bloqueia", () => {
    expect(() =>
      validateM1Seed({ cnae_principal_confirmado: "ex: 6110-8/01" }),
    ).toThrow(/CNAE_INVALID/);
  });

  it("CNAE formato errado '0115600' bloqueia", () => {
    expect(() =>
      validateM1Seed({ cnae_principal_confirmado: "0115600" }),
    ).toThrow(/CNAE_INVALID/);
  });

  it("CNAE válido '0115-6/00' passa gate CNAE", () => {
    // Sem natureza → sem exigência de NCM/NBS → deve passar
    expect(() =>
      validateM1Seed({ cnae_principal_confirmado: "0115-6/00" }),
    ).not.toThrow();
  });
});

// ─── validateM1Seed — NCM ─────────────────────────────────────────────────────

describe("Hotfix P0 — Input Gate M1 (NCM)", () => {
  // Issue #1014 (Decisão P.O. 2026-05-07): NCM é opcional independente do
  // operationType. Test ajustado de "bloqueia" para "passa" — NCM_REQUIRED
  // foi removido de validateM1Input.ts. Validação de FORMAT permanece (testes
  // abaixo continuam exercitando NCM_INVALID_FORMAT).
  it("Operação Comércio sem NCM passa (Issue #1014: NCM opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Comércio"],
        ncms_principais: [],
      }),
    ).not.toThrow();
  });

  // Reversão #859 por ADR-0035 / #1219 F1: "1201" (4 díg.) = grupo válido (posição NCM).
  it("Operação Produção própria com NCM grupo '1201' (4 díg.) passa — reversão #859/#1219", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria"],
        ncms_principais: ["1201"],
      }),
    ).not.toThrow();
  });

  it("Operação Comércio com NCM sem pontos '12019000' bloqueia", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Comércio"],
        ncms_principais: ["12019000"],
      }),
    ).toThrow(/NCM_INVALID_FORMAT/);
  });

  it("Operação Comércio com NCM válido '1201.90.00' passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Comércio"],
        ncms_principais: ["1201.90.00"],
      }),
    ).not.toThrow();
  });
});

// ─── validateM1Seed — NBS ─────────────────────────────────────────────────────

describe("Hotfix P0 — Input Gate M1 (NBS)", () => {
  // Issue #1014 (Decisão P.O. 2026-05-07): NBS é opcional independente do
  // operationType. NBS_REQUIRED removido de validateM1Input.ts.
  it("Operação Prestação de serviço sem NBS passa (Issue #1014: NBS opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4930-2/02",
        natureza_operacao_principal: ["Prestação de serviço"],
        nbss_principais: [],
      }),
    ).not.toThrow();
  });

  it("Operação Transporte com NBS formato errado '105011459' bloqueia", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4930-2/02",
        natureza_operacao_principal: ["Transporte"],
        nbss_principais: ["105011459"],
      }),
    ).toThrow(/NBS_INVALID_FORMAT/);
  });

  it("Operação Transporte com NBS válido '1.0501.14.59' passa (Decisão C3: formato, não existência)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4930-2/02",
        natureza_operacao_principal: ["Transporte"],
        ncms_principais: [],
        nbss_principais: ["1.0501.14.59"],
      }),
    ).not.toThrow();
  });
});

// ─── validateM1Seed — Mista ───────────────────────────────────────────────────

describe("Hotfix P0 — Input Gate M1 (operação mista)", () => {
  // Issue #1014: NCM e NBS opcionais — testes ajustados para `not.toThrow()`.
  it("Comércio + Prestação de serviço sem NCM passa (Issue #1014: NCM opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4711-3/02",
        natureza_operacao_principal: ["Comércio", "Prestação de serviço"],
        ncms_principais: [],
        nbss_principais: ["1.0501.14.59"],
      }),
    ).not.toThrow();
  });

  it("Comércio + Prestação de serviço sem NBS passa (Issue #1014: NBS opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4711-3/02",
        natureza_operacao_principal: ["Comércio", "Prestação de serviço"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: [],
      }),
    ).not.toThrow();
  });
});

// ─── validateM1Seed — Intermediação MISTO (C1) ───────────────────────────────

describe("Hotfix P0 — Input Gate M1 (Intermediação MISTO — Decisão C1)", () => {
  // Issue #1014: Intermediação MISTO continua válida arquiteturalmente
  // (mapeia para NCM E NBS), mas NCM/NBS ausentes não bloqueiam mais.
  it("Intermediação isolada sem NBS passa (Issue #1014: NBS opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4929-9/04",
        natureza_operacao_principal: ["Intermediação"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: [],
      }),
    ).not.toThrow();
  });

  it("Intermediação isolada sem NCM passa (Issue #1014: NCM opcional)", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4929-9/04",
        natureza_operacao_principal: ["Intermediação"],
        ncms_principais: [],
        nbss_principais: ["1.0501.14.59"],
      }),
    ).not.toThrow();
  });

  it("Intermediação com NCM + NBS válidos passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4929-9/04",
        natureza_operacao_principal: ["Intermediação"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: ["1.0501.14.59"],
      }),
    ).not.toThrow();
  });
});

// ─── validateM1Seed — Casos válidos completos ─────────────────────────────────

describe("Hotfix P0 — Input Gate M1 (casos válidos)", () => {
  it("Soja válida (CNAE 0115-6/00 + NCM 1201.90.00) passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "0115-6/00",
        natureza_operacao_principal: ["Produção própria", "Comércio"],
        ncms_principais: ["1201.90.00"],
        nbss_principais: [],
      }),
    ).not.toThrow();
  });

  it("Transportadora com NBS formato válido passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "4930-2/02",
        natureza_operacao_principal: ["Transporte"],
        ncms_principais: [],
        nbss_principais: ["1.0501.14.59"],
      }),
    ).not.toThrow();
  });

  it("Serviço puro (Locação) com NBS válido passa", () => {
    expect(() =>
      validateM1Seed({
        cnae_principal_confirmado: "6810-2/02",
        natureza_operacao_principal: ["Locação"],
        ncms_principais: [],
        nbss_principais: ["1.1101.12.00"],
      }),
    ).not.toThrow();
  });
});
