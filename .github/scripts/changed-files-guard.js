#!/usr/bin/env node
// changed-files-guard.js — IA Solaris PR Governance
// Sem dependências externas — Node.js puro
// Inputs via environment:
//   ALL_CHANGED_FILES — lista separada por espaço
//   PR_LABELS — JSON array de labels
//   PR_BODY — corpo da PR

const changedFilesRaw = process.env.ALL_CHANGED_FILES || '';
const prLabelsRaw = process.env.PR_LABELS || '[]';
const prBody = process.env.PR_BODY || '';

// Correção 5 aprovada: split robusto com filter(Boolean)
const changedFiles = changedFilesRaw.split(' ').filter(Boolean);

let labels = [];
try {
  const parsed = JSON.parse(prLabelsRaw);
  labels = Array.isArray(parsed) ? parsed.map(l => (typeof l === 'string' ? l : l.name)) : [];
} catch (e) {
  console.warn('Aviso: PR_LABELS não é JSON válido, tratando como vazio.');
}

const errors = [];
const warnings = [];

// ─── Detecção de categorias ───────────────────────────────────────────────

// Migration/Schema
const touchesMigration = changedFiles.some(f =>
  f.includes('drizzle') ||
  f.includes('/migrations/') ||
  f.match(/\d+.*\.sql$/) ||
  f.includes('schema.ts')
);

// Domínio RAG
const touchesRag = changedFiles.some(f =>
  f.toLowerCase().includes('rag') ||
  f.toLowerCase().includes('embedding') ||
  f.toLowerCase().includes('cnae') ||
  f.toLowerCase().includes('canonical-requirements') ||
  f.toLowerCase().includes('vector')
);

// Caminho crítico de leitura
const touchesCriticalPath = changedFiles.some(f =>
  f.includes('diagnostic-source') ||
  f.includes('get-diagnostic-source') ||
  f.includes('diagnostic-shadow') ||
  f.includes('retrocesso-cleanup') ||
  f.includes('flowRouter') ||
  f.includes('flowStateMachine') ||
  f.includes('FlowStepper')
);

// Áreas com bloqueio ativo
const touchesBlockedArea = changedFiles.some(f =>
  f.includes('DIAGNOSTIC_READ_MODE') ||
  f.includes('shadow.ts')
);

// ─── Log de detecção ─────────────────────────────────────────────────────
console.log('\n📋 Arquivos modificados:', changedFiles.length || 0);
console.log('🏷️  Labels:', labels.join(', ') || '(nenhuma)');
console.log('\n🔍 Categorias detectadas:');
console.log(`  Migration/Schema:    ${touchesMigration ? '⚠️  SIM' : '✅ não'}`);
console.log(`  Domínio RAG:         ${touchesRag ? '⚠️  SIM' : '✅ não'}`);
console.log(`  Caminho crítico:     ${touchesCriticalPath ? '⚠️  SIM' : '✅ não'}`);
console.log(`  Área bloqueada:      ${touchesBlockedArea ? '🔴 SIM' : '✅ não'}`);

// ─── Regras de bloqueio ───────────────────────────────────────────────────

// Regra 1: Migration sem label db:migration
if (touchesMigration && !labels.includes('db:migration')) {
  errors.push(
    'REGRA 1 — MIGRATION SEM LABEL: Esta PR toca schema ou migration mas não tem a label "db:migration".\n' +
    '  Adicione a label "db:migration" antes de continuar.\n' +
    '  Arquivos afetados: ' + changedFiles.filter(f =>
      f.includes('drizzle') || f.includes('/migrations/') || f.match(/\d+.*\.sql$/) || f.includes('schema.ts')
    ).join(', ')
  );
}

// Regra 2: RAG sem label rag:review
if (touchesRag && !labels.includes('rag:review')) {
  errors.push(
    'REGRA 2 — RAG SEM LABEL: Esta PR toca o domínio RAG mas não tem a label "rag:review".\n' +
    '  Adicione a label "rag:review" e solicite revisão do Orquestrador antes de continuar.'
  );
}

// Regra 3: Caminho crítico sem label critical-path
if (touchesCriticalPath && !labels.includes('critical-path')) {
  errors.push(
    'REGRA 3 — CAMINHO CRÍTICO SEM LABEL: Esta PR toca arquivos do caminho crítico de leitura ' +
    '(getDiagnosticSource, diagnostic-shadow, retrocesso-cleanup, flowRouter, flowStateMachine, FlowStepper) ' +
    'mas não tem a label "critical-path".\n' +
    '  Adicione a label "critical-path" antes de continuar.'
  );
}

// Regra 4: Migration + caminho crítico sem risco Alto
if (touchesMigration && touchesCriticalPath) {
  const hasHighRisk = prBody.includes('- [x] Alto — impacto estrutural');
  if (!hasHighRisk) {
    errors.push(
      'REGRA 4 — MIGRATION + CAMINHO CRÍTICO: Esta PR combina migration de banco com caminho crítico de leitura.\n' +
      '  Isso requer classificação de risco "Alto" no PR body e aprovação explícita do P.O.\n' +
      '  Marque "- [x] Alto — impacto estrutural, requer aprovação explícita" no PR body.'
    );
  }
}

// Regra 5: Migration + RAG na mesma PR — proibido sempre
if (touchesMigration && touchesRag) {
  errors.push(
    'REGRA 5 — MIGRATION + RAG PROIBIDO: Esta PR combina migration de banco com alterações no domínio RAG.\n' +
    '  Isso é proibido por política de governança.\n' +
    '  Separe em PRs independentes: uma para migration, outra para RAG.'
  );
}

// Regra 6: Área com bloqueio ativo — falha sempre
if (touchesBlockedArea) {
  errors.push(
    'REGRA 6 — ÁREA BLOQUEADA: Esta PR toca uma área com bloqueio ativo de governança.\n' +
    '  Arquivos com bloqueio ativo: shadow.ts, DIAGNOSTIC_READ_MODE.\n' +
    '  Requer aprovação explícita do P.O. documentada antes de qualquer modificação.\n' +
    '  Consulte BASELINE-PRODUTO.md Seção 9 — Bloqueios Ativos.'
  );
}

// ─── Resultado ────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n❌ CHANGED FILES GUARD — BLOQUEADO:\n');
  for (const err of errors) {
    console.error(`  🚫 ${err}\n`);
  }
  console.error('Corrija todas as violações antes de solicitar merge.\n');
  process.exit(1);
} else {
  console.log('\n✅ Changed files guard: todas as regras satisfeitas. Nenhuma violação detectada.');
  process.exit(0);
}
