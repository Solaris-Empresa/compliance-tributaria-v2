import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

const batteryDir = process.env.BATTERY_REPORT_DIR ?? "reports/battery-current";

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
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    testTimeout: 180000, // 180 segundos (3 minutos) para acomodar operações com LLM
    hookTimeout: 180000, // 180 segundos (3 minutos) para hooks (beforeEach, afterEach)
    reporters: [
      "default",
      ["./tests/reporters/realtime-reporter.ts", { outputDir: batteryDir }],
    ],
  },
});
