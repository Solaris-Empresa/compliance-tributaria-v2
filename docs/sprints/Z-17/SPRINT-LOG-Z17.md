# Sprint Log — Z-17
> IA SOLARIS · Sprint Z-17 · 2026-04-16 · P.O.: Uires Tapajós

## Resumo
| Campo | Valor |
|---|---|
| Sprint | Z-17 |
| Milestone | #15 |
| Issues | 2/2 fechadas (#655 · #659) |
| PRs mergeados | 6 (#657 · #660 · #661 · #662 + docs) |
| HEAD | `e77dca7` |
| Checkpoint Manus | `06614c05` |
| Gate 7 | PASS |
| Deploy | iasolaris.manus.space ✅ 2026-04-16 |

## Entregas

### #655 — Modal criar tarefa completo (PR #657)
- `taskModalMode`: enum `create | edit | null` (guard duplo)
- Tooltip wrapper para botão desabilitado (plano rascunho)
- `toLocaleDateString('en-CA')` — timezone-safe (sem UTC drift)
- Form inline removido — modal único para criar e editar
- data-testid: `task-create-button`, `task-modal-*`

### #659 — Geração automática tarefas via LLM (PR #660)
- NOVO: `server/lib/task-generator-v4.ts`
  - `generateTaskSuggestions(input: TaskGeneratorInput): Promise<TaskSuggestion[]>`
  - Zod: `TaskSuggestionsArraySchema` (2–4 tarefas)
  - Prompt contextualizado: risco + plano + artigo||null + empresa
  - `generateWithRetry` (NÃO invokeLLM direto)
  - `temperature: 0.3 · enableCache: true · maxRetries: 2`
- MODIFICADO: `server/routers/risks-v4.ts`
  - `generateRisks`: loop chunks 3, Promise.allSettled, insertTaskV4 + insertAuditLog
  - `bulkGenerateActionPlans`: mesmo padrão (variáveis sufixadas Bulk)
  - Return: `{ risksGenerated, actionPlansGenerated, tasksGenerated }`
- audit_log: `entity='task', action='created', generated_by='llm'`
- Fallback: LLM falha → console.warn → plano sem tarefas (pipeline não bloqueia)

### #661 — HANDOFF reversão Z-14 (PR #661, Manus paralelo)
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md`
- 3 substituições: Contrato Confiabilidade + Cardinalidade + Sinais de Alerta
- Reversão: "tarefas manuais" → "carga inicial LLM + revisão humana"
- Autorização P.O.: 16/04/2026

## ADR — Reversão Z-14
| Campo | Valor |
|---|---|
| Decisão | Tarefas geradas via LLM na carga inicial |
| Reverte | Z-14 "tarefas SEMPRE manuais" |
| Autorização | P.O. Uires Tapajós — 16/04/2026 |
| Motivo | Catálogo estático inviável; LLM contextualizado = sugestões úteis |
| Padrão | LLM redige → engine persiste → advogado revisa/edita/exclui |
| Rastreabilidade | `audit_log.after_state.generated_by='llm'` |
| Fallback | LLM falha → plano sem tarefas → criação manual via #655 |

## Gate 7 — Auditoria
| Prova | Resultado |
|---|---|
| tsc | 0 erros ✅ |
| Vitest | 1665 passed / 9 skipped (1 file Z-11 pré-existente, fora do escopo) ✅ |
| Smoke P1: COUNT risks_v4 projeto 720001 | 10 ✅ |
| Smoke P2: categorias diversas | 10 categorias distintas ✅ |
| Smoke P3: títulos sujos | 0 ✅ |
| Smoke P4: tasks geradas | 0 (aguarda re-geração via UI) ℹ️ |
| Checkpoint Manus | 06614c05 ✅ |
| Deploy | iasolaris.manus.space ✅ |

## Falha conhecida (pré-existente, fora do escopo Z-17)
- `server/b-z11-012-evidence.test.ts` — `getProjectById(1)` retorna undefined
- Criado em PR #468 (Sprint Z-11) — PROJECT_ID=1 não existe no banco de teste
- **NÃO é regressão da Z-17** — não investigar como tal

## Próximos passos sugeridos
1. Re-gerar riscos para projeto de teste → verificar tarefas criadas via LLM na ActionPlanPage
2. Verificar aba Histórico: entries `entity='task', action='created', generated_by='llm'`
3. Sprint Z-18: fila assíncrona para projetos com >15 planos (limite prático atual)

---
*IA SOLARIS · Sprint Log Z-17 · Gerado pelo Manus em 2026-04-16*
