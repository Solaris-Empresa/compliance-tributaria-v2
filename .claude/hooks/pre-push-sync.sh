#!/bin/bash
# R-SYNC-01 automático antes de git push
# AVISO — não bloqueia (desenvolvedor decide)
# Force-push isento (rebase legítimo)

git fetch origin 2>/dev/null

LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ R-SYNC-01: sincronizado com origin/main"
elif [ -z "$REMOTE" ]; then
  echo "ℹ️  R-SYNC-01: origin/main não disponível"
else
  echo "⚠️  R-SYNC-01: divergência detectada"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE"
  echo "   Considere: git reset --hard origin/main"
fi
