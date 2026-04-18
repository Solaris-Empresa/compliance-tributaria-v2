# Aferição — Projeto 930001 (Bateria 2)

Executado em: 2026-04-18T14:56:09.598Z
Script: audit-risk-matrix.mjs

## Critérios §13.5 — meta 98% de confiabilidade

| # | Critério | Planejado | Realizado | Status |
|---|---|---|---|---|
| 1 | Todo risco tem origem (rule_id NOT NULL) | 100% | 10/10 | ✅ PASS |
| 2 | Categorias cobertas pelas 3 Ondas | ≥5 | 10 categorias | ✅ PASS |
| 3 | Severidade determinística (valores do enum) | apenas alta/media/oportunidade | alta, oportunidade, media | ✅ PASS |
| 4 | Artigo rastreável ao RAG | ≥50% rag_validated=1 (PROVA 4) | 10/10 (100.0%) | ✅ PASS |
| 5 | Breadcrumb 4 nós | 100% | 10/10 | ✅ PASS |
| 6 | Oportunidade sem plano (RN-RISK-05) | 0 planos em riscos type=opportunity | 0 planos | ✅ PASS |
| 7 | Unicidade por categoria (DEC-05) | ≤ 1 risco por categoria ativo | OK | ✅ PASS |
| 8 | Score visível (DEC-01) | projects.scoringData NOT NULL | presente | ✅ PASS |
| 9 | Fonte primária = menor SOURCE_RANK | source_priority consistente com breadcrumb[0] | 10/10 | ✅ PASS |
| 10 | Nenhuma categoria órfã (tributacao_servicos) | 0 riscos com categoria fora das 10 oficiais | nenhuma órfã | ✅ PASS |

## Resumo

- **Critérios PASS:** 10/10
- **Meta 98% (B4):** ✅
- **Meta B1 (≥5/10):** ✅

Gerado em 2026-04-18T14:56:10.882Z
