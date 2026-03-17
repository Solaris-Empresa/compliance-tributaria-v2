import { describe, it, expect } from "vitest";

// ─── Helpers replicados da ProjetoDetalhesV2 ────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  assessment_fase1: "Questionário",
  assessment_fase2: "Questionário",
  matriz_riscos: "Matrizes de Riscos",
  plano_acao: "Plano de Ação",
  em_avaliacao: "Em Avaliação",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  parado: "Pausado",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

function statusToStep(status: string): number {
  const map: Record<string, number> = {
    rascunho: 1,
    assessment_fase1: 2,
    assessment_fase2: 2,
    matriz_riscos: 3,
    plano_acao: 4,
    em_avaliacao: 4,
    aprovado: 5,
    em_andamento: 5,
    parado: 5,
    concluido: 5,
    arquivado: 5,
  };
  return map[status] ?? 1;
}

function computeProgressPct(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

function computeTasksByArea(actionPlansData: Record<string, any[]> | null) {
  if (!actionPlansData) return { totalTasks: 0, completedTasks: 0, tasksByArea: [] };
  let totalTasks = 0;
  let completedTasks = 0;
  const tasksByArea: { area: string; count: number; completed: number }[] = [];
  for (const [area, tasks] of Object.entries(actionPlansData)) {
    const activeTasks = tasks.filter(t => !t.deleted);
    const done = activeTasks.filter(t => t.status === "concluido").length;
    totalTasks += activeTasks.length;
    completedTasks += done;
    if (activeTasks.length > 0) tasksByArea.push({ area, count: activeTasks.length, completed: done });
  }
  return { totalTasks, completedTasks, tasksByArea };
}

function computeRisks(riskMatricesData: Record<string, any[]> | null): number {
  if (!riskMatricesData) return 0;
  return Object.values(riskMatricesData).reduce((acc, risks) => acc + risks.length, 0);
}

// ─── Testes ─────────────────────────────────────────────────────────────────

describe("ProjetoDetalhesV2 — statusToStep", () => {
  it("rascunho → step 1", () => expect(statusToStep("rascunho")).toBe(1));
  it("assessment_fase1 → step 2", () => expect(statusToStep("assessment_fase1")).toBe(2));
  it("assessment_fase2 → step 2", () => expect(statusToStep("assessment_fase2")).toBe(2));
  it("matriz_riscos → step 3", () => expect(statusToStep("matriz_riscos")).toBe(3));
  it("plano_acao → step 4", () => expect(statusToStep("plano_acao")).toBe(4));
  it("em_avaliacao → step 4", () => expect(statusToStep("em_avaliacao")).toBe(4));
  it("aprovado → step 5", () => expect(statusToStep("aprovado")).toBe(5));
  it("em_andamento → step 5", () => expect(statusToStep("em_andamento")).toBe(5));
  it("concluido → step 5", () => expect(statusToStep("concluido")).toBe(5));
  it("status desconhecido → step 1", () => expect(statusToStep("xyz")).toBe(1));
});

describe("ProjetoDetalhesV2 — STATUS_LABELS", () => {
  it("aprovado tem label correto", () => expect(STATUS_LABELS["aprovado"]).toBe("Aprovado"));
  it("em_andamento tem label correto", () => expect(STATUS_LABELS["em_andamento"]).toBe("Em Andamento"));
  it("parado tem label Pausado", () => expect(STATUS_LABELS["parado"]).toBe("Pausado"));
});

describe("ProjetoDetalhesV2 — computeProgressPct", () => {
  it("0 tarefas → 0%", () => expect(computeProgressPct(0, 0)).toBe(0));
  it("5 de 10 → 50%", () => expect(computeProgressPct(5, 10)).toBe(50));
  it("3 de 7 → 43%", () => expect(computeProgressPct(3, 7)).toBe(43));
  it("10 de 10 → 100%", () => expect(computeProgressPct(10, 10)).toBe(100));
});

describe("ProjetoDetalhesV2 — computeTasksByArea", () => {
  it("null → zeros", () => {
    const r = computeTasksByArea(null);
    expect(r.totalTasks).toBe(0);
    expect(r.completedTasks).toBe(0);
    expect(r.tasksByArea).toHaveLength(0);
  });

  it("conta tarefas ativas e excluídas corretamente", () => {
    const data = {
      Contabilidade: [
        { id: "1", status: "concluido", deleted: false },
        { id: "2", status: "pendente", deleted: false },
        { id: "3", status: "pendente", deleted: true }, // excluída
      ],
      TI: [
        { id: "4", status: "concluido", deleted: false },
        { id: "5", status: "concluido", deleted: false },
      ],
    };
    const r = computeTasksByArea(data);
    expect(r.totalTasks).toBe(4); // 2 Contabilidade + 2 TI (excluída não conta)
    expect(r.completedTasks).toBe(3); // 1 Contabilidade + 2 TI
    expect(r.tasksByArea).toHaveLength(2);
    const cont = r.tasksByArea.find(a => a.area === "Contabilidade")!;
    expect(cont.count).toBe(2);
    expect(cont.completed).toBe(1);
  });

  it("área sem tarefas ativas não aparece na lista", () => {
    const data = {
      Vazia: [{ id: "1", status: "pendente", deleted: true }],
      TI: [{ id: "2", status: "pendente", deleted: false }],
    };
    const r = computeTasksByArea(data);
    expect(r.tasksByArea.map(a => a.area)).not.toContain("Vazia");
    expect(r.tasksByArea.map(a => a.area)).toContain("TI");
  });
});

describe("ProjetoDetalhesV2 — computeRisks", () => {
  it("null → 0", () => expect(computeRisks(null)).toBe(0));
  it("soma riscos de todas as áreas", () => {
    const data = {
      "0115-6/00": [{ id: 1 }, { id: 2 }],
      "4930-2/02": [{ id: 3 }],
    };
    expect(computeRisks(data)).toBe(3);
  });
  it("objeto vazio → 0", () => expect(computeRisks({})).toBe(0));
});
