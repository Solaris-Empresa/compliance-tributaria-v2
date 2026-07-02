// scripts/build-server.cjs — #1689: bundla o servidor com esbuild INJETANDO o SHA git
// como constante literal (__BUILD_SHA__) dentro do dist/index.js.
//
// Por que --define e não arquivo/env: o Manus Autoscale usa CONTAINERS SEPARADOS para
// build e runtime. Arquivos gerados no build (.env.production.local, build-meta.json) e
// env vars do build NÃO persistem para o runtime → /api/health ficava "unknown".
// A constante embutida no bundle é código compilado → sobrevive ao runtime container.
//
// Substitui a chamada direta `esbuild server/_core/index.ts ...` do package.json.

const esbuild = require("esbuild");
const fs = require("fs");

function resolveSha() {
  // 1) do .env.production.local (escrito por write-build-env.cjs no passo anterior do build)
  try {
    const env = fs.readFileSync(".env.production.local", "utf8");
    const m = env.match(/^VITE_BUILD_HASH=(.+)$/m);
    if (m && m[1].trim() && m[1].trim() !== "unknown") return m[1].trim();
  } catch {
    /* segue */
  }
  // 2) env de CI/plataforma
  const fromEnv =
    process.env.SOURCE_COMMIT ||
    process.env.GITHUB_SHA ||
    process.env.MANUS_COMMIT ||
    process.env.VITE_BUILD_HASH;
  if (fromEnv) return String(fromEnv).trim().slice(0, 12);
  // 3) git local
  try {
    return require("child_process")
      .execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    /* segue */
  }
  return "unknown";
}

const sha = resolveSha();
console.log("[build-server] injetando __BUILD_SHA__=" + sha);

esbuild
  .build({
    entryPoints: ["server/_core/index.ts"],
    platform: "node",
    packages: "external",
    bundle: true,
    format: "esm",
    outdir: "dist",
    // JSON.stringify → o valor vira um literal de string JS ("abc123") no bundle.
    define: { __BUILD_SHA__: JSON.stringify(sha) },
  })
  .then(() => console.log("[build-server] dist/index.js OK"))
  .catch((e) => {
    console.error("[build-server] esbuild falhou:", e && e.message);
    process.exit(1);
  });
