#!/bin/bash
# pre-close-check.sh — PRE-CLOSE-CHECKLIST automático (ORQ-17)
# Valida que um PR realmente implementa o que a issue pede.
# Uso: ./scripts/pre-close-check.sh
# Requer: GH_TOKEN, PR_NUMBER, REPO como env vars

set -euo pipefail

REPO="${REPO:?REPO env var required}"
PR_NUMBER="${PR_NUMBER:?PR_NUMBER env var required}"

PASS=0
FAIL=0
WARN=0

log_pass() { echo "✅ PC-$1: $2"; PASS=$((PASS + 1)); }
log_fail() { echo "❌ PC-$1: $2"; FAIL=$((FAIL + 1)); }
log_warn() { echo "⚠️  PC-$1: $2"; WARN=$((WARN + 1)); }
log_skip() { echo "⏭️  PC-$1: $2"; }

# ─── Resolve issue number ───────────────────────────────────────────────────

# ─── GAP 1: Validar 1 issue por PR ──────────────────────────────────────────

ISSUE_COUNT=$(gh pr view "$PR_NUMBER" \
  --repo "$REPO" \
  --json closingIssuesReferences \
  --jq '.closingIssuesReferences | length' 2>/dev/null || echo "0")

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "SKIP: PR sem 'Closes #N' — checklist não se aplica"
  exit 0
fi

if [ "$ISSUE_COUNT" -gt 1 ]; then
  echo "::error::PC-0: PR fecha $ISSUE_COUNT issues — máximo permitido é 1."
  echo "Separar em PRs individuais para validação correta de cada entrega."
  exit 1
fi

ISSUE_NUMBER=$(gh pr view "$PR_NUMBER" \
  --repo "$REPO" \
  --json closingIssuesReferences \
  --jq '.closingIssuesReferences[0].number')

echo "═══════════════════════════════════════════════════"
echo "PRE-CLOSE-CHECKLIST — PR #$PR_NUMBER → Issue #$ISSUE_NUMBER"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── Resolve PR metadata ────────────────────────────────────────────────────

PR_TITLE=$(gh pr view "$PR_NUMBER" --repo "$REPO" --json title --jq '.title')
PR_FILES=$(gh pr view "$PR_NUMBER" --repo "$REPO" --json files --jq '[.files[].path] | join("\n")')

ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title')
ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json body --jq '.body')
ISSUE_LABELS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels --jq '[.labels[].name] | join(",")')

echo "PR: $PR_TITLE"
echo "Issue: $ISSUE_TITLE"
echo ""

# ─── Skip conditions ────────────────────────────────────────────────────────

# Skip for docs-only PRs closing docs issues
if [[ "$PR_TITLE" == docs* ]] && [[ "$ISSUE_LABELS" != *"frontend"* ]] && [[ "$ISSUE_LABELS" != *"engine"* ]]; then
  echo "SKIP: PR de docs fechando issue de docs — checklist não se aplica"
  exit 0
fi

# Skip for hotfixes
if [[ "$PR_TITLE" == *"[HOTFIX]"* ]]; then
  echo "SKIP: HOTFIX — fast-track (ORQ-11)"
  exit 0
fi

# ─── PC-1: Escopo do PR vs Escopo da Issue ───────────────────────────────────

echo "── PC-1: Escopo PR vs Issue ──"

IS_FRONTEND=false
IS_ENGINE=false
IS_MIGRATION=false

# GAP 3: Inferir tipo por path do PR (fallback sobre labels)
# Path é mais confiável que labels manuais
PR_TOUCHES_CLIENT=$(echo "$PR_FILES" | grep -q "^client/" && echo true || echo false)
PR_TOUCHES_SERVER=$(echo "$PR_FILES" | grep -q "^server/" && echo true || echo false)
PR_TOUCHES_DRIZZLE=$(echo "$PR_FILES" | grep -q "^drizzle/" && echo true || echo false)

# Labels como fonte primária
[[ "$ISSUE_LABELS" == *"frontend"* ]] && IS_FRONTEND=true
[[ "$ISSUE_LABELS" == *"engine"* ]] && IS_ENGINE=true

# Inferência por Bloco 3 da issue (arquivo alvo mencionado)
if ! $IS_FRONTEND && ! $IS_ENGINE; then
  echo "$ISSUE_BODY" | grep -qi "client/src/\|\.tsx" && IS_FRONTEND=true
  echo "$ISSUE_BODY" | grep -qi "server/\|router\|procedure" && IS_ENGINE=true
fi

echo "$ISSUE_BODY" | grep -qi "migration\|ALTER TABLE\|drizzle/" && IS_MIGRATION=true

if $IS_FRONTEND; then echo "  Tipo issue: frontend (label ou Bloco 3)"; fi
if $IS_ENGINE; then echo "  Tipo issue: engine (label ou Bloco 3)"; fi

PC1_PASS=true

if $IS_FRONTEND; then
  if echo "$PR_FILES" | grep -q "^client/"; then
    log_pass "1" "Issue frontend → PR toca client/"
  else
    log_fail "1" "Issue frontend mas PR NÃO toca client/ — implementação ausente"
    PC1_PASS=false
  fi
elif $IS_ENGINE; then
  if echo "$PR_FILES" | grep -q "^server/"; then
    log_pass "1" "Issue engine → PR toca server/"
  else
    log_fail "1" "Issue engine mas PR NÃO toca server/ — implementação ausente"
    PC1_PASS=false
  fi
else
  log_skip "1" "Issue sem label frontend/engine — verificação manual"
fi

# ─── PC-2: data-testid ──────────────────────────────────────────────────────

echo ""
echo "── PC-2: data-testid ──"

