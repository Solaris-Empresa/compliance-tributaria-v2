import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT archetype, operationProfile FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  const arch = typeof row.archetype === 'string' ? JSON.parse(row.archetype) : row.archetype;
  const op = typeof row.operationProfile === 'string' ? JSON.parse(row.operationProfile) : row.operationProfile;
  console.log('=== ARCHETYPE (relevant fields) ===');
  console.log('derived_legacy_operation_type:', arch.derived_legacy_operation_type);
  console.log('dim_objeto:', arch.dim_objeto);
  console.log('dim_papel_na_cadeia:', arch.dim_papel_na_cadeia);
  console.log('dim_tipo_de_relacao:', arch.dim_tipo_de_relacao);
  console.log('natureza_operacao_principal:', arch.natureza_operacao_principal);
  console.log('ncms_canonicos:', JSON.stringify(arch.ncms_canonicos));
  console.log('nbss_canonicos:', JSON.stringify(arch.nbss_canonicos));
  console.log('status_arquetipo:', arch.status_arquetipo);
  console.log('');
  console.log('=== OPERATION PROFILE ===');
  console.log('operationType:', op?.operationType);
  console.log('principaisProdutos:', JSON.stringify(op?.principaisProdutos));
  console.log('principaisServicos:', JSON.stringify(op?.principaisServicos));
  await conn.end();
}
main().catch(console.error);
