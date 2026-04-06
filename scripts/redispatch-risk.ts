/**
 * Script de re-dispatch do riskEngine para um projeto específico.
 * Uso: npx tsx scripts/redispatch-risk.ts
 */
import mysql from 'mysql2/promise';
import { deriveRisksFromGaps, persistRisks } from '../server/routers/riskEngine';

const PROJECT_ID = 2850797;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [projects] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT companySize, taxRegime, confirmedCnaes FROM projects WHERE id = ?',
      [PROJECT_ID]
    );

    if (projects.length === 0) {
      console.log('Projeto não encontrado');
      return;
    }

    const project = projects[0];
    const porte = project.companySize || null;
    const regime = project.taxRegime || null;
    console.log('Projeto:', { porte, regime });

    const gapRisks = await deriveRisksFromGaps(PROJECT_ID, porte, regime);
    console.log('Gap risks derivados:', gapRisks.length);
    const dist = gapRisks.reduce((acc: Record<string, number>, r: any) => {
      acc[r.fonte_risco] = (acc[r.fonte_risco] || 0) + 1;
      return acc;
    }, {});
    console.log('fonte_risco distribuição:', dist);

    const { inserted, updated } = await persistRisks(PROJECT_ID, gapRisks);
    console.log('Resultado persistência:', { inserted, updated });
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
