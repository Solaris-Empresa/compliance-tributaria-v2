#!/bin/bash
# poc-edit-detector.sh — PoC Sprint M3.10 Fase 3a
# Objetivo: validar que hook PreToolUse dispara em Edit e consegue ler tool_input via stdin
#
# Comportamento: LOG only, exit 0 sempre (NÃO bloqueia).
# Validação real de bloqueio (exit 2) será feita em PR de Fase 3b após PoC verde.
#
# Vinculado: PR #981 (REGRA-ORQ-35) + PR (este, hooks PoC)
# Decisão P.O./Manus 2026-05-05: PoC mínimo antes de hook bloqueante real.
#
# IMPLEMENTAÇÃO: usa Node como parser JSON em vez de jq, porque jq não está
# instalado no ambiente Windows do projeto. Achado empírico Sprint M3.10
# Fase 3a — documentado como gotcha em REGRA-ORQ-36 (ferramentas preferidas).

INPUT=$(cat)

# Parse JSON via Node (jq não disponível em Windows)
PARSED=$(echo "$INPUT" | node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try {
    const j = JSON.parse(d);
    const tool = j.tool_name || 'unknown';
    const file = (j.tool_input && j.tool_input.file_path) || 'unknown';
    console.log(tool + '|' + file);
  } catch (e) {
    console.log('parse_error|' + e.message);
  }
});
" 2>/dev/null)

TOOL=$(echo "$PARSED" | cut -d'|' -f1)
FILE=$(echo "$PARSED" | cut -d'|' -f2)

echo "HOOK-POC: tool=$TOOL file=$FILE" >&2
exit 0
