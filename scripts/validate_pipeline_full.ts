/**
 * Script de validação do pipeline G17-B + G17-C
 * Cria projeto de teste, simula completeOnda1 e verifica gaps/riscos/briefings
 */
import mysql from 'mysql2/promise';
import { analyzeSolarisAnswers } from '../server/lib/solaris-gap-analyzer.js';
import { deriveRisksFromGaps, persistRisks } from '../server/routers/riskEngine.js';

const DB_URL = process.env.DATABASE_URL!;

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  const TEST_PROJECT_ID = 2440001;

  try {
    console.log('=== VALIDAÇÃO PIPELINE G17-B + G17-C ===\n');

    // Limpar projeto de teste anterior se existir
    await conn.execute('DELETE FROM project_briefings_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM project_risks_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM project_gaps_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM solaris_answers WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM projects WHERE id = ?', [TEST_PROJECT_ID]);

    // Buscar clientId e createdById de um projeto existente
    const [sampleProj] = await conn.execute('SELECT clientId, createdById FROM projects LIMIT 1');
    const sample = (sampleProj as any[])[0];
    const clientId = sample?.clientId ?? 1;
    const createdById = sample?.createdById ?? 1;

    // Criar projeto de teste
    await conn.execute(
      `INSERT INTO projects (id, name, clientId, status, createdById, createdByRole)
       VALUES (?, 'VALIDACAO-G17B-G17C', ?, 'onda1_solaris', ?, 'equipe_solaris')
       ON DUPLICATE KEY UPDATE status = 'onda1_solaris'`,
      [TEST_PROJECT_ID, clientId, createdById]
    );

    // Buscar perguntas ativas SOLARIS
    const [questions] = await conn.execute(
      'SELECT id, codigo, topicos FROM solaris_questions WHERE ativo = 1 LIMIT 22'
    );
    const qs = questions as any[];
    console.log(`Perguntas ativas encontradas: ${qs.length}`);

    // Inserir respostas negativas para todas as perguntas
    const now = Date.now();
    for (const q of qs) {
      await conn.execute(
        `INSERT INTO solaris_answers (project_id, question_id, codigo, resposta, fonte, created_at, updated_at)
         VALUES (?, ?, ?, 'não', 'solaris', ?, ?)
         ON DUPLICATE KEY UPDATE resposta = 'não', updated_at = ?`,
        [TEST_PROJECT_ID, q.id, q.codigo, now, now, now]
      );
    }
    console.log(`Respostas negativas inseridas: ${qs.length}\n`);

    // Simular analyzeSolarisAnswers (G17-C: 76 tópicos mapeados)
    console.log('Executando analyzeSolarisAnswers...');
    await analyzeSolarisAnswers(TEST_PROJECT_ID);

    // Aguardar inserção dos gaps
    await new Promise(r => setTimeout(r, 1000));

    // Query 1: Gaps gerados
    const [gapsResult] = await conn.execute(
      'SELECT COUNT(*) as gaps FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
      [TEST_PROJECT_ID, 'solaris']
    );
    const gaps = (gapsResult as any[])[0].gaps;
    console.log(`\nQuery 1 — Gaps SOLARIS: ${gaps} (esperado: > 10)`);

    // Simular trigger G17-B: deriveRisksFromGaps + persistRisks
    console.log('\nExecutando deriveRisksFromGaps + persistRisks (G17-B)...');
    try {
      const derivedGaps = await deriveRisksFromGaps(TEST_PROJECT_ID);
      if (derivedGaps.length > 0) {
        await persistRisks(TEST_PROJECT_ID, derivedGaps);
      }
      console.log(`Riscos derivados: ${derivedGaps.length}`);
    } catch (err) {
      console.error('Erro no riskEngine (não bloqueia):', err);
    }

    // Query 2: Riscos gerados
    const [riscosResult] = await conn.execute(
      'SELECT COUNT(*) as riscos FROM project_risks_v3 WHERE project_id = ?',
      [TEST_PROJECT_ID]
    );
    const riscos = (riscosResult as any[])[0].riscos;
    console.log(`Query 2 — Riscos: ${riscos} (esperado: > 0)`);

    // Query 3: Briefings (o briefingEngine é assíncrono — verificar se existe
    const [briefingsResult] = await conn.execute(
      'SELECT COUNT(*) as briefings FROM project_briefings_v3 WHERE project_id = ?',
      [TEST_PROJECT_ID]
    );
    const briefings = (briefingsResult as any[])[0].briefings;
    console.log(`Query 3 — Briefings: ${briefings} (pode ser 0 — briefingEngine é assíncrono)`);

    // Resultado final
    console.log('\n=== RESULTADO ===');
    console.log(`Gaps:     ${gaps}  ${gaps > 10 ? '✅ PASSOU' : '❌ FALHOU'} (esperado: > 10)`);
    console.log(`Riscos:   ${riscos}  ${riscos > 0 ? '✅ PASSOU' : '❌ FALHOU'} (esperado: > 0)`);
    console.log(`Briefings: ${briefings}  ${briefings >= 0 ? '✅ OK' : '❌'} (assíncrono — pode ser 0)`);

    // Evidência JSON
    console.log('\n=== EVIDÊNCIA JSON ===');
    console.log(JSON.stringify({
      test_project_id: TEST_PROJECT_ID,
      timestamp: new Date().toISOString(),
      environment: 'production',
      questions_answered: qs.length,
      q1_gaps_solaris: gaps,
      q2_riscos_gerados: riscos,
      q3_briefings: briefings,
      g17b_trigger_ok: riscos > 0,
      g17c_map_ok: gaps > 10,
      pipeline_complete: gaps > 10 && riscos > 0,
    }, null, 2));

  } finally {
    // Limpar projeto de teste
    await conn.execute('DELETE FROM project_briefings_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM project_risks_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM project_gaps_v3 WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM solaris_answers WHERE project_id = ?', [TEST_PROJECT_ID]);
    await conn.execute('DELETE FROM projects WHERE id = ?', [TEST_PROJECT_ID]);
    await conn.end();
    console.log('\nProjeto de teste removido.');
  }
}

main().catch(console.error);
