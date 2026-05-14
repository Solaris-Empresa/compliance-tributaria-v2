#!/usr/bin/env bash
# scripts/test-gate-orq37.sh — Smoke test local do gate REGRA-ORQ-37.
#
# Réplica EXATA do step `Verificar evidência SQL no PR body` do workflow
# .github/workflows/validate-corpus-ingest.yml. Permite validar mudanças no
# gate sem precisar abrir um PR no GitHub.
#
# Uso: bash scripts/test-gate-orq37.sh
# Esperado: A/B/D falham nos checks; C passa.
#
# Origem: bug detectado em PR #1084 — regex `[a-z_]+` rejeitava enums lei com
# dígitos (decreto12955, lc214 etc). Fix mudou para `[a-z0-9_]+`.
set -uo pipefail
run_gate() {
  local PR_BODY="$1"
  local NAME="$2"
  echo "════════ $NAME ════════"
  if echo "$PR_BODY" | grep -q "EVIDÊNCIA DE INGESTÃO"; then
    echo "  step1: bloco encontrado"
  else
    echo "  step1: FALHA — sem bloco"
    return 1
  fi
  if echo "$PR_BODY" | grep -qE "\| [a-z0-9_]+ +\| [0-9]+ +\|"; then
    echo "  step2: tabela numerica encontrada"
  else
    echo "  step2: FALHA — sem tabela numerica"
    return 1
  fi
  echo "  PASSOU"
  return 0
}

A="## Descricao
Ingestao de Decreto X. Smoke SQL esperado."

B="## EVIDÊNCIA DE INGESTÃO — Query
[resultado pendente]"

C="## EVIDÊNCIA DE INGESTÃO — Query executada em producao
**Resultado literal:**
| lei                 | chunks |
|---------------------|--------|
| decreto12955        | 831    |
| resolucao_cgibs_6   | 187    |
| portaria_mf_cgibs_7 | 2      |"

D="## Origem
Incidente 14/05/2026 — ingestao P0 sem evidencia.
Governanca pura."

run_gate "$A" "A — sem bloco (esperado: falha step1)"
echo
run_gate "$B" "B — bloco sem tabela (esperado: falha step2)"
echo
run_gate "$C" "C — PR perfeito (esperado: PASSAR)"
echo
run_gate "$D" "D — governance PR sem mencao (esperado: falha step1)"