EXPECTED_TESTIDS=$(echo "$ISSUE_BODY" | grep -o 'data-testid="[^"]*"' | sort -u || true)
EXPECTED_COUNT=$(echo "$EXPECTED_TESTIDS" | grep -c "data-testid" 2>/dev/null || echo "0")

if [ "$EXPECTED_COUNT" -eq 0 ]; then
  log_skip "2" "Issue não lista data-testid — verificação N/A"
elif ! $IS_FRONTEND; then
  log_skip "2" "Issue não é frontend — data-testid N/A"
else
  # Check which files the PR touches that are components
  COMPONENT_FILES=$(echo "$PR_FILES" | grep -E "^client/src/" | grep -v "\.test\." || true)
  if [ -z "$COMPONENT_FILES" ]; then
    log_fail "2" "$EXPECTED_COUNT data-testid esperados mas PR não toca componentes"
  else
    FOUND=0
    MISSING=""
    while IFS= read -r tid; do
      TID_VALUE=$(echo "$tid" | sed 's/data-testid="//;s/"//')
      if echo "$COMPONENT_FILES" | xargs grep -q "data-testid=\"$TID_VALUE\"" 2>/dev/null; then
        FOUND=$((FOUND + 1))
      else
        MISSING="$MISSING $TID_VALUE"
      fi
    done <<< "$EXPECTED_TESTIDS"

    if [ "$FOUND" -eq "$EXPECTED_COUNT" ]; then
      log_pass "2" "$FOUND/$EXPECTED_COUNT data-testid presentes"
    elif [ "$FOUND" -gt 0 ]; then
      log_warn "2" "$FOUND/$EXPECTED_COUNT data-testid presentes (faltam:$MISSING)"
    else
      log_fail "2" "0/$EXPECTED_COUNT data-testid presentes — implementação incompleta"
    fi
  fi
fi

# ─── PC-3: Critérios de Aceite (Bloco 7) ────────────────────────────────────

echo ""
echo "── PC-3: Critérios de Aceite ──"

BLOCO7=$(echo "$ISSUE_BODY" | sed -n '/## Bloco 7/,/## Bloco 8/p' || true)
CRITERIA_COUNT=$(echo "$BLOCO7" | grep -c "\- \[" 2>/dev/null || echo "0")

if [ "$CRITERIA_COUNT" -eq 0 ]; then
  log_skip "3" "Bloco 7 não encontrado ou sem checkboxes"
else
  # Check for tsc criterion
  TSC_OK=false
  echo "$BLOCO7" | grep -qi "tsc 0" && TSC_OK=true

  if $TSC_OK; then
    log_pass "3" "$CRITERIA_COUNT critérios no Bloco 7 (tsc coberto pelo CI)"
  else
    log_warn "3" "$CRITERIA_COUNT critérios no Bloco 7 — verificar manualmente"
  fi
fi

# ─── PC-4: Contrato API ─────────────────────────────────────────────────────

echo ""
echo "── PC-4: Contrato API ──"

PROCEDURES=$(echo "$ISSUE_BODY" | grep -oE "trpc\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+" | sort -u || true)
PROC_COUNT=$(echo "$PROCEDURES" | grep -c "trpc\." 2>/dev/null || echo "0")

if [ "$PROC_COUNT" -eq 0 ]; then
  log_skip "4" "Nenhuma procedure tRPC mencionada na issue"
elif ! $IS_FRONTEND; then
  log_skip "4" "Issue não é frontend — integration check N/A"
else
  COMPONENT_FILES=$(echo "$PR_FILES" | grep -E "^client/src/" | grep -v "\.test\." || true)
  if [ -z "$COMPONENT_FILES" ]; then
    log_warn "4" "$PROC_COUNT procedures esperadas mas PR não toca componentes"
  else
    log_warn "4" "$PROC_COUNT procedures mencionadas — verificar integração manualmente"
  fi
fi

# ─── PC-5: Tipo PR vs Tipo Issue ────────────────────────────────────────────

echo ""
echo "── PC-5: Tipo PR vs Tipo Issue ──"

PR_IS_DOCS=false
PR_IS_DB=false

[[ "$PR_TITLE" == docs* ]] && PR_IS_DOCS=true
[[ "$PR_TITLE" == db:* ]] || [[ "$PR_TITLE" == *migration* ]] && PR_IS_DB=true
$PR_TOUCHES_DRIZZLE && ! $PR_TOUCHES_CLIENT && ! $PR_TOUCHES_SERVER && PR_IS_DB=true

if $IS_FRONTEND && $PR_IS_DB && ! $PR_TOUCHES_CLIENT; then
  log_fail "5" "PR de migration/db fechando issue frontend SEM tocar client/ — BLOQUEADO"
elif $IS_FRONTEND && $PR_IS_DOCS; then
  log_fail "5" "PR de docs fechando issue frontend — BLOQUEADO"
elif $IS_ENGINE && $PR_IS_DOCS; then
  log_fail "5" "PR de docs fechando issue engine — BLOQUEADO"
else
  log_pass "5" "Tipo PR compatível com tipo issue"
fi

# ─── Resultado ───────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════"
echo "RESULTADO: $PASS pass · $FAIL fail · $WARN warn"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "::error::PRE-CLOSE-CHECKLIST FALHOU ($FAIL gate(s))"
  echo "Remover 'Closes #$ISSUE_NUMBER' do PR body ou corrigir implementação."
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  echo ""
  echo "::warning::PRE-CLOSE-CHECKLIST: $WARN aviso(s) — verificar manualmente"
fi

echo ""
echo "PRE-CLOSE-CHECKLIST PASSED ✅"
