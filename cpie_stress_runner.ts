/**
 * STRESS TEST COMBINATÓRIO — CPIE v2
 * 30 cenários: 10 hard_block + 10 soft_block + 10 positivos
 * Executa o motor diretamente sem HTTP
 */
import { runCpieAnalysisV2 } from "./server/cpie-v2";

interface Scenario {
  id: string;
  label: string;
  expected_block: "hard_block" | "soft_block_with_override" | null;
  expected_cta: string;
  input: Record<string, unknown>;
}

const SCENARIOS: Scenario[] = [
  // ── 10 HARD_BLOCK ──────────────────────────────────────────────────────────
  {
    id: "H01", label: "MEI + Indústria + B2G + R$1M/mês",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "mei", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "4_8m_78m", operationType: "industria",
      clientType: ["b2g"], multiState: true,
      description: "Cervejaria artesanal que vende para prefeituras. Faturamento de R$ 1 milhão por mês." }
  },
  {
    id: "H02", label: "MEI + Indústria + faturamento acima do limite",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "mei", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "acima_78m", operationType: "industria",
      clientType: ["b2b"], multiState: false,
      description: "Fábrica de calçados com 500 funcionários e faturamento de R$ 200 milhões por ano." }
  },
  {
    id: "H03", label: "Simples Nacional + faturamento acima de R$78M",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "ltda", companySize: "media", taxRegime: "simples_nacional",
      annualRevenueRange: "acima_78m", operationType: "comercio",
      clientType: ["b2b"], multiState: true,
      description: "Distribuidora nacional com faturamento de R$ 150 milhões anuais." }
  },
  {
    id: "H04", label: "MEI + SA + Lucro Real — contradição jurídica",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "sa", companySize: "mei", taxRegime: "lucro_real",
      annualRevenueRange: "acima_78m", operationType: "financeiro",
      clientType: ["b2b"], multiState: true,
      description: "Banco de investimentos com ativos de R$ 2 bilhões." }
  },
  {
    id: "H05", label: "MEI + múltiplos estabelecimentos + importação",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "mei", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "4_8m_78m", operationType: "industria",
      clientType: ["b2b", "b2c"], multiState: true,
      hasMultipleEstablishments: true, hasImportExport: true,
      description: "Indústria têxtil com 3 fábricas e importação de insumos da China. Faturamento de R$ 50 milhões." }
  },
  {
    id: "H06", label: "Lucro Real + faturamento abaixo de R$360k",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "lucro_real",
      annualRevenueRange: "ate_360k", operationType: "servicos",
      clientType: ["b2c"], multiState: false,
      description: "Pequena empresa de serviços com faturamento de R$ 200 mil anuais optante pelo Lucro Real obrigatório." }
  },
  {
    id: "H07", label: "MEI + Porte Grande + faturamento bilionário",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "mei", companySize: "grande", taxRegime: "lucro_real",
      annualRevenueRange: "acima_78m", operationType: "industria",
      clientType: ["b2b", "b2g"], multiState: true,
      description: "Empresa com 2000 funcionários e faturamento de R$ 500 milhões por ano." }
  },
  {
    id: "H08", label: "Simples Nacional + B2G + faturamento R$4,8M-78M",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "ltda", companySize: "media", taxRegime: "simples_nacional",
      annualRevenueRange: "4_8m_78m", operationType: "servicos",
      clientType: ["b2g"], multiState: true,
      description: "Empresa de TI com contratos governamentais de R$ 30 milhões anuais no Simples Nacional." }
  },
  {
    id: "H09", label: "MEI + SA + faturamento acima do limite MEI",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "sa", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "comercio",
      clientType: ["b2b"], multiState: false,
      description: "Sociedade anônima com faturamento de R$ 2 milhões anuais." }
  },
  {
    id: "H10", label: "MEI + Indústria pesada + exportação + Drawback",
    expected_block: "hard_block", expected_cta: "Corrigir inconsistências",
    input: { companyType: "mei", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "4_8m_78m", operationType: "industria",
      clientType: ["b2b"], multiState: true,
      hasImportExport: true, hasSpecialRegimes: true,
      description: "Indústria metalúrgica com exportação para Europa e regime Drawback. Faturamento de R$ 40 milhões." }
  },
  // ── 10 SOFT_BLOCK ──────────────────────────────────────────────────────────
  {
    id: "S01", label: "Simples Nacional + B2G + faturamento médio",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2g"], multiState: false,
      description: "Empresa de consultoria com contratos municipais de R$ 1 milhão anuais." }
  },
  {
    id: "S02", label: "Lucro Presumido + porte MEI",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "mei", taxRegime: "lucro_presumido",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b"], multiState: false,
      description: "Empresa de serviços contábeis com faturamento de R$ 1,5 milhão." }
  },
  {
    id: "S03", label: "Simples Nacional + B2G + microempresa",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "micro", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b", "b2g"], multiState: false,
      description: "Microempresa de limpeza com contrato com prefeitura de R$ 500 mil." }
  },
  {
    id: "S04", label: "Lucro Real + porte pequeno + faturamento baixo",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "lucro_real",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b"], multiState: false,
      description: "Pequena empresa de engenharia com faturamento de R$ 3 milhões optante pelo Lucro Real por opção." }
  },
  {
    id: "S05", label: "Simples Nacional + importação + B2B",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "comercio",
      clientType: ["b2b"], multiState: false,
      hasImportExport: true,
      description: "Importadora de eletrônicos com faturamento de R$ 2 milhões no Simples Nacional." }
  },
  {
    id: "S06", label: "Lucro Presumido + porte micro",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "micro", taxRegime: "lucro_presumido",
      annualRevenueRange: "360k_4_8m", operationType: "comercio",
      clientType: ["b2c"], multiState: false,
      description: "Loja de roupas com faturamento de R$ 800 mil optante pelo Lucro Presumido." }
  },
  {
    id: "S07", label: "Simples Nacional + B2G + multiestado",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2g"], multiState: true,
      description: "Empresa de segurança com contratos em 3 estados. Faturamento de R$ 3 milhões." }
  },
  {
    id: "S08", label: "Lucro Real + EIRELI + porte pequena",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "eireli", companySize: "pequena", taxRegime: "lucro_real",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b"], multiState: false,
      description: "Empresa de consultoria jurídica com faturamento de R$ 1,2 milhão optante pelo Lucro Real." }
  },
  {
    id: "S09", label: "Simples Nacional + porte média",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "ltda", companySize: "media", taxRegime: "simples_nacional",
      annualRevenueRange: "4_8m_78m", operationType: "comercio",
      clientType: ["b2b", "b2c"], multiState: true,
      description: "Rede de farmácias com 15 lojas e faturamento de R$ 20 milhões no Simples Nacional." }
  },
  {
    id: "S10", label: "Lucro Presumido + MEI — tipo jurídico incompatível",
    expected_block: "soft_block_with_override", expected_cta: "Justificar e continuar",
    input: { companyType: "mei", companySize: "micro", taxRegime: "lucro_presumido",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2c"], multiState: false,
      description: "Prestador de serviços de TI com faturamento de R$ 600 mil." }
  },
  // ── 10 POSITIVOS ───────────────────────────────────────────────────────────
  {
    id: "P01", label: "LTDA + Simples + Micro + Serviços B2B",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "micro", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b"], multiState: false,
      description: "Empresa de desenvolvimento de software para pequenas empresas. Faturamento de R$ 800 mil anuais com 5 funcionários." }
  },
  {
    id: "P02", label: "LTDA + Lucro Presumido + Pequena + Serviços B2B",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "pequena", taxRegime: "lucro_presumido",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2b"], multiState: false,
      description: "Escritório de contabilidade com 10 funcionários e faturamento de R$ 1,5 milhão anuais." }
  },
  {
    id: "P03", label: "SA + Lucro Real + Grande + Indústria B2B",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "sa", companySize: "grande", taxRegime: "lucro_real",
      annualRevenueRange: "acima_78m", operationType: "industria",
      clientType: ["b2b"], multiState: true,
      hasMultipleEstablishments: true, hasImportExport: true,
      description: "Indústria química com 3 plantas industriais e faturamento de R$ 500 milhões anuais. Exporta para 15 países." }
  },
  {
    id: "P04", label: "MEI + Simples + Serviços B2C local",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "mei", companySize: "mei", taxRegime: "simples_nacional",
      annualRevenueRange: "ate_360k", operationType: "servicos",
      clientType: ["b2c"], multiState: false,
      description: "Cabeleireiro autônomo com salão próprio. Faturamento de R$ 60 mil anuais." }
  },
  {
    id: "P05", label: "LTDA + Lucro Real + Média + Comércio B2B multiestado",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "media", taxRegime: "lucro_real",
      annualRevenueRange: "4_8m_78m", operationType: "comercio",
      clientType: ["b2b"], multiState: true,
      description: "Distribuidora de materiais de construção com operações em 5 estados. Faturamento de R$ 45 milhões." }
  },
  {
    id: "P06", label: "SLU + Simples + Pequena + Serviços B2C",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "slu", companySize: "pequena", taxRegime: "simples_nacional",
      annualRevenueRange: "360k_4_8m", operationType: "servicos",
      clientType: ["b2c"], multiState: false,
      description: "Clínica odontológica com 3 dentistas e faturamento de R$ 900 mil anuais." }
  },
  {
    id: "P07", label: "LTDA + Lucro Presumido + Média + Misto B2B/B2C",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "media", taxRegime: "lucro_presumido",
      annualRevenueRange: "4_8m_78m", operationType: "misto",
      clientType: ["b2b", "b2c"], multiState: true,
      description: "Rede de supermercados com 8 lojas e faturamento de R$ 30 milhões. Vende para consumidores e para restaurantes." }
  },
  {
    id: "P08", label: "SA + Lucro Real + Grande + Financeiro",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "sa", companySize: "grande", taxRegime: "lucro_real",
      annualRevenueRange: "acima_78m", operationType: "financeiro",
      clientType: ["b2b", "b2c"], multiState: true,
      hasSpecialRegimes: true,
      description: "Banco digital com 500 mil clientes e faturamento de R$ 800 milhões anuais." }
  },
  {
    id: "P09", label: "LTDA + Simples + Micro + Comércio B2C local",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "micro", taxRegime: "simples_nacional",
      annualRevenueRange: "ate_360k", operationType: "comercio",
      clientType: ["b2c"], multiState: false,
      description: "Loja de artigos esportivos com faturamento de R$ 250 mil anuais." }
  },
  {
    id: "P10", label: "LTDA + Lucro Real + Grande + Agronegócio B2B",
    expected_block: null, expected_cta: "Avançar para CNAEs",
    input: { companyType: "ltda", companySize: "grande", taxRegime: "lucro_real",
      annualRevenueRange: "acima_78m", operationType: "agronegocio",
      clientType: ["b2b"], multiState: true,
      hasImportExport: true,
      description: "Cooperativa agrícola com 2000 produtores associados e faturamento de R$ 1,2 bilhão anuais. Exporta soja e milho." }
  },
];

