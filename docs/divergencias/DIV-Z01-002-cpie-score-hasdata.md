# DIV-Z01-002 - CpieScore: comportamento hasData=false
## IA SOLARIS - Governance

**Sprint:** Z-01
**ID:** 002
**Data:** 2026-04-07
**Reportado por:** Manus (retrospectivo)
**Status:** RESOLVIDA - Opcao A

## Divergencia identificada

| Comportamento | Spec | Implementacao real |
|---|---|---|
| Score sem dados | semGaps.cpieScore >= comGaps.cpieScore | hasData=false cpieScore=0 (hardcoded) |

## Decisao do Orquestrador

**Decisao:** A - spec estava errada.
computeCpieScore com hasData=false retorna 0 intencionalmente.
Empresa sem dados nao tem score calculado.
**Resolvido em:** PR Gate Q7 (2026-04-07)
