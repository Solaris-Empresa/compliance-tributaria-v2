import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

// Configuração exclusiva para testes UNITÁRIOS (sem banco de dados).
// Testes de integração que requerem TiDB Cloud estão em server/integration/
// e são excluídos aqui para que o CI passe sem acesso ao banco.
export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/lib/**/*.test.ts",
    ],
    exclude: ["server/integration/**"],
    testTimeout: 180000, // 180 segundos (3 minutos) para acomodar operações com LLM
    hookTimeout: 180000, // 180 segundos (3 minutos) para hooks (beforeEach, afterEach)
  },
});
