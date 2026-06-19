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

// ── BUG-REGIME-FILTER-01 (A1) — DoD discriminante (cenário F4 do Dr. José) ──────
// 4 perguntas SOL-301..304 com tax_regimes=["lucro_presumido"], cnae universal.
// O fix (F4 lê companyProfile.taxRegime) é validado em runtime pelo smoke do Manus
// (T1/T2/T3); aqui provamos o CONTRATO do filtro com o regime já resolvido — o caso
// NEGATIVO (lucro_real) é o que distingue "filtra" de "permissivo" (Lição #138/#139).
describe("BUG-REGIME-FILTER-01 — DoD discriminante (4 perguntas lucro_presumido)", () => {
  const lp4 = [
    q(null, ["lucro_presumido"]),
    q(null, ["lucro_presumido"]),
    q(null, ["lucro_presumido"]),
    q(null, ["lucro_presumido"]),
  ];

  it("POSITIVO — projeto lucro_presumido (9180001) → 4 perguntas exibidas", () => {
    expect(filterSolarisByContext(lp4, { regime: "lucro_presumido" })).toHaveLength(4);
  });

  it("NEGATIVO discriminante — projeto lucro_real (9210001) → 0 perguntas (o bug)", () => {
    expect(filterSolarisByContext(lp4, { regime: "lucro_real" })).toHaveLength(0);
  });

  it("NEUTRO — projeto sem regime resolvível → permissivo (semântica mantida)", () => {
    expect(filterSolarisByContext(lp4, { regime: undefined })).toHaveLength(4);
    expect(filterSolarisByContext(lp4, { regime: null })).toHaveLength(4);
  });
});

// ── DoD discriminante — 3 regimes × (positivo + negativo) (Lição #139 + #141) ──
// Trava no CI o suporte aos 3 regimes (simples_nacional, lucro_presumido, lucro_real).
// O caso NEGATIVO é obrigatório por regime: o positivo sozinho passaria mesmo com filtro
// permissivo (Lição #139). Cobre a importação de perguntas simples_nacional (19/06/2026).
describe("matchesRegimeDimension — DoD discriminante 3 regimes", () => {
  // lucro_presumido
  it("LP positivo: pergunta LP → visível para projeto LP", () => {
    expect(matchesRegimeDimension(["lucro_presumido"], "lucro_presumido")).toBe(true);
  });
  it("LP negativo discriminante: pergunta LP → AUSENTE para projeto LR", () => {
    expect(matchesRegimeDimension(["lucro_presumido"], "lucro_real")).toBe(false);
  });
  it("LP neutro: pergunta universal (null) → visível para qualquer regime", () => {
    expect(matchesRegimeDimension(null, "lucro_presumido")).toBe(true);
    expect(matchesRegimeDimension(null, "lucro_real")).toBe(true);
    expect(matchesRegimeDimension(null, "simples_nacional")).toBe(true);
  });

  // lucro_real
  it("LR positivo: pergunta LR → visível para projeto LR", () => {
    expect(matchesRegimeDimension(["lucro_real"], "lucro_real")).toBe(true);
  });
  it("LR negativo discriminante: pergunta LR → AUSENTE para projeto LP", () => {
    expect(matchesRegimeDimension(["lucro_real"], "lucro_presumido")).toBe(false);
  });

  // simples_nacional
  it("SN positivo: pergunta SN → visível para projeto SN", () => {
    expect(matchesRegimeDimension(["simples_nacional"], "simples_nacional")).toBe(true);
  });
  it("SN negativo discriminante: pergunta SN → AUSENTE para projeto LP", () => {
    expect(matchesRegimeDimension(["simples_nacional"], "lucro_presumido")).toBe(false);
  });
  it("SN negativo discriminante: pergunta SN → AUSENTE para projeto LR", () => {
    expect(matchesRegimeDimension(["simples_nacional"], "lucro_real")).toBe(false);
  });

  // multi-regime (pergunta marcada para 2 regimes)
  it("multi-regime: pergunta [SN, LR] → visível p/ SN e LR, AUSENTE p/ LP", () => {
    expect(matchesRegimeDimension(["simples_nacional", "lucro_real"], "simples_nacional")).toBe(true);
    expect(matchesRegimeDimension(["simples_nacional", "lucro_real"], "lucro_real")).toBe(true);
    expect(matchesRegimeDimension(["simples_nacional", "lucro_real"], "lucro_presumido")).toBe(false);
  });

  // permissividade (projeto sem regime resolvível)
  it("sem regime no projeto → pergunta específica de qualquer regime aparece (permissivo)", () => {
    expect(matchesRegimeDimension(["simples_nacional"], null)).toBe(true);
    expect(matchesRegimeDimension(["lucro_real"], "")).toBe(true);
    expect(matchesRegimeDimension(["lucro_presumido"], undefined)).toBe(true);
  });
});
