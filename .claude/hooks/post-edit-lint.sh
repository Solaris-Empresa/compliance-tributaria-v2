#!/bin/bash
# Post-edit lint — Prettier após edição de arquivo .ts/.tsx
# Timeout 30s para não travar a sessão
# Hook PostToolUse: roda após Write/Edit em arquivos TypeScript

# O arquivo editado chega via stdin ou argumento
# Claude Code injeta o path no contexto do hook
FILE="${1:-}"

# Se não recebeu argumento, tentar extrair do contexto
if [ -z "$FILE" ]; then
  exit 0  # Skip silencioso — sem arquivo para formatar
fi

# Apenas .ts e .tsx
if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  timeout 30 npx prettier --write "$FILE" 2>/dev/null
fi

exit 0
