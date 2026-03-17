/**
 * Testes de UX de Navegação
 *
 * Cobre:
 * 1. Lógica de persistência da sidebar (localStorage)
 * 2. Lógica de CTA inteligente por status do projeto
 * 3. Lógica do FlowStepper (etapas clicáveis vs bloqueadas)
 */
import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Sidebar — lógica de persistência
// ─────────────────────────────────────────────────────────────────────────────

function getSidebarInitialState(localStorageValue: string | null): boolean {
  if (localStorageValue !== null) return localStorageValue === "true";
  return true; // padrão: aberta
}

function toggleAndPersist(current: boolean): { next: boolean; stored: string } {
  const next = !current;
  return { next, stored: String(next) };
}

describe("Sidebar — persistência localStorage", () => {
  it("abre por padrão quando localStorage está vazio", () => {
    expect(getSidebarInitialState(null)).toBe(true);
  });

  it("restaura estado 'aberta' do localStorage", () => {
    expect(getSidebarInitialState("true")).toBe(true);
  });

  it("restaura estado 'fechada' do localStorage", () => {
    expect(getSidebarInitialState("false")).toBe(false);
  });

  it("toggle de aberta → fechada persiste 'false'", () => {
    const { next, stored } = toggleAndPersist(true);
    expect(next).toBe(false);
    expect(stored).toBe("false");
  });

  it("toggle de fechada → aberta persiste 'true'", () => {
    const { next, stored } = toggleAndPersist(false);
    expect(next).toBe(true);
    expect(stored).toBe("true");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cards de projeto — CTA inteligente por status
// ─────────────────────────────────────────────────────────────────────────────

type CTAType = "Ver Resultados" | "Continuar Fluxo" | "Ver o fluxo";

function getProjectCTA(status: string): CTAType {
  const isDone = ["aprovado", "concluido", "arquivado"].includes(status);
  const isInProgress = [
    "assessment_fase1", "assessment_fase2", "matriz_riscos",
    "plano_acao", "em_avaliacao", "em_andamento", "parado",
  ].includes(status);
  if (isDone) return "Ver Resultados";
  if (isInProgress) return "Continuar Fluxo";
  return "Ver o fluxo";
}

describe("Cards de projeto — CTA inteligente", () => {
  it("rascunho → 'Ver o fluxo'", () => {
    expect(getProjectCTA("rascunho")).toBe("Ver o fluxo");
  });

  it("assessment_fase1 → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("assessment_fase1")).toBe("Continuar Fluxo");
  });

  it("assessment_fase2 → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("assessment_fase2")).toBe("Continuar Fluxo");
  });

  it("matriz_riscos → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("matriz_riscos")).toBe("Continuar Fluxo");
  });

  it("plano_acao → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("plano_acao")).toBe("Continuar Fluxo");
  });

  it("em_avaliacao → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("em_avaliacao")).toBe("Continuar Fluxo");
  });

  it("em_andamento → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("em_andamento")).toBe("Continuar Fluxo");
  });

  it("parado → 'Continuar Fluxo'", () => {
    expect(getProjectCTA("parado")).toBe("Continuar Fluxo");
  });

  it("aprovado → 'Ver Resultados'", () => {
    expect(getProjectCTA("aprovado")).toBe("Ver Resultados");
  });

  it("concluido → 'Ver Resultados'", () => {
    expect(getProjectCTA("concluido")).toBe("Ver Resultados");
  });

  it("arquivado → 'Ver Resultados'", () => {
    expect(getProjectCTA("arquivado")).toBe("Ver Resultados");
  });

  it("status desconhecido → 'Ver o fluxo' (fallback seguro)", () => {
    expect(getProjectCTA("unknown_status")).toBe("Ver o fluxo");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. FlowStepper — lógica de clicabilidade e estado
// ─────────────────────────────────────────────────────────────────────────────

type StepState = "done" | "active" | "locked";

function getStepState(stepNum: number, currentStep: number, completedUpTo: number): StepState {
  if (stepNum === currentStep) return "active";
  if (stepNum < currentStep || stepNum <= completedUpTo) return "done";
  return "locked";
}

function isStepClickable(stepNum: number, currentStep: number, completedUpTo: number): boolean {
  const state = getStepState(stepNum, currentStep, completedUpTo);
  return state === "done"; // clicável apenas se concluída e não é a atual
}

describe("FlowStepper — estados das etapas", () => {
  it("etapa atual é 'active'", () => {
    expect(getStepState(2, 2, 1)).toBe("active");
  });

  it("etapa anterior à atual é 'done'", () => {
    expect(getStepState(1, 2, 1)).toBe("done");
  });

  it("etapa futura é 'locked'", () => {
    expect(getStepState(3, 2, 1)).toBe("locked");
  });

  it("etapa concluída além da atual é 'done' (completedUpTo > currentStep)", () => {
    // usuário voltou para revisar uma etapa anterior
    expect(getStepState(3, 2, 4)).toBe("done");
  });

  it("etapa 1 (Projeto) é sempre done quando currentStep >= 2", () => {
    expect(getStepState(1, 3, 2)).toBe("done");
    expect(getStepState(1, 5, 4)).toBe("done");
  });

  it("etapa 5 (Plano) é locked quando currentStep = 2", () => {
    expect(getStepState(5, 2, 1)).toBe("locked");
  });
});

describe("FlowStepper — clicabilidade", () => {
  it("etapa concluída é clicável", () => {
    expect(isStepClickable(1, 3, 2)).toBe(true);
  });

  it("etapa atual NÃO é clicável (já está nela)", () => {
    expect(isStepClickable(2, 2, 1)).toBe(false);
  });

  it("etapa futura NÃO é clicável", () => {
    expect(isStepClickable(4, 2, 1)).toBe(false);
  });

  it("etapa 2 é clicável quando usuário está na etapa 4 e completou até 3", () => {
    expect(isStepClickable(2, 4, 3)).toBe(true);
  });
});
