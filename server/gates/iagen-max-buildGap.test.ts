/**
 * iagen-max-buildGap.test.ts — FIX-09 (FASE C, IAGEN arquitetura Max)
 * ─────────────────────────────────────────────────────────────────────────────
 * Test contracts dos helpers puros `isNonCompliantIagenAnswer` e
 * `buildIagenGapFromAnswer` — substitui KEYWORD_TO_TOPIC + SOLARIS_GAPS_MAP
 * lookup por leitura direta de `iagen_answers.risk_category_code`.
 *
 * Padrão: idêntico a `g17-max-buildGap.test.ts` (FIX-08, 18 PASS).
 * Unitário sem DB, sem mock, sem I/O.
 *
 * Origem: despacho SOLARIS-FIX-09 FASE C (2026-06-01).
 */

import { describe, it, expect } from "vitest";
import {
  buildIagenGapFromAnswer,
  isNonCompliantIagenAnswer,
  type IagenAnswerMetadata,
  type IagenGapToInsert,
} from "../lib/iagen-gap-analyzer";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeIagen(
  overrides: Partial<IagenAnswerMetadata> = {},
): IagenAnswerMetadata {
  return {
    id: 12345,
    question_text: "A empresa possui controle de NF-e?",
    resposta: "Não",
    risk_category_code: "confissao_automatica",
    ...overrides,
  };
}

// ─── isNonCompliantIagenAnswer ────────────────────────────────────────────────

describe("FIX-09 — isNonCompliantIagenAnswer (detecção negativa preservada)", () => {
  it("'sim' → false (empresa tem controle, sem gap)", () => {
    expect(isNonCompliantIagenAnswer("sim")).toBe(false);
    expect(isNonCompliantIagenAnswer("Sim, implementado")).toBe(false);
    expect(isNonCompliantIagenAnswer("SIM")).toBe(false);
  });

  it("'não' / 'nao' → true (gap explícito)", () => {
    expect(isNonCompliantIagenAnswer("não")).toBe(true);
    expect(isNonCompliantIagenAnswer("Não.")).toBe(true);
    expect(isNonCompliantIagenAnswer("nao")).toBe(true);
    expect(isNonCompliantIagenAnswer("NÃO ainda")).toBe(true);
  });

  it("incerteza explícita → true (gap conservador)", () => {
    expect(isNonCompliantIagenAnswer("não sei")).toBe(true);
    expect(isNonCompliantIagenAnswer("nao sei")).toBe(true);
    expect(isNonCompliantIagenAnswer("depende do caso")).toBe(true);
    expect(isNonCompliantIagenAnswer("verificar com fiscal")).toBe(true);
    expect(isNonCompliantIagenAnswer("incerto sobre isso")).toBe(true);
    expect(isNonCompliantIagenAnswer("pode ser")).toBe(true);
    expect(isNonCompliantIagenAnswer("não tenho certeza")).toBe(true);
  });

  it("ambíguo → true (conservador IAGEN — diferente de SOLARIS)", () => {
    // IAGEN é mais conservador: qualquer resposta não-positiva vira gap
    expect(isNonCompliantIagenAnswer("talvez")).toBe(true);
    expect(isNonCompliantIagenAnswer("comentário aleatório")).toBe(true);
    expect(isNonCompliantIagenAnswer("")).toBe(true);
  });
});

// ─── buildIagenGapFromAnswer ─────────────────────────────────────────────────

