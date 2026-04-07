#!/usr/bin/env bash
# Gate ADR — Architecture Decision Record Gate
# Verifica que mudanças arquiteturais têm ADR correspondente
# Origem: BUG-MANUAL-02 — DEC-M3-05 implementado sem ADR ativo no fluxo de dev
#
# Uso:
#   ./scripts/gate-adr.sh                    # compara com origin/main
#   ./scripts/gate-adr.sh origin/feat/branch # compara com branch específica

set -e

BASE=${1:-origin/main}
ADR_DIR="docs/adr"
CONTRACT_DIR="docs/contratos"
FAILED=0

echo "════════════════════════════════════════════════"
echo "  Gate ADR — Architecture Decision Record Check"
echo "  Base: $BASE"
echo "════════════════════════════════════════════════"

# ── Arquivos arquiteturais críticos que EXIGEM ADR ──────────────────────────
# Se qualquer um destes arquivos for modificado, deve existir um ADR
# que referencia a mudança

ARCHITECTURAL_FILES=(
  "server/flowStateMachine.ts"
  "drizzle/schema.ts"
  "server/routers-fluxo-v3.ts"
  "client/src/App.tsx"
  "client/src/pages/DiagnosticoStepper.tsx"
  "server/lib/completeness.ts"
  "server/lib/tracked-question.ts"
  "server/lib/risk-categorizer.ts"
)

# ── Passo 1: verificar quais arquivos arquiteturais foram modificados ────────
echo ""
echo "→ Arquivos arquiteturais modificados neste PR:"

MODIFIED_ARCH=()
for file in "${ARCHITECTURAL_FILES[@]}"; do
  if git diff --name-only "$BASE" -- "$file" | grep -q .; then
    echo "  ⚠️  $file"
    MODIFIED_ARCH+=("$file")
  fi
done

if [ ${#MODIFIED_ARCH[@]} -eq 0 ]; then
  echo "  (nenhum arquivo arquitetural modificado — Gate ADR não se aplica)"
  echo ""
  echo "✅ Gate ADR: PASS (sem mudanças arquiteturais)"
  exit 0
fi

# ── Passo 2: verificar se existe ADR para as mudanças ───────────────────────
echo ""
echo "→ Verificando ADRs existentes em $ADR_DIR/:"

ADR_COUNT=$(find "$ADR_DIR" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  ADRs encontrados: $ADR_COUNT"

if [ "$ADR_COUNT" -eq 0 ]; then
  echo "  ❌ BLOQUEADO: nenhum ADR encontrado em $ADR_DIR/"
  echo "     Criar pelo menos 1 ADR antes de modificar arquivos arquiteturais."
  FAILED=1
fi

# ── Passo 3: verificar se PR body referencia ADR ─────────────────────────────
# Usar arquivo temporário com o body do PR (se disponível via CI)
echo ""
echo "→ Verificando referência a ADR no body do PR:"
echo "  (Verificação manual — Orquestrador deve confirmar)"
echo "  Template obrigatório: ## Gate ADR · ADR-XXXX referenciado no body do PR"

# ── Passo 4: verificar se contrato existe para mudanças de interface ─────────
echo ""
echo "→ Verificando contratos para mudanças de interface:"

INTERFACE_FILES=(
  "server/routers-fluxo-v3.ts"
  "server/lib/tracked-question.ts"
  "server/lib/completeness.ts"
)

for file in "${INTERFACE_FILES[@]}"; do
  if git diff --name-only "$BASE" -- "$file" | grep -q .; then
    # Verificar se existe algum contrato em docs/contratos/
    CONTRACT_COUNT=$(find "$CONTRACT_DIR" -name "CONTRATO-*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$CONTRACT_COUNT" -eq 0 ]; then
      echo "  ❌ BLOQUEADO: $file modificado sem contrato em $CONTRACT_DIR/"
      echo "     Criar CONTRATO antes de modificar interfaces públicas."
      FAILED=1
    else
      echo "  ✅ $file — $CONTRACT_COUNT contrato(s) encontrado(s)"
    fi
  fi
done

# ── Resultado final ──────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
if [ "$FAILED" -eq "0" ]; then
  echo "✅ Gate ADR: PASS"
  echo ""
  echo "   Checklist final (confirmar manualmente no body do PR):"
  echo "   [ ] ADR criado ou atualizado em docs/adr/"
  echo "   [ ] Contrato criado ou atualizado em docs/contratos/ (se interface)"
  echo "   [ ] ADR referenciado no body do PR: ## Gate ADR · ADR-XXXX"
else
  echo "❌ Gate ADR: BLOQUEADO"
  echo ""
  echo "   Ações necessárias antes do merge:"
  echo "   1. Criar ADR em: docs/adr/ADR-XXXX-descricao.md"
  echo "   2. Se mudança de interface: criar docs/contratos/CONTRATO-*.md"
  echo "   3. Referenciar ADR no body do PR"
  echo "   4. Re-executar: ./scripts/gate-adr.sh"
  exit 1
fi
echo "════════════════════════════════════════════════"
