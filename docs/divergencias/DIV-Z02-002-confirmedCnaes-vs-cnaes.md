# DIV-Z02-002 — project.confirmedCnaes vs (project as any).cnaes
Sprint: Z-02 · ID: 002 · Data: 2026-04-07 · Status: RESOLVIDA · Opção B · Corrigido em: feat/z02-to-be-flow-refactor · ADR-0010

## Divergência

DEC-M3-05 usa:
```typescript
project.confirmedCnaes ?? []
```

Código real usa (consistente com getProductQuestions linha 2623 em routers-fluxo-v3.ts):
```typescript
(project as any).cnaes
```

## Decisão

**Opção B: usar `(project as any).cnaes` — consistente com padrão existente.**

O campo `confirmedCnaes` não existe no schema Drizzle atual. O campo real é `cnaes`
(armazenado como JSON string). O cast `as any` é necessário porque o tipo Drizzle
não expõe o campo diretamente — padrão já estabelecido em Z-01.

## Rastreabilidade

- Arquivo: `server/routers-fluxo-v3.ts`
- Linha: ~2623 (uso existente de `(project as any).cnaes`)
- DEC-M3-05 v3: Passo 3b (referência incorreta a `confirmedCnaes`)
- Contrato: `docs/contratos/CONTRATO-DEC-M3-05-v3-interface.md` Parte 2.1

---
*DIV-Z02-002 · IA SOLARIS · 2026-04-07*
