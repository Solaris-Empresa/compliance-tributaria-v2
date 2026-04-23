#!/usr/bin/env node
// UI Matrix Validator — valida a matriz de comportamento UI declarada pelo P.O.
// contra as próprias regras da Seção 2 (regras de abertura de blocos).
// Detecta: inconsistências, regras faltando, ambiguidades, bloqueios mal sinalizados.
//
// Usage:  node tests/archetype-validation/run-ui-matrix.mjs

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const suite = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "M1-arquetipo-go-no-go-brasil-v1.json"),
    "utf8"
  )
);

// ---------- Matriz declarada pelo P.O. (Seção 3.1) ----------
// Colunas: ncm, nbs, terr, cad, reg, ext, rev
// Valor: true = ✓ abre, false = - não abre
const matrixDeclared = {
  T01: { ncm: false, nbs: true, terr: true, cad: false, reg: true, ext: false, rev: true, result: "valido" },
  T02: { ncm: true, nbs: false, terr: false, cad: false, reg: true, ext: false, rev: true, result: "valido" },
  T03: { ncm: true, nbs: false, terr: true, cad: true, reg: true, ext: true, rev: true, result: "valido" },
  T04: { ncm: true, nbs: true, terr: true, cad: true, reg: true, ext: false, rev: true, result: "valido" },
  T05: { ncm: false, nbs: true, terr: true, cad: true, reg: true, ext: false, rev: true, result: "valido" },
  T06: { ncm: true, nbs: false, terr: true, cad: false, reg: false, ext: true, rev: true, result: "valido" },
  T07: { ncm: true, nbs: false, terr: true, cad: true, reg: true, ext: true, rev: true, result: "valido" },
  T08: { ncm: true, nbs: false, terr: true, cad: false, reg: false, ext: false, rev: true, result: "valido" },
  T09: { ncm: true, nbs: false, terr: true, cad: false, reg: false, ext: false, rev: true, result: "valido" },
  T10: { ncm: false, nbs: true, terr: true, cad: false, reg: false, ext: false, rev: true, result: "valido" },
  T11: { ncm: true, nbs: false, terr: true, cad: false, reg: false, ext: false, rev: true, result: "valido" },
  T12: { ncm: true, nbs: false, terr: true, cad: false, reg: false, ext: true, rev: true, result: "valido" },
  T13: { ncm: true, nbs: false, terr: false, cad: false, reg: false, ext: false, rev: true, result: "valido" },
  T14: { ncm: false, nbs: true, terr: true, cad: true, reg: false, ext: false, rev: true, result: "valido" },
  T15: { ncm: true, nbs: true, terr: true, cad: true, reg: false, ext: false, rev: true, result: "valido" },
};

// ---------- Regras de abertura derivadas da Seção 2 da spec UI ----------
// Cada regra retorna { open: boolean, rationale: string }
const SECTOR_AUTO_REG = ["Saude", "Financeiro", "Energia/Combustiveis", "Transporte", "Agro"];

