import { describe, it, expect } from "vitest";
import {
  deriveLeiFilterForRegime,
  SIMPLES_NACIONAL_LEI_FILTER,
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
