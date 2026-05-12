/**
 * Issue #1066 — reconciliação cnaeProgress.answers com tabela granular
 *
 * Tests da função pura. Cenários cobertos:
 *   1. Extract correto por cnaeCode + level
 *   2. Idempotência: shouldReconcile false quando atual já populado
 *   3. Caso bug: state vazio + tabela com respostas → reconciliar
 *   4. Caso hasGap puro: state vazio + tabela vazia → não reconciliar
 *   5. Caso normal: state completo + tabela completa → não reconciliar (idempotente)
 *   6. Edge cases: empty inputs, cnaeCode vazio, level errado
 */
import { describe, it, expect } from "vitest";
import {
  extractAnswersForCnae,
  shouldReconcile,
  type SavedAnswerRow,
  type CnaeProgressAnswer,
} from "./cnae-progress-reconciliation";

// Fixture: respostas salvas em questionnaireAnswersV3 (formato real)
const savedRow = (
  cnaeCode: string,
  level: "nivel1" | "nivel2",
  questionText: string,
  answerValue: string,
): SavedAnswerRow => ({
  cnaeCode,
  cnaeDescription: `${cnaeCode} - desc`,
  level,
  questionText,
  answerValue,
});

describe("Issue #1066 — extractAnswersForCnae", () => {
  it("retorna [] quando savedAnswers vazio", () => {
    expect(extractAnswersForCnae([], "4623-1/09")).toEqual([]);
  });

  it("retorna [] quando cnaeCode é string vazia", () => {
    const saved = [savedRow("4623-1/09", "nivel1", "Q1", "Sim")];
    expect(extractAnswersForCnae(saved, "")).toEqual([]);
  });

  it("filtra apenas pelo cnaeCode correto", () => {
    const saved = [
      savedRow("4623-1/09", "nivel1", "Q1 do 4623", "Sim"),
      savedRow("4930-2/02", "nivel1", "Q1 do 4930", "Não"),
      savedRow("4623-1/09", "nivel1", "Q2 do 4623", "Parcial"),
    ];
    const result = extractAnswersForCnae(saved, "4623-1/09");
    expect(result).toEqual([
      { question: "Q1 do 4623", answer: "Sim" },
      { question: "Q2 do 4623", answer: "Parcial" },
    ]);
  });

  it("filtra por level (default nivel1)", () => {
    const saved = [
      savedRow("4623-1/09", "nivel1", "Q1 nivel1", "Sim"),
      savedRow("4623-1/09", "nivel2", "Q1 nivel2", "Não"),
    ];
    expect(extractAnswersForCnae(saved, "4623-1/09")).toEqual([
      { question: "Q1 nivel1", answer: "Sim" },
    ]);
    expect(extractAnswersForCnae(saved, "4623-1/09", "nivel2")).toEqual([
      { question: "Q1 nivel2", answer: "Não" },
    ]);
  });

  it("preserva ordem das respostas (assume ordem de questionIndex já aplicada upstream)", () => {
    const saved = [
      savedRow("4623-1/09", "nivel1", "QA", "A"),
      savedRow("4623-1/09", "nivel1", "QB", "B"),
      savedRow("4623-1/09", "nivel1", "QC", "C"),
    ];
    const result = extractAnswersForCnae(saved, "4623-1/09");
    expect(result.map((r) => r.answer)).toEqual(["A", "B", "C"]);
  });

  it("caso canônico #5400001: 7 respostas para CNAE 4623-1/09", () => {
    const saved = Array.from({ length: 7 }, (_, i) =>
      savedRow("4623-1/09", "nivel1", `Pergunta ${i + 1}`, "Não"),
    );
    const result = extractAnswersForCnae(saved, "4623-1/09");
    expect(result.length).toBe(7);
  });
});

