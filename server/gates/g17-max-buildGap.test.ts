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
  deriveAnswerValueCanonical,
  type GapToInsert,
  type QuestionMetadata,
} from "../lib/solaris-gap-analyzer";

// ─── Fixtures auxiliares ─────────────────────────────────────────────────────

function makeQ(overrides: Partial<QuestionMetadata>): QuestionMetadata {
  return {
    id: 1, // Sprint 3 (FIX-VIS-U4): question_id real (era literal 0 hardcoded pré-Sprint 3)
    codigo: "SOL-001",
    titulo: "Título padrão",
    categoria: "contabilidade_fiscal",
    severidade_base: "media",
    risk_category_code: "confissao_automatica",
    gap_descricao: null,
    ...overrides,
  };
}

/** Sprint 3: helper local para reduzir verbosidade nos testes — passa string vazia
 *  como answer_value_canonical (o helper não muda a lógica de retorno do build). */
function buildGap(q: QuestionMetadata, answer = "nao") {
  return buildGapFromQuestion(q, answer);
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
      const gap = buildGap(q);
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
      const gap = buildGap(q);
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
      const gap = buildGap(q);
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe("Ausência: SOL-099");
    });

    it("gap_descricao='' (vazio) → fallback titulo (trim trata como ausente)", () => {
      const q = makeQ({
        codigo: "SOL-050",
        titulo: "Titulo X",
        gap_descricao: "   ",
      });
      const gap = buildGap(q);
      expect(gap!.gap_descricao).toBe("Ausência: Titulo X");
    });
  });

  describe("T-03 — risk_category_code NULL: skip (retorna null)", () => {
    it("risk_category_code=null → null (curadoria pendente)", () => {
      const q = makeQ({
        codigo: "SOL-099",
        risk_category_code: null,
      });
      expect(buildGap(q)).toBeNull();
    });

    it("risk_category_code='' (string vazia) → null", () => {
      const q = makeQ({
        codigo: "SOL-100",
        risk_category_code: "",
      });
      expect(buildGap(q)).toBeNull();
    });

    it("risk_category_code='   ' (whitespace) → null", () => {
      const q = makeQ({
        codigo: "SOL-101",
        risk_category_code: "   ",
      });
      expect(buildGap(q)).toBeNull();
    });
  });

  describe("T-04 — severidade_base NULL: fallback 'media'", () => {
    it("severidade_base=null → severidade='media' (defensivo)", () => {
      const q = makeQ({ severidade_base: null });
      const gap = buildGap(q);
      expect(gap!.severidade).toBe("media");
    });

    it("severidade_base inválido → fallback 'media'", () => {
      const q = makeQ({ severidade_base: "extrema" });
      const gap = buildGap(q);
      expect(gap!.severidade).toBe("media");
    });

    it("severidade_base válido preservado", () => {
      for (const sev of ["baixa", "media", "alta", "critica"] as const) {
        const q = makeQ({ severidade_base: sev });
        const gap = buildGap(q);
        expect(gap!.severidade).toBe(sev);
      }
    });
  });

  describe("Categoria (area) — fallback defensivo", () => {
    it("categoria=null → fallback 'contabilidade_fiscal'", () => {
      const q = makeQ({ categoria: null });
      const gap = buildGap(q);
      expect(gap!.area).toBe("contabilidade_fiscal");
    });

    it("categoria='juridico' preservada", () => {
      const q = makeQ({ categoria: "juridico" });
      expect(buildGap(q)!.area).toBe("juridico");
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
      const gap = buildGap(makeQ({
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
      const gap = buildGap(makeQ({
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

  describe("Garantia tipo: GapToInsert é completo (todas as 7 chaves)", () => {
    it("retorno tem exatamente as 7 chaves esperadas — sem fields extras vazando", () => {
      // Sprint 3 (FIX-VIS-U4 + U6): GapToInsert ampliado com question_id + answer_value
      // para substituir os literais 0 e 'não' que eram hardcoded no SQL INSERT.
      const gap = buildGap(makeQ({}));
      expect(gap).not.toBeNull();
      const keys: Array<keyof GapToInsert> = [
        "question_id",
        "answer_value",
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

    it("Sprint 3 (FIX-VIS-U4): question_id propagado do row.id", () => {
      const gap = buildGap(makeQ({ id: 42 }));
      expect(gap!.question_id).toBe(42);
    });

    it("Sprint 3 (FIX-VIS-U6): answer_value passa pelo helper sem transformar", () => {
      const gap = buildGap(makeQ({}), "nao_sei");
      expect(gap!.answer_value).toBe("nao_sei");
    });
  });

  describe("Sprint 3 — deriveAnswerValueCanonical (FIX-VIS-U6 opção c híbrido)", () => {
    it("opcao preenchida → retorna a opção canônica (ENUM Sprint 1)", () => {
      // Lazy require para evitar mover import principal
expect(deriveAnswerValueCanonical("nao", "qualquer texto")).toBe("nao");
      expect(deriveAnswerValueCanonical("nao_sei", "")).toBe("nao_sei");
      expect(deriveAnswerValueCanonical("sim", "")).toBe("sim");
      expect(deriveAnswerValueCanonical("nao_se_aplica", "")).toBe("nao_se_aplica");
    });

    it("opcao NULL → fallback para resposta texto truncada a 200 chars", () => {
expect(deriveAnswerValueCanonical(null, "Não, não tenho controle")).toBe(
        "Não, não tenho controle",
      );
      const long = "x".repeat(300);
      expect(deriveAnswerValueCanonical(null, long).length).toBe(200);
    });

    it("opcao NULL + resposta vazia/null → string vazia", () => {
expect(deriveAnswerValueCanonical(null, "")).toBe("");
    });
  });

  describe("Determinismo (idempotência conceitual)", () => {
    it("mesma entrada produz mesma saída", () => {
      const q = makeQ({
        codigo: "SOL-046",
        gap_descricao: "Split payment não implementado",
      });
      const a = buildGap(q);
      const b = buildGap(q);
      expect(a).toEqual(b);
    });
  });
});
