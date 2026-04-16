# Sprint Z-16 — Log de Execução

**Status:** 🔴 HOLD — Reconciliação E2E obrigatória  
**Milestone:** [#14 Sprint Z-16](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/14)  
**Decisão P.O.:** 2026-04-15  

---

## Bloqueadores — estado em 15/04/2026T20:30Z

| Status | Bloqueador | PR | Observação |
|---|---|---|---|
| ✅ DONE | Bloqueador 1: FLOW_DICTIONARY Step 7 ConsolidacaoV4 | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) | Mergeado |
| ✅ DONE | Bloqueador 2: UX_DICTIONARY TELA 3 (13 funcionalidades) | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) | Mergeado |
| ✅ DONE | Bloqueador 3: DATA_DICTIONARY campos tasks + scoringData v4 | [#619](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/619) + [#620](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/620) | Mergeados |
| ✅ DONE | Bloqueador 4: issues Z16 criadas | — | Issues: #611 #613 #614 #615 #616 #622 #624 #625 #626 |
| ✅ DONE | Bloqueador 5: ADR-INDEX Opção B (normalização lookup ruleId) | [#617](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/617) | Mergeado |
| ⏳ PENDING | Bloqueador 6: #613 escopo definido | — | Aguardando decisão P.O. |
| ✅ DONE | Bloqueador 7: migration 0087 tasks.data_inicio + tasks.data_fim | [#621](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/621) | PR mergeado 15/04/2026T20:00:40Z · HEAD: 8d7ef43 |

---

## F3 Auditoria — estado em 15/04/2026

**APROVADAS (6):** #611 #613 #614 #615 #622 #624  
**DEVOLVIDAS (3):** #616 #625 #626

| Issue | Item faltante |
|---|---|
| #616 | RN: `INV-AP-10` ausente (1 linha) |
| #625 | Mockup: `MOCKUP_ACTION_PLAN_PAGE_Z15.html` não referenciado (1 linha) |
| #626 | Mockup: `MOCKUP_CONSOLIDACAO_V4_Z16.html` não referenciado (1 linha) |

**Pendências críticas:**
- ❌ `MOCKUP_ACTION_PLAN_PAGE_Z16.html` ausente no repo — Orquestrador precisa commitar
- ❌ Patches #616 #625 #626 — aguardando Orquestrador

---

## Verificação banco — SHOW COLUMNS FROM tasks LIKE 'data_%'

**Resultado:** `[]` — campos `data_inicio` e `data_fim` **NÃO existem no banco.**

> A migration 0087 foi mergeada no repositório (PR #621, HEAD: 8d7ef43) mas **não foi executada no banco TiDB Cloud**. O arquivo `drizzle/0087_tasks_data_inicio_fim.sql` existe como preview — aguarda `pnpm db:push` com aprovação do P.O.

**Colunas atuais de `tasks`:** `id, project_id, action_plan_id, titulo, descricao, responsavel, prazo, status, ordem, deleted_reason, created_by, created_at, updated_at`

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

1. Orquestrador commitar `MOCKUP_ACTION_PLAN_PAGE_Z16.html` em `docs/sprints/Z-16/`
2. Orquestrador enviar patches das issues #616, #625, #626
3. P.O. aprovar execução da migration 0087 (`pnpm db:push`)
4. Retirar HOLD após validação dos patches e execução da migration
5. Implementar issues na ordem: #611 → #614 → #622 → #624 → #613 → #615 → #616 → #625 → #626
