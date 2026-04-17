---
name: db-schema-check
description: Validar campo no DATA_DICTIONARY antes de implementar. Use ao fazer Gate 0, verificar schema, conferir tipo de campo no banco.
---

# DB Schema Check — Gate 0

Validar que o campo existe no DATA_DICTIONARY.md antes de implementar.

## Uso: /db-schema-check [tabela] [campo]

## Executar:

1. Buscar no dicionário:
```bash
grep -i -A3 "$ARGUMENTS" docs/governance/DATA_DICTIONARY.md
```

2. Se encontrado: reportar tipo e constraints.

3. Se NÃO encontrado:
   - **BLOQUEAR implementação**
   - Reportar: "Campo não documentado — atualizar DATA_DICTIONARY.md antes de implementar"
   - Sugerir: "Manus executar SHOW FULL COLUMNS FROM [tabela]"

## Regra TiDB/MySQL:
- LIMIT/OFFSET: NÃO aceita `?` — usar interpolação com clamp
- SELECT *: retorna Date como objeto JavaScript — usar safeStr() no frontend
