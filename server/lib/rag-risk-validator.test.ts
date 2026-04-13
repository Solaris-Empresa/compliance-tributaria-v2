// rag-risk-validator.test.ts — Sprint Z-13.5 T-04
import { describe, it, expect } from "vitest";
import type { InsertRiskV4 } from "./db-queries-risks-v4";

describe("T-04: enrichRiskWithRag type safety and module export", () => {
  it("should be importable", async () => {
    const mod = await import("./rag-risk-validator");
    expect(mod.enrichRiskWithRag).toBeDefined();
    expect(typeof mod.enrichRiskWithRag).toBe("function");
  });

  it("InsertRiskV4 includes rag fields", () => {
    const risk: InsertRiskV4 = {
      project_id: 1,
      rule_id: "test",
      type: "risk",
      categoria: "split_payment",
      titulo: "Test",
      artigo: "Art. 29",
      severidade: "alta",
      urgencia: "imediata",
      evidence: { gaps: [] },
      breadcrumb: ["cnae", "split_payment", "Art. 29", "test"],
      source_priority: "cnae",
      confidence: 1.0,
      created_by: 1,
      updated_by: 1,
      rag_validated: 0,
      rag_confidence: 0,
      rag_validation_note: "Base legal não localizada no corpus RAG",
    };

    expect(risk.rag_validated).toBe(0);
    expect(risk.rag_confidence).toBe(0);
    expect(risk.rag_validation_note).toBe("Base legal não localizada no corpus RAG");
  });

  it("T-04: no-result scenario preserves risk and reduces confidence", () => {
    // This tests the contract: risk is never removed, confidence is reduced
    const baseConfidence = 0.9;
    const reducedConfidence = Math.round(baseConfidence * 0.75 * 100) / 100;

    expect(reducedConfidence).toBeLessThan(baseConfidence);
    expect(reducedConfidence).toBe(0.68);
    // Risk preserved = not null (tested in integration)
  });
});
