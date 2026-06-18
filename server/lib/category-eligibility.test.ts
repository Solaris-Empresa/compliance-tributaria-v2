// category-eligibility.test.ts — PR-B F1 (A-5 · Lição #137)
// Cobre a fonte única: categorias × operationTypes × flags + robustez a perfil parcial.

import { describe, it, expect } from "vitest";
import {
  resolveCategoryEligibility,
  isCategoryEligible,
  RULED_CATEGORIES,
} from "./category-eligibility";

describe("category-eligibility — imposto_seletivo (D1-IS não-autoritativo)", () => {
  it("sempre allowed + authoritative=false (gate real é NCM/CNAE, Art.409)", () => {
    for (const op of ["industria", "comercio", "servicos", "misto", "agronegocio", "financeiro"]) {
      const r = resolveCategoryEligibility("imposto_seletivo", { operationType: op });
      expect(r.allowed).toBe(true);
      expect(r.authoritative).toBe(false);
      expect(r.reason).toBe("is_ncm_cnae_driven");
    }
  });
});

describe("category-eligibility — transicao_iss_ibs (Art.342)", () => {
  it("servicos/misto → allowed", () => {
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "servicos" })).toBe(true);
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "misto" })).toBe(true);
  });
  it("industria/comercio/agro → bloqueado", () => {
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "industria" })).toBe(false);
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "comercio" })).toBe(false);
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "agronegocio" })).toBe(false);
  });
  it("operationType ausente → permissivo", () => {
    expect(isCategoryEligible("transicao_iss_ibs", {})).toBe(true);
    expect(isCategoryEligible("transicao_iss_ibs", { operationType: "" })).toBe(true);
  });
});

describe("category-eligibility — regime_diferenciado (D1-RD paliativo)", () => {
  it("servicos/misto/agronegocio/comercio → allowed", () => {
    for (const op of ["servicos", "misto", "agronegocio", "comercio"]) {
      expect(isCategoryEligible("regime_diferenciado", { operationType: op })).toBe(true);
    }
  });
  it("industria → bloqueado (band-aid; falso negativo Art.128 III/V documentado)", () => {
    const r = resolveCategoryEligibility("regime_diferenciado", { operationType: "industria" });
    expect(r.allowed).toBe(false);
    expect(r.authoritative).toBe(false); // critério real é setorial (#1506)
  });
  it("operationType ausente → permissivo", () => {
    expect(isCategoryEligible("regime_diferenciado", {})).toBe(true);
  });
});

describe("category-eligibility — split_payment (gate explícito)", () => {
  it("paymentMethods com cartão/pix → allowed", () => {
    expect(isCategoryEligible("split_payment", { paymentMethods: ["cartao"] })).toBe(true);
    expect(isCategoryEligible("split_payment", { paymentMethods: ["pix"] })).toBe(true);
    expect(isCategoryEligible("split_payment", { paymentMethods: ["cartão"] })).toBe(true);
  });
  it("hasIntermediaries=true → allowed", () => {
    expect(isCategoryEligible("split_payment", { hasIntermediaries: true })).toBe(true);
  });
  it("dados presentes sem meio split → bloqueado", () => {
    expect(
      isCategoryEligible("split_payment", { paymentMethods: ["boleto"], hasIntermediaries: false }),
    ).toBe(false);
  });
  it("ROBUSTEZ: sem dados de pagamento (ex.: wrapper da matriz só com operationType) → permissivo", () => {
    expect(isCategoryEligible("split_payment", { operationType: "industria" })).toBe(true);
    expect(isCategoryEligible("split_payment", {})).toBe(true);
  });
});

describe("category-eligibility — default + meta", () => {
  it("categoria sem regra → permitida (default-permissivo)", () => {
    expect(isCategoryEligible("cadastro_fiscal", { operationType: "industria" })).toBe(true);
    expect(isCategoryEligible("qualquer_coisa", {})).toBe(true);
  });
  it("RULED_CATEGORIES expõe as 4 categorias com regra", () => {
    expect(RULED_CATEGORIES.sort()).toEqual(
      ["imposto_seletivo", "regime_diferenciado", "split_payment", "transicao_iss_ibs"].sort(),
    );
  });
});
