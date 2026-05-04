/**
 * m3.7-determinismo.test.ts
 * Sprint M3.7 — Item 6 — Determinismo absoluto (REGRA-ORQ-30)
 *
 * Issue: #943
 * Spec: REGRA-ORQ-30 — Toda chamada invokeLLM em código de produção DEVE
 * usar temperature <= 0.1.
 *
 * Auditoria empírica via leitura source code (REGRA-ORQ-27 Plano B):
 * o gate INV-07 do CI também detecta as mesmas violações via grep.
 *
 * Vinculadas:
 * - PR #939 — REGRA-ORQ-30 (governance)
 * - Issue #943 (esta)
 * - PR #948 — REGRA-ORQ-33 (RACI)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROUTERS_FLUXO_V3_SRC = readFileSync(
  path.resolve(__dirname, "..", "routers-fluxo-v3.ts"),
  "utf-8",
);
const TASK_GENERATOR_SRC = readFileSync(
  path.resolve(__dirname, "task-generator-v4.ts"),
  "utf-8",
);

describe("M3.7 Item 6 — REGRA-ORQ-30: temperature ≤ 0.1 em todas as chamadas LLM", () => {
  it("routers-fluxo-v3.ts não contém temperature > 0.1 (regex CI INV-07)", () => {
    // Mesma regex do gate INV-07 documentado em REGRA-ORQ-30
    const violations = ROUTERS_FLUXO_V3_SRC.match(/temperature:\s*0\.(1[1-9]|[2-9])/g);
    expect(violations).toBeNull();
  });

  it("task-generator-v4.ts não contém temperature > 0.1", () => {
    const violations = TASK_GENERATOR_SRC.match(/temperature:\s*0\.(1[1-9]|[2-9])/g);
    expect(violations).toBeNull();
  });

  it("generateQuestions usa temperature: 0.1 (era 0.2)", () => {
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0\.1[^0-9].*generateQuestions/);
  });

  it("generateRiskMatrices usa temperature: 0.1 (era 0.2)", () => {
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0\.1[^0-9].*generateRiskMatrices/);
  });

  it("generateActionPlan usa temperature: 0.1 (era 0.15)", () => {
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0\.1[^0-9].*generateActionPlan/);
  });

  it("generateDecision usa temperature: 0.1 (era 0.35) e remove comentário 'criativo'", () => {
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0\.1[^0-9].*generateDecision/);
    expect(ROUTERS_FLUXO_V3_SRC).not.toMatch(/insight criativo/);
  });

  it("Onda 2 IA Gen mantém temperature: 0.1 e remove comentário contraditório 'Z-11: determinístico'", () => {
    // Linha tinha valor 0.1 mas comentário "Z-11: determinístico" (contradição: 0.1 não é determinístico puro)
    // Fix: comentário renomeado para REGRA-ORQ-30
    expect(ROUTERS_FLUXO_V3_SRC).not.toMatch(/Z-11:\s*determinístico/);
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0\.1.*REGRA-ORQ-30/);
  });

  it("task-generator-v4 usa temperature: 0.1 (era 0.3)", () => {
    expect(TASK_GENERATOR_SRC).toMatch(/temperature:\s*0\.1[^0-9]/);
    expect(TASK_GENERATOR_SRC).not.toMatch(/temperature:\s*0\.3/);
  });

  it("chamadas LLM com temperature: 0 (preferencial) preservadas", () => {
    // briefing v2 (1360), generateBriefingFromDiagnostic (3300), rerankWithLLM são casos de
    // extração/classificação onde 0 é correto. Não devem mudar para 0.1.
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(/temperature:\s*0[,\s]+context.*generateBriefingFromDiagnostic/);
  });
});
