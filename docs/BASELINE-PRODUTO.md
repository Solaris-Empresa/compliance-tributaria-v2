# BASELINE-PRODUTO.md

**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 2.2 — 2026-03-27
> **Commit HEAD:** `d166fd3` (branch `main`)
> **Checkpoint Manus:** `5f7a3297`
> **Servidor de produção:** https://iasolaris.manus.space
> **Repositório GitHub:** https://github.com/Solaris-Empresa/compliance-tributaria-v2
> **Documento vivo:** este arquivo é a fonte de verdade do estado do produto. Deve ser atualizado a cada sprint concluída, a cada decisão arquitetural relevante e a cada mudança de estado das issues ou bloqueios.
> **Audiência:** P.O. · Equipe de Engenharia · Equipe Jurídica (UAT)

---

## Como usar este documento

Este é o **único baseline do produto**. Não existe versão em `.docx` — o GitHub é o repositório oficial. Para consultar o estado atual da plataforma, leia este arquivo. Para registrar uma mudança de estado, abra um PR que atualize este arquivo junto com o código correspondente.

**Regra de atualização:** toda sprint concluída deve gerar um commit que atualize pelo menos as seções 1 (Indicadores Técnicos), 2 (Métricas), 5 (Issues) e 10 (Próximos Passos). As demais seções são atualizadas quando há mudança real de arquitetura, stack ou decisões.

---

## 1. Indicadores Técnicos

| Indicador | Valor atual | Status |
|---|---|---|
| TypeScript | 0 erros (`npx tsc --noEmit`) | ✅ |
| Testes automatizados — total | **517 testes passando** (baseline Sprint A-J) + **24 novos** (K-1: 12 + K-2: 12) = **541 testes** | ✅ |
| Cobertura de suítes | PCT v1 (117) · PCT v2 (81) · E2E Fase 2 (132) · BUG-001 (33) · INV-606/607/608 (47) · Sprint B (9) · Sprint C (15) · Sprint D (55) · Sprint E (20) · **K-1 (12) · K-2 (12)** | ✅ |
| Git working tree | Limpo — sem arquivos pendentes | ✅ |
| Servidor de desenvolvimento | Rodando na porta 3000 | ✅ |
| Banco de dados | Conectado (TiDB Cloud — us-east-1) | ✅ |
| Migrations aplicadas | **57** (última: `0057_odd_ink.sql` — `solaris_questions` aplicada em produção via `db:push`) | ✅ |
| ADRs formais | **11** (ADR-001 a ADR-011; ADR-004 rejeitado; ADR-011 = Onda 1 SOLARIS) | ✅ |
| Decisões Arquiteturais de Prefill | **4** (DA-1 a DA-4) | ✅ |
| Invariants do sistema | **8** (INV-001 a INV-008) com testes de regressão | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (ativo em produção — **NÃO alterar sem aprovação P.O.**) | ✅ |
| Corpus RAG | **2.078 chunks — 100% com anchor_id** (lc214: 1.598 · lc227: 434 · lc224: 28 · ec132: 18) | ✅ |
| Tabela `solaris_questions` | **12 questões ativas** (SOL-001..SOL-012 — Onda 1 SOLARIS) | ✅ |
| RAG Cockpit | Endpoint `ragInventory.getSnapshot` ao vivo · 9 gold set queries | ✅ |
| Sprint K | **K-1 ✅ · K-2 ✅ · K-3 ✅** — 3 de 4 issues fechadas | 🟡 |
| Agent Skills | Manus `/solaris-orquestracao` ✅ · Claude `solaris-contexto` ✅ | ✅ |
| db:push guard | Bloqueado em production — `scripts/db-push-guard.mjs` | ✅ |
| Erros watcher TypeScript | 4 erros falso-positivo (cache desatualizado) — `npx tsc --noEmit` = 0 erros reais | ⚠️ |

> **Nota sobre erros do watcher:** O watcher do dev server reporta 4 erros de `solarisQuestions` não encontrado em `server/db.ts` e `server/routers/onda1Injector.ts`. Esses erros são **falso positivo de cache** — o `npx tsc --noEmit` real retorna exit code 0. O servidor compilado (`dist/index.js`) tem todos os módulos corretos. Será corrigido em K-4-A com a sincronização do schema.

---

## 2. Métricas do Produto (produção — 2026-03-27)

| Métrica | Valor |
|---|---|
| Total de usuários cadastrados | **3.898** |
| Chunks RAG no banco | **2.078** — 100% com anchor_id canônico (DEC-002) |
| Questões SOLARIS Onda 1 | **12** (SOL-001..SOL-012, `ativo=1`, `fonte='solaris'`) |
| Tabelas no banco de produção | **88** |
| Migrations aplicadas | **57** |