describe("Issue #1066 — shouldReconcile", () => {
  it("false quando savedAnswers vazio (não há nada a reconciliar)", () => {
    expect(shouldReconcile([], [])).toBe(false);
    expect(shouldReconcile([{ question: "Q1", answer: "Sim" }], [])).toBe(false);
  });

  it("true quando current vazio e saved tem respostas (caso do bug)", () => {
    const saved: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
    ];
    expect(shouldReconcile([], saved)).toBe(true);
  });

  it("false quando current já tem mesmo número de respostas (idempotente)", () => {
    const answers: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
    ];
    expect(shouldReconcile(answers, answers)).toBe(false);
  });

  it("false quando current tem MAIS respostas (não regredir)", () => {
    const saved: CnaeProgressAnswer[] = [{ question: "Q1", answer: "Sim" }];
    const current: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
    ];
    expect(shouldReconcile(current, saved)).toBe(false);
  });

  it("true quando current parcial e saved completo", () => {
    const current: CnaeProgressAnswer[] = [{ question: "Q1", answer: "Sim" }];
    const saved: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
      { question: "Q3", answer: "Parcial" },
    ];
    expect(shouldReconcile(current, saved)).toBe(true);
  });
});

describe("Issue #1066 — cenários integrados (caso canônico #5400001)", () => {
  it("bug original: 7 respostas no banco, state vazio → reconciliar", () => {
    const saved = Array.from({ length: 7 }, (_, i) =>
      savedRow("4623-1/09", "nivel1", `Q${i + 1}`, "Não"),
    );
    const extracted = extractAnswersForCnae(saved, "4623-1/09");
    expect(shouldReconcile([], extracted)).toBe(true);
    expect(extracted.length).toBe(7);
  });

  it("CNAE com hasGap puro: 0 respostas no banco, state vazio → NÃO reconciliar", () => {
    const extracted = extractAnswersForCnae([], "5310-9/04");
    expect(shouldReconcile([], extracted)).toBe(false);
  });

  it("fluxo normal (handleFinishLevel1 chamado): state e banco sincronizados → não toca", () => {
    const saved = [
      savedRow("4623-1/09", "nivel1", "Q1", "Sim"),
      savedRow("4623-1/09", "nivel1", "Q2", "Não"),
    ];
    const extracted = extractAnswersForCnae(saved, "4623-1/09");
    const currentState: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
    ];
    expect(shouldReconcile(currentState, extracted)).toBe(false);
  });

  it("dois CNAEs no projeto, um com hasGap=true: reconciliação isolada por CNAE", () => {
    const saved = [
      savedRow("4623-1/09", "nivel1", "Q1", "Não"),
      savedRow("4623-1/09", "nivel1", "Q2", "Não"),
      // Nenhuma resposta para 4930-2/02 (hasGap)
    ];
    expect(extractAnswersForCnae(saved, "4623-1/09").length).toBe(2);
    expect(extractAnswersForCnae(saved, "4930-2/02").length).toBe(0);
  });
});

describe("Issue #1066 — DoD POSITIVO + NEGATIVO", () => {
  it("DoD POSITIVO: caso #5400001 — payload final reflete respostas reais", () => {
    const saved = Array.from({ length: 12 }, (_, i) =>
      savedRow(i < 7 ? "4623-1/09" : "4930-2/02", "nivel1", `Q${i}`, "Não"),
    );
    expect(extractAnswersForCnae(saved, "4623-1/09").length).toBe(7);
    expect(extractAnswersForCnae(saved, "4930-2/02").length).toBe(5);
  });

  it("DoD NEGATIVO: regressão proibida — nunca sobrescrever state mais completo", () => {
    const partial: CnaeProgressAnswer[] = [{ question: "Q1", answer: "Sim" }];
    const fullState: CnaeProgressAnswer[] = [
      { question: "Q1", answer: "Sim" },
      { question: "Q2", answer: "Não" },
      { question: "Q3", answer: "Parcial" },
    ];
    // State mais completo que banco (caso hipotético: race entre saveAnswer
    // não confirmado e UI já preencheu) — nunca regredir.
    expect(shouldReconcile(fullState, partial)).toBe(false);
  });

  it("DoD POSITIVO: função pura — mesma entrada produz mesma saída", () => {
    const saved = [savedRow("4623-1/09", "nivel1", "Q1", "Sim")];
    const r1 = extractAnswersForCnae(saved, "4623-1/09");
    const r2 = extractAnswersForCnae(saved, "4623-1/09");
    expect(r1).toEqual(r2);
  });
});
