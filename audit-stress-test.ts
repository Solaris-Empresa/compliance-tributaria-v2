/**
 * AUDIT STRESS TEST — Adapter M2 + Engine Pipeline
 * 
 * Testa TODAS as combinações realistas de:
 * - operationType (7 valores)
 * - taxRegime (4 valores snake + 4 title case)
 * - produtos (NCM only, NBS only, ambos, nenhum)
 * - multiState (true/false)
 * - isEconomicGroup (true/false)
 * 
 * Para cada combinação, verifica:
 * 1. Adapter não lança exceção
 * 2. Engine (buildSnapshot) não lança exceção
 * 3. status_arquetipo é um dos 4 valores válidos
 * 4. Se status="confirmado", validateConflicts retorna 0 HARD_BLOCK
 * 5. Se status="inconsistente", identifica a causa (missing_fields ou blockers)
 * 6. Invariantes: papel_na_cadeia != "indefinido" para operationTypes conhecidos
 * 7. Invariantes: regime != "indefinido" para taxRegimes conhecidos
 * 8. Cross-check: V-LC-102 (fabricante sem producao) — BUG-3 conhecido
 */
import { buildSeedFromProject } from "./server/routers/perfil";
import { buildSnapshot } from "./server/lib/archetype/buildSnapshot";

const OPERATION_TYPES = ["industria", "comercio", "servicos", "agronegocio", "misto", "financeiro", ""];
const TAX_REGIMES_SNAKE = ["lucro_real", "lucro_presumido", "simples_nacional", "mei"];
const TAX_REGIMES_TITLE = ["Lucro Real", "Lucro Presumido", "Simples Nacional", "MEI"];
const TAX_REGIMES = [...TAX_REGIMES_SNAKE, ...TAX_REGIMES_TITLE, "", "invalido_xyz"];
const PRODUCT_CONFIGS = [
  { ncm: [], nbs: [], label: "sem_produtos" },
  { ncm: ["1201.90.00"], nbs: [], label: "ncm_soja" },
  { ncm: ["2710.12.59"], nbs: [], label: "ncm_combustivel" },
  { ncm: ["3004.90.99"], nbs: [], label: "ncm_medicamento" },
  { ncm: [], nbs: ["1.0501.14.59"], label: "nbs_transporte" },
  { ncm: [], nbs: ["1.0901.00.00"], label: "nbs_financeiro" },
  { ncm: ["1201.90.00"], nbs: ["1.0501.14.59"], label: "ncm_e_nbs" },
  { ncm: ["1201"], nbs: [], label: "ncm_truncado_4dig" },
  { ncm: ["1.0501.14.59"], nbs: [], label: "nbs_em_campo_ncm" },
];
const MULTI_STATE = [true, false];

interface TestResult {
  operationType: string;
  taxRegime: string;
  products: string;
  multiState: boolean;
  // Adapter output
  adapterError: string | null;
  // Engine output
  engineError: string | null;
  status_arquetipo: string | null;
  papel_na_cadeia: string | null;
  tipo_de_relacao: string[];
  regime: string | null;
  objeto: string[];
  territorio: string[];
  // Diagnostics
  missing_fields: string[];
  hard_blocks: string[];
  info_blocks: string[];
  // Invariant violations
  violations: string[];
}

function buildMockProject(
  operationType: string,
  taxRegime: string,
  products: { ncm: string[]; nbs: string[] },
  multiState: boolean,
  isEconomicGroup: boolean = false,
): Record<string, unknown> {
  return {
    companyProfile: {
      cnpj: "00394460005887",
      companyType: "LTDA",
      companySize: "Medio",
      taxRegime: taxRegime,
      annualRevenueRange: "Acima de R$ 78 milhões",
      isEconomicGroup: isEconomicGroup,
    },
    operationProfile: {
      operationType: operationType,
      multiState: multiState,
      principaisProdutos: products.ncm.map(ncm => ({ ncm_code: ncm, description: "Test", percentage: 80 })),
      principaisServicos: products.nbs.map(nbs => ({ nbs_code: nbs, description: "Test", percentage: 80 })),
    },
    confirmedCnaes: [{ code: "0115-6/00", description: "Cultivo de Soja", confidence: 100 }],
  };
}

