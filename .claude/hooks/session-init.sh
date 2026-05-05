#!/bin/bash
# Session init — verifica arquivos de governança (AVISO, não bloqueio)
# ORQ-00: leitura obrigatória pré-sprint
#
# Sprint M3.10 Fase 3b: também captura session_id do JSON stdin para
# /tmp/claude-session-id.txt — usado por SKILLs (investigate-deep) para
# nomear arquivos de evidência consumidos pelo hook require-investigation.sh.

# Captura session_id do JSON stdin (não bloquear se ausente)
INPUT=$(cat 2>/dev/null || true)
if [ -n "$INPUT" ]; then
  SID=$(echo "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try { const j = JSON.parse(d); process.stdout.write(j.session_id || ''); }
  catch (e) { /* sem session_id */ }
});
" 2>/dev/null || true)
  if [ -n "$SID" ]; then
    mkdir -p .claude/.investigate-cache 2>/dev/null
    echo "$SID" > .claude/.investigate-cache/current-session.txt
  fi
fi

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
