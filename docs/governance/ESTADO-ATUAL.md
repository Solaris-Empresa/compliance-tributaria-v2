# Estado Atual — IA SOLARIS
> Atualizado pelo Manus ao fechar cada sprint  
> **v3.5 · 2026-04-02 (rev Sprint S — PRs #292 + #293 mergeados)** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v3.5 · **HEAD:** `d08c12a` (solaris/main) · **Testes:** 1.436 passando  
**DIAGNOSTIC_READ_MODE:** `shadow` (aguarda UAT — NÃO alterar)  
**Corpus RAG:** 2.454 chunks · 10 leis · 100% confiabilidade  
**Sprint S:** CONCLUÍDA ✅ (Lotes A ✅ B ✅ C ✅ D ✅ E ✅)  
**PRs mergeados nesta sessão:** #292 (Lotes A+B+E) · #293 (skill v4.0)  
**Lote D:** 376 chunks inseridos — corpus completo (10 leis, 2.454 chunks)  
**Skill solaris-contexto:** v4.0 — Pipeline 3 Ondas, sprints K–S, iniciativas proativas  

---

## Para o Manus (implementador)

- **Branch base:** solaris/main · **HEAD:** `d08c12a`
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Regra de ordem:** respeitar a sequência de lotes definida pelo Orquestrador. Se houver impedimento, reportar ANTES de alterar a sequência.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via `git checkout --ours`
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v4.0)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.

---

## 1. Indicadores Técnicos

| Indicador | Valor | Status |
|---|---|---|
| HEAD (solaris/main) | `d08c12a` | ✅ |
| Testes passando | **1.436** | ✅ |
| Testes falhando | 0 | ✅ |
| Migrations aplicadas | **62** | ✅ |
| PRs mergeados (total) | **293+** | ✅ |
| Branch protection | Ativa (ruleset `main-protection`) | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (NÃO alterar) | ✅ |
| Corpus RAG | **2.454 chunks — 10 leis** | ✅ |
| Skill solaris-contexto | **v4.0** | ✅ |
| Skill solaris-orquestracao | **v3.0** | ✅ |
| feature-flags.ts | g17 ✅ g11 ✅ g15 ✅ | ✅ |
| db:push guard | Bloqueado em production | ✅ |

---

## 2. Corpus RAG — Estado pós-Sprint S Lote D

| Lei | Chunks | Status |
|---|---|---|
| lc214 (IBS/CBS/IS) | 1.573 | ✅ |
| lc227 | 434 | ✅ |
| conv_icms (Convênio ICMS 142/2018) | 278 | ✅ Novo (Sprint S) |
| lc116 (ISS) | 60 | ✅ Novo (Sprint S) |
| lc224 | 28 | ✅ |
| cg_ibs (Resolução CSIBS nº 1/2026) | 26 | ✅ Novo (Sprint S) |
| lc123 (Simples) | 25 | ✅ |
| ec132 | 18 | ✅ |
| rfb_cbs (Ato Conjunto RFB/CGIBS nº 1/2025) | 7 | ✅ Novo (Sprint S) |
| lc87 (Lei Kandir — texto original 1996) | 5 | ✅ Novo (Sprint S) |
| **Total** | **2.454** | ✅ |

> **Nota LC 87:** PDF recebido é o texto original de 1996 (2 páginas, 5 chunks). Solicitar versão compilada com emendas ao Dr. Rodrigues para enriquecer cobertura ICMS.

---

## 3. Sprint S — Resumo de Execução

| Lote | AUDIT | Entregável | PR | Status |
|---|---|---|---|---|
| C | — | Hard delete projetos legados | Sem PR (dados) | ✅ 0 restantes |
| B | C-003 | `persistCpieScoreForProject` no backend (`approveActionPlan`) | #292 | ✅ |
| E | C-004 | `briefingEngine` lê `actionPlans` (401 reg.) em vez de `project_actions_v3` (9) | #292 | ✅ |
| A | C-002 | `iagen-gap-analyzer.ts` + integração `completeOnda2` fire-and-forget | #292 | ✅ |
| D | — | Upload 5 leis no corpus RAG (376 chunks) | Sem PR (dados) | ✅ |

**Desvio de governança registrado:** ordem C→B→E→A→D não foi respeitada na primeira execução. Corrigido na sessão corretiva. Nova regra Q8 sugerida para o Gate 7: verificar sequência de lotes antes de abrir PR.

---

