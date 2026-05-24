/**
 * regime-imoveis-eligibility.test.ts — FEAT-COB-01 (#1176)
 *
 * Funções puras de elegibilidade do regime específico de bens imóveis (Arts. 251-270).
 * Gate por CNAE (D2 — automático, Art. 360 V + §13 / Art. 263 V). Sem DB, sem cnaeAnswers.
 * Formato de CNAE no perfil: "XXXX-X/YY" (ex: "4120-4/00") — project-profile-extractor.
 */
import { describe, it, expect } from "vitest";
import {
  isRegimeImoveisOportunidade,
  isRegimeImoveisLocacao,
  isRegimeImoveisRisco,
  buildRegimeImoveisRestriction,
  filterRegimeImoveisGaps,
} from "./regime-imoveis-eligibility";

describe("isRegimeImoveisOportunidade (50% — Art. 261 caput)", () => {
  it("4120 (construção de edifícios) → true", () => {
    expect(isRegimeImoveisOportunidade(["4120-4/00"])).toBe(true);
  });
  it("4110 (incorporação) → true", () => {
    expect(isRegimeImoveisOportunidade(["4110-7/00"])).toBe(true);
  });
  it("4121 (rodovias — automático por §13, N1.5) → true", () => {
    expect(isRegimeImoveisOportunidade(["4121-6/00"])).toBe(true);
  });
  it("6810-2/01 (venda própria — alienante Art. 263 I) → true", () => {
    expect(isRegimeImoveisOportunidade(["6810-2/01"])).toBe(true);
  });
  it("6821-8/01 (intermediação Art. 263 VI) → true", () => {
    expect(isRegimeImoveisOportunidade(["6821-8/01"])).toBe(true);
  });
  it("6810-2/02 (locação → é 70%, NÃO oportunidade geral 50%) → false", () => {
    expect(isRegimeImoveisOportunidade(["6810-2/02"])).toBe(false);
  });
  it("7112 (engenharia — excluída por §13/serviço profissional) → false", () => {
    expect(isRegimeImoveisOportunidade(["7112-0/00"])).toBe(false);
  });
  it("comércio (4711) → false", () => {
    expect(isRegimeImoveisOportunidade(["4711-3/02"])).toBe(false);
  });
  it("vazio → false", () => {
    expect(isRegimeImoveisOportunidade([])).toBe(false);
  });
});

describe("isRegimeImoveisLocacao (70% — Art. 261 parágrafo único)", () => {
  it("6810-2/02 (aluguel de imóveis próprios) → true", () => {
    expect(isRegimeImoveisLocacao(["6810-2/02"])).toBe(true);
  });
  it("6810-2/01 (venda própria — é 50%, não locação) → false", () => {
    expect(isRegimeImoveisLocacao(["6810-2/01"])).toBe(false);
  });
  it("4120 (construção) → false", () => {
    expect(isRegimeImoveisLocacao(["4120-4/00"])).toBe(false);
  });
  it("vazio → false", () => {
    expect(isRegimeImoveisLocacao([])).toBe(false);
  });
});

describe("isRegimeImoveisRisco (Arts. 269-270 — toda construtora 41xx)", () => {
  it("4120 → true", () => {
    expect(isRegimeImoveisRisco(["4120-4/00"])).toBe(true);
  });
  it("4110 → true", () => {
    expect(isRegimeImoveisRisco(["4110-7/00"])).toBe(true);
  });
  it("4121 → true", () => {
    expect(isRegimeImoveisRisco(["4121-6/00"])).toBe(true);
  });
  it("6810 (imobiliária — não é 41xx, não executa obra) → false", () => {
    expect(isRegimeImoveisRisco(["6810-2/01"])).toBe(false);
  });
  it("comércio (4711) → false", () => {
    expect(isRegimeImoveisRisco(["4711-3/02"])).toBe(false);
  });
  it("vazio → false", () => {
    expect(isRegimeImoveisRisco([])).toBe(false);
  });
});

