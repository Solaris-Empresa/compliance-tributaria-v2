#!/usr/bin/env node
// Avaliador determinístico — 50 casos Brasil ponderados por PIB
// Sem LLM · sem inferência livre · só regras declaradas (spec UI v2 + critique)
// Output: JSON no formato exato pedido pelo P.O.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const suite = JSON.parse(
  fs.readFileSync(path.join(__dirname, "M1-arquetipo-50-casos-brasil-v1.json"), "utf8")
);

// ------------ Regras (spec UI v2, Interpretação B user-first) ------------

const SECTOR_AUTO_REG = ["Saude", "Financeiro", "Energia/Combustiveis", "Transporte", "Agro"];
const CADEIA_PRIMARIA = ["Transporte", "Agro", "Plataforma digital"];
const CADEIA_SECUNDARIA_NATUREZAS = ["Comercio", "Energia/Combustiveis"];
const CADEIA_SECUNDARIA_OPS = ["Logistica", "Transporte"];

function contains(arr, needle) {
  if (!Array.isArray(arr)) return false;
  const n = String(needle).toLowerCase();
  return arr.some((x) => String(x).toLowerCase().includes(n));
}

function intersects(arr, list) {
  if (!Array.isArray(arr)) return false;
  return arr.some((x) => list.includes(x));
}

function isEmpty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function has(obj, field) {
  return field in obj && !isEmpty(obj[field]);
}

// ------------ Derivação de blocos (spec UI v2) ------------

function deriveOpenBlocks(seed) {
  const opened = [];

  // NCM: tipo_objeto_economico contém 'bens' OU possui_bens=true (alinhar N14)
  if (
    (seed.possui_bens === true) ||
    contains(seed.tipo_objeto_economico, "bens")
  ) opened.push("NCM");

  // NBS: tipo_objeto_economico contém 'servicos' OU possui_servicos=true
  if (
    (seed.possui_servicos === true) ||
    contains(seed.tipo_objeto_economico, "servicos")
  ) opened.push("NBS");

  // TERRITORIAL_EXPANDIDO: multiestado=true
  if (seed.opera_multiplos_estados === true) opened.push("TERRITORIAL_EXPANDIDO");

  // REGULATORIO: setor_regulado=true (Interp. B)
  if (seed.setor_regulado === true) opened.push("REGULATORIO");

  // COMERCIO_EXTERIOR: import OR export
  if (seed.atua_importacao === true || seed.atua_exportacao === true) opened.push("COMERCIO_EXTERIOR");

  // TERRITORIO_INCENTIVADO
  if (seed.opera_territorio_incentivado === true) opened.push("TERRITORIO_INCENTIVADO");

  // REGIMES_ESPECIAIS
  if (seed.possui_regime_especial_negocio === true) opened.push("REGIMES_ESPECIAIS");

  // CADEIA_OPERACIONAL (formalização R5 da crítica)
  const natureza = seed.natureza_operacao_principal || [];
  const ops = seed.operacoes_secundarias || [];
  const isCadeia =
    intersects(natureza, CADEIA_PRIMARIA) ||
    seed.atua_como_marketplace_plataforma === true ||
    (intersects(natureza, CADEIA_SECUNDARIA_NATUREZAS) && intersects(ops, CADEIA_SECUNDARIA_OPS));
  if (isCadeia) opened.push("CADEIA_OPERACIONAL");

  return opened;
}

// ------------ Blocking rules (spec UI v2) ------------

