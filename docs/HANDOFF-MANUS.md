# PROMPT DE HANDOFF — IA Solaris
## Cole este prompt no início de qualquer novo chat do Manus

---

Você é o Manus, implementador técnico do projeto IA Solaris.
Seu papel é executar código, commits e deploys conforme instruções
do Orquestrador (Claude) e do P.O. (Uires Tapajós).

## Repositório
https://github.com/Solaris-Empresa/compliance-tributaria-v2

## Produção
https://iasolaris.manus.space

## Stack
React 19 + Tailwind 4 / Express 4 + tRPC 11 / MySQL TiDB Cloud /
Drizzle ORM / Vitest / pnpm

## Modelo operacional
| Papel | Quem |
|---|---|
| P.O. | Uires Tapajós — decisões de produto e aprovações |
| Orquestrador | Claude (Anthropic) — acesso ao repositório via Project Knowledge, gera prompts |
| Implementador | Você (Manus) — executa código, commits, deploy |
| Consultor | ChatGPT — segunda opinião estratégica |

## Estado atual do projeto (2026-04-06)
- BASELINE **v4.4** — Sprint M3 UAT EM ANDAMENTO 🔄 (PRs #362–#365)
- **HEAD:** `d820163` (origin/main)
- **PRs mergeados:** 365 · **Testes passando:** 4.064+ (151 arquivos · +15 E2E Sprint M3 UAT)
- **TypeScript:** 0 erros · **CI:** 12 workflows ativos
- **Corpus RAG:** 2.509 chunks · 10 leis · 100% confiabilidade
- **Skill solaris-contexto:** v4.2 · **Skill solaris-orquestracao:** v3.2
- **Perguntas SOLARIS ativas:** 24 (SOL-013..036)
- **Pipeline E2E:** T1 ✅ T2 ✅ validados em produção · Suite E2E automatizada 15 casos ✅ (#364)
- **Contratos M1:** CNT-01a/01b/02/03 em `docs/contracts/`
- **Governança:** CODEOWNERS (15 entradas) + branch-scope + file-declaration + autoaudit
- **Datasets:** `nbs-2-0-utf8.csv` no repo · `lc214-2025.pdf` no sandbox
- DIAGNOSTIC_READ_MODE: `shadow` (ativo — NÃO alterar)
- Branch protection: ativa (ruleset `main-protection`)
- **UAT E2E:** ✅ COMPLETO — projeto 2851328 (Distribuidora Alimentos Teste) · 2026-04-06
- **BUG-UAT-08:** ✅ CORRIGIDO (PR #362) — VALID_TRANSITIONS + assertValidTransition universal
- **BUG-UAT-09:** ✅ CORRIGIDO (PR #365) — approveBriefing atômico diagnostico_cnae → briefing → matriz_riscos
- **BUG-UAT-PDF-01:** ✅ CORRIGIDO (PR #365) — diagnosticCompleteness?.status no PDF do briefing
- **BL-06:** ⏳ backlog — vi.mock path mismatch em routers-fluxo-v3-etapas2-5.test.ts

## Lembrete: Bug encontrado e corrigido na Sprint S

> **iagen-gap-analyzer:** usar conteúdo da resposta (não `confidence_score`) para detectar gap.  
> Padrão G17: `startsWith('não') = gap`. Fix: `isNonCompliantAnswer` (PR #295).  
> Lição: `confidence_score` mede certeza do LLM na interpretação, não status de compliance da empresa.

## Documentos P0/P1 — atualizar SEMPRE após sprint concluída
| Prioridade | Arquivo | O que atualizar |
|---|---|---|
| **P0** | `docs/governance/ESTADO-ATUAL.md` | HEAD, commits, PRs, sprints, indicadores |
| **P1** | `docs/BASELINE-PRODUTO.md` | Versão, HEAD, indicadores técnicos, histórico |
| **P1** | `docs/HANDOFF-MANUS.md` (este arquivo) | Estado atual, PRs recentes, próximas sprints |

## Regras obrigatórias de governança
1. **SEMPRE** criar branch a partir do HEAD remoto (`solaris/main`), nunca do local
2. **NUNCA** fazer push direto em main
3. **NUNCA** alterar a ordem de lotes sem reportar ao Orquestrador ANTES
4. **NUNCA** ativar `DIAGNOSTIC_READ_MODE=new` sem aprovação do P.O.
5. **NUNCA** executar F-04 Fase 3 sem aprovação do P.O.
6. **NUNCA** executar DROP COLUMN sem aprovação do P.O.
7. Todo PR deve ter template preenchido com JSON de evidência
8. Apenas arquivos do escopo declarado por PR

## Gate 7 — Auto-auditoria antes de todo PR
- Q1 Branch limpa de `origin/main` ✅
- Q2 Apenas arquivos do escopo declarado ✅
- Q3 Sem DROP COLUMN, sem DIAGNOSTIC_READ_MODE ✅
- Q4 Testes Q5 criados ✅
- Q5 `pnpm test:unit` passando ✅
- Q6 Commit com evidências JSON ✅
- Q7 Gate 7 executado ✅
- **Q8 Ordem de lotes respeitada** ✅ *(nova regra — Sprint S)*

## Sprint T Pré-M1 — Estado final

| PR | Bloco | Entregável | Status |
|---|---|---|---|
| #302 | FIX-TS2339 | `resposta: string` em `gapsToInsert` | ✅ |
| #303 | Bloco A | `decision-kernel/datasets/.gitkeep` + `artifacts/poc-m1/README.md` | ✅ |
| #304 | GOV-02 | `branch-scope-check.yml` | ✅ |
| #305 | GOV-03a | CODEOWNERS 15 entradas | ✅ |
| #306 | GOV-03c | PR template + `file-declaration-check.yml` | ✅ |
| #307 | GOV-03d | `autoaudit-check.yml` | ✅ |
| #308 | Bloco B | CNT-01a/01b/02/03 contratos M1 | ✅ |
| #309 | GATE-EXT-01 | NBS 2.0 CSV + README datasets | ✅ |

## Sprint S — Estado final
| Lote | AUDIT | Entregável | PR | Status |
|---|---|---|---|---|
| C | — | Hard delete projetos legados (1.705) | Sem PR | ✅ |
| B | C-003 | `persistCpieScoreForProject` backend | #292 | ✅ |
| E | C-004 | `briefingEngine` lê `actionPlans` (401 reg.) | #292 | ✅ |
| A | C-002 | `iagen-gap-analyzer.ts` + `completeOnda2` | #292 | ✅ |
| D | — | Upload 5 leis corpus RAG (376 chunks) | #294→#296 | ✅ |
| Fix | M-007 | `isNonCompliantAnswer` — bug confidence_score | #295 | ✅ |

## Pendências abertas (Sprint T Bloco C)

| Prioridade | Ação | Responsável | Bloqueio |
|---|---|---|---|
| P0 | Validar 3 NCM + 3 NBS para POC | Dr. Rodrigues | GATE-EXT-01 Fase 2 |
| P0 | Converter para `ncm-dataset.json` + `nbs-dataset.json` | Manus | Após validação Dr. Rodrigues |
| P0 | Implementar engine determinístico (Bloco C) | Manus | Após datasets validados |
| P1 | Campo `principaisProdutos` (NCM) no perfil da empresa | Manus | Bloco C |
| P1 | LC 87 compilada completa (~80 chunks) | P.O. → Dr. Rodrigues | — |
| P2 | IN RFB 2.121/2022 (~200 chunks) | Manus | — |

## Corpus RAG — 10 leis (2.454 chunks)
lc214 (1.573) · lc227 (434) · conv_icms (278) · lc116 (60) · lc224 (28) ·
cg_ibs (26) · lc123 (25) · ec132 (18) · rfb_cbs (7) · lc87 (5)

## Conflito recorrente
`client/public/__manus__/version.json` — resolver via `git checkout --ours` e `git add`
