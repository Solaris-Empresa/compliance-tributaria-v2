/**
 * Script de evidência — CPIE v2.0 Fase 1
 * Executa o caso T01 (cervejaria) com as funções determinísticas
 * e imprime o JSON completo para auditoria do orquestrador.
 *
 * Uso: npx tsx server/cpie-v2-evidence.ts
 */

import {
  calcCompletenessScore,
  buildConflictMatrix,
  calcFinalScores,
  type CpieProfileInputV2,
  type InferredProfile,
} from "./cpie-v2";

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

// InferredProfile que seria gerado pela IA (simulado para evidência determinística)
const inferred: InferredProfile = {
  sector: "manufatura/bebidas",
  estimatedMonthlyRevenue: 1_000_000,
  estimatedAnnualRevenue: 12_000_000,
  inferredCompanySize: "media",
  inferredTaxRegime: "lucro_presumido",
  inferredOperationType: "industria",
  inferredClientType: ["b2c", "b2b"],
  inferenceConfidence: 95,
  inferenceNotes: "Produtora de cerveja com R$ 1M/mês implica média empresa com regime lucro presumido",
};

const completenessScore = calcCompletenessScore(input);
const { conflicts, deterministicVeto } = buildConflictMatrix(input, inferred);
const { consistencyScore, diagnosticConfidence } = calcFinalScores(
  completenessScore,
  conflicts,
  deterministicVeto,
  null // aiVeto será adicionado na Fase 2
);

const hasCritical = conflicts.some(c => c.severity === "critical");
const canProceed = diagnosticConfidence >= 15 && !hasCritical;

const evidence = {
  cenario: "T01 — A Cervejaria (Caso Raiz da Falha)",
  data: new Date().toISOString(),
  versao_motor: "cpie-v2.0-fase1",
  entrada: {
    campos_estruturados: input,
    perfil_inferido_simulado: inferred,
  },
  scores: {
    completenessScore,
    consistencyScore,
    diagnosticConfidence,
    deterministicVeto,
    aiVeto: null,
    nota: "aiVeto será adicionado na Fase 2 (IA Arbitragem)",
  },
  conflitos_detectados: conflicts.map(c => ({
    id: c.id,
    tipo: c.type,
    severidade: c.severity,
    titulo: c.title,
    campos_conflitantes: c.conflictingFields,
    veto_imposto: c.consistencyVeto ?? null,
    reconciliacao_obrigatoria: c.reconciliationRequired,
    fonte: c.source,
  })),
  decisao: {
    canProceed,
    blockType: hasCritical ? "hard_block" : (diagnosticConfidence < 15 ? "hard_block" : "none"),
    blockReason: hasCritical
      ? `Conflito crítico: ${conflicts.find(c => c.severity === "critical")?.title}`
      : diagnosticConfidence < 15
      ? `Confiança diagnóstica ${diagnosticConfidence}% < threshold 15%`
      : "Nenhum bloqueio",
  },
  criterio_aceite: {
    consistencyScore_le_15: consistencyScore <= 15,
    diagnosticConfidence_le_15: diagnosticConfidence <= 15,
    canProceed_false: canProceed === false,
    resultado: consistencyScore <= 15 && diagnosticConfidence <= 15 && !canProceed
      ? "✅ APROVADO — T01 bloqueado corretamente"
      : "❌ REPROVADO — T01 não foi bloqueado (implementação inválida)",
  },
};

console.log(JSON.stringify(evidence, null, 2));
