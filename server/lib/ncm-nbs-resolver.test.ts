// ncm-nbs-resolver.test.ts — GATE-NCM-NBS #1219 F2 (ADR-0035)
// Testa o núcleo PURO classifyResolution (sem DB — Lição #65).
// resolveNcm/resolveNbs (async) são wrappers finos que carregam regras + chamam o core.

import { describe, it, expect } from "vitest";
import {
  classifyResolution,
  isNcmResolverEnabled,
  CONFIDENCE_SPECIFIC,
  CONFIDENCE_GROUP,
  CONFIDENCE_CHAPTER,
  CONFIDENCE_FALLBACK,
  type ResolverRule,
} from "./ncm-nbs-resolver";

// Regras NCM representativas (espelham normative_product_rules: exact + prefix)
const NCM_RULES: ResolverRule[] = [
  { regime: "tratamento_agropecuario", code: "8436.99.00", match_mode: "exact" },
  { regime: "tratamento_agropecuario", code: "8436", match_mode: "prefix" },
  { regime: "imposto_seletivo", code: "84", match_mode: "prefix" },
];

// Regras NBS representativas (normative_service_rules: todas prefix + 1 exact de teste)
const NBS_RULES: ResolverRule[] = [
  { regime: "regime_especifico", code: "1.0501.11.10", match_mode: "exact" },
  { regime: "regime_especifico", code: "1.0501", match_mode: "prefix" },
];

describe("classifyResolution — NCM (cascata DoD F2)", () => {
  it("resolveNcm('8436.99.00') → specific", () => {
    const r = classifyResolution("8436.99.00", NCM_RULES);
    expect(r.resolution_level).toBe("specific");
    expect(r.regime).toBe("tratamento_agropecuario");
    expect(r.confidence).toBe(CONFIDENCE_SPECIFIC);
    expect(r.source).toBe("normative_rules");
  });

  it("resolveNcm('8436') → group", () => {
    const r = classifyResolution("8436", NCM_RULES);
    expect(r.resolution_level).toBe("group");
    expect(r.resolved_code).toBe("8436");
    expect(r.confidence).toBe(CONFIDENCE_GROUP);
  });

  it("resolveNcm('84') → chapter", () => {
    const r = classifyResolution("84", NCM_RULES);
    expect(r.resolution_level).toBe("chapter");
    expect(r.confidence).toBe(CONFIDENCE_CHAPTER);
  });

  it("resolveNcm('9999.99.99') → fallback", () => {
    const r = classifyResolution("9999.99.99", NCM_RULES);
    expect(r.resolution_level).toBe("fallback");
    expect(r.regime).toBe("regime_geral");
    expect(r.confidence).toBe(CONFIDENCE_FALLBACK);
    expect(r.source).toBe("fallback");
  });

  it("vencedor é a regra mais específica (exact > prefix de grupo)", () => {
    // "8436.99.00" casa tanto o exact quanto o prefix "8436" → vence o exact
    const r = classifyResolution("8436.99.00", NCM_RULES);
    expect(r.resolved_code).toBe("8436.99.00");
  });
});

describe("classifyResolution — NBS (cascata DoD F2)", () => {
  it("resolveNbs('1.0501.11.10') → specific", () => {
    const r = classifyResolution("1.0501.11.10", NBS_RULES);
    expect(r.resolution_level).toBe("specific");
    expect(r.resolved_code).toBe("1.0501.11.10");
  });

  it("resolveNbs('1.0501') → group", () => {
    const r = classifyResolution("1.0501", NBS_RULES);
    expect(r.resolution_level).toBe("group");
    expect(r.confidence).toBe(CONFIDENCE_GROUP);
  });

  it("resolveNbs('9.9999') → fallback", () => {
    const r = classifyResolution("9.9999", NBS_RULES);
    expect(r.resolution_level).toBe("fallback");
    expect(r.source).toBe("fallback");
  });
});

describe("isNcmResolverEnabled — feature flag (ADR-0035 §6)", () => {
  it("respeita ENABLE_NCM_RESOLVER", () => {
    const prev = process.env.ENABLE_NCM_RESOLVER;
    process.env.ENABLE_NCM_RESOLVER = "true";
    expect(isNcmResolverEnabled()).toBe(true);
    process.env.ENABLE_NCM_RESOLVER = "false";
    expect(isNcmResolverEnabled()).toBe(false);
    delete process.env.ENABLE_NCM_RESOLVER;
    expect(isNcmResolverEnabled()).toBe(false); // default = desligado
    if (prev !== undefined) process.env.ENABLE_NCM_RESOLVER = prev;
  });
});

describe("classifyResolution — edge cases", () => {
  it("código vazio sem regra → fallback", () => {
    expect(classifyResolution("", NCM_RULES).resolution_level).toBe("fallback");
  });
  it("conjunto de regras vazio → fallback", () => {
    expect(classifyResolution("8436", []).resolution_level).toBe("fallback");
  });
});