function openBlocks(input) {
  const b = {};

  // ncm
  b.ncm = input.possui_bens === true;

  // nbs
  b.nbs = input.possui_servicos === true;

  // territorial_expandido: Seção 2 diz "multiestado = sim → abrir bloco territorial expandido"
  b.terr = input.opera_multiplos_estados === true;

  // setor_regulado (REG): Seção 2 diz duas regras (1) setor_regulado=sim (2) natureza setorial = saúde/fin/en/trans/agro
  const hasSectorAuto =
    Array.isArray(input.natureza_operacao_principal) &&
    input.natureza_operacao_principal.some((n) => SECTOR_AUTO_REG.includes(n));
  const explicit = input.setor_regulado === true;
  // INTERPRETAÇÃO A (estrita): regra 2 abre REG mesmo que usuário marque setor=false
  //   → regra da spec literal "mesmo sem inferência livre"
  b.reg_strict = hasSectorAuto || explicit;
  // INTERPRETAÇÃO B (user-first): só abre se usuário marcou setor=true (natureza só pré-preenche)
  b.reg_loose = explicit;

  // comércio exterior / territórios especiais (EXT): Seção 2 diz "importa/exporta=sim OR territorio_incentivado=sim"
  b.ext = input.atua_importacao === true || input.atua_exportacao === true || input.opera_territorio_incentivado === true;

  // cadeia/operação específica (CAD): spec diz "operação mista/híbrida → abrir"
  // Tentativa de formalização baseada nos casos: abrir se (natureza multi) OR (marketplace) OR
  //   (natureza ∈ {Transporte, Agro, Plataforma digital}) OR (operacao_secundaria contém Logistica/Transporte e natureza ∈ Comercio/Energia)
  const natureza = input.natureza_operacao_principal || [];
  const ops = input.operacoes_secundarias || [];
  const isMarketplace = input.atua_como_marketplace_plataforma === true;
  const isCadeiaTrigger =
    natureza.some((n) => ["Transporte", "Agro", "Plataforma digital"].includes(n)) ||
    isMarketplace ||
    (natureza.some((n) => ["Comercio", "Energia/Combustiveis"].includes(n)) &&
      ops.some((o) => ["Logistica", "Transporte"].includes(o)));
  b.cad = isCadeiaTrigger;

  // T7 specifically territorial — regime especial não está na Seção 2 da UI spec, mas aparece em case 3 (matrix)
  // Flag separada para ver se regime_especial deveria abrir algo
  b.regime_especial = input.possui_regime_especial_negocio === true;

  // bloqueio multi-CNPJ
  b.bloqueio_multi_cnpj = input.integra_grupo_economico === true && input.analise_1_cnpj_operacional === false;

  // rev sempre abre
  b.rev = true;
  return b;
}

// ---------- Execução ----------
console.log("==============================================================");
console.log("  UI MATRIX VALIDATOR — Seção 2 regras vs matriz declarada");
console.log("==============================================================\n");

const issues = [];
const perCase = [];

for (const test of suite.tests) {
  const id = test.id;
  const input = test.input;
  const declared = matrixDeclared[id];
  if (!declared) continue;

  const derived = openBlocks(input);

  const caseIssues = [];

  // Comparações bloco a bloco
  // NCM
  if (derived.ncm !== declared.ncm) {
    caseIssues.push({
      block: "ncm",
      declared: declared.ncm,
      derived: derived.ncm,
      note: `possui_bens=${input.possui_bens}`,
    });
  }
  // NBS
  if (derived.nbs !== declared.nbs) {
    caseIssues.push({
      block: "nbs",
      declared: declared.nbs,
      derived: derived.nbs,
      note: `possui_servicos=${input.possui_servicos}`,
    });
  }
  // TERR
  if (derived.terr !== declared.terr) {
    caseIssues.push({
      block: "terr",
      declared: declared.terr,
      derived: derived.terr,
      note: `opera_multiplos_estados=${input.opera_multiplos_estados}`,
    });
  }
  // REG — compara 2 interpretações
  if (derived.reg_strict !== declared.reg) {
    if (derived.reg_loose !== declared.reg) {
      // ambas interpretações divergem
      caseIssues.push({
        block: "reg",
        declared: declared.reg,
        derived_strict: derived.reg_strict,
        derived_loose: derived.reg_loose,
        note: `setor_regulado=${input.setor_regulado}, natureza=${JSON.stringify(input.natureza_operacao_principal)}, autosector=${derived.reg_strict && !input.setor_regulado}`,
      });
    } else {
      // loose bate, strict não — matriz confirma interpretação B
      if (!input._interp_noted) {
        caseIssues.push({
          block: "reg",
          declared: declared.reg,
          derived_strict: derived.reg_strict,
          derived_loose: derived.reg_loose,
          note: `AMBIGUIDADE RESOLVIDA POR MATRIZ: Interpretação B (user-first) prevalece — natureza setorial NÃO abre REG se setor_regulado=false. Caso: natureza=${JSON.stringify(input.natureza_operacao_principal)}, setor=${input.setor_regulado}`,
        });
      }
    }
  }
  // EXT
  if (derived.ext !== declared.ext) {
    caseIssues.push({
      block: "ext",
      declared: declared.ext,
      derived: derived.ext,
      note: `importa=${input.atua_importacao}, exporta=${input.atua_exportacao}, incentivado=${input.opera_territorio_incentivado}, regime_especial=${input.possui_regime_especial_negocio} [regime_especial NÃO está em Seção 2 como trigger EXT]`,
    });
  }
  // CAD
  if (derived.cad !== declared.cad) {
    caseIssues.push({
      block: "cad",
      declared: declared.cad,
      derived: derived.cad,
      note: `natureza=${JSON.stringify(input.natureza_operacao_principal)}, ops_sec=${JSON.stringify(input.operacoes_secundarias)}, marketplace=${input.atua_como_marketplace_plataforma}`,
    });
  }

  if (caseIssues.length > 0) {
    issues.push({ id, scenario: test.scenario_name, caseIssues });
  }
  perCase.push({ id, scenario: test.scenario_name, derived, declared, matches: caseIssues.length === 0 });
}

