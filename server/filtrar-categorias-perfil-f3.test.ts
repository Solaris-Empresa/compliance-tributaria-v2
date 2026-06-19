// filtrar-categorias-perfil-f3.test.ts — PR-B F3 (A-5 · Lição #137)
// Wrapper filtrarCategoriasPorPerfil atrás de ENABLE_UNIFIED_ELIGIBILITY.
// OFF (default) = switch legado; ON = fonte única (category-eligibility.ts).

import { describe, it, expect, afterEach } from "vitest";
import { filtrarCategoriasPorPerfil } from "./routers-fluxo-v3";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cats = (...codigos: string[]): any[] =>
  codigos.map((codigo) => ({ codigo, nome: codigo, artigo_base: "x" }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profile = (over: Record<string, any> = {}): any => ({
  operationProfile: { operationType: over.operationType ?? "industria" },
  financialProfile: {
    paymentMethods: over.paymentMethods ?? [],
    hasIntermediaries: over.hasIntermediaries ?? null,
  },
  taxComplexity: { usesTaxIncentives: over.usesTaxIncentives ?? null },
});

const codes = (r: { codigo: string }[]) => r.map((c) => c.codigo).sort();

describe("filtrarCategoriasPorPerfil — flag OFF (switch legado)", () => {
  afterEach(() => delete process.env.ENABLE_UNIFIED_ELIGIBILITY);

  it("industria: imposto_seletivo mantido, transicao_iss_ibs removido (legado)", () => {
    delete process.env.ENABLE_UNIFIED_ELIGIBILITY;
    const out = filtrarCategoriasPorPerfil(
      cats("imposto_seletivo", "transicao_iss_ibs"),
      profile({ operationType: "industria" }),
    );
    expect(codes(out)).toEqual(["imposto_seletivo"]);
  });
});

describe("filtrarCategoriasPorPerfil — flag ON (fonte única)", () => {
  afterEach(() => delete process.env.ENABLE_UNIFIED_ELIGIBILITY);

  it("industria: transicao_iss_ibs removido (paridade com legado/matriz)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    const out = filtrarCategoriasPorPerfil(
      cats("transicao_iss_ibs", "cadastro_fiscal"),
      profile({ operationType: "industria" }),
    );
    expect(codes(out)).toEqual(["cadastro_fiscal"]);
  });

  it("servicos: imposto_seletivo MANTIDO (D1-IS não-autoritativo — difere do legado)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    const out = filtrarCategoriasPorPerfil(
      cats("imposto_seletivo"),
      profile({ operationType: "servicos" }),
    );
    expect(codes(out)).toEqual(["imposto_seletivo"]);
  });

  it("regime_diferenciado: industria removido · servicos mantido", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    expect(
      codes(filtrarCategoriasPorPerfil(cats("regime_diferenciado"), profile({ operationType: "industria" }))),
    ).toEqual([]);
    expect(
      codes(filtrarCategoriasPorPerfil(cats("regime_diferenciado"), profile({ operationType: "servicos" }))),
    ).toEqual(["regime_diferenciado"]);
  });

  it("split_payment: com paymentMethods cartão → mantido; sem meio → removido", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    expect(
      codes(filtrarCategoriasPorPerfil(cats("split_payment"), profile({ paymentMethods: ["cartao"] }))),
    ).toEqual(["split_payment"]);
    expect(
      codes(filtrarCategoriasPorPerfil(cats("split_payment"), profile({ paymentMethods: ["boleto"], hasIntermediaries: false }))),
    ).toEqual([]);
  });
});
