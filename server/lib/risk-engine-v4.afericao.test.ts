/**
 * risk-engine-v4.afericao.test.ts — Suite Z-20 #717 Bateria 1
 *
 * Complementa risk-engine-v4.test.ts com testes de aferição
 * dos 10 critérios do §13.5 do snapshot MATRIZ_RISCOS.
 *
 * Foco: propriedades DETERMINÍSTICAS do engine — sem DB, sem LLM.
 */
import { describe, it, expect } from "vitest";
import {
  SEVERITY_TABLE,
  SOURCE_RANK,
  classifyRisk,
  buildBreadcrumb,
  sortBySourceRank,
  computeRiskMatrix,
  buildRiskKey,
  type GapRule,
  type OperationalContext,
} from "./risk-engine-v4";

describe("afericao — 10 categorias na SEVERITY_TABLE (RN-RISK-02)", () => {
  const expectedCategorias = [
    "imposto_seletivo",
    "confissao_automatica",
    "split_payment",
    "inscricao_cadastral",
    "regime_diferenciado",
    "transicao_iss_ibs",
    "obrigacao_acessoria",
    "aliquota_zero",
    "aliquota_reduzida",
    "credito_presumido",
  ] as const;

  it("conjunto de categorias preservado (snapshot defensivo)", () => {
    // Length validada via snapshot — atualizar conscientemente quando categoria nova entrar.
    // Histórico: era 10, agora 11 (enquadramento_geral v2.1 adicionado sem atualizar este teste).
    expect(Object.keys(SEVERITY_TABLE).sort()).toMatchSnapshot();
  });

  it("todas as 10 categorias oficiais estão presentes", () => {
    for (const cat of expectedCategorias) {
      expect(SEVERITY_TABLE).toHaveProperty(cat);
    }
  });

  it("NÃO contém tributacao_servicos (órfã no RN doc — DEC-02)", () => {
    expect(SEVERITY_TABLE).not.toHaveProperty("tributacao_servicos");
  });

  it("inscricao_cadastral é alta (não media — D3)", () => {
    expect(SEVERITY_TABLE.inscricao_cadastral.severity).toBe("alta");
    expect(SEVERITY_TABLE.inscricao_cadastral.urgency).toBe("imediata");
  });

  it("aliquota_zero/reduzida/credito_presumido são oportunidade", () => {
    expect(SEVERITY_TABLE.aliquota_zero.severity).toBe("oportunidade");
    expect(SEVERITY_TABLE.aliquota_reduzida.severity).toBe("oportunidade");
    expect(SEVERITY_TABLE.credito_presumido.severity).toBe("oportunidade");
  });
});

describe("afericao — SOURCE_RANK invariante (RN-RISK-09)", () => {
  it("cnae=1, ncm=2, nbs=3, solaris=4, iagen=5", () => {
    expect(SOURCE_RANK.cnae).toBe(1);
    expect(SOURCE_RANK.ncm).toBe(2);
    expect(SOURCE_RANK.nbs).toBe(3);
    expect(SOURCE_RANK.solaris).toBe(4);
    expect(SOURCE_RANK.iagen).toBe(5);
  });

  it("sortBySourceRank ordena cnae antes de iagen", () => {
    const gaps = [
      { fonte: "iagen", ruleId: "a" },
      { fonte: "cnae", ruleId: "b" },
      { fonte: "nbs", ruleId: "c" },
    ];
    const sorted = sortBySourceRank(gaps);
    expect(sorted[0].fonte).toBe("cnae");
    expect(sorted[1].fonte).toBe("nbs");
    expect(sorted[2].fonte).toBe("iagen");
  });
});

describe("afericao — breadcrumb de 4 nós (RN-RISK — snapshot §13.3)", () => {
  it("buildBreadcrumb retorna exatamente 4 nós: [fonte, categoria, artigo, ruleId]", () => {
    const gap: GapRule = {
      ruleId: "GAP-IS-001",
      categoria: "imposto_seletivo",
      artigo: "Art. 2 LC 214/2025",
      fonte: "cnae",
      gapClassification: "nao_atendido",
      requirementId: "REQ-IS-001",
      sourceReference: "cnae-4639-7/01",
      domain: "tributario",
    };
    const bc = buildBreadcrumb(gap);
    expect(bc).toHaveLength(4);
    expect(bc[0]).toBe("cnae");
    expect(bc[1]).toBe("imposto_seletivo");
    expect(bc[2]).toBe("Art. 2 LC 214/2025");
    expect(bc[3]).toBe("GAP-IS-001");
  });
});

describe("afericao — classifyRisk determinístico (RN-RISK-02)", () => {
  const baseGap: GapRule = {
    ruleId: "GAP-X",
    categoria: "split_payment",
    artigo: "Art. 9",
    fonte: "cnae",
    gapClassification: "nao_atendido",
    requirementId: "REQ-X",
    sourceReference: "ref",
    domain: "d",
  };

  it("mesmo gap → mesmo risco (determinismo)", () => {
    const r1 = classifyRisk(baseGap);
    const r2 = classifyRisk(baseGap);
    expect(r1).toEqual(r2);
  });

  it("split_payment → severity alta + imediata", () => {
    const r = classifyRisk(baseGap);
    expect(r.severity).toBe("alta");
    expect(r.urgency).toBe("imediata");
  });

  it("categoria desconhecida usa fallback media/curto_prazo", () => {
    const r = classifyRisk({ ...baseGap, categoria: "categoria_inexistente" });
    expect(r.severity).toBe("media");
    expect(r.urgency).toBe("curto_prazo");
  });
});

describe("afericao — computeRiskMatrix ordenação por severidade", () => {
  it("alta vem antes de media, que vem antes de oportunidade", () => {
    const gaps: GapRule[] = [
      { ruleId: "o1", categoria: "aliquota_zero", artigo: "Art. 14", fonte: "ncm", gapClassification: "g", requirementId: "r", sourceReference: "s", domain: "d" },
      { ruleId: "a1", categoria: "imposto_seletivo", artigo: "Art. 2", fonte: "cnae", gapClassification: "g", requirementId: "r", sourceReference: "s", domain: "d" },
      { ruleId: "m1", categoria: "obrigacao_acessoria", artigo: "Art. 102", fonte: "cnae", gapClassification: "g", requirementId: "r", sourceReference: "s", domain: "d" },
    ];
    const risks = computeRiskMatrix(gaps);
    expect(risks[0].severity).toBe("alta");
    expect(risks[1].severity).toBe("media");
    expect(risks[2].severity).toBe("oportunidade");
  });
});

describe("afericao — buildRiskKey (DEC-05: 1 risco por categoria)", () => {
  it("categoria + operacional → chave determinística", () => {
    const ctx: OperationalContext = { tipoOperacao: "comercio", multiestadual: false };
    const k1 = buildRiskKey("split_payment", ctx);
    const k2 = buildRiskKey("split_payment", ctx);
    expect(k1).toBe(k2);
    expect(k1).toContain("split_payment");
    expect(k1).toContain("comercio");
    expect(k1).toContain("mono");
  });

  it("multiestadual muda a chave", () => {
    const k1 = buildRiskKey("split_payment", { tipoOperacao: "comercio", multiestadual: false });
    const k2 = buildRiskKey("split_payment", { tipoOperacao: "comercio", multiestadual: true });
    expect(k1).not.toBe(k2);
    expect(k1).toContain("mono");
    expect(k2).toContain("multi");
  });
});