async function main() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const s of SCENARIOS) {
    try {
      const result = await runCpieAnalysisV2(s.input as any);
      const obtainedBlock = result.blockType ?? null;
      const match = s.expected_block === obtainedBlock;

      // Validar coerência de interface (regras proibidas)
      const coherenceViolations: string[] = [];
      if (obtainedBlock === "hard_block" && result.canProceed) {
        coherenceViolations.push("hard_block + canProceed=true (PROIBIDO)");
      }
      if (obtainedBlock === null && !result.canProceed) {
        coherenceViolations.push("positivo + canProceed=false (PROIBIDO)");
      }
      if (obtainedBlock === "hard_block" && result.diagnosticConfidence >= 15 && result.consistencyScore > 40) {
        coherenceViolations.push("hard_block com scores altos sem conflito crítico (SUSPEITO)");
      }

      if (match) passed++; else failed++;

      results.push({
        id: s.id,
        label: s.label,
        expected_block: s.expected_block,
        expected_cta: s.expected_cta,
        obtained_block: obtainedBlock,
        obtained_can_proceed: result.canProceed,
        consistency_score: result.consistencyScore,
        diagnostic_confidence: result.diagnosticConfidence,
        completeness_score: result.completenessScore,
        conflicts_count: result.conflicts.length,
        block_reason: result.blockReason ?? null,
        match,
        coherence_ok: coherenceViolations.length === 0,
        coherence_violations: coherenceViolations,
      });
    } catch (e: unknown) {
      failed++;
      results.push({
        id: s.id,
        label: s.label,
        expected_block: s.expected_block,
        error: String(e),
        match: false,
        coherence_ok: false,
      });
    }
  }

  const output = {
    summary: {
      total: SCENARIOS.length,
      passed,
      failed,
      adherence_pct: Math.round((passed / SCENARIOS.length) * 100),
      coherence_violations: results.filter(r => !r.coherence_ok).length,
    },
    results,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(console.error);