## 4. Histórico de Sprints (K → S)

| Sprint | Entregável principal | Status |
|---|---|---|
| K | Arquitetura 3 Ondas (K-4-A a K-4-E) | ✅ CONCLUÍDA |
| K+ | Cockpit P.O. v2.0 (C1–C5 + I1–I4) | ✅ CONCLUÍDA |
| K++ | Cockpit fetch dinâmico + Seção 4 + 10 docs | ✅ CONCLUÍDA |
| L | DEC-002 anchor_id + AdminSolaris + RAG Telemetria | ✅ CONCLUÍDA |
| M | G17-B Solaris Gap Engine v2 + 98% Confidence | ✅ CONCLUÍDA |
| N | G17 validado em produção + G11 fonte_risco | ✅ CONCLUÍDA |
| O | ONDA_BADGE + ADR-0002 + feature flags | ✅ CONCLUÍDA |
| P | Planos de ação v3 (actionPlans) | ✅ CONCLUÍDA |
| Q | ScoreView CPIE + cpie_score_history | ✅ CONCLUÍDA |
| R | briefingEngine v2 + iagen_answers pipeline | ✅ CONCLUÍDA |
| **S** | **Lotes A+B+C+D+E — pipeline 3 Ondas completo + corpus 10 leis** | **✅ CONCLUÍDA** |

---

## 5. Achados Críticos — Estado

| ID | Descrição | Status |
|---|---|---|
| AUDIT-C-002 | iagen_answers não geravam gaps | ✅ Resolvido (Lote A, PR #292) |
| AUDIT-C-003 | cpie_score_history sempre vazio | ✅ Resolvido (Lote B, PR #292) |
| AUDIT-C-004 | briefingEngine lia project_actions_v3 (9 reg.) | ✅ Resolvido (Lote E, PR #292) |
| AUDIT-C-005 | Corpus RAG com 5 leis faltando | ✅ Resolvido (Lote D, dados) |
| AUDIT-M-004 | LC 87 com apenas 5 chunks (texto original) | ⚠️ Aberto — solicitar versão compilada |

---

## 6. Pendências e Próximas Ações

| Prioridade | Ação | Responsável |
|---|---|---|
| P0 | Decidir Lote B Opção A vs B (persistência CPIE em `getScore`) | P.O. |
| P1 | Executar testes T1 e T2 do Sprint S (validação manual) | P.O. |
| P1 | Solicitar LC 87 compilada ao Dr. Rodrigues | P.O. |
| P2 | Validar RAG com query real sobre ISS/ICMS no RAG Cockpit | P.O. |
| P2 | Atualizar skill solaris-orquestracao para v3.1 (nova regra Q8) | Manus |

---

## 7. Decisões tomadas pelo P.O.

| Código | Decisão | Data |
|---|---|---|
| DEC-001 | Prefill cruzado QC-07→QO-03 pós-UAT | 2026-03-24 |
| DEC-002 | Schema DEC-002: 4 campos novos em solaris_questions | 2026-03-30 |
| DEC-003 | Ingestão Anexos LC 214 — chunk por Anexo | 2026-03-26 |
| DEC-004 | Gate lei=solaris — publicação direta com log | 2026-03-26 |
| DEC-005 | Escopo holístico — todas as empresas brasileiras | 2026-03-26 |
| DEC-006 | LC 123/2006 incluída no corpus | 2026-03-26 |
| DEC-007 | Infraestrutura de contexto: ESTADO-ATUAL + CODEOWNERS | 2026-03-28 |
| DEC-008 | Cockpit P.O. com fetch dinâmico API GitHub | 2026-03-29 |
| DEC-009 | Protocolo de Debug v2 adotado | 2026-03-31 |
| DEC-010 | Corpus RAG expandido para 10 leis (Sprint S Lote D) | 2026-04-02 |

---

## 8. Bloqueios Permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata

---

## 9. Arquivos críticos — alterar SOMENTE via PR aprovado

```
drizzle/schema.ts
server/ai-schemas.ts
server/routers-fluxo-v3.ts
server/rag-retriever.ts
server/config/feature-flags.ts
docs/rag/CORPUS-BASELINE.md
docs/rag/RAG-GOVERNANCE.md
docs/governance/ESTADO-ATUAL.md
docs/BASELINE-PRODUTO.md
docs/HANDOFF-MANUS.md
```

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-02 (rev Sprint S — PRs #292 + #293 mergeados)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
