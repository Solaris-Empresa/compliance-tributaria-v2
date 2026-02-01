import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada");
  process.exit(1);
}

async function seedInitialData() {
  console.log("🌱 Iniciando seed de dados iniciais...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  try {
    // Seed de Ramos de Atividade (Issue #1)
    const branches = [
      { code: "COM", name: "Comércio", description: "Atividades comerciais e varejo" },
      { code: "IND", name: "Indústria", description: "Atividades industriais e manufatura" },
      { code: "SER", name: "Serviços", description: "Prestação de serviços diversos" },
      { code: "AGR", name: "Agronegócio", description: "Atividades agrícolas e pecuárias" },
      { code: "SAU", name: "Saúde", description: "Serviços de saúde e hospitalar" },
      { code: "IMO", name: "Imobiliário", description: "Compra, venda e locação de imóveis" },
      { code: "LOG", name: "Logística", description: "Transporte e armazenagem" },
      { code: "EDU", name: "Educação", description: "Ensino e treinamento" },
    ];

    console.log("\n📦 Inserindo ramos de atividade...");
    for (const branch of branches) {
      await connection.execute(
        "INSERT INTO activityBranches (code, name, description, active) VALUES (?, ?, ?, ?)",
        [branch.code, branch.name, branch.description, true]
      );
      console.log(`✅ Ramo ${branch.code} - ${branch.name} criado`);
    }

    console.log("\n✅ Seed concluído com sucesso!");
    console.log(`📊 ${branches.length} ramos de atividade criados`);

  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedInitialData();
