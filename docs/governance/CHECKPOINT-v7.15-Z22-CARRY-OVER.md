# CHECKPOINT v7.15 — Sprint Z-22 carry-over fechado

**Data:** 2026-04-20
**HEAD:** `56e403c` (github/main)
**Sessão:** 2026-04-20 manhã (segunda do dia)
**Estado:** ✅ ENCERRADA

---

## Resumo executivo

Sessão dedicada a fechar o carry-over técnico da Sprint Z-22 — débitos identificados pós-merge do PR #737. Quatro PRs entregues, três já mergeados, um aberto aguardando CI. Nenhum bloqueio operacional novo introduzido. RAG e fluxo principal preservados.

## PRs entregues

| PR | Issue | Branch | Estado |
|---|---|---|---|
| **#745** | #739 — statusMap considera currentStep | `fix/739-statusmap-currentstep` | ✅ MERGED `44eace5` |
| **#746** | #742 — remover filtro Score IA órfão | `fix/742-remover-filtro-score-ia` | ✅ MERGED `80ca31b` |
| **#747** | #741 — badge Exposição nos cards | `feat/741-badge-exposicao-cards` | ✅ MERGED `56e403c` |
| **#748** | #720 — converter 4 fixme em E2E | `test/720-cascade-fixme-to-executable` | 📝 ABERTO |

## Detalhe das entregas

### #745 — statusMap considera currentStep (#739)

