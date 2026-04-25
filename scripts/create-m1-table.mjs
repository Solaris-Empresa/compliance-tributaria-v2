/**
 * scripts/create-m1-table.mjs
 * Cria a tabela m1_runner_logs no banco de dados (idempotente via IF NOT EXISTS).
 * Uso: node scripts/create-m1-table.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não definida");
  process.exit(1);
}

const SQL = `
CREATE TABLE IF NOT EXISTS \`m1_runner_logs\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`project_id\` int NOT NULL,
  \`user_id\` int NOT NULL,
  \`user_role\` varchar(32) NOT NULL,
  \`status_arquetipo\` varchar(32) NOT NULL,
  \`test_status\` varchar(16) NOT NULL,
  \`fallback_count\` int NOT NULL DEFAULT 0,
  \`hard_block_count\` int NOT NULL DEFAULT 0,
  \`lc_conflict_count\` int NOT NULL DEFAULT 0,
  \`missing_field_count\` int NOT NULL DEFAULT 0,
  \`blockers_json\` json,
  \`missing_fields_json\` json,
  \`score_confianca\` int,
  \`risk_divergence\` tinyint(1) DEFAULT 0,
  \`risk_divergence_note\` text,
  \`data_version\` varchar(32) NOT NULL,
  \`perfil_hash\` varchar(64),
  \`rules_hash\` varchar(64),
  \`duration_ms\` int,
  \`created_at\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`m1_runner_logs_id\` PRIMARY KEY(\`id\`),
  INDEX \`idx_m1_runner_logs_project\`(\`project_id\`),
  INDEX \`idx_m1_runner_logs_status\`(\`status_arquetipo\`),
  INDEX \`idx_m1_runner_logs_created\`(\`created_at\`),
  INDEX \`idx_m1_runner_logs_user\`(\`user_id\`)
)
`;

try {
  const conn = await mysql.createConnection(DATABASE_URL);
  await conn.execute(SQL);
  await conn.end();
  console.log("✅ Tabela m1_runner_logs criada (ou já existia)");
} catch (err) {
  console.error("❌ Erro ao criar tabela:", err.message);
  process.exit(1);
}
