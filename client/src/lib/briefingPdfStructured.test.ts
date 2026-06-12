/**
 * briefingPdfStructured.test.ts — PDF-1 (abordagem híbrida, decisão P.O. 12/06/2026)
 *
 * CT-1: showSplitView + structured presente → PDF tem seções structured E metodologia (markdown)
 * CT-2: legacy (structured null) → PDF idêntico ao markdown puro (zero regressão)
 * CT-3: structured presente + markdown vazio → metodologia omitida graciosamente (não quebra)
 */
import { describe, it, expect } from "vitest";
import {
  buildBriefingPdfBody,
  buildStructuredSectionsHtml,
  markdownToHtml,
  formatDiagnosticStatus,
  extractMethodologySection,
} from "./briefingPdfStructured";
import type { BriefingStructuredData } from "./briefingAdapter";

const SAMPLE: BriefingStructuredData = {
  nivel_risco_geral: "alto",
  resumo_executivo: "Empresa exposta a obrigações da Reforma Tributária.",
  principais_gaps: [
    {
      gap: "Ausência de inscrição cadastral atualizada",
      causa_raiz: "Cadastro não migrado para o novo regime",
      evidencia_regulatoria: "Art. 59 LC 214/2025",
      urgencia: "imediata",
      source_type: "regra_semantica",
      source_reference: "Art. 59 LC 214/2025",
      _hallucination_detected: false,
      _hallucinated_articles: [],
    },
    {
      gap: "Split payment não configurado",
      causa_raiz: "Sistema de pagamento sem retenção",
      evidencia_regulatoria: "Arts. 31-35 LC 214/2025",
      urgencia: "curto_prazo",
      source_type: "rag",
      source_reference: "Arts. 31-35 LC 214/2025",
      _hallucination_detected: false,
      _hallucinated_articles: [],
    },
  ],
  oportunidades: ["Crédito presumido Art. 168", "Alíquota reduzida Art. 127"],
  recomendacoes_prioritarias: ["Atualizar cadastro", "Configurar split payment"],
  top_3_acoes: [
    {
      acao: "Regularizar inscrição cadastral",
      justificativa: "Evita autuação por cadastro desatualizado",
      prazo: "imediato",
    },
  ],
  inconsistencias: [],
  confidence_score: {
    nivel_confianca: 72,
    limitacoes: ["Fonte SOLARIS pendente"],
    recomendacao: "Completar questionário SOLARIS",
  },
  dismissed_inconsistencias: [],
  approval_reservation: null,
};

// Markdown realista: gaps duplicados (devem ser EXCLUÍDOS da metodologia recortada)
// + subseções de metodologia pura (a partir do anchor "Como calculamos a Confiança").
const MARKDOWN = [
  "# Briefing de Compliance",
  "",
  "## 🎯 Principais Gaps de Compliance (5)",
  "",
  "Gap 1. Texto de gap que NAO deve aparecer na metodologia recortada.",
  "",
  "---",
  "",
  "### 🧮 Como calculamos a Confiança",
  "",
  "Média ponderada de 6 pilares. Confiança = 51%.",
  "",
  "## 🔍 Como ler este briefing",
  "",
  "Sem respostas: mapa regulatório. Com respostas: diagnóstico.",
  "",
  "_Briefing gerado automaticamente · Fórmula v4.0._",
].join("\n");

describe("PDF-1 CT-1 — híbrido: structured + metodologia", () => {
  const out = buildBriefingPdfBody({ structured: SAMPLE, markdown: MARKDOWN });

  it("contém as seções structured com rótulos da TELA (PDF-1-FIX paridade)", () => {
    expect(out).toContain("Principais Gaps (2)");
    expect(out).toContain("Ausência de inscrição cadastral atualizada");
    expect(out).toContain("Split payment não configurado");
    expect(out).toContain("Oportunidades (2)");
    expect(out).toContain("Crédito presumido Art. 168");
    // top_3_acoes → "Top 3 Prioridades" (sidebar PriorityCards)
    expect(out).toContain("Top 3 Prioridades");
    expect(out).toContain("Regularizar inscrição cadastral");
    // recomendacoes_prioritarias → aba "Ações Prioritárias" (ActionsList)
    expect(out).toContain("Ações Prioritárias");
    expect(out).toContain("Atualizar cadastro");
  });

  it("ordem espelha a tela: Top 3 Prioridades antes de Gaps; Ações Prioritárias depois de Oportunidades", () => {
    expect(out.indexOf("Top 3 Prioridades")).toBeLessThan(out.indexOf("Principais Gaps"));
    expect(out.indexOf("Oportunidades (2)")).toBeLessThan(out.indexOf("Ações Prioritárias"));
  });

  it("contém a completude e o badge de ressalva <85%", () => {
    expect(out).toContain("Completude:</strong> 72%");
    expect(out).toContain("Diagnóstico em construção");
    expect(out).toContain("Fonte SOLARIS pendente");
  });

  it("Metodologia = só subseções de metodologia pura (PDF-1-FIX-2, sem duplicar gaps)", () => {
    expect(out).toContain("<h1>Metodologia</h1>");
    expect(out).toContain("Como calculamos a Confiança");
    expect(out).toContain("Como ler este briefing");
    expect(out).toContain("Fórmula v4.0");
    // de-dup: a seção de gaps do markdown NÃO entra na metodologia recortada
    expect(out).not.toContain("Principais Gaps de Compliance (5)");
    expect(out).not.toContain("NAO deve aparecer");
  });

  it("NÃO é apenas o markdown puro (structured presente)", () => {
    expect(out).not.toBe(markdownToHtml(MARKDOWN));
    expect(out).toContain("Top 3 Prioridades"); // marcador structured, ausente do markdown
  });

  it("PDF-3: usa label canônico de fonte (SOURCE_TYPE_LABELS)", () => {
    // regra_semantica → "Aplicação obrigatória por perfil"; rag → "Norma aplicável identificada"
    expect(out).toContain("Aplicação obrigatória por perfil");
    expect(out).toContain("Norma aplicável identificada");
  });

  it("PDF-2: source_reference sem prefixo duplicado", () => {
    // adapter já fez strip; o reference limpo não reintroduz o prefixo legado cru
    expect(out).not.toContain("Aplicação obrigatória: Art.");
  });
});