**Commit:** `ac31e3c` (PR #745 merge `44eace5`)
**Arquivos:**
- `client/src/components/DiagnosticoStepper.tsx` — `projectStatusToStepState` agora aceita `currentStep` opcional
- `client/src/pages/ProjetoDetalhesV2.tsx` — propaga `summary.currentStep`

**Comportamento:**

| Cenário | Antes | Depois |
|---|---|---|
| status=em_andamento + currentStep=1 (override admin) | 8/8 etapas | 1/8 etapas |
| status=em_andamento + currentStep=8 (fluxo natural) | 8/8 etapas | 8/8 etapas |
| status=em_andamento + currentStep=undefined | 8/8 etapas | 8/8 etapas (fallback) |
| status=rascunho | 0/8 etapas | 0/8 etapas (sem mudança) |

Fix do débito identificado no double review pós-merge PR #737. Backwards-compatible via fallback quando `currentStep` ausente.

### #746 — filtro Score IA órfão removido (#742)

**Commit:** `619463c` (PR #746 merge `80ca31b`)
**Arquivos:** `client/src/pages/Projetos.tsx`

**Removidos:**
- `SCORE_FILTER_OPTIONS` (5 opções) · `matchesScoreFilter` (helper) · `ScoreIaBadge` (componente)
- `scoreFilter` state · ordenação por score (`sortedProjects`) · `import Brain` (lucide-react)
- `<Select>` "Filtrar por Score IA" no JSX

**Causa raiz:** filtro lia `projects.profileCompleteness` que foi dropada na migration 0088 (PR #737, Wave A.2+B). Após aplicação da migration, filtro retornava sempre vazio ou universo total.

Decisão P.O. (2026-04-20): opção (a) remover agora; reintrodução com engine v4 trilhada em #741.

### #747 — badge Exposição nos cards (#741)

**Commit:** `1451774` (PR #747 merge `56e403c`)
**Arquivos:**
- `client/src/components/ExposicaoRiscoBadge.tsx` (novo)
- `client/src/pages/Projetos.tsx` (integração)

**Componente `ExposicaoRiscoBadge`:**
- Lê `projects.scoringData` (engine v4 ADR-0022, preservada na migration 0088)
- 5 estados visuais: Crítica (vermelho) · Alta (laranja) · Média (âmbar) · Baixa (esmeralda) · Sem análise (cinza)
- Ícones: `ShieldAlert`/`Shield`/`ShieldCheck`/`ShieldQuestion`
- `data-testid="exposicao-risco-badge"` para E2E
- Sem custo de query extra: `scoringData` já vem em `projects.list` via SELECT *

Substitui semanticamente o `CpieScoreBadge` dropado na Z-22 Wave A.1 (commit `2e2bb2f`), **sem reintroduzir CPIE legado**.

### #748 — cobertura E2E cascade soft delete (#720, aberto)

**Commit:** `7354db7` (PR #748 aberto, base main)
**Arquivos:** `tests/e2e/soft-delete-cascade.spec.ts`

**4 CTs implementados:**

| CT | Validação |
|---|---|
| CT-1 | `deleteRisk` cascata para `action_plans` (status='deleted') — risco some de `listRisks` |
| CT-2 | `deleteRisk` cascata para `tasks` — `audit_log` tem ≥M entries `entity='task' action='deleted'` |
| CT-3 | `audit_log` cresce em ≥1+N+M entries; entrada do risco tem `reason` + `before_state` |
| CT-4 | `restoreRisk`: planos e tasks voltam com mesmos IDs; nenhum task com status='deleted' (RI-07 §22) |

**Estratégia:** validação via tRPC (não DOM) usando `page.request.post`, cleanup automático após cada CT (restoreRisk).

**Pré-requisitos para execução:**
1. `#719` (PR #722) mergeado em main ✅ (commit `0ff2337`)
2. `E2E_DESTRUCTIVE_PROJECT_ID` env var configurado pelo Manus
3. Projeto destrutivo com risco aprovado + planos + tasks (ACAO 2 Z-20)

## Issues fechadas

- ✅ **#739** — Débito statusMap currentStep
- ✅ **#741** — Badge Exposição ausente nos cards
- ✅ **#742** — Filtro Score IA órfão

## Pendências carry-over (não-bloqueantes)

| # | Pendência | Bloqueio | Prioridade |
|---|---|---|---|
| #720 | PR #748 aguardando CI/merge | nenhum (aguarda revisão automática) | 🟢 |
| #740 | UAT B-04 — botão Exposição em projeto novo | P.O. testar | 🟡 |
| #743 | Escopo "página completa exposição" | P.O. especificar | 🟡 |
| Migration 0088 prod | Aplicação em produção | Manus deploy bloqueado | 🔴 |

## Indicadores técnicos pós-checkpoint

| Indicador | Valor |
|---|---|
| HEAD main | `56e403c` |
| Baseline | **v7.15** |
| TypeScript | 0 erros |
| PRs mergeados (sessão) | 3 (#745, #746, #747) |
| PRs abertos (sessão) | 1 (#748) |
| Issues fechadas (sessão) | 3 (#739, #741, #742) |
| Issues abertas remanescentes | 3 (#720 com PR · #740 e #743 aguardam P.O.) |

## Lições da sessão

### Lição operacional

- **Drop órfão como sintoma, não causa raiz.** O filtro Score IA (#742) só foi detectado como órfão por causa do bug `/projetos/:id` 404 (Z-22 sessão anterior). Filtros que dependem de colunas dropadas devem ser removidos ATOMICAMENTE com o drop, não em PR posterior.

### Lição de processo

- **Carry-over técnico bem-resolvido valida a estratégia de "comentar primeiro, dropar depois"** (proposta no checkpoint v7.14). Os 3 fixes desta sessão (badges, filtro, statusMap) seriam zero se as mudanças tivessem sido feitas em janela dedicada com a operação inteira. Reforço da proposta de regra ORQ-19.

## Referências

- Sessão anterior: `docs/governance/CHECKPOINT-v7.14-Z22-WAVE-A2-B.md`
- Issue #739: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/739
- Issue #741: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/741
- Issue #742: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/742
- Issue #720: https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/720
- PR #748: https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/748

---

*Checkpoint emitido pelo Orquestrador · 2026-04-20 · baseline v7.15*
