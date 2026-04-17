---
name: sync
description: R-SYNC-01 sincronizar com origin/main e mostrar estado do repositório. Use ao iniciar sessão, antes de implementar, ao verificar estado.
---

# Sync — R-SYNC-01

Sincronizar com origin/main e mostrar estado completo do repositório.

## Executar:

```bash
git fetch origin
git diff --stat origin/main
git log origin/main --oneline -5
gh pr list --state open --json number,title --jq '.[] | "#\(.number) \(.title)"'
```

## Reportar:
- HEAD atual
- Divergência com origin/main (SIM/NÃO + arquivos)
- PRs abertos (número + título)
- Última ação no main (commit mais recente)
