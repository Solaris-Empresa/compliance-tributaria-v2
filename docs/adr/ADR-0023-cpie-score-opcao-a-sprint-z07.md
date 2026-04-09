# ADR-0023 — Score CPIE: Opção A para Sprint Z-07
Status: Aceito · Data: 2026-04-09

## Contexto
scoringEngine.ts calcula CPIE-B em 3 dimensões determinísticas:
Gaps 40% + Riscos 35% + Ações 25% — lê tabelas legadas.
Sprint Z-07 criou risks_v4 e action_plans (tabelas novas).
scoringEngine.ts não conhece as tabelas novas.

## Decisão
Opção A aprovada pelo P.O. em 2026-04-09:
scoringEngine.ts NÃO é tocado na Sprint Z-07.
Score CPIE continua lendo tabelas legadas até PR #E.
AUDIT-C-004 encerrado. ADR-0022 respeitado.

## Consequências
Projetos novos com engine v4 terão CPIE zerado até PR #E.
PR #E — sprint futura: migrar score para ler risks_v4.
