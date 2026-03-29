# Estado Atual — IA SOLARIS
> Atualizado pelo Orquestrador (Claude) ao fechar cada sprint  
> **v2.4 · 2026-03-28** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v2.4 · **HEAD:** e54d606 · **Testes:** 2.652/2.773 (97 falhas pré-existentes)  
**DIAGNOSTIC_READ_MODE:** shadow (aguarda UAT)  
**Corpus RAG:** 2.078 chunks · 5 leis · 100% confiabilidade  
**Sprint K:** CONCLUÍDA (K-4-A ✅ K-4-B ✅ K-4-C ✅ K-4-D ✅)  
**Sprint L:** Upload CSV SOLARIS — próxima sprint

---

## Para o Manus (implementador)

- **Branch base:** main · **HEAD:** e54d606
- **Próxima issue:** #191 — G16 Upload CSV SOLARIS para corpus RAG
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via cherry-pick em branch limpo (padrão PRs #173, #177, #179, #184)
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md
- **Issues do backlog:** ver milestone M4 no GitHub

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v2.4)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Contexto completo:** docs/governance/CONTEXTO-ORQUESTRADOR.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.

## Para o ChatGPT (consultor)

- **Estado:** Sprint K concluída · Sprint L em planejamento
- **Gaps resolvidos:** G1–G10, G13, G14 + K-4-A, K-4-B, K-4-C, K-4-D
- **Gaps pendentes:** G11 (#187), G15 (#192), G16 (#191)
- **Corpus RAG:** 5 leis · 2.078 chunks · confiabilidade 100%
- **Cockpit ao vivo:** /admin/rag-cockpit via ragInventory.getSnapshot
- **Automação planejada:** docs/automation/HIBRIDO-HUMAN-IN-LOOP-RAG-SOLARIS.md
- **Stepper:** 8 etapas — 100% funcional (K-4-D mergeado em 28/03/2026)

---

## Sprints concluídas

| Sprint | Entrega principal | PRs | Baseline |
|---|---|---|---|
| G | Corpus RAG + governança RAG completa | #122–#130 | v1.7 |
| H | Inventário automático tRPC + cockpit ao vivo | #131–#133 | v1.8 |
| I (parcial) | G13+G14 UX + G9+G10 schema Zod | #134–#135 | v1.8 |
| J | CPIE v2 — stepper 8 etapas + Onda 1 | #136–#175 | v2.0 |
| K | Onda 2 (K-4-A a K-4-D) — fluxo completo | #176–#186 | v2.4 |

## Sprint L — próxima

| Issue | Título | Prioridade | Status |
|---|---|---|---|
| #191 | G16 — Upload CSV SOLARIS para corpus RAG | P1 | 🔵 Próxima |
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
```

---

## Indicadores técnicos (28/03/2026)

| Indicador | Valor |
|---|---|
| Commits no main | 572 |
| PRs mergeados | 186 |
| Tabelas no schema | 63 |
| Migrations aplicadas | 60 |
| Testes passando | 2.652 / 2.773 |
| Corpus RAG chunks | 2.078 |
| Leis no corpus | 5 (LC 214, EC 132, LC 227, LC 224, LC 123) |
| Confiabilidade RAG | 100% |
| TypeScript erros | 0 |

---

*IA SOLARIS · DEC-007 · Atualizado em 2026-03-28*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
