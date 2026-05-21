/**
 * Test contracts — BUG-Q1-V3: backend reconstrói cnaeAnswers de questionnaireAnswersV3
 * Sprint BUG-FIX 20/05/2026 · Decisão P.O. 2026-05-21 · REGRA-ORQ-28 Artefato 2
 *
 * Causa raiz definitiva: 2 PRs frontend (#1135 hasGap + #1140 refetch) falharam.
 * Q1+Q2 P.O. confirmaram: formato bate, completeDiagnosticLayer rodou com payload
 * vazio (closure stale + refetch não-confiável). Solução: backend lê
 * questionnaireAnswersV3 via SQL direto e reconstrói cnaeAnswers determinísticamente.
 *
 * Núcleo testado: função pura reconstructCnaeAnswers (server/lib).
 * DoD obrigatório (Lição #85): mock N rows → answers.length === N.
 *
 * Validação E2E (banco real greenfield) é responsabilidade do Manus ANTES do merge.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  reconstructCnaeAnswers,
  type QAnswerRow,
} from "../../server/lib/reconstruct-cnae-answers";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DIAGNOSTIC_PATH = path.join(REPO_ROOT, "server", "routers", "diagnostic.ts");
const QV3_PATH = path.join(REPO_ROOT, "client", "src", "pages", "QuestionarioV3.tsx");

// ─── DoD principal: mock N rows → answers.length === N ──────────────────────
describe("BUG-Q1-V3 — reconstructCnaeAnswers (DoD Lição #85: N rows → length N)", () => {
  const TEN_ROWS: QAnswerRow[] = Array.from({ length: 10 }, (_, i) => ({
    cnaeCode: "4712-1/00",
    cnaeDescription: "Comércio varejista - supermercados",
    level: "nivel1",
    questionText: `Pergunta ${i + 1}`,
    answerValue: i % 2 === 0 ? "Sim" : "Não",
  }));

  it("10 rows nivel1 → answers.length === 10 (caso canônico projeto 240001)", () => {
    const result = reconstructCnaeAnswers(
      TEN_ROWS,
      [{ code: "4712-1/00", description: "Supermercados" }],
      { "4712-1/00": { skipped: false } },
    );
    expect(result["4712-1/00"].answers).toHaveLength(10);
    expect(result["4712-1/00"].answers[0]).toEqual({ question: "Pergunta 1", answer: "Sim" });
  });

  it("nivel1Done = true quando há respostas (derivado de FATO, não flag)", () => {
    const result = reconstructCnaeAnswers(
      TEN_ROWS,
      [{ code: "4712-1/00" }],
      { "4712-1/00": { skipped: false } },
    );
    expect(result["4712-1/00"].nivel1Done).toBe(true);
  });

  it("preserva ordem e conteúdo das respostas (question/answer)", () => {
    const result = reconstructCnaeAnswers(TEN_ROWS, [{ code: "4712-1/00" }], {});
    const answers = result["4712-1/00"].answers;
    expect(answers[1]).toEqual({ question: "Pergunta 2", answer: "Não" });
    expect(answers[9]).toEqual({ question: "Pergunta 10", answer: "Não" });
  });
});

describe("BUG-Q1-V3 — reconstructCnaeAnswers: separação nivel1/nivel2", () => {
  const MIXED: QAnswerRow[] = [
    { cnaeCode: "4712-1/00", level: "nivel1", questionText: "N1-1", answerValue: "Sim" },
    { cnaeCode: "4712-1/00", level: "nivel1", questionText: "N1-2", answerValue: "Não" },
    { cnaeCode: "4712-1/00", level: "nivel2", questionText: "N2-1", answerValue: "Sim" },
  ];

  it("nivel1 e nivel2 são separados corretamente", () => {
    const r = reconstructCnaeAnswers(MIXED, [{ code: "4712-1/00" }], {});
    expect(r["4712-1/00"].answers).toHaveLength(2);
    expect(r["4712-1/00"].nivel2Answers).toHaveLength(1);
    expect(r["4712-1/00"].nivel2Done).toBe(true);
  });
});

describe("BUG-Q1-V3 — reconstructCnaeAnswers: cenário skipped (hasGap)", () => {
  it("nivel1Done = true via flag skipped mesmo sem respostas", () => {
    const r = reconstructCnaeAnswers([], [{ code: "9999-9/99" }], {
      "9999-9/99": { skipped: true },
    });
    expect(r["9999-9/99"].answers).toHaveLength(0);
    expect(r["9999-9/99"].nivel1Done).toBe(true); // skipped → processado
    expect(r["9999-9/99"].skipped).toBe(true);
  });

  it("nivel1Done = false quando sem respostas E sem skipped", () => {
    const r = reconstructCnaeAnswers([], [{ code: "8888-8/88" }], {
      "8888-8/88": { skipped: false },
    });
    expect(r["8888-8/88"].nivel1Done).toBe(false);
  });
});

describe("BUG-Q1-V3 — reconstructCnaeAnswers: robustez de fontes de código", () => {
  it("inclui CNAE presente só nas rows (não em confirmedCnaes)", () => {
    const rows: QAnswerRow[] = [
      { cnaeCode: "1234-5/00", level: "nivel1", questionText: "P", answerValue: "Sim" },
    ];
    const r = reconstructCnaeAnswers(rows, [], {});
    expect(r["1234-5/00"]).toBeDefined();
    expect(r["1234-5/00"].answers).toHaveLength(1);
  });

  it("inclui CNAE presente só em flags (skipped sem rows)", () => {
    const r = reconstructCnaeAnswers([], [], { "5555-5/00": { skipped: true } });
    expect(r["5555-5/00"]).toBeDefined();
    expect(r["5555-5/00"].nivel1Done).toBe(true);
  });

  it("description: prioriza confirmedCnaes; fallback para cnaeDescription das rows", () => {
    const rows: QAnswerRow[] = [
      { cnaeCode: "1111-1/00", cnaeDescription: "Desc da row", level: "nivel1", questionText: "P", answerValue: "Sim" },
      { cnaeCode: "2222-2/00", cnaeDescription: "Outra row", level: "nivel1", questionText: "Q", answerValue: "Não" },
    ];
    const r = reconstructCnaeAnswers(
      rows,
      [{ code: "1111-1/00", description: "Desc confirmada" }],
      {},
    );
    expect(r["1111-1/00"].description).toBe("Desc confirmada"); // confirmedCnaes prioritário
    expect(r["2222-2/00"].description).toBe("Outra row");       // fallback row
  });

  it("multi-CNAE: cada um com suas próprias respostas", () => {
    const rows: QAnswerRow[] = [
      { cnaeCode: "AAAA", level: "nivel1", questionText: "a1", answerValue: "Sim" },
      { cnaeCode: "AAAA", level: "nivel1", questionText: "a2", answerValue: "Não" },
      { cnaeCode: "BBBB", level: "nivel1", questionText: "b1", answerValue: "Sim" },
    ];
    const r = reconstructCnaeAnswers(rows, [{ code: "AAAA" }, { code: "BBBB" }], {});
    expect(r["AAAA"].answers).toHaveLength(2);
    expect(r["BBBB"].answers).toHaveLength(1);
  });
});

// ─── Contrato backend (diagnostic.ts) ──────────────────────────────────────
describe("BUG-Q1-V3 — diagnostic.ts (completeDiagnosticLayer)", () => {
  const diag = readFileSync(DIAGNOSTIC_PATH, "utf8");

  it("importa reconstructCnaeAnswers + questionnaireAnswersV3 + eq", () => {
    expect(diag).toMatch(/import\s+\{\s*reconstructCnaeAnswers\s*\}\s+from\s+["']\.\.\/lib\/reconstruct-cnae-answers["']/);
    expect(diag).toMatch(/import\s+\{\s*questionnaireAnswersV3\s*\}\s+from/);
    expect(diag).toMatch(/import\s+\{\s*eq\s*\}\s+from\s+["']drizzle-orm["']/);
  });

  it("input aceita cnaeFlags opcional + answers opcional (retrocompat)", () => {
    expect(diag).toMatch(/cnaeFlags:\s*z\.record\(/);
    expect(diag).toMatch(/answers:\s*z\.record\(z\.string\(\),\s*z\.any\(\)\)\.optional\(\)/);
  });

  it("para layer=cnae: SELECT questionnaireAnswersV3 + reconstructCnaeAnswers", () => {
    const match = diag.match(/if\s*\(input\.layer\s*===\s*["']cnae["']\)[\s\S]{0,800}?reconstructCnaeAnswers\(/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/\.from\(questionnaireAnswersV3\)/);
    expect(match![0]).toMatch(/eq\(questionnaireAnswersV3\.projectId/);
  });

  it("corporate/operational mantêm input.answers (retrocompat)", () => {
    expect(diag).toMatch(/cnaeAnswersValue\s*=\s*input\.answers\s*\?\?\s*\{\}/);
  });
});

// ─── Contrato frontend (QuestionarioV3.tsx) ────────────────────────────────
describe("BUG-Q1-V3 — QuestionarioV3.tsx envia apenas cnaeFlags", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("monta cnaeFlags { [code]: { skipped } } em vez de cnaeAnswersAggregated", () => {
    expect(qv3).toMatch(/const\s+cnaeFlags\s*=\s*cnaeProgress\.reduce/);
    expect(qv3).toMatch(/skipped:\s*c\.skipped\s*\?\?\s*false/);
  });

  it("completeDiagnosticLayer.mutateAsync envia cnaeFlags (não answers)", () => {
    const match = qv3.match(/completeDiagnosticLayer\.mutateAsync\(\{[\s\S]{0,200}?\}\)/);
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/cnaeFlags/);
    expect(match![0]).toMatch(/layer:\s*["']cnae["']/);
  });
});
