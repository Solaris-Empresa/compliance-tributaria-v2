/**
 * Testes CC-01..CC-17 — questionnaire-completeness.ts (ADR-0016 Etapa 2)
 *
 * Cobre:
 *   CC-01..CC-07: computeState (thresholds + casos extremos)
 *   CC-08..CC-12: computeConfidenceLevel (combinações de estados)
 *   CC-13..CC-15: computeDiagnosticConfidence (score + warnings)
 *   CC-16..CC-17: buildQuestionnaireCompleteness (construção + ratio)
 *
 * SEPARAÇÃO OBRIGATÓRIA (DEC-M2-12): este arquivo NÃO importa completeness.ts
 */

import { describe, it, expect } from "vitest";
import {
  computeState,
  computeConfidenceLevel,
  computeDiagnosticConfidence,
  buildQuestionnaireCompleteness,
  stateToLabel,
  confidenceLevelToLabel,
  THRESHOLD_COMPLETO,
  THRESHOLD_PARCIAL,
  type QuestionnaireState,
} from "../lib/questionnaire-completeness";

// ─── CC-01..CC-07: computeState ───────────────────────────────────────────────

describe("CC-01: computeState — skippedAll=true retorna 'pulado'", () => {
  it("retorna pulado quando skippedAll=true independente de answeredCount", () => {
    expect(computeState(24, 20, true)).toBe("pulado");
    expect(computeState(24, 0, true)).toBe("pulado");
    expect(computeState(0, 0, true)).toBe("pulado");
  });
});

describe("CC-02: computeState — 0 respostas sem skippedAll retorna 'pulado'", () => {
  it("retorna pulado quando answeredCount=0 e totalCount>0", () => {
    expect(computeState(24, 0, false)).toBe("pulado");
    expect(computeState(7, 0, false)).toBe("pulado");
  });
});

describe("CC-03: computeState — totalCount=0 retorna 'completo' (não aplicável)", () => {
  it("questionário não aplicável não penaliza", () => {
    expect(computeState(0, 0, false)).toBe("completo");
  });
});

describe("CC-04: computeState — ≥ 80% retorna 'completo'", () => {
  it("SOLARIS: 20/24 = 83% → completo", () => {
    expect(computeState(24, 20, false)).toBe("completo");
  });
  it("IA Gen: 6/7 = 86% → completo", () => {
    expect(computeState(7, 6, false)).toBe("completo");
  });
  it("exatamente 80%: 8/10 → completo", () => {
    expect(computeState(10, 8, false)).toBe("completo");
  });
  it("100%: 24/24 → completo", () => {
    expect(computeState(24, 24, false)).toBe("completo");
  });
});

describe("CC-05: computeState — 30–79% retorna 'parcial'", () => {
  it("50%: 12/24 → parcial", () => {
    expect(computeState(24, 12, false)).toBe("parcial");
  });
  it("exatamente 30%: 3/10 → parcial", () => {
    expect(computeState(10, 3, false)).toBe("parcial");
  });
  it("79%: 19/24 → parcial (abaixo de 80%)", () => {
    expect(computeState(24, 19, false)).toBe("parcial");
  });
});

describe("CC-06: computeState — < 30% retorna 'incompleto'", () => {
  it("21%: 5/24 → incompleto", () => {
    expect(computeState(24, 5, false)).toBe("incompleto");
  });
  it("1/24 → incompleto", () => {
    expect(computeState(24, 1, false)).toBe("incompleto");
  });
  it("29%: 2/7 → incompleto (abaixo de 30%)", () => {
    expect(computeState(7, 2, false)).toBe("incompleto");
  });
});

describe("CC-07: computeState — thresholds são exatos (sem arredondamento)", () => {
  it(`THRESHOLD_COMPLETO = ${THRESHOLD_COMPLETO}`, () => {
    expect(THRESHOLD_COMPLETO).toBe(0.80);
  });
  it(`THRESHOLD_PARCIAL = ${THRESHOLD_PARCIAL}`, () => {
    expect(THRESHOLD_PARCIAL).toBe(0.30);
  });
  it("79.9%: 799/1000 → parcial (não completo)", () => {
    expect(computeState(1000, 799, false)).toBe("parcial");
  });
  it("29.9%: 299/1000 → incompleto (não parcial)", () => {
    expect(computeState(1000, 299, false)).toBe("incompleto");
  });
});

// ─── CC-08..CC-12: computeConfidenceLevel ────────────────────────────────────

describe("CC-08: computeConfidenceLevel — todos completo → alta", () => {
  it("retorna 'alta' quando todos os estados são 'completo'", () => {
    const states: QuestionnaireState[] = ["completo", "completo", "completo"];
    expect(computeConfidenceLevel(states)).toBe("alta");
  });
});

describe("CC-09: computeConfidenceLevel — algum parcial, sem incompleto → media", () => {
  it("retorna 'media' quando há parcial mas não incompleto", () => {
    const states: QuestionnaireState[] = ["completo", "parcial", "completo"];
    expect(computeConfidenceLevel(states)).toBe("media");
  });
  it("retorna 'media' quando há parcial e pulado mas não incompleto", () => {
    const states: QuestionnaireState[] = ["parcial", "pulado"];
    expect(computeConfidenceLevel(states)).toBe("media");
  });
});