---

## 3. Arquitetura — Fluxo 3 Ondas (TO-BE)

> **Documento de referência:** `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` (v1.1 — 619 linhas)

### Diagnóstico crítico identificado em 2026-03-27

Existem **dois fluxos paralelos** no sistema. O P.O. usa o Fluxo A; K-2 e K-3 foram implementados no Fluxo B. K-4 corrigirá essa divergência.

| Fluxo | Rota | Quem usa | Ondas implementadas |
|---|---|---|---|
| **Fluxo A** (caminho real) | QC → QO → QCNAE → Briefing | P.O. e advogados | ❌ Nenhuma ainda |
| **Fluxo B** (legado) | QuestionarioV3 → Briefing | Legado/alternativo | ✅ Onda 1 (K-2) + badges (K-3) |

### TO-BE aprovado pelo P.O.

```
[Onda 1 — SOLARIS] → [Onda 2 — IA Gen] → [QC] → [QO] → [QCNAE] → [Briefing] → [Matrizes] → [Plano]
```

DiagnosticoStepper expandido de 3 para **8 etapas**.

---

## 4. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Tailwind 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 |
| Banco de dados | TiDB Cloud (MySQL compatível) |
| ORM | Drizzle ORM |
| Testes | Vitest |
| Package manager | pnpm |
| Deploy | Manus (iasolaris.manus.space) |
| Repositório | GitHub (Solaris-Empresa/compliance-tributaria-v2) |

---

## 5. Estado das Issues (2026-03-27)

### Issues abertas — 19 total

| Milestone | Qtd | Issues |
|---|---|---|
| **M2 — Sprint K** | 5 | #169 (K-4 Validação P.O.) · #167 · #165 · #164 · #156 (K-4) |
| **M3 — Sprint L** | 5 | #170 (L-1 Validação P.O.) · #166 · #158 · #157 · #152 (E6) |
| **M4 — Débitos/Governança** | 9 | #128 · #101 · #99 · #62 · #61 · #60 · #58 · #57 · #56 |

### Issues fechadas nesta sessão (2026-03-27)

| Issue | Título | PR |
|---|---|---|
| #153 | K-1: Tabela `solaris_questions` | #159 |
| #154 | K-2: Pipeline Onda 1 no questionEngine | #162 |
| #155 | K-3: Badge visual por onda | #171 |
| #168 | K-3 Validação P.O. — aprovada | — |

### Milestones fechados (orphãos 0/0)

Fechados em 2026-03-27: M#3 (F-04 Separação Física), M#4 (Validação Final), M#5 (UX Final), M#6 (Go Live).

---

## 6. PRs mergeados — histórico recente

| PR | Título | Commit | Data |
|---|---|---|---|
| #159 | feat(k1): tabela `solaris_questions` | `5e583f6` | 2026-03-27 |
| #160 | docs(governança): Tabela Planejamento Macro/Micro v1.0 | `80efc8c` | 2026-03-27 |
| #162 | feat(k2): integrar Onda 1 (SOLARIS) no questionEngine | `75627e6` | 2026-03-27 |
| #163 | feat(admin): Taskboard P.O. ao vivo — /admin/taskboard | `5a7b69d` | 2026-03-27 |
| #171 | feat(k3): badge visual por onda + seed SOL-001..012 | `38a2980` | 2026-03-27 |
| #172 | feat(admin): taskboard-po — página estática permanente | `2408271` | 2026-03-27 |
| #174 | docs(arquitetura): FLUXO-3-ONDAS v1.1 — contrato de implementação | `d166fd3` | 2026-03-27 |

---

## 7. Milestones ativos

| Milestone | Issues abertas | Issues fechadas | Progresso |
|---|---|---|---|
| **M2 — Sprint K: Questionário 3 Ondas** | 5 | 4 | ~44% |
| **M3 — Sprint L: Upload CSV SOLARIS** | 5 | 0 | 0% |
| **M4 — Débitos Técnicos e Governança** | 9 | 1 | 10% |
| F-03 (histórico) | 0 | 2 | 100% |
| Sprint-98 (histórico) | 0 | 37 | 100% |
| v6.0 (histórico) | 0 | 19 | 100% |

---

## 8. Tabela `solaris_questions` — Seed atual

