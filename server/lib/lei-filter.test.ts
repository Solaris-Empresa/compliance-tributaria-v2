import { describe, it, expect } from "vitest";
import {
  deriveLeiFilterForRegime,
  SIMPLES_NACIONAL_LEI_FILTER,
  decretoLeiFilterForRegime,
} from "./lei-filter";

describe("deriveLeiFilterForRegime (#1094)", () => {
  it("T1: simples_nacional → leiFilter inclui lc123 e resolucao_cgsn_140", () => {
    const f = deriveLeiFilterForRegime("simples_nacional");
    expect(f).toBeDefined();
    expect(f).toContain("lc123");
    expect(f).toContain("resolucao_cgsn_140");
    expect(f).toEqual([...SIMPLES_NACIONAL_LEI_FILTER]);
  });

  it("T2: lucro_real → undefined (comportamento atual preservado)", () => {
    expect(deriveLeiFilterForRegime("lucro_real")).toBeUndefined();
  });

  it("T3: lucro_presumido → undefined (comportamento atual preservado)", () => {
    expect(deriveLeiFilterForRegime("lucro_presumido")).toBeUndefined();
  });

  it("edge: undefined/null/desconhecido → undefined (sem filtro)", () => {
    expect(deriveLeiFilterForRegime(undefined)).toBeUndefined();
    expect(deriveLeiFilterForRegime(null)).toBeUndefined();
    expect(deriveLeiFilterForRegime("mei")).toBeUndefined();
  });

  it("retorna cópia nova (não vaza a constante compartilhada)", () => {
    const a = deriveLeiFilterForRegime("simples_nacional")!;
    a.push("x");
    expect(deriveLeiFilterForRegime("simples_nacional")).not.toContain("x");
  });
});

describe("decretoLeiFilterForRegime (Frente B — Ramo 2 Opção 1: 2º passe)", () => {
  it("simples_nacional → apenas ['decreto12955'] (SN não recolhe IBS → sem CGIBS 6)", () => {
    expect(decretoLeiFilterForRegime("simples_nacional")).toEqual(["decreto12955"]);
  });

  it("lucro_real → ['decreto12955','resolucao_cgibs_6'] (CBS + IBS)", () => {
    expect(decretoLeiFilterForRegime("lucro_real")).toEqual([
      "decreto12955",
      "resolucao_cgibs_6",
    ]);
  });

  it("lucro_presumido → ['decreto12955','resolucao_cgibs_6']", () => {
    expect(decretoLeiFilterForRegime("lucro_presumido")).toEqual([
      "decreto12955",
      "resolucao_cgibs_6",
    ]);
  });

  it("undefined/null/desconhecido → default não-SN (decreto + cgibs6)", () => {
    expect(decretoLeiFilterForRegime(undefined)).toEqual(["decreto12955", "resolucao_cgibs_6"]);
    expect(decretoLeiFilterForRegime(null)).toEqual(["decreto12955", "resolucao_cgibs_6"]);
    expect(decretoLeiFilterForRegime("mei")).toEqual(["decreto12955", "resolucao_cgibs_6"]);
  });

  it("retorna cópia nova (não vaza constante compartilhada)", () => {
    const a = decretoLeiFilterForRegime("lucro_real");
    a.push("x");
    expect(decretoLeiFilterForRegime("lucro_real")).not.toContain("x");
  });
});