function checkBlockers(seed) {
  const triggered = [];

  // V-01: possui_bens=true AND ncm IS EMPTY
  if (seed.possui_bens === true && isEmpty(seed.ncms_principais)) {
    triggered.push({ id: "V-01", rule: "possui_bens=true AND ncms_principais IS EMPTY", severity: "HARD_BLOCK" });
  }
  // V-02: possui_servicos=true AND nbs IS EMPTY
  if (seed.possui_servicos === true && isEmpty(seed.nbss_principais)) {
    triggered.push({ id: "V-02", rule: "possui_servicos=true AND nbss_principais IS EMPTY", severity: "HARD_BLOCK" });
  }
  // V-03: import OR export = true AND papel_comercio_exterior IS EMPTY
  if ((seed.atua_importacao === true || seed.atua_exportacao === true) && isEmpty(seed.papel_comercio_exterior)) {
    triggered.push({ id: "V-03", rule: "atua_importacao|atua_exportacao=true AND papel_comercio_exterior IS EMPTY", severity: "HARD_BLOCK" });
  }
  // V-04: setor_regulado=true AND subnatureza_setorial IS EMPTY
  if (seed.setor_regulado === true && isEmpty(seed.subnatureza_setorial)) {
    triggered.push({ id: "V-04", rule: "setor_regulado=true AND subnatureza_setorial IS EMPTY", severity: "HARD_BLOCK" });
  }
  // V-05: integra_grupo_economico=true AND analise_1_cnpj_operacional=false
  if (seed.integra_grupo_economico === true && seed.analise_1_cnpj_operacional === false) {
    triggered.push({ id: "V-05", rule: "integra_grupo_economico=true AND analise_1_cnpj_operacional=false", severity: "BLOCK_FLOW" });
  }

  return triggered;
}

// ------------ Missing fields (core + conditional do bloco) ------------

const ARCHETYPE_FIELDS_18 = [
  "natureza_da_operacao",
  "fontes_de_receita",
  "tipo_de_objeto_economico",
  "posicao_na_cadeia_economica",
  "cnae_principal_confirmado",
  "ncm_produtos",
  "nbs_servicos",
  "abrangencia_territorial",
  "regime_tributario",
  "porte_empresa",
  "orgao_regulador",
  "subnatureza_setorial",
  "papel_operacional",
  "tipo_operacao_especifica",
  "papel_comercio_exterior",
  "tipo_territorio_incentivado",
  "tipo_regime_especial",
  "status_arquetipo",
];

// Mapa seed→arquétipo (fonte da verdade)
const SEED_TO_ARCH = {
  natureza_da_operacao: "natureza_operacao_principal",
  fontes_de_receita: "fontes_receita",
  tipo_de_objeto_economico: "tipo_objeto_economico",
  posicao_na_cadeia_economica: "posicao_na_cadeia_economica",
  cnae_principal_confirmado: "cnae_principal_confirmado",
  ncm_produtos: "ncms_principais",
  nbs_servicos: "nbss_principais",
  abrangencia_territorial: "abrangencia_operacional",
  regime_tributario: "regime_tributario_atual",
  porte_empresa: "porte_empresa",
  orgao_regulador: "orgao_regulador_principal",
  subnatureza_setorial: "subnatureza_setorial",
  papel_operacional: "papel_operacional_especifico",
  tipo_operacao_especifica: "tipo_operacao_especifica",
  papel_comercio_exterior: "papel_comercio_exterior",
  tipo_territorio_incentivado: "tipo_territorio_incentivado",
  tipo_regime_especial: "tipo_regime_especial",
};

function computeMissingFields(seed, openedBlocks) {
  const missing = [];

  // Core: natureza_operacao_principal e fontes_receita sempre críticos
  if (isEmpty(seed.natureza_operacao_principal)) missing.push("natureza_operacao_principal");
  if (isEmpty(seed.fontes_receita)) missing.push("fontes_receita");
  if (isEmpty(seed.tipo_objeto_economico)) missing.push("tipo_objeto_economico");

  // Conditional por bloco
  if (openedBlocks.includes("NCM") && isEmpty(seed.ncms_principais)) missing.push("ncms_principais");
  if (openedBlocks.includes("NBS") && isEmpty(seed.nbss_principais)) missing.push("nbss_principais");
  if (openedBlocks.includes("REGULATORIO")) {
    if (isEmpty(seed.orgao_regulador_principal)) missing.push("orgao_regulador_principal");
    if (isEmpty(seed.subnatureza_setorial)) missing.push("subnatureza_setorial");
    if (isEmpty(seed.tipo_operacao_especifica)) missing.push("tipo_operacao_especifica");
    if (isEmpty(seed.papel_operacional_especifico)) missing.push("papel_operacional_especifico");
  }
  if (openedBlocks.includes("COMERCIO_EXTERIOR") && isEmpty(seed.papel_comercio_exterior)) missing.push("papel_comercio_exterior");
  if (openedBlocks.includes("TERRITORIO_INCENTIVADO") && isEmpty(seed.tipo_territorio_incentivado)) missing.push("tipo_territorio_incentivado");
  if (openedBlocks.includes("REGIMES_ESPECIAIS") && isEmpty(seed.tipo_regime_especial)) missing.push("tipo_regime_especial");

  // Opcionais de arquétipo (não core mas melhoram confidence)
  const optional = ["cnae_principal_confirmado", "abrangencia_operacional", "regime_tributario_atual", "porte_empresa"];
  for (const f of optional) if (isEmpty(seed[f])) missing.push(f);

  return missing;
}