describe("PDF-1 CT-2 — legacy: structured null → markdown idêntico (zero regressão)", () => {
  it("retorna exatamente markdownToHtml(markdown)", () => {
    const out = buildBriefingPdfBody({ structured: null, markdown: MARKDOWN });
    expect(out).toBe(markdownToHtml(MARKDOWN));
  });

  it("não contém o render structured (marcadores exclusivos do helper)", () => {
    const out = buildBriefingPdfBody({ structured: null, markdown: MARKDOWN });
    // marcadores produzidos só por buildStructuredSectionsHtml, ausentes do markdown
    expect(out).not.toContain("Top 3 Prioridades");
    expect(out).not.toContain("Completude:</strong>");
    expect(out).not.toContain("<h1>Metodologia</h1>");
  });
});

describe("PDF-1 CT-3 — structured + markdown vazio → metodologia omitida", () => {
  it("não quebra e omite a seção Metodologia", () => {
    const out = buildBriefingPdfBody({ structured: SAMPLE, markdown: "" });
    expect(out).toContain("Principais Gaps (2)");
    expect(out).not.toContain("<h1>Metodologia</h1>");
  });

  it("markdown só com espaços também omite Metodologia", () => {
    const out = buildBriefingPdfBody({ structured: SAMPLE, markdown: "   \n  " });
    expect(out).not.toContain("<h1>Metodologia</h1>");
  });
});

describe("PDF-1-FIX-2 — extractMethodologySection", () => {
  it("anchor presente → recorta do 'Como calculamos a Confiança' até o fim", () => {
    const ex = extractMethodologySection(MARKDOWN);
    expect(ex).not.toBeNull();
    expect(ex!).toMatch(/^### .*Como calculamos a Confiança/);
    expect(ex!).toContain("Como ler este briefing");
    expect(ex!).toContain("Fórmula v4.0");
    // exclui tudo que vem ANTES do anchor (gaps duplicados)
    expect(ex!).not.toContain("Principais Gaps de Compliance");
    expect(ex!).not.toContain("NAO deve aparecer");
  });

  it("tolerante a heading com nível/acento variados", () => {
    expect(extractMethodologySection("## Como calculamos a Confianca\n\nx")).not.toBeNull();
    expect(extractMethodologySection("###### 🧮 Como calculamos a Confiança\n\nx")).not.toBeNull();
  });

  it("sem anchor → null (fallback gracioso)", () => {
    expect(extractMethodologySection("# Briefing\n\nGaps e oportunidades, sem metodologia.")).toBeNull();
  });

  it("null/vazio → null", () => {
    expect(extractMethodologySection(null)).toBeNull();
    expect(extractMethodologySection(undefined)).toBeNull();
    expect(extractMethodologySection("   ")).toBeNull();
  });
});

describe("PDF-1-FIX-2 — fallback PDF: markdown sem anchor → mensagem neutra", () => {
  it("structured + markdown sem anchor → Metodologia com mensagem neutra (não crash)", () => {
    const out = buildBriefingPdfBody({
      structured: SAMPLE,
      markdown: "# Briefing\n\nConteúdo sem seção de metodologia.",
    });
    expect(out).toContain("<h1>Metodologia</h1>");
    expect(out).toContain("Metodologia indisponível para este diagnóstico.");
    // não vaza o conteúdo bruto do markdown (que não é metodologia)
    expect(out).not.toContain("Conteúdo sem seção de metodologia.");
  });
});

describe("formatDiagnosticStatus — header Escopo do Diagnóstico", () => {
  it("parcial → hint de questionários pendentes", () => {
    expect(formatDiagnosticStatus("parcial")).toBe("Parcial (questionários pendentes)");
  });
  it("demais status capitalizados, sem hint", () => {
    expect(formatDiagnosticStatus("completo")).toBe("Completo");
    expect(formatDiagnosticStatus("adequado")).toBe("Adequado");
    expect(formatDiagnosticStatus("insuficiente")).toBe("Insuficiente");
  });
  it("null/undefined/vazio → 'não disponível'", () => {
    expect(formatDiagnosticStatus(null)).toBe("não disponível");
    expect(formatDiagnosticStatus(undefined)).toBe("não disponível");
    expect(formatDiagnosticStatus("")).toBe("não disponível");
  });
  it("valor desconhecido → capitaliza primeira letra (fallback defensivo)", () => {
    expect(formatDiagnosticStatus("desconhecido")).toBe("Desconhecido");
  });
});

describe("PDF-1 — sem badge quando completude >= 85%", () => {
  it("não exibe ressalva quando nivel_confianca >= 85", () => {
    const high: BriefingStructuredData = {
      ...SAMPLE,
      confidence_score: { nivel_confianca: 90, limitacoes: [], recomendacao: "" },
    };
    const out = buildStructuredSectionsHtml(high);
    expect(out).toContain("Completude:</strong> 90%");
    expect(out).not.toContain("Diagnóstico em construção");
  });
});
