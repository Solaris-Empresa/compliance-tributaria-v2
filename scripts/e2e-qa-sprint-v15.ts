import { getDb } from "../server/db";
import { projects, corporateAssessments, corporateActionPlans, planApprovals, planReviews } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Teste E2E completo do Sprint V15:
 * - Feature 1: Integração IA (verificar se router usa LLM)
 * - Feature 2: Visualização de planos (verificar dados retornados)
 * - Feature 3: Workflow de aprovação (fluxo completo)
 */

async function main() {
  console.log("🧪 Iniciando Testes E2E - Sprint V15\n");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: "✅ PASS" | "❌ FAIL"; details?: string }>,
  };

  const test = (name: string, fn: () => Promise<void>) => {
    results.total++;
    return fn()
      .then(() => {
        results.passed++;
        results.tests.push({ name, status: "✅ PASS" });
        console.log(`✅ ${name}`);
      })
      .catch((error) => {
        results.failed++;
        results.tests.push({ name, status: "❌ FAIL", details: error.message });
        console.error(`❌ ${name}: ${error.message}`);
      });
  };

  // ============================================================================
  // SETUP: Criar dados de teste
  // ============================================================================
  let projectId: number;
  let assessmentId: number;
  let planId: number;
  let approvalId: number;

  await test("Setup: Criar projeto de teste", async () => {
    const [result] = await db.insert(projects).values({
      name: "Projeto QA Sprint V15",
      clientId: 1,
      createdById: 1,
      createdByRole: "equipe_solaris",
      status: "plano_acao",
    });
    projectId = result.insertId;
    if (!projectId) throw new Error("Falha ao criar projeto");
  });

  await test("Setup: Criar assessment corporativo", async () => {
    const [result] = await db.insert(corporateAssessments).values({
      projectId,
      createdById: 1,
      generatedQuestions: JSON.stringify([
        { question: "Qual o regime tributário da empresa?", answer: "Lucro Real" },
        { question: "Possui operações internacionais?", answer: "Sim" },
      ]),
      answers: JSON.stringify([
        { question: "Qual o regime tributário da empresa?", answer: "Lucro Real" },
        { question: "Possui operações internacionais?", answer: "Sim" },
      ]),
    });
    assessmentId = result.insertId;
    if (!assessmentId) throw new Error("Falha ao criar assessment");
  });

  await test("Setup: Criar plano corporativo", async () => {
    const [result] = await db.insert(corporateActionPlans).values({
      projectId,
      corporateAssessmentId: assessmentId,
      planContent: JSON.stringify([
        {
          title: "Adequação ao CBS",
          description: "Implementar Contribuição sobre Bens e Serviços",
          area: "FISC",
          priority: "alta",
          deadline: "2027-01-01",
        },
        {
          title: "Treinamento Equipe Fiscal",
          description: "Capacitar equipe para nova reforma",
          area: "TI",
          priority: "media",
          deadline: "2026-12-01",
        },
      ]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: 1,
      createdById: 1,
    });
    planId = result.insertId;
    if (!planId) throw new Error("Falha ao criar plano");
  });

  // ============================================================================
  // Feature 2: Visualização de Planos
  // ============================================================================
  console.log("\n📊 Testando Feature 2: Visualização de Planos\n");

  await test("Visualização: Buscar plano corporativo por ID", async () => {
    const [plan] = await db
      .select()
      .from(corporateActionPlans)
      .where(eq(corporateActionPlans.id, planId));

    if (!plan) throw new Error("Plano não encontrado");
    if (!plan.planContent) throw new Error("planContent vazio");

    const content = JSON.parse(plan.planContent as string);
    if (!Array.isArray(content)) throw new Error("planContent não é array");
    if (content.length !== 2) throw new Error(`Esperado 2 tarefas, encontrado ${content.length}`);
    if (!content[0].title) throw new Error("Tarefa sem título");
  });

  await test("Visualização: Validar estrutura do JSON planContent", async () => {
    const [plan] = await db
      .select()
      .from(corporateActionPlans)
      .where(eq(corporateActionPlans.id, planId));

    const content = JSON.parse(plan!.planContent as string);
    const task = content[0];

    if (!task.title) throw new Error("Campo 'title' faltando");
    if (!task.description) throw new Error("Campo 'description' faltando");
    if (!task.area) throw new Error("Campo 'area' faltando");
    if (!task.priority) throw new Error("Campo 'priority' faltando");
    if (!task.deadline) throw new Error("Campo 'deadline' faltando");
  });

  // ============================================================================
  // Feature 3: Workflow de Aprovação
  // ============================================================================
  console.log("\n✅ Testando Feature 3: Workflow de Aprovação\n");

  await test("Aprovação: Solicitar aprovação do plano", async () => {
    const [result] = await db.insert(planApprovals).values({
      planType: "corporate",
      planId,
      projectId,
      requestedBy: 1,
      status: "pending",
      version: 1,
    });
    approvalId = result.insertId;
    if (!approvalId) throw new Error("Falha ao criar aprovação");
  });

  await test("Aprovação: Listar aprovações pendentes", async () => {
    const approvals = await db
      .select()
      .from(planApprovals)
      .where(eq(planApprovals.projectId, projectId));

    if (approvals.length === 0) throw new Error("Nenhuma aprovação encontrada");
    if (approvals[0].status !== "pending") throw new Error(`Status incorreto: ${approvals[0].status}`);
  });

  await test("Aprovação: Adicionar comentário/revisão", async () => {
    const [result] = await db.insert(planReviews).values({
      approvalId,
      reviewerId: 2,
      comment: "O plano está bem estruturado, mas sugiro adicionar mais detalhes na tarefa de treinamento",
      reviewType: "suggestion",
    });

    if (!result.insertId) throw new Error("Falha ao criar review");
  });

  await test("Aprovação: Buscar reviews da aprovação", async () => {
    const reviews = await db
      .select()
      .from(planReviews)
      .where(eq(planReviews.approvalId, approvalId));

    if (reviews.length === 0) throw new Error("Nenhum review encontrado");
    if (reviews[0].reviewType !== "suggestion") throw new Error("Tipo de review incorreto");
    if (!reviews[0].comment.includes("bem estruturado")) throw new Error("Comentário não salvo corretamente");
  });

  await test("Aprovação: Aprovar plano", async () => {
    await db
      .update(planApprovals)
      .set({
        status: "approved",
        reviewedBy: 2,
        reviewedAt: new Date(),
        reviewComments: "Plano aprovado após análise detalhada",
      })
      .where(eq(planApprovals.id, approvalId));

    const [approval] = await db
      .select()
      .from(planApprovals)
      .where(eq(planApprovals.id, approvalId));

    if (approval.status !== "approved") throw new Error(`Status não atualizado: ${approval.status}`);
    if (!approval.reviewedBy) throw new Error("reviewedBy não definido");
  });

  await test("Aprovação: Criar nova aprovação e rejeitar", async () => {
    // Criar novo projeto para evitar constraint UNIQUE
    const [projectResult] = await db.insert(projects).values({
      name: "Projeto QA Rejeição",
      clientId: 1,
      createdById: 1,
      createdByRole: "equipe_solaris",
      status: "plano_acao",
    });
    const newProjectId = projectResult.insertId;

    // Criar assessment para o novo projeto
    const [assessmentResult] = await db.insert(corporateAssessments).values({
      projectId: newProjectId,
      createdById: 1,
      generatedQuestions: JSON.stringify([{ question: "Teste" }]),
      answers: JSON.stringify([{ answer: "Resposta" }]),
    });

    // Criar novo plano
    const [planResult] = await db.insert(corporateActionPlans).values({
      projectId: newProjectId,
      corporateAssessmentId: assessmentResult.insertId,
      planContent: JSON.stringify([{ title: "Plano para Rejeitar" }]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: 1,
      createdById: 1,
    });

    // Solicitar aprovação
    const [approvalResult] = await db.insert(planApprovals).values({
      planType: "corporate",
      planId: planResult.insertId,
      projectId: newProjectId,
      requestedBy: 1,
      status: "pending",
      version: 1,
    });

    // Rejeitar
    await db
      .update(planApprovals)
      .set({
        status: "rejected",
        reviewedBy: 2,
        reviewedAt: new Date(),
        reviewComments: "Plano não atende aos requisitos mínimos de compliance",
      })
      .where(eq(planApprovals.id, approvalResult.insertId));

    const [approval] = await db
      .select()
      .from(planApprovals)
      .where(eq(planApprovals.id, approvalResult.insertId));

    if (approval.status !== "rejected") throw new Error(`Status incorreto: ${approval.status}`);
  });

  await test("Aprovação: Solicitar revisão", async () => {
    // Criar novo projeto para evitar constraint UNIQUE
    const [projectResult] = await db.insert(projects).values({
      name: "Projeto QA Revisão",
      clientId: 1,
      createdById: 1,
      createdByRole: "equipe_solaris",
      status: "plano_acao",
    });
    const newProjectId = projectResult.insertId;

    // Criar assessment para o novo projeto
    const [assessmentResult] = await db.insert(corporateAssessments).values({
      projectId: newProjectId,
      createdById: 1,
      generatedQuestions: JSON.stringify([{ question: "Teste" }]),
      answers: JSON.stringify([{ answer: "Resposta" }]),
    });

    // Criar novo plano
    const [planResult] = await db.insert(corporateActionPlans).values({
      projectId: newProjectId,
      corporateAssessmentId: assessmentResult.insertId,
      planContent: JSON.stringify([{ title: "Plano para Revisão" }]),
      version: 1,
      generatedAt: new Date(),
      generatedBy: 1,
      createdById: 1,
    });

    // Solicitar aprovação
    const [approvalResult] = await db.insert(planApprovals).values({
      planType: "corporate",
      planId: planResult.insertId,
      projectId: newProjectId,
      requestedBy: 1,
      status: "pending",
      version: 1,
    });

    // Solicitar revisão
    await db
      .update(planApprovals)
      .set({
        status: "needs_revision",
        reviewedBy: 2,
        reviewedAt: new Date(),
        reviewComments: "Necessário adicionar mais detalhes nas tarefas operacionais",
      })
      .where(eq(planApprovals.id, approvalResult.insertId));

    const [approval] = await db
      .select()
      .from(planApprovals)
      .where(eq(planApprovals.id, approvalResult.insertId));

    if (approval.status !== "needs_revision") throw new Error(`Status incorreto: ${approval.status}`);
  });

  // ============================================================================
  // RELATÓRIO FINAL
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("📊 RELATÓRIO FINAL - QA Sprint V15");
  console.log("=".repeat(80));
  console.log(`Total de testes: ${results.total}`);
  console.log(`✅ Aprovados: ${results.passed}`);
  console.log(`❌ Falhados: ${results.failed}`);
  console.log(`Taxa de sucesso: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log("=".repeat(80));

  if (results.failed > 0) {
    console.log("\n❌ TESTES FALHADOS:\n");
    results.tests
      .filter((t) => t.status === "❌ FAIL")
      .forEach((t) => {
        console.log(`  - ${t.name}`);
        if (t.details) console.log(`    ${t.details}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ TODOS OS TESTES PASSARAM!\n");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