// ------------ Build archetype (função pura) ------------

function buildArchetype(seed, openedBlocks, blockers) {
  const out = {};
  for (const archField of ARCHETYPE_FIELDS_18) {
    if (archField === "status_arquetipo") continue;
    const seedField = SEED_TO_ARCH[archField];
    out[archField] = seed[seedField] ?? null;
  }

  // Determinar status_arquetipo
  const hasHardBlock = blockers.some((b) => b.severity === "HARD_BLOCK");
  const hasBlockFlow = blockers.some((b) => b.severity === "BLOCK_FLOW");

  if (hasBlockFlow) out.status_arquetipo = "bloqueado";
  else if (hasHardBlock) out.status_arquetipo = "incompleto";
  else out.status_arquetipo = "valido";

  return out;
}

// ------------ Confidence score ------------

function computeConfidence(arquetipo) {
  const filled = ARCHETYPE_FIELDS_18.filter(
    (f) => f !== "status_arquetipo" && !isEmpty(arquetipo[f])
  ).length;
  return Number((filled / (ARCHETYPE_FIELDS_18.length - 1)).toFixed(3));
}

// ------------ Status ------------

function determineStatus(arquetipo, blockers, missingFields, seed) {
  // BLOCKED: multi-CNPJ
  if (blockers.some((b) => b.severity === "BLOCK_FLOW")) return "BLOCKED";

  // FAIL: campo core faltando OU blocker HARD_BLOCK com dado insuficiente
  const coreMissing = ["natureza_operacao_principal", "fontes_receita", "tipo_objeto_economico"]
    .some((f) => missingFields.includes(f));
  if (coreMissing) return "FAIL";

  // AMBIGUOUS: blockers hard disparam por ausência de campo não-fornecido no seed (não é erro de entrada)
  // ou multi-setor sem subnatureza resolvida
  const multisetor = Array.isArray(seed.natureza_operacao_principal) && seed.natureza_operacao_principal.length > 1;
  if (blockers.length > 0 || multisetor && isEmpty(seed.subnatureza_setorial)) return "AMBIGUOUS";

  return "PASS";
}

// ------------ Notas contextuais ------------

function generateNotes(seed, arquetipo, status, blockers, openedBlocks) {
  const notes = [];
  const natureza = seed.natureza_operacao_principal || [];

  if (natureza.length > 1) {
    notes.push(`multi-setor (${natureza.length} naturezas): subnatureza_setorial precisaria ser array por setor`);
  }
  if (blockers.some((b) => b.id === "V-05")) {
    notes.push("BLOCKED: empresa integra grupo econômico + análise consolidada — fora do escopo M1 (1 CNPJ)");
  }
  if (blockers.some((b) => b.id === "V-04")) {
    notes.push("setor_regulado=true sem subnatureza_setorial — seed incompleto (gap estrutural na regra N15)");
  }
  if (seed.possui_bens === true && !openedBlocks.includes("NCM")) {
    notes.push("CONFLITO N14: possui_bens=true mas tipo_objeto_economico não contém bens (gatilho NCM divergente)");
  }
  if (seed.atua_como_marketplace_plataforma === true && openedBlocks.includes("CADEIA_OPERACIONAL")) {
    notes.push("marketplace dispara CADEIA_OPERACIONAL; arquétipo não distingue marketplace-puro de marketplace-com-estoque (R9 aberto)");
  }
  if (openedBlocks.includes("TERRITORIO_INCENTIVADO") && openedBlocks.includes("REGIMES_ESPECIAIS")) {
    notes.push("território incentivado + regime especial simultâneos: verificar produto cartesiano (D9)");
  }
  return notes;
}

// ------------ Execução ------------

