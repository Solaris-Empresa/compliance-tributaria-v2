// Verificar usuários reais no banco
import { getDb } from './db';
import { users } from '../drizzle/schema';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB null'); process.exit(1); }
  const rows = await db.select({ id: users.id, role: users.role, openId: users.openId }).from(users).limit(5);
  console.log('Users:', JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
