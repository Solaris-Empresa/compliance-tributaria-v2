# ADR-0011 — Consolidação de Respostas no Pipeline de Briefing

**Status:** Aceito · **Data:** 2026-04-07 · **Sprint:** Z-02 (fix)

## Contexto

Respostas digitadas pelo usuário nos questionários Q.Produtos (NCM) e Q.Serviços (NBS)
não chegavam ao briefing nem à matriz de riscos. O consolidador (`diagnostic-consolidator.ts`)
lia apenas de `companyProfile`, `operationProfile` e `questionnaireAnswersV3` (CNAE),
ignorando `productAnswers` e `serviceAnswers` gravados pela Z-02.

**Causa raiz confirmada (grep 2026-04-07):**
- `consolidateDiagnosticLayers` não recebe `productAnswers` nem `serviceAnswers`
- `generateBriefingFromDiagnostic` não passa essas colunas ao consolidador
- Projetos V1/V2 usam `corporateAnswers`/`operationalAnswers` (colunas legadas)
- Projetos V3+ usam `productAnswers`/`serviceAnswers` (colunas TO-BE da Z-02)

## Decisão

O consolidador deve ler de **AMBAS** as fontes durante o período de transição:

| Prioridade | Coluna | Projetos |
|---|---|---|
| 1ª (preferida) | `productAnswers` / `serviceAnswers` | V3+ (TO-BE) |
| 2ª (fallback) | `corporateAnswers` / `operationalAnswers` | V1/V2 (legado) |

**Nunca ler de apenas uma fonte** — garantir retrocompatibilidade.

A função `resolveProjectAnswers(project)` encapsula essa lógica de fallback
e é chamada pelo `generateBriefingFromDiagnostic` e `getAggregatedDiagnostic`.

## Alternativas rejeitadas

**A) Ler apenas `productAnswers`** → quebra projetos V1/V2 que usam `corporateAnswers`

**B) Ler apenas `corporateAnswers`** → ignora respostas TO-BE dos projetos V3+

**C) Migrar todos os projetos** → requer DROP/ALTER de dados existentes (Issue #62 proíbe)

## Consequências

**Positivo:**
- Briefing usa respostas de ambos os fluxos
- Retrocompatibilidade garantida sem migration
- Lógica de fallback centralizada em `resolveProjectAnswers`

**Negativo:**
- Consolidador precisa de lógica de fallback (leve — ~20 linhas)
- Projetos V3+ com ambas as colunas preenchidas usam `productAnswers` (comportamento esperado)

## Rastreabilidade

- BUG-RESP-01 em `docs/bugs/DIAGNOSTICO-BUGS-2026-04-07.md`
- PR: fix/bug-resp-01-pipeline-respostas
- Contrato: `docs/contratos/CONTRATO-DEC-M3-05-v3-interface.md`
