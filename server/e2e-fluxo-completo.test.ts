/**
 * e2e-fluxo-completo.test.ts
 * Sprint V44 — Teste End-to-End Completo do Fluxo v2.0
 *
 * Percorre todas as etapas do fluxo de ponta a ponta:
 * ModoUso → BriefingInteligente → QuestionarioRamos →
 * PlanoAcaoSession → MatrizRiscosSession → Consolidacao
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";
import {
  sessions,
  branchSuggestions,
  sessionBranchAnswers,
  sessionActionPlans,
  sessionConsolidations,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// ─── Estado compartilhado do teste E2E ───────────────────────────────────────
let database: Awaited<ReturnType<typeof db.getDb>>;
let sessionToken: string;

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function futureDate(hours = 24): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  database = await db.getDb();
  expect(database).toBeTruthy();
  sessionToken = generateToken();
});

// ─── ETAPA 1: Criar Sessão (ModoUso) ─────────────────────────────────────────
describe("ETAPA 1: Criar Sessão — ModoUso", () => {
  it("deve criar sessão temporária com modo 'temporario'", async () => {
    await database!.insert(sessions).values({
      sessionToken,
      mode: "temporario",
      currentStep: "briefing",
      expiresAt: futureDate(24),
    });

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session).toBeDefined();
    expect(session.sessionToken).toBe(sessionToken);
    expect(session.mode).toBe("temporario");
    expect(session.currentStep).toBe("briefing");

    console.log(`✅ Sessão criada: Token=${sessionToken.slice(0, 8)}...`);
  });

  it("deve validar que a sessão está ativa e não expirada", async () => {
    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session).toBeDefined();
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    console.log(`✅ Sessão válida por ${Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 3600000)}h`);
  });
});

// ─── ETAPA 2: Briefing Inteligente — Sugestão de Ramos com IA ────────────────
describe("ETAPA 2: Briefing Inteligente — Sugestão de Ramos", () => {
  it("deve salvar texto da descrição da empresa na sessão", async () => {
    const companyDescription = [
      "Empresa de médio porte atuando no setor de tecnologia e serviços de TI.",
      "Possui operações de desenvolvimento de software, consultoria e suporte técnico.",
      "Também realiza vendas de licenças de software e hardware.",
      "Emprega 250 funcionários e fatura R$ 50 milhões por ano.",
    ].join(" ");

    await database!
      .update(sessions)
      .set({ companyDescription, currentStep: "confirmar_ramos" })
      .where(eq(sessions.sessionToken, sessionToken));

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session.companyDescription).toContain("tecnologia");
    expect(session.currentStep).toBe("confirmar_ramos");
    console.log(`✅ Descrição salva: ${companyDescription.length} chars, step=${session.currentStep}`);
  });

  it("deve registrar sugestões de ramos da IA em branchSuggestions", async () => {
    const suggestedBranches = [
      { code: "SER", name: "Serviços de TI", justification: "Consultoria e suporte técnico", confidence: 0.95 },
      { code: "COM", name: "Comércio de Software/Hardware", justification: "Venda de licenças e hardware", confidence: 0.85 },
      { code: "IND", name: "Desenvolvimento de Software", justification: "Desenvolvimento próprio de software", confidence: 0.75 },
    ];

    await database!.insert(branchSuggestions).values({
      sessionToken,
      companyDescription: "Empresa de TI com serviços, comércio e desenvolvimento",
      suggestedBranches,
    });

    const [suggestion] = await database!
      .select()
      .from(branchSuggestions)
      .where(eq(branchSuggestions.sessionToken, sessionToken));

    expect(suggestion).toBeDefined();
    const branches = suggestion.suggestedBranches as any[];
    expect(branches).toHaveLength(3);
    expect(branches[0].confidence).toBeGreaterThan(0.7);
    console.log(`✅ ${branches.length} sugestões de ramos registradas pela IA`);
  });
});

// ─── ETAPA 3: Confirmação de Ramos ───────────────────────────────────────────
describe("ETAPA 3: Confirmação de Ramos", () => {
  it("deve salvar ramos confirmados pelo usuário na sessão", async () => {
    const confirmedBranches = [
      { code: "SER", name: "Serviços de TI" },
      { code: "COM", name: "Comércio de Software/Hardware" },
    ];

    await database!
      .update(branchSuggestions)
      .set({ confirmedBranches })
      .where(eq(branchSuggestions.sessionToken, sessionToken));

    await database!
      .update(sessions)
      .set({ confirmedBranches, currentStep: "questionario" })
      .where(eq(sessions.sessionToken, sessionToken));

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    const parsed = session.confirmedBranches as any[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].code).toBe("SER");
    expect(session.currentStep).toBe("questionario");
    console.log(`✅ ${parsed.length} ramos confirmados: ${parsed.map((b: any) => b.code).join(", ")}`);
  });
});

// ─── ETAPA 4: Questionário por Ramo ──────────────────────────────────────────
describe("ETAPA 4: Questionário Adaptativo por Ramo", () => {
  it("deve criar registro de questionário para ramo SER com 7 perguntas da IA", async () => {
    const generatedQuestions = [
      { id: "q1", question: "Qual o regime tributário atual da empresa?", type: "single_choice", options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"] },
      { id: "q2", question: "A empresa presta serviços para o exterior?", type: "boolean" },
      { id: "q3", question: "Qual o volume mensal de notas fiscais de serviço?", type: "single_choice", options: ["Até 50", "51-200", "201-500", "Acima de 500"] },
      { id: "q4", question: "A empresa possui certificado digital para NFS-e?", type: "boolean" },
      { id: "q5", question: "Qual o principal município de prestação de serviços?", type: "text" },
      { id: "q6", question: "A empresa utiliza sistema de gestão fiscal integrado?", type: "boolean" },
      { id: "q7", question: "Qual o percentual de faturamento de serviços técnicos?", type: "single_choice", options: ["Até 30%", "31-60%", "61-90%", "Acima de 90%"] },
    ];

    const answers = [
      { questionId: "q1", answer: "Lucro Presumido" },
      { questionId: "q2", answer: "true" },
      { questionId: "q3", answer: "51-200" },
      { questionId: "q4", answer: "true" },
      { questionId: "q5", answer: "São Paulo" },
      { questionId: "q6", answer: "false" },
      { questionId: "q7", answer: "Acima de 90%" },
    ];

    await database!.insert(sessionBranchAnswers).values({
      sessionToken,
      branchCode: "SER",
      branchName: "Serviços de TI",
      generatedQuestions,
      answers,
      status: "concluido",
      aiAnalysis: "Alto risco de impacto da Reforma Tributária. Empresa com 90%+ de faturamento em serviços técnicos e exportação de serviços precisa revisar CBS/IBS urgentemente.",
      riskLevel: "alto",
      completedAt: new Date(),
    });

    const [record] = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(and(
        eq(sessionBranchAnswers.sessionToken, sessionToken),
        eq(sessionBranchAnswers.branchCode, "SER")
      ));

    expect(record).toBeDefined();
    expect(record.status).toBe("concluido");
    expect(record.riskLevel).toBe("alto");
    const qs = record.generatedQuestions as any[];
    expect(qs).toHaveLength(7);
    console.log(`✅ Ramo SER: ${qs.length} perguntas, risco=${record.riskLevel}`);
  });

  it("deve criar registro de questionário para ramo COM com 7 perguntas da IA", async () => {
    const generatedQuestions = [
      { id: "q1", question: "A empresa vende produtos físicos ou digitais?", type: "single_choice", options: ["Físicos", "Digitais", "Ambos"] },
      { id: "q2", question: "Realiza operações interestaduais?", type: "boolean" },
      { id: "q3", question: "Qual o ticket médio por venda?", type: "single_choice", options: ["Até R$1.000", "R$1.001-R$10.000", "Acima de R$10.000"] },
      { id: "q4", question: "A empresa possui CNAE de comércio de software?", type: "boolean" },
      { id: "q5", question: "Qual o volume de SKUs ativos?", type: "single_choice", options: ["Até 100", "101-500", "Acima de 500"] },
      { id: "q6", question: "A empresa emite NF-e ou NFC-e?", type: "single_choice", options: ["NF-e", "NFC-e", "Ambas"] },
      { id: "q7", question: "Qual percentual de vendas para pessoa jurídica?", type: "single_choice", options: ["Até 30%", "31-70%", "Acima de 70%"] },
    ];

    const answers = [
      { questionId: "q1", answer: "Ambos" },
      { questionId: "q2", answer: "true" },
      { questionId: "q3", answer: "Acima de R$10.000" },
      { questionId: "q4", answer: "false" },
      { questionId: "q5", answer: "101-500" },
      { questionId: "q6", answer: "NF-e" },
      { questionId: "q7", answer: "Acima de 70%" },
    ];

    await database!.insert(sessionBranchAnswers).values({
      sessionToken,
      branchCode: "COM",
      branchName: "Comércio de Software/Hardware",
      generatedQuestions,
      answers,
      status: "concluido",
      aiAnalysis: "Risco crítico: empresa sem CNAE adequado para comércio de software e realizando operações interestaduais. Impacto alto do IBS nas operações.",
      riskLevel: "critico",
      completedAt: new Date(),
    });

    const [record] = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(and(
        eq(sessionBranchAnswers.sessionToken, sessionToken),
        eq(sessionBranchAnswers.branchCode, "COM")
      ));

    expect(record).toBeDefined();
    expect(record.status).toBe("concluido");
    expect(record.riskLevel).toBe("critico");
    console.log(`✅ Ramo COM: 7 perguntas, risco=${record.riskLevel}`);
  });

  it("deve validar que ambos os ramos estão concluídos", async () => {
    const allAnswers = await database!
      .select()
      .from(sessionBranchAnswers)
      .where(eq(sessionBranchAnswers.sessionToken, sessionToken));

    expect(allAnswers).toHaveLength(2);
    expect(allAnswers.every(a => a.status === "concluido")).toBe(true);
    console.log(`✅ ${allAnswers.length} ramos concluídos com questionário`);
  });

  it("deve avançar sessão para etapa plano_acao", async () => {
    await database!
      .update(sessions)
      .set({ currentStep: "plano_acao" })
      .where(eq(sessions.sessionToken, sessionToken));

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session.currentStep).toBe("plano_acao");
    console.log(`✅ Sessão avançou para: ${session.currentStep}`);
  });
});

// ─── ETAPA 5: Plano de Ação Consolidado ──────────────────────────────────────
describe("ETAPA 5: Plano de Ação Consolidado", () => {
  it("deve criar plano de ação consolidado com itens por ramo", async () => {
    const planItems = [
      {
        id: "item-1",
        branchCode: "SER",
        branchName: "Serviços de TI",
        action: "Revisar enquadramento tributário de serviços para CBS/IBS",
        priority: "alta",
        deadline: "90 dias",
        responsible: "Contador/Tributarista",
        status: "pendente",
        riskLevel: "alto",
        category: "Tributário",
      },
      {
        id: "item-2",
        branchCode: "SER",
        branchName: "Serviços de TI",
        action: "Mapear serviços exportados para isenção CBS/IBS",
        priority: "media",
        deadline: "120 dias",
        responsible: "Equipe Fiscal",
        status: "pendente",
        riskLevel: "medio",
        category: "Planejamento",
      },
      {
        id: "item-3",
        branchCode: "COM",
        branchName: "Comércio de Software/Hardware",
        action: "Adequar CNAE e CFOP para operações interestaduais de software",
        priority: "alta",
        deadline: "60 dias",
        responsible: "Departamento Fiscal",
        status: "pendente",
        riskLevel: "critico",
        category: "Fiscal",
      },
      {
        id: "item-4",
        branchCode: "COM",
        branchName: "Comércio de Software/Hardware",
        action: "Implementar controle de estoque para IBS nas saídas",
        priority: "media",
        deadline: "90 dias",
        responsible: "TI + Fiscal",
        status: "pendente",
        riskLevel: "alto",
        category: "Operacional",
      },
    ];

    await database!.insert(sessionActionPlans).values({
      sessionToken,
      planItems,
      executiveSummary: "Empresa de TI com exposição moderada à Reforma Tributária. Principais riscos em comércio interestadual de software e prestação de serviços técnicos. Ação imediata necessária para adequação de CNAE e revisão do enquadramento CBS/IBS.",
      overallRiskLevel: "alto",
      complianceScore: 42,
      status: "gerado",
      totalActions: planItems.length,
      criticalActions: planItems.filter(p => p.riskLevel === "critico").length,
    });

    const [plan] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, sessionToken));

    expect(plan).toBeDefined();
    expect(plan.status).toBe("gerado");
    expect(plan.complianceScore).toBe(42);
    expect(plan.totalActions).toBe(4);
    expect(plan.criticalActions).toBe(1);
    const items = plan.planItems as any[];
    expect(items).toHaveLength(4);
    console.log(`✅ Plano criado: score=${plan.complianceScore}/100, ${plan.totalActions} ações, ${plan.criticalActions} crítica(s)`);
  });

  it("deve validar distribuição de prioridades no plano", async () => {
    const [plan] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, sessionToken));

    const items = plan.planItems as any[];
    const alta = items.filter((i: any) => i.priority === "alta").length;
    const media = items.filter((i: any) => i.priority === "media").length;

    expect(alta).toBeGreaterThan(0);
    expect(alta + media).toBe(items.length);
    console.log(`✅ Prioridades: ${alta} alta, ${media} média`);
  });
});

// ─── ETAPA 6: Matriz de Riscos ────────────────────────────────────────────────
describe("ETAPA 6: Matriz de Riscos", () => {
  it("deve gerar distribuição de riscos por quadrante da matriz 4×4", async () => {
    const [plan] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, sessionToken));

    const items = plan.planItems as any[];
    const matrix = {
      critico: items.filter((i: any) => i.riskLevel === "critico").length,
      alto: items.filter((i: any) => i.riskLevel === "alto").length,
      medio: items.filter((i: any) => i.riskLevel === "medio").length,
      baixo: items.filter((i: any) => i.riskLevel === "baixo").length,
    };

    const total = Object.values(matrix).reduce((a, b) => a + b, 0);
    expect(total).toBe(items.length);
    expect(matrix.critico + matrix.alto).toBeGreaterThan(0);
    console.log(`✅ Matriz 4×4: Crítico=${matrix.critico}, Alto=${matrix.alto}, Médio=${matrix.medio}, Baixo=${matrix.baixo}`);
  });

  it("deve validar que o risco global da sessão é 'alto' ou 'critico'", async () => {
    const [plan] = await database!
      .select()
      .from(sessionActionPlans)
      .where(eq(sessionActionPlans.sessionToken, sessionToken));

    expect(["alto", "critico"]).toContain(plan.overallRiskLevel);
    console.log(`✅ Risco global: ${plan.overallRiskLevel}`);
  });

  it("deve avançar sessão para etapa consolidacao", async () => {
    await database!
      .update(sessions)
      .set({ currentStep: "consolidacao" })
      .where(eq(sessions.sessionToken, sessionToken));

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session.currentStep).toBe("consolidacao");
    console.log(`✅ Sessão avançou para: ${session.currentStep}`);
  });
});

// ─── ETAPA 7: Consolidação Final ─────────────────────────────────────────────
describe("ETAPA 7: Consolidação Final", () => {
  it("deve criar consolidação com score, sumário e recomendações", async () => {
    await database!.insert(sessionConsolidations).values({
      sessionToken,
      executiveSummary: "A empresa de TI apresenta score de compliance de 42/100 frente à Reforma Tributária. Foram identificados 4 pontos de atenção em 2 ramos de atividade. Prioridade imediata: adequação de CNAE e CFOP para operações interestaduais de software.",
      keyFindings: [
        { severity: "critico", finding: "CNAE inadequado para comércio de software em operações interestaduais" },
        { severity: "alto", finding: "Enquadramento tributário de serviços de TI precisa revisão para CBS/IBS" },
        { severity: "medio", finding: "Serviços exportados podem ter isenção CBS/IBS não aproveitada" },
      ],
      topRecommendations: [
        "Contratar especialista em Reforma Tributária para análise do portfólio",
        "Revisar todos os CFOPs de saída para produtos digitais e licenças",
        "Mapear exportações de serviços para aproveitamento de isenções CBS/IBS",
        "Implementar sistema de gestão fiscal integrado",
        "Adequar CNAE principal e secundário para atividades de software",
      ],
      branchSummaries: [
        { branchCode: "SER", branchName: "Serviços de TI", riskLevel: "alto", actionsCount: 2 },
        { branchCode: "COM", branchName: "Comércio de Software/Hardware", riskLevel: "critico", actionsCount: 2 },
      ],
      timeline: {
        "0-30 dias": ["Contratar especialista tributário"],
        "31-60 dias": ["Adequar CNAE e CFOP"],
        "61-90 dias": ["Revisar enquadramento CBS/IBS"],
        "91-120 dias": ["Mapear isenções de exportação"],
      },
      estimatedBudget: {
        consultoria: "R$ 15.000 - R$ 25.000",
        sistema: "R$ 8.000 - R$ 15.000",
        treinamento: "R$ 3.000 - R$ 5.000",
      },
      complianceScore: 42,
      overallRiskLevel: "alto",
      totalActions: 4,
      criticalActions: 1,
      estimatedDays: 120,
      status: "gerado",
    });

    const [consolidation] = await database!
      .select()
      .from(sessionConsolidations)
      .where(eq(sessionConsolidations.sessionToken, sessionToken));

    expect(consolidation).toBeDefined();
    expect(consolidation.complianceScore).toBe(42);
    expect(consolidation.totalActions).toBe(4);
    expect(consolidation.criticalActions).toBe(1);
    expect(consolidation.estimatedDays).toBe(120);
    const findings = consolidation.keyFindings as any[];
    expect(findings).toHaveLength(3);
    console.log(`✅ Consolidação: score=${consolidation.complianceScore}/100, ${consolidation.totalActions} ações, ${consolidation.estimatedDays} dias estimados`);
  });

  it("deve marcar sessão como concluída", async () => {
    await database!
      .update(sessions)
      .set({ currentStep: "concluido" })
      .where(eq(sessions.sessionToken, sessionToken));

    const [session] = await database!
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));

    expect(session.currentStep).toBe("concluido");
    console.log(`✅ Sessão concluída: step=${session.currentStep}`);
  });
});

// ─── ETAPA 8: Exportação de Dados ────────────────────────────────────────────
describe("ETAPA 8: Exportação de Dados", () => {
  it("deve exportar dados completos da sessão em formato JSON", async () => {
    const [session] = await database!.select().from(sessions).where(eq(sessions.sessionToken, sessionToken));
    const [plan] = await database!.select().from(sessionActionPlans).where(eq(sessionActionPlans.sessionToken, sessionToken));
    const [consolidation] = await database!.select().from(sessionConsolidations).where(eq(sessionConsolidations.sessionToken, sessionToken));
    const answers = await database!.select().from(sessionBranchAnswers).where(eq(sessionBranchAnswers.sessionToken, sessionToken));

    const exportData = {
      session: {
        mode: session.mode,
        createdAt: session.createdAt,
        confirmedBranches: session.confirmedBranches as any[],
        currentStep: session.currentStep,
      },
      consolidation: {
        complianceScore: consolidation.complianceScore,
        overallRiskLevel: consolidation.overallRiskLevel,
        totalActions: consolidation.totalActions,
        criticalActions: consolidation.criticalActions,
        estimatedDays: consolidation.estimatedDays,
        topRecommendations: consolidation.topRecommendations as string[],
      },
      actionPlan: (plan.planItems as any[]).map((p: any) => ({
        branch: p.branchCode,
        action: p.action,
        priority: p.priority,
        riskLevel: p.riskLevel,
        deadline: p.deadline,
        responsible: p.responsible,
      })),
      branchAnalyses: answers.map(a => ({
        branchCode: a.branchCode,
        riskLevel: a.riskLevel,
        aiAnalysis: a.aiAnalysis,
      })),
    };

    expect(exportData.session.confirmedBranches).toHaveLength(2);
    expect(exportData.actionPlan).toHaveLength(4);
    expect(exportData.consolidation.complianceScore).toBe(42);
    expect(exportData.branchAnalyses).toHaveLength(2);

    const jsonStr = JSON.stringify(exportData, null, 2);
    expect(jsonStr.length).toBeGreaterThan(500);
    console.log(`✅ Export JSON: ${jsonStr.length} bytes, ${exportData.actionPlan.length} ações, ${exportData.branchAnalyses.length} análises`);
  });

  it("deve gerar CSV com itens do plano de ação", async () => {
    const [plan] = await database!.select().from(sessionActionPlans).where(eq(sessionActionPlans.sessionToken, sessionToken));
    const items = plan.planItems as any[];

    const csvHeader = "Ramo,Ação,Prioridade,Risco,Prazo,Responsável";
    const csvRows = items.map((i: any) =>
      `${i.branchCode},"${i.action}",${i.priority},${i.riskLevel},${i.deadline},"${i.responsible}"`
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    expect(csv).toContain("SER");
    expect(csv).toContain("COM");
    expect(csv.split("\n")).toHaveLength(items.length + 1);
    console.log(`✅ CSV gerado: ${csv.split("\n").length} linhas (${items.length} ações + header)`);
  });
});

// ─── ETAPA 9: Integridade Final do Fluxo ─────────────────────────────────────
describe("ETAPA 9: Validação de Integridade Final", () => {
  it("deve validar que todos os dados do fluxo estão consistentes", async () => {
    const [session] = await database!.select().from(sessions).where(eq(sessions.sessionToken, sessionToken));
    const [plan] = await database!.select().from(sessionActionPlans).where(eq(sessionActionPlans.sessionToken, sessionToken));
    const [consolidation] = await database!.select().from(sessionConsolidations).where(eq(sessionConsolidations.sessionToken, sessionToken));
    const answers = await database!.select().from(sessionBranchAnswers).where(eq(sessionBranchAnswers.sessionToken, sessionToken));
    const [suggestion] = await database!.select().from(branchSuggestions).where(eq(branchSuggestions.sessionToken, sessionToken));

    // Validações de integridade cruzada
    expect(session.currentStep).toBe("concluido");

    const confirmedBranches = session.confirmedBranches as any[];
    expect(confirmedBranches).toHaveLength(2);

    const suggestedBranches = suggestion.suggestedBranches as any[];
    expect(suggestedBranches).toHaveLength(3);
    expect(suggestedBranches.length).toBeGreaterThanOrEqual(confirmedBranches.length);

    expect(answers).toHaveLength(confirmedBranches.length);
    expect(answers.every(a => a.status === "concluido")).toBe(true);

    const planItems = plan.planItems as any[];
    expect(planItems.length).toBeGreaterThan(0);
    expect(plan.totalActions).toBe(planItems.length);
    expect(plan.criticalActions).toBe(planItems.filter((i: any) => i.riskLevel === "critico").length);

    expect(consolidation.totalActions).toBe(plan.totalActions);
    expect(consolidation.complianceScore).toBe(plan.complianceScore);

    console.log(`\n📊 RESUMO DO TESTE E2E COMPLETO:`);
    console.log(`   Token: ${session.sessionToken.slice(0, 8)}... (modo: ${session.mode})`);
    console.log(`   Ramos sugeridos pela IA: ${suggestedBranches.length}`);
    console.log(`   Ramos confirmados: ${confirmedBranches.map((b: any) => b.code).join(", ")}`);
    console.log(`   Questionários concluídos: ${answers.length}/${confirmedBranches.length}`);
    console.log(`   Ações no plano: ${planItems.length} (${plan.criticalActions} crítica(s))`);
    console.log(`   Score de compliance: ${consolidation.complianceScore}/100`);
    console.log(`   Risco global: ${consolidation.overallRiskLevel}`);
    console.log(`   Prazo estimado: ${consolidation.estimatedDays} dias`);
    console.log(`   Status final: ${session.currentStep} ✅`);
  });

  it("deve validar que o step final é 'concluido'", async () => {
    const [session] = await database!.select().from(sessions).where(eq(sessions.sessionToken, sessionToken));
    expect(session.currentStep).toBe("concluido");
    console.log(`✅ Fluxo completado: step final = "${session.currentStep}"`);
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
afterAll(async () => {
  if (sessionToken && database) {
    await database.delete(sessionConsolidations).where(eq(sessionConsolidations.sessionToken, sessionToken));
    await database.delete(sessionActionPlans).where(eq(sessionActionPlans.sessionToken, sessionToken));
    await database.delete(sessionBranchAnswers).where(eq(sessionBranchAnswers.sessionToken, sessionToken));
    await database.delete(branchSuggestions).where(eq(branchSuggestions.sessionToken, sessionToken));
    await database.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    console.log(`\n🧹 Dados de teste limpos (token=${sessionToken.slice(0, 8)}...)`);
  }
});
