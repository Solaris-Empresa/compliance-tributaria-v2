import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. RAG CGIBS
const [ragRows] = await conn.execute(
  "SELECT lei, COUNT(*) as total FROM ragDocuments WHERE lei LIKE 'resolucao_cgibs%' GROUP BY lei ORDER BY lei"
);
console.log('\n=== RAG CGIBS ===');
let totalRag = 0;
for (const r of ragRows) {
  console.log(`  ${r.lei}: ${r.total}`);
  totalRag += Number(r.total);
}
console.log(`  TOTAL: ${totalRag} (esperado: 6)`);
console.log(`  STATUS: ${totalRag === 6 ? '✅ OK' : '❌ FALHOU'}`);

// 2. Corpus total
const [[{ total: totalCorpus }]] = await conn.execute(
  "SELECT COUNT(*) as total FROM ragDocuments"
);
console.log(`\n=== Corpus Total ===`);
console.log(`  Total chunks: ${totalCorpus}`);

// 3. risk_categories com descricao
const [[{ total: catDescricao }]] = await conn.execute(
  "SELECT COUNT(*) as total FROM risk_categories WHERE descricao IS NOT NULL AND descricao != ''"
);
const [[{ total: catTotal }]] = await conn.execute(
  "SELECT COUNT(*) as total FROM risk_categories WHERE status = 'ativo'"
);
console.log(`\n=== risk_categories ===`);
console.log(`  Ativas: ${catTotal}`);
console.log(`  Com descricao preenchida: ${catDescricao}`);

// 4. PRs mergeados (via git log)
console.log(`\n=== GitHub HEAD ===`);
console.log(`  Verificar via: git log github/main --oneline -3`);

await conn.end();
console.log('\n=== Auditoria concluída ===');
