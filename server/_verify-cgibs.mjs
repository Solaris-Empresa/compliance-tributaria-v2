import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute(
  "SELECT lei, COUNT(*) as total FROM ragDocuments WHERE lei LIKE 'resolucao_cgibs%' GROUP BY lei ORDER BY lei"
);
console.log('\nSELECT lei, COUNT(*) as total FROM ragDocuments WHERE lei LIKE \'resolucao_cgibs%\' GROUP BY lei;');
console.log('lei                  | total');
console.log('---------------------|------');
for (const r of rows) {
  console.log(String(r.lei).padEnd(20), '|', r.total);
}
const [total] = await db.execute(
  "SELECT COUNT(*) as total FROM ragDocuments WHERE lei LIKE 'resolucao_cgibs%'"
);
console.log('\nTOTAL CGIBS:', total[0].total, '(esperado: 6)');
await db.end();
