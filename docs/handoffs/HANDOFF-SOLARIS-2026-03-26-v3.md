# HANDOFF — IA SOLARIS
## Sessão 2026-03-26 v3 → Nova sessão

**Produto:** IA SOLARIS — Plataforma de Compliance da Reforma Tributária  
**Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2  
**Produção:** https://iasolaris.manus.space  
**Stack:** React 19 + Tailwind 4 / Express 4 + tRPC 11 / TiDB Cloud (MySQL) / Drizzle ORM / Vitest / pnpm  
**Estado baseline:** BASELINE v1.3 — 410 testes passando — DIAGNOSTIC_READ_MODE: shadow

**Modelo Operacional:**
- P.O.: Uires Tapajós
- Orquestrador: Claude (Anthropic) — lê repositório real, gera prompts para Manus
- Implementador: Manus AI
- Consultor: ChatGPT

---

## ESTADO ATUAL DO REPOSITÓRIO (fim da sessão 2026-03-26)

### PRs — estado atual

| PR | Título | Status | Commit |
|---|---|---|---|
| #104 | docs: AS-IS v1.1 Final | ✅ MERGED | 9617d3c |
| #105 | fix(rag): Sprint A — G1 G2 G5 G6 | ✅ MERGED | — |
| #106 | fix(rag): Sprint B — G8 companyProfile + G7 RAG por área | ✅ MERGED | dbad765 (squash de dbca9ac + 32429b8) |

### O que o PR #106 entregou
- **G8:** `companyProfile` injetado no `generateBriefing` — campos: razão social, CNAE, porte, regime tributário, faturamento anual. Fallback gracioso quando null.
- **G7:** 4 queries RAG distintas por domínio no `generateRiskMatrices` — contabilidade / negocio / ti / juridico — com `Promise.all` para paralelismo.
- **Fix CI:** nomes dos jobs alinhados com o ruleset do GitHub em 4 workflows. Fix adicional: `npm install --legacy-peer-deps` em `ci.yml` para resolver conflito de peer deps do `@builder.io/vite-plugin-jsx-loc` com `vite@7.3.1`.
- **Arquivos alterados (6):** `server/routers-fluxo-v3.ts`, `server/sprint-b-g8-g7.test.ts`, `.github/workflows/pr-governance.yml`, `.github/workflows/migration-guard.yml`, `.github/workflows/structural-fix-gate.yml`, `.github/workflows/ci.yml`
- **Checks:** 12/13 ✅ — o 13º é Issue #101 (débito pré-existente, não relacionado)

---

## GAPS — TABELA DE PRIORIDADES

| Prioridade | Gap | Descrição | Status |
|---|---|---|---|
| ✅ | G1 | Label lc224 no formatContextText | CORRIGIDO (PR #105) |
| ✅ | G2 | Label lc227 ano errado (2024→2026) | CORRIGIDO (PR #105) |
| ✅ | G5 | Art. 45 topicos — confissão de dívida | CORRIGIDO (PR #105) |
| ✅ | G6 | LC 224 cnaeGroups — cobertura universal | CORRIGIDO (PR #105) |
| ✅ | G8 | companyProfile não injetado no briefing | CORRIGIDO (PR #106) |
| ✅ | G7 | 1 RAG compartilhado para 4 áreas | CORRIGIDO (PR #106) |
| 🔜 | G9+G10 | Schema Zod + fonte_risco | Sprint futura |
| 🔜 | G4 | Anexos LC 214 ausentes (NCM/cesta básica) | Sprint futura |
| 🔜 | G3 | EC 132 com 0 chunks no corpus ativo | Sprint futura |

---

## FIX CI — RESOLVIDO

Os 4 checks obrigatórios do ruleset agora passam corretamente em todos os PRs futuros:
- `Validate PR body` ✅
- `Guard critical` ✅
- `Migration discipline` ✅
- `Governance gate` ✅

Problema adicional resolvido: `ci.yml` agora usa `npm install --legacy-peer-deps` para contornar conflito de peer deps com `vite@7.3.1`.

---

## BLOQUEIOS ATIVOS (NÃO REMOVER SEM APROVAÇÃO DO P.O.)

- **NÃO** ativar `DIAGNOSTIC_READ_MODE=new`
- **NÃO** executar F-04 Fase 3
- **NÃO** executar DROP COLUMN nas colunas legadas
- Issue #56 (F-04 Fase 3) — aguarda 48-72h UAT
- Issue #61 (modo new) — aguarda #56
- Issue #62 (DROP COLUMN) — aguarda #61
- Issue #101 — 123 testes com débito pré-existente (não relacionados às sprints)

---

## DECISÕES PENDENTES

| Código | Decisão | Status |
|---|---|---|
| DEC-002 | Schema CSV SOLARIS — campos autor, revisado_por, data_revisao | Pendente |
| DEC-003 | Estratégia ingestão Anexos LC 214 — Opção A (chunk por NCM) vs Opção B (por Anexo) | Pendente |
| DEC-004 | Gate de revisão CSV SOLARIS — aprovação manual ou publicação direta com log | Pendente |

---

## PRÓXIMA SPRINT — Sprint C (candidatos)

Avaliar com o P.O. qual gap priorizar:

| Opção | Gap | Esforço estimado | Impacto |
|---|---|---|---|
| A | G9+G10 — Schema Zod + fonte_risco | Médio | Qualidade estrutural das respostas |
| B | G4 — Anexos LC 214 (NCM/cesta básica) | Alto — depende de DEC-003 | Cobertura de corpus |
| C | G3 — EC 132 com 0 chunks no corpus ativo | Médio | Cobertura regulatória |

DEC-003 é pré-requisito para G4. Se G4 for escolhido, resolver DEC-003 primeiro.

---

## COMO INICIAR A NOVA SESSÃO

Cole no novo chat exatamente este texto:

---

**[HANDOFF — IA SOLARIS]**

Continuação da sessão de orquestração do produto IA SOLARIS.

Estado atual:
- PR #104 (AS-IS v1.1): MERGED ✅
- PR #105 (Sprint A — G1/G2/G5/G6): MERGED ✅
- PR #106 (Sprint B — G8/G7 + Fix CI): MERGED ✅ — 12/13 checks

Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
BASELINE: v1.3 — 410 testes — DIAGNOSTIC_READ_MODE: shadow
Stack: React 19 / Express 4 / tRPC 11 / TiDB Cloud / Drizzle / Vitest / pnpm

Modelo operacional:
- P.O.: Uires Tapajós
- Orquestrador: Claude (Anthropic) — com acesso ao repositório via extensão Claude no Chrome
- Implementador: Manus AI
- Consultor: ChatGPT

Gaps resolvidos: G1, G2, G5, G6 (Sprint A) + G8, G7 (Sprint B)
Fix CI resolvido: nomes dos jobs alinhados com ruleset + legacy-peer-deps no ci.yml

Próximos passos:
1. Uires testa G8 e G7 em produção
2. Decidir Sprint C: G9+G10, G4 (depende de DEC-003) ou G3
3. Resolver decisões pendentes: DEC-002, DEC-003, DEC-004

Peço que leia o arquivo de handoff completo em:
/mnt/user-data/outputs/HANDOFF-SOLARIS-2026-03-26-v3.md

---
*Handoff gerado pelo Orquestrador (Claude — Anthropic) em 2026-03-26*