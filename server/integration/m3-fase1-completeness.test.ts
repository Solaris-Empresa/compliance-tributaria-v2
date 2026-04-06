/**
 * M3 Fase 1 — Testes obrigatórios do Consolidador de Completude Diagnóstica
 *
 * DEC-M3-01: contrato DiagnosticCompleteness aprovado pelo P.O. 2026-04-06
 * 17 casos mínimos conforme especificação do Orquestrador
 */
import { describe, it, expect } from "vitest";
import {
  inferCompanyType,
  evaluateSourceStatus,
  computeCompleteness,
} from "../lib/completeness";

// ─── Helpers de teste ─────────────────────────────────────────────────────────

const makeEvalData = (overrides: Partial<{
  solarisAnswersCount: number;
  iagenAnswersCount: number;
  diagnosticStatus: { corporate: string; operational: string; cnae: string } | null;
  operationProfile: unknown;
  ncmCodesCount: number;
  nbsCodesCount: number;
  companyType: "produto" | "servico" | "misto";
}> = {}) => ({
  solarisAnswersCount: 0,
  iagenAnswersCount: 0,
  diagnosticStatus: null,
  operationProfile: null,
  ncmCodesCount: 0,
  nbsCodesCount: 0,
  companyType: "misto" as const,
  ...overrides,
});

const allCompleted = {
  corporate: "completed",
  operational: "completed",
  cnae: "completed",
};

// ─── inferCompanyType ─────────────────────────────────────────────────────────

describe("inferCompanyType", () => {
  // Caso 1: operationType='produto' → 'produto'
  it("1. operationType='produto' → 'produto'", () => {
    expect(inferCompanyType({ operationType: "produto" })).toBe("produto");
  });

  // Caso 2: operationType='servico' → 'servico'
  it("2. operationType='servico' → 'servico'", () => {
    expect(inferCompanyType({ operationType: "servico" })).toBe("servico");
  });

  // Caso 3: operationType='misto' → 'misto'
  it("3. operationType='misto' → 'misto'", () => {
    expect(inferCompanyType({ operationType: "misto" })).toBe("misto");
  });

  // Caso 4: operationProfile null + CNAE 4632 → 'produto' (prefixo 4)
  it("4. operationProfile null + CNAE 4632 → 'produto'", () => {
    expect(inferCompanyType(null, ["4632"])).toBe("produto");
  });

  // Caso 5: operationProfile null + CNAE 8599 → 'servico' (prefixo 8)
  it("5. operationProfile null + CNAE 8599 → 'servico'", () => {
    expect(inferCompanyType(null, ["8599"])).toBe("servico");
  });

  // Casos adicionais de robustez
  it("suporte defensivo: operationType='product' (inglês) → 'produto'", () => {
    expect(inferCompanyType({ operationType: "product" })).toBe("produto");
  });

  it("suporte defensivo: operationType='service' (inglês) → 'servico'", () => {
    expect(inferCompanyType({ operationType: "service" })).toBe("servico");
  });

  it("suporte defensivo: operationType='mixed' (inglês) → 'misto'", () => {
    expect(inferCompanyType({ operationType: "mixed" })).toBe("misto");
  });

  it("operationType='industria' → 'produto'", () => {
    expect(inferCompanyType({ operationType: "industria" })).toBe("produto");
  });

  it("fallback conservador: operationProfile null + sem CNAEs → 'misto'", () => {
    expect(inferCompanyType(null, [])).toBe("misto");
  });
});

// ─── evaluateSourceStatus ─────────────────────────────────────────────────────

