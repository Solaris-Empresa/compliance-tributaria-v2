/**
 * SMOKE TEST F-02B — Validação real do adaptador getDiagnosticSource
 * Projeto V1: ID 60001 — "[TESTE FASE 4] Empresa Industrial Ltda"
 * Executar: npx tsx server/smoke-test-f02b.ts
 */
import { getDiagnosticSource, determineFlowVersion } from "./diagnostic-source";
import { getProjectById } from "./db";

async function runSmokeTest() {
  const PROJECT_ID = 60001;
  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log("SMOKE TEST F-02B — getDiagnosticSource com dados reais");
  console.log("=".repeat(60));
  console.log(`Projeto ID: ${PROJECT_ID}`);
  console.log(`Início: ${new Date().toISOString()}`);
  console.log("");

  // 1. Buscar projeto diretamente do banco (baseline)
  console.log("1. Buscando projeto diretamente do banco (baseline)...");
  const project = await getProjectById(PROJECT_ID);
  if (!project) {
    console.error("ERRO: Projeto não encontrado no banco.");
    process.exit(1);
  }
  console.log(`   ✓ Projeto encontrado: "${project.name}"`);
  console.log(`   Status: ${project.status} | Step: ${project.currentStep}`);
  console.log(`   corporateAnswers: ${project.corporateAnswers ? "PRESENTE" : "AUSENTE"}`);
  console.log(`   operationalAnswers: ${project.operationalAnswers ? "PRESENTE" : "AUSENTE"}`);
  console.log(`   cnaeAnswers: ${project.cnaeAnswers ? "PRESENTE" : "AUSENTE"}`);
  console.log(`   briefingContent: ${project.briefingContent ? "PRESENTE" : "AUSENTE"}`);
  console.log(`   questionnaireAnswers: ${project.questionnaireAnswers ? "PRESENTE" : "AUSENTE"}`);
  console.log("");

  // 2. Chamar getDiagnosticSource (via adaptador)
  console.log("2. Chamando getDiagnosticSource() via adaptador...");
  const t1 = Date.now();
  const source = await getDiagnosticSource(PROJECT_ID);
  const t2 = Date.now();
  console.log(`   ✓ Adaptador retornou em ${t2 - t1}ms`);
  console.log(`   flowVersion detectado: "${source.flowVersion}"`);
  console.log(`   projectId: ${source.projectId}`);
  console.log("");

  // 3. Validar isolamento V1
  console.log("3. Validando isolamento V1...");
  const checks = [
    { name: "flowVersion === 'v1'", pass: source.flowVersion === "v1" },
    { name: "corporateAnswers presente", pass: source.corporateAnswers !== null },
    { name: "operationalAnswers presente", pass: source.operationalAnswers !== null },
    { name: "cnaeAnswers presente", pass: source.cnaeAnswers !== null },
    { name: "questionnaireAnswersV3 é null (V3 ausente)", pass: source.questionnaireAnswersV3 === null },
    { name: "briefingContentV3 é null (V3 ausente)", pass: source.briefingContentV3 === null },
    { name: "riskMatricesDataV3 é null (V3 ausente)", pass: source.riskMatricesDataV3 === null },
    { name: "actionPlansDataV3 é null (V3 ausente)", pass: source.actionPlansDataV3 === null },
  ];

  let allPassed = true;
  for (const check of checks) {
    const icon = check.pass ? "✓" : "✗";
    console.log(`   ${icon} ${check.name}`);
    if (!check.pass) allPassed = false;
  }
  console.log("");

  // 4. Validar determineFlowVersion diretamente
  console.log("4. Validando determineFlowVersion()...");
  const detectedVersion = determineFlowVersion({
    corporateAnswers: project.corporateAnswers,
    operationalAnswers: project.operationalAnswers,
    questionnaireAnswers: project.questionnaireAnswers,
  });
  const versionCheck = detectedVersion === "v1";
  console.log(`   ${versionCheck ? "✓" : "✗"} determineFlowVersion retorna "v1": ${detectedVersion}`);
  if (!versionCheck) allPassed = false;
  console.log("");

  // 5. Validar que os dados V1 são idênticos ao banco (sem transformação)
  console.log("5. Validando fidelidade dos dados (adaptador não transforma)...");
  const corporateMatch = JSON.stringify(source.corporateAnswers) === JSON.stringify(project.corporateAnswers);
  const operationalMatch = JSON.stringify(source.operationalAnswers) === JSON.stringify(project.operationalAnswers);
  const cnaeMatch = JSON.stringify(source.cnaeAnswers) === JSON.stringify(project.cnaeAnswers);
  console.log(`   ${corporateMatch ? "✓" : "✗"} corporateAnswers idêntico ao banco`);
  console.log(`   ${operationalMatch ? "✓" : "✗"} operationalAnswers idêntico ao banco`);
  console.log(`   ${cnaeMatch ? "✓" : "✗"} cnaeAnswers idêntico ao banco`);
  if (!corporateMatch || !operationalMatch || !cnaeMatch) allPassed = false;
  console.log("");

  // 6. Validar segunda chamada (idempotência)
  console.log("6. Validando idempotência (segunda chamada)...");
  const t3 = Date.now();
  const source2 = await getDiagnosticSource(PROJECT_ID);
  const t4 = Date.now();
  const idempotent = source2.flowVersion === source.flowVersion &&
    JSON.stringify(source2.corporateAnswers) === JSON.stringify(source.corporateAnswers);
  console.log(`   ${idempotent ? "✓" : "✗"} Segunda chamada retorna dados idênticos (${t4 - t3}ms)`);
  if (!idempotent) allPassed = false;
  console.log("");

  // Resultado final
  const totalTime = Date.now() - startTime;
  console.log("=".repeat(60));
  if (allPassed) {
    console.log(`✅ SMOKE TEST PASSOU — ${totalTime}ms`);
    console.log("   getDiagnosticSource() retorna dados V1 corretos e isolados.");
    console.log("   Nenhum campo V3 vaza no contexto V1.");
    console.log("   PRÉ-CONDIÇÃO 1 DA F-02C: APROVADA");
  } else {
    console.log(`❌ SMOKE TEST FALHOU — ${totalTime}ms`);
    console.log("   Verificar os checks acima marcados com ✗");
    process.exit(1);
  }
  console.log("=".repeat(60));
}

runSmokeTest().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exit(1);
});
