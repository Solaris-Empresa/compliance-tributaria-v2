# IA SOLARIS — Onda 1: Fluxo E2E, ADRs e Rastreabilidade Completa

**Versão:** 1.0 | **Data:** 2026-04-01 | **Sprint:** N | **HEAD:** `8faaf42`
**Autores:** Orquestrador Claude + Manus AI
**Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Sumário Executivo

Este documento unifica a análise do fluxo E2E da Onda 1 da plataforma IA SOLARIS, incorporando as decisões arquiteturais (ADRs), o estado de rastreabilidade completo (sprints, issues, PRs), o estado do CI/CD e as pendências abertas da Sprint N. Serve como referência operacional para o P.O. e o Orquestrador na abertura da Sprint O.

A Sprint N encerrou com **9 PRs mergeados**, **7 features/fixes entregues** e a plataforma em estado de **maturidade de governança v5.0**. O pipeline da Onda 1 está funcional para geração de gaps com `source='solaris'`, mas o trecho `riskEngine → briefing` ainda não foi executado para os 3 projetos existentes em produção.

---

## 1. Arquitetura da Onda 1 — Fluxo E2E

### 1.1. Pipeline completo

```
Perfil da empresa (CNAE, porte, regime, UF)
    │
    ▼
[Requirement Engine]  ← RAG filtrado por CNAE + corpus LC 214/2025
    │ requirements[]
    ▼
[Question Engine — Onda 1: SOLARIS seeds SOL-001..012]
    │ questions[] com campo fonte='solaris'
    ▼
[Respostas do usuário — QuestionarioSolaris.tsx]
    │ solaris_answers[]
    ▼
[analyzeSolarisAnswers — server/lib/solaris-gap-analyzer.ts]  ← G17
    │ INSERT project_gaps_v3 (source='solaris', gap_status, criticidade)
    ▼
[riskEngine.deriveAndPersist]  ← G11
    │ INSERT project_risks_v3 (fonte_risco='solaris')
    ▼
[Briefing Engine]
    │ INSERT project_briefings_v3
    ▼
[MatrizesV3.tsx — badge ONDA_BADGE]
```

### 1.2. Estado em produção (2026-04-01)

| Etapa | Tabela | Projetos com dados | Status |
|---|---|---|---|
| Gaps SOLARIS | `project_gaps_v3` | 2310001 (3), 2370001 (2), 2370002 (2) | ✅ OK |
| Riscos SOLARIS | `project_risks_v3` | 0 | ⚠️ riskEngine não executado |
| Briefing | `project_briefings_v3` | 0 | ⚠️ dependente dos riscos |

---

## 2. Seeds SOL-001..012 — Corpus Onda 1

As 12 perguntas SOLARIS (seeds) são a base da Onda 1. Todas têm `fonte='solaris'` no banco desde a Sprint J.

| ID | Pergunta (resumo) | fonte | Criticidade |
|---|---|---|---|
| SOL-001 | Regime tributário atual | solaris | alta |
| SOL-002 | Apuração IBS/CBS mensal | solaris | critica |
| SOL-003 | Prestação de serviços | solaris | alta |
| SOL-004 | Venda de mercadorias | solaris | alta |
| SOL-005 | Operações interestaduais | solaris | media |
| SOL-006 | Exportação | solaris | media |
| SOL-007 | Importação | solaris | media |
| SOL-008 | Benefícios fiscais | solaris | alta |
| SOL-009 | Contratos de longo prazo | solaris | critica |
| SOL-010 | Cooperativas / imunidade | solaris | media |
| SOL-011 | Período de transição 2026–2032 | solaris | alta |
| SOL-012 | Confissão por inércia | solaris | critica |

**Fonte:** `SELECT id, fonte, criticidade FROM solaris_questions WHERE id LIKE 'SOL-%'` — 14 registros (2 adicionados em Sprint M).

---

## 3. Severidade e Vigência dos Gaps

Os gaps gerados pela Onda 1 seguem a taxonomia definida no `GapSchema`:

| gap_status | Descrição | Criticidade típica |
|---|---|---|
| `nao_atende` | Empresa não cumpre o requisito | critica / alta |
| `parcial` | Atende parcialmente | media |
| `evidencia_insuficiente` | Resposta ambígua | media |
| `nao_aplicavel` | Requisito não se aplica ao perfil | baixa |
| `atende` | Conformidade confirmada | — |

**Vigência:** Todos os gaps da Onda 1 são vinculados à **LC 214/2025** (Reforma Tributária — IBS/CBS). A vigência da transição é 2026–2032, com confissão por inércia a partir de 2026-01-01 (Art. 45 §4º LC 214/2025).

---

## 4. Fluxo E2E — Rastreabilidade SOL-002 → Gap → Risco

### 4.1. Exemplo: SOL-002 respondida com "Não"

