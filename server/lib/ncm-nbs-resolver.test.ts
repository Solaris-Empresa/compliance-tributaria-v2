// ncm-nbs-resolver.test.ts — GATE-NCM-NBS #1219 F2 (ADR-0035)
// Testa o núcleo PURO classifyResolution (sem DB — Lição #65).
// resolveNcm/resolveNbs (async) são wrappers finos que carregam regras + chamam o core.

import { describe, it, expect } from "vitest";
import { dbDescribe } from "../test-helpers";
import {
  classifyResolution,
  resolveNcm,
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

// ─── #1492 (ADR-0035 §10) — precedência negativa / exclusion list (núcleo PURO) ──
// Fixture: específico 1006.10 desativado (active=0) + grupo pai 1006 ativo (active=1).
const NCM_BLACKLIST: ResolverRule[] = [
  { regime: "sem_beneficio", code: "1006.10", match_mode: "exact", active: 0 },
  { regime: "cesta_basica_pendente", code: "1006", match_mode: "prefix", active: 1 },
];

describe("classifyResolution — precedência negativa (#1492)", () => {
  it("específico active=0 SOMBREIA o grupo pai active=1 (1006.10)", () => {
    const r = classifyResolution("1006.10", NCM_BLACKLIST);
    expect(r.source).toBe("negative_precedence");
    expect(r.resolution_level).toBe("specific");
    expect(r.resolved_code).toBe("1006.10");
    expect(r.regime).toBe("sem_beneficio");
  });

  it("NEGATIVO (REGRA-ORQ-44): 1006.10 NÃO retorna cesta_basica_pendente", () => {
    expect(classifyResolution("1006.10", NCM_BLACKLIST).regime).not.toBe(
      "cesta_basica_pendente",
    );
  });

  it("regime vazio na regra inativa → regime_geral", () => {
    const rules: ResolverRule[] = [
      { regime: "", code: "1006.10", match_mode: "exact", active: 0 },
      { regime: "cesta_basica_pendente", code: "1006", match_mode: "prefix", active: 1 },
    ];
    const r = classifyResolution("1006.10", rules);
    expect(r.source).toBe("negative_precedence");
    expect(r.regime).toBe("regime_geral");
  });

  it("anti-regressão: irmão NÃO blacklistado (1006.20) cai no grupo pai ativo", () => {
    const r = classifyResolution("1006.20", NCM_BLACKLIST);
    expect(r.source).toBe("normative_rules");
    expect(r.resolution_level).toBe("group");
    expect(r.regime).toBe("cesta_basica_pendente");
  });

  it("anti-regressão: vencedor active=1 explícito segue caminho normal", () => {
    const rules: ResolverRule[] = [
      { regime: "tratamento_agropecuario", code: "8436.99.00", match_mode: "exact", active: 1 },
    ];
    const r = classifyResolution("8436.99.00", rules);
    expect(r.source).toBe("normative_rules");
    expect(r.resolution_level).toBe("specific");
  });

  it("anti-regressão: active ausente (pré-#1492) = caminho normal", () => {
    // NCM_RULES não tem campo active → undefined → nunca dispara precedência negativa
    const r = classifyResolution("8436.99.00", NCM_RULES);
    expect(r.source).toBe("normative_rules");
  });
});

// ─── DoD §10.5 com DB real (dbDescribe — roda no Manus; skip sem DATABASE_URL) ──
dbDescribe("resolveNcm — DoD #1492 (DB real)", () => {
  it("POSITIVO: resolveNcm('1006.10') → sem_beneficio | regime_geral", async () => {
    const r = await resolveNcm("1006.10");
    expect(["sem_beneficio", "regime_geral"]).toContain(r.regime);
  });

  it("NEGATIVO: resolveNcm('1006.10') NÃO retorna cesta_basica_pendente", async () => {
    const r = await resolveNcm("1006.10");
    expect(r.regime).not.toBe("cesta_basica_pendente");
  });

  it("anti-regressão: resolveNcm('1006.20') → aliquota_zero (active=1 intacto)", async () => {
    const r = await resolveNcm("1006.20");
    expect(r.regime).toBe("aliquota_zero");
  });
});

// ─── DoD #1493 — subposição 2304.00 (DB real; requer scripts/fix-2304-00-*-1493.ts) ──
// Manus roda o script de dados ANTES destes testes (INSERT 2304.00 + UPDATE legal_ref).
dbDescribe("resolveNcm — DoD #1493 (2304.00, DB real)", () => {
  it("POSITIVO: resolveNcm('2304.00') → aliquota_reduzida_60", async () => {
    const r = await resolveNcm("2304.00");
    expect(r.regime).toBe("aliquota_reduzida_60");
  });

  it("NEGATIVO: resolveNcm('2304.00') ≠ tratamento_agropecuario_especifico_pendente", async () => {
    const r = await resolveNcm("2304.00");
    expect(r.regime).not.toBe("tratamento_agropecuario_especifico_pendente");
  });

  it("anti-regressão: resolveNcm('2304.00.10') → aliquota_reduzida_60 (regime intacto)", async () => {
    const r = await resolveNcm("2304.00.10");
    expect(r.regime).toBe("aliquota_reduzida_60");
  });

  it("anti-regressão: resolveNcm('2304') → tratamento_agropecuario_especifico_pendente (grupo prefix intacto)", async () => {
    const r = await resolveNcm("2304");
    expect(r.regime).toBe("tratamento_agropecuario_especifico_pendente");
  });
});
