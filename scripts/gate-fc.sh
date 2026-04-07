#!/usr/bin/env bash
# Gate FC — Feature Completeness
# Verifica que toda procedure tRPC nova tem consumidor no frontend
# Executar antes do merge de qualquer PR que toque routers-fluxo-v3.ts
#
# Uso:
#   ./scripts/gate-fc.sh                          # compara com origin/main
#   ./scripts/gate-fc.sh origin/feat/alguma-branch # compara com branch específica

set -e

BASE=${1:-origin/main}
ROUTER="server/routers-fluxo-v3.ts"
FRONTEND_DIR="client/src"
FAILED=0

echo "═══════════════════════════════════════════════"
echo "  Gate FC — Feature Completeness Check"
echo "  Base: $BASE"
echo "═══════════════════════════════════════════════"

# ── Passo 1: listar procedures novas adicionadas neste PR ──────────────────
echo ""
echo "→ Procedures novas em $ROUTER:"

NEW_PROCS=$(git diff "$BASE" -- "$ROUTER" \
  | grep "^+" \
  | grep -E "^\+\s+[a-zA-Z][a-zA-Z0-9]+\s*:" \
  | grep -v "^+++\|\/\/" \
  | sed 's/.*+\s*//' \
  | sed 's/:.*//' \
  | sed 's/\s//g' \
  | sort -u)

if [ -z "$NEW_PROCS" ]; then
  echo "  (nenhuma procedure nova — Gate FC não se aplica)"
  echo ""
  echo "✅ Gate FC: PASS (nenhuma procedure nova)"
  exit 0
fi

echo "$NEW_PROCS" | while read -r proc; do
  echo "  + $proc"
done

# ── Passo 2: para cada procedure nova, buscar consumidor no frontend ───────
echo ""
echo "→ Verificando consumidores no frontend ($FRONTEND_DIR/):"
echo ""

while IFS= read -r proc; do
  # Buscar referência ao nome da procedure em arquivos .tsx e .ts do frontend
  REFS=$(grep -rl "$proc" "$FRONTEND_DIR" 2>/dev/null | head -5)
  COUNT=$(echo "$REFS" | grep -c "." 2>/dev/null || echo "0")

  if [ "$COUNT" -eq "0" ] || [ -z "$REFS" ]; then
    echo "  ❌ BLOQUEADO: '$proc' não tem consumidor em $FRONTEND_DIR/"
    echo "     → Criar componente React que chame: trpc.fluxoV3.$proc"
    FAILED=1
  else
    echo "  ✅ '$proc' encontrado em:"
    echo "$REFS" | sed 's/^/     /'
  fi
done <<< "$NEW_PROCS"

# ── Passo 3: verificar novas rotas em App.tsx ──────────────────────────────
echo ""
echo "→ Verificando rotas em App.tsx:"

NEW_ROUTES=$(git diff "$BASE" -- "$ROUTER" \
  | grep "^+" \
  | grep -oE "'\/[a-z][a-z0-9/-]+'" \
  | tr -d "'" \
  | sort -u)

if [ -n "$NEW_ROUTES" ]; then
  APP_TSX="client/src/App.tsx"
  while IFS= read -r route; do
    if grep -q "$route" "$APP_TSX" 2>/dev/null; then
      echo "  ✅ rota '$route' presente em App.tsx"
    else
      echo "  ⚠️  rota '$route' referenciada no router mas não em App.tsx"
      echo "     → Verificar se rota precisa ser adicionada"
    fi
  done <<< "$NEW_ROUTES"
fi

# ── Resultado final ────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
if [ "$FAILED" -eq "0" ]; then
  echo "✅ Gate FC: PASS — todas as procedures têm consumidor no frontend"
else
  echo "❌ Gate FC: BLOQUEADO — procedures sem consumidor no frontend"
  echo ""
  echo "   Ação necessária antes do merge:"
  echo "   1. Criar componente React para cada procedure marcada como ❌"
  echo "   2. Adicionar rota em App.tsx se necessário"
  echo "   3. Atualizar connection-manifest.test.ts"
  echo "   4. Re-executar: ./scripts/gate-fc.sh"
  exit 1
fi
echo "═══════════════════════════════════════════════"
