# Sprint Z-16 — Log de Execução

**Status:** 🟡 EM PROGRESSO — Lote 4 pendente (#613 → #614 → #616)  
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
- ✅ `MOCKUP_ACTION_PLAN_PAGE_Z16.html` commitado — PR #628
- ✅ Patches #616 #625 #626 — aplicados

---

## F3 Re-auditoria pós-patches — 16/04/2026

| Issue | Score | Patch verificado | Veredicto |
|---|---|---|---|
| #616 | 16/16 | `RN: INV-AP-10` presente no Bloco 1 | **APROVADA** |
| #625 | 16/16 | `Mockup: MOCKUP_ACTION_PLAN_PAGE_Z15.html` presente no Bloco 2 | **APROVADA** |
| #626 | 16/16 | `Mockup: MOCKUP_CONSOLIDACAO_V4_Z16.html` presente no Bloco 2 | **APROVADA** |

**Auditado por:** Claude Code  
**Evidência:** `gh issue view [N] --json body | grep [campo]`  
**Total aprovadas Z-16:** 9/9

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

1. ~~Orquestrador commitar `MOCKUP_ACTION_PLAN_PAGE_Z16.html`~~ — ✅ PR #628
2. ~~Orquestrador enviar patches das issues #616, #625, #626~~ — ✅ aplicados + re-auditados
3. P.O. mergear PR #628 (mockup)
4. P.O. aprovar execução da migration 0087 (`pnpm db:push`)
5. Remover `on-hold` de #611 #613 #614 #615 #616
6. Implementar issues na ordem: Lote 1 (#611 #622) → Lote 2 (#624) → Lote 3 (#625 #626) → Lote 4 (#613 #614 #615 #616)

---

## F6 iniciada — 16/04/2026

**Autorização P.O.:** migration 0087 autorizada em 16/04/2026

### Lotes de implementação

| Lote | Issues | Dependência |
|---|---|---|
| Lote 1 | #622 + #611 (engine, paralelo) | — |
| Lote 2 | #624 (ConsolidacaoV4) | após #622 |
| Lote 3 | #625 + #626 | após #624 |
| Lote 4 | #613 → #615 → #614 → #616 | após migration confirmada no banco |

### Migration 0087 — resultado real (16/04/2026)

- `pnpm db:push`: **FALHOU** — `ER_TABLE_EXISTS_ERROR` em `cpie_analysis_history`
  - Causa: arquivo `0087` criado manualmente no PR #621, **não estava no journal Drizzle**
  - Solução: `ALTER TABLE` executado diretamente no banco TiDB Cloud
- TiDB incompatibilidade: `DATE_ADD()` em `DEFAULT` não suportado → colunas criadas com `NULL DEFAULT`
- `SHOW COLUMNS FROM tasks LIKE 'data_%'`:

```
data_inicio | date | Null: YES | Default: null  ✅
data_fim    | date | Null: YES | Default: null  ✅
```

- **Bloqueio #614 e #616: RESOLVIDO** — colunas existem no banco
- **Observação para o Orquestrador:** o schema Drizzle (`drizzle/schema.ts`) precisa ser atualizado para refletir `data_inicio` e `data_fim` como `date().nullable()` em vez de `NOT NULL DEFAULT (CURDATE())` — incompatível com TiDB.

---

## Sprint Z-16 Fase 2 — NOT NULL (Opção C) — 16/04/2026

**Autorização P.O.:** Opção C aprovada (MODIFY NOT NULL sem DEFAULT)

### Execução

```sql
ALTER TABLE tasks
  MODIFY data_inicio DATE NOT NULL,
  MODIFY data_fim DATE NOT NULL;
```

### Verificação SHOW COLUMNS FROM tasks LIKE 'data_%'

```
data_inicio | date | Null: NO | Default: null  ✅
data_fim    | date | Null: NO | Default: null  ✅
```

### Arquivos alterados (PR #639)

| Arquivo | Mudança |
|---|---|
| `server/lib/db-queries-risks-v4.ts` | `TaskRow` + `InsertTaskV4` com `data_inicio: Date` e `data_fim: Date` NOT NULL; INSERT SQL atualizado |
| `server/routers/risks-v4.ts` | `upsertTask` input schema + defaults (`today` / `today+30d`) |
| `docs/governance/DATA_DICTIONARY.md` | Tipos corrigidos para `DATE NOT NULL` |

### Gate 7

- tsc: 0 erros ✅
- testes: 1665 passed (falha `b-z11-012` pré-existente, sem regressão) ✅
- sem DROP COLUMN ✅
- sem DIAGNOSTIC_READ_MODE=new ✅
- escopo declarado: 3 arquivos ✅

**PR #639:** https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/639 — mergeado 2026-04-16

---

## Estado atual Z-16 (16/04/2026)

| Lote | Issues | Status |
|---|---|---|
| Lote 1 | #622 + #611 | ✅ CONCLUÍDO (PRs #634+#632) |
| Lote 2 | #624 | ✅ CONCLUÍDO (PR #637) |
| Lote 3 | #625 + #626 | ✅ CONCLUÍDO (PRs #635+#638) |
| Lote 4 | #613 → #615 → #614 → #616 | ⏳ PENDENTE (aguarda prompt Orquestrador) |

**Próximo passo:** Orquestrador enviar prompt para Lote 4 (#613 data-testid → #615 já mergeado → #614 UI → #616 badge).
