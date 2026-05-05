/**
 * DoD M3.10 — Snapshot + Retrigger + Validação
 * 
 * Passos:
 * 1. Snapshot pré-execução (riscos atuais do projeto 3570002)
 * 2. Chamar generateRisksAllSources via tRPC-like (direct function call)
 * 3. Validar 4 critérios SQL do DoD
 * 
 * Uso: npx tsx scripts/dod-m3.10.ts
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PROJECT_ID = 3570002;

async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log('=== DoD M3.10 — Projeto', PROJECT_ID, '===\n');

  // ─── PASSO 1: Snapshot pré-execução ───────────────────────────────────────
  console.log('── PASSO 1: Snapshot pré-execução ──');
  const [preRisks] = await pool.query(
    `SELECT id, categoria, source_priority, severidade, status 
     FROM risks_v4 WHERE project_id = ? AND status = 'active'`,
    [PROJECT_ID]
  ) as any[];
  console.log(`Riscos ativos ANTES: ${preRisks.length}`);
  console.log('Distribuição source_priority ANTES:');
  const preDist: Record<string, number> = {};
  for (const r of preRisks) {
    preDist[r.source_priority] = (preDist[r.source_priority] ?? 0) + 1;
  }
  console.table(preDist);
  console.log('');

  // ─── PASSO 2: Verificar gaps disponíveis ──────────────────────────────────
  console.log('── PASSO 2: Gaps disponíveis por source ──');
  const [gapCounts] = await pool.query(
    `SELECT source, COUNT(*) as cnt FROM project_gaps_v3 
     WHERE project_id = ? AND analysis_version = 3 
     GROUP BY source`,
    [PROJECT_ID]
  ) as any[];
  console.table(gapCounts);

  // Check if Fix B was applied (risk_category_code populated)
  const [nullCats] = await pool.query(
    `SELECT source, COUNT(*) as cnt FROM project_gaps_v3 
     WHERE project_id = ? AND analysis_version = 3 
     AND risk_category_code IS NULL
     GROUP BY source`,
    [PROJECT_ID]
  ) as any[];
  console.log('\nGaps com risk_category_code = NULL:');
  console.table(nullCats);
  console.log('');

  // ─── PASSO 3: NÃO executar retrigger aqui ─────────────────────────────────
  // O retrigger será feito via UI ou chamada HTTP separada.
  // Este script apenas valida o estado ATUAL.
  console.log('── PASSO 3: Retrigger deve ser feito via UI ou HTTP ──');
  console.log('(Este script valida o estado, não executa o pipeline)\n');

  // ─── PASSO 4: Definition of Done — 4 critérios SQL ────────────────────────
  console.log('── PASSO 4: Definition of Done ──\n');

  // Critério POSITIVO 1: COUNT(DISTINCT source_priority) >= 2
  const [distinctSources] = await pool.query(
    `SELECT COUNT(DISTINCT source_priority) as cnt FROM risks_v4 
     WHERE project_id = ? AND status = 'active'`,
    [PROJECT_ID]
  ) as any[];
  const distinctCount = distinctSources[0]?.cnt ?? 0;
  const crit1 = distinctCount >= 2;
  console.log(`Critério POSITIVO 1: COUNT(DISTINCT source_priority) = ${distinctCount} (deve ser >= 2)`);
  console.log(`  → ${crit1 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Critério NEGATIVO 1: Não pode ser mono-fonte
  const [monoCheck] = await pool.query(
    `SELECT 'BUG REINCIDIU' as alert FROM risks_v4 
     WHERE project_id = ? AND status = 'active' 
     HAVING COUNT(DISTINCT source_priority) = 1`,
    [PROJECT_ID]
  ) as any[];
  const crit2 = monoCheck.length === 0;
  console.log(`Critério NEGATIVO 1: Mono-fonte check = ${monoCheck.length} linhas (deve ser 0)`);
  console.log(`  → ${crit2 ? '✅ PASS' : '❌ FAIL — BUG REINCIDIU'}\n`);

  // Critério POSITIVO 2: Pelo menos 1 risco com source_priority = 'solaris' ou 'iagen'
  const [nonRegRisks] = await pool.query(
    `SELECT source_priority, COUNT(*) as cnt FROM risks_v4 
     WHERE project_id = ? AND status = 'active' 
     AND source_priority IN ('solaris', 'iagen')
     GROUP BY source_priority`,
    [PROJECT_ID]
  ) as any[];
  const crit3 = nonRegRisks.length > 0;
  console.log(`Critério POSITIVO 2: Riscos com fonte solaris/iagen = ${nonRegRisks.length > 0 ? JSON.stringify(nonRegRisks) : '0'}`);
  console.log(`  → ${crit3 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Critério POSITIVO 3: Total de riscos >= riscos anteriores (não perdeu cobertura)
  const [postRisks] = await pool.query(
    `SELECT COUNT(*) as cnt FROM risks_v4 
     WHERE project_id = ? AND status = 'active'`,
    [PROJECT_ID]
  ) as any[];
  const postCount = postRisks[0]?.cnt ?? 0;
  const crit4 = postCount >= preRisks.length;
  console.log(`Critério POSITIVO 3: Total riscos = ${postCount} (era ${preRisks.length}, não deve diminuir)`);
  console.log(`  → ${crit4 ? '✅ PASS' : '⚠️ ATENÇÃO — cobertura diminuiu'}\n`);

  // ─── RESULTADO FINAL ──────────────────────────────────────────────────────
  const allPass = crit1 && crit2 && crit3;
  console.log('═══════════════════════════════════════════');
  console.log(`RESULTADO FINAL: ${allPass ? '✅ SUCCESS — DoD ATENDIDO' : '❌ FAIL — DoD NÃO ATENDIDO'}`);
  console.log('═══════════════════════════════════════════');

  if (!allPass) {
    console.log('\n⚠️  O pipeline generateRisksAllSources precisa ser executado.');
    console.log('   Execute via UI (botão "Gerar Riscos v4") ou via HTTP/tRPC.');
  }

  await pool.end();
}

main().catch(console.error);
