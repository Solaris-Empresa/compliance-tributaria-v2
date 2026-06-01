/**
 * g17-max-buildGap.test.ts — FIX-08 (FASE B, arquitetura Max)
 * ─────────────────────────────────────────────────────────────────────────────
 * Test contracts da função pura `buildGapFromQuestion` — substitui o lookup
 * em SOLARIS_GAPS_MAP + topico-to-categoria por leitura direta dos metadados
 * da pergunta (FIX-05 + FIX-06).
 *
 * Padrão: idêntico a `g17-dual-column.test.ts` (FIX-01, 19 PASS) e
 * `credito-presumido-eligibility.test.ts` (15 PASS) — unitário sem DB.
 *
 * Origem: despacho SOLARIS-FIX-08 FASE B (2026-06-01).
 * Cobre cenários T-01..T-08 do despacho (T-07 e T-08 são integração — aqui
 * só os contratos da função pura; integração runtime fica para smoke Manus).
 */

import { describe, it, expect } from "vitest";
import {
  buildGapFromQuestion,
  classifyForGap,
  type GapToInsert,
  type QuestionMetadata,
} from "../lib/solaris-gap-analyzer";

// ─── Fixtures auxiliares ─────────────────────────────────────────────────────

function makeQ(overrides: Partial<QuestionMetadata>): QuestionMetadata {
  return {
    codigo: "SOL-001",
    titulo: "Título padrão",
    categoria: "contabilidade_fiscal",
    severidade_base: "media",
    risk_category_code: "confissao_automatica",
    gap_descricao: null,
    ...overrides,
  };
}

// ─── Cenários T-01..T-08 do despacho FIX-08 ───────────────────────────────────

