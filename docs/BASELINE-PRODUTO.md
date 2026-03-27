# Baseline do Produto — Plataforma de Compliance da Reforma Tributária

**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 1.8 — 2026-03-27
> **Commit HEAD:** `ebfa1cb` (branch `main`)
> **Checkpoint Manus:** `ab1cbc31`
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
| Testes automatizados — total | **492 testes passando** | ✅ |
| Cobertura de suítes | PCT v1 (117) · PCT v2 (81) · E2E Fase 2 (132) · BUG-001 (33) · INV-606/607/608 (47) · Sprint B (9) · Sprint C (15) · Sprint D (55) · Sprint E (20) | ✅ |
| Git working tree | Limpo — sem arquivos pendentes | ✅ |
| Servidor de desenvolvimento | Rodando na porta 3000 | ✅ |
| Banco de dados | Conectado (TiDB Cloud — us-east-1) | ✅ |
| Migrations aplicadas | **56** (última: `0055` — anchor_id + campos DEC-002; `lc123` adicionado ao enum `lei`) | ✅ |
| ADRs formais | **10** (ADR-001 a ADR-010; ADR-004 rejeitado) | ✅ |
| Decisões Arquiteturais de Prefill | **4** (DA-1 a DA-4) | ✅ |
| Invariants do sistema | **8** (INV-001 a INV-008) com testes de regressão | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (ativo em produção) | ✅ |
| Corpus RAG | **2.078 chunks — 100% com anchor_id** (lc214: 1.598 · lc227: 434 · lc224: 28 · ec132: 18 · lc123: pendente RFC-003) | ✅ |
| RAG Cockpit | Endpoint `ragInventory.getSnapshot` ao vivo · 9 gold set queries (GS-01..GS-08 + GS-07b) · confidence calculado sobre 8 queries canônicas | ✅ |
| Sprint 98% Confidence | **B0 ✅ · B1 ✅ · B2 ✅** — Sprint 98% CONCLUÍDA | ✅ |
| Agent Skills | Manus `/solaris-orquestracao` ✅ · Claude `solaris-contexto` ✅ | ✅ |
| db:push guard | Bloqueado em production — `scripts/db-push-guard.mjs` | ✅ |

---

## 2. Métricas do Produto (produção — 2026-03-24)

| Métrica | Valor |
|---|---|
| Total de projetos | **0** — banco limpo para início do UAT |
| Total de usuários cadastrados | — (preservados; apenas projetos foram removidos) |
| Projetos UAT criados | **0** — aguardando sessão com advogados |
| Divergências Shadow Mode registradas | **0** (banco limpo) |
| Divergências críticas | **0** |
| Chunks RAG no banco | **2.078** — 100% com anchor_id canônico (DEC-002) |

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

### Issues Fechadas