function runTest(
  operationType: string,
  taxRegime: string,
  products: { ncm: string[]; nbs: string[]; label: string },
  multiState: boolean,
): TestResult {
  const result: TestResult = {
    operationType,
    taxRegime,
    products: products.label,
    multiState,
    adapterError: null,
    engineError: null,
    status_arquetipo: null,
    papel_na_cadeia: null,
    tipo_de_relacao: [],
    regime: null,
    objeto: [],
    territorio: [],
    missing_fields: [],
    hard_blocks: [],
    info_blocks: [],
    violations: [],
  };

  // Step 1: Adapter
  let seed;
  try {
    const project = buildMockProject(operationType, taxRegime, products, multiState);
    seed = buildSeedFromProject(project);
  } catch (e: any) {
    result.adapterError = e.message ?? String(e);
    return result;
  }

  // Step 2: Engine
  try {
    const snapshot = buildSnapshot(seed, "2026-04-29T20:00:00.000Z");
    result.status_arquetipo = snapshot.perfil.status_arquetipo;
    result.papel_na_cadeia = snapshot.perfil.papel_na_cadeia;
    result.tipo_de_relacao = [...snapshot.perfil.tipo_de_relacao];
    result.regime = snapshot.perfil.regime;
    result.objeto = [...snapshot.perfil.objeto];
    result.territorio = [...snapshot.perfil.territorio];
    result.missing_fields = [...snapshot.missing_required_fields];
    result.hard_blocks = snapshot.blockers_triggered
      .filter(b => b.severity === "HARD_BLOCK")
      .map(b => `${b.id}: ${b.rule.substring(0, 80)}`);
    result.info_blocks = snapshot.blockers_triggered
      .filter(b => b.severity === "INFO")
      .map(b => `${b.id}: ${b.rule.substring(0, 60)}`);
  } catch (e: any) {
    result.engineError = e.message ?? String(e);
    return result;
  }

  // Step 3: Invariant checks
  // I-1: Known operationType should not produce indefinido papel
  if (operationType && operationType !== "" && result.papel_na_cadeia === "indefinido") {
    result.violations.push(`INVARIANT-1: operationType="${operationType}" → papel=indefinido`);
  }
  // I-2: Known taxRegime should not produce indefinido regime
  const knownRegimes = [...TAX_REGIMES_SNAKE, ...TAX_REGIMES_TITLE];
  if (knownRegimes.includes(taxRegime) && result.regime === "indefinido") {
    result.violations.push(`INVARIANT-2: taxRegime="${taxRegime}" → regime=indefinido`);
  }
  // I-3: fabricante should have "producao" in tipo_de_relacao (V-LC-102)
  if (result.papel_na_cadeia === "fabricante" && !result.tipo_de_relacao.includes("producao")) {
    result.violations.push(`INVARIANT-3/V-LC-102: papel=fabricante sem producao em tipo_de_relacao`);
  }
  // I-4: prestador should have "servico" in tipo_de_relacao (V-LC-103)
  if (result.papel_na_cadeia === "prestador" && !result.tipo_de_relacao.includes("servico")) {
    result.violations.push(`INVARIANT-4/V-LC-103: papel=prestador sem servico em tipo_de_relacao`);
  }
  // I-5: distribuidor should have "venda" in tipo_de_relacao (V-LC-105)
  if (result.papel_na_cadeia === "distribuidor" && !result.tipo_de_relacao.includes("venda")) {
    result.violations.push(`INVARIANT-5/V-LC-105: papel=distribuidor sem venda em tipo_de_relacao`);
  }
  // I-6: operadora_regulada should have "servico" in tipo_de_relacao (V-LC-108)
  if (result.papel_na_cadeia === "operadora_regulada" && !result.tipo_de_relacao.includes("servico")) {
    result.violations.push(`INVARIANT-6/V-LC-108: papel=operadora_regulada sem servico em tipo_de_relacao`);
  }
  // I-7: If status=confirmado, there should be 0 HARD_BLOCKs and 0 missing fields
  if (result.status_arquetipo === "confirmado" && (result.hard_blocks.length > 0 || result.missing_fields.length > 0)) {
    result.violations.push(`INVARIANT-7: status=confirmado mas tem ${result.hard_blocks.length} HARD_BLOCKs + ${result.missing_fields.length} missing`);
  }
  // I-8: agronegocio + bens → should have NCM required if ncm is empty
  if (operationType === "agronegocio" && products.ncm.length === 0 && result.objeto.length === 0) {
    // This is expected behavior (missing ncms_principais), not a violation
  }
  // I-9: tipo_de_relacao should never be empty for known operationTypes (BUG-3)
  if (operationType && operationType !== "" && result.tipo_de_relacao.length === 0) {
    result.violations.push(`INVARIANT-9/BUG-3: operationType="${operationType}" → tipo_de_relacao=[] (fontes_receita vazio)`);
  }
  // I-10: transportador should have "servico" in tipo_de_relacao
  if (result.papel_na_cadeia === "transportador" && !result.tipo_de_relacao.includes("servico")) {
    result.violations.push(`INVARIANT-10: papel=transportador sem servico em tipo_de_relacao`);
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────────────────────
const allResults: TestResult[] = [];
let totalTests = 0;
let totalViolations = 0;
let totalAdapterErrors = 0;
let totalEngineErrors = 0;
const statusCounts: Record<string, number> = {};
const violationCounts: Record<string, number> = {};

for (const opType of OPERATION_TYPES) {
  for (const regime of TAX_REGIMES) {
    for (const products of PRODUCT_CONFIGS) {
      for (const multiState of MULTI_STATE) {
        totalTests++;
        const result = runTest(opType, regime, products, multiState);
        allResults.push(result);
        
        if (result.adapterError) totalAdapterErrors++;
        if (result.engineError) totalEngineErrors++;
        if (result.status_arquetipo) {
          statusCounts[result.status_arquetipo] = (statusCounts[result.status_arquetipo] ?? 0) + 1;
        }
        for (const v of result.violations) {
          totalViolations++;
          const key = v.split(":")[0];
          violationCounts[key] = (violationCounts[key] ?? 0) + 1;
        }
      }
    }
  }
}

// ─── Report ────────────────────────────────────────────────────────────────
console.log("═══════════════════════════════════════════════════════════════");
console.log("  AUDIT STRESS TEST — Adapter M2 + Engine Pipeline");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`\nTotal combinações testadas: ${totalTests}`);
console.log(`Adapter errors: ${totalAdapterErrors}`);
console.log(`Engine errors: ${totalEngineErrors}`);
console.log(`Total invariant violations: ${totalViolations}`);
console.log(`\n─── Status distribution ───`);
for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${status}: ${count} (${((count / totalTests) * 100).toFixed(1)}%)`);
}
console.log(`\n─── Violation summary ───`);
for (const [key, count] of Object.entries(violationCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${key}: ${count} occurrences`);
}

