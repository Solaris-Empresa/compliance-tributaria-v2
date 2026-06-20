#!/usr/bin/env bash
# scripts/deploy-from-github.sh — DEPLOY CANÔNICO a partir do GitHub (NÃO do S3/origin).
#
# Resolve BUG-REGIME-FILTER-01 / REGRA-ORQ-25: o deploy tree do Manus resetava para
# `origin` (= S3, checkpoint stale) em vez do GitHub → produção presa pré-ADR-0038.
# Este script detecta o remote do GitHub pela URL (github.com) — funciona tanto onde
# origin=GitHub (dev) quanto onde origin=S3 e github/solaris=GitHub (sandbox Manus).
#
# Uso (Manus):  bash scripts/deploy-from-github.sh   # depois: publicar o tree resultante
set -euo pipefail

BRANCH="${1:-main}"

echo "=== [1/5] Detectando o remote do GitHub (não origin/S3) ==="
GH_REMOTE="$(git remote -v | grep -i 'github\.com' | grep '(fetch)' | head -1 | awk '{print $1}')"
if [ -z "${GH_REMOTE}" ]; then
  echo "❌ Nenhum remote aponta para github.com. Remotes disponíveis:"
  git remote -v
  exit 1
fi
echo "→ Remote GitHub: ${GH_REMOTE}"

echo "=== [2/5] Fetch com refspec explícito (R-SYNC-02 — evita ambiguidade origin/main) ==="
git fetch "${GH_REMOTE}" "refs/heads/${BRANCH}:refs/remotes/${GH_REMOTE}/${BRANCH}"

echo "=== [3/5] Reset hard para ${GH_REMOTE}/${BRANCH} (NÃO origin/S3) ==="
git reset --hard "refs/remotes/${GH_REMOTE}/${BRANCH}"
SHA="$(git rev-parse --short HEAD)"
echo "→ HEAD agora: ${SHA}"

echo "=== [4/5] Guard de frescor (aborta se o tree ainda estiver stale) ==="
node scripts/deploy-guard.cjs

echo "=== [5/5] Install + build (build re-roda o guard + write-build-env + vite + esbuild) ==="
# Injeta o SHA p/ o marcador build: no header (write-build-env lê SOURCE_COMMIT) —
# garante verificação visual do artefato servido (Lição #141), mesmo sem git no Docker.
export SOURCE_COMMIT="$(git rev-parse HEAD)"
pnpm install --frozen-lockfile
pnpm build

echo ""
echo "✅ Build pronto a partir de git=${SHA} (${GH_REMOTE}/${BRANCH})."
echo "   REPORTAR sempre: git=${SHA} / checkpoint=<id Manus> (REGRA-ORQ-25)."
echo "   Verificação pós-deploy: a página Admin deve mostrar build=${SHA}"
echo "   e o tree servido deve conter server/lib/solaris-context-filter.ts."
echo "   Agora publique/deploy a partir DESTE tree."
