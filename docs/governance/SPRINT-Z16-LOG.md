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
| ⏳ PENDING | Bloqueador 4: issues Z16-F0/F1/F2/F3 | — | Aguardando Orquestrador |
| ⏳ PENDING | Bloqueador 6: #613 escopo definido | — | Aguardando decisão P.O. |
| ⏳ PENDING | Bloqueador 7: #614 migration 0087 | [#621](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/621) | Preview criado — aguardando aprovação P.O. para executar |

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

## Próximos passos (aguardando Orquestrador)

1. Retirar HOLD após validação dos dicionários pelo Orquestrador
2. Abrir issues Z16-F0/F1/F2/F3 ancoradas nas 4 fontes de verdade
3. Decidir blocos A-E da ActionPlanPage (5 decisões do P.O.)
4. Aprovar migration 0087 para execução no banco
5. Definir escopo da issue #613
