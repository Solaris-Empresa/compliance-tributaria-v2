# ADR-0023 — Score CPIE: Opção A para Sprint Z-07
## Status: Aceito · Data: 2026-04-09

## Contexto

O scoringEngine.ts (CPIE-B) calcula maturidade de compliance em 3 dimensões:
- Gaps: 40% (lê project_gaps_v3)
- Riscos: 35% (lê project_risks_v3)
- Ações: 25% (lê project_actions_v3)

100% determinístico — fórmula fixa, sem LLM.

A Sprint Z-07 introduz risks_v4 e action_plans como novas tabelas.
O scoringEngine.ts não sabe que essas tabelas existem.

## Problema

Após Z-07, projetos usando o engine v4 terão Score CPIE zerado
porque o scoringEngine.ts continua lendo as tabelas legadas.

## Opções consideradas

| | Opção A | Opção B |
|---|---|---|
| O que é | scoringEngine.ts continua lendo tabelas legadas | scoringEngine.ts migra para ler risks_v4 + action_plans |
| Impacto Z-07 | Zero — isolamento total | Requer alterar arquivo existente |
| ADR-0022 | ✅ Respeitado | ❌ Viola — arquivo existente |
| Risco | Score ignora riscos v4 até PR #E | Projetos sem v4 ficam com score zerado |

## Decisão

**Opção A aprovada pelo P.O. Uires Tapajós em 2026-04-09.**

scoringEngine.ts não é tocado na Sprint Z-07.
generateRisks não tem dependência do Score CPIE.
Sprint Z-07 fecha sem bloqueio neste ponto.

## Consequências

Score CPIE ficará zerado para projetos novos que usarem risks_v4
até o PR #E ser implementado em sprint futura.

## Próximo passo registrado

PR #E — Sprint futura:
  Migrar scoringEngine.ts para ler risks_v4 + action_plans + tasks
  Com shadow validation: score legado vs score novo devem ser equivalentes
  antes de desligar a leitura de project_risks_v3

## Rastreabilidade

- AUDIT-C-004 encerrado com esta decisão
- DEC-SWAP-05 registrada em docs/governance/ESTRATEGIA-MODULE-HOT-SWAP.md
- Relacionado: ADR-0022 (Estratégia Novo+Plugin)

---
*IA SOLARIS · ADR-0023 · P.O.: Uires Tapajós · Orquestrador: Claude Browser*
*2026-04-09*
