// dod-negativo-1219.test.ts — GATE-NCM-NBS #1219 F4 (REGRA-ORQ-44)
// Os 7 contratos DoD NEGATIVO da feature de grupos NCM/NBS. Test-only.
// Funções puras (sem DB): isImpostoSeletivoEligible, shouldInjectArt197,
// classifyResolution. Cada contrato trava um estado PROIBIDO (não-regressão).

import { describe, it, expect, afterEach } from "vitest";
import { isImpostoSeletivoEligible } from "./risk-eligibility-is-ncm-cnae";
import { shouldInjectArt197 } from "./art197-injection";
import { classifyResolution, type ResolverRule } from "./ncm-nbs-resolver";

const prev = process.env.ENABLE_NCM_RESOLVER;
afterEach(() => {
  if (prev === undefined) delete process.env.ENABLE_NCM_RESOLVER;
  else process.env.ENABLE_NCM_RESOLVER = prev;
});

// Regras representativas dos grupos curados em F5 (#991efe8a).
const RULES: ResolverRule[] = [
  { regime: "tratamento_bens_capital_agro_pendente", code: "8436", match_mode: "prefix" },
  { regime: "cesta_basica_pendente", code: "1006", match_mode: "prefix" },
  // refino específico de cesta básica (aliquota_zero) — exige subitem do Anexo I
  { regime: "aliquota_zero", code: "1006.30.21", match_mode: "exact" },
];

describe("F4 — DoD negativo #1219 (REGRA-ORQ-44)", () => {
  // ── IS (Art. 393 §1º) ──────────────────────────────────────────────────────
  it("C1: IS NÃO injeta quando NCM ausente (flag ON) — fecha #827", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible([], ["4639-7/01"]);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("ncm_ausente");
  });

  it("C2: IS NÃO injeta quando NCM fora da lista taxativa Art.393 §1º (2306)", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible(["2306.10.00"], ["4639-7/01"]);
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("ncm_cnae_not_in_art_393");
  });

  it("C3: IS INJETA quando NCM 2710.19.21 (diesel, cap. 27 — controle positivo)", () => {
    process.env.ENABLE_NCM_RESOLVER = "true";
    const r = isImpostoSeletivoEligible(["2710.19.21"], []);
    expect(r.eligible).toBe(true);
  });

  // ── Art. 197 (máquinas agrícolas) ──────────────────────────────────────────
  it("C4: Art.197 INJETA quando NCM 8436 (grupo) + CNAE 28 (controle positivo)", () => {
    // destinatário PF não-contribuinte é fator multifatorial (D0-JUR), avaliado fora deste gate
    expect(shouldInjectArt197(["2833-0/00"], ["8436"])).toBe(true);
    expect(shouldInjectArt197(["2833-0/00"], ["8436.99.00"])).toBe(true); // específico também
  });

  it("C5: Art.197 NÃO injeta quando NCM ausente", () => {
    expect(shouldInjectArt197(["2833-0/00"], [])).toBe(false);
  });

  // ── Cesta básica (Anexo I) — específico obrigatório ────────────────────────
  it("C6: cesta básica aliquota_zero requer NCM específico do Anexo I (grupo NÃO basta)", () => {
    // grupo 1006 → 'group' + regime pendente (NÃO aliquota_zero)
    const grupo = classifyResolution("1006", RULES);
    expect(grupo.resolution_level).toBe("group");
    expect(grupo.regime).not.toBe("aliquota_zero");
    // específico 1006.30.21 (subitem Anexo I) → 'specific' + aliquota_zero
    const especifico = classifyResolution("1006.30.21", RULES);
    expect(especifico.resolution_level).toBe("specific");
    expect(especifico.regime).toBe("aliquota_zero");
  });

  // ── Resolver — grupo não cai em fallback ───────────────────────────────────
  it("C7: NCM grupo 8436 → resolution_level 'group', NÃO 'fallback'", () => {
    const r = classifyResolution("8436", RULES);
    expect(r.resolution_level).toBe("group");
    expect(r.resolution_level).not.toBe("fallback");
    expect(r.source).toBe("normative_rules");
  });
});