| Issue | Título | Commit |
|---|---|---|
| [#54](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/54) | Modal de confirmação de retrocesso | `e937590` |
| [#55](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/55) | Correção de débitos técnicos (3 testes) | `683c0bb` |
| [#59](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/59) | UX: botões "Voltar" interceptados pelo modal | `504c9ec` |

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
| [#101](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/101) | 123 testes legados com fetch real sem mock no CI | ⚠️ Débito ativo — `skipIf(isCI)` aplicado nos testes de corpus (Bloco 5 Sprint D) |
| [#65](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/65) | [B1] Matriz de rastreabilidade req→pergunta→gap→risco→ação | ✅ Fechada — PR #111 |

---

## 6. Erros Conhecidos Ativos

Os erros abaixo estão catalogados em [`docs/ERROS-CONHECIDOS.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) com runbooks de incidente.

| Código | Descrição | Solução paliativa |
|---|---|---|
| **ERR-006** | Descoberta de CNAEs falha se `OPENAI_API_KEY` inválida (HTTP 401) | Reconfigurar chave via `webdev_request_secrets` com `preventMatching: true` |
| **ERR-009** | Projetos criados antes de 2026-03-24 não têm `isEconomicGroup`/`taxCentralization` | Script de migração (ver próximos passos) || **ERR-010** | Sobreposición QC-07/QO-03 (meios de pagamento) — pergunta duplicada | **DECISÃO-001 tomada:** Opción A (prefill cruzado) — executar pós-UAT |

---

## 7. Decisões Pendentes do P.O.

| Código | Decisão | Opções | Impacto |
|---|---|---|---|
| ~~**DECISÃO-001**~~ | ~~Como tratar sobreposición QC-07/QO-03 (meios de pagamento)~~ | ~~A: prefill cruzado (recomendada) · B: remoção de QC-07 · C: consolidação em novo campo~~ | **✅ DECIDIDO 2026-03-24 — Opção A (prefill cruzado), executar pós-UAT.** Razão: não contaminar feedback dos advogados com mudança de fluxo durante UAT. Opção B descartada (acionaria Fase 0 + validação jurídica dos 499 requisitos). Aprovado pelo P.O. |
| ~~**DEC-002**~~ | ~~Schema CSV SOLARIS — campos de rastreabilidade~~ | **✅ DECIDIDO** — anchor_id VARCHAR(255) UNIQUE + autor, revisado_por, data_revisao (nullable). Implementado em PR #109. |
| ~~**DEC-003**~~ | ~~Estratégia ingestão Anexos LC 214~~ | **✅ DECIDIDO** — Opção A: chunk por NCM/item (Anexos I–IV) + chunk por regra/seção (Anexos V–XI). Implementado em PR #109. |
| ~~**DEC-004**~~ | ~~Gate de revisão CSV SOLARIS~~ | **✅ DECIDIDO** — Publicação direta com log de auditoria (sem gate manual). Implementado em PR #108. |
---

## 8. Fases do Projeto — Histórico Completo

| Fase | Descrição | Status | Commit |
|---|---|---|---|
| **F-01** | Adaptador centralizado `getDiagnosticSource()` — eliminou 93 leituras diretas | ✅ Concluída | `61d40966` |
| **F-02A** | `routers-fluxo-v3.ts` migrado para `getDiagnosticSource()` | ✅ Concluída | `51f308b1` |
| **F-02B** | `routers.ts` migrado (briefing, riskMatrix, actionPlan) | ✅ Concluída | `f6a59818` |
| **F-02C** | `flowStateMachine.ts` e `flowRouter.ts` migrados | ✅ Concluída | `d50d5a39` |
| **F-02D** | `routers/diagnostic.ts` migrado — ZERO leituras diretas em produção | ✅ Concluída | `1cbe8f76` |
| **F-03** | Gate de limpeza no retrocesso + modal de confirmação | ✅ Concluída | `6590be3c` |
| **F-04 Fase 1** | ADD COLUMN — 6 novas colunas V1/V3 criadas no banco | ✅ Concluída | `63a19f5` |
| **F-04 Fase 2** | Cópia de dados legados para colunas V1/V3 | ✅ Concluída | `63a19f5` (0 linhas — sem dados legados) |
| **F-04 Fase 3** | Alterar leitura para novas colunas | 🔒 **Bloqueada** — aguarda UAT + 48-72h |
| **F-04 Fase 4** | DROP COLUMN das colunas legadas | 🔒 **Bloqueada** — aguarda Fase 3 |
| **ADR-009** | Shadow Mode — comparação background legada vs. novas colunas | ✅ Concluída | `eb657d3` |
| **Preparação UAT** | Alerta automático + dashboard UAT + endpoint `getUatProgress` | ✅ Concluída | `0e1046c` |
| **Sub-Sprint Prefill** | Sistema de prefill estrutural (DA-1 a DA-4) + 410 testes + governança permanente | ✅ Concluída | `9e25ead` |
| **Sprint A (RAG)** | G1 label lc224 · G2 ano lc227 (2024→2026) · G5 Art.45 tópicos · G6 LC 224 cnaeGroups universal | ✅ Concluída | PR #105 — `a28875b` |
| **Sprint B (RAG)** | G8 companyProfile no briefing · G7 RAG por área (4 queries paralelas) · Fix CI: nomes jobs + legacy-peer-deps | ✅ Concluída | PR #106 — `dbad765` |
| **Sprint C (RAG)** | G9 Schema Zod para outputs do pipeline RAG · G10 campo fonte_risco nas matrizes | ✅ Concluída | PR #108 — `ec6a84e` |
| **Sprint D (Corpus)** | G3 EC 132/2023 (18 chunks) · G4 Anexos LC 214/2025 (I–XVII, sem VII) · DEC-002 anchor_id · migração 1.241 chunks legados | ✅ Concluída | PR #109 — `03fa2c1` |
| **Sprint E (RAG)** | G11 fundamentação auditável por item da matriz de riscos (cobertura, confiabilidade, alerta, dispositivos[]) | ✅ Concluída | PR #110 — `5d15105` |
| **Sprint 98% B0** | Governança GitHub: milestone, labels, 34 issues, PR template, CONTRIBUTING.md, MANUS-GOVERNANCE.md | ✅ Concluída | 2026-03-23 |
| **Sprint 98% B1** | ADR-010 aprovado · MATRIZ-CANONICA-INPUTS-OUTPUTS v1.1 aprovada · MATRIZ-RASTREABILIDADE v1.1 aprovada | ✅ Concluída | PR #111 — `88de16f` |
| **Sprint 98% B2** | GATE-CHECKLIST + Skills (Manus + Claude) + Cockpit v2 + G12 `fonte_acao` em `generateActionPlan` | ✅ Concluída | PR #113 — `805afd1` · PR #115 — `0647511` |
| **Rollout B2** | HANDOFF-SESSAO + SNAPSHOT-B2 + GUIA-PO-ROLLOUT + BASELINE v1.6 + HANDOFF-MANUS v1.6 | ✅ Concluída | PR #116 |
| **Sprint G (Corpus)** | RFC-001 (fusão id 810+811 lc227) · RFC-002 (25 chunks lc214→lc123) · 5 leis ativas · gold set 8/8 · confiabilidade 100% | ✅ Concluída | PR #129 — `f71bf85` |
| **Sprint H · M1 (RAG)** | `ragInventory.getSnapshot` tRPC endpoint · 9 gold set queries · GS-07 threshold `< 10 bytes` · GS-07b SUPERSEDED informativo · `lc123` ao enum `lei` | ✅ Concluída | PR #131 — `49520a0` |
| **Sprint H · M2 (Cockpit)** | RAG Cockpit ao vivo: dados estáticos → tRPC · loading state · timestamp · botão Atualizar · 8 abas com dados reais · refetchInterval 60s | ✅ Concluída | PR #132 — `ebfa1cb` |
| **Sprint I — DT-01** | Guard db:push (.mjs) + 3 testes automatizados + OPENAI_API_KEY no CI | ✅ Concluída | PR #139 — `fc54e13f` |

---

## 9. Bloqueios Ativos (Governança)

Os seguintes bloqueios estão em vigor por decisão formal e **não devem ser removidos sem aprovação documentada**:

- **NÃO ativar `DIAGNOSTIC_READ_MODE=new`** — aguarda 48-72h de observação pós-UAT
- **NÃO executar F-04 Fase 3** (alterar leitura para novas colunas) — aguarda UAT
- **NÃO executar DROP COLUMN** nas colunas legadas — aguarda Fase 3
- **NÃO misturar correções de bugs com novas features** — regra permanente de governança

**Novo modelo operacional ativo (2026-03-24):**
- Claude (Anthropic) assume função de Orquestrador com verificação independente via repositório
- ChatGPT assume função de Consultor — opina, não decide
- Manus mantém função de Implementador — executa, não orquestra
- Ver: `docs/MODELO-OPERACIONAL.md`

---

## 10. Próximos Passos

### P0 — Imediato (Sprint I)

1. **G13** — Remover placeholders `[QC-XX]` e `[QC-XX-PY]` visíveis ao advogado em todas as 10 seções do Questionário Corporativo V2
2. **G14** — Label `"Contabilidade"` → `"Contabilidade e Fiscal"` em 7 ocorrências de UI

### P1 — Próximo ciclo

3. **RFC-003 (P3)** — id 113 (`"e"` — 1 char) detectado como anomalia real no RAG Cockpit · avaliar reclassificação
4. **Issue #101** — 123 testes CI com fetch real sem mock · `skipIf(isCI)` aplicado como paliativo
5. **Issues #56, #61, #62** — F-04 Fase 3 + modo `new` + DROP COLUMN — aguardam UAT

### P2 — Suspenso

6. **Rollout DEC-006** — Novo modelo operacional: Claude implementa via artifacts, Manus audita e deploya.

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

---

## 12. Migrations do Banco de Dados

54 migrations aplicadas via Drizzle ORM. As mais recentes:

| Migration | Descrição |
|---|---|
| `0052_stormy_phalanx.sql` | F-04 Fase 1 — ADD COLUMN 6 colunas V1/V3 (`briefingContentV1/V3`, `riskMatricesDataV1/V3`, `actionPlansDataV1/V3`) |
| `0053_slow_maggott.sql` | Tabela `diagnostic_shadow_divergences` para Shadow Mode |

---

## 13. Histórico de Atualizações deste Documento

| Versão | Data | Commit | Descrição da atualização |
|---|---|---|---|
| 1.0 | 2026-03-24 | `9e25ead` | Criação — unificação de STATUS-REPORT-BASELINE-2026-03-23.md e STATUS-BASELINE-PROPOSTA-TESTES.md. Estado pós-Sub-Sprint Prefill Contract. Banco limpo para UAT. |
| 1.1 | 2026-03-24 | `9853111` | DECISÃO-001 tomada: Opção A (prefill cruzado QC-07→QO-03), executar pós-UAT. Opção B descartada (acionaria Fase 0). Aprovado pelo P.O. |
| 1.2 | 2026-03-24 | — | Novo modelo operacional registrado (Seções 3.8 + 9) · Sprint de Governança como P0 item 0 (Seção 10) · MODELO-OPERACIONAL.md adicionado como artefato de governança |
| 1.3 | 2026-03-25 | — | Sprint de Governança CI/CD concluída · Seção 3.8 atualizada com 4 novos artefatos (DoD, pr-governance, test-suite, migration-guard) · P0 item 0 marcado como concluído |
| 1.4 | 2026-03-26 | `dbad765` | Sprint A (PR #105) + Sprint B (PR #106) concluídas · G1/G2/G5/G6/G7/G8 corrigidos · Fix CI: nomes dos jobs alinhados com ruleset + legacy-peer-deps · 419 testes (+ 9 Sprint B) · Seção 8 atualizada com Sprints A e B · Seção 10 atualizada com Sprint C candidatos · DEC-002/003/004 registradas como pendentes |
| 1.5 | 2026-03-26 | `d18dadb` | Sprints C/D/E/B0/B1 registradas · 489 testes · corpus 2.078 chunks 100% anchor_id · ADR-010 aprovado · DEC-002/003/004 resolvidas · B2 como próxima sprint |
| 1.6 | 2026-03-26 | `0647511` | Sprint 98% B2 concluída · GATE-CHECKLIST · Skills Manus+Claude · Cockpit v2 · G12 fonte_acao · Rollout documentado (HANDOFF-SESSAO + SNAPSHOT-B2 + GUIA-PO) |
| 1.7 | 2026-03-26 | `a96cf25` | Sprint G concluída · RFC-001 (fusão id 810+811 lc227) · RFC-002 (25 chunks lc214→lc123) · 5 leis ativas · gold set 8/8 · confiabilidade 100% · RAG Cockpit ao vivo |
| 1.8 | 2026-03-27 | `ebfa1cb` | Sprint H concluída · PR #131 ragInventory tRPC (9 gold set queries, GS-07 threshold < 10 bytes, lc123 ao enum) · PR #132 RAG Cockpit ao vivo (dados estáticos → tRPC, 8 abas, refetchInterval 60s) · Sprint I iniciada (G13+G14 UAT) |
| 1.9 | 2026-03-27 | `fc54e13f` | DT-01 — guard db:push + 3 testes + secret CI configurado |

> **Instrução para próxima atualização:** ao concluir uma sprint ou tomar uma decisão relevante, adicione uma linha nesta tabela e atualize as seções 1, 2, 5 e 10 com os novos valores. Faça commit com mensagem `docs: BASELINE-PRODUTO v1.x — <descrição>`.

---

*Documento vivo mantido pela equipe IA SOLARIS. Repositório oficial: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
