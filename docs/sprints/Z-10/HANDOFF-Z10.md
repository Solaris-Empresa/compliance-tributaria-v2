# HANDOFF — Sprint Z-10
## Conexão Gap Engine → Risk Engine v4 via Anti-Corruption Layer
## 2026-04-10

## Contexto

O frontend hoje chama generateRisks({ projectId, gaps: [] }) — passa lista vazia,
engine gera 0 riscos, dashboard fica vazio.

Causa raiz: Gap (compliance operacional) e GapRule (normativo LC 214) são tipos
incompatíveis. Precisam de Anti-Corruption Layer para traduzir.

## Decisões aprovadas (P.O. + ChatGPT)

- DEC-Z10-01: Gap ganha campo categoria? opcional (Opção C)
- DEC-Z10-02: ACL explícita — gap-to-rule-mapper.ts
- DEC-Z10-03: 3 estados: mapped | ambiguous | unmapped
- DEC-Z10-04: source_origin como first-class citizen
- DEC-Z10-05: allowLayerInference=false em produção
- DEC-Z10-06: categoria explícita sempre validada contra banco
- DEC-Z10-07: reviewQueue visível ao advogado

Lei do produto: erro aceitável = não classificado. Erro inaceitável = classificado errado.

## Passo 0 OBRIGATÓRIO (Claude Code — antes de qualquer código)

Execute e reporte ao Orquestrador:
grep -n "artigo_base\|artigoBase\|allowed_domains\|allowedDomains\|vigencia_fim\|vigenciaFim" drizzle/schema.ts | head -20

## Arquivos a criar (Claude Code)

1. server/schemas/gap-risk.schemas.ts
2. server/lib/gap-to-rule-mapper.ts
3. server/lib/risk-category.repository.drizzle.ts
4. server/lib/gap-to-rule-mapper.test.ts (7 testes gold set)

## Arquivos a criar/editar (Manus — após merge do PR do Claude Code)

5. server/routers/risks-v4.ts — adicionar mapGapsToRules + generateRisksFromGaps
6. client/src/components/RiskDashboardV4.tsx — substituir gaps: [] pelo pipeline real

## Fluxo esperado

analyzeGaps(project_id)
  → Gap[]
mapGapsToRules(projectId, gaps[])
  → mappedRules: GapRule[]
  → reviewQueue: GapMappingResult[]
generateRisksFromGaps(projectId, mappedRules[])
  → risks_v4 populada
  → breadcrumb 4 nós · severidade determinística

## NÃO fazer

- allowLayerInference = true em produção
- Inferir categoria sem consultar banco
- Descartar gaps silenciosamente
- Modificar computeRiskMatrix, buildActionPlans, gapEngine.ts, routers-fluxo-v3.ts

*IA SOLARIS · HANDOFF Z-10 · 2026-04-10*
