import mysql from "mysql2/promise";
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [r1] = await conn.query("SELECT COUNT(*) as total FROM projects WHERE archetype IS NOT NULL");
  const [r2] = await conn.query("SELECT COUNT(*) as total FROM projects");
  console.log("Projects with archetype:", (r1 as any[])[0].total);
  console.log("Total projects:", (r2 as any[])[0].total);
  await conn.end();
}
main();
