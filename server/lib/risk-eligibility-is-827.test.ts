// risk-eligibility-is-827.test.ts — GATE-NCM-NBS #1219 F3 (M3)
// Fecha #827: IS não injeta quando NCM ausente (com resolver ON).
// Gated por ENABLE_NCM_RESOLVER → zero regressão com flag OFF.

import { describe, it, expect, afterEach } from "vitest";
import { isImpostoSeletivoEligible } from "./risk-eligibility-is-ncm-cnae";

const prev = process.env.ENABLE_NCM_RESOLVER;
afterEach(() => {
  if (prev === undefined) delete process.env.ENABLE_NCM_RESOLVER;
  else process.env.ENABLE_NCM_RESOLVER = prev;
});

describe("#827 — IS + NCM ausente (resolver flag)", () => {
  it("flag OFF: NCM/CNAE ausentes → elegível (comportamento atual permissivo — zero regressão)", () => {
    process.env.ENABLE_NCM_RESOLVER = "false";
    const r = isImpostoSeletivoEligible([], []);
    expect(r.eligible).toBe(true);
    expect(r.reason).toBe("ncm_cnae_ausentes");
  });

  it("flag ON: NCM ausente → NÃO elegível (fecha #827)", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible([], ["4639-7/01"]);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("ncm_ausente");
  });

  it("flag ON: NCM ausente + sem CNAE → NÃO elegível (fecha #827)", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible([], []);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("ncm_ausente");
  });

  it("flag ON: NCM 2402.20.00 (cigarro, cap. 24) → elegível (semântica Art.393 mantida)", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible(["2402.20.00"], ["4639-7/01"]);
    expect(r.eligible).toBe(true);
  });

  it("flag ON: NCM 2306.10.00 (farelo soja, cap. 23 fora do Art.393) → NÃO elegível", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible(["2306.10.00"], ["4639-7/01"]);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("ncm_cnae_not_in_art_393");
  });
});
