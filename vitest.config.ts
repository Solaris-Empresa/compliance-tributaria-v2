import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

const batteryDir = process.env.BATTERY_REPORT_DIR ?? "reports/battery-current";

export default defineConfig({
  root: templateRoot,
  // UX-BRIEFING-C-V2 PR-2 (#1344): JSX automático (react/jsx-runtime) p/ testes .tsx
  // de componentes — alinha o transform do vitest ao runtime do app (sem React global).
  esbuild: { jsx: "automatic" },
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
      // M2 PR-B — testes unitários de helpers de páginas client
      "client/src/pages/__tests__/**/*.test.ts",
      // M3.10 #987 — testes de scripts DoD (Lição #71)
      "scripts/**/*.test.ts",
      // UX-BRIEFING-C-V2 PR-2 (#1344) — testes de componentes briefing (.tsx)
      "client/src/components/**/*.test.tsx",
    ],
    testTimeout: 180000, // 180 segundos (3 minutos) para acomodar operações com LLM
    hookTimeout: 180000, // 180 segundos (3 minutos) para hooks (beforeEach, afterEach)
    reporters: [
      "default",
      ["./tests/reporters/realtime-reporter.ts", { outputDir: batteryDir }],
    ],
  },
});