```
SOL-002: "Você apura IBS/CBS mensalmente?" → Resposta: "Não"
    │
    ▼ analyzeSolarisAnswers (server/lib/solaris-gap-analyzer.ts)
    │
    ├── gap_status: 'nao_atende'
    ├── criticidade: 'critica'
    ├── source: 'solaris'
    ├── source_reference: 'Art. 45 §4º LC 214/2025'
    └── descricao: "Confissão por inércia — não apura IBS/CBS mensalmente"
    │
    ▼ INSERT project_gaps_v3
    │
    ▼ riskEngine.deriveAndPersist (PENDENTE em produção)
    │
    ├── fonte_risco: 'solaris'   ← G11 (PR #267)
    ├── severidade: 'critica'
    └── descricao: "Risco de confissão por inércia — Art. 45 §4º LC 214/2025"
    │
    ▼ INSERT project_risks_v3
    │
    ▼ Badge "• Onda 1 — SOLARIS" em MatrizesV3.tsx  ← G15 (PR #269)
```

### 4.2. Regras de cnaeGroups

Quando o projeto não tem CNAE informado, o sistema retorna as 12 perguntas universais (SOL-001..012) sem personalização setorial. O comportamento atual **não alerta o usuário** sobre a ausência de personalização — pendência N-E para Sprint O.

---

## 5. ADRs Vinculados ao Fluxo

### ADR-0002 — Arquitetura das 3 Ondas de Perguntas

