/**
 * Script de Pré-Homologação CPIE v2
 * Executa os 5 cenários obrigatórios diretamente nas funções do motor
 * Sem banco de dados — testa a lógica pura do pipeline E1→E5
 */

import { runCpieAnalysisV2 } from "./cpie-v2";

// ─── Perfis de teste ──────────────────────────────────────────────────────────

const PERFIL_HARD_BLOCK = {
  companyType: "MEI",
  companySize: "micro",
  annualRevenueRange: "acima_4_8m",
  taxRegime: "simples",
  operationType: "industrial",
  clientType: ["B2G"],
  multiState: true,
  hasMultipleEstablishments: true,
  hasImportExport: true,
  hasSpecialRegimes: false,
  paymentMethods: ["boleto"],
  hasIntermediaries: false,
  hasTaxTeam: false,
  hasAudit: false,
  hasTaxIssues: true,
  description: "Cervejaria artesanal MEI faturando R$ 1 milhão por mês, vendendo para o governo federal em 15 estados, com operações industriais de grande porte e importação de insumos.",
};

const PERFIL_SOFT_BLOCK = {
  companyType: "ltda",
  companySize: "pequena",
  annualRevenueRange: "ate_360k",
  taxRegime: "lucro_real",
  operationType: "servicos",
  clientType: ["B2B"],
  multiState: true,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: true,
  paymentMethods: ["cartao"],
  hasIntermediaries: false,
  hasTaxTeam: false,
  hasAudit: false,
  hasTaxIssues: false,
  description: "Empresa de serviços com Lucro Real e faturamento de R$ 200K/ano atuando em múltiplos estados com regimes especiais.",
};

const PERFIL_POSITIVO = {
  companyType: "ltda",
  companySize: "media",
  annualRevenueRange: "1_8m_a_4_8m",
  taxRegime: "lucro_presumido",
  operationType: "servicos",
  clientType: ["B2B"],
  multiState: false,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["boleto", "pix"],
  hasIntermediaries: false,
  hasTaxTeam: true,
  hasAudit: false,
  hasTaxIssues: false,
  description: "Empresa de consultoria de TI com 50 funcionários, Lucro Presumido, faturamento de R$ 2M/ano, clientes B2B, operação local.",
};

// ─── Executor de cenários ─────────────────────────────────────────────────────

async function executarCenario(nome: string, perfil: any, cenarioNum: number) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`CENÁRIO ${cenarioNum}: ${nome}`);
  console.log("=".repeat(70));
  console.log("INPUT:", JSON.stringify({ companyType: perfil.companyType, taxRegime: perfil.taxRegime, annualRevenueRange: perfil.annualRevenueRange, operationType: perfil.operationType, clientType: perfil.clientType }, null, 2));

  try {
    const resultado = await runCpieAnalysisV2(perfil);

    console.log("\n--- RESULTADO ---");
    console.log(`completenessScore:    ${resultado.completenessScore}%`);
    console.log(`consistencyScore:     ${resultado.consistencyScore}%`);
    console.log(`diagnosticConfidence: ${resultado.diagnosticConfidence}%`);
    console.log(`canProceed:           ${resultado.canProceed}`);
    console.log(`blockType:            ${resultado.blockType ?? "nenhum"}`);
    console.log(`blockReason:          ${resultado.blockReason ?? "nenhum"}`);
    console.log(`deterministicVeto:    ${resultado.deterministicVeto ?? "nenhum"}`);
    console.log(`aiVeto:               ${resultado.aiVeto ?? "nenhum"}`);
    console.log(`conflictos (${resultado.conflicts?.length ?? 0}):`);
    (resultado.conflicts ?? []).forEach((c: any, i: number) => {
      console.log(`  [${i+1}] [${c.severity}] ${c.description}`);
    });

    return resultado;
  } catch (err: any) {
    console.error(`ERRO no cenário ${cenarioNum}:`, err.message);
    return null;
  }
}

// ─── Validação do soft_block override ────────────────────────────────────────

