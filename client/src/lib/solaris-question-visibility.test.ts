import { describe, it, expect } from "vitest";
import {
  answerIsAffirmative,
  computeVisibleSolarisQuestions,
} from "./solaris-question-visibility";

// Fixture mínima — espelha o shape de Question do QuestionarioSolaris.
const SOL050 = { id: 100, codigo: "SOL-050" };
const SOL051 = { id: 101, codigo: "SOL-051" };
const SOL052 = { id: 102, codigo: "SOL-052" };
const OTHER = { id: 99, codigo: "SOL-038" };

const FULL = [OTHER, SOL050, SOL051, SOL052];

describe("answerIsAffirmative (paridade com gate eligibility.ts:46)", () => {
  it("'Sim. ...' → true", () => {
    expect(answerIsAffirmative("Sim. compra de produtor X")).toBe(true);
  });
  it("'sim' minúsculo → true (case-insensitive)", () => {
    expect(answerIsAffirmative("sim")).toBe(true);
  });
  it("'  Sim  ' com espaços → true (trim)", () => {
    expect(answerIsAffirmative("  Sim  ")).toBe(true);
  });
  it("'Não. ...' → false", () => {
    expect(answerIsAffirmative("Não. não adquire")).toBe(false);
  });
  it("'N/A. ...' → false", () => {
    expect(answerIsAffirmative("N/A. não se aplica")).toBe(false);
  });
  it("vazio / undefined / null → false", () => {
    expect(answerIsAffirmative("")).toBe(false);
    expect(answerIsAffirmative(undefined)).toBe(false);
    expect(answerIsAffirmative(null)).toBe(false);
  });
  it("'simples...' → true (quirk herdado do gate; display nunca diverge do consumidor)", () => {
    // Documenta paridade: o gate usa startsWith('sim'); replicamos igual.
    expect(answerIsAffirmative("simples nacional")).toBe(true);
  });
});

describe("computeVisibleSolarisQuestions — dependência SOL-052 → SOL-051='Sim'", () => {
  it("SOL-051='Sim' → SOL-052 VISÍVEL", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {
      [SOL051.id]: "Sim. adquire de produtor rural",
    });
    expect(visible.map((q) => q.codigo)).toContain("SOL-052");
    expect(visible).toHaveLength(4);
  });

  it("SOL-051='Não' → SOL-052 OCULTA", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {
      [SOL051.id]: "Não. não adquire",
    });
    expect(visible.map((q) => q.codigo)).not.toContain("SOL-052");
    expect(visible.map((q) => q.codigo)).toEqual(["SOL-038", "SOL-050", "SOL-051"]);
  });

  it("SOL-051='N/A' → SOL-052 OCULTA", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {
      [SOL051.id]: "N/A. não se aplica",
    });
    expect(visible.map((q) => q.codigo)).not.toContain("SOL-052");
  });

  it("SOL-051 não respondida → SOL-052 OCULTA (progressive disclosure)", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {});
    expect(visible.map((q) => q.codigo)).not.toContain("SOL-052");
  });

  it("toggle reativo: Sim → Não remove SOL-052; Não → Sim restaura", () => {
    const sim = computeVisibleSolarisQuestions(FULL, { [SOL051.id]: "Sim." });
    expect(sim.map((q) => q.codigo)).toContain("SOL-052");
    const nao = computeVisibleSolarisQuestions(FULL, { [SOL051.id]: "Não." });
    expect(nao.map((q) => q.codigo)).not.toContain("SOL-052");
    const simAgain = computeVisibleSolarisQuestions(FULL, { [SOL051.id]: "Sim." });
    expect(simAgain.map((q) => q.codigo)).toContain("SOL-052");
  });

  it("SOL-051 AUSENTE da lista mas SOL-052 presente → SOL-052 OCULTA (conservador)", () => {
    const semSol051 = [OTHER, SOL050, SOL052];
    const visible = computeVisibleSolarisQuestions(semSol051, {});
    expect(visible.map((q) => q.codigo)).not.toContain("SOL-052");
    expect(visible.map((q) => q.codigo)).toEqual(["SOL-038", "SOL-050"]);
  });

  it("sem SOL-052 na lista → lista inalterada (nenhuma outra pergunta é filtrada)", () => {
    const semSol052 = [OTHER, SOL050, SOL051];
    const visible = computeVisibleSolarisQuestions(semSol052, {
      [SOL051.id]: "Não.",
    });
    expect(visible).toHaveLength(3);
    expect(visible.map((q) => q.codigo)).toEqual(["SOL-038", "SOL-050", "SOL-051"]);
  });

  it("demais perguntas (SOL-050, SOL-038) nunca são filtradas, independente de SOL-051", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {
      [SOL051.id]: "Não.",
    });
    expect(visible.map((q) => q.codigo)).toContain("SOL-050");
    expect(visible.map((q) => q.codigo)).toContain("SOL-038");
  });

  it("preserva a ordem original das perguntas", () => {
    const visible = computeVisibleSolarisQuestions(FULL, {
      [SOL051.id]: "Sim.",
    });
    expect(visible.map((q) => q.codigo)).toEqual([
      "SOL-038",
      "SOL-050",
      "SOL-051",
      "SOL-052",
    ]);
  });
});
