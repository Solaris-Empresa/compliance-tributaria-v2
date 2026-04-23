#!/usr/bin/env node
// Archetype validation runner — deterministic evaluator
// Reads a test suite JSON, validates each scenario against core + conditional rules,
// derives blocks, checks expected_arquetipo_minimo, produces PASS/FAIL report + GO/NO-GO verdict.
//
// Usage:  node tests/archetype-validation/run.mjs [suite.json]
// Exits:  0 on GO (all pass), 1 on NO-GO.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const suitePath = path.resolve(
  process.argv[2] || path.join(__dirname, "M1-arquetipo-go-no-go-brasil-v1.json")
);
const suite = JSON.parse(fs.readFileSync(suitePath, "utf8"));

// ---------- helpers ----------

/** Field is "present" if key exists and value is not undefined/null/empty-string.
 *  Empty arrays count as present (the user explicitly sets `[]` for absence of secondary ops, etc). */
function hasField(input, field) {
  if (!(field in input)) return false;
  const v = input[field];
  if (v === undefined || v === null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return true;
}

/** Parse + evaluate IF-clauses from conditional_rules. Grammar observed:
 *  - `field == true|false`
 *  - `field in ['A','B']`
 *  - `field contains 'X'`
 *  - binary  or  and  (no nesting / no parens)                                   */
function evalCondition(condStr, input) {
  const s = condStr.trim();

  // top-level OR
  if (/\s+or\s+/.test(s)) {
    return s.split(/\s+or\s+/).some((p) => evalCondition(p.trim(), input));
  }
  // top-level AND
  if (/\s+and\s+/.test(s)) {
    return s.split(/\s+and\s+/).every((p) => evalCondition(p.trim(), input));
  }

  // field == true/false
  let m = s.match(/^(\w+)\s*==\s*(true|false)$/);
  if (m) {
    const [, field, val] = m;
    return input[field] === (val === "true");
  }

  // field in [...]
  m = s.match(/^(\w+)\s+in\s+\[(.*)\]$/);
  if (m) {
    const [, field, listStr] = m;
    const list = listStr
      .split(",")
      .map((x) => x.trim().replace(/^['"]|['"]$/g, ""));
    const v = input[field];
    if (Array.isArray(v)) return v.some((x) => list.includes(x));
    return list.includes(v);
  }

  // field contains 'X'
  m = s.match(/^(\w+)\s+contains\s+['"]([^'"]+)['"]$/);
  if (m) {
    const [, field, val] = m;
    const v = input[field];
    if (Array.isArray(v)) return v.includes(val);
    if (typeof v === "string") return v.includes(val);
    return false;
  }

  throw new Error(`Unparseable condition: ${condStr}`);
}

/** Derive which UX blocks should open from the inputs, based on SPEC rules.
 *  This is our best reading of block-opening triggers. */
function deriveOpenBlocks(input) {
  const blocks = new Set();
  if (input.possui_bens === true) blocks.add("ncm");
  if (input.possui_servicos === true) blocks.add("nbs");
  if (input.setor_regulado === true) blocks.add("setor_regulado");
  if (input.atua_importacao === true || input.atua_exportacao === true)
    blocks.add("comercio_exterior");
  if (input.opera_territorio_incentivado === true)
    blocks.add("territorio_incentivado");
  if (input.possui_regime_especial_negocio === true)
    blocks.add("regimes_especiais");
  if (input.possui_filial_outra_uf === true) blocks.add("territorial_expandido");
  // cadeia_operacao: opens for transporte/agro, marketplace, or when operations are multi-component
  const isTransporteOrAgro =
    Array.isArray(input.natureza_operacao_principal) &&
    input.natureza_operacao_principal.some((x) => ["Transporte", "Agro"].includes(x));
  const isMarketplace = input.atua_como_marketplace_plataforma === true;
  const hasHybridOps =
    Array.isArray(input.operacoes_secundarias) &&
    input.operacoes_secundarias.length >= 2;
  if (isTransporteOrAgro || isMarketplace || hasHybridOps)
    blocks.add("cadeia_operacao");
  return blocks;
}

/** Map expected_arquetipo_minimo keys (archetype vocab) to input-form field names. */
const ARQ_TO_INPUT = {
  natureza_da_operacao: "natureza_operacao_principal",
  fontes_de_receita: "fontes_receita",
  tipo_de_objeto_economico: "tipo_objeto_economico",
  posicao_na_cadeia_economica: "posicao_cadeia_economica",
  orgao_regulador: "orgao_regulador_principal",
  subnatureza_setorial: "subnatureza_setorial",
  ncm_produtos: "ncms_principais",
  nbs_servicos: "nbss_principais",
  tipo_territorio_incentivado: "tipo_territorio_incentivado",
  tipo_regime_especial: "tipo_regime_especial",
  papel_no_comercio_exterior: "papel_comercio_exterior",
  porte_empresa: "porte_empresa",
  regime_tributario: "regime_tributario_atual",
  operacoes_secundarias: "operacoes_secundarias",
};

/** Case-insensitive, space/underscore/slash-tolerant string comparison for archetype values. */
function normStr(s) {
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/\//g, "_")
    .replace(/__+/g, "_");
}

function strEq(a, b) {
  return normStr(a) === normStr(b);
}

function arrEq(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
  // subset-of relation: every expected value must exist in actual (case-tolerant)
  return expected.every((e) => actual.some((a) => strEq(e, a)));
}

/** For each archetype-minimum key, verify that inputs carry an equivalent value. */
function validateArchetypeMin(input, expectedMin) {
  const misses = [];
  for (const [expKey, expVal] of Object.entries(expectedMin)) {
    if (expKey === "status_arquetipo") continue;
    const inKey = ARQ_TO_INPUT[expKey] || expKey;
    if (!(inKey in input)) {
      misses.push(`${expKey}: input field "${inKey}" missing`);
      continue;
    }
    const actual = input[inKey];
    if (Array.isArray(expVal)) {
      if (!Array.isArray(actual) || !arrEq(expVal, actual)) {
        misses.push(
          `${expKey}: expected ${JSON.stringify(expVal)} but got ${JSON.stringify(actual)}`
        );
      }
    } else if (typeof expVal === "string") {
      if (!strEq(expVal, actual)) {
        misses.push(
          `${expKey}: expected "${expVal}" but got ${JSON.stringify(actual)}`
        );
      }
    } else if (expVal !== actual) {
      misses.push(
        `${expKey}: expected ${JSON.stringify(expVal)} but got ${JSON.stringify(actual)}`
      );
    }
  }
  return misses;
}

// ---------- run ----------

const results = [];
const allCoreGaps = new Set();
const allCondGaps = new Set();

for (const test of suite.tests) {
  const { input } = test;

  // 1) core_required_fields
  const missCore = suite.core_required_fields.filter((f) => !hasField(input, f));
  missCore.forEach((f) => allCoreGaps.add(f));

  // 2) conditional_rules
  const triggeredRules = [];
  let blocked = false;
  const missCond = [];
  for (const rule of suite.conditional_rules) {
    let fires = false;
    try {
      fires = evalCondition(rule.if, input);
    } catch (e) {
      console.error(`[${test.id}] cannot eval rule "${rule.if}": ${e.message}`);
      fires = false;
    }
    if (!fires) continue;
    triggeredRules.push(rule);
    if (rule.then_block) {
      blocked = true;
    }
    if (rule.then_required) {
      for (const rf of rule.then_required) {
        if (!hasField(input, rf)) {
          missCond.push({ rule: rule.if, field: rf });
          allCondGaps.add(rf);
        }
      }
    }
  }

  // 3) expected_open_blocks vs derived
  const derivedBlocks = deriveOpenBlocks(input);
  const expectedBlocks = new Set(test.expected_open_blocks || []);
  const blocksMissing = [...expectedBlocks].filter((b) => !derivedBlocks.has(b));
  const blocksExtra = [...derivedBlocks].filter((b) => !expectedBlocks.has(b));

  // 4) expected_arquetipo_minimo
  const arqMisses = validateArchetypeMin(input, test.expected_arquetipo_minimo || {});

  // 5) PASS criterion (per user's GO/NO-GO rule):
  //    - no core field missing
  //    - no conditional required field missing
  //    - not unexpectedly blocked
  //    - archetype-minimum values derivable from input
  //    Block mismatches are findings (not PASS gates) — reported as notes.
  const coreOK = missCore.length === 0;
  const condOK = missCond.length === 0;
  const notBlocked = blocked === false; // none of the 15 should trigger multi-CNPJ block
  const arqOK = arqMisses.length === 0;
  const pass = coreOK && condOK && notBlocked && arqOK;
  const statusArquetipo = pass ? "valido" : "incompleto";

  results.push({
    id: test.id,
    scenario: test.scenario_name,
    pass,
    statusArquetipo,
    missCore,
    missCond,
    blocksMissing,
    blocksExtra,
    arqMisses,
    blocked,
    triggeredRules: triggeredRules.map((r) => r.if),
  });
}

// ---------- report ----------

const pad = (s, n) => String(s).padEnd(n);

console.log("\n==============================================================");
console.log(`  Suite: ${suite.suite_name}`);
console.log(`  Executed: ${results.length} scenarios`);
console.log("==============================================================\n");

console.log("RESUMO POR CENÁRIO");
console.log("-".repeat(110));
console.log(
  `| ${pad("ID", 4)} | ${pad("Cenário", 48)} | ${pad("Result", 8)} | ${pad(
    "status",
    10
  )} | Notas |`
);
console.log("-".repeat(110));
for (const r of results) {
  const result = r.pass ? "PASS" : "FAIL";
  const notes = [];
  if (r.missCore.length) notes.push(`core miss: ${r.missCore.join(",")}`);
  if (r.missCond.length)
    notes.push(`cond miss: ${r.missCond.map((m) => m.field).join(",")}`);
  if (r.blocksMissing.length)
    notes.push(`bloco expected mas não derivável: ${r.blocksMissing.join(",")}`);
  if (r.blocksExtra.length)
    notes.push(`bloco deriva mas não declarado: ${r.blocksExtra.join(",")}`);
  if (r.arqMisses.length) notes.push(`arq: ${r.arqMisses.join(" | ")}`);
  if (r.blocked) notes.push("BLOCKED (multi-CNPJ)");
  console.log(
    `| ${pad(r.id, 4)} | ${pad(r.scenario.slice(0, 48), 48)} | ${pad(result, 8)} | ${pad(
      r.statusArquetipo,
      10
    )} | ${notes.join(" / ") || "ok"} |`
  );
}
console.log("-".repeat(110));

console.log("\nGAPS AGREGADOS");
console.log("-".repeat(60));
if (allCoreGaps.size === 0) console.log("  Core: nenhum gap.");
else console.log(`  Core: ${[...allCoreGaps].join(", ")}`);
if (allCondGaps.size === 0) console.log("  Conditional: nenhum gap.");
else console.log(`  Conditional: ${[...allCondGaps].join(", ")}`);

const failCount = results.filter((r) => !r.pass).length;
const allPass = failCount === 0;

console.log("\n==============================================================");
console.log(`  VEREDITO: ${allPass ? "🟢 GO" : "🔴 NO-GO"}`);
console.log(`  PASS: ${results.length - failCount}/${results.length}`);
console.log("==============================================================\n");

if (!allPass) {
  console.log("Cenários que falharam:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  - ${r.id}: ${r.scenario}`);
    if (r.missCore.length) console.log(`      core:  ${r.missCore.join(", ")}`);
    if (r.missCond.length)
      console.log(`      cond:  ${r.missCond.map((m) => `${m.field} (rule: ${m.rule})`).join(" | ")}`);
    if (r.arqMisses.length) console.log(`      arq:   ${r.arqMisses.join(" | ")}`);
    if (r.blocked) console.log(`      block: multi-CNPJ bloqueio inesperado`);
  }
  console.log();
}

// --- findings (not pass/fail but worth flagging) ---
const findings = [];
for (const r of results) {
  if (r.blocksMissing.length || r.blocksExtra.length) {
    findings.push({
      id: r.id,
      missing: r.blocksMissing,
      extra: r.blocksExtra,
    });
  }
}
if (findings.length) {
  console.log("FINDINGS (desalinhamentos entre expected_open_blocks e regras derivadas):");
  for (const f of findings) {
    console.log(`  ${f.id}:`);
    if (f.missing.length)
      console.log(`    expected mas não derivável: ${f.missing.join(", ")}`);
    if (f.extra.length)
      console.log(`    deriva mas não está em expected: ${f.extra.join(", ")}`);
  }
  console.log();
}

process.exit(allPass ? 0 : 1);