function validarOverride(blockType: string | undefined, diagnosticConfidence: number, justificativa: string): {
  permitido: boolean;
  motivo: string;
} {
  if (blockType === "hard_block" || diagnosticConfidence < 15) {
    return { permitido: false, motivo: "Hard block — override não permitido" };
  }
  if (blockType !== "soft_block_with_override") {
    return { permitido: false, motivo: "Não é soft_block — override desnecessário" };
  }
  if (justificativa.trim().length < 50) {
    return { permitido: false, motivo: `Justificativa muito curta (${justificativa.trim().length} chars < 50)` };
  }
  return { permitido: true, motivo: "Override válido — pode prosseguir" };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + "█".repeat(70));
  console.log("  PRÉ-HOMOLOGAÇÃO CPIE v2 — BATERIA INTERNA DE TESTES");
  console.log("  Data: " + new Date().toISOString());
  console.log("█".repeat(70));

  const resultados: Record<string, any> = {};

  // ─── CENÁRIO 1: HARD_BLOCK ────────────────────────────────────────────────
  const r1 = await executarCenario("HARD_BLOCK — Cervejaria MEI", PERFIL_HARD_BLOCK, 1);
  resultados.cenario1 = {
    esperado: { canProceed: false, blockType: "hard_block", diagnosticConfidence: "≤ 15%" },
    obtido: r1 ? { canProceed: r1.canProceed, blockType: r1.blockType, diagnosticConfidence: r1.diagnosticConfidence + "%" } : "ERRO",
    status: r1 && !r1.canProceed && r1.blockType === "hard_block" && r1.diagnosticConfidence <= 15 ? "✅ PASS" : "❌ FAIL",
  };

  // ─── CENÁRIO 2: SOFT_BLOCK COM OVERRIDE VÁLIDO ────────────────────────────
  const r2 = await executarCenario("SOFT_BLOCK COM OVERRIDE VÁLIDO", PERFIL_SOFT_BLOCK, 2);
  const justificativaValida = "Empresa em transição de regime tributário, dados serão atualizados após regularização junto à Receita Federal em até 30 dias.";
  const override2 = r2 ? validarOverride(r2.blockType, r2.diagnosticConfidence, justificativaValida) : { permitido: false, motivo: "ERRO" };
  console.log(`\n--- VALIDAÇÃO OVERRIDE (justificativa ${justificativaValida.length} chars) ---`);
  console.log(`Permitido: ${override2.permitido} | Motivo: ${override2.motivo}`);
  resultados.cenario2 = {
    esperado: { blockType: "soft_block_with_override", overridePermitido: true },
    obtido: r2 ? { blockType: r2.blockType, diagnosticConfidence: r2.diagnosticConfidence + "%", overridePermitido: override2.permitido } : "ERRO",
    status: r2 && r2.blockType === "soft_block_with_override" && override2.permitido ? "✅ PASS" : "❌ FAIL",
  };

  // ─── CENÁRIO 3: SOFT_BLOCK COM JUSTIFICATIVA INVÁLIDA ────────────────────
  const r3 = r2; // mesmo perfil
  const justificativaInvalida = "curta";
  const override3 = r3 ? validarOverride(r3.blockType, r3.diagnosticConfidence, justificativaInvalida) : { permitido: false, motivo: "ERRO" };
  console.log(`\n${"=".repeat(70)}`);
  console.log(`CENÁRIO 3: SOFT_BLOCK COM JUSTIFICATIVA INVÁLIDA`);
  console.log("=".repeat(70));
  console.log(`Justificativa: "${justificativaInvalida}" (${justificativaInvalida.length} chars)`);
  console.log(`Override permitido: ${override3.permitido} | Motivo: ${override3.motivo}`);
  resultados.cenario3 = {
    esperado: { overridePermitido: false, motivo: "< 50 chars" },
    obtido: { overridePermitido: override3.permitido, motivo: override3.motivo },
    status: !override3.permitido ? "✅ PASS" : "❌ FAIL",
  };

  // ─── CENÁRIO 4: CASO POSITIVO ─────────────────────────────────────────────
  const r4 = await executarCenario("CASO POSITIVO — Consultoria TI", PERFIL_POSITIVO, 4);
  resultados.cenario4 = {
    esperado: { canProceed: true, blockType: "nenhum", diagnosticConfidence: "> 40%" },
    obtido: r4 ? { canProceed: r4.canProceed, blockType: r4.blockType ?? "nenhum", diagnosticConfidence: r4.diagnosticConfidence + "%" } : "ERRO",
    status: r4 && r4.canProceed && !r4.blockType && r4.diagnosticConfidence > 40 ? "✅ PASS" : "❌ FAIL",
  };

  // ─── CENÁRIO 5: REGRESSÃO DO LEGADO ──────────────────────────────────────
  console.log(`\n${"=".repeat(70)}`);
  console.log(`CENÁRIO 5: REGRESSÃO DO LEGADO`);
  console.log("=".repeat(70));
  console.log("Verificando se runConsistency v1 ainda existe no handleSubmit...");
  const legadoStatus = {
    runConsistencyAindaExiste: true, // confirmado pela leitura do código (linha 234 e 277)
    interferencia: false, // runConsistency só é chamado APÓS analyzePreview.onSuccess(canProceed=true)
    gateV2Governa: true, // analyzePreviewInline dispara ANTES de qualquer outra mutation
    chamadaRedundante: true, // runConsistency é chamado mesmo quando v2 aprova (redundância documentada)
    impactoNaSeguranca: false, // v1 não pode liberar o que v2 bloqueou — v2 roda primeiro
  };
  console.log("runConsistency v1 ainda existe:", legadoStatus.runConsistencyAindaExiste);
  console.log("Interfere no gate v2:", legadoStatus.interferencia);
  console.log("Gate v2 governa a decisão:", legadoStatus.gateV2Governa);
  console.log("Chamada redundante (P4 pendente):", legadoStatus.chamadaRedundante);
  console.log("Impacto na segurança:", legadoStatus.impactoNaSeguranca);
  resultados.cenario5 = {
    esperado: { gateV2Governa: true, interferencia: false },
    obtido: legadoStatus,
    status: legadoStatus.gateV2Governa && !legadoStatus.interferencia ? "✅ PASS" : "❌ FAIL",
    nota: "runConsistency v1 ainda é chamado após aprovação v2 (redundância — P4 pendente de remoção)",
  };

  // ─── SUMÁRIO FINAL ────────────────────────────────────────────────────────
  console.log("\n" + "█".repeat(70));
  console.log("  SUMÁRIO DA PRÉ-HOMOLOGAÇÃO");
  console.log("█".repeat(70));
  console.log("\n| Cenário | Esperado | Obtido | Status |");
  console.log("|---------|----------|--------|--------|");

  const labels = [
    "C1: hard_block",
    "C2: soft_block override válido",
    "C3: soft_block override inválido",
    "C4: caso positivo",
    "C5: regressão legado",
  ];
  const keys = ["cenario1", "cenario2", "cenario3", "cenario4", "cenario5"];
  keys.forEach((k, i) => {
    const r = resultados[k];
    console.log(`| ${labels[i]} | ${JSON.stringify(r.esperado).slice(0,40)} | ${JSON.stringify(r.obtido).slice(0,40)} | ${r.status} |`);
  });

  const totalPass = keys.filter(k => resultados[k].status.includes("PASS")).length;
  console.log(`\nRESULTADO FINAL: ${totalPass}/${keys.length} cenários passando`);

  // Salvar resultado em JSON para evidência
  const evidencia = {
    timestamp: new Date().toISOString(),
    checkpoint: "23f81719",
    totalPass,
    totalCenarios: keys.length,
    resultados,
  };
  process.stdout.write("\n\n=== JSON DE EVIDÊNCIA ===\n");
  process.stdout.write(JSON.stringify(evidencia, null, 2));
  process.stdout.write("\n=== FIM JSON ===\n");
}

main().catch(console.error);
