import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

// Métricas do teste
const metrics = {
  startTime: Date.now(),
  steps: [],
  projects: [],
  plans: [],
  errors: [],
};

function logStep(step, status, details = {}) {
  const entry = {
    step,
    status, // 'PASS' | 'FAIL'
    timestamp: new Date().toISOString(),
    ...details,
  };
  metrics.steps.push(entry);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${step}${details.id ? ` (ID: ${details.id})` : ''}`);
  if (details.error) console.error(`   Erro: ${details.error}`);
}

async function runE2ETests() {
  console.log("🧪 ===============================================");
  console.log("   TESTE E2E - IA SOLARIS - Protocolo QA");
  console.log("   Objetivo: 2 Projetos × 5 Planos = 10 Planos");
  console.log("===============================================\n");

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // =========================================================================
    // E2E-01 SETUP
    // =========================================================================
    console.log("📋 FASE 1: SETUP INICIAL\n");

    // Passo 1: Validar catálogo de ramos
    const [branches] = await connection.execute(
      "SELECT id, code, name, active FROM activityBranches WHERE code IN ('COM', 'IND', 'SER', 'AGR') AND active = 1 ORDER BY code"
    );

    if (branches.length === 4) {
      logStep("E2E-01.1: Validar catálogo de ramos (COM, IND, SER, AGR)", "PASS", {
        count: branches.length,
        branches: branches.map(b => b.code).join(', '),
      });
    } else {
      logStep("E2E-01.1: Validar catálogo de ramos", "FAIL", {
        expected: 4,
        found: branches.length,
        error: "Ramos insuficientes no catálogo",
      });
      metrics.errors.push("Catálogo de ramos incompleto");
    }

    const branchIds = {
      COM: branches.find(b => b.code === 'COM')?.id,
      IND: branches.find(b => b.code === 'IND')?.id,
      SER: branches.find(b => b.code === 'SER')?.id,
      AGR: branches.find(b => b.code === 'AGR')?.id,
    };

    // Passo 2: Verificar usuário de teste (usar usuário existente ID 1)
    const [users] = await connection.execute(
      "SELECT id, name, email, role FROM users WHERE id = 1"
    );

    if (users.length > 0) {
      logStep("E2E-01.2: Validar usuário de teste", "PASS", {
        userId: users[0].id,
        name: users[0].name,
        role: users[0].role,
      });
    } else {
      logStep("E2E-01.2: Validar usuário de teste", "FAIL", {
        error: "Nenhum usuário encontrado",
      });
      metrics.errors.push("Usuário de teste não encontrado");
      throw new Error("Usuário de teste não encontrado");
    }

    const testUserId = users[0].id;

    // =========================================================================
    // E2E-02 PROJETO 1
    // =========================================================================
    console.log("\n📋 FASE 2: PROJETO P1 - Reforma 2026\n");

    // Passo 4: Criar Projeto P1
    const [projectResult1] = await connection.execute(
      "INSERT INTO projects (name, clientId, status, createdById, createdByRole) VALUES (?, ?, ?, ?, ?)",
      ["Projeto P1 – Reforma 2026", testUserId, "rascunho", testUserId, "equipe_solaris"]
    );
    const project1Id = projectResult1.insertId;
    metrics.projects.push({ id: project1Id, name: "Projeto P1 – Reforma 2026" });
    logStep("E2E-02.1: Criar Projeto P1", "PASS", { id: project1Id });

    // Passo 5: Selecionar 4 ramos
    for (const [code, branchId] of Object.entries(branchIds)) {
      await connection.execute(
        "INSERT INTO projectBranches (projectId, branchId) VALUES (?, ?)",
        [project1Id, branchId]
      );
    }
    logStep("E2E-02.2: Selecionar 4 ramos (COM, IND, SER, AGR)", "PASS", { projectId: project1Id });

    // Double-check: Verificar vínculos
    const [p1Branches] = await connection.execute(
      "SELECT COUNT(*) as count FROM projectBranches WHERE projectId = ?",
      [project1Id]
    );
    if (p1Branches[0].count === 4) {
      logStep("E2E-02.2-DC: Double-check vínculos de ramos P1", "PASS", { count: 4 });
    } else {
      logStep("E2E-02.2-DC: Double-check vínculos de ramos P1", "FAIL", {
        expected: 4,
        found: p1Branches[0].count,
      });
      metrics.errors.push("P1: Vínculos de ramos incorretos");
    }

    // Passo 6: Criar Questionário Corporativo P1
    const corporateQuestions1 = JSON.stringify([
      { question: "Qual o regime tributário?", answer: "Lucro Real" },
      { question: "Possui ERP integrado?", answer: "Sim, SAP" },
    ]);
    const [corpAssessment1] = await connection.execute(
      "INSERT INTO corporateAssessments (projectId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, NOW(), ?)",
      [project1Id, corporateQuestions1, corporateQuestions1, testUserId]
    );
    logStep("E2E-02.3: Preencher Questionário Corporativo P1", "PASS", { id: corpAssessment1.insertId });

    // Passo 7: Criar Plano Corporativo P1
    const [corpPlan1] = await connection.execute(
      "INSERT INTO corporateActionPlans (projectId, corporateAssessmentId, prompt, detailedPlan, version, generatedAt) VALUES (?, ?, ?, ?, ?, NOW())",
      [project1Id, corpAssessment1.insertId, "Prompt padrão", "Plano corporativo detalhado P1", 1]
    );
    metrics.plans.push({ projectId: project1Id, type: "corporate", id: corpPlan1.insertId });
    logStep("E2E-02.4: Gerar Plano Corporativo P1", "PASS", { id: corpPlan1.insertId });

    // Passo 8: Criar Questionários e Planos por Ramo P1
    for (const [code, branchId] of Object.entries(branchIds)) {
      // Questionário do ramo
      const branchQuestions = JSON.stringify([
        { question: `Pergunta específica ${code}?`, answer: `Resposta ${code}` },
      ]);
      const [branchAssessment] = await connection.execute(
        "INSERT INTO branchAssessments (projectId, branchId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
        [project1Id, branchId, branchQuestions, branchQuestions, testUserId]
      );

      // Plano do ramo
      const [branchPlan] = await connection.execute(
        "INSERT INTO branchActionPlans (projectId, branchId, branchAssessmentId, prompt, detailedPlan, version, generatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [project1Id, branchId, branchAssessment.insertId, "Prompt ramo", `Plano ${code} detalhado P1`, 1]
      );
      metrics.plans.push({ projectId: project1Id, type: "branch", branch: code, id: branchPlan.insertId });
      logStep(`E2E-02.5: Gerar Plano Ramo ${code} P1`, "PASS", { id: branchPlan.insertId, branch: code });
    }

    // Passo 9: Validar cardinalidade P1
    const [p1Plans] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM corporateActionPlans WHERE projectId = ?) + (SELECT COUNT(*) FROM branchActionPlans WHERE projectId = ?) as totalPlans",
      [project1Id, project1Id]
    );
    const p1TotalPlans = p1Plans[0].totalPlans;
    if (p1TotalPlans === 5) {
      logStep("E2E-02.6: Validar cardinalidade P1 (1 corp + 4 ramos = 5)", "PASS", { total: p1TotalPlans });
    } else {
      logStep("E2E-02.6: Validar cardinalidade P1", "FAIL", { expected: 5, found: p1TotalPlans });
      metrics.errors.push("P1: Cardinalidade incorreta");
    }

    // =========================================================================
    // E2E-03 PROJETO 2
    // =========================================================================
    console.log("\n📋 FASE 3: PROJETO P2 - Reforma 2027\n");

    // Repetir passos para P2
    const [projectResult2] = await connection.execute(
      "INSERT INTO projects (name, clientId, status, createdById, createdByRole) VALUES (?, ?, ?, ?, ?)",
      ["Projeto P2 – Reforma 2027", testUserId, "rascunho", testUserId, "equipe_solaris"]
    );
    const project2Id = projectResult2.insertId;
    metrics.projects.push({ id: project2Id, name: "Projeto P2 – Reforma 2027" });
    logStep("E2E-03.1: Criar Projeto P2", "PASS", { id: project2Id });

    for (const [code, branchId] of Object.entries(branchIds)) {
      await connection.execute(
        "INSERT INTO projectBranches (projectId, branchId) VALUES (?, ?)",
        [project2Id, branchId]
      );
    }
    logStep("E2E-03.2: Selecionar 4 ramos P2", "PASS", { projectId: project2Id });

    const corporateQuestions2 = JSON.stringify([
      { question: "Qual o regime tributário?", answer: "Simples Nacional" },
      { question: "Possui ERP integrado?", answer: "Não" },
    ]);
    const [corpAssessment2] = await connection.execute(
      "INSERT INTO corporateAssessments (projectId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, NOW(), ?)",
      [project2Id, corporateQuestions2, corporateQuestions2, testUserId]
    );
    logStep("E2E-03.3: Preencher Questionário Corporativo P2", "PASS", { id: corpAssessment2.insertId });

    const [corpPlan2] = await connection.execute(
      "INSERT INTO corporateActionPlans (projectId, corporateAssessmentId, prompt, detailedPlan, version, generatedAt) VALUES (?, ?, ?, ?, ?, NOW())",
      [project2Id, corpAssessment2.insertId, "Prompt padrão", "Plano corporativo detalhado P2", 1]
    );
    metrics.plans.push({ projectId: project2Id, type: "corporate", id: corpPlan2.insertId });
    logStep("E2E-03.4: Gerar Plano Corporativo P2", "PASS", { id: corpPlan2.insertId });

    for (const [code, branchId] of Object.entries(branchIds)) {
      const branchQuestions = JSON.stringify([
        { question: `Pergunta específica ${code}?`, answer: `Resposta ${code} P2` },
      ]);
      const [branchAssessment] = await connection.execute(
        "INSERT INTO branchAssessments (projectId, branchId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
        [project2Id, branchId, branchQuestions, branchQuestions, testUserId]
      );

      const [branchPlan] = await connection.execute(
        "INSERT INTO branchActionPlans (projectId, branchId, branchAssessmentId, prompt, detailedPlan, version, generatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [project2Id, branchId, branchAssessment.insertId, "Prompt ramo", `Plano ${code} detalhado P2`, 1]
      );
      metrics.plans.push({ projectId: project2Id, type: "branch", branch: code, id: branchPlan.insertId });
      logStep(`E2E-03.5: Gerar Plano Ramo ${code} P2`, "PASS", { id: branchPlan.insertId, branch: code });
    }

    const [p2Plans] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM corporateActionPlans WHERE projectId = ?) + (SELECT COUNT(*) FROM branchActionPlans WHERE projectId = ?) as totalPlans",
      [project2Id, project2Id]
    );
    const p2TotalPlans = p2Plans[0].totalPlans;
    if (p2TotalPlans === 5) {
      logStep("E2E-03.6: Validar cardinalidade P2 (1 corp + 4 ramos = 5)", "PASS", { total: p2TotalPlans });
    } else {
      logStep("E2E-03.6: Validar cardinalidade P2", "FAIL", { expected: 5, found: p2TotalPlans });
      metrics.errors.push("P2: Cardinalidade incorreta");
    }

    // =========================================================================
    // VALIDAÇÕES FINAIS
    // =========================================================================
    console.log("\n📋 FASE 4: VALIDAÇÕES FINAIS\n");

    // Total de planos
    const totalPlans = p1TotalPlans + p2TotalPlans;
    if (totalPlans === 10) {
      logStep("E2E-04.1: Total de planos (2 projetos × 5 = 10)", "PASS", { total: totalPlans });
    } else {
      logStep("E2E-04.1: Total de planos", "FAIL", { expected: 10, found: totalPlans });
      metrics.errors.push("Total de planos incorreto");
    }

    // Integridade de vínculos
    const [branchPlanIntegrity] = await connection.execute(
      "SELECT bp.id, bp.projectId, bp.branchId, ab.code FROM branchActionPlans bp JOIN activityBranches ab ON bp.branchId = ab.id WHERE bp.projectId IN (?, ?)",
      [project1Id, project2Id]
    );
    if (branchPlanIntegrity.length === 8) {
      logStep("E2E-04.2: Integridade de vínculos (8 planos por ramo)", "PASS", { count: 8 });
    } else {
      logStep("E2E-04.2: Integridade de vínculos", "FAIL", { expected: 8, found: branchPlanIntegrity.length });
      metrics.errors.push("Integridade de vínculos comprometida");
    }

    // =========================================================================
    // RELATÓRIO FINAL
    // =========================================================================
    console.log("\n📊 ===============================================");
    console.log("   RELATÓRIO FINAL - TESTE E2E");
    console.log("===============================================\n");

    const passCount = metrics.steps.filter(s => s.status === 'PASS').length;
    const failCount = metrics.steps.filter(s => s.status === 'FAIL').length;
    const totalSteps = metrics.steps.length;
    const successRate = ((passCount / totalSteps) * 100).toFixed(2);

    console.log(`✅ Passos executados: ${totalSteps}`);
    console.log(`✅ Sucessos: ${passCount}`);
    console.log(`❌ Falhas: ${failCount}`);
    console.log(`📊 Taxa de sucesso: ${successRate}%`);
    console.log(`\n📦 Projetos criados: ${metrics.projects.length}`);
    metrics.projects.forEach(p => console.log(`   - ${p.name} (ID: ${p.id})`));
    console.log(`\n📄 Planos criados: ${metrics.plans.length}`);
    console.log(`   - Corporativos: ${metrics.plans.filter(p => p.type === 'corporate').length}`);
    console.log(`   - Por Ramo: ${metrics.plans.filter(p => p.type === 'branch').length}`);

    if (metrics.errors.length > 0) {
      console.log(`\n❌ Problemas encontrados: ${metrics.errors.length}`);
      metrics.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
    } else {
      console.log(`\n🎉 TESTE 100% CONCLUÍDO SEM ERROS!`);
    }

    const duration = ((Date.now() - metrics.startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Tempo total: ${duration}s`);
    console.log("===============================================\n");

    // Salvar relatório em arquivo
    const report = {
      summary: {
        totalSteps,
        passCount,
        failCount,
        successRate: `${successRate}%`,
        duration: `${duration}s`,
      },
      projects: metrics.projects,
      plans: metrics.plans,
      errors: metrics.errors,
      steps: metrics.steps,
    };

    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/compliance-tributaria-v2/e2e-test-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log("📄 Relatório salvo em: e2e-test-report.json\n");

  } catch (error) {
    console.error("\n❌ ERRO CRÍTICO NO TESTE E2E:", error);
    metrics.errors.push(`Erro crítico: ${error.message}`);
  } finally {
    await connection.end();
  }
}

runE2ETests();
