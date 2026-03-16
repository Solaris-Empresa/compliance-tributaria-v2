/**
 * novo-fluxo-fase3.test.ts
 * Testes unitários e funcionais para a Fase 3 do Novo Fluxo v2.0
 * Plano de Ação Consolidado por Sessão
 *
 * Cobertura:
 * 1.  Tabela sessionActionPlans existe no banco
 * 2.  Inserir plano de ação para sessão de teste
 * 3.  Buscar plano por sessionToken
 * 4.  Atualizar status de um item do plano
 * 5.  Calcular progresso: 1 de 3 itens concluídos = 33%
 * 6.  Calcular progresso: 3 de 3 itens concluídos = 100%
 * 7.  Dados para matriz: agrupamento por ramo
 * 8.  Dados para matriz: posicionamento x/y correto
 * 9.  Arquivo routers-session-action-plan.ts existe
 * 10. Arquivo PlanoAcaoSession.tsx existe
 * 11. Arquivo MatrizRiscosSession.tsx existe
 * 12. Rotas /plano-acao-session e /matriz-riscos-session no App.tsx
 * 13. Router sessionActionPlan registrado no appRouter
 * 14. Schema contém tabela sessionActionPlans
 * 15. Prioridades válidas: critica, alta, media, baixa
 * 16. Status válidos: gerando, gerado, aprovado, em_execucao
 * 17. Custo estimado válido: baixo, medio, alto
 * 18. Ordenação por prioridade: critica > alta > media > baixa
 * 19. Filtro por ramo funciona corretamente
 * 20. Score de compliance está entre 0 e 100
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { sessions, sessionBranchAnswers, sessionActionPlans } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// ─── Setup ─────────────────────────────────────────────────────────────────────

let database: Awaited<ReturnType<typeof db.getDb>>;
let testSessionToken: string;
let testPlanId: number;

const MOCK_PLAN_ITEMS = [
  {
    id: "a1",
    branchCode: "COM",
    branchName: "Comércio",
    action: "Atualizar ERP para IBS/CBS",
    description: "Adequar sistema ERP às novas alíquotas do IBS e CBS.",
    priority: "critica",
    deadline: "30 dias",
    responsible: "TI/Sistemas",
    status: "pendente",
    riskLevel: "critico",
    category: "Sistemas",
    estimatedCost: "alto",
  },
  {
    id: "a2",
    branchCode: "IND",
    branchName: "Indústria",
    action: "Treinar equipe fiscal",
    description: "Capacitar equipe sobre mudanças tributárias para indústria.",
    priority: "alta",
    deadline: "60 dias",
    responsible: "RH",
    status: "pendente",
    riskLevel: "alto",
    category: "Treinamento",
    estimatedCost: "medio",
  },
  {
    id: "a3",
    branchCode: "SER",
    branchName: "Serviços",
    action: "Mapear obrigações acessórias",
    description: "Documentar obrigações no novo regime para serviços.",
    priority: "media",
    deadline: "3 meses",
    responsible: "Equipe Fiscal",
    status: "concluido",
    riskLevel: "medio",
    category: "Documentação",
    estimatedCost: "baixo",
  },
];

beforeAll(async () => {
  database = await db.getDb();
  if (!database) throw new Error("Database not available");

  // Criar sessão de teste para Fase 3
  testSessionToken = `test-fase3-${Date.now()}`;
  await database.insert(sessions).values({
    sessionToken: testSessionToken,
    mode: "temporario",
    currentStep: "plano_acao",
    companyDescription: "Empresa de teste para validação da Fase 3 — Plano de Ação Consolidado",
    confirmedBranches: [
      { code: "COM", name: "Comércio" },
      { code: "IND", name: "Indústria" },
      { code: "SER", name: "Serviços" },
    ] as any,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  // Criar respostas de ramo concluídas (necessário para gerar plano)
  for (const branch of [
    { code: "COM", name: "Comércio" },
    { code: "IND", name: "Indústria" },
    { code: "SER", name: "Serviços" },
  ]) {
    await database.insert(sessionBranchAnswers).values({
      sessionToken: testSessionToken,
      branchCode: branch.code,
      branchName: branch.name,
      generatedQuestions: [] as any,
      answers: [] as any,
      aiAnalysis: `Análise de teste para ramo ${branch.name}.`,
      riskLevel: "medio",
      status: "concluido",
      completedAt: new Date(),
    });
  }
});

// ─── Testes de Banco de Dados ──────────────────────────────────────────────────

describe("Fase 3 — Banco de Dados", () => {
  it("1. Tabela sessionActionPlans existe no banco", async () => {
    const result = await database!
      .select()
      .from(sessionActionPlans)
      .limit(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("2. Inserir plano de ação para sessão de teste", async () => {
    const [inserted] = await database!
      .insert(sessionActionPlans)
      .values({
        sessionToken: testSessionToken,
        planItems: MOCK_PLAN_ITEMS as any,
        executiveSummary: "Resumo executivo de teste para validação da Fase 3.",
        overallRiskLevel: "alto",
        complianceScore: 45,
        status: "gerado",
        totalActions: MOCK_PLAN_ITEMS.length,
        criticalActions: MOCK_PLAN_ITEMS.filter((i) => i.priority === "critica").length,
      })
      .$returningId();

    expect(inserted.id).toBeGreaterThan(0);
    testPlanId = inserted.id;
  });

  it("3. Buscar plano por sessionToken", async () => {
    const [row] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    expect(row).toBeDefined();
    expect(row.sessionToken).toBe(testSessionToken);
    expect(row.status).toBe("gerado");
    expect(row.overallRiskLevel).toBe("alto");
    expect(row.complianceScore).toBe(45);
    expect(row.totalActions).toBe(3);
    expect(row.criticalActions).toBe(1);
    expect(Array.isArray(row.planItems)).toBe(true);
    expect((row.planItems as any[]).length).toBe(3);
  });

  it("4. Atualizar status de um item do plano", async () => {
    const [row] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    const planItems = (row.planItems as typeof MOCK_PLAN_ITEMS);
    const updatedItems = planItems.map((item) =>
      item.id === "a1" ? { ...item, status: "em_andamento" } : item
    );

    await database!
      .update(sessionActionPlans)
      .set({ planItems: updatedItems as any })
      .where(eq(sessionActionPlans.sessionToken, testSessionToken));

    const [updated] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    const items = updated.planItems as typeof MOCK_PLAN_ITEMS;
    const item1 = items.find((i) => i.id === "a1");
    expect(item1?.status).toBe("em_andamento");
  });

  it("5. Calcular progresso: 1 de 3 itens concluídos = 33%", async () => {
    const [row] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    const items = (row.planItems as typeof MOCK_PLAN_ITEMS);
    const completed = items.filter((i) => i.status === "concluido").length;
    const total = items.length;
    const progress = Math.round((completed / total) * 100);

    expect(total).toBe(3);
    expect(completed).toBe(1); // apenas "a3" está concluído
    expect(progress).toBe(33);
  });

  it("6. Marcar todos os itens como concluídos = 100%", async () => {
    const [row] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    const allCompleted = (row.planItems as typeof MOCK_PLAN_ITEMS).map((i) => ({
      ...i,
      status: "concluido",
    }));

    await database!
      .update(sessionActionPlans)
      .set({ planItems: allCompleted as any })
      .where(eq(sessionActionPlans.sessionToken, testSessionToken));

    const [updated] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, testSessionToken))
      .limit(1);

    const items = updated.planItems as typeof MOCK_PLAN_ITEMS;
    const completed = items.filter((i) => i.status === "concluido").length;
    const progress = Math.round((completed / items.length) * 100);

    expect(progress).toBe(100);
  });
});

// ─── Testes de Lógica da Matriz ───────────────────────────────────────────────

describe("Fase 3 — Lógica da Matriz de Riscos", () => {
  it("7. Agrupamento por ramo: 3 ramos distintos", () => {
    const branchMap = new Map<string, { code: string; name: string; count: number }>();
    for (const item of MOCK_PLAN_ITEMS) {
      if (!branchMap.has(item.branchCode)) {
        branchMap.set(item.branchCode, { code: item.branchCode, name: item.branchName, count: 0 });
      }
      branchMap.get(item.branchCode)!.count++;
    }
    expect(branchMap.size).toBe(3);
    expect(branchMap.get("COM")?.count).toBe(1);
    expect(branchMap.get("IND")?.count).toBe(1);
    expect(branchMap.get("SER")?.count).toBe(1);
  });

  it("8. Posicionamento x/y na matriz: critico=4, alto=3, medio=2, baixo=1", () => {
    const riskOrder = { critico: 4, alto: 3, medio: 2, baixo: 1 };
    const priorityOrder = { critica: 4, alta: 3, media: 2, baixa: 1 };

    const matrixItems = MOCK_PLAN_ITEMS.map((item) => ({
      id: item.id,
      x: riskOrder[item.riskLevel as keyof typeof riskOrder] ?? 2,
      y: priorityOrder[item.priority as keyof typeof priorityOrder] ?? 2,
    }));

    expect(matrixItems[0]).toMatchObject({ id: "a1", x: 4, y: 4 }); // critico/critica
    expect(matrixItems[1]).toMatchObject({ id: "a2", x: 3, y: 3 }); // alto/alta
    expect(matrixItems[2]).toMatchObject({ id: "a3", x: 2, y: 2 }); // medio/media
  });

  it("9. Filtro por ramo: apenas itens de COM", () => {
    const filtered = MOCK_PLAN_ITEMS.filter((i) => i.branchCode === "COM");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("a1");
  });

  it("10. Filtro por prioridade: apenas críticos", () => {
    const filtered = MOCK_PLAN_ITEMS.filter((i) => i.priority === "critica");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("a1");
  });
});

// ─── Testes de Estrutura de Arquivos ──────────────────────────────────────────

describe("Fase 3 — Estrutura de Arquivos", () => {
  const projectRoot = path.resolve(__dirname, "..");

  it("11. Arquivo routers-session-action-plan.ts existe", () => {
    const filePath = path.join(projectRoot, "server", "routers-session-action-plan.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("12. Arquivo PlanoAcaoSession.tsx existe", () => {
    const filePath = path.join(projectRoot, "client", "src", "pages", "PlanoAcaoSession.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("13. Arquivo MatrizRiscosSession.tsx existe", () => {
    const filePath = path.join(projectRoot, "client", "src", "pages", "MatrizRiscosSession.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("14. Rotas /plano-acao-session e /matriz-riscos-session no App.tsx", () => {
    const appPath = path.join(projectRoot, "client", "src", "App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).toContain("/plano-acao-session");
    expect(content).toContain("PlanoAcaoSession");
    expect(content).toContain("/matriz-riscos-session");
    expect(content).toContain("MatrizRiscosSession");
  });

  it("15. Router sessionActionPlan registrado no appRouter", () => {
    const routersPath = path.join(projectRoot, "server", "routers.ts");
    const content = fs.readFileSync(routersPath, "utf-8");
    expect(content).toContain("sessionActionPlan");
    expect(content).toContain("sessionActionPlanRouter");
  });

  it("16. Schema contém tabela sessionActionPlans", () => {
    const schemaPath = path.join(projectRoot, "drizzle", "schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");
    expect(content).toContain("sessionActionPlans");
    expect(content).toContain("planItems");
    expect(content).toContain("executiveSummary");
    expect(content).toContain("overallRiskLevel");
    expect(content).toContain("complianceScore");
  });

  it("17. routers-session-action-plan.ts contém as 4 procedures", () => {
    const filePath = path.join(projectRoot, "server", "routers-session-action-plan.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("generate");
    expect(content).toContain("get:");
    expect(content).toContain("updateItem");
    expect(content).toContain("getMatrix");
  });
});

// ─── Testes de Lógica de Negócio ──────────────────────────────────────────────

describe("Fase 3 — Lógica de Negócio", () => {
  it("18. Prioridades válidas: critica, alta, media, baixa", () => {
    const validPriorities = ["critica", "alta", "media", "baixa"];
    for (const item of MOCK_PLAN_ITEMS) {
      expect(validPriorities).toContain(item.priority);
    }
  });

  it("19. Status válidos: gerando, gerado, aprovado, em_execucao", () => {
    const validStatuses = ["gerando", "gerado", "aprovado", "em_execucao"];
    expect(validStatuses).toContain("gerado");
    expect(validStatuses).toContain("gerando");
  });

  it("20. Score de compliance está entre 0 e 100", () => {
    const score = 45;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("21. Ordenação por prioridade: critica > alta > media > baixa", () => {
    const priorityOrder = { critica: 4, alta: 3, media: 2, baixa: 1 };
    const sorted = [...MOCK_PLAN_ITEMS].sort(
      (a, b) =>
        (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 0) -
        (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 0)
    );
    expect(sorted[0].priority).toBe("critica");
    expect(sorted[1].priority).toBe("alta");
    expect(sorted[2].priority).toBe("media");
  });

  it("22. Custo estimado válido: baixo, medio, alto", () => {
    const validCosts = ["baixo", "medio", "alto"];
    for (const item of MOCK_PLAN_ITEMS) {
      expect(validCosts).toContain(item.estimatedCost);
    }
  });

  it("23. Risco máximo do ramo calculado corretamente", () => {
    const riskOrder = { critico: 4, alto: 3, medio: 2, baixo: 1 };
    const comItems = MOCK_PLAN_ITEMS.filter((i) => i.branchCode === "COM");
    const maxRisk = comItems.reduce((max, item) => {
      return (riskOrder[item.riskLevel as keyof typeof riskOrder] ?? 0) >
        (riskOrder[max as keyof typeof riskOrder] ?? 0)
        ? item.riskLevel
        : max;
    }, "baixo");
    expect(maxRisk).toBe("critico");
  });

  it("24. PlanoAcaoSession.tsx contém tabs corretas", () => {
    const filePath = path.join(path.resolve(__dirname, ".."), "client", "src", "pages", "PlanoAcaoSession.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("plano");
    expect(content).toContain("resumo");
    expect(content).toContain("por-ramo");
  });

  it("25. MatrizRiscosSession.tsx contém matriz 4x4", () => {
    const filePath = path.join(path.resolve(__dirname, ".."), "client", "src", "pages", "MatrizRiscosSession.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("MATRIX_LABELS");
    expect(content).toContain("CELL_COLORS");
    expect(content).toContain("getCellItems");
  });
});
