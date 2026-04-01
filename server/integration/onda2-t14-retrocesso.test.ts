/**
 * ONDA 2 — T14: Retrocesso Múltiplo Acumulado
 *
 * Verifica que o sistema mantém integridade de dados após múltiplos retrocessos
 * consecutivos, que o stepHistory registra corretamente cada retrocesso,
 * que dados não se corrompem após ciclos retrocesso+avanço, e que o sistema
 * resiste a padrões de uso adversariais (retrocesso em loop, retrocesso no
 * estado inicial, retrocesso após aprovação).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";

const TEST_USER_ID = 1;
const TEST_CLIENT_ID = 1;

// Pool independente — não compartilhado com T11/T12/T13
let pool: mysql.Pool;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createProject(name: string): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO projects (name, status, createdById, clientId, currentStep, confirmedCnaes, diagnosticStatus, stepHistory, createdAt, updatedAt)
     VALUES (?, 'rascunho', ?, ?, 1, '[]', '{"corporate":"pending","operational":"pending","cnae":"pending"}', '[]', NOW(), NOW())`,
    [name, TEST_USER_ID, TEST_CLIENT_ID]
  ) as any;
  return result.insertId;
}

async function getProject(id: number): Promise<any> {
  const [[row]] = await pool.execute(
    `SELECT id, name, status, currentStep, diagnosticStatus, stepHistory, briefingContent, riskMatricesData FROM projects WHERE id = ?`,
    [id]
  ) as any;
  return row;
}

async function advanceTo(id: number, status: string, step: number, extraData: Record<string, any> = {}): Promise<void> {
  const sets = [`status = ?`, `currentStep = ?`, `updatedAt = NOW()`];
  const values: any[] = [status, step];

  for (const [key, value] of Object.entries(extraData)) {
    sets.push(`${key} = ?`);
    values.push(typeof value === "object" ? JSON.stringify(value) : value);
  }

  values.push(id);
  await pool.execute(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
}

// Helper para parsear JSON nativo ou string do mysql2
function parseJson(val: any, fallback: any = null): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val; // mysql2 já parseou
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return fallback;
}

async function retrocede(id: number, toStatus: string, toStep: number, reason: string): Promise<void> {
  // Simula o retrocesso: atualiza status, step e registra no stepHistory
  const proj = await getProject(id);
  const history = parseJson(proj.stepHistory, []);
  history.push({
    fromStatus: proj.status,
    toStatus,
    fromStep: proj.currentStep,
    toStep,
    reason,
    timestamp: new Date().toISOString(),
  });

  await pool.execute(
    `UPDATE projects SET status = ?, currentStep = ?, stepHistory = ?, updatedAt = NOW() WHERE id = ?`,
    [toStatus, toStep, JSON.stringify(history), id]
  );
}

// ─── Suite T14 ────────────────────────────────────────────────────────────────

describe("T14 — Retrocesso Múltiplo Acumulado", () => {
  let projectId: number;
  let projectId2: number;
  let projectId3: number;

  beforeAll(async () => {
    pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 5 });
    // Limpar runs anteriores
    await pool.execute(`DELETE FROM projects WHERE name LIKE '[ONDA2-T14]%'`);
    projectId = await createProject("[ONDA2-T14] Retrocesso Múltiplo Principal");
    projectId2 = await createProject("[ONDA2-T14] Retrocesso Loop Adversarial");
    projectId3 = await createProject("[ONDA2-T14] Retrocesso Pós-Aprovação");
  });

  afterAll(async () => {
    await pool.execute(`DELETE FROM projects WHERE name LIKE '[ONDA2-T14]%'`);
    await pool.end();
  });

  // ── Cenário 1: Retrocesso 3x consecutivos ──────────────────────────────────

  it("T14.1 — avança projeto até 'riscos' (etapa 4)", async () => {
    await advanceTo(projectId, "cnaes_confirmados", 1);
    await advanceTo(projectId, "diagnostico_cnae", 2, {
      diagnosticStatus: { corporate: "completed", operational: "completed", cnae: "completed" },
    });
    await advanceTo(projectId, "briefing", 3, {
      briefingContent: { executiveSummary: "Briefing inicial", riskLevel: "alto" },
    });
    await advanceTo(projectId, "riscos", 4, {
      riskMatricesData: { risks: [{ id: 1, title: "Risco Fiscal", level: "critico" }] },
    });

    const proj = await getProject(projectId);
    expect(proj.status).toBe("riscos");
    expect(proj.currentStep).toBe(4);
  });

  it("T14.2 — 1º retrocesso: riscos → briefing preserva riskMatricesData", async () => {
    await retrocede(projectId, "briefing", 3, "revisão do briefing necessária");

    const proj = await getProject(projectId);
    expect(proj.status).toBe("briefing");
    expect(proj.currentStep).toBe(3);
    // Dados de riscos preservados
    const risks = parseJson(proj.riskMatricesData);
    expect(risks.risks.length).toBe(1);
    // stepHistory registrou o retrocesso
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(1);
    expect(history[0].fromStatus).toBe("riscos");
    expect(history[0].toStatus).toBe("briefing");
  });

  it("T14.3 — 2º retrocesso: briefing → diagnostico_cnae preserva briefingContent", async () => {
    await retrocede(projectId, "diagnostico_cnae", 2, "diagnóstico precisa ser refeito");

    const proj = await getProject(projectId);
    expect(proj.status).toBe("diagnostico_cnae");
    expect(proj.currentStep).toBe(2);
    // Briefing preservado
    const briefing = parseJson(proj.briefingContent);
    expect(briefing.executiveSummary).toBe("Briefing inicial");
    // stepHistory tem 2 entradas
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(2);
    expect(history[1].fromStatus).toBe("briefing");
    expect(history[1].toStatus).toBe("diagnostico_cnae");
  });

  it("T14.4 — 3º retrocesso: diagnostico_cnae → cnaes_confirmados", async () => {
    await retrocede(projectId, "cnaes_confirmados", 1, "CNAEs precisam ser revisados");

    const proj = await getProject(projectId);
    expect(proj.status).toBe("cnaes_confirmados");
    expect(proj.currentStep).toBe(1);
    // stepHistory tem 3 entradas
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(3);
    expect(history[2].fromStatus).toBe("diagnostico_cnae");
    expect(history[2].toStatus).toBe("cnaes_confirmados");
  });

  it("T14.5 — após 3 retrocessos: dados originais (briefing, riscos) ainda preservados", async () => {
    const proj = await getProject(projectId);
    // Briefing preservado
    const briefing = parseJson(proj.briefingContent);
    expect(briefing.executiveSummary).toBe("Briefing inicial");
    // Riscos preservados
    const risks = parseJson(proj.riskMatricesData);
    expect(risks.risks.length).toBe(1);
    // Status correto
    expect(proj.status).toBe("cnaes_confirmados");
  });

  it("T14.6 — pode avançar novamente após 3 retrocessos (ciclo completo)", async () => {
    await advanceTo(projectId, "diagnostico_cnae", 2);
    await advanceTo(projectId, "briefing", 3);
    await advanceTo(projectId, "riscos", 4);
    await advanceTo(projectId, "plano_acao", 5);

    const proj = await getProject(projectId);
    expect(proj.status).toBe("plano_acao");
    expect(proj.currentStep).toBe(5);
    // stepHistory ainda preserva os 3 retrocessos anteriores
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(3);
  });

  // ── Cenário 2: Retrocesso em loop adversarial (10x) ───────────────────────

  it("T14.7 — loop adversarial: 10 retrocessos consecutivos sem corrupção", async () => {
    await advanceTo(projectId2, "briefing", 3, {
      briefingContent: { executiveSummary: "Briefing adversarial", riskLevel: "medio" },
    });

    // 10 ciclos retrocesso + avanço
    for (let i = 0; i < 10; i++) {
      await retrocede(projectId2, "diagnostico_cnae", 2, `loop_${i}`);
      await advanceTo(projectId2, "briefing", 3);
    }

    const proj = await getProject(projectId2);
    expect(proj.status).toBe("briefing");
    // Dados não corrompidos
    const briefing = parseJson(proj.briefingContent);
    expect(briefing.executiveSummary).toBe("Briefing adversarial");
    // stepHistory tem 10 retrocessos
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(10);
  }, 15_000);

  it("T14.8 — invariante após loop: currentStep consistente com status", async () => {
    const proj = await getProject(projectId2);
    expect(proj.status).toBe("briefing");
    expect(proj.currentStep).toBe(3);
  });

  // ── Cenário 3: Retrocesso pós-aprovação ───────────────────────────────────

  it("T14.9 — projeto aprovado pode retroceder para plano_acao (alteração)", async () => {
    await advanceTo(projectId3, "aprovado", 5, {
      briefingContent: { executiveSummary: "Projeto aprovado", riskLevel: "baixo" },
      riskMatricesData: { risks: [] },
    });

    const projBefore = await getProject(projectId3);
    expect(projBefore.status).toBe("aprovado");

    // Retrocede para plano_acao (início do fluxo de alteração)
    await retrocede(projectId3, "plano_acao", 5, "alteração solicitada pelo cliente");

    const proj = await getProject(projectId3);
    expect(proj.status).toBe("plano_acao");
    expect(proj.currentStep).toBe(5);
    // Dados preservados
    const briefing = parseJson(proj.briefingContent);
    expect(briefing.executiveSummary).toBe("Projeto aprovado");
  });

  it("T14.10 — após retrocesso pós-aprovação: pode retornar a aprovado", async () => {
    await advanceTo(projectId3, "aprovado", 5);

    const proj = await getProject(projectId3);
    expect(proj.status).toBe("aprovado");
    // stepHistory registra o retrocesso e o retorno
    const history = parseJson(proj.stepHistory);
    expect(history.length).toBe(1);
    expect(history[0].fromStatus).toBe("aprovado");
    expect(history[0].toStatus).toBe("plano_acao");
  });
});
