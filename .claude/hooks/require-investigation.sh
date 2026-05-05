#!/bin/bash
# require-investigation.sh — Sprint M3.10 Fase 3b
# Bloqueia Edit em arquivos críticos do pipeline sem evidência de investigação.
#
# Vinculado: REGRA-ORQ-35 + Lições #65/#66 (M3.10 mono-fonte).
# Caso canônico: 4 PRs consecutivos para o mesmo bug porque hipóteses foram
# implementadas sem investigação completa. Hook força o passo /investigate-deep.
#
# Critical paths:
#   - server/lib/db-queries* (writers/readers do pipeline de gaps/riscos)
#   - server/routers/*       (procedures tRPC que orquestram pipeline)
#   - server/_core/trpc.ts   (infraestrutura tRPC compartilhada)
#
# Comportamento:
#   - Path não-crítico → exit 0 (permitir)
#   - Path crítico SEM evidência → exit 2 (bloquear, mensagem em stderr)
#   - Path crítico COM evidência → exit 0 (permitir, mensagem em stderr)
#
# Fallback gracioso: parse JSON falha → exit 0 (não trava o usuário).
#
# IMPLEMENTAÇÃO:
#   - jq indisponível no Windows; usa Node como parser.
#   - session_id chega via JSON stdin (NÃO via env var CLAUDE_SESSION_ID).
#   - Evidence é gravada em .claude/.investigate-cache/ (path relativo ao cwd),
#     porque /tmp tem mapeamento DIFERENTE em Git Bash (C:/Users/.../Temp)
#     vs Node/Write tool (D:\tmp) no Windows. Achado empírico Sprint M3.10
#     Fase 3b — documentado em CLAUDE.md "Enforcement Mecânico".

INPUT=$(cat)

# Parse: extrair session_id e file_path em uma só passagem
PARSED=$(echo "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const j = JSON.parse(d);
    const sid = j.session_id || '';
    const file = (j.tool_input && j.tool_input.file_path) || '';
    console.log(sid + '|' + file);
  } catch (e) {
    console.log('|');
  }
});
" 2>/dev/null)

SID=$(echo "$PARSED" | cut -d'|' -f1)
FILE=$(echo "$PARSED" | cut -d'|' -f2-)

# Fallback gracioso: parse falhou → permitir
if [[ -z "$FILE" ]]; then
  exit 0
fi

CACHE_DIR=".claude/.investigate-cache"
mkdir -p "$CACHE_DIR" 2>/dev/null

# Side effect: escrever session_id ativo (idempotente; SKILLs leem este arquivo)
if [[ -n "$SID" ]]; then
  echo "$SID" > "$CACHE_DIR/current-session.txt"
fi

# Normalizar Windows path (\) → Unix (/)
NORM=$(echo "$FILE" | tr '\\' '/')

# Critical path matcher
case "$NORM" in
  *server/lib/db-queries*|*server/routers/*|*server/_core/trpc.ts)
    ;;
  *)
    exit 0
    ;;
esac

BASE=$(basename "$NORM")

# Aceita evidência session-prefixed OU session-less (bootstrap-friendly)
EVIDENCE_SID="$CACHE_DIR/${SID}-${BASE}.md"
EVIDENCE_PLAIN="$CACHE_DIR/${BASE}.md"

if [[ -f "$EVIDENCE_SID" ]]; then
  echo "INVESTIGATE-OK: evidence at $EVIDENCE_SID" >&2
  exit 0
fi

if [[ -f "$EVIDENCE_PLAIN" ]]; then
  echo "INVESTIGATE-OK: evidence at $EVIDENCE_PLAIN (session-less fallback)" >&2
  exit 0
fi

# Bloquear
echo "BLOCKED: deep investigation required before editing $BASE" >&2
echo "" >&2
echo "This file is in a critical pipeline path (server/lib/db-queries*, server/routers/*, server/_core/trpc.ts)." >&2
echo "Editing without investigation caused 4 consecutive bad fixes in Sprint M3.10 (mono-fonte bug)." >&2
echo "" >&2
echo "Required action:" >&2
echo "  1. Invoke skill: /investigate-deep $BASE" >&2
echo "  2. Skill writes evidence to: $EVIDENCE_SID" >&2
echo "  3. Retry the edit" >&2
echo "" >&2
echo "Reference: REGRA-ORQ-35, Lições #65/#66, post-mortem 2026-05-05-mono-fonte-matriz-riscos.md" >&2
exit 2
