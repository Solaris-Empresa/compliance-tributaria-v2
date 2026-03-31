# Estado Atual — IA SOLARIS
> Atualizado pelo Orquestrador (Claude) ao fechar cada sprint  
> **v2.9 · 2026-03-30 (rev Sprint L — DEC-002 PR #236 aberto)** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v2.9 · **HEAD:** b06a042 (solaris/main) · **Testes:** 2.666 passando (+11 Sprint L)  
**DIAGNOSTIC_READ_MODE:** shadow (aguarda UAT)  
**Corpus RAG:** 2.078 chunks · 5 leis · 100% confiabilidade  
**Sprint K:** CONCLUÍDA ✅ (K-4-A ✅ K-4-B ✅ K-4-C ✅ K-4-D ✅ K-4-E ✅)  
**Sprint L:** PR #236 ABERTO — feat/sprint-l-v2 → main (aguarda merge)  
**DEC-002:** ✅ Migration 0060 + solarisAdmin 6 procedures + AdminSolarisQuestions 3 abas + 11 testes  
**Cockpit P.O.:** ✅ Seção 7E Qualidade RAG + 6D Consistência Global (PRs #233–#234)  
**RAG Telemetria:** ✅ rag_usage_log (PR #235 — L-RAG-01)  

---

## Para o Manus (implementador)

- **Branch base:** feat/sprint-l-v2 · **HEAD local:** 3f5fa95 (1 commit à frente de solaris/main)
- **PR aberto:** #236 — feat/sprint-l-v2 → main — aguarda aprovação P.O.
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via cherry-pick em branch limpo (padrão PRs #173, #177, #179, #184)
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md
- **Issues do backlog:** ver milestone M4 no GitHub
- **Documentos P0/P1 obrigatórios:** atualizar SEMPRE após sprint concluída:
  - P0: `docs/governance/ESTADO-ATUAL.md` (este arquivo)
  - P1: `docs/BASELINE-PRODUTO.md`
  - P1: `docs/HANDOFF-MANUS.md`

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v2.4)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Contexto completo:** docs/governance/CONTEXTO-ORQUESTRADOR.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.
- **⚠️ Atenção:** o skill `solaris-contexto` tem estado desatualizado hardcoded. Usar ESTE arquivo como fonte de verdade.

## Para o ChatGPT (consultor)

- **Estado:** Sprint L DEC-002 concluída — PR #236 aberto para merge
- **Gaps resolvidos:** G1–G10, G13, G14 + K-4-A, K-4-B, K-4-C, K-4-D, K-4-E + G16 (DEC-002)
- **Gaps pendentes:** G11 (#187), G15 (#192)
- **Corpus RAG:** 5 leis · 2.078 chunks · confiabilidade 100%
- **Cockpit ao vivo:** /admin/rag-cockpit — 7 seções incluindo 7E Qualidade RAG
- **RAG Telemetria:** rag_usage_log ativo (PR #235)

---

## Sprints concluídas

| Sprint | Entrega principal | PRs | Baseline |
|---|---|---|---|
| G | Corpus RAG + governança RAG completa | #122–#130 | v1.7 |
| H | Inventário automático tRPC + cockpit ao vivo | #131–#133 | v1.8 |
| I (parcial) | G13+G14 UX + G9+G10 schema Zod | #134–#135 | v1.8 |
| J | CPIE v2 — stepper 8 etapas + Onda 1 | #136–#175 | v2.0 |
| K | Onda 2 (K-4-A a K-4-D) — fluxo completo | #176–#186 | v2.4 |
| K+ | Cockpit P.O. v2.0 — C1–C5+I1–I4 acionável | #196–#197 | v2.4 |
| K++ | Cockpit fetch dinâmico + Seção 4 (4A–4F) + 10 docs atualizados | #199–#202 | v2.4 |
| K-4-E | Auditoria jurídica `project_status_log` (migration 0059, 3 testes) | #212 | v2.5 |
| L (RAG) | Cockpit 3 Ondas + RAG Quality Gate + rag_usage_log + Seção 7E | #215–#235 | v2.8 |
| L (DEC-002) | Upload CSV Perguntas SOLARIS — migration 0060 + 6 procedures + 11 testes | #236 (aberto) | v2.9 |
| L (BUG-C) | Fix TiDB LIMIT/OFFSET bind param — 3 routers corrigidos | #246 (aberto) | v2.9 |
| L (GOV) | Protocolo de Debug v2 — Passo 0 fast path + Passo 7 formato fechado | PR aberto | v3.1 |

## Sprint L — em andamento

| Issue | Título | Prioridade | Status |
|---|---|---|---|
| #191 | G16 — Upload CSV SOLARIS para corpus RAG | P1 | 🟡 PR #236 aberto (aguarda merge) |
| #188 | DT-01 — Fix db:push bloqueado por assessmentPhase1 | P2 | ⏳ Backlog |
| #189 | RFC-003 — Reclassificação chunks leis avulsas | P3 | ⏳ Backlog |

## Backlog Sprint M+

| Issue | Título | Sprint |
|---|---|---|
| #190 | N8N-F1 — Monitoramento RAG agendado | M |
| #187 | G11 — campo fonte_risco no RiskItemSchema | M |
| #192 | G15 — Arquitetura 3 ondas de perguntas | M+ |
| #193 | Expansão corpus — lc116, lc87, cg_ibs, rfb_cbs | M+ |

---

## Decisões tomadas pelo P.O.

| Código | Decisão | Data |
|---|---|---|
| DEC-001 | Prefill cruzado QC-07→QO-03 pós-UAT | 2026-03-24 |
| DEC-003 | Ingestão Anexos LC 214 — chunk por Anexo | 2026-03-26 |
| DEC-004 | Gate lei=solaris — publicação direta com log | 2026-03-26 |
| DEC-005 | Escopo holístico — todas as empresas brasileiras | 2026-03-26 |
| DEC-006 | LC 123/2006 incluída no corpus | 2026-03-26 |
| DEC-007 | Infraestrutura de contexto: ESTADO-ATUAL + CODEOWNERS | 2026-03-28 |
| DEC-008 | Cockpit P.O. com fetch dinâmico API GitHub (Score de Saúde em tempo real) | 2026-03-29 |
| DEC-002 | Schema DEC-002: 4 campos novos em solaris_questions (titulo, topicos, severidade_base, vigencia_inicio) | 2026-03-30 |
| DEC-009 | Protocolo de Debug v2 adotado — Passo 0 fast path obrigatório, Passo 7 formato fechado, Gate de bloqueio | 2026-03-31 |

---

## Bloqueios permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata

---

## Arquivos críticos — alterar SOMENTE via PR aprovado

```
drizzle/schema.ts
server/ai-schemas.ts
server/routers-fluxo-v3.ts
server/rag-retriever.ts
docs/rag/CORPUS-BASELINE.md
docs/rag/RAG-GOVERNANCE.md
docs/governance/ESTADO-ATUAL.md
docs/BASELINE-PRODUTO.md
docs/HANDOFF-MANUS.md
```

---

## Indicadores técnicos (30/03/2026)

| Indicador | Valor |
|---|---|
| Commits no main | 616 (solaris/main HEAD b06a042) |
| PRs mergeados | 235 (último: L-RAG-01 rag_usage_log) |
| PR aberto | #236 — Sprint L DEC-002 (feat/sprint-l-v2 → main) |
| Tabelas no schema | 68 |
| Migrations aplicadas | **61** (0000–0060; 0060 = DEC-002 solaris_questions) |
| Testes passando | 2.666 (+11 Sprint L DEC-002) |
| Corpus RAG chunks | 2.078 |
| Leis no corpus | 5 (LC 214, EC 132, LC 227, LC 224, LC 123) |
| Confiabilidade RAG | 100% |
| TypeScript erros | 0 |
| Docs ✅ Atualizados | 24 / 24 |

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-03-30 (rev Sprint L DEC-002 — PR #236 aberto)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
