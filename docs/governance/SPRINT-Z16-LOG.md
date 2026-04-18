# Sprint Z-16 — Log de Execução

**Status:** ✅ ENCERRADA — 9/9 issues fechadas · HEAD 5ccb045  
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
| ⏳ PENDING | Bloqueador 6: #613 escopo definido | — | Issue OPEN — aguardando implementação |
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

## Verificação banco — tasks.data_inicio / data_fim

### Migration 0087 (PR #621) — campos criados NULLABLE
- `pnpm db:push` falhou (ER_TABLE_EXISTS_ERROR) → ALTER TABLE manual
- TiDB: DATE_ADD() em DEFAULT não suportado → criados com NULL DEFAULT

### Migration Opção C (PR #639) — NOT NULL aplicado
- `ALTER TABLE tasks MODIFY data_inicio DATE NOT NULL`
- `ALTER TABLE tasks MODIFY data_fim DATE NOT NULL`
- PR #639 mergeado 16/04/2026T14:38:56Z
- **Confirmado por Manus 16/04/2026:** `SHOW COLUMNS FROM tasks LIKE 'data_%'` → NOT NULL ✅

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

## F6 Fase 1 — implementação 16/04/2026

### PRs mergeados (12 PRs na sprint)

| PR | Issue | Tipo | Mergeado |
|---|---|---|---|
| #617 | — | RN_CONSOLIDACAO_V4.md | 15/04 |
| #618 | — | Mockup Consolidacao V4 | 15/04 |
| #619 | — | Bloqueadores 1+2+3 | 15/04 |
| #620 | — | FLOW + UX + DATA dicionários | 15/04 |
| #621 | #614 | Migration 0087 (nullable) | 15/04 |
| #628 | — | Mockup ActionPlanPage Z-16 | 16/04 |
| #631 | — | Sprint Log F3 re-auditoria | 16/04 |
| #632 | #611 | fix: fallback PLANS por categoria | 16/04 |
| #633 | — | Sprint Log F6 iniciada | 16/04 |
| #634 | #622 | feat: calculateComplianceScore v4 | 16/04 |
| #635 | #625 | feat: redirect ConsolidacaoV4 | 16/04 |
| #636 | #615 | feat: modal excluir tarefa | 16/04 |
| #637 | #624 | feat: ConsolidacaoV4 Step 7 | 16/04 |
| #638 | #626 | feat: PDF jsPDF client-side | 16/04 |
| #639 | #614 | db: tasks NOT NULL (Opção C) | 16/04 |

### Issues — estado final

| Issue | Estado | PR |
|---|---|---|
| #611 | ✅ CLOSED | #632 |
| #613 | 🔴 OPEN | — pendente |
| #614 | ✅ CLOSED | #648 (UI modal) + #639 (migration) |
| #615 | ✅ CLOSED | #636 |
| #616 | 🔴 OPEN | — pendente |
| #622 | ✅ CLOSED | #634 |
| #624 | ✅ CLOSED | #637 |
| #625 | ✅ CLOSED | #635 |
| #626 | ✅ CLOSED | #638 |

**Progresso: 9/9 (100%)**

### Lote Final — 16/04/2026

| PR | Issue | Mergeado |
|---|---|---|
| #647 | #613 data-testid (20 total) | 16/04 |
| #648 | #614 modal editar tarefa + z.string().date() | 16/04 |
| #649 | #616 ordenação + badge Atrasada | 16/04 |

---

## Decisão P.O. — escopo #614 (16/04/2026)

Issue #614 cobre APENAS edição de tarefa existente.

Critério de aceite:
- tarefa existente → modal abre
- campos editáveis: titulo, status, responsavel, data_inicio, data_fim
- validação dupla: data_fim >= data_inicio
- backend updateTaskFull salva corretamente
- audit_log registra update

Fora do aceite:
- botão "+ Adicionar tarefa" usando este modal
- fluxo de criação no mesmo componente
- reuso create/edit sem decisão explícita

Regra geral registrada:
"modal editar X" = edição de X existente apenas.
Criação requer issue própria com aceite separado.

### Débitos técnicos registrados

1. **Integração PDF** — `generateDiagnosticoPDF` criado (#638) mas botão na ConsolidacaoV4 é placeholder
2. **restore-plan-button** — data-testid no mockup, funcionalidade não existe no código

---

## Correção de governança — 16/04/2026

**PROBLEMA:** #614 fechada indevidamente por PR #639
- PR #639 = migration NOT NULL (infraestrutura)
- #614 = modal UI editar tarefa (funcionalidade)
- PR usou `Closes #614` → GitHub auto-fechou
- UI do modal não existe no código: `grep 'task-edit-modal' ActionPlanPage.tsx → 0`

**CAUSA RAIZ:** processo aceitava `Closes #N` sem validar entrega funcional

**CORREÇÕES APLICADAS:**
1. #614 reaberta com evidência documentada
2. PRE-CLOSE-CHECKLIST (ORQ-17) integrado no CI — PR #643
3. PC-0: máximo 1 issue por PR — PR #644
4. PC-5: migration nunca fecha frontend — PR #643
5. PR template: seção "Escopo de fechamento" com regra Closes vs Refs
6. Inferência de tipo por path (GAP 3) — PR #644

**LIÇÃO:** `Closes #N` ≠ issue resolvida funcionalmente.
Verificar sempre: grep/data-testid/UI antes de aceitar fechamento.

## Sprint Z-17 iniciada — 16/04/2026

- Issue: #655 feat(action-plan): modal criar tarefa [P0]
- F1: DONE (Manus) · F3: 16/16 (Claude Code)
- F4: DONE (P.O.) · F6: PR #657 mergeado
- Milestone: Sprint Z-17 (#15)

## Sprint Z-17 — issues em execução (16/04/2026)
  #655 modal criar tarefa: DONE (PR #657)
  #659 geração tarefas LLM: DONE (PR #660)
  #668 gatilho Ver Planos: F6 em execução
  Baseline: v6.9 · HEAD: d3a6b73

### Hotfixes Z-17 (ORQ-11) — 16-17/04/2026

Bugs de produção corrigidos como hotfix (ORQ-11):

| PR | Bug | Fix |
|---|---|---|
| #664 | LLM falhava silenciosamente (console.warn) | Timeout 15s→45s + insertAuditLog |
| #666 | Schema wrapper: LLM retorna {tarefas:[]} | z.union 5 formatos |
| #667 | Chave variável: LLM retorna {sugestoes:[]} | z.preprocess flexível |
| #670 | Auto-geração no bulkApprove | Gatilho movido para botão Ver Planos |
| #673 | Planos existentes sem tarefas | Geração retroativa |
| #674 | extractJsonFromLLMResponse ignorava arrays | Suporte [] e {} |

Cobertura: PR #675 (17 unit tests + 3 integration tests + CI workflow)
Gate E2E: 21/21 PASS (PR #677)

### Z-17 #693 — F6 em execução (16/04/2026)
  chore(claude-code): hooks + rules + skills
  Hooks: R-SYNC-01 automático + warning governança
  Rules: 5 modulares por domínio
  Skills: 5 slash commands (/gate-check etc.)

### Z-19 iniciada — 17/04/2026
  Issue #712: UI refinements ActionPlanPage
  F1 ✅ F3 ✅ F4 ✅ F6 em execução
  Condição merge: E2E PASS + teste manual P.O.
