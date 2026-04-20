import { describe, it, expect } from "vitest";
import {
  classifyItemByArea,
  groupBriefingByArea,
  formatWhatsAppSummary,
  type BriefingLite,
} from "./briefing-areas";

describe("classifyItemByArea", () => {
  it("classifica fiscal por IBS/CBS/alíquota", () => {
    expect(classifyItemByArea("Aplicação incorreta da alíquota de IBS nas operações interestaduais")).toBe("fiscal");
    expect(classifyItemByArea("Base de cálculo da CBS")).toBe("fiscal");
    expect(classifyItemByArea("Crédito tributário não apurado")).toBe("fiscal");
  });

  it("classifica TI por ERP/Sped/NFe", () => {
    expect(classifyItemByArea("Parametrização do ERP para novos tributos")).toBe("ti");
    expect(classifyItemByArea("Integração com Sped Fiscal")).toBe("ti");
    expect(classifyItemByArea("Validação de campos em NF-e")).toBe("ti");
  });

  it("classifica contabilidade por escrituração/fato gerador", () => {
    expect(classifyItemByArea("Escrituração contábil da operação")).toBe("contabilidade");
    expect(classifyItemByArea("Reconhecimento contábil do passivo tributário")).toBe("contabilidade");
    expect(classifyItemByArea("Segregação contábil IBS/CBS")).toBe("contabilidade");
  });

  it("classifica legal por parecer/LC/Art.", () => {
    expect(classifyItemByArea("Parecer sobre interpretação do Art. 12")).toBe("legal");
    expect(classifyItemByArea("Contencioso administrativo em andamento")).toBe("legal");
    expect(classifyItemByArea("Aplicação de benefício fiscal municipal")).toBe("legal");
    expect(classifyItemByArea("LC 214/2025 exige cadastro")).toBe("legal");
  });

  it("classifica gestão por fluxo de caixa/estratégia", () => {
    expect(classifyItemByArea("Impacto no fluxo de caixa mensal")).toBe("gestao");
    expect(classifyItemByArea("Perda de competitividade no mercado atacadista")).toBe("gestao");
    expect(classifyItemByArea("Alinhamento estratégico com a diretoria")).toBe("gestao");
  });

  it("cai em genérico quando nenhuma keyword bate", () => {
    expect(classifyItemByArea("Texto genérico sem palavras-chave")).toBe("generico");
    expect(classifyItemByArea("")).toBe("generico");
  });
});

describe("groupBriefingByArea", () => {
  const structured: BriefingLite = {
    nivel_risco_geral: "alto",
    principais_gaps: [
      { gap: "Alíquota IBS incorreta", causa_raiz: "não parametrizado", urgencia: "imediata" },
      { gap: "Escrituração contábil defasada", causa_raiz: "sistema sem módulo" },
      { gap: "Parecer jurídico pendente", causa_raiz: "Art. 15 LC 214/2025" },
    ],
    oportunidades: ["Revisar ERP para suportar CBS"],
    recomendacoes_prioritarias: [
      "Treinamento fiscal sobre IBS",
      "Análise de fluxo de caixa pós-reforma",
    ],
    inconsistencias: [],
  };

  it("agrupa gaps por área", () => {
    const b = groupBriefingByArea(structured);
    expect(b.fiscal.gaps).toHaveLength(1);
    expect(b.contabilidade.gaps).toHaveLength(1);
    expect(b.legal.gaps).toHaveLength(1);
  });

  it("agrupa recomendações por área", () => {
    const b = groupBriefingByArea(structured);
    expect(b.fiscal.recomendacoes).toHaveLength(1);
    expect(b.gestao.recomendacoes).toHaveLength(1);
  });

  it("retorna buckets vazios quando structured é null", () => {
    const b = groupBriefingByArea(null);
    expect(b.generico.gaps).toHaveLength(0);
    expect(b.fiscal.gaps).toHaveLength(0);
  });
});

describe("formatWhatsAppSummary", () => {
  const structured: BriefingLite = {
    nivel_risco_geral: "alto",
    resumo_executivo: "Empresa apresenta riscos fiscais significativos.",
    principais_gaps: [
      { gap: "Alíquota IBS incorreta", evidencia_regulatoria: "Art. 14 LC 214/2025", urgencia: "imediata" },
    ],
    recomendacoes_prioritarias: ["Treinamento fiscal"],
    confidence_score: { nivel_confianca: 80, limitacoes: ["Sem dados financeiros"], recomendacao: "Revisão por advogado tributarista recomendada" },
  };

  it("inclui risco no cabeçalho", () => {
    const buckets = groupBriefingByArea(structured);
    const txt = formatWhatsAppSummary({ projectName: "Teste", area: "fiscal", bucket: buckets.fiscal, structured });
    expect(txt).toMatch(/\*Risco Geral:\* Alto/);
    expect(txt).toMatch(/80% confiança/);
  });

  it("inclui resumo executivo só na área Genérica", () => {
    const buckets = groupBriefingByArea(structured);
    const generic = formatWhatsAppSummary({ projectName: "Teste", area: "generico", bucket: buckets.generico, structured });
    const fiscal = formatWhatsAppSummary({ projectName: "Teste", area: "fiscal", bucket: buckets.fiscal, structured });
    expect(generic).toContain("Resumo Executivo");
    expect(fiscal).not.toContain("Resumo Executivo");
  });

  it("marca área vazia com mensagem explícita (exceto genérico)", () => {
    const buckets = groupBriefingByArea(structured);
    const ti = formatWhatsAppSummary({ projectName: "Teste", area: "ti", bucket: buckets.ti, structured });
    expect(ti).toContain("Nenhum item específico de T.I.");
  });

  it("usa asteriscos para negrito (compatível WhatsApp)", () => {
    const buckets = groupBriefingByArea(structured);
    const txt = formatWhatsAppSummary({ projectName: "Teste", area: "fiscal", bucket: buckets.fiscal, structured });
    expect(txt).toMatch(/\*IA SOLARIS/);
    expect(txt).toMatch(/\*Projeto:\*/);
  });
});