| Campo | Valor |
|---|---|
| **Status** | Aceito |
| **Data** | 2026-03-31 |
| **Issue** | [#192](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/192) |
| **PR** | [#269](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/269) |
| **Risk score** | HIGH |
| **Sprint** | N |

**Decisão:** Adicionar campo `fonte: z.enum(['regulatorio', 'solaris', 'ia_gen'])` ao `QuestionSchema`. Cada pergunta deve declarar sua onda de origem, garantindo rastreabilidade e cobertura do INV-005.

| Onda | Enum | Quem define | Badge |
|---|---|---|---|
| 1ª — Regulatório | `regulatorio` | Corpus RAG | 🔵 Onda 1 — Regulatório |
| 2ª — SOLARIS | `solaris` | Seeds SOL-001..012 | 🟢 Onda 2 — SOLARIS |
| 3ª — IA Generativa | `ia_gen` | Prompt LLM | 🟡 Onda 3 — IA Gen |

**Feature flag:** `g15-fonte-perguntas=true` (habilitada no PR #269).

**Rollback:** `ALTER TABLE solaris_questions DROP COLUMN fonte` — requer aprovação do P.O.

---

### ADR-010 — Arquitetura Canônica de Conteúdo para Confiabilidade 98%

| Campo | Valor |
|---|---|
| **Status** | Aprovado com ajustes obrigatórios |
| **Data** | 2026-03-23 |
| **Issue** | [#63](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/63) |
| **Sprint** | M / N |

**Decisão:** Adotar arquitetura de 6 engines sequenciais com contratos formais de entrada e saída. A cadeia `Requisito → Pergunta → Gap → Risco → Ação` é inviolável. Cada risco deve ter "fio condutor" até a lei e a resposta de origem.

**6 engines:**

| Engine | Input | Output | Status Sprint N |
|---|---|---|---|
| Requirement Engine | Perfil + CNAE | `requirements[]` | ✅ Implementado |
| Question Engine | `requirements[]` | `questions[]` com `fonte` | ✅ G15 (PR #269) |
| Gap Engine | Respostas + `questions[]` | `gaps[]` com `source` | ✅ G17 (PR #263) |
| Coverage Engine | `gaps[]` | Cobertura % | 🔴 Pendente |
| Risk Engine | `gaps[]` | `risks[]` com `fonte_risco` | ✅ G11 (PR #267) — não executado em prod |
| Action Engine | `risks[]` | `actions[]` | 🟡 Parcial |

---

## 6. Rastreabilidade Completa — Sprint N

### 6.1. Issues

| Issue | Título | Status | Labels |
|---|---|---|---|
| [#192](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/192) | G15 — Arquitetura 3 Ondas de perguntas | ✅ Fechada (mergeada PR #269) | `feat`, `sprint:N`, `priority:high` |
| [#187](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/187) | G11 — campo `fonte_risco` | ✅ Fechada (mergeada PR #267) | `feat`, `sprint:N` |
| [#259](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/259) | G17 — solaris_answers → gapEngine | ✅ Fechada (mergeada PR #263) | `feat`, `sprint:N`, `priority:p0` |
| [#63](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/63) | ADR-010 — Confiabilidade 98% | 🟡 Em andamento | `architecture`, `sprint:M` |

### 6.2. PRs Sprint N

| PR | Título | Merge | Arquivos | Risk |
|---|---|---|---|---|
| [#261](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/261) | fix(ci): npm → pnpm/action-setup@v4 | 2026-03-31 | 3 | low |
| [#262](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/262) | feat(g17): integrar solaris_answers ao gapEngine | 2026-03-31 | 5 | high |
| [#263](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/263) | fix(g17): extrair analyzeSolarisAnswers para server/lib | 2026-04-01 | 4 | medium |
| [#264](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/264) | docs(sprint-n): ESTADO-ATUAL v3.1 + CHANGELOG | 2026-04-01 | 2 | low |
| [#266](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/266) | chore(governance): Sistema de Qualidade v5.0 | 2026-04-01 | 9 | low |
| [#267](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/267) | feat(g11): campo fonte_risco em project_risks_v3 | 2026-04-01 | 4 | medium |
| [#268](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/268) | chore(governance): ESTADO-ATUAL v3.2 | 2026-04-01 | 1 | low |
| [#269](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/269) | feat(g15): ONDA_BADGE + feature flag + ADR-0002 | 2026-04-01 | 8 | high |
| [#270](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/270) | docs(sprint-n): 5 docs painel P.O. atualizados | 2026-04-01 | 5 | low |
| [#271](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/271) | fix(rag-cockpit): isError handler + Sprint N data | 2026-04-01 | 1 | low |

### 6.3. Migrations Sprint N

| Migration | Arquivo | Tabela | Coluna | Status |
|---|---|---|---|---|
| 0061 | `0061_g17_source_column.sql` | `project_gaps_v3` | `source VARCHAR(20) DEFAULT 'v1'` | ✅ Aplicada em prod |
| 0062 | `0062_g11_fonte_risco.sql` | `project_risks_v3` | `fonte_risco VARCHAR(20) DEFAULT 'v1'` | ✅ Aplicada em prod |
| 0063 | `0063_g15_fonte_perguntas.sql` | `solaris_questions` | `fonte VARCHAR(20) DEFAULT 'solaris'` | ✅ Já existia em prod (idempotente) |

### 6.4. Sprints anteriores — contexto

| Sprint | HEAD | Principais entregas |
|---|---|---|
| J | — | Seeds SOL-001..012, campo `fonte` em `solaris_questions` |
| K | — | QuestionSchema, INV-005, 5 testes G15 |
| M | `d65c8b5` | ADR-010, Shadow Mode, 107/107 testes, CI/CD fix npm→pnpm |
| **N** | **`8faaf42`** | **G17 (gaps SOLARIS), G11 (fonte_risco), G15 (ONDA_BADGE), Gates v5.0** |

---

## 7. CI/CD — Estado Atual e Correções Aplicadas (Sprint N)

### 7.1. Workflows ativos (10 total)

| Workflow | Arquivo | Status pós-Sprint N |
|---|---|---|
| CI/CD Pipeline | `ci.yml` | ✅ CORRIGIDO — version removida, testes reativados |
| Test Suite | `test-suite.yml` | ✅ CORRIGIDO — version removida |
| Validate Implementation (Q6/Q7/R9/R10) | `validate-implementation.yml` | ✅ PASS |
| PR Governance | `pr-governance.yml` | ✅ PASS |
| Structural Fix Gate | `structural-fix-gate.yml` | ✅ CORRIGIDO — version removida |
| Migration Guard | `migration-guard.yml` | ✅ PASS |
| RAG Impact Audit | `rag-impact-audit.yml` | ✅ PASS |
| RAG Quality Gate | `rag-quality-gate.yml` | ✅ PASS |
| Label Governance — 3 Ondas + RAG | `label-governance.yml` | ✅ PASS |
| pages-build-deployment | — | ✅ PASS |

### 7.2. Causa raiz das falhas (resolvida)

**Problema:** Conflito de versão do pnpm entre o workflow YAML e o `package.json`.

```
pnpm/action-setup@v4 → version: 10.4.1 (hardcoded no YAML)
package.json → packageManager: pnpm@10.4.1+sha512... (com hash)
→ ERR_PNPM_BAD_PM_VERSION
```

**Correção aplicada** (PR #272 — este PR):

| Arquivo | Linha | De | Para |
|---|---|---|---|
| `.github/workflows/ci.yml` | 29, 65, 90 | `version: 10.4.1` | *(removido — lê do package.json)* |
| `.github/workflows/ci.yml` | 15 | `if: false  # DESABILITADO` | *(removido — testes reativados)* |
| `.github/workflows/test-suite.yml` | 23 | `version: 10.4.1` | *(removido)* |
| `.github/workflows/structural-fix-gate.yml` | 148 | `version: 10.4.1` | *(removido)* |

---

## 8. Gates de Qualidade v5.0 — Q1 a Q7 + R9 + S6

Todo PR do Manus deve conter a declaração abaixo no body. PR sem declaração → BLOQUEADO pelo `validate-implementation.yml`.

```
## Auto-auditoria Q1–Q7 + observabilidade (Gate 2 v5.0)
Q1 — Tipos nulos:         [ OK | BLOQUEADO | N/A ] — [evidência]
Q2 — SQL DISTINCT TiDB:   [ OK | BLOQUEADO | N/A ] — [evidência]
Q3 — Filtros NULL/empty:  [ OK | BLOQUEADO | N/A ] — [evidência]
Q4 — Endpoint registrado: [ OK | BLOQUEADO | N/A ] — [evidência]
Q5 — Testes mínimos:      [ OK | BLOQUEADO | N/A ] — [N testes / casos cobertos]
Q6 — Retorno explícito:   [ OK | BLOQUEADO | N/A ] — [evidência]
Q7 — Driver consistente:  [ OK | BLOQUEADO | N/A ] — [Opção A/B/C]
R9 — Evento estruturado:  [ OK | BLOQUEADO | N/A ] — [evento emitido]
S6 — Rollback SQL:        [ OK | BLOQUEADO | N/A ] — [SQL de reversão]
Risk score: [ low | medium | high | critical ]
Resultado: [ APTO PARA COMMIT | BLOQUEADO ]
```

**Padrões recorrentes de falha (Passo 0):**

| Sintoma | Padrão | Gate |
|---|---|---|
| Lista retorna 0 após upsert OK | `vigencia_inicio = ''` em vez de `NULL` | Q1 |
| TiDB: "Incorrect arguments to LIMIT" | `LIMIT ?` via `conn.execute()` | Q2 |
| TiDB: ORDER BY inválido | `SELECT DISTINCT` com ORDER BY fora do SELECT | Q2 |
| Endpoint 404 | Router não registrado em `server/routers.ts` | Q4 |
| UI mostra vazio sem erro | `isError` tratado igual a lista vazia | Q5 |
| INSERT silencioso (0 rows) | `Promise<void>` sem retorno verificável | Q6 |
| Mistura de drivers | Drizzle + raw mysql2 no mesmo arquivo | Q7 |
| Sem rastreabilidade de evento | Ausência de `{ event, projectId }` no log | R9 |

---

## 9. Pendências Abertas — Sprint O

| # | Item | Track | Prioridade | Status |
|---|---|---|---|---|
| O-A | Reconciliar `drizzle/meta/_journal.json` (61 entradas vs. 63 migrations) | DB | 🔴 P0 | Pronto para PR |
| O-B | Executar `riskEngine.deriveAndPersist` para projetos 2310001, 2370001, 2370002 | Pipeline | 🔴 P0 | Aguarda O-A |
| O-C | Alerta automático para INSERT silencioso em `project_gaps_v3` | Observabilidade | 🟡 P1 | Ação preventiva post-mortem G17 |
| O-D | Banner de aviso quando `cnaeGroups` estiver vazio | UX | 🟡 P1 | Aguarda Gate de Spec |
| O-E | Confirmar `LC 224/2026` → `LC 214/2025` no CSV 1 (Dr. Rodrigues) | Corpus | 🟡 P1 | Aguarda P.O. |
| O-F | Upload dos 2 CSVs (24 perguntas) via `ragAdmin.uploadCsv` | Corpus | 🟡 P1 | Após O-E |
| O-G | Coverage Engine (ADR-010 — 6ª engine) | Arquitetura | 🟢 P2 | Sessão de planejamento necessária |

---

## 10. DORA Metrics — Sprint N

| Métrica | Sprint N | Meta Sprint O |
|---|---|---|
| Deployment Frequency | 10 PRs / ~2 dias | ≥ 8 PRs/sprint |
| Lead Time for Changes | ~2h (docs) / ~6h (feat) | < 4h média |
| Change Failure Rate | ~15% (2/13 PRs com retrabalho) | < 10% |
| MTTR | ~4h (incidente G17 — P1) | < 2h para P1 |

---

## 11. Bloqueios Permanentes

Os seguintes bloqueios nunca podem ser violados sem aprovação explícita do P.O.:

1. **DIAGNOSTIC_READ_MODE=new** — nunca ativar sem aprovação
2. **F-04 Fase 3** — nunca executar sem aprovação
3. **DROP COLUMN** — nunca executar sem aprovação
4. **Todo PR** — deve ter template Q1–Q7+R9+S6 preenchido com JSON de evidência
5. **Apenas arquivos do escopo declarado** — nenhum arquivo fora do escopo pode ser alterado

---

*Documento gerado pelo Manus AI em 2026-04-01.*
*Unifica: Análise Onda 1 · ADR-0002 · ADR-010 · Rastreabilidade Sprint N · CI/CD · Gates v5.0 · Pendências Sprint O.*
*Fonte da verdade: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
