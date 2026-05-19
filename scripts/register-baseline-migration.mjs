import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Clear old migrations
await conn.execute('DELETE FROM __drizzle_migrations');
console.log('Cleared __drizzle_migrations (66 old entries removed)');

// Compute hash of the baseline SQL file
const sql = readFileSync('drizzle/0000_baseline_onda2_reconciliation.sql', 'utf8');
const hash = createHash('sha256').update(sql).digest('hex');
console.log('Baseline hash:', hash);

// Insert the single baseline entry
await conn.execute(
  'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
  [hash, Date.now()]
);
console.log('Inserted baseline migration entry');

// Verify
const [rows] = await conn.execute('SELECT * FROM __drizzle_migrations');
console.log('Total migrations now:', rows.length);
console.log('Entry:', JSON.stringify(rows[0]));

await conn.end();
process.exit(0);
