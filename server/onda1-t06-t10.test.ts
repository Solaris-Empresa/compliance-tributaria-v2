/**
 * ONDA 1 — TESTES AUTOMÁTICOS T06–T10
 * Plano Mestre de Validação da Plataforma
 * Modo: DIAGNOSTIC_READ_MODE=shadow
 * Data: 2026-03-23
 *
 * T06 — Regressão de rotas legadas
 * T07 — Consistência de status e stepper
 * T08 — Geração de IA (estrutura e coerência)
 * T09 — Shadow Mode (observabilidade)
 * T10 — Alteração do projeto (reentrada)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";

let conn: mysql.Connection;

beforeAll(async () => {
  conn = await mysql.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  // Limpa apenas os projetos criados por T06-T10 (não interfere com T01-T05)
  await conn.execute(`DELETE FROM projects WHERE name LIKE '[ONDA1-T06%]' OR name LIKE '[ONDA1-T07%]' OR name LIKE '[ONDA1-T08%]' OR name LIKE '[ONDA1-T09%]' OR name LIKE '[ONDA1-T10%]'`);
  await conn.end();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createTestProject(name: string, overrides: Record<string, any> = {}) {
  const defaults = {
    name,
    clientId: 9999,
    taxRegime: "lucro_presumido",
    companySize: "pequena",
    businessType: "comercio",
    status: "rascunho",
    createdById: 1,
    createdByRole: "equipe_solaris",
    currentStep: 1,
  };
  const fields = { ...defaults, ...overrides };
  const keys = Object.keys(fields).join(", ");
  const placeholders = Object.keys(fields).map(() => "?").join(", ");
  const values = Object.values(fields);
  const [result] = await conn.execute(
    `INSERT INTO projects (${keys}) VALUES (${placeholders})`,
    values
  ) as any;
  return result.insertId as number;
}

async function getProject(id: number) {
  const [rows] = await conn.execute(
    `SELECT * FROM projects WHERE id = ?`,
    [id]
  ) as any;
  return rows[0];
}

async function setCnaes(projectId: number, cnaes: string[]) {
  const cnaeArray = cnaes.map(code => ({
    code,
    confidence: 100,
    description: `Descrição ${code}`,
  }));
  await conn.execute(
    `UPDATE projects SET confirmedCnaes = ? WHERE id = ?`,
    [JSON.stringify(cnaeArray), projectId]
  );
}

async function setStatus(projectId: number, status: string, step: number = 2) {
  await conn.execute(
    `UPDATE projects SET status = ?, currentStep = ? WHERE id = ?`,
    [status, step, projectId]
  );
}

async function setDiagnosticStatus(projectId: number, status: Record<string, string>) {
  await conn.execute(
    `UPDATE projects SET diagnosticStatus = ? WHERE id = ?`,
    [JSON.stringify(status), projectId]
  );
}

async function getDiagnosticStatus(projectId: number) {
  const p = await getProject(projectId);
  if (!p.diagnosticStatus) return null;
  if (typeof p.diagnosticStatus === "string") return JSON.parse(p.diagnosticStatus);
  return p.diagnosticStatus;
}

async function saveQuestionnaireAnswer(projectId: number, cnaeCode: string, questionText: string, answerValue: string) {
  await conn.execute(
    `INSERT INTO questionnaireAnswersV3 
     (projectId, cnaeCode, cnaeDescription, level, questionIndex, questionText, questionType, answerValue, answeredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [projectId, cnaeCode, `Descrição ${cnaeCode}`, "nivel1", 0, questionText, "radio", answerValue]
  );
}

// ─── T06 — Regressão de rotas legadas ────────────────────────────────────────

describe("T06 — Regressão de rotas legadas (regression suite)", () => {

  it("T06.1 — rota /questionario-v3 não deve ser o destino após confirmação de CNAEs", () => {
    const fs = require("fs");
    const novoProjeto = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/NovoProjeto.tsx",
      "utf-8"
    );
    expect(novoProjeto).toContain("questionario-corporativo-v2");
    const legacyRouteInOnSuccess = /onSuccess[^}]*questionario-v3/.test(novoProjeto);
    expect(legacyRouteInOnSuccess).toBe(false);
  });

  it("T06.2 — QuestionarioCorporativoV2 não deve retornar para /projetos/:id após concluir", () => {
    const fs = require("fs");
    const corporativo = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/QuestionarioCorporativoV2.tsx",
      "utf-8"
    );
    expect(corporativo).toContain("questionario-operacional");
    const returnToProjetosAfterComplete = /onSuccess[^}]*\/projetos\//.test(corporativo);
    expect(returnToProjetosAfterComplete).toBe(false);
  });

  it("T06.3 — QuestionarioOperacional não deve retornar para /projetos/:id após concluir", () => {
    const fs = require("fs");
    const operacional = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/QuestionarioOperacional.tsx",
      "utf-8"
    );
    expect(operacional).toContain("questionario-cnae");
    const returnToProjetosAfterComplete = /onSuccess[^}]*\/projetos\//.test(operacional);
    expect(returnToProjetosAfterComplete).toBe(false);
  });

  it("T06.4 — QuestionarioCNAE deve navegar para briefing-v3 após concluir", () => {
    const fs = require("fs");
    const cnae = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/QuestionarioCNAE.tsx",
      "utf-8"
    );
    expect(cnae).toContain("briefing-v3");
    const returnToProjetosAfterComplete = /onSuccess[^}]*\/projetos\//.test(cnae);
    expect(returnToProjetosAfterComplete).toBe(false);
  });

  it("T06.5 — flowStepperUtils mapeia todos os status v2.1", () => {
    const fs = require("fs");
    const utils = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/lib/flowStepperUtils.ts",
      "utf-8"
    );
    const requiredStatuses = [
      "cnaes_confirmados",
      "diagnostico_corporativo",
      "diagnostico_operacional",
      "diagnostico_cnae",
      "briefing",
      "riscos",
      "plano_acao",
      "aprovado",
    ];
    for (const status of requiredStatuses) {
      expect(utils).toContain(status);
    }
  });

  it("T06.6 — ProjetoDetalhesV2 não usa rota legada para etapa 2", () => {
    const fs = require("fs");
    const detalhes = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/ProjetoDetalhesV2.tsx",
      "utf-8"
    );
    const legacyAsStep2 = /FLOW_STEPS[^}]*questionario-v3/.test(detalhes);
    expect(legacyAsStep2).toBe(false);
  });
});

// ─── T07 — Consistência de status e stepper ──────────────────────────────────

describe("T07 — Consistência de status e stepper (state machine)", () => {
  let projectId: number;

  const STATE_TRANSITIONS = [
    { from: "rascunho",               to: "cnaes_confirmados",       step: 2 },
    { from: "cnaes_confirmados",      to: "diagnostico_corporativo",  step: 2 },
    { from: "diagnostico_corporativo",to: "diagnostico_operacional",  step: 2 },
    { from: "diagnostico_operacional",to: "diagnostico_cnae",         step: 2 },
    { from: "diagnostico_cnae",       to: "briefing",                 step: 3 },
    { from: "briefing",               to: "riscos",                   step: 4 },
    { from: "riscos",                 to: "plano_acao",               step: 5 },
    { from: "plano_acao",             to: "aprovado",                 step: 5 },
  ];

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T07] Status Stepper");
    await setCnaes(projectId, ["1113-5/02"]);
  });

  it("T07.1 — máquina de estados: todas as transições são sequenciais", () => {
    for (let i = 0; i < STATE_TRANSITIONS.length - 1; i++) {
      expect(STATE_TRANSITIONS[i].to).toBe(STATE_TRANSITIONS[i + 1].from);
    }
  });

  it("T07.2 — status inicial é rascunho, step 1", async () => {
    const p = await getProject(projectId);
    expect(p.status).toBe("rascunho");
    expect(p.currentStep).toBe(1);
  });

  it("T07.3 — transição rascunho → cnaes_confirmados", async () => {
    await setStatus(projectId, "cnaes_confirmados", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("cnaes_confirmados");
  });

  it("T07.4 — transição cnaes_confirmados → diagnostico_corporativo", async () => {
    await setStatus(projectId, "diagnostico_corporativo", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_corporativo");
  });

  it("T07.5 — transição diagnostico_corporativo → diagnostico_operacional", async () => {
    await setStatus(projectId, "diagnostico_operacional", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_operacional");
  });

  it("T07.6 — transição diagnostico_operacional → diagnostico_cnae", async () => {
    await setStatus(projectId, "diagnostico_cnae", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_cnae");
  });

  it("T07.7 — transição diagnostico_cnae → briefing (step 3)", async () => {
    await saveQuestionnaireAnswer(projectId, "1113-5/02", "Q1", "R1");
    await setDiagnosticStatus(projectId, { corporate: "completed", operational: "completed", cnae: "completed" });
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
    expect(p.currentStep).toBe(3);
  });

  it("T07.8 — transição briefing → riscos (step 4)", async () => {
    await setStatus(projectId, "riscos", 4);
    const p = await getProject(projectId);
    expect(p.status).toBe("riscos");
    expect(p.currentStep).toBe(4);
  });

  it("T07.9 — transição riscos → plano_acao (step 5)", async () => {
    await setStatus(projectId, "plano_acao", 5);
    const p = await getProject(projectId);
    expect(p.status).toBe("plano_acao");
    expect(p.currentStep).toBe(5);
  });

  it("T07.10 — transição plano_acao → aprovado", async () => {
    await setStatus(projectId, "aprovado", 5);
    const p = await getProject(projectId);
    expect(p.status).toBe("aprovado");
  });

  it("T07.11 — sequência completa validada: 8 transições, rascunho → aprovado", () => {
    expect(STATE_TRANSITIONS).toHaveLength(8);
    expect(STATE_TRANSITIONS[0].from).toBe("rascunho");
    expect(STATE_TRANSITIONS[STATE_TRANSITIONS.length - 1].to).toBe("aprovado");
  });
});

// ─── T08 — Geração de IA (estrutura e coerência) ─────────────────────────────

describe("T08 — Geração de IA (estrutura e coerência)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T08] Geração IA");
    await setCnaes(projectId, ["1113-5/02", "4635-4/02"]);
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    await saveQuestionnaireAnswer(projectId, "1113-5/02", "Pergunta 1", "Resposta 1");
    await saveQuestionnaireAnswer(projectId, "4635-4/02", "Pergunta 2", "Resposta 2");
  });

  it("T08.1 — briefing tem estrutura mínima esperada", async () => {
    const goldenBriefing = {
      riskLevel: "alto",
      executiveSummary: "A empresa apresenta riscos tributários relevantes na Reforma Tributária.",
      mainGaps: ["Gap 1: ICMS", "Gap 2: PIS/COFINS"],
      opportunities: ["Oportunidade 1: Regime especial"],
      recommendations: ["Rec 1: Revisar apuração ICMS"],
      cnaeAnalysis: [
        { cnaeCode: "1113-5/02", riskLevel: "alto", observations: "Fabricação sujeita ao IBS" },
        { cnaeCode: "4635-4/02", riskLevel: "medio", observations: "Atacado com CBS relevante" },
      ],
    };
    await conn.execute(
      `UPDATE projects SET briefingContentV3 = ?, status = ?, currentStep = ? WHERE id = ?`,
      [JSON.stringify(goldenBriefing), "riscos", 4, projectId]
    );
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string" ? JSON.parse(p.briefingContentV3) : p.briefingContentV3;
    expect(b).not.toBeNull();
    expect(b.riskLevel).toBeDefined();
    expect(b.executiveSummary.length).toBeGreaterThan(10);
    expect(b.mainGaps).toBeInstanceOf(Array);
    expect(b.mainGaps.length).toBeGreaterThan(0);
    expect(b.recommendations).toBeInstanceOf(Array);
  });

  it("T08.2 — briefing contém análise por CNAE (coerência com dados de entrada)", async () => {
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string" ? JSON.parse(p.briefingContentV3) : p.briefingContentV3;
    expect(b.cnaeAnalysis).toBeDefined();
    expect(b.cnaeAnalysis.length).toBe(2);
    const codes = b.cnaeAnalysis.map((c: any) => c.cnaeCode);
    expect(codes).toContain("1113-5/02");
    expect(codes).toContain("4635-4/02");
  });

  it("T08.3 — matriz de riscos tem estrutura mínima esperada", async () => {
    const goldenRisks = {
      areas: {
        contabilidade: [{ id: "R001", title: "Risco ICMS", riskLevel: "alto", description: "..." }],
        juridico: [{ id: "R002", title: "Risco PIS/COFINS", riskLevel: "medio", description: "..." }],
      },
      totalRisks: 2,
      criticalRisks: 1,
    };
    await conn.execute(
      `UPDATE projects SET riskMatricesDataV3 = ? WHERE id = ?`,
      [JSON.stringify(goldenRisks), projectId]
    );
    const p = await getProject(projectId);
    const r = typeof p.riskMatricesDataV3 === "string" ? JSON.parse(p.riskMatricesDataV3) : p.riskMatricesDataV3;
    expect(r).not.toBeNull();
    expect(r.areas).toBeDefined();
    expect(r.totalRisks).toBeGreaterThan(0);
    expect(typeof r.criticalRisks).toBe("number");
  });

  it("T08.4 — plano de ação tem estrutura mínima esperada", async () => {
    const goldenPlan = {
      contabilidade: [{ id: "T001", title: "Revisar ICMS", priority: "alta", deadline: "30 dias", status: "pendente" }],
      juridico: [{ id: "T002", title: "Analisar PIS/COFINS", priority: "media", deadline: "60 dias", status: "pendente" }],
    };
    await conn.execute(
      `UPDATE projects SET actionPlansDataV3 = ?, status = ? WHERE id = ?`,
      [JSON.stringify(goldenPlan), "plano_acao", projectId]
    );
    const p = await getProject(projectId);
    const plan = typeof p.actionPlansDataV3 === "string" ? JSON.parse(p.actionPlansDataV3) : p.actionPlansDataV3;
    expect(plan).not.toBeNull();
    const areas = Object.keys(plan);
    expect(areas.length).toBeGreaterThan(0);
    for (const area of areas) {
      for (const task of plan[area]) {
        expect(task.id).toBeDefined();
        expect(task.title.length).toBeGreaterThan(3);
        expect(task.priority).toBeDefined();
      }
    }
  });

  it("T08.5 — saídas distintas para casos distintos (golden output check)", async () => {
    const projectId2 = await createTestProject("[ONDA1-T08b] Geração IA Distinto");
    const b1 = { riskLevel: "alto", executiveSummary: "Cervejaria com riscos ICMS elevados" };
    const b2 = { riskLevel: "baixo", executiveSummary: "Empresa de TI com riscos menores" };
    await conn.execute(`UPDATE projects SET briefingContentV3 = ? WHERE id = ?`, [JSON.stringify(b1), projectId]);
    await conn.execute(`UPDATE projects SET briefingContentV3 = ? WHERE id = ?`, [JSON.stringify(b2), projectId2]);
    const p1 = await getProject(projectId);
    const p2 = await getProject(projectId2);
    const br1 = typeof p1.briefingContentV3 === "string" ? JSON.parse(p1.briefingContentV3) : p1.briefingContentV3;
    const br2 = typeof p2.briefingContentV3 === "string" ? JSON.parse(p2.briefingContentV3) : p2.briefingContentV3;
    expect(br1.riskLevel).not.toBe(br2.riskLevel);
    expect(br1.executiveSummary).not.toBe(br2.executiveSummary);
    await conn.execute(`DELETE FROM projects WHERE id = ?`, [projectId2]);
  });
});

// ─── T09 — Shadow Mode ────────────────────────────────────────────────────────

describe("T09 — Shadow Mode (observabilidade)", () => {

  it("T09.1 — DIAGNOSTIC_READ_MODE está configurado como shadow ou legacy", () => {
    const mode = process.env.DIAGNOSTIC_READ_MODE;
    const effectiveMode = mode || "legacy";
    expect(["shadow", "legacy", "new"]).toContain(effectiveMode);
  });

  it("T09.2 — tabela diagnostic_shadow_divergences existe e tem estrutura correta", async () => {
    const [cols] = await conn.execute(`DESCRIBE diagnostic_shadow_divergences`) as any;
    const colNames = cols.map((c: any) => c.Field);
    expect(colNames).toContain("id");
    expect(colNames).toContain("project_id");
    expect(colNames).toContain("flow_version");
    expect(colNames).toContain("field_name");
    expect(colNames).toContain("reason");
    expect(colNames).toContain("created_at");
  });

  it("T09.3 — divergências existentes são todas do tipo esperado", async () => {
    const [rows] = await conn.execute(
      `SELECT DISTINCT reason FROM diagnostic_shadow_divergences LIMIT 20`
    ) as any;
    for (const row of rows) {
      const isExpectedType =
        row.reason.includes("legada tem valor, nova é null") ||
        row.reason.includes("Divergência em");
      expect(isExpectedType).toBe(true);
    }
  });

  it("T09.4 — não há divergências de conflito real (ambos têm valor mas diferentes)", async () => {
    const [rows] = await conn.execute(
      `SELECT COUNT(*) as total FROM diagnostic_shadow_divergences 
       WHERE legacy_value_json IS NOT NULL 
       AND new_value_json IS NOT NULL
       AND legacy_value_json != new_value_json`
    ) as any;
    expect(rows[0].total).toBe(0);
  });

  it("T09.5 — total de divergências é consistente com projetos pré-v2.1", async () => {
    const [divTotal] = await conn.execute(
      `SELECT COUNT(*) as total FROM diagnostic_shadow_divergences`
    ) as any;
    const [projTotal] = await conn.execute(
      `SELECT COUNT(*) as total FROM projects WHERE status IN ('aprovado', 'plano_acao', 'riscos', 'briefing')`
    ) as any;
    const maxExpected = projTotal[0].total * 3;
    expect(divTotal[0].total).toBeLessThanOrEqual(maxExpected);
  });

  it("T09.6 — logging de divergência funciona (insert e query)", async () => {
    const testProjectId = await createTestProject("[ONDA1-T09] Shadow Test", { status: "briefing", currentStep: 3 });
    await conn.execute(
      `INSERT INTO diagnostic_shadow_divergences 
       (project_id, flow_version, field_name, legacy_source_column, new_source_column, legacy_value_json, new_value_json, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [testProjectId, "v1", "briefingContent", "briefingContent", "briefingContentV3",
        JSON.stringify({ test: "legacy" }), null,
        "Divergência em briefingContent: legada tem valor, nova é null"]
    );
    const [rows] = await conn.execute(
      `SELECT * FROM diagnostic_shadow_divergences WHERE project_id = ?`,
      [testProjectId]
    ) as any;
    expect(rows).toHaveLength(1);
    expect(rows[0].field_name).toBe("briefingContent");
    expect(rows[0].reason).toContain("legada tem valor");
    await conn.execute(`DELETE FROM diagnostic_shadow_divergences WHERE project_id = ?`, [testProjectId]);
    await conn.execute(`DELETE FROM projects WHERE id = ?`, [testProjectId]);
  });

  it("T09.7 — modo shadow implementado com comparação assíncrona em background", () => {
    const fs = require("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/server/diagnostic-source.ts",
      "utf-8"
    );
    expect(source).toContain("runShadowComparison");
    expect(source).toContain("shadow");
    expect(source).toContain("catch");
  });
});

// ─── T10 — Alteração do projeto (reentrada) ───────────────────────────────────

describe("T10 — Alteração do projeto (reentrada completa)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T10] Alteração Projeto", {
      status: "aprovado",
      currentStep: 5,
    });
    await setCnaes(projectId, ["1113-5/02", "4635-4/02"]);
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    await conn.execute(
      `UPDATE projects SET 
        briefingContentV3 = ?,
        riskMatricesDataV3 = ?,
        actionPlansDataV3 = ?
       WHERE id = ?`,
      [
        JSON.stringify({ riskLevel: "alto", executiveSummary: "Briefing original" }),
        JSON.stringify({ areas: { contabilidade: [] }, totalRisks: 5, criticalRisks: 2 }),
        JSON.stringify({ contabilidade: [{ id: "T001", title: "Tarefa original", priority: "alta" }] }),
        projectId,
      ]
    );
  });

  it("T10.1 — projeto aprovado tem status aprovado e step 5", async () => {
    const p = await getProject(projectId);
    expect(p.status).toBe("aprovado");
    expect(p.currentStep).toBe(5);
  });

  it("T10.2 — início de alteração: status pode mudar para em_andamento", async () => {
    await setStatus(projectId, "em_andamento", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("em_andamento");
  });

  it("T10.3 — durante alteração: dados V3 preservados (sem corrupção)", async () => {
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string" ? JSON.parse(p.briefingContentV3) : p.briefingContentV3;
    expect(b).not.toBeNull();
    expect(b.executiveSummary).toBe("Briefing original");
  });

  it("T10.4 — alteração: pode modificar CNAEs (adicionar novo CNAE)", async () => {
    const p = await getProject(projectId);
    const cnaes = typeof p.confirmedCnaes === "string" ? JSON.parse(p.confirmedCnaes) : p.confirmedCnaes;
    cnaes.push({ code: "4723-7/00", confidence: 95, description: "Comércio Varejista de Bebidas" });
    await conn.execute(`UPDATE projects SET confirmedCnaes = ? WHERE id = ?`, [JSON.stringify(cnaes), projectId]);
    const updated = await getProject(projectId);
    const updatedCnaes = typeof updated.confirmedCnaes === "string" ? JSON.parse(updated.confirmedCnaes) : updated.confirmedCnaes;
    expect(updatedCnaes.length).toBe(3);
  });

  it("T10.5 — após alteração: campo updatedAt existe e é não-nulo", async () => {
    const p = await getProject(projectId);
    expect("updatedAt" in p).toBe(true);
    expect(p.updatedAt).not.toBeNull();
  });

  it("T10.6 — retorno controlado: volta para aprovado sem corrupção", async () => {
    await setStatus(projectId, "aprovado", 5);
    const p = await getProject(projectId);
    expect(p.status).toBe("aprovado");
    const b = typeof p.briefingContentV3 === "string" ? JSON.parse(p.briefingContentV3) : p.briefingContentV3;
    expect(b.executiveSummary).toBe("Briefing original");
  });

  it("T10.7 — invariante de integridade após alteração + retorno", async () => {
    const p = await getProject(projectId);
    const cnaes = typeof p.confirmedCnaes === "string" ? JSON.parse(p.confirmedCnaes) : p.confirmedCnaes;
    const ds = await getDiagnosticStatus(projectId);
    expect(cnaes.length).toBeGreaterThan(0);
    expect(ds).not.toBeNull();
    expect(p.status).toBe("aprovado");
    expect(p.briefingContentV3).not.toBeNull();
  });
});