describe("evaluateSourceStatus", () => {
  // Caso 6: SOLARIS: 0 respostas → 'nao_iniciado'
  it("6. SOLARIS: 0 respostas → 'nao_iniciado'", () => {
    expect(evaluateSourceStatus("solaris", makeEvalData({ solarisAnswersCount: 0 }))).toBe("nao_iniciado");
  });

  // Caso 7: SOLARIS: 12 respostas → 'suficiente'
  it("7. SOLARIS: 12 respostas → 'suficiente'", () => {
    expect(evaluateSourceStatus("solaris", makeEvalData({ solarisAnswersCount: 12 }))).toBe("suficiente");
  });

  // Caso 8: SOLARIS: 24 respostas → 'completo'
  it("8. SOLARIS: 24 respostas → 'completo'", () => {
    expect(evaluateSourceStatus("solaris", makeEvalData({ solarisAnswersCount: 24 }))).toBe("completo");
  });

  // Caso 9: NCM: companyType='servico' → 'nao_aplicavel'
  it("9. NCM: companyType='servico' → 'nao_aplicavel'", () => {
    expect(evaluateSourceStatus("ncm", makeEvalData({ companyType: "servico", ncmCodesCount: 0 }))).toBe("nao_aplicavel");
  });

  // Caso 10: NCM: companyType='produto', 1 código → 'completo'
  it("10. NCM: companyType='produto', 1 código → 'completo'", () => {
    expect(evaluateSourceStatus("ncm", makeEvalData({ companyType: "produto", ncmCodesCount: 1 }))).toBe("completo");
  });

  // Casos adicionais de robustez
  it("SOLARIS: 1 resposta → 'iniciado'", () => {
    expect(evaluateSourceStatus("solaris", makeEvalData({ solarisAnswersCount: 1 }))).toBe("iniciado");
  });

  it("IAGEN: 0 respostas → 'nao_iniciado'", () => {
    expect(evaluateSourceStatus("iagen", makeEvalData({ iagenAnswersCount: 0 }))).toBe("nao_iniciado");
  });

  it("IAGEN: 3 respostas → 'completo'", () => {
    expect(evaluateSourceStatus("iagen", makeEvalData({ iagenAnswersCount: 3 }))).toBe("completo");
  });

  it("CORPORATE: diagnosticStatus null → 'nao_iniciado'", () => {
    expect(evaluateSourceStatus("corporate", makeEvalData({ diagnosticStatus: null }))).toBe("nao_iniciado");
  });

  it("CORPORATE: completed → 'completo'", () => {
    expect(evaluateSourceStatus("corporate", makeEvalData({
      diagnosticStatus: { corporate: "completed", operational: "not_started", cnae: "not_started" }
    }))).toBe("completo");
  });

  it("NBS: companyType='produto' → 'nao_aplicavel'", () => {
    expect(evaluateSourceStatus("nbs", makeEvalData({ companyType: "produto", nbsCodesCount: 0 }))).toBe("nao_aplicavel");
  });
});

// ─── computeCompleteness ─────────────────────────────────────────────────────

describe("computeCompleteness", () => {
  // Caso 11: zero respostas em todas as fontes → 'insuficiente'
  it("11. zero respostas em todas as fontes → 'insuficiente'", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 0,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: null,
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });
    expect(result.status).toBe("insuficiente");
    expect(result.completeness_score).toBe(0);
  });

  // Caso 12: SOLARIS suficiente, resto nao_iniciado → 'parcial'
  it("12. SOLARIS suficiente, resto nao_iniciado → 'parcial'", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 12,
      iagenAnswersCount: 0,
      diagnosticStatus: null,
      operationProfile: null,
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });
    expect(result.status).toBe("parcial");
    expect(result.missing_sources.length).toBeGreaterThan(0);
  });

  // Caso 13: todas fontes suficientes, NCM nao_aplicavel (serviço) → 'completo'
  it("13. todas fontes suficientes, NCM nao_aplicavel (serviço) → 'completo'", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: allCompleted,
      operationProfile: { operationType: "servico", principaisServicos: [{ nbs_code: "1.0101.00.00" }] },
      ncmCodesCount: 0,
      nbsCodesCount: 1,
    });
    expect(result.status).toBe("completo");
    expect(result.non_applicable_sources).toContain("ncm");
  });

  // Caso 14: todas fontes suficientes, NCM aplicável mas 0 códigos → 'parcial'
  it("14. todas fontes suficientes, NCM aplicável mas 0 códigos → 'parcial'", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: allCompleted,
      operationProfile: { operationType: "produto" },
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });
    expect(result.status).toBe("parcial");
    expect(result.missing_sources).toContain("ncm");
  });

  // Caso 15: todas fontes suficientes, NCM e NBS preenchidos (misto) → 'completo'
  it("15. todas fontes suficientes, NCM e NBS preenchidos (misto) → 'completo'", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: allCompleted,
      operationProfile: { operationType: "misto" },
      ncmCodesCount: 2,
      nbsCodesCount: 1,
    });
    expect(result.status).toBe("completo");
    expect(result.completeness_score).toBe(1);
  });
});

// ─── partiality_reasons ───────────────────────────────────────────────────────

describe("partiality_reasons", () => {
  // Caso 16: empresa de produto sem NCM → reasons inclui texto sobre NCM
  it("16. empresa de produto sem NCM → reasons inclui texto sobre NCM", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 24,
      iagenAnswersCount: 3,
      diagnosticStatus: allCompleted,
      operationProfile: { operationType: "produto" },
      ncmCodesCount: 0,
      nbsCodesCount: 0,
    });
    const hasNcmReason = result.partiality_reasons.some((r) =>
      r.toLowerCase().includes("ncm")
    );
    expect(hasNcmReason).toBe(true);
  });

  // Caso 17: SOLARIS não iniciado → reasons inclui texto sobre SOLARIS
  it("17. SOLARIS não iniciado → reasons inclui texto sobre SOLARIS", () => {
    const result = computeCompleteness({
      solarisAnswersCount: 0,
      iagenAnswersCount: 3,
      diagnosticStatus: allCompleted,
      operationProfile: { operationType: "servico", principaisServicos: [{ nbs_code: "1.0101.00.00" }] },
      ncmCodesCount: 0,
      nbsCodesCount: 1,
    });
    const hasSolarisReason = result.partiality_reasons.some((r) =>
      r.toLowerCase().includes("solaris")
    );
    expect(hasSolarisReason).toBe(true);
  });
});
