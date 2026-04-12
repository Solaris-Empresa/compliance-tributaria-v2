/**
 * RAG Ingestão — Resoluções CGIBS (Lote D)
 *
 * Adiciona as Resoluções CGIBS nº 1, 2 e 3/2026 ao banco ragDocuments.
 * Modo incremental (upsert por anchor_id) — NÃO apaga entradas existentes.
 *
 * PRÉ-REQUISITO:
 *   Migration 0074 deve ter sido aplicada (enum lei inclui resolucao_cgibs_1/2/3).
 *   Execute: node server/apply-0074-rag-enum.mjs
 *
 * USO:
 *   node server/rag-ingest-cgibs.mjs           # insere apenas novas entradas
 *   node server/rag-ingest-cgibs.mjs --force   # apaga entradas CGIBS e reinserere
 *   node server/rag-ingest-cgibs.mjs --dry-run # mostra o que seria inserido
 */
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

// Transpilhar o corpus TypeScript em tempo real via tsx
const tmpFile = join(__dirname, '_corpus_cgibs_dump.json');
try {
  execSync(
    `cd ${join(__dirname, '..')} && npx tsx -e "import { RAG_CORPUS_CGIBS } from './server/rag-corpus-cgibs-template.ts'; import { writeFileSync } from 'fs'; writeFileSync('${tmpFile}', JSON.stringify(RAG_CORPUS_CGIBS))"`,
    { stdio: 'pipe' }
  );
} catch (e) {
  console.error('Erro ao transpilhar rag-corpus-cgibs-template.ts:', e.message);
  process.exit(1);
}

const CORPUS = JSON.parse(
  (await import('fs')).default.readFileSync(tmpFile, 'utf-8')
);
unlinkSync(tmpFile);

console.log(`\n${'='.repeat(60)}`);
console.log('RAG Ingestão — Resoluções CGIBS (Lote D)');
console.log(`${'='.repeat(60)}`);
console.log(`Corpus carregado: ${CORPUS.length} entradas`);

if (CORPUS.length === 0) {
  console.log('\n⚠️  Corpus vazio. Preencha server/rag-corpus-cgibs-template.ts com os');
  console.log('   dispositivos extraídos dos PDFs das Resoluções CGIBS nº 1, 2 e 3/2026.');
  console.log('\n   Forneça os PDFs ao Manus para extração automática.');
  process.exit(0);
}

// Estatísticas por lei
const stats = {};
const vigentes = CORPUS.filter(e => e.vigente && !e.dependente_regulamentacao).length;
const dependentes = CORPUS.filter(e => e.dependente_regulamentacao).length;
const naoVigentes = CORPUS.filter(e => !e.vigente).length;

for (const e of CORPUS) {
  stats[e.lei] = (stats[e.lei] || 0) + 1;
}
for (const [lei, count] of Object.entries(stats)) {
  console.log(`  ${lei}: ${count} entradas`);
}
console.log(`  Vigentes imediatos: ${vigentes}`);
console.log(`  Dependentes de regulamentação: ${dependentes}`);
console.log(`  Não vigentes (vacatio): ${naoVigentes}`);

if (dryRun) {
  console.log('\n[DRY-RUN] Nenhuma alteração realizada.');
  process.exit(0);
}

const db = await createConnection(process.env.DATABASE_URL);
console.log('\nConectando ao banco...');

// Verificar registros CGIBS existentes
const [existing] = await db.execute(
  `SELECT COUNT(*) as count FROM ragDocuments WHERE lei IN ('resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3')`
);
const existingCount = existing[0].count;
console.log(`Entradas CGIBS existentes: ${existingCount}`);

if (force && existingCount > 0) {
  console.log('--force: removendo entradas CGIBS existentes...');
  await db.execute(
    `DELETE FROM ragDocuments WHERE lei IN ('resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3')`
  );
}

let inserted = 0;
let skipped = 0;

for (const entry of CORPUS) {
  // anchor_id determinístico: lei-artigo-chunkIndex
  const anchorId = `${entry.lei}-${entry.artigo.replace(/[^a-zA-Z0-9]/g, '-')}-${entry.chunkIndex}`;

  // Upsert por anchor_id
  const [result] = await db.execute(
    `INSERT INTO ragDocuments
       (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, anchor_id, autor, revisado_por, data_revisao, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       conteudo = VALUES(conteudo),
       topicos = VALUES(topicos),
       revisado_por = VALUES(revisado_por),
       data_revisao = VALUES(data_revisao)`,
    [
      entry.lei,
      entry.artigo,
      entry.titulo,
      // Adicionar metadados de vigência ao conteúdo para recuperação RAG
      entry.conteudo + (entry.dependente_regulamentacao
        ? '\n[AGUARDA REGULAMENTAÇÃO: dispositivo vigente mas condicionado a ato normativo complementar]'
        : '') + (!entry.vigente
        ? `\n[ENTRADA EM VIGOR: ${entry.data_vigencia || 'a definir'}]`
        : ''),
      entry.topicos + ', CGIBS, Comitê Gestor IBS, resolução CGIBS',
      entry.cnaeGroups ?? '',
      entry.chunkIndex ?? 0,
      anchorId,
      entry.autor ?? 'CGIBS',
      entry.revisado_por ?? null,
      entry.data_revisao ?? null,
    ]
  );

  if (result.affectedRows > 0) {
    inserted++;
  } else {
    skipped++;
  }

  if ((inserted + skipped) % 10 === 0) {
    console.log(`  ${inserted} inseridos / ${skipped} ignorados...`);
  }
}

await db.end();

console.log(`\n✅ Ingestão concluída:`);
console.log(`   Inseridos/atualizados: ${inserted}`);
console.log(`   Ignorados (duplicatas): ${skipped}`);
console.log(`\nPróximo passo: verificar no admin RAG em /admin/rag-inventory`);
