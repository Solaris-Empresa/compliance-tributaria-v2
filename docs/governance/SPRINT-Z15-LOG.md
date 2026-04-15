# Sprint Z-15 — Log

## Gate 0 — 15/04/2026
[BANCO] action_plans.risk_id FK → risks_v4.id ✅
[BANCO] prazo ENUM inclui 180_dias ✅
[BANCO] rag_validated NÃO no listRisks — patch necessário
[BANCO] listRisks sem JOIN action_plans — patch necessário
[BANCO] PLANS não exportado — procedure necessária

## Issues abertas
#598 fix L1107 — P0
#600 RAG badge — P1
#601 plans preview — P1
#602 Sugestão IA — P1

## Status
F3 auditoria: pendente
F4 labels P.O.: pendente

### Lote A implementação — 15/04/2026
[F4] Labels aplicadas pelo P.O. em #598 #600 #601 #602
[IMPL] #598 fix L1107 — Claude Code
[IMPL] #600 RAG badge — Claude Code
[AGUARDA] #601 plans preview — após #600
[AGUARDA] #602 Sugestão IA — após #601

### #598 #600 mergeados — 15/04/2026
[DONE] PR #605 mergeado — fix L1107 + RAG badge
[IMPL] #601 plans preview — Claude Code
[IMPL] #602 Sugestão IA — Claude Code

### Lote A CONCLUÍDO — 15/04/2026
[DONE] PR #607 mergeado — feat(dashboard+action-plan): plans preview + AI suggestion
[DONE] #598 fix L1107 texto duplicado "riscos os riscos" — FECHADA
[DONE] #600 RAG badge rag-badge-validated/rag-badge-pending — FECHADA
[DONE] #601 plans-preview data-testid inline no card de risco — FECHADA
[DONE] #602 Sugestão IA determinística (PLANS exportado, sem LLM) — FECHADA
[CHECKPOINT] 2d203e06 — HEAD 78955e2 — tsc 0 erros — HTTP 200
[DEPLOY] iasolaris.manus.space — aguardando Publish pelo P.O.
[DOCS] BASELINE-PRODUTO.md v7.0 atualizado — HANDOFF-MANUS.md v2.3 atualizado

## Status Final Sprint Z-15 Lote A
4/4 issues implementadas e mergeadas
PRs: #605 (fix L1107 + RAG badge) + #607 (plans preview + AI suggestion)
Checkpoint: 2d203e06
Próximo: Sprint Z-15 Lote B (a definir pelo Orquestrador)
