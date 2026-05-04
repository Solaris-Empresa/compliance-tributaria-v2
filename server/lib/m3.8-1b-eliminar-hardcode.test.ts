/**
 * m3.8-1b-eliminar-hardcode.test.ts
 * Sprint M3.8 — Item 1B — Eliminar hardcode "solaris" em 4 pontos
 *
 * Issue: #958
 * Spec: derivar sourceOrigin/source_priority de fonte real, não hardcoded "solaris".
 *
 * REGRA-ORQ-27 Plano B: leitura source code + regex match.
 * Tests funcionais (spy em runtime) cobertos por test integration de gap-to-rule-mapper.
 *
 * Vinculadas:
 * - PR #956 — Lições #62 (Contexto vs Evidência) e #63 (Spec ≠ Viável)
 * - Issue #957 — pré-requisito (question_source no Gap)
 * - Issue #958 (esta)
 * - REGRA-ORQ-32 (No Hardcode)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RISK_DASHBOARD_SRC = readFileSync(
  path.resolve(__dirname, "..", "..", "client", "src", "components", "RiskDashboardV4.tsx"),
  "utf-8",
);
const NORMATIVE_INFERENCE_SRC = readFileSync(
  path.resolve(__dirname, "normative-inference.ts"),
  "utf-8",
);
const GAP_TO_RULE_MAPPER_SRC = readFileSync(
  path.resolve(__dirname, "gap-to-rule-mapper.ts"),
  "utf-8",
);
const GAP_RISK_SCHEMAS_SRC = readFileSync(
  path.resolve(__dirname, "..", "schemas", "gap-risk.schemas.ts"),
  "utf-8",
);

describe("M3.8-1B — Schema GapInput.sourceOrigin ampliado", () => {
  it("enum sourceOrigin inclui 'regulatorio' (gap por ausência)", () => {
    expect(GAP_RISK_SCHEMAS_SRC).toMatch(/sourceOrigin.*z\.enum\(\[.*"regulatorio"/);
  });

  it("enum sourceOrigin inclui 'inferred' (riscos por gatilho semântico)", () => {
    expect(GAP_RISK_SCHEMAS_SRC).toMatch(/sourceOrigin.*z\.enum\(\[.*"inferred"/);
  });

  it("enum preserva valores legados (cnae/ncm/nbs/solaris/iagen)", () => {
    expect(GAP_RISK_SCHEMAS_SRC).toMatch(/sourceOrigin.*z\.enum\(\[.*"cnae".*"ncm".*"nbs".*"solaris".*"iagen"/);
  });
});

describe("M3.8-1B — Frontend RiskDashboardV4 deriva sourceOrigin", () => {
  it("não contém mais hardcode 'sourceOrigin: \"solaris\" as const'", () => {
    expect(RISK_DASHBOARD_SRC).not.toMatch(/sourceOrigin:\s*["']solaris["']\s+as\s+const/);
  });

  it("deriva sourceOrigin via função deriveSourceOrigin(g.question_source)", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/deriveSourceOrigin\(g\.question_source\)/);
  });

  it("deriveSourceOrigin mapeia 'qnbs_regulatorio' → 'regulatorio'", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/case\s+["']qnbs_regulatorio["']:\s*return\s+["']regulatorio["']/);
  });

  it("deriveSourceOrigin mapeia 'qcnae_onda3' → 'cnae'", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/case\s+["']qcnae_onda3["']:\s*return\s+["']cnae["']/);
  });

  it("deriveSourceOrigin mapeia 'iagen_onda2' → 'iagen'", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/case\s+["']iagen_onda2["']:\s*return\s+["']iagen["']/);
  });

  it("deriveSourceOrigin mapeia 'regulatory_only' → 'regulatorio'", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/case\s+["']regulatory_only["']:\s*return\s+["']regulatorio["']/);
  });

  it("default fallback = 'regulatorio' (não 'solaris')", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/default:\s*return\s+["']regulatorio["']/);
  });
});

describe("M3.8-1B — Backend normative-inference riscos inferidos", () => {
  it("source_priority = 'inferred' (não 'solaris')", () => {
    expect(NORMATIVE_INFERENCE_SRC).toMatch(/source_priority:\s*["']inferred["']/);
    expect(NORMATIVE_INFERENCE_SRC).not.toMatch(/source_priority:\s*["']solaris["']\s*as\s+any/);
  });

  it("breadcrumb usa 'inferred' como primeiro nó (não 'solaris')", () => {
    expect(NORMATIVE_INFERENCE_SRC).toMatch(/breadcrumb:\s*\[\s*["']inferred["']/);
    expect(NORMATIVE_INFERENCE_SRC).not.toMatch(/breadcrumb:\s*\[\s*["']solaris["']/);
  });
});

describe("M3.8-1B — Backend gap-to-rule-mapper inferFonte", () => {
  it("prioriza gap.sourceOrigin quando definido (preservado)", () => {
    expect(GAP_TO_RULE_MAPPER_SRC).toMatch(/if\s*\(\s*gap\.sourceOrigin\s*\)\s*return\s+gap\.sourceOrigin/);
  });

  it("fallback !allowLayerInference = 'regulatorio' (era 'solaris')", () => {
    expect(GAP_TO_RULE_MAPPER_SRC).toMatch(/if\s*\(\s*!allowLayerInference\s*\)\s*return\s+["']regulatorio["']/);
  });

  it("layer 'onda1' → 'solaris' (preservado — semanticamente correto)", () => {
    expect(GAP_TO_RULE_MAPPER_SRC).toMatch(/gap\.layer\s*===\s*["']onda1["']\s*\)\s*return\s+["']solaris["']/);
  });

  it("layer 'onda2' → 'iagen' (preservado)", () => {
    expect(GAP_TO_RULE_MAPPER_SRC).toMatch(/gap\.layer\s*===\s*["']onda2["']\s*\)\s*return\s+["']iagen["']/);
  });

  it("fallback final = 'regulatorio' (era 'solaris' hardcoded)", () => {
    // Última linha de inferFonte: deve retornar 'regulatorio', não 'solaris'
    const inferFonteMatch = GAP_TO_RULE_MAPPER_SRC.match(/function inferFonte[^}]+\}/s);
    expect(inferFonteMatch).toBeTruthy();
    if (inferFonteMatch) {
      // Conta returns "solaris" e returns "regulatorio" no corpo da função
      const solarisReturns = (inferFonteMatch[0].match(/return\s+["']solaris["']/g) ?? []).length;
      const regulatorioReturns = (inferFonteMatch[0].match(/return\s+["']regulatorio["']/g) ?? []).length;
      // Apenas 1 return "solaris" deve permanecer (gap.layer === "onda1")
      expect(solarisReturns).toBe(1);
      // Pelo menos 2 returns "regulatorio" (fallback default + fallback final)
      expect(regulatorioReturns).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("M3.8-1B — Comentários inline marcam REGRA-ORQ-32", () => {
  it("RiskDashboardV4 documenta M3.8-1B + Lição #62", () => {
    expect(RISK_DASHBOARD_SRC).toMatch(/M3\.8-1B/);
    expect(RISK_DASHBOARD_SRC).toMatch(/Contexto vs Evidência|REGRA-ORQ-32/);
  });

  it("normative-inference documenta M3.8-1B + REGRA-ORQ-32", () => {
    expect(NORMATIVE_INFERENCE_SRC).toMatch(/M3\.8-1B/);
    expect(NORMATIVE_INFERENCE_SRC).toMatch(/REGRA-ORQ-32/);
  });

  it("gap-to-rule-mapper documenta M3.8-1B + Lição #62", () => {
    expect(GAP_TO_RULE_MAPPER_SRC).toMatch(/M3\.8-1B/);
  });
});
