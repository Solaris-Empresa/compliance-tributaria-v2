import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function clearDatabase() {
  console.log("🗑️  Iniciando limpeza do banco de dados...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Desabilitar verificação de chaves estrangeiras temporariamente
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Lista de todas as tabelas (ordem reversa para evitar problemas de FK)
    const tablesToClear = [
      "auditLog",
      "projectPermissions",
      "taskComments",
      "taskObservers",
      "actions",
      "branchActionPlanVersions",
      "branchActionPlans",
      "branchAssessmentVersions",
      "branchAssessments",
      "branchAssessmentTemplates",
      "corporateActionPlanVersions",
      "corporateActionPlans",
      "corporateAssessmentVersions",
      "corporateAssessments",
      "projectBranches",
      "activityBranches",
      "briefingVersions",
      "briefings",
      "riskMatrixVersions",
      "riskMatrixPromptHistory",
      "riskMatrix",
      "cosoControls",
      "milestones",
      "phases",
      "notificationPreferences",
      "notifications",
      "projectParticipants",
      "projects",
      // NÃO limpar tabela users para manter autenticação
    ];

    let clearedCount = 0;
    for (const table of tablesToClear) {
      try {
        const [result] = await connection.execute(`DELETE FROM ${table}`);
        console.log(`✅ Tabela ${table} limpa (${result.affectedRows} registros removidos)`);
        clearedCount++;
      } catch (error) {
        console.log(`⚠️  Tabela ${table} não existe ou erro: ${error.message}`);
      }
    }

    // Reabilitar verificação de chaves estrangeiras
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log(`\n✅ Limpeza concluída! ${clearedCount} tabelas limpas.`);
    console.log("ℹ️  Tabela 'users' mantida para preservar autenticação.");

  } catch (error) {
    console.error("❌ Erro ao limpar banco de dados:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

clearDatabase();
