// solaris-context-filter.test.ts — F2 (ADR-0038)
import { describe, it, expect } from "vitest";
import {
  filterSolarisByContext,
  matchesSolarisContext,
  matchesCnaeDimension,
  matchesRegimeDimension,
  type SolarisFilterFields,
} from "./solaris-context-filter";

const q = (cnaeGroups: unknown, taxRegimes: unknown = null): SolarisFilterFields => ({
  cnaeGroups,
  taxRegimes,
});

describe("matchesCnaeDimension — 3 estados D1", () => {
  it("estado 1 — CNAE ausente (null/'') → ignora dim CNAE (passa)", () => {
    expect(matchesCnaeDimension(["41"], { cnae: null })).toBe(true);
    expect(matchesCnaeDimension(["41"], { cnae: "" })).toBe(true);
    expect(matchesCnaeDimension(["41"], {})).toBe(true);
  });

  it("estado 2 — CNAE genérico/fallback (cnaeMapped:false) → ignora dim CNAE (passa)", () => {
    expect(matchesCnaeDimension(["41"], { cnae: "2833", cnaeMapped: false })).toBe(true);
  });

  it("estado 3 — CNAE mapeado → aplica match (default cnaeMapped)", () => {
    expect(matchesCnaeDimension(["28"], { cnae: "2833" })).toBe(true); // 2833 startsWith 28
    expect(matchesCnaeDimension(["41", "42"], { cnae: "2833" })).toBe(false); // não casa
  });

  it("estado 3 — cnaeGroups null/[] = universal", () => {
    expect(matchesCnaeDimension(null, { cnae: "2833" })).toBe(true);
    expect(matchesCnaeDimension([], { cnae: "2833" })).toBe(true);
  });

  it("match bidirecional (espelha db.getOnda1Questions)", () => {
    expect(matchesCnaeDimension(["2833"], { cnae: "28" })).toBe(true); // g startsWith cnae
    expect(matchesCnaeDimension(["28"], { cnae: "2833" })).toBe(true); // cnae startsWith g
  });
});

describe("matchesRegimeDimension", () => {
  it("taxRegimes null/[] = universal", () => {
    expect(matchesRegimeDimension(null, "simples_nacional")).toBe(true);
    expect(matchesRegimeDimension([], "simples_nacional")).toBe(true);
  });

  it("regime do projeto ∈ taxRegimes → passa; ∉ → bloqueia", () => {
    expect(matchesRegimeDimension(["lucro_real", "lucro_presumido"], "lucro_real")).toBe(true);
    expect(matchesRegimeDimension(["lucro_real"], "simples_nacional")).toBe(false);
  });

  it("regime do projeto desconhecido (null/'') → permissivo (evita falso negativo)", () => {
    expect(matchesRegimeDimension(["lucro_real"], null)).toBe(true);
    expect(matchesRegimeDimension(["lucro_real"], "")).toBe(true);
  });
});

describe("parseStringArray defensivo (Lição #72 — mysql2 auto-parse)", () => {
  it("aceita array já parseado", () => {
    expect(matchesRegimeDimension(["lucro_real"], "lucro_real")).toBe(true);
  });
  it("aceita string JSON (coluna não auto-parseada)", () => {
    expect(matchesRegimeDimension('["lucro_real"]', "lucro_real")).toBe(true);
    expect(matchesRegimeDimension('["lucro_real"]', "simples_nacional")).toBe(false);
  });
  it("string malformada → universal (não derruba)", () => {
    expect(matchesRegimeDimension("{lixo", "simples_nacional")).toBe(true);
  });
});

describe("matchesSolarisContext — AND (D1)", () => {
  it("estado 3: CNAE casa E regime casa → exibe", () => {
    expect(
      matchesSolarisContext(q(["28"], ["lucro_real"]), { cnae: "2833", regime: "lucro_real" }),
    ).toBe(true);
  });
  it("CNAE casa MAS regime não casa → bloqueia (AND)", () => {
    expect(
      matchesSolarisContext(q(["28"], ["lucro_real"]), { cnae: "2833", regime: "simples_nacional" }),
    ).toBe(false);
  });
  it("regime casa MAS CNAE não casa (estado 3) → bloqueia (AND)", () => {
    expect(
      matchesSolarisContext(q(["41"], ["lucro_real"]), { cnae: "2833", regime: "lucro_real" }),
    ).toBe(false);
  });
  it("estado 2 (CNAE fallback V-10) + regime casa → exibe (só regime)", () => {
    expect(
      matchesSolarisContext(q(["41"], ["lucro_real"]), { cnae: "2833", cnaeMapped: false, regime: "lucro_real" }),
    ).toBe(true);
  });
  it("estado 1 (CNAE ausente) + regime não casa → bloqueia (só regime aplica)", () => {
    expect(
      matchesSolarisContext(q(["41"], ["lucro_real"]), { cnae: null, regime: "simples_nacional" }),
    ).toBe(false);
  });
});

describe("filterSolarisByContext — backward-compat (zero regressão)", () => {
  // Perguntas existentes têm taxRegimes = null (universal) → regime nunca filtra.
  const qs = [
    q(["28"], null),   // Q0 — CNAE industria
    q(["41"], null),   // Q1 — CNAE construção
    q(null, null),     // Q2 — universal
  ];

  it("comportamento legado: getOnda1Questions(cnae) ≡ filtro só CNAE (taxRegimes null)", () => {
    const out = filterSolarisByContext(qs, { cnae: "2833", cnaeMapped: true });
    expect(out).toHaveLength(2); // Q0 (casa 28) + Q2 (universal); Q1 fora
  });

  it("sem CNAE e sem regime → retorna todas (legado getOnda1Questions())", () => {
    expect(filterSolarisByContext(qs, {})).toHaveLength(3);
  });

  it("regime novo só filtra perguntas COM taxRegimes (não afeta legadas null)", () => {
    const mix = [q(null, null), q(null, ["lucro_real"])];
    // projeto simples_nacional: legada (null) passa; nova (lucro_real) bloqueia
    expect(filterSolarisByContext(mix, { regime: "simples_nacional" })).toHaveLength(1);
  });
});
