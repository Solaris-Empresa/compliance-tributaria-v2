# DIV-Z01-003 — Gate Q7: tsc check vs interface grep
## IA SOLARIS · Governance

**Sprint:** Z-01
**ID:** 003
**Data:** 2026-04-07
**Reportado por:** Orquestrador (análise pós-implementação)
**Status:** RESOLVIDA · Opção B

---

## Divergência identificada

| Item | Spec (PROMPT_MANUS_GOVERNANCE_GATE_Q7_REGRA_DIV) | Implementado |
|---|---|---|
| Comando Gate Q7 | `grep -rn "export interface\|export type" server/lib/*.ts` | `npx tsc --noEmit 2>&1 \| head -20` |
| Objetivo | Validar nomes de campos de interface contra a spec | Verificar erros de TypeScript |
| Cobertura | Captura divergências de nomenclatura (layer vs cnaeCode) | Não captura — TS compila mesmo com nomes divergentes |

## Por que são diferentes

`npx tsc --noEmit` verifica se o TypeScript compila sem erros.
Já era coberto pelo critério "TypeScript 0 erros" existente desde Sprint K.

O Gate Q7 correto usa grep para listar as interfaces reais do sistema,
permitindo que o Orquestrador confronte os nomes com a spec ANTES de
escrever testes. Isso teria capturado `cnaeCode vs layer` na Sprint Z-01.

## Impacto

Sem o comando correto, o Gate Q7 não cumpre sua função:
prevenir adaptações silenciosas de asserts por divergência de interface.

## Decisão

**Opção B:** implementação está errada — corrigir MANUS-GOVERNANCE.md.

**Ação:** substituir comando Gate Q7 pelo grep correto.
**Resolvido em:** PR deste commit
