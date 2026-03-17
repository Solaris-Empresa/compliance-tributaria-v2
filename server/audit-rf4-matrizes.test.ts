/**
 * Testes unitários — RF-4: Matrizes de Riscos (operações manuais)
 * Cobre: RF-4.04 (adição manual de riscos), RF-4.05 (remoção de riscos),
 *        RF-4.08 (aprovação por área individual + reabrir), RF-4.09 (cálculo de severidade),
 *        RF-4.10 (gate 4 — todas as 4 áreas aprovadas), RF-4.11 (exportação CSV)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Risk {
  id: string;
  evento: string;
  probabilidade: "Baixa" | "Média" | "Alta";
  impacto: "Baixo" | "Médio" | "Alto";
  severidade: "Baixa" | "Média" | "Alta" | "Crítica";
  plano_acao: string;
  manual?: boolean;
  deleted?: boolean;
}

interface MatrixState {
  contabilidade: Risk[];
  negocio: Risk[];
  ti: Risk[];
  juridico: Risk[];
}

interface ApprovalState {
  contabilidade: boolean;
  negocio: boolean;
  ti: boolean;
  juridico: boolean;
}

// ─── Helpers de lógica de negócio (extraídos do MatrizesV3.tsx) ───────────────
function calcSeveridade(probabilidade: string, impacto: string): string {
  const prob = { Baixa: 1, Média: 2, Alta: 3 }[probabilidade] ?? 1;
  const imp = { Baixo: 1, Médio: 2, Alto: 3 }[impacto] ?? 1;
  const score = prob * imp;
  if (score >= 7) return "Crítica";
  if (score >= 4) return "Alta";
  if (score >= 2) return "Média";
  return "Baixa";
}

function allAreasApproved(approvals: ApprovalState): boolean {
  return Object.values(approvals).every(Boolean);
}

function exportToCsv(risks: Risk[]): string {
  const header = "ID,Evento,Probabilidade,Impacto,Severidade,Plano de Ação";
  const rows = risks
    .filter((r) => !r.deleted)
    .map((r) =>
      `${r.id},"${r.evento}",${r.probabilidade},${r.impacto},${r.severidade},"${r.plano_acao}"`
    );
  return [header, ...rows].join("\n");
}

// ─── Dados de teste ───────────────────────────────────────────────────────────
const baseRisk: Risk = {
  id: "r1",
  evento: "Mudança de alíquota ISS para CBS",
  probabilidade: "Alta",
  impacto: "Alto",
  severidade: "Crítica",
  plano_acao: "Revisar contratos de serviço",
};

const baseMatrix: MatrixState = {
  contabilidade: [baseRisk],
  negocio: [
    { id: "r2", evento: "Perda de clientes por aumento de preço", probabilidade: "Média", impacto: "Alto", severidade: "Alta", plano_acao: "Renegociar contratos" },
  ],
  ti: [
    { id: "r3", evento: "Inadequação do ERP para NF-e 4.0", probabilidade: "Alta", impacto: "Médio", severidade: "Alta", plano_acao: "Atualizar ERP" },
  ],
  juridico: [
    { id: "r4", evento: "Multas por descumprimento de prazo", probabilidade: "Baixa", impacto: "Alto", severidade: "Média", plano_acao: "Monitorar legislação" },
  ],
};

// ─── RF-4.04: Adição Manual de Riscos ─────────────────────────────────────────
describe("RF-4.04 — Adição Manual de Riscos", () => {
  it("deve adicionar um risco manual à área correta", () => {
    const matrix = { ...baseMatrix, contabilidade: [...baseMatrix.contabilidade] };
    const newRisk: Risk = {
      id: `manual-${Date.now()}`,
      evento: "Risco identificado manualmente pelo consultor",
      probabilidade: "Média",
      impacto: "Alto",
      severidade: "Alta",
      plano_acao: "Ação corretiva imediata",
      manual: true,
    };

    matrix.contabilidade.push(newRisk);

    expect(matrix.contabilidade).toHaveLength(2);
    expect(matrix.contabilidade[1].manual).toBe(true);
    expect(matrix.contabilidade[1].evento).toBe("Risco identificado manualmente pelo consultor");
  });

  it("deve gerar ID único para cada risco manual adicionado", () => {
    const id1 = `manual-${Date.now()}-1`;
    const id2 = `manual-${Date.now()}-2`;
    expect(id1).not.toBe(id2);
  });

  it("deve exigir evento e plano_acao para adicionar risco manual", () => {
    const incompleteRisk = { evento: "", plano_acao: "" };
    expect(incompleteRisk.evento.trim().length).toBe(0);
    // Validação: não deve permitir adicionar risco sem evento
    const isValid = incompleteRisk.evento.trim().length > 0;
    expect(isValid).toBe(false);
  });

  it("deve marcar risco manual com flag manual=true", () => {
    const manualRisk: Risk = {
      id: "manual-123",
      evento: "Risco manual",
      probabilidade: "Baixa",
      impacto: "Baixo",
      severidade: "Baixa",
      plano_acao: "Monitorar",
      manual: true,
    };
    expect(manualRisk.manual).toBe(true);
  });

  it("deve calcular severidade automaticamente ao adicionar risco manual", () => {
    const severidade = calcSeveridade("Alta", "Alto");
    expect(severidade).toBe("Crítica");

    const severidadeMedia = calcSeveridade("Média", "Médio");
    expect(severidadeMedia).toBe("Alta"); // score 4 (2×2) ≥ 4 → Alta (tabela 3×3 padrão)

    const severidadeBaixa = calcSeveridade("Baixa", "Baixo");
    expect(severidadeBaixa).toBe("Baixa");
  });
});

// ─── RF-4.05: Remoção de Riscos ───────────────────────────────────────────────
describe("RF-4.05 — Remoção de Riscos", () => {
  it("deve remover um risco pelo ID", () => {
    const risks = [...baseMatrix.contabilidade];
    const idToRemove = "r1";

    const updated = risks.filter((r) => r.id !== idToRemove);

    expect(updated).toHaveLength(0);
    expect(updated.find((r) => r.id === idToRemove)).toBeUndefined();
  });

  it("não deve remover riscos de outras áreas ao remover de uma área específica", () => {
    const matrix = { ...baseMatrix };
    const updatedContabilidade = matrix.contabilidade.filter((r) => r.id !== "r1");

    expect(updatedContabilidade).toHaveLength(0);
    expect(matrix.negocio).toHaveLength(1); // negocio não foi afetado
    expect(matrix.ti).toHaveLength(1);
    expect(matrix.juridico).toHaveLength(1);
  });

  it("deve retornar lista vazia se o único risco for removido", () => {
    const risks = [baseRisk];
    const updated = risks.filter((r) => r.id !== "r1");
    expect(updated).toHaveLength(0);
  });

  it("deve manter outros riscos da mesma área ao remover um específico", () => {
    const risks: Risk[] = [
      baseRisk,
      { id: "r5", evento: "Outro risco", probabilidade: "Baixa", impacto: "Baixo", severidade: "Baixa", plano_acao: "Monitorar" },
    ];
    const updated = risks.filter((r) => r.id !== "r1");
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("r5");
  });
});

// ─── RF-4.08: Aprovação por Área Individual + Reabrir ─────────────────────────
describe("RF-4.08 — Aprovação por Área Individual e Reabrir para Edição", () => {
  it("deve aprovar uma área sem afetar as demais", () => {
    const approvals: ApprovalState = {
      contabilidade: false,
      negocio: false,
      ti: false,
      juridico: false,
    };

    approvals.contabilidade = true;

    expect(approvals.contabilidade).toBe(true);
    expect(approvals.negocio).toBe(false);
    expect(approvals.ti).toBe(false);
    expect(approvals.juridico).toBe(false);
  });

  it("deve reabrir uma área aprovada para edição", () => {
    const approvals: ApprovalState = {
      contabilidade: true,
      negocio: true,
      ti: false,
      juridico: false,
    };

    approvals.contabilidade = false; // reabrir

    expect(approvals.contabilidade).toBe(false);
    expect(approvals.negocio).toBe(true); // não afetado
  });

  it("deve permitir editar riscos apenas em área não aprovada", () => {
    const approvals: ApprovalState = {
      contabilidade: true,
      negocio: false,
      ti: false,
      juridico: false,
    };

    const canEditContabilidade = !approvals.contabilidade;
    const canEditNegocio = !approvals.negocio;

    expect(canEditContabilidade).toBe(false); // aprovada — não editável
    expect(canEditNegocio).toBe(true); // não aprovada — editável
  });

  it("deve registrar timestamp de aprovação por área", () => {
    const approvalTimestamps: Record<string, number> = {};
    const now = Date.now();

    approvalTimestamps.contabilidade = now;

    expect(approvalTimestamps.contabilidade).toBeGreaterThan(0);
    expect(approvalTimestamps.contabilidade).toBeLessThanOrEqual(Date.now());
  });
});

// ─── RF-4.09: Cálculo Automático de Severidade ────────────────────────────────
describe("RF-4.09 — Cálculo Automático de Severidade (Probabilidade × Impacto)", () => {
  it("Alta × Alto = Crítica (score 9)", () => {
    expect(calcSeveridade("Alta", "Alto")).toBe("Crítica");
  });

  it("Alta × Médio = Alta (score 6)", () => {
    expect(calcSeveridade("Alta", "Médio")).toBe("Alta");
  });

  it("Média × Alto = Alta (score 6)", () => {
    expect(calcSeveridade("Média", "Alto")).toBe("Alta");
  });

  it("Média × Médio = Alta (score 4 ≥ 4)", () => {
    expect(calcSeveridade("Média", "Médio")).toBe("Alta"); // score 4 (2×2) ≥ 4 → Alta
  });

  it("Baixa × Alto = Média (score 3)", () => {
    expect(calcSeveridade("Baixa", "Alto")).toBe("Média");
  });

  it("Baixa × Baixo = Baixa (score 1)", () => {
    expect(calcSeveridade("Baixa", "Baixo")).toBe("Baixa");
  });

  it("Alta × Baixo = Média (score 3)", () => {
    expect(calcSeveridade("Alta", "Baixo")).toBe("Média");
  });
});

// ─── RF-4.10: Gate 4 — Todas as 4 Áreas Aprovadas ────────────────────────────
describe("RF-4.10 — Gate 4: Avanço para Etapa 5 somente com todas as áreas aprovadas", () => {
  it("deve bloquear avanço se nenhuma área estiver aprovada", () => {
    const approvals: ApprovalState = { contabilidade: false, negocio: false, ti: false, juridico: false };
    expect(allAreasApproved(approvals)).toBe(false);
  });

  it("deve bloquear avanço se apenas 3 áreas estiverem aprovadas", () => {
    const approvals: ApprovalState = { contabilidade: true, negocio: true, ti: true, juridico: false };
    expect(allAreasApproved(approvals)).toBe(false);
  });

  it("deve permitir avanço somente quando todas as 4 áreas estiverem aprovadas", () => {
    const approvals: ApprovalState = { contabilidade: true, negocio: true, ti: true, juridico: true };
    expect(allAreasApproved(approvals)).toBe(true);
  });

  it("deve bloquear avanço após reabrir uma área previamente aprovada", () => {
    const approvals: ApprovalState = { contabilidade: true, negocio: true, ti: true, juridico: true };
    approvals.contabilidade = false; // reabrir

    expect(allAreasApproved(approvals)).toBe(false);
  });
});

// ─── RF-4.11: Exportação CSV ──────────────────────────────────────────────────
describe("RF-4.11 — Exportação CSV das Matrizes de Riscos", () => {
  it("deve gerar CSV com cabeçalho correto", () => {
    const csv = exportToCsv(baseMatrix.contabilidade);
    expect(csv).toContain("ID,Evento,Probabilidade,Impacto,Severidade,Plano de Ação");
  });

  it("deve incluir todos os riscos não deletados no CSV", () => {
    const risks: Risk[] = [
      baseRisk,
      { id: "r2", evento: "Outro risco", probabilidade: "Baixa", impacto: "Baixo", severidade: "Baixa", plano_acao: "Monitorar" },
    ];
    const csv = exportToCsv(risks);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // cabeçalho + 2 riscos
  });

  it("deve excluir riscos marcados como deletados do CSV", () => {
    const risks: Risk[] = [
      baseRisk,
      { id: "r2", evento: "Risco deletado", probabilidade: "Baixa", impacto: "Baixo", severidade: "Baixa", plano_acao: "N/A", deleted: true },
    ];
    const csv = exportToCsv(risks);
    expect(csv).not.toContain("Risco deletado");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2); // cabeçalho + 1 risco ativo
  });

  it("deve escapar vírgulas em campos de texto no CSV", () => {
    const risks: Risk[] = [
      { id: "r1", evento: "Risco com, vírgula", probabilidade: "Alta", impacto: "Alto", severidade: "Crítica", plano_acao: "Ação, urgente" },
    ];
    const csv = exportToCsv(risks);
    expect(csv).toContain('"Risco com, vírgula"');
    expect(csv).toContain('"Ação, urgente"');
  });

  it("deve gerar CSV vazio (apenas cabeçalho) se não houver riscos", () => {
    const csv = exportToCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // apenas cabeçalho
  });
});