// ---------- Relatório ----------

console.log("RESUMO POR CENÁRIO (matrix declarada vs regras derivadas)");
console.log("-".repeat(78));
for (const c of perCase) {
  const status = c.matches ? "OK" : "DIVERGE";
  console.log(`${c.id} ${status.padEnd(8)} ${c.scenario.slice(0, 60)}`);
}

if (issues.length === 0) {
  console.log("\n🟢 Nenhuma divergência entre a matriz declarada e as regras da Seção 2.\n");
} else {
  console.log(`\n🔴 ${issues.length} cenário(s) com divergência:\n`);
  for (const i of issues) {
    console.log(`▶ ${i.id} — ${i.scenario}`);
    for (const ci of i.caseIssues) {
      if ("derived" in ci) {
        console.log(`   [${ci.block}] declarado=${ci.declared} | derivado=${ci.derived}`);
      } else {
        console.log(
          `   [${ci.block}] declarado=${ci.declared} | strict=${ci.derived_strict} | loose=${ci.derived_loose}`
        );
      }
      console.log(`     ${ci.note}`);
    }
    console.log();
  }
}

console.log("\n==============================================================");
console.log("  COMBINAÇÕES / EDGE CASES (fora dos 15 do P.O.)");
console.log("==============================================================\n");

const edgeCases = [
  {
    id: "E01",
    name: "Bloqueio multi-CNPJ: grupo econômico + análise não-1-CNPJ",
    input: {
      ...suite.tests[0].input,
      integra_grupo_economico: true,
      analise_1_cnpj_operacional: false,
      nivel_analise: "CNPJ consolidado do grupo",
    },
    expect: { bloqueio: true },
  },
  {
    id: "E02",
    name: "Grupo econômico mas análise 1 CNPJ (OK, não bloqueia)",
    input: {
      ...suite.tests[0].input,
      integra_grupo_economico: true,
      analise_1_cnpj_operacional: true,
    },
    expect: { bloqueio: false },
  },
  {
    id: "E03",
    name: "possui_bens=true mas ncms_principais vazio (conditional viola)",
    input: {
      ...suite.tests[1].input,
      possui_bens: true,
      ncms_principais: [],
    },
    expect: { cond_miss: ["ncms_principais"] },
  },
  {
    id: "E04",
    name: "3 setores sobrepostos: saúde + financeiro + tecnologia",
    input: {
      ...suite.tests[0].input,
      natureza_operacao_principal: ["Saude", "Financeiro", "Tecnologia"],
      orgao_regulador_principal: ["ANS", "BACEN"],
      setor_regulado: true,
    },
    expect: { reg_open: true, note: "Quantos órgãos reguladores? Subnatureza para qual setor?" },
  },
  {
    id: "E05",
    name: "Produto cartesiano: Saúde em ZFM (setor + território)",
    input: {
      ...suite.tests[0].input,
      natureza_operacao_principal: ["Saude"],
      opera_territorio_incentivado: true,
      tipo_territorio_incentivado: "Zona Franca de Manaus",
      uf_principal_operacao: "AM",
      setor_regulado: true,
      orgao_regulador_principal: ["ANVISA"],
      possui_regime_especial_negocio: true,
      tipo_regime_especial: ["ZFM", "Saude"],
    },
    expect: { reg: true, ext: true, regime_especial: true, note: "REG + EXT juntos (D9 produto cartesiano)" },
  },
  {
    id: "E06",
    name: "Empresa sem operação declarada (natureza_operacao_principal=[])",
    input: {
      ...suite.tests[8].input,
      natureza_operacao_principal: [],
      operacoes_secundarias: [],
      tipo_objeto_economico: [],
      possui_bens: false,
      possui_servicos: false,
    },
    expect: { core_miss_semantic: true, note: "Nenhum campo estrutural populado — que bloco abre?" },
  },
  {
    id: "E07",
    name: "Transporte de produtos NÃO perigosos (par discriminante do T04)",
    input: {
      ...suite.tests[3].input,
      subnatureza_setorial: "Carga geral",
      orgao_regulador_principal: ["ANTT"],
      tipo_objeto_economico: ["Servicos", "Bens/mercadorias"],
      ncms_principais: ["8471"],
    },
    expect: { reg: true, note: "Arquétipo DEVE sair diferente de T04 — mesmo CNAE base, subnatureza diferente" },
  },
  {
    id: "E08",
    name: "Regime especial monofásico SEM setor regulado nem ZFM",
    input: {
      ...suite.tests[7].input,
      possui_regime_especial_negocio: true,
      tipo_regime_especial: ["Monofasico"],
    },
    expect: { regime_especial: true, note: "onde a UI mostra tipo_regime_especial se não há bloco dedicado?" },
  },
  {
    id: "E09",
    name: "Exportação sem importação (só export)",
    input: {
      ...suite.tests[8].input,
      atua_exportacao: true,
      papel_comercio_exterior: "Exportador",
      abrangencia_operacional: ["Nacional", "Exportacao"],
    },
    expect: { ext: true, note: "Só export — matrix case 7 (Agro) tem T7=✓, validar se aqui também" },
  },
  {
    id: "E10",
    name: "Marketplace que também tem produto físico (híbrido extremo)",
    input: {
      ...suite.tests[13].input,
      possui_bens: true,
      ncms_principais: ["8517"],
      tipo_objeto_economico: ["Servicos", "Direitos/licencas", "Bens/mercadorias"],
    },
    expect: { ncm: true, nbs: true, cad: true, note: "Marketplace + estoque próprio" },
  },
];

