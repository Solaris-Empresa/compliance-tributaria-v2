import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
const [cols] = await conn.execute('DESCRIBE projects');
console.log(JSON.stringify(cols, null, 2));
// Verificar um projeto existente para copiar os campos
const [sample] = await conn.execute('SELECT * FROM projects LIMIT 1');
console.log('\nProjeto exemplo:', JSON.stringify((sample as any[])[0], null, 2));
await conn.end();
