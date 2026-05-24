/**
 * p2b-credito-presumido-gaps-filter.test.ts — P2-B (#1203)
 * Contrato do filtro de gaps usado pelo briefingEngine (BriefingEngineView).
 * Runtime (BriefingEngineView sem credito_presumido) = smoke Manus.
 */
import { describe, it, expect } from "vitest";
import { filterCreditoPresumidoGaps } from "./credito-presumido-eligibility";

const gaps = [
  { requirement_code: "REQ-CRE-001", risk_category_code: "credito_presumido" },
  { requirement_code: "REQ-SP-001", risk_category_code: "split_payment" },
  { requirement_code: "REQ-CRE-002", risk_category_code: "credito_presumido" },
  { requirement_code: "REQ-INS-001", risk_category_code: "inscricao_cadastral" },
];

describe("P2-B — filterCreditoPresumidoGaps", () => {
  it("não elegível → remove credito_presumido, mantém os demais", () => {
    const out = filterCreditoPresumidoGaps(gaps, false);
    expect(out.some((g) => g.risk_category_code === "credito_presumido")).toBe(false);
    expect(out).toHaveLength(2);
    expect(out.map((g) => g.risk_category_code).sort()).toEqual(["inscricao_cadastral", "split_payment"]);
  });

  it("elegível → mantém todos os gaps (inclusive credito_presumido)", () => {
    const out = filterCreditoPresumidoGaps(gaps, true);
    expect(out).toHaveLength(4);
    expect(out.some((g) => g.risk_category_code === "credito_presumido")).toBe(true);
  });

  it("não regride outras categorias (split_payment/inscricao_cadastral sempre presentes)", () => {
    for (const eligible of [true, false]) {
      const out = filterCreditoPresumidoGaps(gaps, eligible);
      expect(out.some((g) => g.risk_category_code === "split_payment")).toBe(true);
      expect(out.some((g) => g.risk_category_code === "inscricao_cadastral")).toBe(true);
    }
  });

  it("array vazio → vazio (sem crash)", () => {
    expect(filterCreditoPresumidoGaps([], false)).toEqual([]);
  });
});
