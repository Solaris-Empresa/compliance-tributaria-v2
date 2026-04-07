# DIV-Z02-001 — Assinatura errada de generateProductQuestions no DEC-M3-05
Sprint: Z-02 · ID: 001 · Data: 2026-04-07 · Status: RESOLVIDA · Opção B

## Divergência

DEC-M3-05 Passo 3b especifica:
```
generateProductQuestions({ ncmCodes, operationType }, confirmedCnaes, queryRagFn)
→ objeto como primeiro parâmetro
```

Código real (server/lib/product-questions.ts linha 64):
```typescript
generateProductQuestions(
  ncmCodes:       string[],
  cnaeCodes:      string[],
  companyProfile: { operationType?: string },
  queryRagFn?,
  querySolarisFn?
)
→ parâmetros separados
```

## Decisão

**Opção B: usar assinatura real do código.**

DEC-M3-05 tem erro tipográfico. A implementação Z-01 está correta.
A procedure `getProductQuestions` em `routers-fluxo-v3.ts` deve chamar:

```typescript
generateProductQuestions(
  ncmCodes,           // string[] — extraído de project.ncmCodes
  (project as any).cnaes ?? [],  // string[] — ver DIV-Z02-002
  { operationType: project.operationType ?? 'produto' },
  queryRagFn,
  querySolarisFn
)
```

## Rastreabilidade

- Arquivo: `server/lib/product-questions.ts`
- Linha: ~64 (assinatura real)
- DEC-M3-05 v3: Passo 3b (erro tipográfico)
- Contrato: `docs/contratos/CONTRATO-DEC-M3-05-v3-interface.md` Parte 2.1

---
*DIV-Z02-001 · IA SOLARIS · 2026-04-07*