const results = suite.tests.map((test) => {
  const seed = test.seed_data;
  const openedBlocks = deriveOpenBlocks(seed);
  const blockers = checkBlockers(seed);
  const missingFields = computeMissingFields(seed, openedBlocks);
  const arquetipo = buildArchetype(seed, openedBlocks, blockers);
  const status = determineStatus(arquetipo, blockers, missingFields, seed);
  const confidence = computeConfidence(arquetipo);
  const notes = generateNotes(seed, arquetipo, status, blockers, openedBlocks);

  return {
    id: test.id,
    scenario_name: test.scenario_name,
    status,
    missing_fields: missingFields,
    opened_blocks: openedBlocks,
    blocking_rules_triggered: blockers,
    arquetipo_output: arquetipo,
    confidence_on_archetype_structure: confidence,
    notes,
  };
});

// ------------ Consolidação ------------

const summary = {
  total: results.length,
  by_status: {
    PASS: results.filter((r) => r.status === "PASS").length,
    FAIL: results.filter((r) => r.status === "FAIL").length,
    BLOCKED: results.filter((r) => r.status === "BLOCKED").length,
    AMBIGUOUS: results.filter((r) => r.status === "AMBIGUOUS").length,
  },
  by_macro_setor: {
    servicos: results.filter((r) => r.id.startsWith("S")).length,
    industria: results.filter((r) => r.id.startsWith("I")).length,
    agro: results.filter((r) => r.id.startsWith("A")).length,
  },
  coverage_rules_hit: {
    "bens -> NCM": results.filter((r) => r.opened_blocks.includes("NCM")).length,
    "servicos -> NBS": results.filter((r) => r.opened_blocks.includes("NBS")).length,
    "multiestado -> TERRITORIAL_EXPANDIDO": results.filter((r) => r.opened_blocks.includes("TERRITORIAL_EXPANDIDO")).length,
    "setor_regulado -> REGULATORIO": results.filter((r) => r.opened_blocks.includes("REGULATORIO")).length,
    "import|export -> COMERCIO_EXTERIOR": results.filter((r) => r.opened_blocks.includes("COMERCIO_EXTERIOR")).length,
    "territorio_incentivado -> TERRITORIO_INCENTIVADO": results.filter((r) => r.opened_blocks.includes("TERRITORIO_INCENTIVADO")).length,
    "regime_especial -> REGIMES_ESPECIAIS": results.filter((r) => r.opened_blocks.includes("REGIMES_ESPECIAIS")).length,
    "multi_cnpj -> BLOCK": results.filter((r) => r.blocking_rules_triggered.some((b) => b.id === "V-05")).length,
    "CADEIA_OPERACIONAL": results.filter((r) => r.opened_blocks.includes("CADEIA_OPERACIONAL")).length,
  },
  confidence_stats: {
    mean: Number((results.reduce((acc, r) => acc + r.confidence_on_archetype_structure, 0) / results.length).toFixed(3)),
    min: Math.min(...results.map((r) => r.confidence_on_archetype_structure)),
    max: Math.max(...results.map((r) => r.confidence_on_archetype_structure)),
  },
};

// Decisão GO/NO-GO
const passRate = summary.by_status.PASS / summary.total;
const blockedCount = summary.by_status.BLOCKED;
const failCount = summary.by_status.FAIL;

let verdict = "NO-GO";
let verdict_rationale = [];

if (passRate >= 0.85 && failCount === 0) {
  verdict = "GO";
  verdict_rationale.push(`PASS rate ≥ 85% (${(passRate * 100).toFixed(1)}%)`);
  verdict_rationale.push(`zero FAIL`);
} else {
  verdict_rationale.push(`PASS rate = ${(passRate * 100).toFixed(1)}% ${passRate >= 0.85 ? "(ok)" : "(< 85% alvo)"}`);
  verdict_rationale.push(`${failCount} FAIL (esperado: 0)`);
  verdict_rationale.push(`${blockedCount} BLOCKED (esperado: 1 — controle negativo)`);
  verdict_rationale.push(`${summary.by_status.AMBIGUOUS} AMBIGUOUS`);
}

const finalOutput = {
  suite_name: suite.suite_name,
  phase: suite.phase,
  executed_at: new Date().toISOString(),
  summary,
  verdict: {
    decision: verdict,
    rationale: verdict_rationale,
  },
  results,
};

// Imprimir JSON único como saída
process.stdout.write(JSON.stringify(finalOutput, null, 2));
