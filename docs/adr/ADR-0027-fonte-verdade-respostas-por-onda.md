# ADR-0027 — Fonte de Verdade das Respostas por Onda
## Status: **Supersedido por ADR-0030 (01/06/2026)** · Aceito original 2026-04-10

> **⚠️ AVISO (FIX-11 FASE C, 01/06/2026):** este ADR foi supersedido por
> [ADR-0030](./ADR-0030-fonte-canonica-gap-solaris.md).
>
> O `analyzeGapsFromQuestionnaires` ("Z-11") designado aqui como pipeline
> canônico **nunca foi conectado em produção** — confirmado empiricamente
> em 01/06/2026 via grep (zero callers externos). Pipeline real
> (`analyzeSolarisAnswers` G17) usava dicionários intermediários hardcoded
> eliminados pela arquitetura Max (FIX-08/FIX-09 + FIX-10).
>
> Z-11 deletado no PR FIX-11. Issue #964 (M3.9 Item 4) encerrada como `won't fix`.
>
> ADR mantido arquivado para rastreabilidade histórica (padrão do projeto —
> ADRs não são deletados).

## Contexto
O smoke test da Z-10 revelou que analyzeGaps() lia
questionnaireAnswersV3 (pipeline legado com 0 registros),
enquanto as respostas reais estavam em solaris_answers (48)
e iagen_answers (7). Pipeline de riscos retornava 0 resultados.

## Decisão
analyzeGapsFromQuestionnaires() (NOVA) lê de solaris_answers + iagen_answers.
analyzeGaps() existente NÃO é alterada (Onda 3 intacta).

  Tabela           → Onda → Chave de classificação
  solaris_answers  → 1    → solaris_questions.risk_category_code
  iagen_answers    → 2    → iagen_answers.risk_category_code
  (RAG engine)     → 3    → regulatory_requirements_v3.code

## Regra inviolável
Resposta sem risk_category_code válido não entra no pipeline
de riscos. Entra apenas no briefing como evidência diagnóstica.

## Consequências
- Dois pipelines paralelos: Ondas 1+2 (novo) e Onda 3 (existente)
- Ambos convergem em risks_v4 via ACL mapper
- Respostas legadas sem risk_category_code usam fallback KEYWORD_TO_TOPIC

## Rastreabilidade
DEC-Z11-ARCH-01 · Sprint Z-11 · PRs #457 #459 #460
P.O.: Uires Tapajós
