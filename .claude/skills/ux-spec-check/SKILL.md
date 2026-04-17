---
name: ux-spec-check
description: Diff data-testid entre mockup e componente (ORQ-16). Use ao verificar gap mockup, checar data-testid, validar implementação frontend.
---

# UX Spec Check — ORQ-16

Comparar data-testid do mockup com o componente implementado.

## Uso: /ux-spec-check [NomeComponente]

## Executar:

1. Encontrar mockup correspondente:
```bash
ls docs/sprints/*/MOCKUP_*.html
```

2. Extrair data-testid do mockup:
```bash
grep -o 'data-testid="[^"]*"' docs/sprints/*/MOCKUP_*$ARGUMENTS*.html | sort -u > /tmp/mock.txt
```

3. Extrair data-testid do componente:
```bash
grep -o 'data-testid="[^"]*"' client/src/pages/$ARGUMENTS.tsx client/src/components/$ARGUMENTS.tsx 2>/dev/null | sort -u > /tmp/comp.txt
```

4. Calcular gap:
```bash
comm -23 /tmp/mock.txt /tmp/comp.txt
echo "Gap: $(comm -23 /tmp/mock.txt /tmp/comp.txt | wc -l)"
```

5. Reportar:
   - Mockup: N data-testid
   - Componente: N data-testid
   - Gap: N (listar faltantes)
   - Status: LIBERAR (gap=0) ou BLOQUEADO (gap>0)
