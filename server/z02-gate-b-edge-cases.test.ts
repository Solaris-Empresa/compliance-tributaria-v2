/**
 * z02-gate-b-edge-cases.test.ts — Z-02 GAP 2
 *
 * 5 cenários de borda pré-Gate B (gate "cnaes_confirmados")
 * que bloqueiam a transição para diagnostico_corporativo.
 *
 * Gate B = checkGate("cnaes_confirmados", project)
 * Requisito: confirmedCnaes deve ser array não-vazio.
 */

import { describe, it, expect } from "vitest";
import { validateTransition } from "./flowStateMachine";
import type { ProjectStateSnapshot } from "./flowStateMachine";

// ---------------------------------------------------------------------------
// Helper: snapshot base com CNAEs confirmados (projeto saudável)
// ---------------------------------------------------------------------------
function baseProject(overrides: Partial<ProjectStateSnapshot> = {}): ProjectStateSnapshot {
  return {
    id: 1,
    currentStep: 4,
    currentStepName: "confirmacao_cnaes",
    status: "cnaes_confirmados",
    consistencyCheckStatus: "ok",
    confirmedCnaes: ["6201-5/01", "6202-3/00"],
    flowVersion: "v3",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Cenário 1: confirmedCnaes = null → Gate B deve BLOQUEAR
// ---------------------------------------------------------------------------
describe("Gate B — Cenário 1: confirmedCnaes = null", () => {
  it("deve bloquear transição para diagnostico_corporativo quando confirmedCnaes é null", () => {
    const project = baseProject({ confirmedCnaes: null });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/CNAE/i);
  });

  it("deve bloquear transição para diagnostico_corporativo quando confirmedCnaes é undefined", () => {
    const project = baseProject({ confirmedCnaes: undefined });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/CNAE/i);
  });
});

// ---------------------------------------------------------------------------
// Cenário 2: confirmedCnaes = [] (array vazio) → Gate B deve BLOQUEAR
// ---------------------------------------------------------------------------
describe("Gate B — Cenário 2: confirmedCnaes = [] (array vazio)", () => {
  it("deve bloquear transição quando confirmedCnaes é array vazio", () => {
    const project = baseProject({ confirmedCnaes: [] });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/CNAE/i);
  });
});

// ---------------------------------------------------------------------------
// Cenário 3: confirmedCnaes com 1 CNAE válido → Gate B deve PASSAR
// ---------------------------------------------------------------------------
describe("Gate B — Cenário 3: confirmedCnaes com 1 CNAE válido", () => {
  it("deve permitir transição quando há pelo menos 1 CNAE confirmado", () => {
    const project = baseProject({ confirmedCnaes: ["6201-5/01"] });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cenário 4: confirmedCnaes com múltiplos CNAEs → Gate B deve PASSAR
// ---------------------------------------------------------------------------
describe("Gate B — Cenário 4: confirmedCnaes com múltiplos CNAEs", () => {
  it("deve permitir transição com 5 CNAEs confirmados", () => {
    const project = baseProject({
      confirmedCnaes: [
        "6201-5/01",
        "6202-3/00",
        "7020-4/00",
        "4711-3/01",
        "4712-1/00",
      ],
    });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(true);
  });

  it("deve retornar newStepName = diagnostico_corporativo quando permitido", () => {
    const project = baseProject({ confirmedCnaes: ["6201-5/01", "6202-3/00"] });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(true);
    expect(result.newStepName).toBe("diagnostico_corporativo");
  });
});

// ---------------------------------------------------------------------------
// Cenário 5: status inválido para Gate B (projeto em rascunho) → BLOQUEAR
// ---------------------------------------------------------------------------
describe("Gate B — Cenário 5: projeto em rascunho tenta pular para diagnostico_corporativo", () => {
  it("deve bloquear transição direta de rascunho para diagnostico_corporativo", () => {
    const project = baseProject({
      currentStep: 1,
      currentStepName: "cadastro_empresa",
      status: "rascunho",
      confirmedCnaes: ["6201-5/01"], // CNAEs presentes mas status errado
    });
    const result = validateTransition(project, "diagnostico_corporativo");
    // Transição inválida: rascunho não pode ir direto para diagnostico_corporativo
    expect(result.allowed).toBe(false);
  });

  it("deve bloquear transição de cnaes_confirmados para diagnostico_corporativo sem CNAEs", () => {
    const project = baseProject({
      currentStep: 4,
      currentStepName: "confirmacao_cnaes",
      status: "cnaes_confirmados",
      confirmedCnaes: null, // Gate B falha
    });
    const result = validateTransition(project, "diagnostico_corporativo");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/CNAE/i);
  });
});
