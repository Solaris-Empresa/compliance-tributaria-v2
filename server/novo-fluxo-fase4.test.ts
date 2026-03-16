/**
 * Testes Unitários e Funcionais - Fase 4: Consolidação Final
 * Sprint V42 - Novo Fluxo v2.0
 *
 * Valida:
 * - Schema: tabela sessionConsolidations existe e tem campos corretos
 * - Backend: router sessionConsolidation registrado no appRouter
 * - Procedures: generate, get, saveToHistory, exportData
 * - Integração: rota /consolidacao registrada no App.tsx
 * - Fluxo completo: sessão → plano → consolidação → exportação
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { sessions, sessionActionPlans, sessionConsolidations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomToken() {
  return `test-fase4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Testes de Schema ─────────────────────────────────────────────────────────

describe("Fase 4 - Schema: sessionConsolidations", () => {
  it("tabela sessionConsolidations existe no schema", () => {
    expect(sessionConsolidations).toBeDefined();
    expect(sessionConsolidations[Symbol.for("drizzle:Name")]).toBe("sessionConsolidations");
  });

  it("tabela tem campo sessionToken", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("sessionToken");
  });

  it("tabela tem campo complianceScore", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("complianceScore");
  });

  it("tabela tem campo overallRiskLevel", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("overallRiskLevel");
  });

  it("tabela tem campo executiveSummary", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("executiveSummary");
  });

  it("tabela tem campo keyFindings", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("keyFindings");
  });

  it("tabela tem campo topRecommendations", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("topRecommendations");
  });

  it("tabela tem campo timeline", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("timeline");
  });

  it("tabela tem campo branchSummaries", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("branchSummaries");
  });

  it("tabela tem campo status", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("status");
  });

  it("tabela tem campo convertedToProjectId", () => {
    const cols = Object.keys(sessionConsolidations);
    expect(cols).toContain("convertedToProjectId");
  });
});

// ─── Testes de Router ─────────────────────────────────────────────────────────

describe("Fase 4 - Router: sessionConsolidation registrado", () => {
  it("appRouter tem sessionConsolidation", () => {
    const keys = Object.keys(appRouter._def.procedures);
    const hasConsolidation = keys.some(k => k.startsWith("sessionConsolidation"));
    expect(hasConsolidation).toBe(true);
  });

  it("procedure generate existe", () => {
    const keys = Object.keys(appRouter._def.procedures);
    const hasGenerate = keys.some(k => k.includes("sessionConsolidation") && k.includes("generate"));
    expect(hasGenerate).toBe(true);
  });

  it("procedure get existe", () => {
    const keys = Object.keys(appRouter._def.procedures);
    const hasGet = keys.some(k => k.includes("sessionConsolidation") && (k.endsWith(".get") || k.endsWith("get")));
    expect(hasGet).toBe(true);
  });

  it("procedure saveToHistory existe", () => {
    const keys = Object.keys(appRouter._def.procedures);
    const hasSave = keys.some(k => k.includes("sessionConsolidation") && k.includes("saveToHistory"));
    expect(hasSave).toBe(true);
  });

  it("procedure exportData existe", () => {
    const keys = Object.keys(appRouter._def.procedures);
    const hasExport = keys.some(k => k.includes("sessionConsolidation") && k.includes("exportData"));
    expect(hasExport).toBe(true);
  });
});

// ─── Testes de Banco de Dados ─────────────────────────────────────────────────

describe("Fase 4 - Banco: operações CRUD em sessionConsolidations", () => {
  let database: Awaited<ReturnType<typeof db.getDb>>;
  let testToken: string;

  beforeAll(async () => {
    database = await db.getDb();
    testToken = randomToken();
  });

  it("banco de dados está disponível", async () => {
    expect(database).not.toBeNull();
  });

  it("pode inserir consolidação de teste", async () => {
    if (!database) return;
    await database.insert(sessionConsolidations).values({
      sessionToken: testToken,
      status: "gerando",
      totalActions: 10,
      criticalActions: 3,
      complianceScore: 65,
      overallRiskLevel: "medio",
      estimatedDays: 90,
    });

    const [inserted] = await database
      .select()
      .from(sessionConsolidations)
      .where(eq(sessionConsolidations.sessionToken, testToken))
      .limit(1);

    expect(inserted).toBeDefined();
    expect(inserted.sessionToken).toBe(testToken);
    expect(inserted.complianceScore).toBe(65);
    expect(inserted.status).toBe("gerando");
  });

  it("pode atualizar status da consolidação", async () => {
    if (!database) return;
    await database
      .update(sessionConsolidations)
      .set({
        status: "gerado",
        executiveSummary: "Resumo executivo de teste para validação.",
      })
      .where(eq(sessionConsolidations.sessionToken, testToken));

    const [updated] = await database
      .select()
      .from(sessionConsolidations)
      .where(eq(sessionConsolidations.sessionToken, testToken))
      .limit(1);

    expect(updated.status).toBe("gerado");
    expect(updated.executiveSummary).toBe("Resumo executivo de teste para validação.");
  });

  it("pode buscar consolidação por sessionToken", async () => {
    if (!database) return;
    const [found] = await database
      .select()
      .from(sessionConsolidations)
      .where(eq(sessionConsolidations.sessionToken, testToken))
      .limit(1);

    expect(found).toBeDefined();
    expect(found.sessionToken).toBe(testToken);
  });

  it("pode deletar consolidação de teste", async () => {
    if (!database) { return; }
    const { sql } = await import("drizzle-orm");
    await database.execute(
      sql`DELETE FROM sessionConsolidations WHERE sessionToken = ${testToken}`
    );

    const [deleted] = await database
      .select()
      .from(sessionConsolidations)
      .where(eq(sessionConsolidations.sessionToken, testToken))
      .limit(1);

    expect(deleted).toBeUndefined();
  });
});

// ─── Testes de Integração Frontend ───────────────────────────────────────────

describe("Fase 4 - Frontend: rota /consolidacao registrada", () => {
  it("App.tsx contém rota /consolidacao", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/App.tsx",
      "utf-8"
    );
    expect(appContent).toContain("/consolidacao");
    expect(appContent).toContain("Consolidacao");
  });

  it("Consolidacao.tsx existe", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx"
    );
    expect(exists).toBe(true);
  });

  it("Consolidacao.tsx contém score de compliance", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx",
      "utf-8"
    );
    expect(content).toContain("complianceScore");
    expect(content).toContain("Score de Compliance");
  });

  it("Consolidacao.tsx contém exportação CSV", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx",
      "utf-8"
    );
    expect(content).toContain("handleExportCSV");
    expect(content).toContain("text/csv");
  });

  it("Consolidacao.tsx contém exportação JSON", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx",
      "utf-8"
    );
    expect(content).toContain("handleExportJSON");
    expect(content).toContain("application/json");
  });

  it("Consolidacao.tsx contém modal de salvar no histórico", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx",
      "utf-8"
    );
    expect(content).toContain("saveToHistory");
    expect(content).toContain("Salvar no Histórico");
  });
});

// ─── Testes de Fluxo Completo ─────────────────────────────────────────────────

describe("Fase 4 - Fluxo: validação do fluxo completo v2.0", () => {
  it("fluxo completo: 4 fases implementadas", async () => {
    const fs = await import("fs");
    // Fase 1: ModoUso + BriefingInteligente
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/ModoUso.tsx")).toBe(true);
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/BriefingInteligente.tsx")).toBe(true);
    // Fase 2: QuestionarioRamos
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/QuestionarioRamos.tsx")).toBe(true);
    // Fase 3: PlanoAcaoSession + MatrizRiscosSession
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/PlanoAcaoSession.tsx")).toBe(true);
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/MatrizRiscosSession.tsx")).toBe(true);
    // Fase 4: Consolidacao
    expect(fs.existsSync("/home/ubuntu/compliance-tributaria-v2/client/src/pages/Consolidacao.tsx")).toBe(true);
  });

  it("fluxo completo: 4 routers de sessão implementados", () => {
    const keys = Object.keys(appRouter._def.procedures);
    expect(keys.some(k => k.startsWith("sessions"))).toBe(true);
    expect(keys.some(k => k.startsWith("sessionQuestionnaire"))).toBe(true);
    expect(keys.some(k => k.startsWith("sessionActionPlan"))).toBe(true);
    expect(keys.some(k => k.startsWith("sessionConsolidation"))).toBe(true);
  });

  it("fluxo completo: 5 tabelas de sessão no banco", async () => {
    const { sessions, branchSuggestions, sessionBranchAnswers, sessionActionPlans, sessionConsolidations } =
      await import("../drizzle/schema");
    expect(sessions).toBeDefined();
    expect(branchSuggestions).toBeDefined();
    expect(sessionBranchAnswers).toBeDefined();
    expect(sessionActionPlans).toBeDefined();
    expect(sessionConsolidations).toBeDefined();
  });

  it("fluxo completo: todas as rotas registradas no App.tsx", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync(
      "/home/ubuntu/compliance-tributaria-v2/client/src/App.tsx",
      "utf-8"
    );
    expect(appContent).toContain("/modo-uso");
    expect(appContent).toContain("/briefing");
    expect(appContent).toContain("/questionario-ramos");
    expect(appContent).toContain("/plano-acao-session");
    expect(appContent).toContain("/matriz-riscos-session");
    expect(appContent).toContain("/consolidacao");
  });
});
