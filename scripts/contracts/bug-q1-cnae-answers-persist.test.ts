/**
 * Test contracts — BUG-Q1: cnaeAnswers não persiste quando hasGap=true
 * Sprint BUG-Q1 20/05/2026 · REGRA-ORQ-28 Artefato 2
 *
 * Valida o CONTRATO do fix em QuestionarioV3.tsx:
 *   1. onAvancar do CnaeGapBanner marca nivel1Done=true (CNAE processado)
 *   2. onAvancar marca skipped=true (semantic: skipped por hasGap)
 *   3. Reconciliação com savedProgress.answers via extractAnswersForCnae
 *      (caso edge: user respondeu antes de hasGap virar true)
 *   4. Helper cnae-progress-reconciliation continua exportando os símbolos
 *      esperados (regressão guard do PR #1067)
 *   5. handleFinishQuestionnaire continua agregando skipped no payload
 *
 * Validação E2E (UI real) é responsabilidade do P.O. pós-deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  extractAnswersForCnae,
  shouldReconcile,
  type SavedAnswerRow,
  type CnaeProgressAnswer,
} from "../../client/src/lib/cnae-progress-reconciliation";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const QV3_PATH = path.join(REPO_ROOT, "client", "src", "pages", "QuestionarioV3.tsx");
const RECONCILE_PATH = path.join(
  REPO_ROOT,
  "client",
  "src",
  "lib",
  "cnae-progress-reconciliation.ts"
);

describe("BUG-Q1 — onAvancar do CnaeGapBanner marca CNAE como processado", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("define nivel1Done=true ao avançar com hasGap=true", () => {
    // Extrai o handler onAvancar do CnaeGapBanner (procura entre comentário BUG-Q1 e advanceToNextCnae)
    const match = qv3.match(
      /BUG-Q1[\s\S]{0,2000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/nivel1Done:\s*true/);
  });

  it("define skipped=true ao avançar com hasGap=true", () => {
    const match = qv3.match(
      /BUG-Q1[\s\S]{0,2000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/skipped:\s*true/);
  });

  it("chama extractAnswersForCnae antes de setCnaeProgress (reconciliação)", () => {
    const match = qv3.match(
      /BUG-Q1[\s\S]{0,2000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/extractAnswersForCnae\(/);
    expect(match![0]).toMatch(/savedProgress\?\.answers\s*\?\?\s*\[\]/);
    expect(match![0]).toMatch(/currentCnae\.code/);
  });

  it("usa respostas salvas quando savedForCurrent.length > 0", () => {
    const match = qv3.match(
      /BUG-Q1[\s\S]{0,2000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    // Padrão: savedForCurrent.length > 0 ? savedForCurrent : (c.answers ?? [])
    expect(match![0]).toMatch(
      /savedForCurrent\.length\s*>\s*0[\s\S]*?savedForCurrent[\s\S]*?c\.answers/
    );
  });

  it("preserva chamada existente a auditCnaeGapSkipMutation (não regrediu)", () => {
    const match = qv3.match(
      /CnaeGapBanner[\s\S]{0,3000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/auditCnaeGapSkipMutation\.mutate/);
  });

  it("preserva setHasGapForCurrentCnae(false) antes do advance", () => {
    const match = qv3.match(
      /CnaeGapBanner[\s\S]{0,3000}?advanceToNextCnae\(cnaes\.length\)/
    );
    expect(match).not.toBeNull();
    expect(match![0]).toMatch(/setHasGapForCurrentCnae\(false\)/);
  });
});

describe("BUG-Q1 — cnae-progress-reconciliation helper (regressão guard PR #1067)", () => {
  const reconcile = readFileSync(RECONCILE_PATH, "utf8");

  it("exporta extractAnswersForCnae", () => {
    expect(reconcile).toMatch(/export\s+function\s+extractAnswersForCnae/);
  });

  it("exporta shouldReconcile", () => {
    expect(reconcile).toMatch(/export\s+function\s+shouldReconcile/);
  });

  it("exporta SavedAnswerRow + CnaeProgressAnswer", () => {
    expect(reconcile).toMatch(/export\s+interface\s+SavedAnswerRow/);
    expect(reconcile).toMatch(/export\s+interface\s+CnaeProgressAnswer/);
  });
});

describe("BUG-Q1 — extractAnswersForCnae (unit test)", () => {
  const saved: SavedAnswerRow[] = [
    { cnaeCode: "47113/02", level: "nivel1", questionText: "P1", answerValue: "Sim" },
    { cnaeCode: "47113/02", level: "nivel1", questionText: "P2", answerValue: "Não" },
    { cnaeCode: "47113/02", level: "nivel2", questionText: "P3", answerValue: "Sim" },
    { cnaeCode: "49302/02", level: "nivel1", questionText: "Q1", answerValue: "Sim" },
  ];

  it("retorna apenas respostas do CNAE e level solicitados", () => {
    const result = extractAnswersForCnae(saved, "47113/02", "nivel1");
    expect(result).toEqual([
      { question: "P1", answer: "Sim" },
      { question: "P2", answer: "Não" },
    ]);
  });

  it("retorna array vazio para CNAE sem respostas", () => {
    const result = extractAnswersForCnae(saved, "99999/00", "nivel1");
    expect(result).toEqual([]);
  });

  it("retorna array vazio para cnaeCode vazio (guard)", () => {
    const result = extractAnswersForCnae(saved, "");
    expect(result).toEqual([]);
  });
});

describe("BUG-Q1 — shouldReconcile (unit test)", () => {
  it("retorna true quando current está vazio e há respostas salvas", () => {
    const current: CnaeProgressAnswer[] = [];
    const savedAnswers: CnaeProgressAnswer[] = [
      { question: "P1", answer: "Sim" },
    ];
    expect(shouldReconcile(current, savedAnswers)).toBe(true);
  });

  it("retorna false quando ambos vazios (não há nada para reconciliar)", () => {
    expect(shouldReconcile([], [])).toBe(false);
  });

  it("retorna false quando current tem mesma quantidade que savedAnswers", () => {
    const current: CnaeProgressAnswer[] = [{ question: "P1", answer: "Sim" }];
    const savedAnswers: CnaeProgressAnswer[] = [{ question: "P1", answer: "Sim" }];
    expect(shouldReconcile(current, savedAnswers)).toBe(false);
  });

  it("retorna true quando current tem MENOS que savedAnswers", () => {
    const current: CnaeProgressAnswer[] = [{ question: "P1", answer: "Sim" }];
    const savedAnswers: CnaeProgressAnswer[] = [
      { question: "P1", answer: "Sim" },
      { question: "P2", answer: "Não" },
    ];
    expect(shouldReconcile(current, savedAnswers)).toBe(true);
  });
});

describe("BUG-Q1 — handleFinishQuestionnaire continua agregando skipped no payload", () => {
  const qv3 = readFileSync(QV3_PATH, "utf8");

  it("cnaeAnswersAggregated inclui skipped: c.skipped ?? false", () => {
    expect(qv3).toMatch(/skipped:\s*c\.skipped\s*\?\?\s*false/);
  });

  it("cnaeAnswersAggregated inclui nivel1Done: c.nivel1Done", () => {
    expect(qv3).toMatch(/nivel1Done:\s*c\.nivel1Done/);
  });
});
