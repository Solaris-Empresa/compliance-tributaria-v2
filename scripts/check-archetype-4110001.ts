import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows] = await conn.execute('SELECT archetype FROM projects WHERE id = 4110001');
  const row = (rows as any)[0];
  const arch = row?.archetype;
  if (!arch) { console.log('archetype: NULL'); await conn.end(); return; }
  const parsed = typeof arch === 'string' ? JSON.parse(arch) : arch;
  console.log('archetype.derived_legacy_operation_type:', parsed?.arquetipo_partial?.derived_legacy_operation_type ?? parsed?.derived_legacy_operation_type ?? 'NOT FOUND');
  console.log('archetype.papel_na_cadeia:', parsed?.arquetipo_partial?.papel_na_cadeia ?? parsed?.perfil?.papel_na_cadeia ?? 'NOT FOUND');
  console.log('archetype.objeto:', JSON.stringify(parsed?.arquetipo_partial?.objeto ?? parsed?.perfil?.objeto ?? 'NOT FOUND'));
  console.log('archetype keys (top-level):', Object.keys(parsed));
  if (parsed.perfil) console.log('archetype.perfil keys:', Object.keys(parsed.perfil));
  if (parsed.arquetipo_partial) console.log('archetype.arquetipo_partial keys:', Object.keys(parsed.arquetipo_partial));
  await conn.end();
}
main().catch(console.error);
