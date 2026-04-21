/**
 * briefing-markdown-v2.test.ts — auditoria bundle #808/#809/#810/#811
 *
 * Testes de renderização do template v2 cobrindo as features do bundle:
 *   - #809: banner conf<85%, "Exposição" vs "Risco Geral", aviso per-gap
 *   - #810: Top 3 Ações, Qualidade, Badge de maturidade
 *   - #811: linha "Fonte:" por gap, graceful quando ausente
 *
 * Testes via função exportada buildBriefingMarkdown (modo v2 default).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildBriefingMarkdown } from "./routers-fluxo-v3";

const STRUCTURED_BASE = {
  nivel_risco_geral: "alto",
  resumo_executivo: "Empresa com múltiplos gaps identificados. Ação imediata recomendada.",
  principais_gaps: [
    { gap: "Gap 1", causa_raiz: "Causa 1", evidencia_regulatoria: "Art. 14", urgencia: "imediata" },
    { gap: "Gap 2", causa_raiz: "Causa 2", evidencia_regulatoria: "Art. 15", urgencia: "curto_prazo" },
    { gap: "Gap 3", causa_raiz: "Causa 3", evidencia_regulatoria: "Art. 21", urgencia: "medio_prazo" },
  ],
  oportunidades: ["Oportunidade A"],
  recomendacoes_prioritarias: ["Rec 1", "Rec 2"],
  confidence_score: { nivel_confianca: 85, limitacoes: [], recomendacao: "Revisão por advogado tributarista recomendada" },
};

const META_BASE = {
  empresa: "Distribuidora Alimentos Teste",
  cnaePrincipal: "4632-0/03 — Comércio atacadista",
  porte: "media",
  regime: "lucro_real",
  questionariosRespondidos: 0,
  questionariosTotal: 5,
  qualidadeInformacoes: 40,
  produtosTotal: 0,
  servicosTotal: 0,
};

describe("buildBriefingMarkdown V2 — bundle #808-#811", () => {
  const originalFlag = process.env.BRIEFING_TEMPLATE_VERSION;

  beforeEach(() => {
    delete process.env.BRIEFING_TEMPLATE_VERSION;
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.BRIEFING_TEMPLATE_VERSION;
    else process.env.BRIEFING_TEMPLATE_VERSION = originalFlag;
  });

  describe("#809 — linguagem condicional + banner de confiança", () => {
    it("renderiza banner topo quando conf<85%", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 30 } },
        META_BASE
      );
      expect(md).toContain("⚠️ **Diagnóstico inicial — confiança 30%**");
      expect(md).toContain("Questionários respondidos: 0/5");
    });

    it("NÃO renderiza banner quando conf>=85%", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 90 } },
        META_BASE
      );
      expect(md).not.toContain("Diagnóstico inicial — confiança");
    });

    it("usa 'Nível de Exposição' (não 'Risco Geral')", () => {
      const md = buildBriefingMarkdown(STRUCTURED_BASE, META_BASE);
      expect(md).toContain("**Nível de Exposição:**");
      expect(md).not.toContain("Nível de Risco Geral");
    });

    it("adiciona aviso de validação per-gap quando conf<85%", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 30 } },
        META_BASE
      );
      // 3 gaps × 1 aviso = 3 ocorrências do texto de validação
      const matches = md.match(/Validação obrigatória: base legal citada/g) ?? [];
      expect(matches.length).toBe(3);
    });

    it("NÃO adiciona aviso per-gap quando conf>=85%", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 90 } },
        META_BASE
      );
      expect(md).not.toContain("Validação obrigatória");
    });
  });

  describe("#810 — Top 3 + Qualidade + Badge", () => {
    it("renderiza badge de maturidade no header (conf<40 → MAPA)", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 30 } },
        META_BASE
      );
      expect(md).toContain("🗺️ MAPA REGULATÓRIO");
    });

    it("conf 40..84 → DIAGNOSTICO PARCIAL", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 60 } },
        META_BASE
      );
      expect(md).toContain("📋 DIAGNÓSTICO PARCIAL");
    });

    it("conf>=85 → DIAGNOSTICO COMPLETO", () => {
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 90 } },
        META_BASE
      );
      expect(md).toContain("✅ DIAGNÓSTICO COMPLETO");
    });

    it("exibe Qualidade das Informações no header", () => {
      const md = buildBriefingMarkdown(STRUCTURED_BASE, META_BASE);
      expect(md).toContain("**Qualidade das Informações:** 40%");
      expect(md).toContain("0/5 questionários");
    });

    it("renderiza Top 3 Ações quando gaps>=3 E top_3_acoes preenchido", () => {
      const structured = {
        ...STRUCTURED_BASE,
        top_3_acoes: [
          { acao: "Parametrizar IBS", justificativa: "Risco imediato", prazo: "imediato" },
          { acao: "Atualizar cadastro", justificativa: "Obrigação legal", prazo: "curto_prazo" },
          { acao: "Revisar NCMs", justificativa: "Oportunidade", prazo: "medio_prazo" },
        ],
      };
      const md = buildBriefingMarkdown(structured, META_BASE);
      expect(md).toContain("## 🎯 Top 3 Ações Prioritárias");
      expect(md).toContain("**Parametrizar IBS**");
      expect(md).toContain("Risco imediato");
      // Top 3 deve vir ANTES do Resumo Executivo
      const top3Idx = md.indexOf("Top 3 Ações");
      const resumoIdx = md.indexOf("Resumo Executivo");
      expect(top3Idx).toBeLessThan(resumoIdx);
    });

    it("NÃO renderiza Top 3 quando gaps<3", () => {
      const structured = {
        ...STRUCTURED_BASE,
        principais_gaps: [STRUCTURED_BASE.principais_gaps[0]],
        top_3_acoes: [{ acao: "X", justificativa: "Y", prazo: "imediato" }],
      };
      const md = buildBriefingMarkdown(structured, META_BASE);
      expect(md).not.toContain("Top 3 Ações");
    });

    it("NÃO renderiza Top 3 quando top_3_acoes vazio (mesmo com gaps>=3)", () => {
      const md = buildBriefingMarkdown({ ...STRUCTURED_BASE, top_3_acoes: [] }, META_BASE);
      expect(md).not.toContain("Top 3 Ações");
    });
  });

  describe("#811 — source_type + source_reference por gap", () => {
    it("renderiza linha Fonte quando source_type presente", () => {
      const structured = {
        ...STRUCTURED_BASE,
        principais_gaps: [
          {
            ...STRUCTURED_BASE.principais_gaps[0],
            source_type: "rag",
            source_reference: "Art. 15 LC 214/2025",
          },
        ],
      };
      const md = buildBriefingMarkdown(structured, META_BASE);
      expect(md).toContain("**Fonte:** 📚 RAG (base regulatória) · Art. 15 LC 214/2025");
    });

    it("omite linha Fonte quando source_type ausente (graceful — briefings legados)", () => {
      const md = buildBriefingMarkdown(STRUCTURED_BASE, META_BASE);
      expect(md).not.toContain("**Fonte:**");
    });

    it("renderiza Fonte sem suffix quando source_reference ausente", () => {
      const structured = {
        ...STRUCTURED_BASE,
        principais_gaps: [
          { ...STRUCTURED_BASE.principais_gaps[0], source_type: "cnae" },
        ],
      };
      const md = buildBriefingMarkdown(structured, META_BASE);
      expect(md).toContain("**Fonte:** 🏷️ CNAE confirmado");
      // Sem " · " de suffix
      const fonteLine = md.split("\n").find((l) => l.includes("**Fonte:**"));
      expect(fonteLine).not.toContain(" · ");
    });

    it("todos os source_type conhecidos renderizam com label canônico", () => {
      const types = [
        { k: "rag", label: "📚 RAG (base regulatória)" },
        { k: "cnae", label: "🏷️ CNAE confirmado" },
        { k: "descricao", label: "📝 Descrição do negócio" },
        { k: "questionario", label: "💬 Respostas do questionário" },
        { k: "iagen", label: "🤖 IA Generativa (Onda 2)" },
        { k: "regra_semantica", label: "⚙️ Regra semântica (gatilho)" },
      ];
      for (const t of types) {
        const md = buildBriefingMarkdown(
          {
            ...STRUCTURED_BASE,
            principais_gaps: [{ ...STRUCTURED_BASE.principais_gaps[0], source_type: t.k, source_reference: "ref" }],
          },
          META_BASE
        );
        expect(md).toContain(`**Fonte:** ${t.label} · ref`);
      }
    });
  });

  describe("rollback — feature flag template v1", () => {
    it("BRIEFING_TEMPLATE_VERSION=v1 → ignora toda infra do bundle", () => {
      process.env.BRIEFING_TEMPLATE_VERSION = "v1";
      const md = buildBriefingMarkdown(
        { ...STRUCTURED_BASE, confidence_score: { ...STRUCTURED_BASE.confidence_score, nivel_confianca: 30 } },
        META_BASE
      );
      // v1 não tem nenhuma das novidades do bundle
      expect(md).not.toContain("MAPA REGULATÓRIO");
      expect(md).not.toContain("Qualidade das Informações");
      expect(md).not.toContain("Top 3 Ações");
      expect(md).not.toContain("Nível de Exposição");
      expect(md).not.toContain("Fonte:");
    });
  });

  describe("determinismo", () => {
    it("mesma entrada → mesma saída", () => {
      const a = buildBriefingMarkdown(STRUCTURED_BASE, META_BASE);
      const b = buildBriefingMarkdown(STRUCTURED_BASE, META_BASE);
      expect(a).toBe(b);
    });
  });
});
