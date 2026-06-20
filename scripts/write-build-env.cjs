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

  // 2) git local (ambiente de dev com .git + binário git no PATH)
  try {
    return require("child_process")
      .execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    /* segue para o fallback via fs */
  }

  // 3) leitura direta do .git via fs (Docker às vezes tem .git mas NÃO o binário git)
  try {
    const head = fs.readFileSync(".git/HEAD", "utf8").trim();
    if (/^[0-9a-f]{7,40}$/.test(head)) return head.slice(0, 12); // detached HEAD
    if (head.startsWith("ref:")) {
      const ref = head.slice(4).trim();
      // 3a) ref solto
      try {
        return fs.readFileSync(`.git/${ref}`, "utf8").trim().slice(0, 12);
      } catch {
        /* ref empacotado */
      }
      // 3b) packed-refs
      const packed = fs.readFileSync(".git/packed-refs", "utf8");
      const line = packed.split("\n").find((l) => l.endsWith(" " + ref));
      if (line) return line.split(" ")[0].slice(0, 12);
    }
  } catch {
    /* sem .git */
  }

  // 4) último recurso → não falha o build
  return "unknown";
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
