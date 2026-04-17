---
name: pre-commit
description: Gate de qualidade antes de commit — tsc + testes. Use antes de commitar, ao verificar qualidade, antes de criar PR.
---

# Pre-Commit — Gate de Qualidade

Rodar tsc + testes antes de commitar. Bloqueia commit se erros.

## Uso: /pre-commit [mensagem do commit]

## Executar:

1. TypeScript check:
```bash
pnpm tsc --noEmit 2>&1 | tail -5
```
Se erros > 0: **BLOQUEAR commit** — mostrar erros.

2. Unit tests:
```bash
pnpm vitest run server/lib/ 2>&1 | tail -10
```
Se falhas > 0: **BLOQUEAR commit** — mostrar falhas.

3. Se tudo OK:
```bash
git add [arquivos modificados]
git commit -m "$ARGUMENTS"
```

4. Reportar:
   - tsc: 0 erros ✅ ou N erros ❌
   - tests: N/N PASS ✅ ou FAIL ❌
   - commit: criado ✅ ou bloqueado ❌
