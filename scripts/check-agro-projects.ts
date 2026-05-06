import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute("SELECT id, `operationProfile` FROM projects WHERE JSON_EXTRACT(`operationProfile`, '$.operationType') = 'agronegocio'");
  console.log(`Projects with operationType=agronegocio: ${(rows as any[]).length}`);
  for (const row of rows as any[]) {
    const op = typeof row.operationProfile === 'string' ? JSON.parse(row.operationProfile) : row.operationProfile;
    console.log(`  #${row.id}: NCMs=${JSON.stringify(op?.principaisProdutos?.map((p: any) => p.ncm_code))} Servicos=${JSON.stringify(op?.principaisServicos?.map((s: any) => s.nbs_code))}`);
  }
  await conn.end();
}

main().catch(console.error);
