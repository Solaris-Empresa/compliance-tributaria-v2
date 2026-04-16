import { query } from "../server/lib/db-queries-risks-v4";

async function main() {
  console.log("=== 1. action_plans do projeto 720001 ===");
  const plans = await query(
    `SELECT id, titulo, status, responsavel, prazo_dias, created_at FROM action_plans WHERE project_id = 720001 ORDER BY created_at`
  ) as any[];
  console.log(`Total plans: ${plans.length}`);
  plans.forEach(p => console.log(`  [${p.id}] ${p.titulo?.substring(0,50)} | status: ${p.status}`));

  console.log("\n=== 2. tasks do projeto 720001 ===");
  const tasks = await query(
    `SELECT id, action_plan_id, titulo, status FROM tasks WHERE project_id = 720001`
  ) as any[];
  console.log(`Total tasks: ${tasks.length}`);

  console.log("\n=== 3. Tasks por action_plan ===");
  for (const p of plans) {
    const t = await query(
      `SELECT COUNT(*) as cnt FROM tasks WHERE action_plan_id = ?`, [p.id]
    ) as any[];
    console.log(`  plan ${p.id}: ${t[0].cnt} tasks`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
