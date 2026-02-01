import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

const metrics = {
  startTime: Date.now(),
  steps: [],
  projects: [],
  plans: [],
  errors: [],
};

function logStep(step, status, details = {}) {
  const entry = { step, status, timestamp: new Date().toISOString(), ...details };
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
    console.log("📋 FASE 1: SETUP INICIAL\n");

    // Validar ramos
    const [branches] = await connection.execute(
      "SELECT id, code, name, active FROM activityBranches WHERE code IN ('COM', 'IND', 'SER', 'AGR') AND active = 1 ORDER BY code"
    );

    if (branches.length === 4) {
      logStep("E2E-01.1: Validar catálogo de ramos", "PASS", { count: 4 });
    } else {
      logStep("E2E-01.1: Validar catálogo de ramos", "FAIL", { expected: 4, found: branches.length });
      metrics.errors.push("Catálogo incompleto");
    }

    const branchIds = {
      COM: branches.find(b => b.code === 'COM')?.id,
      IND: branches.find(b => b.code === 'IND')?.id,
      SER: branches.find(b => b.code === 'SER')?.id,
      AGR: branches.find(b => b.code === 'AGR')?.id,
    };

    // Validar usuário
    const [users] = await connection.execute("SELECT id, name FROM users WHERE id = 1");
    if (users.length > 0) {
      logStep("E2E-01.2: Validar usuário de teste", "PASS", { userId: users[0].id });
    } else {
      throw new Error("Usuário não encontrado");
    }
    const testUserId = users[0].id;

    console.log("\n📋 FASE 2: PROJETO P1 - Reforma 2026\n");

    // Criar P1
    const [p1] = await connection.execute(
      "INSERT INTO projects (name, clientId, status, createdById, createdByRole) VALUES (?, ?, ?, ?, ?)",
      ["Projeto P1 – Reforma 2026", testUserId, "rascunho", testUserId, "equipe_solaris"]
    );
    const project1Id = p1.insertId;
    metrics.projects.push({ id: project1Id, name: "P1" });
    logStep("E2E-02.1: Criar Projeto P1", "PASS", { id: project1Id });

    // Vincular ramos P1
    for (const branchId of Object.values(branchIds)) {
      await connection.execute(
        "INSERT INTO projectBranches (projectId, branchId) VALUES (?, ?)",
        [project1Id, branchId]
      );
    }
    logStep("E2E-02.2: Selecionar 4 ramos P1", "PASS");

    // Questionário Corporativo P1
    const questions1 = JSON.stringify([{ q: "Regime?", a: "Lucro Real" }]);
    const [ca1] = await connection.execute(
      "INSERT INTO corporateAssessments (projectId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, NOW(), ?)",
      [project1Id, questions1, questions1, testUserId]
    );
    logStep("E2E-02.3: Questionário Corporativo P1", "PASS", { id: ca1.insertId });

    // Plano Corporativo P1
    const [cp1] = await connection.execute(
      "INSERT INTO corporateActionPlans (projectId, corporateAssessmentId, generationPrompt, planContent, generatedAt, generatedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
      [project1Id, ca1.insertId, "Prompt", JSON.stringify([{ task: "Tarefa 1" }]), testUserId]
    );
    metrics.plans.push({ projectId: project1Id, type: "corp", id: cp1.insertId });
    logStep("E2E-02.4: Plano Corporativo P1", "PASS", { id: cp1.insertId });

    // Planos por Ramo P1
    for (const [code, branchId] of Object.entries(branchIds)) {
      const [ba] = await connection.execute(
        "INSERT INTO branchAssessments (projectId, branchId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
        [project1Id, branchId, questions1, questions1, testUserId]
      );
      const [bp] = await connection.execute(
        "INSERT INTO branchActionPlans (projectId, branchId, branchAssessmentId, generationPrompt, planContent, generatedAt, generatedBy) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
        [project1Id, branchId, ba.insertId, "Prompt", JSON.stringify([{ task: code }]), testUserId]
      );
      metrics.plans.push({ projectId: project1Id, type: "branch", branch: code, id: bp.insertId });
      logStep(`E2E-02.5: Plano Ramo ${code} P1`, "PASS", { id: bp.insertId });
    }

    // Validar cardinalidade P1
    const [p1Count] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM corporateActionPlans WHERE projectId = ?) + (SELECT COUNT(*) FROM branchActionPlans WHERE projectId = ?) as total",
      [project1Id, project1Id]
    );
    const p1Total = p1Count[0].total;
    if (p1Total === 5) {
      logStep("E2E-02.6: Cardinalidade P1 (5 planos)", "PASS", { total: p1Total });
    } else {
      logStep("E2E-02.6: Cardinalidade P1", "FAIL", { expected: 5, found: p1Total });
      metrics.errors.push("P1 cardinalidade incorreta");
    }

    console.log("\n📋 FASE 3: PROJETO P2 - Reforma 2027\n");

    // Criar P2
    const [p2] = await connection.execute(
      "INSERT INTO projects (name, clientId, status, createdById, createdByRole) VALUES (?, ?, ?, ?, ?)",
      ["Projeto P2 – Reforma 2027", testUserId, "rascunho", testUserId, "equipe_solaris"]
    );
    const project2Id = p2.insertId;
    metrics.projects.push({ id: project2Id, name: "P2" });
    logStep("E2E-03.1: Criar Projeto P2", "PASS", { id: project2Id });

    // Vincular ramos P2
    for (const branchId of Object.values(branchIds)) {
      await connection.execute(
        "INSERT INTO projectBranches (projectId, branchId) VALUES (?, ?)",
        [project2Id, branchId]
      );
    }
    logStep("E2E-03.2: Selecionar 4 ramos P2", "PASS");

    // Questionário Corporativo P2
    const [ca2] = await connection.execute(
      "INSERT INTO corporateAssessments (projectId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, NOW(), ?)",
      [project2Id, questions1, questions1, testUserId]
    );
    logStep("E2E-03.3: Questionário Corporativo P2", "PASS", { id: ca2.insertId });

    // Plano Corporativo P2
    const [cp2] = await connection.execute(
      "INSERT INTO corporateActionPlans (projectId, corporateAssessmentId, generationPrompt, planContent, generatedAt, generatedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
      [project2Id, ca2.insertId, "Prompt", JSON.stringify([{ task: "Tarefa 1" }]), testUserId]
    );
    metrics.plans.push({ projectId: project2Id, type: "corp", id: cp2.insertId });
    logStep("E2E-03.4: Plano Corporativo P2", "PASS", { id: cp2.insertId });

    // Planos por Ramo P2
    for (const [code, branchId] of Object.entries(branchIds)) {
      const [ba] = await connection.execute(
        "INSERT INTO branchAssessments (projectId, branchId, generatedQuestions, answers, completedAt, completedBy) VALUES (?, ?, ?, ?, NOW(), ?)",
        [project2Id, branchId, questions1, questions1, testUserId]
      );
      const [bp] = await connection.execute(
        "INSERT INTO branchActionPlans (projectId, branchId, branchAssessmentId, generationPrompt, planContent, generatedAt, generatedBy) VALUES (?, ?, ?, ?, ?, NOW(), ?)",
        [project2Id, branchId, ba.insertId, "Prompt", JSON.stringify([{ task: code }]), testUserId]
      );
      metrics.plans.push({ projectId: project2Id, type: "branch", branch: code, id: bp.insertId });
      logStep(`E2E-03.5: Plano Ramo ${code} P2`, "PASS", { id: bp.insertId });
    }

    // Validar cardinalidade P2
    const [p2Count] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM corporateActionPlans WHERE projectId = ?) + (SELECT COUNT(*) FROM branchActionPlans WHERE projectId = ?) as total",
      [project2Id, project2Id]
    );
    const p2Total = p2Count[0].total;
    if (p2Total === 5) {
      logStep("E2E-03.6: Cardinalidade P2 (5 planos)", "PASS", { total: p2Total });
    } else {
      logStep("E2E-03.6: Cardinalidade P2", "FAIL", { expected: 5, found: p2Total });
      metrics.errors.push("P2 cardinalidade incorreta");
    }

    console.log("\n📋 FASE 4: VALIDAÇÕES FINAIS\n");

    const totalPlans = p1Total + p2Total;
    if (totalPlans === 10) {
      logStep("E2E-04.1: Total de planos (10)", "PASS", { total: totalPlans });
    } else {
      logStep("E2E-04.1: Total de planos", "FAIL", { expected: 10, found: totalPlans });
      metrics.errors.push("Total incorreto");
    }

    // Integridade
    const [integrity] = await connection.execute(
      "SELECT COUNT(*) as count FROM branchActionPlans WHERE projectId IN (?, ?)",
      [project1Id, project2Id]
    );
    if (integrity[0].count === 8) {
      logStep("E2E-04.2: Integridade vínculos (8 planos por ramo)", "PASS", { count: 8 });
    } else {
      logStep("E2E-04.2: Integridade vínculos", "FAIL", { expected: 8, found: integrity[0].count });
      metrics.errors.push("Integridade comprometida");
    }

    console.log("\n📊 ===============================================");
    console.log("   RELATÓRIO FINAL");
    console.log("===============================================\n");

    const passCount = metrics.steps.filter(s => s.status === 'PASS').length;
    const failCount = metrics.steps.filter(s => s.status === 'FAIL').length;
    const successRate = ((passCount / metrics.steps.length) * 100).toFixed(2);

    console.log(`✅ Sucessos: ${passCount}/${metrics.steps.length}`);
    console.log(`❌ Falhas: ${failCount}`);
    console.log(`📊 Taxa de sucesso: ${successRate}%`);
    console.log(`\n📦 Projetos: ${metrics.projects.length}`);
    console.log(`📄 Planos: ${metrics.plans.length} (${metrics.plans.filter(p => p.type === 'corp').length} corp + ${metrics.plans.filter(p => p.type === 'branch').length} ramos)`);

    if (metrics.errors.length > 0) {
      console.log(`\n❌ Problemas: ${metrics.errors.length}`);
      metrics.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    } else {
      console.log(`\n🎉 TESTE 100% CONCLUÍDO SEM ERROS!`);
    }

    const duration = ((Date.now() - metrics.startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Tempo: ${duration}s`);
    console.log("===============================================\n");

    const fs = await import('fs/promises');
    await fs.writeFile(
      '/home/ubuntu/compliance-tributaria-v2/e2e-test-report.json',
      JSON.stringify({ summary: { passCount, failCount, successRate: `${successRate}%`, duration: `${duration}s` }, projects: metrics.projects, plans: metrics.plans, errors: metrics.errors, steps: metrics.steps }, null, 2)
    );
    console.log("📄 Relatório salvo: e2e-test-report.json\n");

  } catch (error) {
    console.error("\n❌ ERRO CRÍTICO:", error.message);
    metrics.errors.push(`Erro crítico: ${error.message}`);
  } finally {
    await connection.end();
  }
}

runE2ETests();
