#!/usr/bin/env node
// validate-pr-body.js — IA Solaris PR Governance
// Sem dependências externas — Node.js puro
// Lê PR body de process.env.PR_BODY

const body = process.env.PR_BODY || '';
const errors = [];

// ─── 0. Exceção docs-only — skip integral ─────────────────────────────────
// Tech debt: PRs documentais (laudos, auditorias, CORPUS-BASELINE) tinham que
// preencher template completo (## Objetivo, JSON evidence, Q1–Q5) — overhead
// desproporcional para diff exclusivo em docs/**. Workaround estabelecido era
// admin-override (PRs #1106, #1107, #1109, #1110, #1111).
//
// Critério: PR tem label `docs` E todos os arquivos alterados estão em
// `docs/**`. Qualquer arquivo fora de docs/** → gate normal.
// Sem label `docs` → comportamento inalterado.
//
// Requer env vars do workflow:
//   PR_LABELS         — JSON array de objetos { name } (toJson da API)
//   ALL_CHANGED_FILES — lista space-separated (tj-actions/changed-files)
let isDocsPR = false;
try {
  const labels = JSON.parse(process.env.PR_LABELS || '[]')
    .map(l => (typeof l === 'string' ? l : l.name))
    .filter(Boolean);
  const changedFiles = (process.env.ALL_CHANGED_FILES || '')
    .split(/\s+/)
    .filter(Boolean);
  isDocsPR =
    labels.includes('docs') &&
    changedFiles.length > 0 &&
    changedFiles.every(f => f.startsWith('docs/'));
} catch (_e) {
  // fallback silencioso: env malformada → comportamento normal
  isDocsPR = false;
}
if (isDocsPR) {
  console.log('✅ PR docs-only (label=docs + diff exclusivo em docs/**) — template completo dispensado.');
  process.exit(0);
}

// ─── 1. Seções obrigatórias do template ───────────────────────────────────
const requiredSections = [
  '## Objetivo',
  '## Escopo da alteração',
  '## Classificação de risco',
  '## Declaração de escopo',
  '## Validação executada',
  '## Classificação da task',
  '## Checklist final',
  '## Declaração final',
];

for (const section of requiredSections) {
  if (!body.includes(section)) {
    errors.push(`SEÇÃO AUSENTE: "${section}" não encontrada no corpo da PR. Preencha o template completo.`);
  }
}

// ─── 2. JSON de evidência obrigatório ─────────────────────────────────────
const requiredJsonKeys = [
  'data_integrity',
  'regression',
  'rag_impact',
  'unexpected_behavior',
  'tests_passed',
  'typescript_errors',
  'risk_level',
];

const jsonMatch = body.match(/```json\s*([\s\S]*?)```/);
if (!jsonMatch) {
  errors.push('EVIDÊNCIA JSON AUSENTE: Bloco ```json``` não encontrado. Preencha a evidência estruturada obrigatória.');
} else {
  let parsed = null;
  try {
    parsed = JSON.parse(jsonMatch[1].trim());
  } catch (e) {
    errors.push(`EVIDÊNCIA JSON INVÁLIDA: O bloco JSON não é válido. Erro: ${e.message}`);
  }
  if (parsed) {
    for (const key of requiredJsonKeys) {
      if (!(key in parsed)) {
        errors.push(`EVIDÊNCIA JSON INCOMPLETA: Chave obrigatória "${key}" ausente no JSON de evidência.`);
      }
    }
    if (parsed.typescript_errors !== 0 && parsed.typescript_errors !== '0') {
      errors.push(`TYPESCRIPT COM ERROS: O campo "typescript_errors" deve ser 0. Valor encontrado: ${parsed.typescript_errors}`);
    }
    if (!['low', 'medium', 'high'].includes(parsed.risk_level)) {
      errors.push(`RISK_LEVEL INVÁLIDO: Deve ser "low", "medium" ou "high". Valor encontrado: "${parsed.risk_level}"`);
    }
  }
}

