// scripts/write-build-env.cjs — gera .env.production.local de forma RESILIENTE.
//
// Contexto (CNAE-ADMIN-01, 19/06/2026): o build inline `node -e "...git rev-parse..."`
// quebrava em 2 cenários:
//   (a) Docker/Cloud Build SEM `.git` → `git rev-parse` lança → `node -e` exit 1 →
//       `&& vite build` abortado → `pnpm build` exit 1 SEM output (bug do deploy).
//   (b) quoting complexo do `node -e "..."` mangleado pelo shell do Docker.
//
// Este script: NUNCA falha (process.exit(0) sempre); resolve o hash por env var de CI
// quando disponível, senão git local, senão "unknown". Cross-platform, sem quoting frágil.
const fs = require("fs");

function resolveHash() {
  // 1) SHA injetado pela plataforma/CI (Manus, Vercel, GitHub Actions, etc.)
  const fromEnv =
    process.env.SOURCE_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.MANUS_COMMIT ||
    process.env.VITE_BUILD_HASH;
  if (fromEnv) return String(fromEnv).trim().slice(0, 12);

  // 2) git local (ambiente de dev com .git)
  try {
    return require("child_process")
      .execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    // 3) Docker sem .git → não falha o build
    return "unknown";
  }
}

const content =
  `VITE_BUILD_HASH=${resolveHash()}\n` +
  `VITE_BUILD_TIME=${new Date().toISOString()}\n`;

try {
  // `>` semântico: sobrescreve (não acumula — antes o `>>` empilhava e o dotenv usa o 1º).
  fs.writeFileSync(".env.production.local", content);
  console.log("[write-build-env] " + content.split("\n")[0]);
} catch (e) {
  console.warn("[write-build-env] aviso (ignorado):", e && e.message);
}

process.exit(0); // SEMPRE sucesso — jamais bloqueia o `&& vite build`
