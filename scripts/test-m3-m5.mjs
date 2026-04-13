/**
 * Teste M3-M5 — Sprint Z-13.5
 * Chama generateRisksV4Pipeline diretamente (sem HTTP) para testar:
 * M3: Consolidação (N gaps → ≤ N categorias riscos)
 * M4: RAG validation (rag_validated, rag_artigo_exato)
 * M5: Títulos enriquecidos (não genéricos)
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar gaps do projeto 1 com os campos necessários para GapRule
const [gaps] = await conn.execute(
  `SELECT 
    pgv.id, pgv.requirement_code, pgv.domain, pgv.risk_category_code,
    pgv.source_reference, pgv.gap_type, pgv.compliance_status,
    rrv.legal_article, rrv.legal_reference, rrv.name
   FROM project_gaps_v3 pgv
   LEFT JOIN regulatory_requirements_v3 rrv ON pgv.requirement_id = rrv.id
   WHERE pgv.project_id = 1 AND pgv.compliance_status = 'nao_atendido'
   LIMIT 30`
);

console.log('=== PRÉ-CONDIÇÃO ===');
console.log('Gaps disponíveis:', gaps.length);

// Montar mappedRules no formato GapRule
const mappedRules = gaps.map(g => ({
  ruleId: `RULE-${g.risk_category_code?.toUpperCase()}-001`,
  categoria: g.risk_category_code || 'sem_categoria',
  artigo: g.legal_article || 'Art. 1',
  fonte: g.legal_reference || g.source_reference || 'LC 214/2025',
  gapClassification: g.gap_type || 'normativo',
  requirementId: g.requirement_code || String(g.id),
  sourceReference: g.source_reference || g.legal_reference || 'LC 214/2025',
  domain: g.domain || 'fiscal',
}));

// Distribuição de entrada
const byCategoria = {};
for (const r of mappedRules) {
  byCategoria[r.categoria] = (byCategoria[r.categoria] || 0) + 1;
}
console.log('Distribuição de entrada (gaps por categoria):');
Object.entries(byCategoria).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

// Importar e executar o pipeline
const { generateRisksV4Pipeline } = await import('../server/lib/generate-risks-pipeline.ts');

console.log('\n=== EXECUTANDO PIPELINE ===');
const { risks, summary } = await generateRisksV4Pipeline(1, mappedRules, 1);

console.log('\n=== M3: CONSOLIDAÇÃO ===');
console.log('Gaps de entrada:', mappedRules.length);
console.log('Riscos gerados:', risks.length);
console.log('Ratio consolidação:', (mappedRules.length / risks.length).toFixed(1) + ':1');

const byRiskCategoria = {};
for (const r of risks) {
  byRiskCategoria[r.categoria] = (byRiskCategoria[r.categoria] || 0) + 1;
}
console.log('Riscos por categoria:');
Object.entries(byRiskCategoria).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

const M3_PASS = risks.length < mappedRules.length;
console.log('M3 PASS:', M3_PASS, '(esperado: riscos < gaps)');

console.log('\n=== M4: RAG VALIDATION ===');
const ragValidated = risks.filter(r => r.rag_validated === 1 || r.rag_validated === true);
const ragArtigo = risks.filter(r => r.rag_artigo_exato && r.rag_artigo_exato !== '');
console.log('Riscos com rag_validated=1:', ragValidated.length, '/', risks.length);
console.log('Riscos com rag_artigo_exato:', ragArtigo.length, '/', risks.length);
if (ragArtigo.length > 0) {
  console.log('Exemplo rag_artigo_exato:', ragArtigo[0].rag_artigo_exato?.substring(0, 80));
}
const M4_PASS = ragValidated.length > 0;
console.log('M4 PASS:', M4_PASS, '(esperado: pelo menos 1 risco validado pelo RAG)');

console.log('\n=== M5: TÍTULOS ===');
risks.slice(0, 5).forEach(r => {
  console.log('  [' + r.categoria + '] ' + r.titulo);
});
const genericTitles = risks.filter(r => r.titulo?.includes('[') && r.titulo?.includes(']'));
const M5_PASS = genericTitles.length < risks.length;
console.log('Títulos genéricos (com brackets):', genericTitles.length, '/', risks.length);
console.log('M5 PASS:', M5_PASS, '(esperado: pelo menos alguns títulos enriquecidos)');

console.log('\n=== SUMMARY DO PIPELINE ===');
console.log(JSON.stringify(summary, null, 2));

await conn.end();