// ─── 3. Exatamente 1 nível de risco marcado ───────────────────────────────
const riskOptions = [
  '- [x] Baixo — sem impacto em dados ou fluxo principal',
  '- [x] Médio — impacto controlado e reversível',
  '- [x] Alto — impacto estrutural, requer aprovação explícita',
];
const riskMarked = riskOptions.filter(r => body.includes(r)).length;
if (riskMarked === 0) {
  errors.push('CLASSIFICAÇÃO DE RISCO: Nenhum nível de risco marcado. Marque exatamente 1 opção (Baixo/Médio/Alto).');
} else if (riskMarked > 1) {
  errors.push(`CLASSIFICAÇÃO DE RISCO: ${riskMarked} níveis marcados. Marque exatamente 1 opção.`);
}

// ─── 4. Exatamente 1 classificação de task marcada ────────────────────────
const taskOptions = [
  '- [x] Nível 1 — Seguro',
  '- [x] Nível 2 — Controlado',
  '- [x] Nível 3 — Crítico',
];
const taskMarked = taskOptions.filter(t => body.includes(t)).length;
if (taskMarked === 0) {
  errors.push('CLASSIFICAÇÃO DE TASK: Nenhum nível marcado. Marque exatamente 1 opção (Nível 1/2/3).');
} else if (taskMarked > 1) {
  errors.push(`CLASSIFICAÇÃO DE TASK: ${taskMarked} níveis marcados. Marque exatamente 1 opção.`);
}

// ─── 5. Declaração de escopo preenchida ───────────────────────────────────
const scopeDeclarations = [
  '- [x] NÃO altera comportamento visível ao usuário final',
  '- [ ] NÃO altera comportamento visível ao usuário final',
];
const hasScopeSection = body.includes('## Declaração de escopo');
if (hasScopeSection) {
  const scopeIdx = body.indexOf('## Declaração de escopo');
  const nextSection = body.indexOf('\n## ', scopeIdx + 1);
  const scopeBlock = nextSection > -1 ? body.slice(scopeIdx, nextSection) : body.slice(scopeIdx);
  const hasAnyCheckbox = scopeBlock.includes('- [x]') || scopeBlock.includes('- [ ]');
  if (!hasAnyCheckbox) {
    errors.push('DECLARAÇÃO DE ESCOPO: Seção encontrada mas sem checkboxes. Preencha os itens obrigatórios.');
  }
}

// ─── Gate Q1–Q5 ─────────────────────────────────────────────────────────────
function validateGateQ1Q5(body) {
  const prTitle = process.env.PR_TITLE || body.split('\n')[0] || '';

  // chore(...) e docs(...) dispensados — hotfix NÃO é dispensado
  const isDispensado =
    /^chore[:(]/.test(prTitle) ||
    /^docs[:(]/.test(prTitle);

  if (isDispensado) return;

  const hasSection =
    body.includes('Auto-auditoria Q1') ||
    body.includes('auto-auditoria Q1') ||
    body.includes('## Auto-auditoria');

  if (!hasSection) {
    errors.push(
      '[GATE Q1\u20135] Se\u00e7\u00e3o "## Auto-auditoria Q1\u20135" ausente. ' +
      'Obrigat\u00f3rio para feat, fix, hotfix, schema, procedure e componente com useQuery. ' +
      'Dispensado apenas para chore(...) e docs(...).'
    );
    return;
  }

  const hasResult =
    body.includes('APTO PARA COMMIT') ||
    body.includes('Resultado: BLOQUEADO');

  if (!hasResult) {
    errors.push('[GATE Q1\u20135] Resultado n\u00e3o declarado \u2014 adicionar APTO PARA COMMIT ou BLOQUEADO.');
  }

  if (body.includes('Resultado: BLOQUEADO')) {
    errors.push('[GATE Q1\u20135] PR com auto-auditoria BLOQUEADA \u2014 corrigir antes de abrir o PR.');
  }
}

validateGateQ1Q5(body);

// ─── Resultado ────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n❌ VALIDAÇÃO DO PR BODY FALHOU:\n');
  for (const err of errors) {
    console.error(`  • ${err}`);
  }
  console.error('\nCorreções necessárias antes do merge. Consulte o PR template em .github/pull_request_template.md\n');
  process.exit(1);
} else {
  console.log('✅ PR body validado com sucesso. Todas as seções obrigatórias e evidência JSON presentes.');
  process.exit(0);
}
