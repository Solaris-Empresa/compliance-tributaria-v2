// ncm-chapter-context.test.ts — GATE-NCM-NBS #1219 F6 (#1436)
// Testa a montagem da query RAG enriquecida (funções puras, sem DB).

import { describe, it, expect } from "vitest";
import { buildNcmQueryContext, buildNbsQueryContext } from "./ncm-chapter-context";

describe("buildNcmQueryContext — enriquecimento por capítulo NCM", () => {
  it("NCM 8436 (grupo) → termos de máquinas agrícolas (cap. 84), não só genérico", () => {
    const q = buildNcmQueryContext("8436");
    expect(q).toContain("NCM 8436");
    expect(q).toContain("máquinas equipamentos industriais agrícolas");
    expect(q).not.toBe("NCM 8436 IBS CBS reforma tributária LC 214"); // não é só genérico
  });

  it("NCM 8436.99.00 (específico) → mesmo capítulo 84 (comportamento preservado)", () => {
    const q = buildNcmQueryContext("8436.99.00");
    expect(q).toContain("NCM 8436.99.00");
    expect(q).toContain("máquinas equipamentos industriais agrícolas");
  });

  it("NCM 2710.19.21 (diesel) → combustíveis (cap. 27)", () => {
    expect(buildNcmQueryContext("2710.19.21")).toContain("combustíveis");
  });

  it("NCM 2306.10.00 (farelo soja) → rações insumos agropecuários (cap. 23)", () => {
    expect(buildNcmQueryContext("2306.10.00")).toContain("rações insumos agropecuários");
  });

  it("capítulo sem mapeamento (9999.99.99) → degrada graciosamente (sem quebrar)", () => {
    const q = buildNcmQueryContext("9999.99.99");
    expect(q).toContain("NCM 9999.99.99");
    expect(q).toContain("IBS CBS reforma tributária LC 214");
  });

  it("regime útil é incluído; regime_geral/fallback NÃO", () => {
    expect(buildNcmQueryContext("8436", "tratamento_bens_capital_agro_pendente")).toContain(
      "tratamento bens capital agro pendente",
    );
    expect(buildNcmQueryContext("8436", "regime_geral")).not.toContain("regime geral");
    expect(buildNcmQueryContext("8436", "fallback")).not.toContain("fallback");
  });
});

describe("buildNbsQueryContext — enriquecimento por divisão NBS", () => {
  it("NBS 1.0501 (grupo transporte) → divisão 1.05", () => {
    expect(buildNbsQueryContext("1.0501")).toContain("transporte cargas");
  });

  it("NBS 1.1501.10.00 (TI específico) → divisão 1.15", () => {
    expect(buildNbsQueryContext("1.1501.10.00")).toContain("tecnologia informação");
  });

  it("divisão sem mapeamento (9.9999) → degrada graciosamente", () => {
    const q = buildNbsQueryContext("9.9999");
    expect(q).toContain("NBS 9.9999");
    expect(q).toContain("IBS CBS reforma tributária LC 214");
  });
});