describe("multi-CNAE (combinações reais)", () => {
  it("locadora pura [6810-2/02]: locacao=true, oportunidade=false, risco=false", () => {
    const cnaes = ["6810-2/02"];
    expect(isRegimeImoveisLocacao(cnaes)).toBe(true);
    expect(isRegimeImoveisOportunidade(cnaes)).toBe(false);
    expect(isRegimeImoveisRisco(cnaes)).toBe(false);
  });
  it("construtora 4120 (1620001): oportunidade=true + risco=true (independe de venda)", () => {
    const cnaes = ["4120-4/00"];
    expect(isRegimeImoveisOportunidade(cnaes)).toBe(true);
    expect(isRegimeImoveisRisco(cnaes)).toBe(true);
  });
  it("imobiliária com venda E locação [6810-2/01, 6810-2/02]: oportunidade=true E locacao=true", () => {
    const cnaes = ["6810-2/01", "6810-2/02"];
    expect(isRegimeImoveisOportunidade(cnaes)).toBe(true);
    expect(isRegimeImoveisLocacao(cnaes)).toBe(true);
  });
});

describe("buildRegimeImoveisRestriction (prompt do briefing)", () => {
  it("não elegível (comércio) → restrição imperativa de supressão", () => {
    const r = buildRegimeImoveisRestriction(["4711-3/02"], null);
    expect(r).toContain("RESTRIÇÃO NORMATIVA OBRIGATÓRIA");
    expect(r).toContain("NÃO se aplica");
  });
  it("Simples Nacional + construtora 4120 → suprime (regime regular, Art. 251)", () => {
    const r = buildRegimeImoveisRestriction(["4120-4/00"], "simples_nacional");
    expect(r).toContain("RESTRIÇÃO NORMATIVA OBRIGATÓRIA");
  });
  it("construtora 4120 (regime não-SN) → diretriz cita 50% E Arts. 269 e 270, NÃO 70%", () => {
    const r = buildRegimeImoveisRestriction(["4120-4/00"], null);
    expect(r).toContain("DIRETRIZ NORMATIVA OBRIGATÓRIA");
    expect(r).toContain("50%");
    expect(r).toContain("Arts. 269 e 270");
    expect(r).not.toContain("70%");
    expect(r).not.toContain("NÃO mencione");
  });
  it("locadora 6810-2/02 → diretriz cita 70%, NÃO 50%, NÃO risco (68xx ≠ 41xx)", () => {
    const r = buildRegimeImoveisRestriction(["6810-2/02"], "lucro_presumido");
    expect(r).toContain("DIRETRIZ NORMATIVA OBRIGATÓRIA");
    expect(r).toContain("70%");
    expect(r).not.toContain("50%");
    expect(r).not.toContain("269");
  });
});

describe("filterRegimeImoveisGaps (BriefingEngineView — defensivo)", () => {
  const g = (rc: string) => ({ id: rc, risk_category_code: rc });

  it("comércio (não elegível): remove os 3 gaps de imóveis, mantém os demais", () => {
    const gaps = [
      g("regime_especifico_imoveis"),
      g("regime_especifico_imoveis_locacao"),
      g("risco_art_269_270"),
      g("split_payment"),
    ];
    const out = filterRegimeImoveisGaps(gaps, ["4711-3/02"], null);
    expect(out.map((x) => x.risk_category_code)).toEqual(["split_payment"]);
  });

  it("construtora 4120: mantém oportunidade 50% + risco, remove locação 70%", () => {
    const gaps = [
      g("regime_especifico_imoveis"),
      g("regime_especifico_imoveis_locacao"),
      g("risco_art_269_270"),
    ];
    const out = filterRegimeImoveisGaps(gaps, ["4120-4/00"], null).map((x) => x.risk_category_code);
    expect(out).toContain("regime_especifico_imoveis");
    expect(out).toContain("risco_art_269_270");
    expect(out).not.toContain("regime_especifico_imoveis_locacao");
  });

  it("Simples Nacional construtora: remove todos os 3", () => {
    const gaps = [g("regime_especifico_imoveis"), g("risco_art_269_270")];
    const out = filterRegimeImoveisGaps(gaps, ["4120-4/00"], "simples_nacional");
    expect(out).toHaveLength(0);
  });

  it("gap sem risk_category_code é sempre mantido", () => {
    const gaps = [{ id: "x", risk_category_code: null }];
    expect(filterRegimeImoveisGaps(gaps, ["4711-3/02"], null)).toHaveLength(1);
  });
});
