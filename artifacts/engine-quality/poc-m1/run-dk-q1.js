/**
 * DK-Q1 — Gate Estrutural do Dataset
 * Executa os 5 checks (Q1-A a Q1-E) e imprime resultado
 */

const path = require('path');
const root = path.join(__dirname, '../../..');

const ncm = require(path.join(root, 'server/lib/decision-kernel/datasets/ncm-dataset.json'));
const nbs = require(path.join(root, 'server/lib/decision-kernel/datasets/nbs-dataset.json'));

let totalErros = 0;
const resultados = {};

// ─── Q1-A: Campos obrigatórios NCM ───────────────────────────────────────────
console.log('\n=== Q1-A — Campos obrigatórios NCM ===');
const ncmRequired = ['ncm_code', 'descricao', 'regime', 'confianca', 'fonte', 'status'];
let errosA = 0;
ncm.forEach((item, i) => {
  ncmRequired.forEach(f => {
    if (item[f] === undefined || item[f] === null) {
      console.error(`NCM[${i}] missing: ${f}`);
      errosA++;
    }
  });
  if (item.confianca && (item.confianca.valor === undefined || item.confianca.valor === null)) {
    console.error(`NCM[${i}] confianca.valor inválido`);
    errosA++;
  }
  if (item.confianca && !item.confianca.tipo) {
    console.error(`NCM[${i}] confianca.tipo ausente`);
    errosA++;
  }
  if (item.fonte && !item.fonte.lei) {
    console.error(`NCM[${i}] fonte.lei ausente`);
    errosA++;
  }
});
console.log(`NCM check completo: ${ncm.length} entradas | erros: ${errosA}`);
resultados['Q1-A'] = errosA === 0 ? 'PASS' : `FAIL (${errosA} erros)`;
totalErros += errosA;

// ─── Q1-B: Campos obrigatórios NBS ───────────────────────────────────────────
console.log('\n=== Q1-B — Campos obrigatórios NBS ===');
const nbsRequired = ['nbs_code', 'descricao', 'regime', 'confianca', 'fonte', 'status'];
let errosB = 0;
nbs.forEach((item, i) => {
  nbsRequired.forEach(f => {
    if (item[f] === undefined || item[f] === null) {
      console.error(`NBS[${i}] missing: ${f}`);
      errosB++;
    }
  });
  if (item.confianca && (item.confianca.valor === undefined || item.confianca.valor === null)) {
    console.error(`NBS[${i}] confianca.valor inválido`);
    errosB++;
  }
  if (item.confianca && !item.confianca.tipo) {
    console.error(`NBS[${i}] confianca.tipo ausente`);
    errosB++;
  }
  if (item.fonte && !item.fonte.lei) {
    console.error(`NBS[${i}] fonte.lei ausente`);
    errosB++;
  }
});
console.log(`NBS check completo: ${nbs.length} entradas | erros: ${errosB}`);
resultados['Q1-B'] = errosB === 0 ? 'PASS' : `FAIL (${errosB} erros)`;
totalErros += errosB;

// ─── Q1-C: Status válidos ─────────────────────────────────────────────────────
console.log('\n=== Q1-C — Status válidos ===');
const validStatus = ['confirmado', 'pending_validation'];
let errosC = 0;
[...ncm, ...nbs].forEach(item => {
  const code = item.ncm_code || item.nbs_code;
  if (!validStatus.includes(item.status)) {
    console.error(`${code}: status inválido: ${item.status}`);
    errosC++;
  }
});
const confirmed = [...ncm, ...nbs].filter(i => i.status === 'confirmado').length;
const pending = [...ncm, ...nbs].filter(i => i.status === 'pending_validation').length;
console.log(`confirmados: ${confirmed} | pending: ${pending} | total: ${confirmed + pending} | erros: ${errosC}`);
// Esperado: confirmados: 5 | pending: 1 | total: 6
if (confirmed !== 5 || pending !== 1) {
  console.error(`ATENÇÃO: esperado confirmados=5 pending=1, obtido confirmados=${confirmed} pending=${pending}`);
  errosC++;
}
resultados['Q1-C'] = errosC === 0 ? 'PASS' : `FAIL (${errosC} erros)`;
totalErros += errosC;

