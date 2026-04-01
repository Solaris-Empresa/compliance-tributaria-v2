/**
 * k4c-onda2-iagen.test.ts — Testes K-4-C: Questionário IA Generativa (Onda 2)
 * Sprint K — FLUXO-3-ONDAS v1.1 Seção 9
 *
 * Testa:
 * T-K4C-01: Schema iagenAnswers tem as colunas obrigatórias
 * T-K4C-02: Schema iagenAnswers tem confidence_score
 * T-K4C-03: VALID_TRANSITIONS inclui onda1_solaris → onda2_iagen
 * T-K4C-04: VALID_TRANSITIONS inclui onda2_iagen → diagnostico_corporativo
 * T-K4C-05: assertValidTransition bloqueia onda2_iagen → onda1_solaris (retrocesso)
 * T-K4C-06: assertValidTransition permite onda1_solaris → onda2_iagen
 * T-K4C-07: assertValidTransition permite onda2_iagen → diagnostico_corporativo
 * T-K4C-08: Funções de iagen_answers existem no db.ts
 * T-K4C-09: QuestionarioIaGen.tsx existe no frontend
 * T-K4C-10: Rota /questionario-iagen está registrada no App.tsx
 * T-K4C-11: onStartOnda2 está presente no ProjetoDetalhesV2.tsx
 * T-K4C-12: Regressão K-4-A: cnaes_confirmados → onda1_solaris ainda válido
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { readFileSync } from "fs";
import path from "path";

// ─── Imports do schema e state machine ───────────────────────────────────────
import { iagenAnswers } from "../drizzle/schema";
import { VALID_TRANSITIONS, assertValidTransition } from "./flowStateMachine";

// ─── T-K4C-01: Schema iagenAnswers tem as colunas obrigatórias ───────────────
describe("T-K4C-01: Schema iagenAnswers — colunas obrigatórias", () => {
  it("deve ter as colunas id, projectId, questionText, resposta, createdAt", () => {
    const cols = Object.keys(iagenAnswers);
    expect(cols).toContain("id");
    expect(cols).toContain("projectId");
    expect(cols).toContain("questionText");
    expect(cols).toContain("resposta");
    expect(cols).toContain("createdAt");
  });
});

// ─── T-K4C-02: Schema iagenAnswers tem confidence_score ──────────────────────
describe("T-K4C-02: Schema iagenAnswers — confidence_score obrigatório", () => {
  it("deve ter a coluna confidenceScore (Seção 9 do contrato)", () => {
    const cols = Object.keys(iagenAnswers);
    expect(cols).toContain("confidenceScore");
  });
});

// ─── T-K4C-03: VALID_TRANSITIONS onda1_solaris → onda2_iagen ─────────────────
describe("T-K4C-03: VALID_TRANSITIONS — onda1_solaris → onda2_iagen", () => {
  it("deve permitir transição de onda1_solaris para onda2_iagen", () => {
    const targets = VALID_TRANSITIONS["onda1_solaris"] ?? [];
    expect(targets).toContain("onda2_iagen");
  });
});

// ─── T-K4C-04: VALID_TRANSITIONS onda2_iagen → diagnostico_corporativo ───────
describe("T-K4C-04: VALID_TRANSITIONS — onda2_iagen → diagnostico_corporativo", () => {
  it("deve permitir transição de onda2_iagen para diagnostico_corporativo", () => {
    const targets = VALID_TRANSITIONS["onda2_iagen"] ?? [];
    expect(targets).toContain("diagnostico_corporativo");
  });
});

// ─── T-K4C-05: assertValidTransition bloqueia retrocesso ─────────────────────
describe("T-K4C-05: assertValidTransition — bloqueia retrocesso onda2_iagen → onda1_solaris", () => {
  it("deve lançar erro ao tentar voltar de onda2_iagen para onda1_solaris", () => {
    expect(() => assertValidTransition("onda2_iagen", "onda1_solaris")).toThrow();
  });
});

// ─── T-K4C-06: assertValidTransition permite onda1_solaris → onda2_iagen ─────
describe("T-K4C-06: assertValidTransition — permite onda1_solaris → onda2_iagen", () => {
  it("não deve lançar erro para transição válida onda1_solaris → onda2_iagen", () => {
    expect(() => assertValidTransition("onda1_solaris", "onda2_iagen")).not.toThrow();
  });
});

// ─── T-K4C-07: assertValidTransition permite onda2_iagen → diagnostico_corporativo
describe("T-K4C-07: assertValidTransition — permite onda2_iagen → diagnostico_corporativo", () => {
  it("não deve lançar erro para transição válida onda2_iagen → diagnostico_corporativo", () => {
    expect(() => assertValidTransition("onda2_iagen", "diagnostico_corporativo")).not.toThrow();
  });
});

// ─── T-K4C-08: Funções de iagen_answers existem no db.ts ─────────────────────
describe("T-K4C-08: db.ts — funções de iagen_answers", () => {
  it("deve ter saveOnda2Answers, getOnda2Answers e countOnda2Answers no db.ts", () => {
    const dbPath = path.resolve(__dirname, "db.ts");
    const content = readFileSync(dbPath, "utf-8");
    expect(content).toContain("saveOnda2Answers");
    expect(content).toContain("getOnda2Answers");
    expect(content).toContain("countOnda2Answers");
  });
});

// ─── T-K4C-09: QuestionarioIaGen.tsx existe no frontend ──────────────────────
describe("T-K4C-09: QuestionarioIaGen.tsx — arquivo existe", () => {
  it("deve existir o componente QuestionarioIaGen.tsx", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/QuestionarioIaGen.tsx"
    );
    expect(existsSync(filePath)).toBe(true);
  });
});

// ─── T-K4C-10: Rota /questionario-iagen registrada no App.tsx ────────────────
describe("T-K4C-10: App.tsx — rota /questionario-iagen registrada", () => {
  it("deve ter a rota /questionario-iagen no App.tsx", () => {
    const appPath = path.resolve(__dirname, "../client/src/App.tsx");
    const content = readFileSync(appPath, "utf-8");
    expect(content).toContain("questionario-iagen");
    expect(content).toContain("QuestionarioIaGen");
  });
});

// ─── T-K4C-11: onStartOnda2 presente no ProjetoDetalhesV2.tsx ────────────────
describe("T-K4C-11: ProjetoDetalhesV2.tsx — onStartOnda2 wiring", () => {
  it("deve ter onStartOnda2 passado ao DiagnosticoStepper", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ProjetoDetalhesV2.tsx"
    );
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("onStartOnda2");
    expect(content).toContain("questionario-iagen");
  });
});

// ─── T-K4C-12: Regressão K-4-A — cnaes_confirmados → onda1_solaris ───────────
describe("T-K4C-12: Regressão K-4-A — cnaes_confirmados → onda1_solaris", () => {
  it("deve manter a transição cnaes_confirmados → onda1_solaris (regressão K-4-A)", () => {
    const targets = VALID_TRANSITIONS["cnaes_confirmados"] ?? [];
    expect(targets).toContain("onda1_solaris");
    expect(targets).not.toContain("diagnostico_corporativo");
  });
});