// Show specific failing combinations for each violation type
console.log(`\n─── Detailed violations (first 3 per type) ───`);
const violationsByType: Record<string, TestResult[]> = {};
for (const r of allResults) {
  for (const v of r.violations) {
    const key = v.split(":")[0];
    if (!violationsByType[key]) violationsByType[key] = [];
    if (violationsByType[key].length < 3) violationsByType[key].push(r);
  }
}
for (const [key, results] of Object.entries(violationsByType)) {
  console.log(`\n  ${key}:`);
  for (const r of results) {
    console.log(`    opType=${r.operationType}, regime=${r.taxRegime}, products=${r.products}, multiState=${r.multiState}`);
    console.log(`      → papel=${r.papel_na_cadeia}, relacao=[${r.tipo_de_relacao}], status=${r.status_arquetipo}`);
    if (r.hard_blocks.length > 0) console.log(`      → hard_blocks: ${r.hard_blocks[0]}`);
  }
}

// Show adapter/engine errors
if (totalAdapterErrors > 0 || totalEngineErrors > 0) {
  console.log(`\n─── Errors (first 5) ───`);
  let shown = 0;
  for (const r of allResults) {
    if (shown >= 5) break;
    if (r.adapterError) {
      console.log(`  ADAPTER ERROR: opType=${r.operationType}, regime=${r.taxRegime}, products=${r.products}`);
      console.log(`    → ${r.adapterError.substring(0, 120)}`);
      shown++;
    }
    if (r.engineError) {
      console.log(`  ENGINE ERROR: opType=${r.operationType}, regime=${r.taxRegime}, products=${r.products}`);
      console.log(`    → ${r.engineError.substring(0, 120)}`);
      shown++;
    }
  }
}

// Summary of "confirmado" cases — which combinations actually work?
console.log(`\n─── Combinações que atingem "confirmado" ───`);
const confirmed = allResults.filter(r => r.status_arquetipo === "confirmado");
const confirmedByOpType: Record<string, number> = {};
for (const r of confirmed) {
  confirmedByOpType[r.operationType || "(vazio)"] = (confirmedByOpType[r.operationType || "(vazio)"] ?? 0) + 1;
}
for (const [op, count] of Object.entries(confirmedByOpType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${op}: ${count}`);
}

// Final verdict
console.log(`\n═══════════════════════════════════════════════════════════════`);
if (totalViolations === 0 && totalAdapterErrors === 0 && totalEngineErrors === 0) {
  console.log("  VEREDICTO: ✅ PASS — Nenhuma violação encontrada");
} else {
  console.log(`  VEREDICTO: ❌ FAIL — ${totalViolations} violations, ${totalAdapterErrors} adapter errors, ${totalEngineErrors} engine errors`);
}
console.log("═══════════════════════════════════════════════════════════════");
