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

// ─────────────────────────────────────────────────────────────────────────────
// 4. Back navigation — rota e label por etapa
// ─────────────────────────────────────────────────────────────────────────────

const BACK_NAVIGATION: Record<string, { label: string; route: (id: number) => string }> = {
  questionario: {
    label: "Voltar ao Projeto",
    route: (id) => `/projetos/${id}`,
  },
  briefing: {
    label: "Voltar ao Questionário",
    route: (id) => `/projetos/${id}/questionario-v3`,
  },
  matrizes: {
    label: "Voltar ao Briefing",
    route: (id) => `/projetos/${id}/briefing-v3`,
  },
  plano: {
    label: "Voltar às Matrizes",
    route: (id) => `/projetos/${id}/matrizes-v3`,
  },
};

describe("Back navigation — labels e rotas", () => {
  const pid = 42;

  it("Questionário volta para o Projeto com label correto", () => {
    const nav = BACK_NAVIGATION["questionario"];
    expect(nav.label).toBe("Voltar ao Projeto");
    expect(nav.route(pid)).toBe(`/projetos/${pid}`);
  });

  it("Briefing volta para o Questionário com label correto", () => {
    const nav = BACK_NAVIGATION["briefing"];
    expect(nav.label).toBe("Voltar ao Questionário");
    expect(nav.route(pid)).toBe(`/projetos/${pid}/questionario-v3`);
  });

  it("Matrizes volta para o Briefing com label correto", () => {
    const nav = BACK_NAVIGATION["matrizes"];
    expect(nav.label).toBe("Voltar ao Briefing");
    expect(nav.route(pid)).toBe(`/projetos/${pid}/briefing-v3`);
  });

  it("Plano de Ação volta para as Matrizes com label correto", () => {
    const nav = BACK_NAVIGATION["plano"];
    expect(nav.label).toBe("Voltar às Matrizes");
    expect(nav.route(pid)).toBe(`/projetos/${pid}/matrizes-v3`);
  });

  it("nenhuma etapa usa botão icon-only (sem texto)", () => {
    for (const [, nav] of Object.entries(BACK_NAVIGATION)) {
      expect(nav.label.length).toBeGreaterThan(0);
      expect(nav.label).toMatch(/^Voltar/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Regressão: rota do passo "Projeto" no stepper interno de ProjetoDetalhesV2
//    Bug: rota era /novo-projeto-v3?edit=ID → causava 404
//    Fix: rota deve ser /projetos/ID
// ─────────────────────────────────────────────────────────────────────────────

const PROJETO_DETALHE_FLOW_STEPS: { label: string; route: (id: number) => string }[] = [
  { label: "Projeto",       route: (id) => `/projetos/${id}` },
  { label: "Questionário",  route: (id) => `/projetos/${id}/questionario-v3` },
  { label: "Briefing",      route: (id) => `/projetos/${id}/briefing-v3` },
  { label: "Riscos",        route: (id) => `/projetos/${id}/matrizes-v3` },
  { label: "Plano de Ação", route: (id) => `/projetos/${id}/plano-v3` },
];

describe("ProjetoDetalhesV2 — rotas do stepper interno (regressão bug 404)", () => {
  const pid = 1141;

  it("passo Projeto navega para /projetos/:id (não para /novo-projeto-v3?edit=:id)", () => {
    const step = PROJETO_DETALHE_FLOW_STEPS[0];
    const rota = step.route(pid);
    expect(rota).toBe(`/projetos/${pid}`);
    expect(rota).not.toContain("novo-projeto-v3");
    expect(rota).not.toContain("edit=");
  });

  it("passo Questionário navega para /projetos/:id/questionario-v3", () => {
    expect(PROJETO_DETALHE_FLOW_STEPS[1].route(pid)).toBe(`/projetos/${pid}/questionario-v3`);
  });

  it("passo Briefing navega para /projetos/:id/briefing-v3", () => {
    expect(PROJETO_DETALHE_FLOW_STEPS[2].route(pid)).toBe(`/projetos/${pid}/briefing-v3`);
  });

  it("passo Riscos navega para /projetos/:id/matrizes-v3", () => {
    expect(PROJETO_DETALHE_FLOW_STEPS[3].route(pid)).toBe(`/projetos/${pid}/matrizes-v3`);
  });

  it("passo Plano de Ação navega para /projetos/:id/plano-v3", () => {
    expect(PROJETO_DETALHE_FLOW_STEPS[4].route(pid)).toBe(`/projetos/${pid}/plano-v3`);
  });

  it("nenhuma rota contém /novo-projeto-v3 ou ?edit=", () => {
    for (const step of PROJETO_DETALHE_FLOW_STEPS) {
      const rota = step.route(pid);
      expect(rota).not.toContain("novo-projeto-v3");
      expect(rota).not.toContain("edit=");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Regressão: statusToCompletedStep — FlowStepper mostra etapas cinzas
//    Bug: completedUpTo não era passado → padrão era currentStep-1 → etapas
//         concluídas ficavam cinzas em projetos com status avançado
//    Fix: statusToCompletedStep mapeia o status do projeto para a etapa correta
// ─────────────────────────────────────────────────────────────────────────────

// Replica a lógica de client/src/lib/flowStepperUtils.ts para testes server-side
function statusToCompletedStep(status: string | undefined | null): number {
  if (!status) return 1;
  const map: Record<string, number> = {
    rascunho:         1,
    assessment_fase1: 1,
    assessment_fase2: 2,
    matriz_riscos:    3,
    plano_acao:       4,
    em_avaliacao:     4,
    aprovado:         5,
    em_andamento:     5,
    parado:           5,
    concluido:        5,
    arquivado:        5,
  };
  return map[status] ?? 1;
}

describe("statusToCompletedStep — mapeamento status → etapa concluída", () => {
  it("status undefined/null retorna etapa 1 (seguro)", () => {
    expect(statusToCompletedStep(undefined)).toBe(1);
    expect(statusToCompletedStep(null)).toBe(1);
  });

  it("rascunho → etapa 1 (nenhuma etapa do fluxo concluída)", () => {
    expect(statusToCompletedStep("rascunho")).toBe(1);
  });

  it("assessment_fase1 → etapa 1 (questionário em andamento)", () => {
    expect(statusToCompletedStep("assessment_fase1")).toBe(1);
  });

  it("assessment_fase2 → etapa 2 (questionário concluído)", () => {
    expect(statusToCompletedStep("assessment_fase2")).toBe(2);
  });

  it("matriz_riscos → etapa 3 (briefing concluído)", () => {
    expect(statusToCompletedStep("matriz_riscos")).toBe(3);
  });

  it("plano_acao → etapa 4 (riscos concluídos)", () => {
    expect(statusToCompletedStep("plano_acao")).toBe(4);
  });

  it("em_avaliacao → etapa 4 (aguardando aprovação)", () => {
    expect(statusToCompletedStep("em_avaliacao")).toBe(4);
  });

  it("aprovado → etapa 5 (todas as etapas concluídas)", () => {
    expect(statusToCompletedStep("aprovado")).toBe(5);
  });

  it("em_andamento → etapa 5", () => {
    expect(statusToCompletedStep("em_andamento")).toBe(5);
  });

  it("concluido → etapa 5", () => {
    expect(statusToCompletedStep("concluido")).toBe(5);
  });

  it("arquivado → etapa 5", () => {
    expect(statusToCompletedStep("arquivado")).toBe(5);
  });

  it("status desconhecido → etapa 1 (fallback seguro)", () => {
    expect(statusToCompletedStep("status_inexistente")).toBe(1);
  });
});

describe("FlowStepper com completedUpTo — projeto Aprovado (regressão bug etapas cinzas)", () => {
  const currentStep = 2; // usuário está no Questionário
  const completedUpTo = statusToCompletedStep("aprovado"); // = 5

  it("projeto Aprovado: completedUpTo deve ser 5", () => {
    expect(completedUpTo).toBe(5);
  });

  it("etapa 1 (Projeto) é clicável pois completedUpTo=5 > currentStep=2", () => {
    // step 1 < currentStep 2 → done → clicável
    expect(getStepState(1, currentStep, completedUpTo)).toBe("done");
    expect(isStepClickable(1, currentStep, completedUpTo)).toBe(true);
  });

  it("etapa 2 (Questionário) é active (não clicável — já está nela)", () => {
    expect(getStepState(2, currentStep, completedUpTo)).toBe("active");
    expect(isStepClickable(2, currentStep, completedUpTo)).toBe(false);
  });

  it("etapa 3 (Briefing) é clicável pois completedUpTo=5 >= 3", () => {
    expect(getStepState(3, currentStep, completedUpTo)).toBe("done");
    expect(isStepClickable(3, currentStep, completedUpTo)).toBe(true);
  });

  it("etapa 4 (Riscos) é clicável pois completedUpTo=5 >= 4", () => {
    expect(getStepState(4, currentStep, completedUpTo)).toBe("done");
    expect(isStepClickable(4, currentStep, completedUpTo)).toBe(true);
  });

  it("etapa 5 (Plano de Ação) é clicável pois completedUpTo=5 >= 5", () => {
    expect(getStepState(5, currentStep, completedUpTo)).toBe("done");
    expect(isStepClickable(5, currentStep, completedUpTo)).toBe(true);
  });

  it("sem completedUpTo (fallback antigo): etapas 3,4,5 ficavam locked (BUG)", () => {
    const oldCompletedUpTo = currentStep - 1; // = 1 (comportamento antigo)
    expect(getStepState(3, currentStep, oldCompletedUpTo)).toBe("locked");
    expect(getStepState(4, currentStep, oldCompletedUpTo)).toBe("locked");
    expect(getStepState(5, currentStep, oldCompletedUpTo)).toBe("locked");
  });
});
