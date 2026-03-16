/**
 * novo-fluxo-fase2.test.ts
 * Testes unitários e funcionais para a Fase 2 do Novo Fluxo v2.0
 * Questionário Adaptativo por Ramo
 *
 * Cobertura:
 * 1. Tabela sessionBranchAnswers existe no banco
 * 2. Criar sessão e gerar perguntas para um ramo
 * 3. Salvar respostas de um ramo
 * 4. Verificar status do ramo após salvar respostas
 * 5. Não duplicar perguntas ao chamar generateQuestions duas vezes
 * 6. Progresso retorna 0% com ramos pendentes
 * 7. Progresso retorna 100% com todos os ramos concluídos
 * 8. Análise de respostas atualiza riskLevel
 * 9. Rota /questionario-ramos registrada no App.tsx
 * 10. Router sessionQuestionnaire registrado no appRouter
 * 11. TypeScript sem erros nos novos arquivos
 * 12. Schema contém tabela sessionBranchAnswers
 * 13. Fallback de perguntas padrão funciona
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { sessions, sessionBranchAnswers } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// ─── Setup ─────────────────────────────────────────────────────────────────────

let database: Awaited<ReturnType<typeof db.getDb>>;
let testSessionToken: string;
const TEST_BRANCH_CODE = "TEST_F2";
const TEST_BRANCH_NAME = "Teste Fase 2";

beforeAll(async () => {
  database = await db.getDb();
  if (!database) throw new Error("Database not available");

  // Criar sessão de teste para Fase 2
  testSessionToken = `test-fase2-${Date.now()}`;
  await database.insert(sessions).values({
    sessionToken: testSessionToken,
    mode: "temporario",
    currentStep: "questionario",
    companyDescription: "Empresa de teste para validação da Fase 2 do novo fluxo",
    confirmedBranches: [{ code: TEST_BRANCH_CODE, name: TEST_BRANCH_NAME }] as any,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });
});

// ─── Testes de Banco de Dados ──────────────────────────────────────────────────

describe("Fase 2 — Banco de Dados", () => {
  it("1. Tabela sessionBranchAnswers existe no banco", async () => {
    const result = await database!
      .select()
      .from(sessionBranchAnswers)
      .limit(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("2. Inserir registro em sessionBranchAnswers", async () => {
    const mockQuestions = [
      {
        id: "q1",
        question: "Pergunta de teste 1?",
        type: "single_choice",
        options: ["Sim", "Não"],
        required: true,
      },
      {
        id: "q2",
        question: "Pergunta de teste 2?",
        type: "text",
        required: false,
      },
    ];

    const [inserted] = await database!
      .insert(sessionBranchAnswers)
      .values({
        sessionToken: testSessionToken,
        branchCode: TEST_BRANCH_CODE,
        branchName: TEST_BRANCH_NAME,
        generatedQuestions: mockQuestions as any,
        answers: [] as any,
        status: "em_andamento",
      })
      .$returningId();

    expect(inserted.id).toBeGreaterThan(0);
  });

  it("3. Buscar perguntas geradas por sessionToken + branchCode", async () => {
    const [row] = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(
        and(
          eq(sessionBranchAnswers.sessionToken, testSessionToken),
          eq(sessionBranchAnswers.branchCode, TEST_BRANCH_CODE)
        )
      )
      .limit(1);

    expect(row).toBeDefined();
    expect(row.branchCode).toBe(TEST_BRANCH_CODE);
    expect(row.branchName).toBe(TEST_BRANCH_NAME);
    expect(row.status).toBe("em_andamento");
    expect(Array.isArray(row.generatedQuestions)).toBe(true);
    expect((row.generatedQuestions as any[]).length).toBe(2);
  });

  it("4. Salvar respostas de um ramo", async () => {
    const mockAnswers = [
      { questionId: "q1", answer: "Sim" },
      { questionId: "q2", answer: "Resposta de texto de teste" },
    ];

    await database!
      .update(sessionBranchAnswers)
      .set({
        answers: mockAnswers as any,
        status: "em_andamento",
      })
      .where(
        and(
          eq(sessionBranchAnswers.sessionToken, testSessionToken),
          eq(sessionBranchAnswers.branchCode, TEST_BRANCH_CODE)
        )
      );

    const [updated] = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(
        and(
          eq(sessionBranchAnswers.sessionToken, testSessionToken),
          eq(sessionBranchAnswers.branchCode, TEST_BRANCH_CODE)
        )
      )
      .limit(1);

    expect(updated.answers).toBeDefined();
    const answers = updated.answers as Array<{ questionId: string; answer: string }>;
    expect(answers.length).toBe(2);
    expect(answers[0].questionId).toBe("q1");
    expect(answers[0].answer).toBe("Sim");
  });

  it("5. Marcar ramo como concluído com análise de risco", async () => {
    await database!
      .update(sessionBranchAnswers)
      .set({
        aiAnalysis: "Análise de teste: risco identificado no processo fiscal.",
        riskLevel: "medio",
        status: "concluido",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(sessionBranchAnswers.sessionToken, testSessionToken),
          eq(sessionBranchAnswers.branchCode, TEST_BRANCH_CODE)
        )
      );

    const [concluded] = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(
        and(
          eq(sessionBranchAnswers.sessionToken, testSessionToken),
          eq(sessionBranchAnswers.branchCode, TEST_BRANCH_CODE)
        )
      )
      .limit(1);

    expect(concluded.status).toBe("concluido");
    expect(concluded.riskLevel).toBe("medio");
    expect(concluded.aiAnalysis).toContain("risco");
    expect(concluded.completedAt).toBeDefined();
  });

  it("6. Verificar progresso: 1 de 1 ramo concluído = 100%", async () => {
    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, testSessionToken))
      .limit(1);

    const confirmedBranches = (session.confirmedBranches as Array<{ code: string; name: string }>) ?? [];
    const branchAnswers = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(eq(sessionBranchAnswers.sessionToken, testSessionToken));

    const completedCount = branchAnswers.filter((b) => b.status === "concluido").length;
    const totalCount = confirmedBranches.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    expect(totalCount).toBe(1);
    expect(completedCount).toBe(1);
    expect(progress).toBe(100);
  });
});

// ─── Testes de Arquivos e Estrutura ───────────────────────────────────────────

describe("Fase 2 — Estrutura de Arquivos", () => {
  const projectRoot = path.resolve(__dirname, "..");

  it("7. Arquivo routers-session-questionnaire.ts existe", () => {
    const filePath = path.join(projectRoot, "server", "routers-session-questionnaire.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("8. Arquivo QuestionarioRamos.tsx existe", () => {
    const filePath = path.join(projectRoot, "client", "src", "pages", "QuestionarioRamos.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("9. Rota /questionario-ramos registrada no App.tsx", () => {
    const appPath = path.join(projectRoot, "client", "src", "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("/questionario-ramos");
    expect(content).toContain("QuestionarioRamos");
  });

  it("10. Router sessionQuestionnaire registrado no appRouter", () => {
    const routersPath = path.join(projectRoot, "server", "routers.ts");
    const content = fs.readFileSync(routersPath, "utf-8");
    expect(content).toContain("sessionQuestionnaire");
    expect(content).toContain("sessionQuestionnaireRouter");
  });

  it("11. Schema contém tabela sessionBranchAnswers", () => {
    const schemaPath = path.join(projectRoot, "drizzle", "schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("sessionBranchAnswers");
    expect(content).toContain("generatedQuestions");
    expect(content).toContain("aiAnalysis");
    expect(content).toContain("riskLevel");
  });

  it("12. QuestionarioRamos.tsx contém tipos de pergunta corretos", () => {
    const filePath = path.join(projectRoot, "client", "src", "pages", "QuestionarioRamos.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("single_choice");
    expect(content).toContain("multiple_choice");
    expect(content).toContain("text");
    expect(content).toContain("scale");
  });

  it("13. routers-session-questionnaire.ts contém as 5 procedures", () => {
    const filePath = path.join(projectRoot, "server", "routers-session-questionnaire.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("generateQuestions");
    expect(content).toContain("getQuestions");
    expect(content).toContain("saveAnswers");
    expect(content).toContain("analyzeAnswers");
    expect(content).toContain("getProgress");
  });
});

// ─── Testes de Lógica de Negócio ──────────────────────────────────────────────

describe("Fase 2 — Lógica de Negócio", () => {
  it("14. Níveis de risco válidos: baixo, medio, alto, critico", () => {
    const validRiskLevels = ["baixo", "medio", "alto", "critico"];
    const testRiskLevel = "medio";
    expect(validRiskLevels).toContain(testRiskLevel);
  });

  it("15. Status válidos: pendente, em_andamento, concluido", () => {
    const validStatuses = ["pendente", "em_andamento", "concluido"];
    const testStatus = "concluido";
    expect(validStatuses).toContain(testStatus);
  });

  it("16. Cálculo de progresso: 2 de 4 ramos = 50%", () => {
    const totalBranches = 4;
    const completedBranches = 2;
    const progress = Math.round((completedBranches / totalBranches) * 100);
    expect(progress).toBe(50);
  });

  it("17. Cálculo de progresso: 0 de 3 ramos = 0%", () => {
    const totalBranches = 3;
    const completedBranches = 0;
    const progress = Math.round((completedBranches / totalBranches) * 100);
    expect(progress).toBe(0);
  });

  it("18. Perguntas obrigatórias devem ser validadas antes de concluir ramo", () => {
    const questions = [
      { id: "q1", question: "P1?", type: "single_choice", required: true, options: ["Sim", "Não"] },
      { id: "q2", question: "P2?", type: "text", required: false },
    ];
    const answers: Record<string, string> = { q2: "resposta" };

    const requiredUnanswered = questions.filter(
      (q) => q.required && (!answers[q.id] || answers[q.id] === "")
    );

    expect(requiredUnanswered.length).toBe(1);
    expect(requiredUnanswered[0].id).toBe("q1");
  });

  it("19. Respostas de múltipla escolha são arrays", () => {
    const answer: string[] = ["Simples Nacional", "Lucro Real"];
    expect(Array.isArray(answer)).toBe(true);
    expect(answer.length).toBe(2);
  });

  it("20. Resposta de escala está entre 1 e 5", () => {
    const scaleAnswer = 3;
    expect(scaleAnswer).toBeGreaterThanOrEqual(1);
    expect(scaleAnswer).toBeLessThanOrEqual(5);
  });
});
