/**
 * Tarefa 2: Validação de Determinismo da IA
 * Executa T01 (hard_block) e C2 (soft_block) 5x cada e mede variação
 */
import { runCpieAnalysisV2 } from "./cpie-v2";

const T01_CERVEJARIA = {
  companyType: "mei" as const,
  companySize: "micro" as const,
  annualRevenueRange: "acima_de_4_8m" as const,
  taxRegime: "simples_nacional" as const,
  operationType: "industria" as const,
  clientType: ["b2g"] as string[],
  multiState: false,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["boleto"] as string[],
  hasIntermediaries: false,
  hasTaxTeam: false,
  hasAudit: false,
  hasTaxIssues: false,
  description: "Cervejaria artesanal que vende para prefeituras. Faturamento de R$ 1M por mês.",
};

const C2_MEI_MULTISTATE = {
  companyType: "mei" as const,
  companySize: "mei" as const,
  annualRevenueRange: "ate_360k" as const,
  taxRegime: "simples_nacional" as const,
  operationType: "servicos" as const,
  clientType: ["b2c"] as string[],
  multiState: true,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["pix"] as string[],
  hasIntermediaries: false,
  hasTaxTeam: false,
  hasAudit: false,
  hasTaxIssues: false,
};

async function runDeterminismTest() {
  console.log("=== TAREFA 2: VALIDAÇÃO DE DETERMINISMO DA IA ===\n");

  const t01Results: Array<{
    run: number;
    blockType: string | null;
    diagnosticConfidence: number;
    consistencyScore: number;
    aiVeto: number | null;
    canProceed: boolean;
  }> = [];

  const c2Results: Array<{
    run: number;
    blockType: string | null;
    diagnosticConfidence: number;
    consistencyScore: number;
    aiVeto: number | null;
    canProceed: boolean;
  }> = [];

  // 5 execuções de T01
  console.log("--- T01: Cervejaria MEI (esperado: hard_block) ---");
  for (let i = 1; i <= 5; i++) {
    try {
      const result = await runCpieAnalysisV2(T01_CERVEJARIA);
      t01Results.push({
        run: i,
        blockType: result.blockType ?? null,
        diagnosticConfidence: result.diagnosticConfidence,
        consistencyScore: result.consistencyScore,
        aiVeto: result.aiVeto ?? null,
        canProceed: result.canProceed,
      });
      console.log(`  Run ${i}: blockType=${result.blockType}, confidence=${result.diagnosticConfidence}%, consistency=${result.consistencyScore}%, aiVeto=${result.aiVeto}, canProceed=${result.canProceed}`);
    } catch (err: any) {
      console.error(`  Run ${i}: ERRO — ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500)); // evitar rate limit
  }

  // 5 execuções de C2
  console.log("\n--- C2: MEI Multiestado (esperado: soft_block_with_override) ---");
  for (let i = 1; i <= 5; i++) {
    try {
      const result = await runCpieAnalysisV2(C2_MEI_MULTISTATE);
      c2Results.push({
        run: i,
        blockType: result.blockType ?? null,
        diagnosticConfidence: result.diagnosticConfidence,
        consistencyScore: result.consistencyScore,
        aiVeto: result.aiVeto ?? null,
        canProceed: result.canProceed,
      });
      console.log(`  Run ${i}: blockType=${result.blockType}, confidence=${result.diagnosticConfidence}%, consistency=${result.consistencyScore}%, aiVeto=${result.aiVeto}, canProceed=${result.canProceed}`);
    } catch (err: any) {
      console.error(`  Run ${i}: ERRO — ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Análise estatística
  console.log("\n=== ANÁLISE ESTATÍSTICA ===\n");

  const analyzeVariation = (results: typeof t01Results, label: string) => {
    if (results.length === 0) return;
    const confidences = results.map(r => r.diagnosticConfidence);
    const consistencies = results.map(r => r.consistencyScore);
    const blockTypes = results.map(r => r.blockType);
    const uniqueBlockTypes = Array.from(new Set(blockTypes));

    const minConf = Math.min(...confidences);
    const maxConf = Math.max(...confidences);
    const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variationConf = maxConf - minConf;

    const minCons = Math.min(...consistencies);
    const maxCons = Math.max(...consistencies);
    const variationCons = maxCons - minCons;

    const allSameBlockType = uniqueBlockTypes.length === 1;
    const deterministicStatus = allSameBlockType ? "✅ DETERMINÍSTICO" : "⚠️ VARIAÇÃO NO BLOCK_TYPE";

    console.log(`${label}:`);
    console.log(`  blockType: ${uniqueBlockTypes.join(", ")} — ${deterministicStatus}`);
    console.log(`  diagnosticConfidence: min=${minConf}%, max=${maxConf}%, avg=${avgConf.toFixed(1)}%, variação=${variationConf}pp`);
    console.log(`  consistencyScore:     min=${minCons}%, max=${maxCons}%, variação=${variationCons}pp`);
    console.log(`  Critério (variação ≤ 10pp): ${variationConf <= 10 ? "✅ APROVADO" : "❌ REPROVADO — calibração necessária"}`);
    console.log();
  };

  analyzeVariation(t01Results, "T01 — Cervejaria MEI");
  analyzeVariation(c2Results, "C2 — MEI Multiestado");

  // Salvar resultados
  const output = {
    timestamp: new Date().toISOString(),
    t01: { profile: "Cervejaria MEI", runs: t01Results },
    c2: { profile: "MEI Multiestado", runs: c2Results },
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "/home/ubuntu/DETERMINISM_TEST_RESULTS.json",
    JSON.stringify(output, null, 2)
  );
  console.log("Resultados salvos em /home/ubuntu/DETERMINISM_TEST_RESULTS.json");
}

runDeterminismTest().catch(console.error);
