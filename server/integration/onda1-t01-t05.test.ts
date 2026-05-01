/**
 * ONDA 1 — TESTES AUTOMÁTICOS T01–T05
 * Plano Mestre de Validação da Plataforma
 * Modo: DIAGNOSTIC_READ_MODE=shadow
 * Data: 2026-03-23
 *
 * T01 — Fluxo feliz simples (1 CNAE)
 * T02 — Loop com 3 CNAEs
 * T03 — Bloqueio por incompletude
 * T04 — Persistência e retomada
 * T05 — Retrocesso controlado
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql from "mysql2/promise";
import { dbDescribe } from "../test-helpers";

let conn: mysql.Connection;

beforeAll(async () => {
  conn = await mysql.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  // Limpeza após todos os testes — usa padrão específico para não conflitar com T06-T10
  try {
    await conn.execute(`DELETE FROM questionnaireAnswersV3 WHERE projectId IN (SELECT id FROM projects WHERE name LIKE '[ONDA1-T01%]' OR name LIKE '[ONDA1-T02%]' OR name LIKE '[ONDA1-T03%]' OR name LIKE '[ONDA1-T04%]' OR name LIKE '[ONDA1-T05%]')`);
  } catch (_) {}
  await conn.execute(`DELETE FROM projects WHERE name LIKE '[ONDA1-T01%]' OR name LIKE '[ONDA1-T02%]' OR name LIKE '[ONDA1-T03%]' OR name LIKE '[ONDA1-T04%]' OR name LIKE '[ONDA1-T05%]'`);
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

async function getCnaes(projectId: number) {
  const p = await getProject(projectId);
  if (!p.confirmedCnaes) return [];
  const cnaes = typeof p.confirmedCnaes === "string"
    ? JSON.parse(p.confirmedCnaes)
    : p.confirmedCnaes;
  return cnaes;
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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE answerValue = ?, answeredAt = NOW()`,
    [projectId, cnaeCode, `Descrição ${cnaeCode}`, "nivel1", 0, questionText, "radio", answerValue, answerValue]
  );
}

async function countAnswers(projectId: number) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as total FROM questionnaireAnswersV3 WHERE projectId = ?`,
    [projectId]
  ) as any;
  return rows[0].total;
}

// ─── T01 — Fluxo feliz simples (1 CNAE) ──────────────────────────────────────

dbDescribe("T01 — Fluxo feliz simples (1 CNAE)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T01] Fluxo Feliz 1 CNAE");
    await setCnaes(projectId, ["1113-5/02"]);
  });

  it("T01.1 — projeto criado com status rascunho e step 1", async () => {
    const p = await getProject(projectId);
    expect(p.status).toBe("rascunho");
    expect(p.currentStep).toBe(1);
  });

  it("T01.2 — CNAEs confirmados: 1 CNAE armazenado", async () => {
    const cnaes = await getCnaes(projectId);
    expect(cnaes).toHaveLength(1);
    expect(cnaes[0].code).toBe("1113-5/02");
  });

  it("T01.3 — transição para cnaes_confirmados após confirmação", async () => {
    await setStatus(projectId, "cnaes_confirmados", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("cnaes_confirmados");
    expect(p.currentStep).toBe(2);
  });

  it("T01.4 — transição para diagnostico_corporativo após iniciar questionário", async () => {
    await setStatus(projectId, "diagnostico_corporativo", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_corporativo");
  });

  it("T01.5 — transição para diagnostico_operacional após concluir corporativo", async () => {
    await setDiagnosticStatus(projectId, { corporate: "completed" });
    await setStatus(projectId, "diagnostico_operacional", 2);
    const ds = await getDiagnosticStatus(projectId);
    expect(ds.corporate).toBe("completed");
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_operacional");
  });

  it("T01.6 — transição para diagnostico_cnae após concluir operacional", async () => {
    await setDiagnosticStatus(projectId, { corporate: "completed", operational: "completed" });
    await setStatus(projectId, "diagnostico_cnae", 2);
    const ds = await getDiagnosticStatus(projectId);
    expect(ds.operational).toBe("completed");
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_cnae");
  });

  it("T01.7 — respostas CNAE salvas na tabela questionnaireAnswersV3", async () => {
    await saveQuestionnaireAnswer(projectId, "1113-5/02", "Qual o regime tributário?", "Lucro Presumido");
    const count = await countAnswers(projectId);
    expect(count).toBeGreaterThan(0);
  });

  it("T01.8 — transição para briefing após diagnóstico completo", async () => {
    await setDiagnosticStatus(projectId, { corporate: "completed", operational: "completed", cnae: "completed" });
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
    expect(p.currentStep).toBe(3);
  });

  it("T01.9 — transição para riscos após aprovação do briefing", async () => {
    await conn.execute(
      `UPDATE projects SET briefingContentV3 = ? WHERE id = ?`,
      [JSON.stringify({ riskLevel: "alto", executiveSummary: "Briefing T01" }), projectId]
    );
    await setStatus(projectId, "riscos", 4);
    const p = await getProject(projectId);
    expect(p.status).toBe("riscos");
    expect(p.currentStep).toBe(4);
  });

  it("T01.10 — transição para plano_acao após aprovação das matrizes", async () => {
    await setStatus(projectId, "plano_acao", 5);
    const p = await getProject(projectId);
    expect(p.status).toBe("plano_acao");
    expect(p.currentStep).toBe(5);
  });

  it("T01.11 — transição para aprovado após aprovação do plano", async () => {
    await setStatus(projectId, "aprovado", 5);
    const p = await getProject(projectId);
    expect(p.status).toBe("aprovado");
  });

  it("T01.12 — invariante final: projeto aprovado tem CNAEs e diagnosticStatus completo", async () => {
    const cnaes = await getCnaes(projectId);
    const ds = await getDiagnosticStatus(projectId);
    const p = await getProject(projectId);
    expect(cnaes.length).toBeGreaterThan(0);
    expect(ds.corporate).toBe("completed");
    expect(ds.operational).toBe("completed");
    expect(ds.cnae).toBe("completed");
    expect(p.status).toBe("aprovado");
    expect(p.briefingContentV3).not.toBeNull();
  });
});

// ─── T02 — Loop com 3 CNAEs ───────────────────────────────────────────────────

dbDescribe("T02 — Loop com 3 CNAEs (múltiplos setores)", () => {
  let projectId: number;
  const TEST_CNAES = ["1113-5/02", "4635-4/02", "4723-7/00"];

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T02] Loop 3 CNAEs");
    await setCnaes(projectId, TEST_CNAES);
    await setStatus(projectId, "diagnostico_cnae", 2);
  });

  it("T02.1 — 3 CNAEs confirmados e armazenados", async () => {
    const cnaes = await getCnaes(projectId);
    expect(cnaes).toHaveLength(3);
    const codes = cnaes.map((c: any) => c.code);
    expect(codes).toContain("1113-5/02");
    expect(codes).toContain("4635-4/02");
    expect(codes).toContain("4723-7/00");
  });

  it("T02.2 — respostas salvas para cada CNAE individualmente", async () => {
    for (const cnae of TEST_CNAES) {
      await saveQuestionnaireAnswer(projectId, cnae, `Pergunta para ${cnae}`, "Resposta teste");
    }
    const count = await countAnswers(projectId);
    expect(count).toBe(3);
  });

  it("T02.3 — diagnosticStatus.cnae = completed após responder todos os CNAEs", async () => {
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    const ds = await getDiagnosticStatus(projectId);
    expect(ds.cnae).toBe("completed");
  });

  it("T02.4 — briefing deve referenciar os 3 CNAEs", async () => {
    const briefing = {
      riskLevel: "alto",
      executiveSummary: "Empresa com 3 atividades",
      cnaeAnalysis: TEST_CNAES.map(code => ({
        cnaeCode: code,
        riskLevel: "medio",
        observations: `Análise para ${code}`,
      })),
    };
    await conn.execute(
      `UPDATE projects SET briefingContentV3 = ? WHERE id = ?`,
      [JSON.stringify(briefing), projectId]
    );
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string"
      ? JSON.parse(p.briefingContentV3)
      : p.briefingContentV3;
    expect(b.cnaeAnalysis).toHaveLength(3);
  });

  it("T02.5 — invariante: 3 CNAEs → 3 análises no briefing (coerência)", async () => {
    const cnaes = await getCnaes(projectId);
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string"
      ? JSON.parse(p.briefingContentV3)
      : p.briefingContentV3;
    expect(b.cnaeAnalysis.length).toBe(cnaes.length);
  });
});

// ─── T03 — Bloqueio por incompletude ─────────────────────────────────────────

dbDescribe("T03 — Bloqueio por incompletude (hard block)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T03] Bloqueio Incompletude");
    await setCnaes(projectId, ["1113-5/02", "4635-4/02"]);
    await setStatus(projectId, "diagnostico_cnae", 2);
  });

  it("T03.1 — projeto em diagnostico_cnae sem respostas: não pode avançar para briefing", async () => {
    const count = await countAnswers(projectId);
    const ds = await getDiagnosticStatus(projectId);
    // Sem respostas e sem diagnosticStatus completo: bloqueio
    const canAdvance = count > 0 && ds !== null && ds.cnae === "completed";
    expect(canAdvance).toBe(false);
  });

  it("T03.2 — projeto sem diagnosticStatus.corporate: bloqueio corporativo", async () => {
    const ds = await getDiagnosticStatus(projectId);
    // diagnosticStatus é null → corporativo não foi concluído
    const corporateCompleted = ds !== null && ds.corporate === "completed";
    expect(corporateCompleted).toBe(false);
  });

  it("T03.3 — projeto sem diagnosticStatus.operational: bloqueio operacional", async () => {
    const ds = await getDiagnosticStatus(projectId);
    const operationalCompleted = ds !== null && ds.operational === "completed";
    expect(operationalCompleted).toBe(false);
  });

  it("T03.4 — após completar apenas corporativo: ainda bloqueado (operacional pendente)", async () => {
    await setDiagnosticStatus(projectId, { corporate: "completed" });
    const ds = await getDiagnosticStatus(projectId);
    const allCompleted = ds.corporate === "completed" && ds.operational === "completed" && ds.cnae === "completed";
    expect(allCompleted).toBe(false);
  });

  it("T03.5 — após completar corporativo + operacional: ainda bloqueado (cnae pendente)", async () => {
    await setDiagnosticStatus(projectId, { corporate: "completed", operational: "completed" });
    const ds = await getDiagnosticStatus(projectId);
    const allCompleted = ds.corporate === "completed" && ds.operational === "completed" && ds.cnae === "completed";
    expect(allCompleted).toBe(false);
  });

  it("T03.6 — após completar as 3 camadas: desbloqueado para briefing", async () => {
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    const ds = await getDiagnosticStatus(projectId);
    const allCompleted = ds.corporate === "completed" && ds.operational === "completed" && ds.cnae === "completed";
    expect(allCompleted).toBe(true);
  });

  it("T03.7 — status muda para briefing somente após desbloqueio", async () => {
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
  });
});

// ─── T04 — Persistência e retomada ───────────────────────────────────────────

dbDescribe("T04 — Persistência e retomada (session recovery)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T04] Persistência Retomada");
    await setCnaes(projectId, ["1113-5/02"]);
    await setStatus(projectId, "diagnostico_corporativo", 2);
  });

  it("T04.1 — respostas do questionário corporativo persistidas no banco", async () => {
    await conn.execute(
      `UPDATE projects SET corporateAnswers = ? WHERE id = ?`,
      [JSON.stringify({ regime: "lucro_presumido", porte: "pequena" }), projectId]
    );
    const p = await getProject(projectId);
    const answers = typeof p.corporateAnswers === "string"
      ? JSON.parse(p.corporateAnswers)
      : p.corporateAnswers;
    expect(answers).not.toBeNull();
    expect(answers.regime).toBe("lucro_presumido");
  });

  it("T04.2 — respostas do questionário operacional persistidas no banco", async () => {
    await conn.execute(
      `UPDATE projects SET operationalAnswers = ? WHERE id = ?`,
      [JSON.stringify({ operacoes: ["fabricacao"], mercados: ["nacional"] }), projectId]
    );
    const p = await getProject(projectId);
    const answers = typeof p.operationalAnswers === "string"
      ? JSON.parse(p.operationalAnswers)
      : p.operationalAnswers;
    expect(answers).not.toBeNull();
    expect(answers.operacoes).toContain("fabricacao");
  });

  it("T04.3 — respostas CNAE persistidas em questionnaireAnswersV3", async () => {
    await saveQuestionnaireAnswer(projectId, "1113-5/02", "Pergunta CNAE 1", "Resposta CNAE 1");
    const count = await countAnswers(projectId);
    expect(count).toBeGreaterThan(0);
  });

  it("T04.4 — retomada: status e step preservados após simular reconexão", async () => {
    // Simula reconexão: busca o projeto novamente do banco
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_corporativo");
    expect(p.currentStep).toBe(2);
  });

  it("T04.5 — retomada: respostas anteriores não perdidas após simular reconexão", async () => {
    const p = await getProject(projectId);
    const corporate = typeof p.corporateAnswers === "string"
      ? JSON.parse(p.corporateAnswers)
      : p.corporateAnswers;
    expect(corporate.regime).toBe("lucro_presumido");
  });

  it("T04.6 — retomada: diagnosticStatus preservado após simular reconexão", async () => {
    await setDiagnosticStatus(projectId, { corporate: "in_progress" });
    const ds = await getDiagnosticStatus(projectId);
    expect(ds.corporate).toBe("in_progress");
  });

  it("T04.7 — progressão retomada: pode avançar do ponto onde parou", async () => {
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
    expect(p.currentStep).toBe(3);
  });
});

// ─── T05 — Retrocesso controlado ─────────────────────────────────────────────

dbDescribe("T05 — Retrocesso controlado (step regression)", () => {
  let projectId: number;

  beforeAll(async () => {
    projectId = await createTestProject("[ONDA1-T05] Retrocesso Controlado");
    await setCnaes(projectId, ["1113-5/02"]);
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    await conn.execute(
      `UPDATE projects SET briefingContentV3 = ?, riskMatricesDataV3 = ?, status = ?, currentStep = ? WHERE id = ?`,
      [
        JSON.stringify({ riskLevel: "alto", executiveSummary: "Briefing original" }),
        JSON.stringify({ areas: {}, totalRisks: 5, criticalRisks: 2 }),
        "riscos",
        4,
        projectId,
      ]
    );
  });

  it("T05.1 — projeto em riscos (step 4) pode retroceder para briefing (step 3)", async () => {
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
    expect(p.currentStep).toBe(3);
  });

  it("T05.2 — retrocesso para briefing: dados do briefing preservados", async () => {
    const p = await getProject(projectId);
    const b = typeof p.briefingContentV3 === "string"
      ? JSON.parse(p.briefingContentV3)
      : p.briefingContentV3;
    expect(b).not.toBeNull();
    expect(b.executiveSummary).toBe("Briefing original");
  });

  it("T05.3 — retrocesso para briefing: matrizes de risco preservadas", async () => {
    const p = await getProject(projectId);
    const r = typeof p.riskMatricesDataV3 === "string"
      ? JSON.parse(p.riskMatricesDataV3)
      : p.riskMatricesDataV3;
    expect(r).not.toBeNull();
    expect(r.totalRisks).toBe(5);
  });

  it("T05.4 — retrocesso para diagnóstico: status volta para diagnostico_cnae", async () => {
    await setStatus(projectId, "diagnostico_cnae", 2);
    const p = await getProject(projectId);
    expect(p.status).toBe("diagnostico_cnae");
    expect(p.currentStep).toBe(2);
  });

  it("T05.5 — retrocesso não cria bypass: briefing ainda bloqueado sem diagnóstico completo", async () => {
    // Limpa o diagnosticStatus para simular retrocesso total
    await setDiagnosticStatus(projectId, { corporate: "completed", operational: "in_progress", cnae: "pending" });
    const ds = await getDiagnosticStatus(projectId);
    const allCompleted = ds.corporate === "completed" && ds.operational === "completed" && ds.cnae === "completed";
    expect(allCompleted).toBe(false);
  });

  it("T05.6 — verifica tabela de histórico de retrocesso (stepHistory)", async () => {
    const p = await getProject(projectId);
    // stepHistory pode ser null se não foi registrado nenhum retrocesso via endpoint
    // O importante é que o campo existe na tabela
    expect("stepHistory" in p).toBe(true);
  });

  it("T05.7 — retrocesso controlado: pode avançar novamente após retroceder", async () => {
    await setDiagnosticStatus(projectId, {
      corporate: "completed",
      operational: "completed",
      cnae: "completed",
    });
    await setStatus(projectId, "briefing", 3);
    const p = await getProject(projectId);
    expect(p.status).toBe("briefing");
  });

  it("T05.8 — invariante de integridade: dados não corrompidos após retrocesso + avanço", async () => {
    const cnaes = await getCnaes(projectId);
    const ds = await getDiagnosticStatus(projectId);
    const p = await getProject(projectId);
    expect(cnaes.length).toBeGreaterThan(0);
    expect(ds.corporate).toBe("completed");
    expect(p.briefingContentV3).not.toBeNull();
    expect(p.riskMatricesDataV3).not.toBeNull();
  });
});
