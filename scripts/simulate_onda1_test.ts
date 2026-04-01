/**
 * Script de diagnóstico G17-B
 * Simula completeOnda1 e confirma que riskEngine NÃO é chamado (bug)
 * Execução: env $(cat /tmp/db_env.txt) pnpm exec tsx scripts/simulate_onda1_test.ts
 */
import mysql from 'mysql2/promise';
import { analyzeSolarisAnswers } from '../server/lib/solaris-gap-analyzer';

async function main() {
  const DB_URL = process.env.DATABASE_URL;
  if (!DB_URL) { console.error('DATABASE_URL não definida'); process.exit(1); }

  const conn = await mysql.createConnection(DB_URL);

  // Passo 1: Buscar clientId e createdById de um projeto existente para reusar
  const [existingProj] = await conn.execute(
    `SELECT clientId, createdById, createdByRole FROM projects WHERE id = 2310001`
  ) as any;
  const { clientId, createdById, createdByRole } = (existingProj as any[])[0];

  // Passo 2: Criar projeto de teste com campos corretos
  console.log('=== Passo 1: Criando projeto de teste ===');
  const [insertResult] = await conn.execute(
    `INSERT INTO projects (name, clientId, status, createdById, createdByRole, confirmedCnaes, companyProfile, operationProfile)
     VALUES (?, ?, 'diagnostico_corporativo', ?, ?, ?, ?, ?)`,
    [
      'TESTE G17-B Bug Confirm',
      clientId,
      createdById,
      createdByRole,
      JSON.stringify(['4711-3/01']),
      JSON.stringify({ taxRegime: 'lucro_presumido', companySize: 'media' }),
      JSON.stringify({ faz_exportacao: false, contrata_simples_nacional: false, multiState: false, tem_ativo_imobilizado: false }),
    ]
  ) as any;
  const projectId = (insertResult as any).insertId;
  console.log('Projeto criado com ID:', projectId);

  // Passo 3: Buscar questões SOL-001..012
  const [questions] = await conn.execute(
    `SELECT id, codigo FROM solaris_questions WHERE ativo = 1 LIMIT 12`
  ) as any;
  console.log('Questões SOLARIS disponíveis:', (questions as any[]).length);

  // Passo 4: Salvar respostas (todas 'sim' para máximo de gaps)
  for (const q of (questions as any[])) {
    await conn.execute(
      `INSERT INTO solaris_answers (project_id, question_id, codigo, resposta, fonte, created_at, updated_at)
       VALUES (?, ?, ?, 'não', 'solaris', UNIX_TIMESTAMP()*1000, UNIX_TIMESTAMP()*1000)
       ON DUPLICATE KEY UPDATE resposta='não', updated_at=UNIX_TIMESTAMP()*1000`,
      [projectId, q.id, q.codigo]
    );
  }
  console.log('Respostas salvas (todas "não" para máximo de gaps):', (questions as any[]).length);

  // Passo 5: Atualizar status para onda1_solaris (simula completeOnda1)
  await conn.execute(
    `UPDATE projects SET status='onda1_solaris', updatedAt=NOW() WHERE id=?`,
    [projectId]
  );
  console.log('Status atualizado para onda1_solaris');

  // Passo 6: Chamar analyzeSolarisAnswers (fire-and-forget em prod, aqui aguardamos)
  console.log('Chamando analyzeSolarisAnswers...');
  await conn.end();

  await analyzeSolarisAnswers(projectId);
  console.log('analyzeSolarisAnswers concluído');

  // Passo 7: Verificar resultados (Queries 4, 5, 6)
  const conn2 = await mysql.createConnection(DB_URL);

  console.log('\n=== Query 4: Gaps inseridos? ===');
  const [q4] = await conn2.execute(
    `SELECT gap_description, domain, criticality, source FROM project_gaps_v3 WHERE project_id=? AND source='solaris'`,
    [projectId]
  ) as any;
  console.log('Q4_GAPS:', JSON.stringify(q4));

  console.log('\n=== Query 5: Riscos gerados? (DEVE SER 0 — confirma bug G17-B) ===');
  const [q5] = await conn2.execute(
    `SELECT COUNT(*) as riscos_gerados FROM project_risks_v3 WHERE project_id=?`,
    [projectId]
  ) as any;
  console.log('Q5_RISCOS:', JSON.stringify(q5));

  console.log('\n=== Query 6: Status do projeto ===');
  const [q6] = await conn2.execute(
    `SELECT status, updatedAt FROM projects WHERE id=?`,
    [projectId]
  ) as any;
  console.log('Q6_STATUS:', JSON.stringify(q6));

  await conn2.end();

  console.log('\n=== RESULTADO FINAL ===');
  console.log('NOVO_PROJECT_ID:', projectId);
  const gaps = (q4 as any[]).length;
  const riscos = Number((q5 as any[])[0]?.riscos_gerados ?? 0);
  const status = (q6 as any[])[0]?.status ?? 'unknown';
  console.log(`Gaps SOLARIS: ${gaps} | Riscos: ${riscos} | Status: ${status}`);

  if (gaps > 0 && riscos === 0) {
    console.log('✅ BUG G17-B CONFIRMADO: gaps existem mas riskEngine NÃO foi chamado');
  } else if (riscos > 0) {
    console.log('❌ BUG NÃO CONFIRMADO: riscos foram gerados (inesperado — verificar se riskEngine já foi corrigido)');
  } else {
    console.log('⚠️  ATENÇÃO: gaps também não foram gerados — verificar analyzeSolarisAnswers');
  }
}

main().catch(e => { console.error('SCRIPT_ERROR:', e.message, '\n', e.stack); process.exit(1); });
