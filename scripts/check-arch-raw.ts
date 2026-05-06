import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT archetype FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  const arch = typeof row.archetype === 'string' ? JSON.parse(row.archetype) : row.archetype;
  // Check if it has 'objeto' (PerfilDimensional) or 'dim_objeto' (DB column format)
  console.log('Has "objeto":', 'objeto' in arch);
  console.log('Has "dim_objeto":', 'dim_objeto' in arch);
  console.log('Has "papel_na_cadeia":', 'papel_na_cadeia' in arch);
  console.log('Has "dim_papel_na_cadeia":', 'dim_papel_na_cadeia' in arch);
  // Show what getArchetypeContext would see
  console.log('\n=== What getArchetypeContext receives ===');
  console.log('arch.objeto:', arch.objeto);
  console.log('arch.papel_na_cadeia:', arch.papel_na_cadeia);
  console.log('arch.dim_objeto:', arch.dim_objeto);
  console.log('arch.dim_papel_na_cadeia:', arch.dim_papel_na_cadeia);
  await conn.end();
}
main().catch(console.error);
