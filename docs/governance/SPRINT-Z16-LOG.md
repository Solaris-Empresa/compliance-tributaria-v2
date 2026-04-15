# Sprint Z-16 — Log de Execução

**Status:** 🔴 HOLD — Reconciliação E2E obrigatória  
**Milestone:** [#14 Sprint Z-16](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/14)  
**Decisão P.O.:** 2026-04-15  

---

## Bloqueadores resolvidos — 15/04/2026

| Status | Bloqueador | PR | Observação |
|---|---|---|---|
| ✅ DONE | Bloqueador 1: FLOW_DICTIONARY Step 7 ConsolidacaoV4 | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) | Mergeado |
| ✅ DONE | Bloqueador 2: UX_DICTIONARY TELA 3 (13 funcionalidades) | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) | Mergeado |
| ✅ DONE | Bloqueador 3: DATA_DICTIONARY campos tasks + scoringData v4 | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) + [#620](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/620) | Mergeados |
| ✅ DONE | Bloqueador 5: ADR-INDEX Opção B (normalização lookup ruleId) | [#617](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/617) | Mergeado |
| ✅ DONE | Bloqueador 4: issues Z16-F0/F1/F2/F3 | #622/#624/#625/#626 | Criadas por Claude Code |
| ✅ DONE | Bloqueador 6: #613 escopo definido | — | 18 testids, F3 APROVADA |
| ✅ DONE | Bloqueador 7: #614 migration 0087 | [#621](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/621) | MERGEADA — data_inicio + data_fim em tasks |

---

## Diagnósticos realizados — 15/04/2026

### Gate 0 Banco ActionPlanPage
- `action_plans`: 7 planos, todos `status=rascunho`, criados em 2026-04-15
- `tasks`: 0 registros (esperado — task-edit-modal ausente)
- `audit_log`: 54 registros (34 `created` + 20 `approved`)
- `tasks.data_inicio` / `tasks.data_fim`: campos **não existem** no banco atual

### Gate 0 Score Compliance
- `projects.scoringData`: campo `json` existe no schema
- Fórmula: `sum(SEVERIDADE_SCORE_MAP[r.severidade]) / (n×9) × 100`
- `SEVERIDADE_SCORE_MAP`: Crítica=9, Alta=7, Média=5, Baixa=3, Oportunidade=1
- `risks_v4.confidence`: campo existe (0-1) em cada risco
- `scoringData` do projeto 480267: **NULL** — nunca calculado no fluxo v4
- Referência v3: `calculateGlobalScore` só é chamada em `routers-fluxo-v3.ts`

### Gap E2E identificado
- `ProjetoDetalhesV2.tsx` aponta `/plano-v3` em vez de `/planos-v4` (hot swap pendente)
- Tela de conclusão + exportação PDF não portada para v4 (STEP 7)
- `Consolidacao.tsx` depende de `sessionToken` (schema v1) — incompatível com projetos v4

---

## F3 Auditoria — 15/04/2026 (Claude Code)

| Issue | Score | Veredicto |
|---|---|---|
| #611 fallback PLANS | 16/16 | APROVADA |
| #613 instrumentação testid | 16/16 | APROVADA |
| #614 modal editar tarefa | 16/16 | APROVADA (Gate 0 atualizado + migration mergeada) |
| #615 modal excluir tarefa | 16/16 | APROVADA |
| #616 ordenação + Atrasada | 15/16 | DEVOLVIDA — falta RN cruzada |
| #622 calculateComplianceScore | 16/16 | APROVADA |
| #624 ConsolidacaoV4 componente | 16/16 | APROVADA |
| #625 redirect ConsolidacaoV4 | 15/16 | DEVOLVIDA — falta mockup ref |
| #626 PDF jsPDF | 15/16 | DEVOLVIDA — falta mockup ref |

## Bloqueadores pendentes

| # | Bloqueador | Status |
|---|---|---|
| 1 | MOCKUP_ACTION_PLAN_PAGE_Z16.html | NÃO EXISTE no repo |
| 2 | #616 patch: adicionar RN cruzada | Orquestrador |
| 3 | #625 patch: adicionar mockup ref | Orquestrador |
| 4 | #626 patch: adicionar mockup ref | Orquestrador |
| 5 | 8 issues sem spec-aprovada | P.O. aplica 5 labels |
| 6 | 5 issues com on-hold | Remover após patches |

## Próximos passos

1. Orquestrador: patch #616 #625 #626 (3 linhas)
2. Manus: commitar MOCKUP_ACTION_PLAN_PAGE_Z16.html
3. P.O.: aplicar spec-aprovada nas 9 issues
4. Remover on-hold de #611 #613 #614 #615 #616
5. Implementar na ordem: #611 → #622 → #613 → #624 → #614 → #615 → #625 → #626 → #616
