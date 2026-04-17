#!/bin/bash
# Session init — verifica arquivos de governança (AVISO, não bloqueio)
# ORQ-00: leitura obrigatória pré-sprint

FILES=(
  "docs/governance/DATA_DICTIONARY.md"
  "docs/governance/UX_DICTIONARY.md"
  "docs/governance/RN_GERACAO_RISCOS_V4.md"
  "docs/governance/RN_PLANOS_TAREFAS_V4.md"
)

MISSING=()
for f in "${FILES[@]}"; do
  [ ! -f "$f" ] && MISSING+=("$f")
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "⚠️  Governança incompleta:"
  for m in "${MISSING[@]}"; do echo "   ausente: $m"; done
  echo "   Sessão iniciada com contexto incompleto."
fi

# Status rápido do repositório
echo "HEAD: $(git log --oneline -1 2>/dev/null || echo 'N/A')"
echo "PRs abertos: $(gh pr list --state open --json number --jq 'length' 2>/dev/null || echo 'N/A')"
