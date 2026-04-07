# Baseline do Produto — Plataforma de Compliance da Reforma Tributária

**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 4.4 — 2026-04-06 (Sprint M3 UAT — PRs #362–#365)
> **Commit HEAD:** `d820163` (pós-PR #365)
> **Checkpoint Manus:** `cdb4e22e`
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
| TypeScript | **0 erros** | ✅ |
| Testes automatizados — total | **4.064+ passando** (151 arquivos · +15 E2E Sprint M3 UAT) | ✅ |
| Git working tree | Limpo — `main` = `d820163`, sincronizado com GitHub externo | ✅ |
| Sprint K+ | Cockpit P.O. v2.0 (C1–C5+I1–I4) — PR #197 mergeado | ✅ |
| Sprint K++ | Cockpit fetch dinâmico (#199) + Seção 4 (#200) + 10 docs (#202) | ✅ |
| Sprint S | Lotes A+B+C+D+E + Fix #295 — ENCERRADA 2026-04-04 | ✅ |
| **Sprint T / Milestone 1** | **Decision Kernel: ncm-engine + nbs-engine + engine-gap-analyzer. 5/6 casos validados. Gate triplo aprovado. PRs #302–#316 — ENCERRADO 2026-04-05** | **✅** |
| **Sprint Y** | **BL-01 a BL-05 ✅ · M2.1 ✅ #354 · M3 Fase 1 ✅ #357 · PRs #354–#359** | **✅ ENCERRADA** |
| **Sprint M3 UAT** | **BUG-UAT-08 ✅ #362 · E2E 15 casos ✅ #364 · BUG-UAT-09+PDF-01 ✅ #365** | **🔄 EM ANDAMENTO** |
| Servidor de desenvolvimento | Rodando na porta 3000 | ✅ |
| Banco de dados | Conectado (TiDB Cloud — us-east-1) | ✅ |
| Migrations aplicadas | **62** | ✅ |
| PRs mergeados (total) | **365** | ✅ |
| UAT E2E | ✅ COMPLETO — projeto 2851328 (2026-04-06) | ✅ |
| Suite E2E automatizada | 15 casos (cnaes_confirmados → aprovado) | ✅ |
| BUG-UAT-08 | ✅ CORRIGIDO (PR #362) | ✅ |
| BUG-UAT-09 | ✅ CORRIGIDO (PR #365) | ✅ |
| BUG-UAT-PDF-01 | ✅ CORRIGIDO (PR #365) | ✅ |
| ADRs formais | **11** (ADR-001 a ADR-010; ADR-004 rejeitado; DEC-013/014 Bloco C/D) | ✅ |
| Decisões Arquiteturais de Prefill | **4** (DA-1 a DA-4) | ✅ |
| Invariants do sistema | **8** (INV-001 a INV-008) com testes de regressão | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (ativo em produção) | ✅ |
| Corpus RAG | **2.509 chunks — 10 leis — 100% com anchor_id** | ✅ |
| Perguntas SOLARIS ativas | **24 (SOL-013..036)** | ✅ |
| RAG Cockpit | Endpoint `ragInventory.getSnapshot` ao vivo · 9 gold set queries | ✅ |
| Agent Skills | Manus `/solaris-orquestracao` v3.1 ✅ · Claude `solaris-contexto` v4.2 ✅ | ✅ |
| Decision Kernel | `ncm-engine.ts` + `nbs-engine.ts` + `engine-gap-analyzer.ts` — source='engine' ativo | ✅ |
| CI Workflows | **12 ativos** (branch-scope, file-declaration, autoaudit + 9 pré-existentes) | ✅ |
| CODEOWNERS | 15 entradas (`@utapajos` em arquivos críticos) | ✅ |
| db:push guard | Bloqueado em production — `scripts/db-push-guard.mjs` | ✅ |
| Pipeline E2E | T1 ✅ T2 ✅ validados em produção | ✅ |

---

## 2. Métricas do Produto (produção — 2026-03-28)

| Métrica | Valor |
|---|---|
| Total de projetos | **8.812** (produção — 2026-04-04) |
| Projetos em andamento | **154** |
| Projetos aprovados | **7** |
| Chunks RAG no banco | **2.509** — 100% com anchor_id canônico (DEC-002) |
| Perguntas SOLARIS ativas | **24** — SOL-013..SOL-036 com `codigo` populado |
| Gaps engine (source='engine') | Ativo em `project_gaps_v3` — 5/6 casos NCM/NBS confirmados |
| Respostas Onda 1 (`solaris_answers`) | Tabela ativa — T1 validado (projeto 2490006) |
| Respostas Onda 2 (`iagen_answers`) | Tabela ativa — T1 validado: `source='iagen' | gaps=3` |
| Projetos legados removidos | **1.705** (hard delete cascade Sprint S Lote C) |

> **Nota:** O banco foi limpo intencionalmente em 2026-03-24 para garantir ambiente neutro no UAT com advogados. Os dados históricos (1.847 projetos, 1.364 usuários) existiam até 2026-03-23 e estão documentados no histórico de commits.

---

## 3. Arquitetura da Plataforma

### 3.1 Visão Geral

A plataforma é uma aplicação web full-stack construída sobre **React 19 + Tailwind 4** (frontend) e **Express 4 + tRPC 11** (backend), com banco de dados **MySQL/TiDB Cloud** gerenciado via **Drizzle ORM**. A autenticação é delegada ao **Manus OAuth**, e toda a comunicação frontend-backend ocorre exclusivamente via procedimentos tRPC tipados — sem endpoints REST ad hoc.

### 3.2 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + Tailwind CSS | 19 / 4 |
| Roteamento client-side | Wouter | — |
| Backend | Express + tRPC | 4 / 11 |
| ORM | Drizzle ORM | — |
| Banco de dados | MySQL / TiDB Cloud | — |
| Autenticação | Manus OAuth | — |
| IA / LLM | Manus Built-in Forge API | — |
| Embeddings / RAG | TiDB Vector Search | — |
| WebSocket | Socket.IO | — |
| Serialização | SuperJSON | — |
| Testes | Vitest | — |
| Deploy | Manus Hosting | — |
| CI/CD | GitHub Actions — 4 checks obrigatórios no ruleset: `Validate PR body`, `Guard critical`, `Migration discipline`, `Governance gate` | — |

### 3.3 Fluxos de Diagnóstico

O sistema suporta dois fluxos de diagnóstico paralelos, fisicamente isolados:

**Fluxo V1 (legado):** Diagnóstico em 3 camadas — Corporativo (`corporateAnswers`), Operacional (`operationalAnswers`) e CNAE (`cnaeAnswers`). Produz briefing, matrizes de risco e plano de ação armazenados nas colunas legadas.

**Fluxo V3 (atual):** Diagnóstico baseado em questionário CNAE inteligente (`questionnaireAnswers`). Usa o mesmo conjunto de colunas legadas para armazenamento, com separação lógica garantida pelo adaptador `getDiagnosticSource()`. A F-04 (parcialmente concluída) criou colunas físicas separadas (`briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`) — a leitura dessas colunas está bloqueada até aprovação pós-UAT.

**Fluxo 3 Ondas (Sprint K — em implementação):** Novo fluxo sequencial de 8 etapas definido no contrato `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md v1.1`. As Ondas 1 e 2 precedem o diagnóstico tradicional, coletando dados jurídicos (equipe SOLARIS) e de IA generativa antes das camadas Corporativo/Operacional/CNAE. Detalhes na Seção 3.9.

### 3.4 Arquitetura de Prefill (Sub-Sprint concluída em 2026-03-24)

O sistema de prefill inteligente elimina a repetição de perguntas já respondidas no perfil inicial da empresa. É composto por 4 Decisões Arquiteturais (DA):

| DA | Descrição | Arquivo |
|---|---|---|
| **DA-1** | Path canônico em `shared/questionario-prefill.ts` com builders completos e `PrefillTrace` | `client/src/shared/questionario-prefill.ts` |
| **DA-2** | API normalizada com `normalizeProject()` — JSON nunca chega como string ao frontend | `server/routes/projects.ts` |
| **DA-3** | Lógica local eliminada — todos os questionários usam builders compartilhados | QC, QO, QCNAE |
| **DA-4** | Contrato explícito — campos não coletados no perfil não são forçados nos builders | `shared/questionario-prefill.ts` |

**Questionários cobertos pelo prefill:**

| Questionário | Seções | Campos | Builders |
|---|---|---|---|
| Corporativo (QC) | QC-01 a QC-07 | 28 campos | `buildCorporatePrefill()` |
| Operacional (QO) | QO-01 a QO-03 | 15 campos | `buildOperationalPrefill()` |
| CNAE (QCNAE) | QCNAE-01 | 5 campos | `buildCNAEPrefill()` |

### 3.5 Ponto Único de Leitura — `getDiagnosticSource()`

O adaptador centralizado `server/diagnostic-source.ts` é o **único ponto de leitura** de dados de diagnóstico em toda a aplicação. Antes da F-01, havia 93 leituras diretas espalhadas pelo código — todas foram eliminadas. Ele determina o `flowVersion` (v1 / v3 / hybrid / none) e retorna dados isolados por versão.

### 3.6 Shadow Mode (ADR-009)

O Shadow Mode é controlado pela variável de ambiente `DIAGNOSTIC_READ_MODE`:

| Valor | Comportamento |
|---|---|
| `legacy` | Lê apenas colunas legadas (padrão histórico) |
| `shadow` | Lê legadas + compara com novas em background, loga divergências, **retorna legadas** (**ativo em produção**) |
| `new` | Lê apenas novas colunas V1/V3 (**bloqueado** até validação pós-UAT) |

O módulo Shadow Mode é composto por 5 arquivos em `server/diagnostic-shadow/`: `types.ts`, `utils.ts`, `readers.ts`, `logger.ts`, `shadow.ts`. O logger persiste divergências na tabela `diagnostic_shadow_divergences` e dispara `notifyOwner()` automaticamente para divergências críticas.

### 3.7 Gate de Retrocesso (F-03 / ADR-007)

Toda transição de retrocesso de etapa passa pelo gate `server/retrocesso-cleanup.ts`, que limpa os dados da etapa abandonada antes de permitir o retrocesso. O frontend exibe o `RetrocessoConfirmModal` antes de confirmar a operação.

### 3.8 Governança Permanente (implantada em 2026-03-24)

| Artefato | Localização | Descrição |
|---|---|---|
| Issue Template estrutural | `.github/ISSUE_TEMPLATE/structural-fix.md` | Obrigatório para issues de correção estrutural |
| PR Template estrutural | `.github/PULL_REQUEST_TEMPLATE/structural-pr.md` | Obrigatório para PRs de correção estrutural |
| CI Bloqueante | `.github/workflows/structural-fix-gate.yml` | 5 jobs: TypeScript, testes, invariants, prefill-contract, governance-check |
| Labels GitHub | 5 labels obrigatórias | `structural-fix`, `bug`, `governance`, `prefill`, `uat` |
| Invariant Registry | `docs/invariants/` | INV-001 a INV-008 com testes de regressão |
| Modelo Operacional | `docs/MODELO-OPERACIONAL.md` | Papéis e protocolo: P.O., Orquestrador, Implementador, Consultor |
| Definition of Done | `docs/DEFINITION-OF-DONE.md` | DoD formal por tipo de entrega (feature, bugfix, migration, docs, CI) |
| PR Governance CI | `.github/workflows/pr-governance.yml` | Validação automática de PR body + file guard em todos os PRs |
| Test Suite CI | `.github/workflows/test-suite.yml` | TypeScript + Vitest em todo PR (pnpm) |
| Migration Guard CI | `.github/workflows/migration-guard.yml` | Disciplina obrigatória em migrations |

### 3.9 Arquitetura 3 Ondas — Sprint K (novo)

O contrato `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md v1.1` (PR #174, mergeado em 2026-03-28) define o novo fluxo sequencial de 8 etapas que substitui o `DiagnosticoStepper` de 3 etapas:

| Etapa | Nome | Tabela de persistência | Status |
|---|---|---|---|
| 1 | Onda 1 — Questionário SOLARIS | `solaris_answers` | ✅ K-4-A + K-4-B |
| 2 | Onda 2 — Questionário IA Generativa | `iagen_answers` | 🔜 K-4-C |
| 3 | Corporativo | `corporateAnswers` | ✅ Existente |
| 4 | Operacional | `operationalAnswers` | ✅ Existente |
| 5 | CNAE | `cnaeAnswers` | ✅ Existente |
| 6 | Briefing | `briefingContentV3` | ✅ Existente |
| 7 | Matrizes | `riskMatricesDataV3` | ✅ Existente |
| 8 | Plano | `actionPlansDataV3` | ✅ Existente |

**State Machine (`server/flowStateMachine.ts`):** `VALID_TRANSITIONS` e `assertValidTransition` adicionados em K-4-A. Enforcement integrado em `completeOnda1` (K-4-B). Transição canônica: `rascunho → onda1_solaris → onda2_iagen → diagnostico_corporativo → ...`

**BUG-UAT-08 (PR #362):** `VALID_TRANSITIONS` universalizado + `assertValidTransition` aplicado em todos os handlers do fluxo (`completeOnda1`, `completeOnda2`, `completeDiagnosticLayer`, `approveBriefing`, `approveMatrices`, `approveActionPlan`).

**BUG-UAT-09 (PR #365):** `approveBriefing` corrigido para transição atômica `diagnostico_cnae → briefing → matriz_riscos` (2 asserts + 1 `db.update`). DEC-M3-05 aprovada pelo Orquestrador.

---

## 4. Decisões Arquiteturais (ADRs)

| ADR | Título | Status |
|---|---|---|
| ADR-001 | Arquitetura do diagnóstico — fluxos V1 e V3 | ✅ Aprovado |
| ADR-002 | Plano de implementação com rollback | ✅ Aprovado |
| ADR-003 | Exaustão de riscos — gap → risco determinístico | ✅ Aprovado |
| ADR-004 | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| ADR-005 | Isolamento físico do diagnóstico — `getDiagnosticSource()` | ✅ Aprovado |
| ADR-006 | Relatório de validação prática do ADR-005 | ✅ Aprovado |
| ADR-007 | Gate de limpeza no retrocesso | ✅ Aprovado |
| ADR-008 | Estratégia de migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| ADR-009 | Shadow Mode — comparação background V1/V3 | ✅ Implementado |
| ADR-010 | Arquitetura Canônica de Conteúdo Diagnóstico — 6 engines + contratos I/O | ✅ Aprovado |

---

## 5. Issues — Estado Atual

### Milestone M2 — Sprint K

| Issue | Título | Status | Commit/PR |
|---|---|---|---|
| #153 | K-1: Tabela `solaris_questions` + seed 12 perguntas | ✅ Fechada | PR K-1 |
| #154 | K-2: Tabela `iagen_questions` + seed | ✅ Fechada | PR K-2 |
| #155 | K-3: Badge visual por onda | ✅ Fechada | PR K-3 |
| #156 | K-4: Schema + State Machine + Onda 1 | ✅ Fechada | `d370932` · tag `k4-a-complete` |
| #165 | K-4 Validação P.O. — Onda 2 combinatória | ⏳ Aberta | Aguarda K-4-C |
| #168 | K-3 Validação P.O. — Badge visual | ✅ Fechada | — |
| #169 | K-4 Validação P.O. — Onda 2 combinatória | ⏳ Aberta | Aguarda K-4-C |

**Milestone M2 — Sprint K:** 8 fechadas / 4 abertas = **67%**

### Issues Bloqueadas (aguardam UAT)

| Issue | Título | Bloqueio |
|---|---|---|
| [#56](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/56) | F-04 completa (Fases 3+4) | Aguarda 48-72h de observação pós-UAT |
| [#61](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/61) | Promover para modo `new` | Aguarda #56 |
| [#62](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/62) | DROP COLUMN legadas | Aguarda #61 |

### Issues Em Andamento / Aguardando

| Issue | Título | Estado |
|---|---|---|
| [#57](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/57) | Validação E2E completa | ⏳ Aguardando UAT |
| [#58](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/58) | Refinamento UX final | ⏳ Aguardando feedback UAT |
| [#60](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/60) | Shadow Mode — monitoramento contínuo | 🔄 Em andamento |
| [#101](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/101) | 123 testes legados com fetch real sem mock no CI | ⚠️ Débito ativo |

### PRs Abertos

Nenhum PR aberto no momento. Sprint T / Milestone 1 encerrado em 2026-04-05.

---

## 6. Erros Conhecidos Ativos

Os erros abaixo estão catalogados em [`docs/ERROS-CONHECIDOS.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) com runbooks de incidente.

| Código | Descrição | Solução paliativa |
|---|---|---|
| **ERR-006** | Descoberta de CNAEs falha se `OPENAI_API_KEY` inválida (HTTP 401) | Reconfigurar chave via `webdev_request_secrets` com `preventMatching: true` |
| **ERR-009** | Projetos criados antes de 2026-03-24 não têm `isEconomicGroup`/`taxCentralization` | Script de migração (ver próximos passos) |
| **ERR-010** | Sobreposição QC-07/QO-03 (meios de pagamento) — pergunta duplicada | **DECISÃO-001 tomada:** Opção A (prefill cruzado) — executar pós-UAT |
| **ERR-LSP** | Watcher Manus reporta 8 erros TS (`solarisQuestions not exported`) | Artefato do watcher — `npx tsc --noEmit` confirma 0 erros reais |

---

## 7. Decisões Pendentes do P.O.

| Código | Decisão | Opções | Impacto |
|---|---|---|---|
| ~~**DECISÃO-001**~~ | ~~Como tratar sobreposição QC-07/QO-03 (meios de pagamento)~~ | **✅ DECIDIDO 2026-03-24 — Opção A (prefill cruzado), executar pós-UAT.** |
| ~~**DEC-002**~~ | ~~Schema CSV SOLARIS — campos de rastreabilidade~~ | **✅ DECIDIDO** — anchor_id VARCHAR(255) UNIQUE + campos de auditoria. |
| ~~**DEC-003**~~ | ~~Estratégia ingestão Anexos LC 214~~ | **✅ DECIDIDO** — chunk por NCM/item. |
| ~~**DEC-004**~~ | ~~Gate de revisão CSV SOLARIS~~ | **✅ DECIDIDO** — publicação direta com log de auditoria. |

---

## 8. Fases do Projeto — Histórico Completo

| Fase | Descrição | Status | Commit |
|---|---|---|---|
| **F-01** | Adaptador centralizado `getDiagnosticSource()` | ✅ Concluída | `61d40966` |
| **F-02A–D** | Migração de todos os routers para `getDiagnosticSource()` | ✅ Concluída | `1cbe8f76` |
| **F-03** | Gate de limpeza no retrocesso + modal de confirmação | ✅ Concluída | `6590be3c` |
| **F-04 Fase 1** | ADD COLUMN — 6 novas colunas V1/V3 criadas no banco | ✅ Concluída | `63a19f5` |
| **F-04 Fase 2** | Cópia de dados legados para colunas V1/V3 | ✅ Concluída | `63a19f5` |
| **F-04 Fase 3** | Alterar leitura para novas colunas | 🔒 **Bloqueada** — aguarda UAT + 48-72h |
| **F-04 Fase 4** | DROP COLUMN das colunas legadas | 🔒 **Bloqueada** — aguarda Fase 3 |
| **ADR-009** | Shadow Mode | ✅ Concluída | `eb657d3` |
| **Sub-Sprint Prefill** | Sistema de prefill estrutural (DA-1 a DA-4) | ✅ Concluída | `9e25ead` |
| **Sprint A–E (RAG)** | G1–G12: corpus, retrieval, fundamentação auditável | ✅ Concluída | PRs #105–#110 |
| **Sprint 98% B0–B2** | Governança, ADR-010, GATE-CHECKLIST, Skills | ✅ Concluída | PRs #111–#115 |
| **Sprint G–I** | Corpus complementar, RAG Cockpit ao vivo, DT-01 | ✅ Concluída | PRs #129–#141 |
| **Sprint J** | G15 `fonte`/`requirement_id`/`source_reference` | ✅ Concluída | PR #142 |
| **Docs BASELINE v2.0** | G13-UI + G14 + 12 demandas UAT atendidas | ✅ Concluída | PR #143 |
| **Suite UAT 12 itens** | 25 testes novos · Evidence JSON · gold set 8/8 | ✅ Concluída | PR #144 |
| **Sprint K — K-1** | Tabela `solaris_questions` + seed 12 perguntas | ✅ Concluída | PR K-1 |
| **Sprint K — K-2** | Tabela `iagen_questions` + seed | ✅ Concluída | PR K-2 |
| **Sprint K — K-3** | Badge visual por onda no `DiagnosticoStepper` | ✅ Concluída | PR K-3 |
| **Sprint K — K-4-A** | Migration 0058: `solaris_answers`, `iagen_answers`, `codigo`, enum `onda1_solaris`/`onda2_iagen`, `VALID_TRANSITIONS` + `assertValidTransition` | ✅ Concluída | `d370932` · tag `k4-a-complete` |
| **Sprint K — K-4-B** | `QuestionarioSolaris.tsx` + `DiagnosticoStepper` 8 etapas + `completeOnda1` | ✅ Concluída | PR #179 mergeado |
| **Sprint K+ — Cockpit v2.0** | C1+C2+C3+C4+C5+I1+I2+I3+I4 acionável | ✅ Concluída | PR #197 mergeado |
| **Sprint K++ — Cockpit dinâmico** | Fetch API GitHub + Seção 4 (4A–4F) + 10 docs atualizados | ✅ Concluída | PRs #199–#202 mergeados |
| **Sprint T Pre-M1 — GOV** | Skill v4.1 · CODEOWNERS 15 entradas · branch-scope + file-declaration + autoaudit CI | ✅ Concluída | PRs #304–#307 mergeados |
| **Sprint T — Bloco B** | CNT-01a/01b/02/03 — contratos canônicos Milestone 1 | ✅ Concluída | PR #308 mergeado |
| **Sprint T — Bloco C** | `ncm-engine.ts` + `nbs-engine.ts` + datasets M1 (5/6 confirmados) | ✅ Concluída | PR #311 mergeado |
| **Sprint T — Bloco D** | `engine-gap-analyzer.ts` + integração Onda 3 (source='engine') | ✅ Concluída | PR #312 mergeado |
| **Sprint T — DK-Q1/Q2** | Gate estrutural + gold set 5/5 PASS | ✅ Concluída | PRs #313–#314 mergeados |
| **Milestone 1 — Gate Triplo** | Evidence Pack + gate triplo aprovado (Técnico + Dr. Rodrigues + P.O.) | ✅ Concluído | PRs #315–#316 mergeados |

---

## 9. Bloqueios Ativos (Governança)

Os seguintes bloqueios estão em vigor por decisão formal e **não devem ser removidos sem aprovação documentada**:

- **NÃO ativar `DIAGNOSTIC_READ_MODE=new`** — aguarda 48-72h de observação pós-UAT
- **NÃO executar F-04 Fase 3** (alterar leitura para novas colunas) — aguarda UAT
- **NÃO executar DROP COLUMN** nas colunas legadas — aguarda Fase 3
- **NÃO misturar correções de bugs com novas features** — regra permanente de governança

**Modelo operacional ativo (2026-03-24):**
- Claude (Anthropic) assume função de Orquestrador com verificação independente via repositório
- ChatGPT assume função de Consultor — opina, não decide
- Manus mantém função de Implementador — executa, não orquestra
- Ver: `docs/MODELO-OPERACIONAL.md`

---

## 10. Próximos Passos

### P0 — Sprint K concluída ✅

Todas as 4 sub-sprints K-4-A, K-4-B, K-4-C e K-4-D foram concluídas e aprovadas pelo P.O. O fluxo das 8 etapas do `DiagnosticoStepper` está 100% funcional em produção.

### P1 — Próximas sprints (Sprint U)

1. **Patch 2202.10.00 (IS)** — PR separado com label `governance` após Dr. Rodrigues confirmar artigos IS na versão compilada
2. **Bloco E** — `principaisProdutos/principaisServicos` no schema de projetos + migration controlada + aprovação P.O.
3. **GOV-03b** — invariant check CI
4. **Dívida técnica** — `riskEngine.ts` duplicado

### P2 — Pós-aprovação UAT

5. **Ativar DIAGNOSTIC_READ_MODE=new** — Issue #56 (F-04 Fase 3) desbloqueada após aprovação formal do UAT pelo P.O.
6. **Issue #61** — Promover para modo `new` (aguarda #56)
7. **Issue #62** — DROP COLUMN colunas legadas (aguarda #61)

### P3 — Débitos técnicos registrados

8. **Issue #101** — 9 testes corpus com `skipIf(CI)` → habilitar no CI real
9. **evidencia_regulatoria default genérico** — `RiskItemSchema` e `BriefingSchema` ainda contêm default genérico. Sprint futura.
10. **CRUD QuestionSchema G15** — `routers-questions-crud.ts` não atualizado com `fonte`/`requirement_id`/`source_reference`. Sprint futura.

---

## 11. Funcionalidades do Produto

| Funcionalidade | Estado | Observação |
|---|---|---|
| Fluxo V3 completo (Etapas 1–5) | ✅ Funcional | — |
| Sistema de prefill inteligente (QC + QO + QCNAE) | ✅ Funcional | DA-1 a DA-4 implementadas |
| Modal de confirmação de retrocesso | ✅ Funcional | Gate + `RetrocessoConfirmModal` |
| Geração de briefing por IA | ✅ Funcional | `invokeLLM` via Manus Forge API |
| Matrizes de risco por CNAE | ✅ Funcional | — |
| Plano de ação | ✅ Funcional | — |
| Dashboard CPIE | ✅ Funcional | — |
| Autenticação e controle de acesso | ✅ Funcional | Manus OAuth |
| Notificações e WebSocket | ✅ Funcional | Socket.IO + `notifyOwner()` |
| Shadow Monitor (`/admin/shadow-monitor`) | ✅ Funcional | 4 métricas, gráfico 24h, clearOld |
| Dashboard UAT (`getUatProgress`) | ✅ Funcional | — |
| Descoberta de CNAEs por IA | ✅ Funcional | Requer `OPENAI_API_KEY` válida (ver ERR-006) |
| DiagnosticoStepper v3.0 — 8 etapas | ✅ Funcional | K-4-B aprovado pelo P.O. |
| Questionário SOLARIS (Onda 1) | ✅ Funcional | K-4-B — badge azul, SOL-001..012, `completeOnda1` |
| Questionário IA Generativa (Onda 2) | ✅ Funcional | K-4-C — badge laranja, LLM 5-10 perguntas, fallback 30s |
| Stepper etapas 7-8 (Matrizes + Plano) | ✅ Funcional | K-4-D — PR #184 mergeado · navega para `/matrizes-v3` e `/plano-v3` |

---

## 12. Migrations do Banco de Dados

60 migrations aplicadas via Drizzle ORM. As mais recentes:

| Migration | Descrição |
|---|---|
| `0052_stormy_phalanx.sql` | F-04 Fase 1 — ADD COLUMN 6 colunas V1/V3 |
| `0053_slow_maggott.sql` | Tabela `diagnostic_shadow_divergences` para Shadow Mode |
| `0058` (K-4-A) | `CREATE TABLE solaris_answers` · `CREATE TABLE iagen_answers` · `ALTER TABLE solaris_questions ADD COLUMN codigo VARCHAR(10)` · `ALTER TABLE projects MODIFY COLUMN status` (ADD `onda1_solaris`, `onda2_iagen`) |

**Rollback K-4-A:**
```sql
ALTER TABLE projects MODIFY COLUMN status ENUM('rascunho','consistencia_pendente','cnaes_confirmados','diagnostico_corporativo','diagnostico_operacional','diagnostico_cnae','briefing','riscos','plano','dashboard','assessment_fase1','assessment_fase2','matriz_riscos','plano_acao','em_avaliacao','aprovado','em_andamento','parado','concluido','arquivado') NOT NULL DEFAULT 'rascunho';
ALTER TABLE solaris_questions DROP COLUMN codigo;
DROP TABLE IF EXISTS solaris_answers;
DROP TABLE IF EXISTS iagen_answers;
```

---

## 13. Histórico de Atualizações deste Documento

| Versão | Data | Commit | Descrição da atualização |
|---|---|---|---|
| 1.0 | 2026-03-24 | `9e25ead` | Criação — unificação de STATUS-REPORT-BASELINE-2026-03-23.md. Estado pós-Sub-Sprint Prefill Contract. Banco limpo para UAT. |
| 1.1 | 2026-03-24 | `9853111` | DECISÃO-001 tomada: Opção A (prefill cruzado QC-07→QO-03). |
| 1.2 | 2026-03-24 | — | Novo modelo operacional registrado. |
| 1.3 | 2026-03-25 | — | Sprint de Governança CI/CD concluída. |
| 1.4 | 2026-03-26 | `dbad765` | Sprint A + B concluídas · G1–G8 corrigidos · 419 testes. |
| 1.5 | 2026-03-26 | `d18dadb` | Sprints C/D/E/B0/B1 registradas · 489 testes · corpus 2.078 chunks. |
| 1.6 | 2026-03-26 | `0647511` | Sprint 98% B2 concluída · GATE-CHECKLIST · Skills · G12. |
| 1.7 | 2026-03-26 | `a96cf25` | Sprint G concluída · RFC-001/002 · gold set 8/8. |
| 1.8 | 2026-03-27 | `ebfa1cb` | Sprint H concluída · RAG Cockpit ao vivo. |
| 1.9 | 2026-03-27 | `fc54e13f` | DT-01 — guard db:push + 3 testes. |
| 2.0 | 2026-03-27 | `b8bbc062` | G13-UI + G14 confirmados · 12 demandas UAT atendidas. |
| 2.1 | 2026-03-27 | `90814b7` | PRs #141–#144 mergeados · 517 testes · suite UAT 12 itens. |
| 2.2 | 2026-03-28 | `9500935` | Sprint K K-4-A + K-4-B: migration 0058, `solaris_answers`, `iagen_answers`, `VALID_TRANSITIONS`, `assertValidTransition`, `QuestionarioSolaris.tsx`, `DiagnosticoStepper` 8 etapas, `completeOnda1`. 70/70 testes Sprint K. PR #177 aberto com `p.o.-valida`. Testes manuais P.O. em andamento. |
| 2.3 | 2026-03-28 | `62c4219` | Sprint K K-4-C: `QuestionarioIaGen.tsx` (badge laranja, LLM 5-10 perguntas, timeout 30s, fallback hardcoded), procedures `generateOnda2Questions` + `completeOnda2` com `assertValidTransition`, rota `/questionario-iagen`, `onStartOnda2` wiring em `ProjetoDetalhesV2`. Aprovado pelo P.O. PR #182 mergeado. |
| 2.4 | 2026-03-28 | `e54d606` | Sprint K K-4-D: wiring `onStartMatrizes`/`onStartPlano` no `DiagnosticoStepper` (interface + `handleStepStart`), callbacks passados em `ProjetoDetalhesV2`. Fix T06.1 (assertion atualizada para `questionario-solaris`). PR #184 mergeado. Fluxo das 8 etapas 100% funcional. |
| 2.5 | 2026-03-29 | `326c6e6` | Sprint K+ e K++ concluídas: Cockpit P.O. v2.0 (C1–C5+I1–I4 acionável, PR #197), fetch dinâmico API GitHub (Score de Saúde em tempo real, PR #199), Seção 4 (4A–4F) com 24 docs catalogados (PR #200), 10 docs defasados atualizados + datas dinâmicas (PR #202). 580 commits · 202 PRs mergeados. |
| 3.0 | 2026-04-02 | `8fa615a` | Sprint S Lotes A+B+E: iagen-gap-analyzer.ts criado, persistCpie backend, briefingEngine usa actionPlans (401 reg.). PR #292. |
| 3.1 | 2026-04-02 | `d08c12a` | Sprint S Lote D: corpus RAG 5 novas leis (2.454 chunks, 10 leis). Skill solaris-contexto v4.0. PRs #293+#296. |
| 3.2 | 2026-04-04 | `d08c12a` | Sprint S encerrada: fix isNonCompliantAnswer (PR #295) — iagen-gap-analyzer usa conteúdo da resposta (não confidence_score). T1 validado: projeto 2490006 → iagen=3. 1.436 testes, 0 falhas. 24 perguntas SOLARIS ativas. |
| **3.3** | **2026-04-05** | **`d562127`** | **Milestone 1 Decision Kernel: Sprint T Pre-M1 encerrada (PRs #302–#316). GOV: Skill v4.2 · CODEOWNERS 15 entradas · 12 CI workflows. Contratos CNT-01a/01b/02/03. ncm-engine + nbs-engine + engine-gap-analyzer. 5/6 casos NCM/NBS validados (Dr. Rodrigues). Gate triplo aprovado (Técnico + Jurídico + P.O.). 1.470 testes, 0 falhas, 0 TS erros. Baseline v3.3 oficial.** |

> **Instrução para próxima atualização:** ao concluir uma sprint ou tomar uma decisão relevante, adicione uma linha nesta tabela e atualize as seções 1, 2, 5 e 10 com os novos valores. Faça commit com mensagem `docs: BASELINE-PRODUTO v1.x — <descrição>`.

---

*Documento vivo mantido pela equipe IA SOLARIS. Repositório oficial: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
