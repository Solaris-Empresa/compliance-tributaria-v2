/**
 * Tests — Issue #136: fonte_risco_tipo no RiskItemSchema
 * Testes unitários de estrutura — zero banco, zero LLM
 */
import { describe, it, expect } from "vitest";
import { RiskItemSchema } from "./ai-schemas";

const baseRisk = {
  id: "r1",
  evento: "Risco de compliance tributário",
  evidencia_regulatoria: "Art. 18 LC 214/2025",
  fonte_risco: "LC 214/2025, Art. 18",
  probabilidade: "Alta",
  impacto: "Alto",
  severidade: "Crítica",
  severidade_score: 9,
};

describe("Issue #136 — fonte_risco_tipo no RiskItemSchema", () => {
  it("aceita fonte_risco_tipo = regulatorio", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      fonte_risco_tipo: "regulatorio",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco_tipo).toBe("regulatorio");
    }
  });

  it("aceita fonte_risco_tipo = solaris", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      fonte_risco_tipo: "solaris",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco_tipo).toBe("solaris");
    }
  });

  it("aceita fonte_risco_tipo = ia_gen", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      fonte_risco_tipo: "ia_gen",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco_tipo).toBe("ia_gen");
    }
  });

  it("default de fonte_risco_tipo é ia_gen quando ausente", () => {
    const result = RiskItemSchema.safeParse(baseRisk);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco_tipo).toBe("ia_gen");
    }
  });

  it("rejeita fonte_risco_tipo com valor inválido (usa catch → ia_gen)", () => {
    // O schema usa .optional().default("ia_gen") — valor inválido não é aceito
    // Zod enum sem .catch() rejeita valores inválidos
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      fonte_risco_tipo: "invalido",
    });
    // Deve falhar — enum sem catch
    expect(result.success).toBe(false);
  });

  it("mantém compatibilidade retroativa — fonte_risco string livre ainda funciona", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      fonte_risco: "LC 214/2025, Art. 18 — texto livre",
      fonte_risco_tipo: "regulatorio",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fonte_risco).toBe("LC 214/2025, Art. 18 — texto livre");
    }
  });

  it("INV-006: risco sem fonte_risco_tipo usa default ia_gen (não é inválido)", () => {
    const result = RiskItemSchema.safeParse({
      ...baseRisk,
      // fonte_risco_tipo ausente
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // INV-006: default ia_gen é válido — risco sem origem explícita é ia_gen
      expect(result.data.fonte_risco_tipo).toBe("ia_gen");
    }
  });
});
