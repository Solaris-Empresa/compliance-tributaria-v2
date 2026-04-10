/**
 * Script de execução e gate da migration 0067
 * GAP-CONTRACT-01: FK risks_v4.categoria → risk_categories.codigo
 */
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = await mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 3,
});

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log("=== Migration 0067 — GAP-CONTRACT-01 ===\n");

    // 1. Verificar se FK já existe
    const [existing] = await conn.execute(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'risks_v4'
        AND CONSTRAINT_NAME = 'fk_risks_v4_categoria'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `);

    if (existing.length > 0) {
      console.log("⚠️  FK fk_risks_v4_categoria já existe — pulando migration");
    } else {
      // 2. Executar migration
      const sql = readFileSync(
        join(__dirname, "../drizzle/0067_fk_risks_v4_categoria.sql"),
        "utf8"
      );
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("--"));

      for (const stmt of statements) {
        await conn.execute(stmt);
        console.log(`✅ Executado: ${stmt.substring(0, 60)}...`);
      }
      console.log("\n✅ Migration 0067 aplicada com sucesso\n");
    }

    // 3. GATE A: INSERT com categoria inexistente → deve dar erro
    console.log("=== GATE A: INSERT categoria='inexistente' → deve dar erro ===");
    try {
      await conn.execute(`
        INSERT INTO risks_v4 (
          id, project_id, rule_id, type, categoria, titulo,
          artigo, severidade, urgencia, evidence, breadcrumb,
          source_priority, confidence, status, created_by, updated_by,
          created_at, updated_at
        ) VALUES (
          UUID(), 999999, 'test-fk-invalid', 'risk', 'inexistente',
          'Teste FK violação', 'art-test', 'media', 'curto_prazo',
          '{}', '[]', 'cnae', 0.9, 'active', 0, 0, NOW(), NOW()
        )
      `);
      console.log("❌ GATE A FALHOU — INSERT deveria ter dado erro de FK");
      process.exit(1);
    } catch (err) {
      if (err.code === "ER_NO_REFERENCED_ROW_2" || err.errno === 1452) {
        console.log(`✅ GATE A PASSOU — erro FK correto: ${err.code}`);
      } else {
        console.log(`⚠️  Erro inesperado: ${err.code} — ${err.message}`);
        process.exit(1);
      }
    }

    // 4. GATE B: INSERT com categoria='imposto_seletivo' → deve funcionar
    console.log("\n=== GATE B: INSERT categoria='imposto_seletivo' → deve funcionar ===");
    try {
      const testId = 'test-fk-gate-b-' + Date.now();
      const [result] = await conn.execute(`
        INSERT INTO risks_v4 (
          id, project_id, rule_id, type, categoria, titulo,
          artigo, severidade, urgencia, evidence, breadcrumb,
          source_priority, confidence, status, created_by, updated_by,
          created_at, updated_at
        ) VALUES (
          ?, 999999, 'test-fk-valid', 'risk', 'imposto_seletivo',
          'Teste FK válido', 'art-test', 'media', 'curto_prazo',
          '{}', '[]', 'cnae', 0.9, 'active', 0, 0, NOW(), NOW()
        )
      `, [testId]);
      console.log(`✅ GATE B PASSOU — INSERT OK (id: ${result.insertId})`);

      // Limpar registro de teste
      await conn.execute(`DELETE FROM risks_v4 WHERE id = ?`, [testId]);
      console.log(`   Registro de teste removido (id: ${testId})`);
    } catch (err) {
      console.log(`❌ GATE B FALHOU — ${err.code}: ${err.message}`);
      process.exit(1);
    }

    // 5. Verificar FK no information_schema
    console.log("\n=== Verificação final: FK no information_schema ===");
    const [fkCheck] = await conn.execute(`
      SELECT
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
      FROM information_schema.KEY_COLUMN_USAGE kcu
      JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
        ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
      WHERE kcu.TABLE_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = 'risks_v4'
        AND kcu.CONSTRAINT_NAME = 'fk_risks_v4_categoria'
    `);

    if (fkCheck.length > 0) {
      const fk = fkCheck[0];
      console.log(`✅ FK confirmada:`);
      console.log(`   ${fk.CONSTRAINT_NAME}: risks_v4.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      console.log(`   ON UPDATE ${fk.UPDATE_RULE} · ON DELETE ${fk.DELETE_RULE}`);
    } else {
      console.log("❌ FK não encontrada no information_schema");
      process.exit(1);
    }

    console.log("\n=== RESULTADO: TODOS OS GATES PASSARAM ✅ ===");
    console.log("GAP-CONTRACT-01 resolvido: integridade referencial garantida");
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("ERRO:", err.message);
  process.exit(1);
});