| ID | Código | Categoria | CNAE Groups | Obrigatório |
|---|---|---|---|---|
| 1 | SOL-001 | regime_tributario | null (universal) | Sim |
| 2 | SOL-002 | regime_tributario | null | Sim |
| 3 | SOL-003 | porte_empresa | null | Sim |
| 4 | SOL-004 | porte_empresa | null | Sim |
| 5 | SOL-005 | operacoes | null | Sim |
| 6 | SOL-006 | operacoes | null | Sim |
| 7 | SOL-007 | exportacao | null | Não |
| 8 | SOL-008 | exportacao | null | Não |
| 9 | SOL-009 | simples_nacional | null | Não |
| 10 | SOL-010 | simples_nacional | null | Não |
| 11 | SOL-011 | lucro_real | null | Não |
| 12 | SOL-012 | lucro_real | null | Não |

> **Nota:** `cnae_groups = null` = pergunta universal (aparece para todos os CNAEs). O campo `codigo` (SOL-001..SOL-012) ainda não existe na tabela — será adicionado em K-4-A.

---

## 9. Bloqueios ativos — NÃO executar sem aprovação do P.O.

- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3
- ❌ NÃO executar DROP COLUMN nas colunas legadas
- ❌ NÃO mergear K-4 sem aprovação do P.O. (label `p.o.-valida`)

---

## 10. Próximos Passos — Sprint K (restante) e Sprint L

### K-4 — Onda 2 combinatória (aguarda aprovação P.O.)

K-4 implementa a Onda 2 (IA Generativa) e a integração das Ondas 1+2 no Fluxo A (caminho real do P.O.). Requer merge do PR #174 (FLUXO-3-ONDAS v1.1) antes de iniciar.

**K-4-A** (sem aprovação P.O.):
- Adicionar coluna `codigo` à tabela `solaris_questions`
- Criar tabelas `solaris_answers` e `iagen_answers`
- Estender `flowStateMachine.ts` com `VALID_TRANSITIONS` e `assertValidTransition`

**K-4-B a K-4-D** (requerem aprovação P.O.):
- Integrar Ondas 1+2 no DiagnosticoStepper (Fluxo A)
- Implementar geração IA da Onda 2 com fallback hardcoded
- Badge visual no Fluxo A

### Sprint L — Upload CSV SOLARIS

- L-1: Tela de upload CSV para questões SOLARIS (aguarda validação P.O. — issue #170)
- L-2: Pipeline de processamento e persistência do CSV

---

## 11. Gaps RAG — estado atual

| Gap | Descrição | Status |
|---|---|---|
| G1 | Label lc224 no formatContextText | ✅ PR #105 |
| G2 | Label lc227 ano errado (2024→2026) | ✅ PR #105 |
| G3 | EC 132/2023 — 18 chunks canônicos | ✅ PR #109 |
| G4 | Anexos LC 214/2025 (I–XVII) no corpus | ✅ PR #109 |
| G5 | Art. 45 tópicos — confissão de dívida | ✅ PR #105 |
| G6 | LC 224 cnaeGroups — cobertura universal | ✅ PR #105 |
| G7 | 1 RAG compartilhado para 4 áreas | ✅ PR #106 |
| G8 | companyProfile não injetado no briefing | ✅ PR #106 |
| G9 | Schema Zod para outputs do pipeline RAG | ✅ PR #108 |
| G10 | Campo fonte_risco nas matrizes de risco | ✅ PR #108 |
| G11 | Fundamentação auditável por item de risco | ✅ PR #110 |
| G12 | fonte_acao no plano de ação | ✅ PR #113 |
| G13 | fonte_dispositivo nos questionários | 🔜 Sprint futura |

---

## 12. Decisões resolvidas

| Decisão | Descrição | Status |
|---|---|---|
| DEC-002 | anchor_id VARCHAR(255) UNIQUE + campos de auditoria | ✅ PR #109 |
| DEC-003 | chunk por NCM/item para Anexos | ✅ PR #109 |
| DEC-004 | log de auditoria sem gate manual | ✅ PR #108 |
| DEC-005 | Sprint 98% B2 Opção A bridge | ✅ |
| **DEC-006** | **Fluxo B (QuestionarioV3) = LEGACY — não expandir** | ✅ 2026-03-27 |
| **DEC-007** | **Tabelas separadas para Onda 1 e Onda 2 (não JSON)** | ✅ 2026-03-27 |
| **DEC-008** | **`status` = fonte de verdade; `currentStep` depreciado** | ✅ 2026-03-27 |
| **DEC-009** | **DiagnosticoStepper expandido para 8 etapas no TO-BE** | ✅ 2026-03-27 |