for (const e of edgeCases) {
  const b = openBlocks(e.input);
  const cond = suite.conditional_rules;

  // avaliar cond rules
  const missCond = [];
  for (const rule of cond) {
    // re-usar lógica simples inline
    let fires = false;
    const s = rule.if;
    if (/\s+or\s+/.test(s)) {
      fires = s.split(/\s+or\s+/).some((p) => evalSimple(p.trim(), e.input));
    } else if (/\s+and\s+/.test(s)) {
      fires = s.split(/\s+and\s+/).every((p) => evalSimple(p.trim(), e.input));
    } else {
      fires = evalSimple(s, e.input);
    }
    if (!fires) continue;
    if (rule.then_required) {
      for (const rf of rule.then_required) {
        if (!(rf in e.input) || e.input[rf] === undefined || e.input[rf] === null ||
            (typeof e.input[rf] === "string" && e.input[rf].trim() === "") ||
            (Array.isArray(e.input[rf]) && e.input[rf].length === 0 && rf !== "cnaes_secundarios_relevantes" && rf !== "operacoes_secundarias")) {
          missCond.push(rf);
        }
      }
    }
  }

  console.log(`▶ ${e.id} — ${e.name}`);
  console.log(`   Blocos derivados: ncm=${b.ncm} nbs=${b.nbs} terr=${b.terr} cad=${b.cad} reg_strict=${b.reg_strict} reg_loose=${b.reg_loose} ext=${b.ext} regime_esp=${b.regime_especial} bloqueio=${b.bloqueio_multi_cnpj}`);
  if (missCond.length) console.log(`   Cond miss: ${missCond.join(", ")}`);
  console.log(`   Expect note: ${e.expect.note || JSON.stringify(e.expect)}`);
  console.log();
}

function evalSimple(s, input) {
  const trimmed = s.trim();
  let m = trimmed.match(/^(\w+)\s*==\s*(true|false)$/);
  if (m) return input[m[1]] === (m[2] === "true");
  m = trimmed.match(/^(\w+)\s+in\s+\[(.*)\]$/);
  if (m) {
    const list = m[2].split(",").map((x) => x.trim().replace(/^['"]|['"]$/g, ""));
    const v = input[m[1]];
    if (Array.isArray(v)) return v.some((x) => list.includes(x));
    return list.includes(v);
  }
  m = trimmed.match(/^(\w+)\s+contains\s+['"]([^'"]+)['"]$/);
  if (m) {
    const v = input[m[1]];
    if (Array.isArray(v)) return v.includes(m[2]);
    return typeof v === "string" && v.includes(m[2]);
  }
  return false;
}

process.exit(0);
