// scripts/deploy-guard.cjs — ABORTA o build se o working tree estiver DESATUALIZADO.
//
// Contexto (BUG-REGIME-FILTER-01 / 19-06-2026): o deploy tree do Manus resetava para
// `origin` (= S3/checkpoint stale, R-SYNC-02) em vez do GitHub → produção ficou presa
// PRÉ-ADR-0038. Nada de F1-F6/A1 foi deployado por toda a epopeia, e os relatórios de
// "deploy OK / 4 HEADs alinhados / smoke PASS" eram falsos no nível do artefato
// (ADR-0037 era processual, não mecânico — Lição #128).
//
// Este guard mecaniza a verificação: um tree antigo FALHA o build (visível), em vez de
// silenciosamente servir código velho. Roda como 1º passo de `pnpm build`.
//
// Manutenção: SENTINELS = arquivos que DEVEM existir no main atual. Ao shippar um marco
// novo, pode-se atualizar esta lista (mantê-la curta — é sinal de frescor, não inventário).
const fs = require("fs");

// Sentinelas de frescor — se faltarem, o tree predates o marco e está stale.
const SENTINELS = [
  "server/lib/solaris-context-filter.ts", // ADR-0038 (filtro CNAE × regime)
  "server/lib/category-eligibility.ts", // A-5 (eligibility unificada)
  "drizzle/0127_solaris_tax_regimes.sql", // migration tax_regimes
];

const missing = SENTINELS.filter((f) => !fs.existsSync(f));

if (missing.length > 0) {
  console.error("\n❌ DEPLOY-GUARD: working tree DESATUALIZADO — faltam arquivos do main atual:");
  missing.forEach((f) => console.error("   - " + f));
  console.error("\n→ Você está buildando uma ÁRVORE ANTIGA (provável reset para `origin`/S3, não GitHub).");
  console.error("→ Corrija ANTES de buildar (R-SYNC-02 — usar o remote do GitHub, não origin/S3):\n");
  console.error("   bash scripts/deploy-from-github.sh   # faz fetch+reset+build corretos");
  console.error("   # ou manualmente:");
  console.error("   git remote -v                        # achar o remote com github.com");
  console.error("   git fetch <gh> refs/heads/main:refs/remotes/<gh>/main");
  console.error("   git reset --hard refs/remotes/<gh>/main");
  console.error("   git rev-parse --short HEAD           # deve ser o HEAD do GitHub\n");
  process.exit(1);
}

console.log(`[deploy-guard] tree OK — ${SENTINELS.length} sentinelas de frescor presentes.`);
process.exit(0);
