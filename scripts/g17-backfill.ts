/**
 * G17 Backfill — Sprint O
 * Executa deriveRisksFromGaps + persistRisks para os 4 projetos reais
 * que têm gaps SOLARIS mas 0 riscos derivados.
 *
 * Executar UMA VEZ após deploy dos PRs #276 + #278 + #279.
 * Idempotente: persistRisks faz UPDATE se risco já existir.
 *
 * Uso:
 *   DATABASE_URL="..." pnpm exec tsx scripts/g17-backfill.ts
 */

import mysql from 'mysql2/promise';
import { deriveRisksFromGaps, persistRisks } from '../server/routers/riskEngine';

const PROJECT_IDS = [2310001, 2370001, 2370002, 2430001];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  console.log(JSON.stringify({
    event: 'g17_backfill_start',
    timestamp: new Date().toISOString(),
    projectIds: PROJECT_IDS,
  }));

  for (const projectId of PROJECT_IDS) {
    try {
      // Verificar gaps existentes antes
      const [gapRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM project_gaps_v3 WHERE project_id = ? AND source = ?',
        [projectId, 'solaris']
      );
      const gapCount = gapRows[0].total as number;

      if (gapCount === 0) {
        console.log(JSON.stringify({
          event: 'backfill_no_gaps',
          projectId,
          message: 'Nenhum gap SOLARIS encontrado — pulando',
        }));
        continue;
      }

      // Verificar riscos já existentes
      const [riskRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM project_risks_v3 WHERE project_id = ?',
        [projectId]
      );
      const existingRisks = riskRows[0].total as number;

      // Derivar e persistir riscos
      const gaps = await deriveRisksFromGaps(projectId);

      if (gaps.length > 0) {
        await persistRisks(projectId, gaps);
        console.log(JSON.stringify({
          event: 'backfill_ok',
          projectId,
          gapsFound: gapCount,
          risksExistingBefore: existingRisks,
          risksDerived: gaps.length,
        }));
      } else {
        console.log(JSON.stringify({
          event: 'backfill_no_risks_derived',
          projectId,
          gapsFound: gapCount,
          message: 'deriveRisksFromGaps retornou 0 — verificar filtros do riskEngine',
        }));
      }
    } catch (err) {
      console.log(JSON.stringify({
        event: 'backfill_error',
        projectId,
        error: String(err),
      }));
    }
  }

  // Verificação final
  const [finalRows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT project_id, COUNT(*) as riscos
     FROM project_risks_v3
     WHERE project_id IN (${PROJECT_IDS.join(',')})
     GROUP BY project_id`,
  );

  console.log(JSON.stringify({
    event: 'g17_backfill_complete',
    timestamp: new Date().toISOString(),
    verification: finalRows,
    expected: '4 linhas com riscos > 0',
  }));

  await conn.end();
}

main().catch((err) => {
  console.error('Backfill falhou:', err);
  process.exit(1);
});
