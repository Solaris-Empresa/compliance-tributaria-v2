import { describe, it, expect } from "vitest";
import {
  deriveLeiFilterForRegime,
  SIMPLES_NACIONAL_LEI_FILTER,
  buildLeiFilterFromSourceBasis,
  REGULATORY_LEI_FALLBACK,
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

describe("buildLeiFilterFromSourceBasis (Frente B — union data-driven)", () => {
  it("faz union + dedup + sort das arrays de source_basis", () => {
    const f = buildLeiFilterFromSourceBasis([
      ["lc214", "decreto12955"],
      ["lc214", "resolucao_cgibs_6"],
    ]);
    expect(f).toEqual(["decreto12955", "lc214", "resolucao_cgibs_6"]);
  });

  it("ignora entradas com shape legado (string, não array)", () => {
    const f = buildLeiFilterFromSourceBasis([
      "LC 214/2025 Arts. 164-166 + Auditoria Manus 2026-05-20",
      ["decreto12955"],
    ]);
    expect(f).toEqual(["decreto12955"]);
  });

  it("filtra strings vazias dentro das arrays", () => {
    const f = buildLeiFilterFromSourceBasis([["lc214", "", "  "], ["decreto12955"]]);
    expect(f).toEqual(["decreto12955", "lc214"]);
  });

  it("union vazio (tudo null/legado) → fallback regulatório", () => {
    expect(buildLeiFilterFromSourceBasis([null, undefined, "string-legado", []])).toEqual([
      ...REGULATORY_LEI_FALLBACK,
    ]);
  });

  it("retorna cópia nova do fallback (não vaza a constante)", () => {
    const a = buildLeiFilterFromSourceBasis([]);
    a.push("x");
    expect(buildLeiFilterFromSourceBasis([])).not.toContain("x");
  });
});