describe("FIX-08 — buildGapFromQuestion: zero dicionários, metadados na pergunta", () => {
  describe("T-01 — Metadados completos: gap_descricao curado prevalece", () => {
    it("retorna GapToInsert com descricao curada quando gap_descricao preenchido", () => {
      const q = makeQ({
        codigo: "SOL-015",
        risk_category_code: "confissao_automatica",
        gap_descricao:
          "Ausência de controle de débitos constituídos por confissão — risco de execução fiscal automática (Art. 45 LC 214/2025)",
      });
      const gap = buildGapFromQuestion(q);
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe(
        "Ausência de controle de débitos constituídos por confissão — risco de execução fiscal automática (Art. 45 LC 214/2025)",
      );
      expect(gap!.risk_category_code).toBe("confissao_automatica");
      expect(gap!.source_reference).toBe("SOL-015");
    });
  });

  describe("T-02 — gap_descricao NULL: fallback 'Ausência: {titulo}'", () => {
    it("gap_descricao=null E titulo preenchido → 'Ausência: {titulo}'", () => {
      const q = makeQ({
        codigo: "SOL-038",
        titulo: "Possui controle de operações com produtor rural?",
        gap_descricao: null,
      });
      const gap = buildGapFromQuestion(q);
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe(
        "Ausência: Possui controle de operações com produtor rural?",
      );
    });

    it("gap_descricao=null E titulo=null → fallback para codigo", () => {
      const q = makeQ({
        codigo: "SOL-099",
        titulo: null,
        gap_descricao: null,
      });
      const gap = buildGapFromQuestion(q);
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe("Ausência: SOL-099");
    });

    it("gap_descricao='' (vazio) → fallback titulo (trim trata como ausente)", () => {
      const q = makeQ({
        codigo: "SOL-050",
        titulo: "Titulo X",
        gap_descricao: "   ",
      });
      const gap = buildGapFromQuestion(q);
      expect(gap!.gap_descricao).toBe("Ausência: Titulo X");
    });
  });

  describe("T-03 — risk_category_code NULL: skip (retorna null)", () => {
    it("risk_category_code=null → null (curadoria pendente)", () => {
      const q = makeQ({
        codigo: "SOL-099",
        risk_category_code: null,
      });
      expect(buildGapFromQuestion(q)).toBeNull();
    });

    it("risk_category_code='' (string vazia) → null", () => {
      const q = makeQ({
        codigo: "SOL-100",
        risk_category_code: "",
      });
      expect(buildGapFromQuestion(q)).toBeNull();
    });

    it("risk_category_code='   ' (whitespace) → null", () => {
      const q = makeQ({
        codigo: "SOL-101",
        risk_category_code: "   ",
      });
      expect(buildGapFromQuestion(q)).toBeNull();
    });
  });

  describe("T-04 — severidade_base NULL: fallback 'media'", () => {
    it("severidade_base=null → severidade='media' (defensivo)", () => {
      const q = makeQ({ severidade_base: null });
      const gap = buildGapFromQuestion(q);
      expect(gap!.severidade).toBe("media");
    });

    it("severidade_base inválido → fallback 'media'", () => {
      const q = makeQ({ severidade_base: "extrema" });
      const gap = buildGapFromQuestion(q);
      expect(gap!.severidade).toBe("media");
    });

    it("severidade_base válido preservado", () => {
      for (const sev of ["baixa", "media", "alta", "critica"] as const) {
        const q = makeQ({ severidade_base: sev });
        const gap = buildGapFromQuestion(q);
        expect(gap!.severidade).toBe(sev);
      }
    });
  });

  describe("Categoria (area) — fallback defensivo", () => {
    it("categoria=null → fallback 'contabilidade_fiscal'", () => {
      const q = makeQ({ categoria: null });
      const gap = buildGapFromQuestion(q);
      expect(gap!.area).toBe("contabilidade_fiscal");
    });

    it("categoria='juridico' preservada", () => {
      const q = makeQ({ categoria: "juridico" });
      expect(buildGapFromQuestion(q)!.area).toBe("juridico");
    });
  });

  describe("T-05 — Resposta positiva: classifyForGap retorna isNegative=false → caller skip", () => {
    it("opcao='sim' → classifyForGap NÃO marca negativo (gap não é gerado)", () => {
      const { isNegative, isExcluded } = classifyForGap("sim", "");
      expect(isNegative).toBe(false);
      expect(isExcluded).toBe(false);
      // Caller (`analyzeSolarisAnswers`) faz `if (!isNegative) continue` antes de chamar buildGapFromQuestion.
    });
  });

  describe("T-06 — Não se aplica: classifyForGap retorna isExcluded=true → caller skip", () => {
    it("opcao='nao_se_aplica' → exclusão (sem gap)", () => {
      const { isNegative, isExcluded } = classifyForGap("nao_se_aplica", "");
      expect(isExcluded).toBe(true);
      expect(isNegative).toBe(false);
    });
  });

  describe("Integração mental do pipeline T-01 + T-02 + T-04 (positivo end-to-end mental)", () => {
    it("opcao='nao' + metadados curados → gap com descrição curada", () => {
      const opcao = "nao" as const;
      const resposta = "";
      const { isNegative, isExcluded } = classifyForGap(opcao, resposta);
      expect(isExcluded).toBe(false);
      expect(isNegative).toBe(true);
      const gap = buildGapFromQuestion(
        makeQ({
          codigo: "SOL-015",
          risk_category_code: "confissao_automatica",
          severidade_base: "critica",
          gap_descricao:
            "Ausência de controle de débitos constituídos por confissão",
        }),
      );
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe(
        "Ausência de controle de débitos constituídos por confissão",
      );
      expect(gap!.severidade).toBe("critica");
      expect(gap!.risk_category_code).toBe("confissao_automatica");
    });

    it("opcao='nao_sei' + metadados parciais (severidade NULL) → gap com fallback 'media'", () => {
      const { isNegative, isExcluded } = classifyForGap("nao_sei", "");
      expect(isNegative).toBe(true);
      expect(isExcluded).toBe(false);
      const gap = buildGapFromQuestion(
        makeQ({
          codigo: "SOL-042",
          titulo: "Possui controle de obrigações acessórias?",
          severidade_base: null, // fallback
          gap_descricao: null, // fallback "Ausência: {titulo}"
        }),
      );
      expect(gap!.severidade).toBe("media");
      expect(gap!.gap_descricao).toBe(
        "Ausência: Possui controle de obrigações acessórias?",
      );
    });
  });

  describe("Garantia tipo: GapToInsert é completo (todas as 5 chaves)", () => {
    it("retorno tem exatamente as 5 chaves esperadas — sem fields extras vazando", () => {
      const gap = buildGapFromQuestion(makeQ({}));
      expect(gap).not.toBeNull();
      const keys: Array<keyof GapToInsert> = [
        "gap_descricao",
        "area",
        "severidade",
        "risk_category_code",
        "source_reference",
      ];
      for (const k of keys) {
        expect(gap!).toHaveProperty(k);
      }
      expect(Object.keys(gap!).sort()).toEqual([...keys].sort());
    });
  });

  describe("Determinismo (idempotência conceitual)", () => {
    it("mesma entrada produz mesma saída", () => {
      const q = makeQ({
        codigo: "SOL-046",
        gap_descricao: "Split payment não implementado",
      });
      const a = buildGapFromQuestion(q);
      const b = buildGapFromQuestion(q);
      expect(a).toEqual(b);
    });
  });
});
