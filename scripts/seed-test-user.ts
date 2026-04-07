/**
 * seed-test-user.ts — Cria o usuário de teste E2E no banco
 *
 * Uso: npx tsx scripts/seed-test-user.ts
 *
 * Cria:
 *   - Usuário: e2e-test@solaris.internal (openId: e2e-test-user)
 *   - Cliente demo: clientId=9999 (Advocacia & Contabilidade Ltda)
 *
 * NOTA: O projeto usa Manus OAuth. Este script cria o usuário diretamente
 * no banco para que auth.testLogin (E2E_TEST_MODE=true) funcione.
 *
 * Requer: DATABASE_URL no ambiente
 */
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../drizzle/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida')
  process.exit(1)
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL!)
  const db = drizzle(connection, { schema, mode: 'default' })

  // 1. Verificar se o usuário já existe
  const existing = await db.select()
    .from(schema.users)
    .where(eq(schema.users.openId, 'e2e-test-user'))
    .limit(1)

  if (existing.length > 0) {
    console.log(`✅ Usuário de teste já existe: id=${existing[0].id}`)
    await connection.end()
    return
  }

  // 2. Criar usuário de teste
  const [result] = await db.insert(schema.users).values({
    openId:    'e2e-test-user',
    name:      'E2E Test User',
    email:     'e2e-test@solaris.internal',
    role:      'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any)

  const userId = (result as any).insertId
  console.log(`✅ Usuário de teste criado: id=${userId}`)
  console.log(`   email: e2e-test@solaris.internal`)
  console.log(`   openId: e2e-test-user`)
  console.log(`   role: admin`)
  console.log()
  console.log('GitHub Secrets a criar:')
  console.log('  TEST_USER_EMAIL:     e2e-test@solaris.internal')
  console.log('  E2E_TEST_SECRET:     [valor de E2E_TEST_SECRET no servidor]')
  console.log('  PLAYWRIGHT_BASE_URL: https://iasolaris.manus.space')

  await connection.end()
}

main().catch(err => {
  console.error('❌ Erro ao criar usuário de teste:', err)
  process.exit(1)
})
