import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [tables] = await conn.execute("SHOW TABLES LIKE '%rag%'");
console.log('RAG tables:', JSON.stringify(tables));

const [tables2] = await conn.execute("SHOW TABLES LIKE '%chunk%'");
console.log('Chunk tables:', JSON.stringify(tables2));

const [allTables] = await conn.execute("SHOW TABLES");
const tableNames = allTables.map(r => Object.values(r)[0]);
console.log('All tables:', tableNames.join(', '));

await conn.end();
