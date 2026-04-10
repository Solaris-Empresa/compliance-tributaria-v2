# ADR-0026 — Anti-Corruption Layer Gap→Risk
## Status: Aceito · 2026-04-10

## Contexto
Gap (domínio compliance operacional) e GapRule (domínio
normativo LC 214) são tipos incompatíveis com semânticas
distintas. Não podem ser conectados por mapper trivial.

## Decisão
Implementar ACL explícita em server/lib/gap-to-rule-mapper.ts
como classe GapToRuleMapper com 3 estados obrigatórios:
  mapped    → 1 candidato → gera risco
  ambiguous → 2+ candidatos → revisão jurídica
  unmapped  → 0 candidatos → aparece no briefing sem risco

## Regras invioláveis
- allowLayerInference=false em produção
- Fallback por domínio: PROIBIDO
- Score/ranking: PROIBIDO
- Ambiguidade nunca vira inferência automática

## Lei do produto
Erro aceitável: não classificado
Erro inaceitável: classificado errado

## Consequências
- Pipeline: analyzeGaps → mapGapsToRules → generateRisksFromGaps
- reviewQueue visível ao advogado no RiskDashboardV4
- Consultor: ChatGPT (análise arquitetural aprovada)
- PRs: #448 · #449 · #450 · #451

## Rastreabilidade
DEC-Z10-01..07 · Sprint Z-10 · P.O.: Uires Tapajós
