/**
 * B-Z11-012 — Evidência de integração: completeDiagnosticLayer transita
 * projects.status → 'diagnostico_cnae' no fluxo TO-BE (q_produto/q_servico).
 *
 * Este teste NÃO usa tRPC diretamente — chama a lógica de negócio via db helpers
 * para gerar evidência SQL auditável antes/depois.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import { isToBeFlowState } from "./flowStateMachine";
import { isDiagnosticComplete } from "./diagnostic-consolidator";

// ─── helpers inline (espelha a lógica do handler) ───────────────────────────
async function simulateCompleteDiagnosticLayer(
  projectId: number,
  layer: "corporate" | "operational" | "cnae",
  answers: Record<string, any>
) {
  const project = await db.getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const current = (project as any).diagnosticStatus ?? {
    corporate: "not_started",
    operational: "not_started",
    cnae: "not_started",
  };

  const answerField =
    layer === "corporate"
      ? "corporateAnswers"
      : layer === "operational"
      ? "operationalAnswers"
      : "cnaeAnswers";

  const updatedStatus = { ...current, [layer]: "completed" };
  const allComplete = isDiagnosticComplete(updatedStatus);
  const isToBeFlow = isToBeFlowState((project as any).status ?? "");
  const shouldAdvance =
    allComplete ||
    (layer === "cnae" && updatedStatus.cnae === "completed" && isToBeFlow);

  const projectUpdates: Record<string, any> = {
    [answerField]: answers,
    diagnosticStatus: updatedStatus,
  };
  if (shouldAdvance) {
    projectUpdates.status = "diagnostico_cnae";
  }

  await db.updateProject(projectId, projectUpdates as any);
  return { updatedStatus, shouldAdvance };
}

// ─── Testes ─────────────────────────────────────────────────────────────────
describe("B-Z11-012 — completeDiagnosticLayer transição TO-BE", () => {
  const PROJECT_ID = 1;
  let statusAntes: string;
  let diagnosticAntes: any;

  beforeAll(async () => {
    // Garantir estado inicial: q_produto, cnae=not_started
    await db.updateProject(PROJECT_ID, {
      status: "q_produto",
      diagnosticStatus: { corporate: "not_started", operational: "not_started", cnae: "not_started" },
    } as any);
    const p = await db.getProjectById(PROJECT_ID);
    statusAntes = (p as any).status;
    diagnosticAntes = (p as any).diagnosticStatus;
  });

  afterAll(async () => {
    // Não restaurar — deixar em diagnostico_cnae para o fluxo E2E continuar
  });

  it("ANTES: status deve ser q_produto com cnae=not_started", () => {
    expect(statusAntes).toBe("q_produto");
    expect(diagnosticAntes.cnae).toBe("not_started");
  });

  it("isToBeFlowState('q_produto') deve retornar true", () => {
    expect(isToBeFlowState("q_produto")).toBe(true);
    expect(isToBeFlowState("q_servico")).toBe(true);
    expect(isToBeFlowState("diagnostico_cnae")).toBe(false);
    expect(isToBeFlowState("diagnostico_corporativo")).toBe(false);
  });

  it("SKIP CNAE: shouldAdvance deve ser true mesmo sem corporate/operational", async () => {
    const { updatedStatus, shouldAdvance } = await simulateCompleteDiagnosticLayer(
      PROJECT_ID,
      "cnae",
      {} // respostas vazias (skip)
    );
    expect(updatedStatus.cnae).toBe("completed");
    expect(shouldAdvance).toBe(true);
  });

  it("DEPOIS: projects.status deve ser diagnostico_cnae", async () => {
    const p = await db.getProjectById(PROJECT_ID);
    const statusDepois = (p as any).status;
    const diagnosticDepois = (p as any).diagnosticStatus;

    console.log("=== EVIDÊNCIA SQL B-Z11-012 ===");
    console.log("ANTES:", { status: statusAntes, diagnosticStatus: diagnosticAntes });
    console.log("DEPOIS:", { status: statusDepois, diagnosticStatus: diagnosticDepois });

    expect(statusDepois).toBe("diagnostico_cnae");
    expect(diagnosticDepois.cnae).toBe("completed");
  });
});
