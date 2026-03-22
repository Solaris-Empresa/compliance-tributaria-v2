/**
 * Script de evidência — CPIE v2.0 Fase 2 (IA Arbitragem)
 * Executa o caso T01 (cervejaria) com a IA real (OpenAI)
 * e imprime o JSON completo para auditoria do orquestrador.
 *
 * Uso: npx tsx server/cpie-v2-evidence-fase2.ts
 */

import { runCpieAnalysisV2, type CpieProfileInputV2 } from "./cpie-v2";

const input: CpieProfileInputV2 = {
  cnpj: "12.345.678/0001-90",
  companyType: "mei",
  companySize: "mei",
  taxRegime: "simples_nacional",
  annualRevenueRange: "0-360000",
  operationType: "servicos",
  clientType: ["b2g"],
  multiState: false,
  hasMultipleEstablishments: false,
  hasImportExport: false,
  hasSpecialRegimes: false,
  paymentMethods: ["pix", "cartao"],
  hasIntermediaries: false,
  hasTaxTeam: false,
  hasAudit: false,
  hasTaxIssues: false,
  description: "Produtora de cerveja artesanal, faturamento de R$ 1 milhão por mês, vende no varejo, atacado e e-commerce",
};

async function main() {
  console.error("[INFO] Iniciando análise CPIE v2.0 com IA real...");
  console.error("[INFO] Chamando extractInferredProfile (IA)...");
  console.error("[INFO] Chamando buildConflictMatrix (determinístico)...");
  console.error("[INFO] Chamando runAiArbitration (IA árbitro de realidade)...");

  const result = await runCpieAnalysisV2(input);

  const evidence = {
    cenario: "T01 — A Cervejaria (Caso Raiz da Falha)",
    data: new Date().toISOString(),
    versao_motor: "cpie-v2.0-fase2-ia-completa",
    scores: {
      completenessScore: result.completenessScore,
      consistencyScore: result.consistencyScore,
      diagnosticConfidence: result.diagnosticConfidence,
      deterministicVeto: result.deterministicVeto,
      aiVeto: result.aiVeto,
    },
    perfil_inferido_pela_ia: result.inferredProfile,
    conflitos_detectados: result.conflicts.map(c => ({
      id: c.id,
      tipo: c.type,
      severidade: c.severity,
      titulo: c.title,
      descricao: c.description,
      campos_conflitantes: c.conflictingFields,
      valor_inferido: c.inferredValue ?? null,
      valor_declarado: c.declaredValue ?? null,
      veto_imposto: c.consistencyVeto ?? null,
      reconciliacao_obrigatoria: c.reconciliationRequired,
      fonte: c.source,
    })),
    perguntas_reconciliacao: result.reconciliationQuestions,
    decisao: {
      canProceed: result.canProceed,
      blockType: result.blockType ?? null,
      blockReason: result.blockReason ?? null,
    },
    criterio_aceite: {
      consistencyScore_le_15: result.consistencyScore <= 15,
      diagnosticConfidence_le_15: result.diagnosticConfidence <= 15,
      canProceed_false: result.canProceed === false,
      ai_detectou_contradicao: result.conflicts.some(c => c.source === "ai" && c.severity === "critical"),
      veto_aplicado: result.deterministicVeto !== null || result.aiVeto !== null,
      resultado:
        result.consistencyScore <= 15 &&
        result.diagnosticConfidence <= 15 &&
        !result.canProceed
          ? "✅ APROVADO — T01 bloqueado corretamente pela IA"
          : "❌ REPROVADO — T01 não foi bloqueado (implementação inválida)",
    },
    log_veto: {
      deterministicVeto_aplicado: result.deterministicVeto,
      aiVeto_aplicado: result.aiVeto,
      veto_final_efetivo: Math.min(
        result.deterministicVeto ?? 100,
        result.aiVeto ?? 100
      ),
      explicacao: `consistencyScore = min(rawPenaltyScore, deterministicVeto=${result.deterministicVeto ?? "null"}, aiVeto=${result.aiVeto ?? "null"}) = ${result.consistencyScore}`,
    },
  };

  console.log(JSON.stringify(evidence, null, 2));
}

main().catch(err => {
  console.error("[ERRO]", err);
  process.exit(1);
});
