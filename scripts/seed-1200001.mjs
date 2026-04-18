/**
 * seed-1200001.mjs — Popular projeto 1200001 com riscos, planos e tarefas
 * Usa conexão direta ao banco (sem tRPC) para diagnóstico inicial.
 * Aprovações serão feitas via tRPC para garantir audit_log correto.
 */
import mysql from "mysql2/promise";

const PROJECT_ID = 1200001;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("=== Estado inicial do projeto 1200001 ===\n");

    // risks_v4
    const [risks] = await conn.execute(
      "SELECT id, categoria, severidade, status, approved_at FROM risks_v4 WHERE project_id = ? ORDER BY id",
      [PROJECT_ID]
    );
    console.log(`risks_v4: ${risks.length} registros`);
    risks.forEach(r => {
      console.log(`  id=${r.id} cat=${r.categoria} sev=${r.severidade} status=${r.status} approved=${r.approved_at ? 'SIM' : 'NÃO'}`);
    });

    // action_plans
    const [plans] = await conn.execute(
      "SELECT id, risk_id, status FROM action_plans WHERE project_id = ? ORDER BY id",
      [PROJECT_ID]
    );
    console.log(`\naction_plans: ${plans.length} registros`);
    plans.forEach(p => {
      console.log(`  id=${p.id} risk_id=${p.risk_id} status=${p.status}`);
    });

    // tasks
    const [tasks] = await conn.execute(
      `SELECT t.id, t.action_plan_id, t.status 
       FROM tasks t 
       JOIN action_plans ap ON t.action_plan_id = ap.id 
       WHERE ap.project_id = ? ORDER BY t.id`,
      [PROJECT_ID]
    );
    console.log(`\ntasks: ${tasks.length} registros`);

    // audit_log
    const [audit] = await conn.execute(
      "SELECT COUNT(*) as total FROM audit_log WHERE project_id = ?",
      [PROJECT_ID]
    );
    console.log(`\naudit_log: ${audit[0].total} registros`);

    // IDs de riscos ativos para usar nas chamadas tRPC
    const activeRisks = risks.filter(r => r.status === 'active');
    const approvedRisks = risks.filter(r => r.approved_at !== null);
    console.log(`\nRiscos ativos: ${activeRisks.length}`);
    console.log(`Riscos aprovados: ${approvedRisks.length}`);
    if (activeRisks.length > 0) {
      console.log(`\nIDs para aprovar via tRPC (primeiros 5):`);
      activeRisks.slice(0, 5).forEach(r => console.log(`  "${r.id}"`));
    }

  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error("ERRO:", e.message); process.exit(1); });