describe("FIX-09 — buildIagenGapFromAnswer (zero dicionários intermediários)", () => {
  describe("Caminho canônico: risk_category_code preenchido pelo LLM", () => {
    it("risk_category_code='confissao_automatica' + questionText curto → gap completo", () => {
      const row = makeIagen({
        id: 100,
        question_text: "Tem NF-e?",
        risk_category_code: "confissao_automatica",
      });
      const gap = buildIagenGapFromAnswer(row);
      expect(gap).not.toBeNull();
      expect(gap!.risk_category_code).toBe("confissao_automatica");
      expect(gap!.source_reference).toBe("IAGEN-100");
      expect(gap!.gap_descricao).toContain("confissao_automatica");
      expect(gap!.gap_descricao).toContain("Tem NF-e?");
      expect(gap!.area).toBe("compliance");
      expect(gap!.severidade).toBe("alta");
    });

    it("questionText longo (>120 chars) → truncado com '...'", () => {
      const longText = "A".repeat(150);
      const gap = buildIagenGapFromAnswer(
        makeIagen({ id: 200, question_text: longText }),
      );
      expect(gap).not.toBeNull();
      // gap_descricao contém os 120 primeiros + "..."
      expect(gap!.gap_descricao).toContain("A".repeat(120) + "...");
      expect(gap!.gap_descricao).not.toContain("A".repeat(121));
    });

    it("questionText vazio → gap_descricao fallback sem citação", () => {
      const gap = buildIagenGapFromAnswer(
        makeIagen({ id: 300, question_text: "" }),
      );
      expect(gap).not.toBeNull();
      expect(gap!.gap_descricao).toBe(
        'Gap categoria confissao_automatica — resposta Onda 2 IA Generativa',
      );
    });

    it("risk_category_code com whitespace → trim preserva o valor", () => {
      const gap = buildIagenGapFromAnswer(
        makeIagen({ risk_category_code: "  split_payment  " }),
      );
      expect(gap!.risk_category_code).toBe("split_payment");
    });
  });

  describe("Guard: risk_category_code ausente → skip (return null)", () => {
    it("risk_category_code=null → null", () => {
      expect(
        buildIagenGapFromAnswer(makeIagen({ risk_category_code: null })),
      ).toBeNull();
    });

    it("risk_category_code='' → null", () => {
      expect(
        buildIagenGapFromAnswer(makeIagen({ risk_category_code: "" })),
      ).toBeNull();
    });

    it("risk_category_code='   ' (só whitespace) → null", () => {
      expect(
        buildIagenGapFromAnswer(makeIagen({ risk_category_code: "   " })),
      ).toBeNull();
    });
  });

  describe("answer_value_preview: 200 chars de resposta para rastreabilidade", () => {
    it("resposta curta preservada na íntegra", () => {
      const gap = buildIagenGapFromAnswer(
        makeIagen({ resposta: "Não, ainda em planejamento." }),
      );
      expect(gap!.answer_value_preview).toBe("Não, ainda em planejamento.");
    });

    it("resposta longa (>200 chars) → truncada a 200", () => {
      const longAnswer = "B".repeat(250);
      const gap = buildIagenGapFromAnswer(
        makeIagen({ resposta: longAnswer }),
      );
      expect(gap!.answer_value_preview).toBe("B".repeat(200));
      expect(gap!.answer_value_preview.length).toBe(200);
    });
  });

  describe("source_reference: 'IAGEN-{id}' para rastreabilidade ao iagen_answers.id", () => {
    it("id=42 → 'IAGEN-42'", () => {
      const gap = buildIagenGapFromAnswer(makeIagen({ id: 42 }));
      expect(gap!.source_reference).toBe("IAGEN-42");
    });

    it("id=999999 → 'IAGEN-999999'", () => {
      const gap = buildIagenGapFromAnswer(makeIagen({ id: 999999 }));
      expect(gap!.source_reference).toBe("IAGEN-999999");
    });
  });

  describe("Defaults conservadores (sem curadoria — fonte LLM)", () => {
    it("area sempre 'compliance' (não há iagen_questions com categoria curada)", () => {
      const gap = buildIagenGapFromAnswer(makeIagen({}));
      expect(gap!.area).toBe("compliance");
    });

    it("severidade sempre 'alta' (default conservador para IAGEN)", () => {
      const gap = buildIagenGapFromAnswer(makeIagen({}));
      expect(gap!.severidade).toBe("alta");
    });
  });

  describe("Tipo do retorno completo (5 chaves + answer_value_preview = 6)", () => {
    it("GapToInsert tem exatamente as 6 chaves esperadas", () => {
      const gap = buildIagenGapFromAnswer(makeIagen({}));
      const keys: Array<keyof IagenGapToInsert> = [
        "gap_descricao",
        "area",
        "severidade",
        "risk_category_code",
        "source_reference",
        "answer_value_preview",
      ];
      expect(Object.keys(gap!).sort()).toEqual([...keys].sort());
    });
  });

  describe("Determinismo", () => {
    it("mesma entrada produz mesma saída", () => {
      const row = makeIagen({
        id: 555,
        question_text: "Tem controle de IBS?",
        risk_category_code: "ibs_cbs",
      });
      const a = buildIagenGapFromAnswer(row);
      const b = buildIagenGapFromAnswer(row);
      expect(a).toEqual(b);
    });
  });

  describe("Integração mental (helpers compostos)", () => {
    it("isNonCompliant=true + risk_category_code preenchido → gap completo", () => {
      const resposta = "Não tenho certeza ainda";
      const row = makeIagen({
        id: 777,
        question_text: "A empresa segregou contabilidade fiscal?",
        risk_category_code: "obrigacao_acessoria",
        resposta,
      });
      // Verificar fluxo: detecção positiva + build positivo
      expect(isNonCompliantIagenAnswer(row.resposta)).toBe(true);
      const gap = buildIagenGapFromAnswer(row);
      expect(gap).not.toBeNull();
      expect(gap!.risk_category_code).toBe("obrigacao_acessoria");
    });

    it("isNonCompliant=false (sim) → caller skip antes de chamar buildGap", () => {
      const row = makeIagen({ resposta: "Sim, conformidade confirmada" });
      expect(isNonCompliantIagenAnswer(row.resposta)).toBe(false);
      // Caller faz `if (!isNonCompliant) continue` — buildGap nem chamado.
    });

    it("isNonCompliant=true + risk_category_code=null → skip (null) + warn", () => {
      const row = makeIagen({
        resposta: "Não",
        risk_category_code: null,
      });
      expect(isNonCompliantIagenAnswer(row.resposta)).toBe(true);
      expect(buildIagenGapFromAnswer(row)).toBeNull();
    });
  });
});