// ─── Q1-D: Confiança por tipo ─────────────────────────────────────────────────
console.log('\n=== Q1-D — Confiança por tipo ===');
const tiposValidos = ['deterministico', 'regra', 'fallback', 'condicional'];
let errosD = 0;
[...ncm, ...nbs].forEach(item => {
  const code = item.ncm_code || item.nbs_code;
  if (!tiposValidos.includes(item.confianca.tipo)) {
    console.error(`${code}: tipo inválido: ${item.confianca.tipo}`);
    errosD++;
  }
  if (item.status === 'pending_validation' && item.confianca.valor !== 0) {
    console.error(`${code}: pending deve ter confianca.valor = 0, tem ${item.confianca.valor}`);
    errosD++;
  }
  if (item.confianca.tipo === 'regra' && item.confianca.valor > 98) {
    console.error(`${code}: regra não pode ter valor > 98, tem ${item.confianca.valor}`);
    errosD++;
  }
});
console.log(`Confiança check OK | erros: ${errosD}`);
resultados['Q1-D'] = errosD === 0 ? 'PASS' : `FAIL (${errosD} erros)`;
totalErros += errosD;

// ─── Q1-E: Smoke test engine ──────────────────────────────────────────────────
console.log('\n=== Q1-E — Smoke test engine ===');
let errosE = 0;
let warnings = [];
try {
  const { lookupNcm } = require(path.join(root, 'server/lib/decision-kernel/engine/ncm-engine'));
  const { lookupNbs } = require(path.join(root, 'server/lib/decision-kernel/engine/nbs-engine'));

  // Caso confirmado NCM
  const r1 = lookupNcm('9619.00.00');
  if (r1.regime !== 'aliquota_zero') { warnings.push(`NCM 9619: regime errado: ${r1.regime}`); }
  if (r1.confianca.valor !== 100) { warnings.push(`NCM 9619: confianca errada: ${r1.confianca.valor}`); }
  if (!r1.fonte || !r1.fonte.artigo) { warnings.push('NCM 9619: sem artigo'); }

  // Caso pending
  const r2 = lookupNcm('2202.10.00');
  if (r2.confianca.valor !== 0) { warnings.push(`NCM 2202: confianca deve ser 0, tem ${r2.confianca.valor}`); }
  if (r2.confianca.tipo !== 'fallback') { warnings.push(`NCM 2202: tipo deve ser fallback, tem ${r2.confianca.tipo}`); }

  // NBS regime especial
  const r3 = lookupNbs('1.0901.33.00');
  if (r3.regime !== 'regime_especial') { warnings.push(`NBS 1.0901: regime errado: ${r3.regime}`); }
  if (r3.confianca.valor > 98) { warnings.push(`NBS 1.0901: confianca deve ser <= 98, tem ${r3.confianca.valor}`); }

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`  WARN: ${w}`));
  } else {
    console.log('Smoke test OK — engine responde corretamente');
  }
} catch (err) {
  console.error(`Q1-E erro de import: ${err.message}`);
  errosE++;
}
resultados['Q1-E'] = errosE === 0 ? (warnings.length > 0 ? `PASS (${warnings.length} warnings)` : 'PASS') : `FAIL (${errosE} erros)`;

// ─── Resumo ───────────────────────────────────────────────────────────────────
console.log('\n=== RESUMO DK-Q1 ===');
Object.entries(resultados).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log(`\nTotal erros bloqueantes: ${totalErros}`);
console.log(totalErros === 0 ? '\n✅ Dataset estruturalmente válido para DK-Q2' : '\n❌ Dataset com erros — corrigir antes do DK-Q2');

process.exit(totalErros > 0 ? 1 : 0);
