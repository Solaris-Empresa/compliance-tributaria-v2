// filtrar-categorias-perfil-f3.test.ts — PR-B F3 (A-5 · Lição #137)
// Wrapper filtrarCategoriasPorPerfil atrás de ENABLE_UNIFIED_ELIGIBILITY.
// OFF (default) = switch legado; ON = fonte única (category-eligibility.ts).

import { describe, it, expect, afterEach } from "vitest";
import { filtrarCategoriasPorPerfil } from "./routers-fluxo-v3";
import { isCategoryAllowed } from "./lib/risk-eligibility";
import type { CategoriaCanonica } from "./lib/risk-categorizer";

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

  // F4 Opção 2 (despacho v89/v90) — "flip exceto IS": na Onda 2 o imposto_seletivo
  // mantém o gate legado operationType [industria,comercio] até #1282 (Onda 2 não tem
  // o gate NCM/CNAE da matriz, risk-engine-v4:615).
  it("imposto_seletivo: industria MANTIDO · servicos REMOVIDO (gate legado Onda 2 — Opção 2)", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    expect(
      codes(filtrarCategoriasPorPerfil(cats("imposto_seletivo"), profile({ operationType: "industria" }))),
    ).toEqual(["imposto_seletivo"]);
    expect(
      codes(filtrarCategoriasPorPerfil(cats("imposto_seletivo"), profile({ operationType: "servicos" }))),
    ).toEqual([]);
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

// F4 [3] — paridade F2 (matriz, isCategoryAllowed) ≡ F3 (Onda 2) sob flag ON, p/
// categorias NÃO-IS. IS é a exceção documentada (Opção 2 / #1282): F2 flipa (gate 615),
// F3 mantém legado — por isso fora da paridade.
describe("paridade F2≡F3 (flag ON · categorias não-IS)", () => {
  afterEach(() => delete process.env.ENABLE_UNIFIED_ELIGIBILITY);

  const f3Keeps = (codigo: string, p: ReturnType<typeof profile>) =>
    filtrarCategoriasPorPerfil(cats(codigo), p).length > 0;
  const f2Allows = (codigo: string, op: string) =>
    isCategoryAllowed(codigo as CategoriaCanonica, op).allowed;

  it("transicao_iss_ibs / regime_diferenciado: F2.allowed === F3.keeps p/ todos os ops", () => {
    process.env.ENABLE_UNIFIED_ELIGIBILITY = "true";
    for (const codigo of ["transicao_iss_ibs", "regime_diferenciado"]) {
      for (const op of ["industria", "comercio", "servicos", "misto", "agronegocio"]) {
        expect(f2Allows(codigo, op)).toBe(f3Keeps(codigo, profile({ operationType: op })));
      }
    }
  });
});
