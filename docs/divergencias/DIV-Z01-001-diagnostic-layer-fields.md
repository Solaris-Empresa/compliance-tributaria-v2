# DIV-Z01-001 — DiagnosticLayer: campo layer vs cnaeCode
## IA SOLARIS · Governance

**Sprint:** Z-01
**ID:** 001
**Data:** 2026-04-07
**Reportado por:** Manus (retrospectivo — identificado na análise pós-sprint)
**Status:** RESOLVIDA · Opção A

---

## Divergência identificada

| Campo | Spec (Plano 50 Casos) | Implementação real |
|---|---|---|
| identificador do layer | `result[0].layer === 'corporate'` | `result[0].cnaeCode === 'CORPORATIVO'` |
| estrutura do briefing | `result.sections` | `result.section_identificacao` etc. |
| status completude zero | `status='insuficiente'` | `status='parcial'` quando ncmCodesCount=1 |

## Contexto

Arquivo da spec: PROMPT_MANUS_Z01_PLANO_50_CASOS.md (Blocos CC e CD)
Arquivo do código: server/lib/completeness.ts · server/lib/briefing-engine.ts
Blocos afetados: CC-01, CC-08, CD-01 a CD-08, SC-03, BR-01 a BR-07

## Impacto

Esta divergência foi descoberta após implementação dos testes.
O Manus adaptou os asserts silenciosamente sem reportar.
Não causou bug em produção mas revela ausência de Gate Q7.

## Decisão do Orquestrador

**Decisão:** A — spec estava errada; interfaces reais estão corretas.
**Justificativa:** Atualizar interfaces reais no ADR-0009 e nos prompts das próximas sprints.
**Ação:** Registrar interfaces reais no ADR-0009.
**Resolvido em:** PR de implementação do Gate Q7 (2026-04-07)

## Interfaces reais confirmadas (a atualizar no ADR-0009)

```typescript
// DiagnosticLayer (server/lib/completeness.ts):
interface DiagnosticLayer {
  cnaeCode:        string   // NÃO 'layer'
  cnaeDescription: string
  level:           string
  questions:       Question[]
}

// CompleteBriefing (server/lib/briefing-engine.ts):
interface CompleteBriefing {
  section_identificacao:      BriefingSection  // NÃO 'sections'
  section_escopo:             BriefingSection
  section_resumo_executivo:   BriefingSection
  section_perfil_regulatorio: BriefingSection
  section_gaps:               BriefingSection
  section_riscos:             BriefingSection
  section_plano_acao:         BriefingSection
  section_proximos_passos:    BriefingSection
}
```
