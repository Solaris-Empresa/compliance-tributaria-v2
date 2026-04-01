# Estado Atual — IA SOLARIS
> Atualizado pelo Orquestrador (Claude) ao fechar cada sprint  
> **v3.3 · 2026-04-01 (rev Sprint N encerrada — CI/CD fix + ONDA1 E2E doc + G15 mergeado)** · Responsável: Orquestrador gera, Manus commita

---

## TL;DR — 30 segundos

Plataforma de compliance da Reforma Tributária brasileira.  
**Baseline:** v3.0 · **HEAD:** `cb22fd1` (main, PR #272 mergeado) · **Testes:** 2.689 passando  
**DIAGNOSTIC_READ_MODE:** shadow (aguarda UAT com advogados)  
**Corpus RAG:** 2.078 chunks · 5 leis · 100% confiabilidade  
**Sprint M:** CONCLUÍDA ✅ — UAT manual, E2E Playwright, BUG-UAT-02/03/05, auth.testLogin  
**Sprint N:** ENCERRADA ✅ — G17 ✅ · CI/CD fix ✅ · G11 ✅ · Gates v5.0 ✅ · G1/G2 ✅ · G15 ✅ · ONDA1 E2E doc ✅ · Post-mortem G17 ✅  
**PRs mergeados:** 280 (último: #280 chore(backfill) script g17-backfill 4 projetos)  
**Fila de PRs abertos:** VAZIA ✅

---

## Para o Manus (implementador)

- **Branch base:** `main` (HEAD `cb22fd1`) — fila limpa, 0 PRs abertos
- **Regra obrigatória:** SEMPRE branch → PR → merge. NUNCA push direto em main.
- **Conflito recorrente:** `client/public/__manus__/version.json` — resolver via cherry-pick em branch limpo (padrão PRs #173, #177, #179, #184)
- **Divergência de histórico:** `origin/main` (Manus S3) ≠ `solaris/main` (GitHub) — SEMPRE criar branch a partir do HEAD do `solaris/main` via `git fetch`
- **Referência operacional:** docs/HANDOFF-MANUS.md
- **Referência de governança:** docs/governance/HANDOFF-IMPLEMENTADOR.md
- **Issues do backlog Sprint N:** ~~#259 (G17 P0)~~ ✅, ~~Fix CI/CD P1~~ ✅, ~~#187 (G11 P1)~~ ✅, ~~#192 (G15 P2)~~ ✅ — **Sprint N ENCERRADA**
- **Sprint O — P0:** Reconciliar `drizzle/meta/_journal.json` (61 entradas vs. 63 migrations) · Executar riskEngine para projetos 2310001/2370001/2370002 · Alerta INSERT silencioso
- **Documentos P0/P1 obrigatórios:** atualizar SEMPRE após sprint concluída:
  - P0: `docs/governance/ESTADO-ATUAL.md` (este arquivo)
  - P1: `docs/BASELINE-PRODUTO.md`
  - P1: `docs/HANDOFF-MANUS.md`

## Para o Claude (orquestrador)

- **Skill:** `/home/ubuntu/skills/solaris-contexto/SKILL.md` (v3.3)
- **Skill operacional:** `/home/ubuntu/skills/solaris-orquestracao/SKILL.md` (v3.4)
- **Gate 0 RAG:** docs/rag/HANDOFF-RAG.md
- **Corpus baseline:** docs/rag/CORPUS-BASELINE.md
- **Contexto completo:** docs/governance/CONTEXTO-ORQUESTRADOR.md
- **Antes de propor qualquer coisa:** verificar se já está implementado via `grep` no repo
- **Restrições absolutas:** DIAGNOSTIC_READ_MODE=new, F-04 Fase 3, DROP COLUMN — NUNCA sem aprovação P.O.
- **⚠️ Atenção:** usar ESTE arquivo como fonte de verdade (skills têm estado hardcoded)

## Para o ChatGPT (consultor)

- **Estado:** Sprint O ENCERRADA ✅ — G17-B ✅ (PR #276) · Sprint N ENCERRADA ✅ — G17 ✅ G11 ✅ G15 ✅ Gates v5.0 ✅
- **Gaps resolvidos:** G1–G14, G16, G17 + K-4-A a K-4-E + BUG-UAT-02/03/05 + Gates G1/G2
- **Gaps pendentes:** Sprint O+ — backfill 4 projetos reais · normalizar SOLARIS_GAPS_MAP (10/76 tópicos) · journal migration
- **Corpus RAG:** 5 leis · 2.078 chunks · confiabilidade 100%
- **Cockpit ao vivo:** /admin/rag-cockpit — 7 seções incluindo 7E Qualidade RAG
- **Testes E2E:** CT-01, CT-04, CT-06, CT-07, CT-37 (Playwright)
- **Endpoint testLogin:** ativo apenas com `E2E_TEST_MODE=true`

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
| L (DEC-002) | Upload CSV Perguntas SOLARIS — migration 0060 + 6 procedures + 11 testes | #236–#246 | v2.9 |
| M | UAT manual + E2E Playwright + BUG-UAT-02/03/05 + auth.testLogin + 9 docs + painel PO | #251–#260 | v3.0 |

## Sprint N — em andamento

| Issue | Título | Prioridade | Status |
|---|---|---|---|
| #259 | G17 — Integrar solaris_answers ao gapEngine | P0 | ✅ DONE (PR #262 + #263) |
| — | Fix CI/CD npm → pnpm (3 workflows) | P1 | ✅ DONE (PR #261) |
| #187 | G11 — campo fonte_risco no RiskItemSchema | P1 | ✅ DONE (PR #267) |
| #192 | G15 — Arquitetura 3 ondas de perguntas | P2 | ⏳ Gate 0 NO-GO — aguarda P.O. |
| — | Gates v5.0 (Q5/G1/G2 + validate-pr-body) | P1 | ✅ DONE (PR #266) |
| — | E2E CT-18..CT-35 (Admin corpus + CRUD) | P2 | ⏳ Backlog |

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
| DEC-002 | Schema DEC-002: 4 campos novos em solaris_questions | 2026-03-30 |
| DEC-009 | Protocolo de Debug v2 adotado — Passo 0 fast path obrigatório | 2026-03-31 |
| DEC-010 | Corpus SOLARIS: SOL-001..SOL-012 ativos; SOL-013/SOL-014 soft-deleted | 2026-03-31 |
| DEC-011 | E2E Playwright via auth.testLogin (E2E_TEST_MODE guard) — sem OAuth real | 2026-03-31 |

---

## Bloqueios permanentes — NÃO remover sem aprovação P.O.

- `DIAGNOSTIC_READ_MODE=new` → aguarda UAT com advogados
- `F-04 Fase 3` → aguarda UAT
- `DROP COLUMN` em colunas legadas → aguarda F-04 Fase 3
- Issues #56, #61, #62 → bloqueadas em cascata
- ~~**G17 (#259)**~~ ✅ CONCLUÍDO — `gapEngine` agora consome `solaris_answers` via `analyzeSolarisAnswers` (source='solaris')

---

## Arquivos críticos — alterar SOMENTE via PR aprovado

```
drizzle/schema.ts
server/ai-schemas.ts
server/routers-fluxo-v3.ts
server/lib/solaris-gap-analyzer.ts
server/config/solaris-gaps-map.ts
server/rag-retriever.ts
docs/rag/CORPUS-BASELINE.md
docs/rag/RAG-GOVERNANCE.md
docs/governance/ESTADO-ATUAL.md
docs/BASELINE-PRODUTO.md
docs/HANDOFF-MANUS.md
```

---

## Indicadores técnicos (01/04/2026)

| Indicador | Valor |
|---|---|
| Commits no main | ~643 (HEAD `72b51d4`) |
| PRs mergeados | **280** (último: #280 chore(backfill) script g17-backfill) |
| PRs abertos | **0** ✅ |
| Tabelas no schema | 68 |
| Migrations aplicadas | **63** (0000–0062) |
| Testes passando | **2.690+** (`it()` calls em 140+ arquivos `.test.ts`) |
| Testes E2E | 5 CTs (CT-01, CT-04, CT-06, CT-07, CT-37) |
| Corpus RAG chunks | 2.078 |
| Leis no corpus | 5 (LC 214, EC 132, LC 227, LC 224, LC 123) |
| Confiabilidade RAG | 100% |
| TypeScript erros | 0 |
| Docs ✅ Atualizados | 26 / 26 |
| SKILL.md versão | v4.0 (solaris-orquestracao + solaris-contexto) |

| Sprint O+ — Q6 | ✅ MERGEADO | PR #281 | Gate Q6 adicionado ao CONTRIBUTING.md — validação de dados reais obrigatória em PRs de mapeamento |
---

*IA SOLARIS · DEC-007 · Atualizado em 2026-04-01 (rev Sprint O: G17-B/C/D + backfill + Q6 governança)*  
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