describe("CC-10: computeConfidenceLevel — algum incompleto → baixa", () => {
  it("retorna 'baixa' quando há incompleto", () => {
    const states: QuestionnaireState[] = ["completo", "incompleto"];
    expect(computeConfidenceLevel(states)).toBe("baixa");
  });
  it("retorna 'baixa' mesmo com parcial + incompleto", () => {
    const states: QuestionnaireState[] = ["parcial", "incompleto", "completo"];
    expect(computeConfidenceLevel(states)).toBe("baixa");
  });
});

describe("CC-11: computeConfidenceLevel — todos pulado → nenhuma", () => {
  it("retorna 'nenhuma' quando todos os estados são 'pulado'", () => {
    const states: QuestionnaireState[] = ["pulado", "pulado"];
    expect(computeConfidenceLevel(states)).toBe("nenhuma");
  });
  it("retorna 'nenhuma' quando array vazio", () => {
    expect(computeConfidenceLevel([])).toBe("nenhuma");
  });
});

describe("CC-12: computeConfidenceLevel — DIV-Z02-003: sem valores em inglês", () => {
  it("estados são em português (não 'complete', 'partial', 'incomplete', 'skipped')", () => {
    const validStates: QuestionnaireState[] = ["completo", "parcial", "incompleto", "pulado"];
    validStates.forEach(s => {
      expect(["completo", "parcial", "incompleto", "pulado"]).toContain(s);
    });
  });
});

// ─── CC-13..CC-15: computeDiagnosticConfidence ───────────────────────────────

describe("CC-13: computeDiagnosticConfidence — score e level corretos", () => {
  it("todos completo: score=1.0, level=alta, warnings=[]", () => {
    const qs = [
      buildQuestionnaireCompleteness("solaris", 24, 20, false),
      buildQuestionnaireCompleteness("iagen", 7, 6, false),
    ];
    const result = computeDiagnosticConfidence(qs);
    expect(result.level).toBe("alta");
    expect(result.score).toBe(1.0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("CC-14: computeDiagnosticConfidence — warnings gerados para não-completo", () => {
  it("gera warning para questionário parcial", () => {
    const qs = [
      buildQuestionnaireCompleteness("solaris", 24, 12, false),
    ];
    const result = computeDiagnosticConfidence(qs);
    expect(result.level).toBe("media");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("solaris");
    expect(result.warnings[0]).toContain("50%");
  });

  it("gera warning para questionário pulado", () => {
    const qs = [
      buildQuestionnaireCompleteness("iagen", 7, 0, true),
    ];
    const result = computeDiagnosticConfidence(qs);
    expect(result.level).toBe("nenhuma");
    expect(result.warnings[0]).toContain("pulado");
  });
});

describe("CC-15: computeDiagnosticConfidence — score médio ponderado", () => {
  it("completo(1.0) + pulado(0.0) = score 0.5", () => {
    const qs = [
      buildQuestionnaireCompleteness("solaris", 24, 24, false),
      buildQuestionnaireCompleteness("iagen", 7, 0, true),
    ];
    const result = computeDiagnosticConfidence(qs);
    expect(result.score).toBe(0.5);
  });

  it("parcial(0.6) + incompleto(0.2) = score 0.4", () => {
    const qs = [
      buildQuestionnaireCompleteness("solaris", 24, 12, false), // parcial
      buildQuestionnaireCompleteness("iagen", 7, 1, false),     // incompleto
    ];
    const result = computeDiagnosticConfidence(qs);
    expect(result.score).toBe(0.4);
  });
});

// ─── CC-16..CC-17: buildQuestionnaireCompleteness ────────────────────────────

describe("CC-16: buildQuestionnaireCompleteness — completionRatio correto", () => {
  it("20/24 = 0.833...", () => {
    const q = buildQuestionnaireCompleteness("solaris", 24, 20, false);
    expect(q.completionRatio).toBeCloseTo(0.833, 2);
    expect(q.state).toBe("completo");
  });

  it("totalCount=0 → completionRatio=1.0 (não aplicável)", () => {
    const q = buildQuestionnaireCompleteness("produto", 0, 0, false);
    expect(q.completionRatio).toBe(1.0);
    expect(q.state).toBe("completo");
  });
});

describe("CC-17: buildQuestionnaireCompleteness — skippedIds preservados", () => {
  it("preserva array de IDs pulados", () => {
    const skipped = ["SOL-001", "SOL-005", "SOL-012"];
    const q = buildQuestionnaireCompleteness("solaris", 24, 21, false, skipped);
    expect(q.skippedIds).toEqual(skipped);
    expect(q.skippedAll).toBe(false);
  });

  it("stateToLabel e confidenceLevelToLabel retornam strings em português", () => {
    expect(stateToLabel("completo")).toBe("Completo");
    expect(stateToLabel("parcial")).toBe("Parcial");
    expect(stateToLabel("incompleto")).toBe("Incompleto");
    expect(stateToLabel("pulado")).toBe("Pulado");
    expect(confidenceLevelToLabel("alta")).toBe("Confiança alta");
    expect(confidenceLevelToLabel("media")).toBe("Confiança média");
    expect(confidenceLevelToLabel("baixa")).toBe("Confiança baixa");
    expect(confidenceLevelToLabel("nenhuma")).toBe("Sem dados");
  });
});
