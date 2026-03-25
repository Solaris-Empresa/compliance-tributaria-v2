# ERROS CONHECIDOS — Plataforma Compliance Reforma Tributária

**Versão:** 2.0  
**Data:** 2026-03-24  
**Autor:** Manus AI / Equipe de Engenharia  
**Repositório:** [Solaris-Empresa/compliance-tributaria-v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2)  
**Branch principal:** `main`  
**Propósito:** Registro oficial de erros, bugs, falhas e decisões pendentes para apoio a soluções definitivas e paliativas durante incidentes na plataforma.

---

## Índice

1. [Como usar este documento](#1-como-usar-este-documento)
2. [Classificação de Severidade](#2-classificação-de-severidade)
3. [Mapa de Sprints e Checkpoints](#3-mapa-de-sprints-e-checkpoints)
4. [Índice de Documentação Relacionada](#4-índice-de-documentação-relacionada)
5. [Erros Corrigidos — Histórico](#5-erros-corrigidos--histórico)
6. [Erros Conhecidos Ativos](#6-erros-conhecidos-ativos)
7. [Riscos Arquiteturais Documentados](#7-riscos-arquiteturais-documentados)
8. [Decisões Pendentes (Não Bloqueantes)](#8-decisões-pendentes-não-bloqueantes)
9. [Runbook de Incidentes Comuns](#9-runbook-de-incidentes-comuns)
10. [Invariants do Sistema](#10-invariants-do-sistema)
11. [Histórico de Versões deste Documento](#11-histórico-de-versões-deste-documento)

---

## 1. Como usar este documento

Este documento é a **fonte de verdade** para erros conhecidos da plataforma. Ao identificar um incidente:

1. Consulte a **Seção 6** (Erros Conhecidos Ativos) para verificar se já está catalogado.
2. Se identificado, aplique a **solução paliativa** imediatamente para restaurar o serviço.
3. Escale para a solução definitiva conforme prioridade indicada.
4. Se o erro não estiver catalogado, abra uma issue usando o template em [`.github/ISSUE_TEMPLATE/structural-fix.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/ISSUE_TEMPLATE/structural-fix.md) e adicione a este documento.

> **Regra de ouro:** Nunca feche um incidente sem atualizar este documento.

---

## 2. Classificação de Severidade

| Nível | Código | Critério | Tempo de Resposta |
|---|---|---|---|
| Crítico | **P0** | Sistema inacessível ou dados corrompidos | Imediato (< 1h) |
| Alto | **P1** | Funcionalidade core quebrada, workaround disponível | < 4h |
| Médio | **P2** | Funcionalidade degradada, impacto parcial | < 24h |
| Baixo | **P3** | Cosmético, UX ruim, sem perda de dados | Próxima sprint |
| Informativo | **INFO** | Comportamento documentado, não é bug | N/A |

---

## 3. Mapa de Sprints e Checkpoints

Linha do tempo completa de sprints, checkpoints e commits relevantes para rastreabilidade de erros.

| Sprint | Período | Checkpoint | Commit GitHub | Descrição |
|---|---|---|---|---|
| **v5.0 — Baseline** | 2026-03-22 | `ce11698` | [ce11698](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/ce11698) | Baseline inicial — fluxo V1 + V3 coexistindo |
| **v5.1 — ADR-005 Isolamento Físico** | 2026-03-22 | — | — | Colunas V3 separadas; dual-read implementado |
| **v5.2 — Fluxo V3 Completo** | 2026-03-23 | — | — | Questionários V2.1, routers-fluxo-v3, diagnostic-source |
| **v5.3.0 — Sprint Onda 1** | 2026-03-23 | `bb4b0395` | [bb4b0395](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/bb4b0395) | ERR-001 e ERR-002 corrigidos; 10 testes E2E passando |
| **v5.3.1 — Governança Permanente** | 2026-03-24 | `2ad69a8e` | [2ad69a8e](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/2ad69a8e) | Issue Template, PR Template, CI bloqueante, Invariant Registry |
| **v5.3.2 — Fechamento Governança** | 2026-03-24 | `bb4b0395` | [bb4b0395](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/bb4b0395) | Labels GitHub criadas, INV-006/007/008 com 47 testes, TS limpo |
| **Sub-Sprint Prefill Contract** | 2026-03-24 | `f1babb41` | [f1babb41](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/f1babb41) | ERR-003 corrigido; normalizeProject(), builders canônicos, 117 testes PCT |
| **ISSUE-001 — Prefill Fase 1 Final** | 2026-03-24 | `a0415ea6` | [a0415ea6](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/a0415ea6) | isEconomicGroup + taxCentralization adicionados; PCT v2 com 81 testes |
| **Fase 2 — Validação E2E** | 2026-03-24 | `07926c46` | [07926c46](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/07926c46) | 10 cenários × 8 blocos; 377/377 ✅; GO FASE 2 |
| **Autoauditoria + Pós-Auditoria** | 2026-03-24 | `98a51663` / `ed4630c6` | [ed4630c6](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/ed4630c6) | ERR-004 + ERR-005 corrigidos; BUG-001 + OBS-002; 161/161 testes |
| **ERROS-CONHECIDOS v1.0** | 2026-03-24 | `7fe761e8` | [7fe761e8](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/7fe761e8) | Registro oficial criado — 10 erros, 3 riscos, 5 runbooks, 8 invariants |
| **v2.00 — Documentação Consolidada** | 2026-03-24 | `c92d5337` | [c92d5337](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/c92d5337) | 120 arquivos .md, 11 checkpoints, 80 documentos ativos em 10 categorias |

---

## 4. Índice de Documentação Relacionada

Todos os documentos referenciados neste arquivo, com URL direta no GitHub.

### 4.1 Documentação de Produto

| Documento | URL | Descrição |
|---|---|---|
| Snapshot da Plataforma v2.00 | [snapshot-plataforma-reforma-tributaria-v2.00.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/snapshot-plataforma-reforma-tributaria-v2.00.md) | Estado atual da plataforma — inventário completo |
| Documentação do Projeto v2.00 | [documentacao-projeto-plataforma-reforma-tributaria-v2.00.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.md) | 120 arquivos .md, 11 checkpoints, métricas de produção |
| Projeto Compliance v2.00 | [projeto-compliance-reforma-tributaria-v2.00.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/projeto-compliance-reforma-tributaria-v2.00.md) | Documento de projeto consolidado |
| Requisitos Funcionais v6.0 | [REQUISITOS-FUNCIONAIS-v6.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md) | Requisitos funcionais completos |
| Playbook da Plataforma v3.0 | [PLAYBOOK-DA-PLATAFORMA-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md) | Guia operacional completo |
| Documentação IA Generativa v5.0 | [DOCUMENTACAO-IA-GENERATIVA-v5.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md) | Arquitetura de IA e modelos |
| Matriz Canônica Inputs/Outputs | [MATRIZ-CANONICA-INPUTS-OUTPUTS.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md) | Mapeamento completo de entradas e saídas |
| Matriz de Rastreabilidade | [MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md) | Rastreabilidade requisito → pergunta → gap → risco → ação |

### 4.2 ADRs (Architecture Decision Records)

| Documento | URL | Decisão |
|---|---|---|
| ADR-001 | [ADR-001-fluxo-v3-separado.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-001-fluxo-v3-separado.md) | Separação física do fluxo V3 |
| ADR-002 | [ADR-002-pipeline-diagnostico.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-002-pipeline-diagnostico.md) | Pipeline de diagnóstico com retry e fallback |
| ADR-003 | [ADR-003-exaustao-de-riscos.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-003-exaustao-de-riscos.md) | Exaustão de riscos tributários |
| ADR-004 | [ADR-004-fonte-de-verdade-diagnostico.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-004-fonte-de-verdade-diagnostico.md) | Fonte de verdade do diagnóstico |
| ADR-005 | [ADR-005-isolamento-fisico-diagnostico.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-005-isolamento-fisico-diagnostico.md) | Isolamento físico de colunas V1/V3 |
| ADR-006 | [ADR-006-relatorio-validacao-pratica-adr005.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-006-relatorio-validacao-pratica-adr005.md) | Validação prática do ADR-005 |
| ADR-007 | [ADR-007-gate-limpeza-retrocesso.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-007-gate-limpeza-retrocesso.md) | Gate de limpeza e retrocesso |
| ADR-008 | [ADR-008-F04-schema-migration-strategy.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md) | Estratégia de migração de schema |

### 4.3 Relatórios de Testes e Auditorias

| Documento | URL | Descrição |
|---|---|---|
| Relatório Onda 1 | [RELATORIO-ONDA1-10-TESTES-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-ONDA1-10-TESTES-2026-03-23.md) | 10 testes E2E — ERR-001 e ERR-002 identificados |
| Relatório Onda 2 (Stress) | [RELATORIO-ONDA2-STRESS-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-ONDA2-STRESS-2026-03-23.md) | Testes de stress — limites e comportamento sob carga |
| Relatório Completo Onda 1+2 | [RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md) | Consolidado Onda 1 e Onda 2 |
| Relatório E2E 10 Casos | [RELATORIO-E2E-10-CASOS-2026-03-24.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-E2E-10-CASOS-2026-03-24.md) | 10 casos E2E pós-sprint |
| Relatório Manual 40 Casos | [RELATORIO-MANUAL-40-CASOS-2026-03-24.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-MANUAL-40-CASOS-2026-03-24.md) | 40 casos manuais — validação completa |
| Relatório Bateria Avançada GO/NO-GO | [RELATORIO-BATERIA-AVANCADA-GO-NOGO-2026-03-24.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-BATERIA-AVANCADA-GO-NOGO-2026-03-24.md) | Bateria avançada — decisão GO/NO-GO |
| Auditoria Final 98% GO | [AUDITORIA-FINAL-98-GO-NOGO-2026-03-24.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/AUDITORIA-FINAL-98-GO-NOGO-2026-03-24.md) | Auditoria final — 98% aprovado |
| Auditoria Zero Gaps 100% GO | [AUDITORIA-ZERO-GAPS-100PCT-GO-2026-03-24.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/AUDITORIA-ZERO-GAPS-100PCT-GO-2026-03-24.md) | Auditoria final — 100% aprovado para UAT |
| Shadow Monitor Baseline UAT | [SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md) | Baseline de 203 divergências esperadas |
| Relatório Final Shadow Mode ADR-009 | [RELATORIO-FINAL-SHADOW-MODE-ADR009.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md) | Shadow mode — relatório final |
| Diagnóstico UAT-001 | [DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md) | Diagnóstico do fluxo de questionário |

### 4b. Documentos Entregues pelo P.O. (v2.00) — NOVOS 2026-03-24

Fontes primárias entregues pelo P.O. para apoio a diagnóstico de incidentes e onboarding.

| Documento | URL GitHub | Descrição |
|---|---|---|
| `documentacao-projeto-plataforma-reforma-tributaria-v2.00.md` | [GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.md) | Inventário completo — 120 arquivos, 11 checkpoints, métricas de produção |
| `documentacao-projeto-plataforma-reforma-tributaria-v2.00.docx` | [GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.docx) | Versão Word do inventário |
| `INDICE-DOCUMENTACAO-v2.00.docx` | [GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/INDICE-DOCUMENTACAO-v2.00.docx) | Índice mestre em formato Word — 80 docs ativos em 10 categorias |
| `0-leia-me.docx` | [GitHub](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/0-leia-me.docx) | Nota de entrega do P.O. — links GitHub, resumo da v2.00 |

---

### 4.4 Documentos de Governança e Issues

| Documento | URL | Descrição |
|---|---|---|
| Prefill Contract Sprint | [docs/governance/prefill-contract-sprint.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/prefill-contract-sprint.md) | Documento formal da sub-sprint estrutural |
| ISSUE-001 — Prefill Contract Fase 1 | [docs/issues/ISSUE-001-prefill-contract-fase1-final.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/ISSUE-001-prefill-contract-fase1-final.md) | Issue formal com checklist 100% aprovado |
| Autoauditoria Questionários v1.1 | [docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md) | 8 seções técnicas — aprovado para UAT |
| Arquitetura PO v1.1 | [docs/issues/QUESTIONARIOS-ARQUITETURA-PO-v1.1.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/QUESTIONARIOS-ARQUITETURA-PO-v1.1.md) | 10 seções executivas para o PO |
| Fase 2 E2E Validation Report | [docs/issues/FASE2-E2E-VALIDATION-REPORT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/FASE2-E2E-VALIDATION-REPORT.md) | 132 testes × 10 cenários × 8 blocos |
| Pós-Autoauditoria Relatório Final | [docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) | BUG-001 + OBS-002 corrigidos; GO UAT |
| Evidence Pack — Prefill Contract | [docs/evidence-packs/2026-03-24-prefill-contract-sprint.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/evidence-packs/2026-03-24-prefill-contract-sprint.md) | Evidence pack canônico da sprint |
| Invariant Registry | [docs/governance/invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) | 8 invariants do sistema com testes |
| Changeset Discipline | [docs/governance/changeset-discipline.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/changeset-discipline.md) | Guia de commits atômicos |
| Labels and Board | [docs/governance/labels-and-board.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/labels-and-board.md) | 5 labels de governança |
| Evidence Pack Template | [docs/governance/evidence-pack-template.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/evidence-pack-template.md) | Template padrão para evidence packs |

### 4.5 Documentação UAT

| Documento | URL | Descrição |
|---|---|---|
| Guia UAT Advogados v2 | [GUIA-UAT-ADVOGADOS-v2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md) | Guia completo para advogados |
| E-mail Modelo Convite UAT | [EMAIL-MODELO-CONVITE-UAT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/EMAIL-MODELO-CONVITE-UAT.md) | Template de convite para UAT |

### 4.6 Suítes de Testes Automatizados

| Arquivo | URL | Cobertura |
|---|---|---|
| `prefill-contract.test.ts` | [server/prefill-contract.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) | 117 testes — PCT v1 (blocos 1-10) |
| `prefill-contract-v2.test.ts` | [server/prefill-contract-v2.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract-v2.test.ts) | 81 testes — PCT v2 (ISSUE-001) |
| `invariants-606-607-608.test.ts` | [server/invariants-606-607-608.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/invariants-606-607-608.test.ts) | 47 testes — INV-006/007/008 |
| `fase2-e2e-validation.test.ts` | [server/fase2-e2e-validation.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/fase2-e2e-validation.test.ts) | 132 testes — Fase 2 E2E |
| `bug001-regression.test.ts` | [server/bug001-regression.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/bug001-regression.test.ts) | 33 testes — regressão BUG-001 |
| `auth.logout.test.ts` | [server/auth.logout.test.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/auth.logout.test.ts) | Testes de autenticação |

---

## 5. Erros Corrigidos — Histórico

Esta seção registra erros já resolvidos. Mantida para referência em caso de regressão.

---

### ERR-001 — Navegação para Rota Legada após Confirmação de CNAEs

| Campo | Detalhe |
|---|---|
| **ID** | ERR-001 |
| **Alias** | UAT-001 |
| **Severidade** | P0 (bloqueava o fluxo principal) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | Onda 1 — 2026-03-23 |
| **Checkpoint** | [`bb4b0395`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/bb4b0395) |
| **Relatório** | [RELATORIO-ONDA1-10-TESTES-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-ONDA1-10-TESTES-2026-03-23.md) |

**Sintoma observado:** Após confirmar os CNAEs no fluxo de criação de projeto, o usuário era redirecionado para `/questionario-v3` (rota legada) em vez das novas rotas v2.1 (`/questionario-corporativo-v2`, `/questionario-operacional`, `/questionario-cnae`). O fluxo travava e o usuário não conseguia avançar.

**Causa raiz:** 6 pontos de saída do fluxo (`onSuccess` e `statusToStep`) nos arquivos `NovoProjeto.tsx`, `ProjetoDetalhesV2.tsx` e nos 3 questionários ainda apontavam para a rota legada.

**Solução definitiva aplicada:** Todos os pontos de saída atualizados para as rotas corretas v2.1.

**Arquivos modificados:**
- [`client/src/pages/NovoProjeto.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/NovoProjeto.tsx)
- [`client/src/pages/ProjetoDetalhesV2.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/ProjetoDetalhesV2.tsx)
- [`client/src/pages/QuestionarioCorporativoV2.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/QuestionarioCorporativoV2.tsx)
- [`client/src/pages/QuestionarioOperacional.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/QuestionarioOperacional.tsx)
- [`client/src/pages/QuestionarioCNAE.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/QuestionarioCNAE.tsx)
- [`client/src/lib/flowStepperUtils.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/lib/flowStepperUtils.ts)

**Teste de regressão:** [`server/sprint-v60-v63-e2e.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/sprint-v60-v63-e2e.test.ts) — T06 (navegação pós-CNAE)

---

### ERR-002 — Persistência V1 em vez de V3 nos Endpoints de Geração

| Campo | Detalhe |
|---|---|
| **ID** | ERR-002 |
| **Alias** | UAT-002 |
| **Severidade** | P0 (dados gerados não eram persistidos corretamente) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | Onda 1 — 2026-03-23 |
| **Checkpoint** | [`bb4b0395`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/bb4b0395) |
| **Relatório** | [RELATORIO-ONDA1-10-TESTES-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-ONDA1-10-TESTES-2026-03-23.md) |

**Sintoma observado:** Após gerar Briefing, Matriz de Riscos ou Plano de Ação, os dados eram salvos nas colunas V1 (`briefingContent`, `riskMatricesData`, `actionPlansData`) em vez das colunas V3 (`briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`). Ao reabrir o projeto, os dados gerados não apareciam.

**Causa raiz:** Os 5 endpoints de geração no `routers-fluxo-v3.ts` persistiam nas colunas V1. O `diagnostic-source.ts` não retornava dados V3 para projetos com `flowVersion = "v1"`.

**Solução definitiva aplicada:** Persistência migrada para V3. Dual-read V3/V1 implementado nos componentes e no `diagnostic-source.ts`.

**Arquivos modificados:**
- [`server/routers-fluxo-v3.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/routers-fluxo-v3.ts) (5 endpoints)
- [`server/diagnostic-source.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/diagnostic-source.ts)
- [`client/src/pages/PlanoAcaoV3.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/PlanoAcaoV3.tsx)
- [`client/src/pages/BriefingV3.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/BriefingV3.tsx)
- [`client/src/pages/MatrizesV3.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/MatrizesV3.tsx)

**Teste de regressão:** [`server/sprint-v60-v63-e2e.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/sprint-v60-v63-e2e.test.ts) — T08 (persistência V3)

---

### ERR-003 — Prefill de Questionários Ignorado (Lógica Local vs. Builder Canônico)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-003 |
| **Alias** | BUG-PREFILL-CORPORATIVO |
| **Severidade** | P1 (degradação de UX — campos não pré-preenchidos) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | Sub-Sprint Prefill Contract — 2026-03-24 |
| **Checkpoint** | [`f1babb41`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/f1babb41) |
| **Documento** | [docs/governance/prefill-contract-sprint.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/prefill-contract-sprint.md) |

**Sintoma observado:** Ao abrir o Questionário Corporativo, os campos `qc01_regime` (regime tributário) e `qc01_porte` (porte da empresa) não eram pré-preenchidos com os dados do perfil da empresa, mesmo quando o perfil estava completo.

**Causa raiz (4 causas independentes):**
1. `QuestionarioCorporativoV2.tsx` tinha lógica local de prefill duplicada e divergente do builder canônico em `shared/questionario-prefill.ts`.
2. `getProjectById()` no `db.ts` retornava `companyProfile` como string JSON (não como objeto) para projetos legados — o MySQL2 não faz parse automático de colunas `json()`.
3. O tipo `NormalizedProjectForPrefill` não incluía `isEconomicGroup` e `taxCentralization`.
4. O builder `buildCorporatePrefill` não mapeava os campos QC-02 (grupo econômico, filiais, centralização).

**Solução definitiva aplicada:**
- `normalizeProject()` adicionado ao [`server/db.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/db.ts) com `safeParseJson()`.
- [`shared/questionario-prefill.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/shared/questionario-prefill.ts) reescrito com builders completos e `PrefillTrace`.
- [`client/src/pages/QuestionarioCorporativoV2.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/QuestionarioCorporativoV2.tsx) refatorado para usar exclusivamente `buildCorporatePrefill()`.

**Testes de regressão:**
- [`server/prefill-contract.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) — 117 testes
- [`server/prefill-contract-v2.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract-v2.test.ts) — 81 testes

---

### ERR-004 — isEconomicGroup e taxCentralization Não Persistidos no Banco

| Campo | Detalhe |
|---|---|
| **ID** | ERR-004 |
| **Alias** | BUG-001 (pós-autoauditoria) |
| **Severidade** | P1 (campos coletados mas não salvos — prefill QC-02 incompleto) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | Pós-Autoauditoria — 2026-03-24 |
| **Checkpoint** | [`ed4630c6`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/ed4630c6) |
| **Documento** | [docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) |

**Sintoma observado:** Ao criar um projeto com grupo econômico (`isEconomicGroup = true`) ou centralização fiscal (`taxCentralization = "centralizado"`), esses valores não eram salvos no banco. Ao abrir o Questionário Corporativo, os campos `qc02_grupo` e `qc02_centralizacao` não eram pré-preenchidos.

**Causa raiz:** `NovoProjeto.tsx` montava o objeto `companyProfile` (linhas 468-474) sem incluir `isEconomicGroup` e `taxCentralization`. Os campos existiam no formulário, no schema Zod, no banco e nos builders — mas o elo de persistência estava quebrado.

**Solução definitiva aplicada:** 2 linhas adicionadas ao objeto `companyProfile` em [`client/src/pages/NovoProjeto.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/NovoProjeto.tsx):
```ts
isEconomicGroup: perfilData.isEconomicGroup,
taxCentralization: perfilData.taxCentralization,
```

**Teste de regressão:** [`server/bug001-regression.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/bug001-regression.test.ts) — 33 testes

---

### ERR-005 — Banner QC-01 Usa Path Legado em vez de Canônico

| Campo | Detalhe |
|---|---|
| **ID** | ERR-005 |
| **Alias** | OBS-002 (autoauditoria) |
| **Severidade** | P2 (banner informativo não aparecia para projetos novos) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | Pós-Autoauditoria — 2026-03-24 |
| **Checkpoint** | [`ed4630c6`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/ed4630c6) |
| **Documento** | [docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md) |

**Sintoma observado:** O banner informativo no topo do Questionário Corporativo (QC-01) que exibe o regime tributário e porte da empresa não aparecia para projetos criados após a migração para o fluxo V3, mesmo com dados disponíveis no perfil.

**Causa raiz:** O banner usava `projeto.taxRegime` e `projeto.companySize` (colunas legadas, sempre `null` em projetos V3) em vez de `projeto.companyProfile?.taxRegime` e `projeto.companyProfile?.companySize` (path canônico).

**Solução definitiva aplicada:** Banner atualizado para usar `companyProfile.taxRegime` e `companyProfile.companySize` em [`client/src/pages/QuestionarioCorporativoV2.tsx`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/client/src/pages/QuestionarioCorporativoV2.tsx) (bloco do banner, linhas 314-335).

---

### ERR-006 — Descoberta de CNAEs Falha por Chave OpenAI Inválida ou Ausente

| Campo | Detalhe |
|---|---|
| **ID** | ERR-006 |
| **Alias** | INCIDENTE-OPENAI-KEY |
| **Severidade** | P0 (bloqueava completamente a etapa de descoberta de CNAEs) |
| **Status** | ✅ CORRIGIDO — configuração de chave via Secrets |
| **Sprint** | Pré-sprint (configuração de ambiente) |
| **Checkpoint** | Pré-sprint |
| **Diagnóstico** | [DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md) |

**Sintoma observado:** A etapa de descoberta/confirmação de CNAEs no fluxo de criação de projeto falhava silenciosamente ou exibia erro genérico. O usuário não conseguia avançar além da etapa de CNAEs.

**Causa raiz:** A variável de ambiente `OPENAI_API_KEY` estava ausente, expirada ou com formato inválido (não começava com `sk-`). O endpoint de descoberta de CNAEs usa o modelo GPT-4.1 via `invokeLLM()` — sem chave válida, todas as chamadas retornam HTTP 401.

**Solução paliativa:** Verificar a chave no painel de Secrets do projeto. Se ausente ou inválida, reconfigurar com uma chave válida da OpenAI.

**Solução definitiva:** Chave configurada e validada via [`server/openai-key-validation.test.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/openai-key-validation.test.ts).

**Como verificar:**
```bash
cd /home/ubuntu/compliance-tributaria-v2
npx vitest run server/openai-key-validation.test.ts
# Esperado: 2/2 ✅
```

**Arquivos relacionados:**
- [`server/_core/llm.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/_core/llm.ts)
- [`server/routers-fluxo-v3.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/routers-fluxo-v3.ts) — endpoint `discoverCnaes`

---

### ERR-007 — Dois Fluxos de Diagnóstico Sem Rota Canônica Definida (Legado V1 + V3)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-007 |
| **Alias** | ADR-001 — Problema Central |
| **Severidade** | P1 (projetos podiam ter respostas nos dois fluxos simultaneamente) |
| **Status** | ✅ CORRIGIDO |
| **Sprint** | v5.1 — ADR-005 Isolamento Físico |
| **Checkpoint** | Pré-sprint v2.2 |
| **ADR** | [ADR-005-isolamento-fisico-diagnostico.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-005-isolamento-fisico-diagnostico.md) |

**Sintoma observado:** Um projeto podia ter respostas no fluxo V1 (`corporateAnswers`, `operationalAnswers`, `cnaeAnswers`) e no fluxo V3 (`questionnaireAnswersV3`) simultaneamente, sem que o sistema soubesse qual era a fonte de verdade. Briefings e matrizes podiam ser gerados a partir de dados errados.

**Causa raiz:** Dois fluxos coexistiam sem separação física de dados. O `flowVersion` era usado como guarda lógico, mas não havia isolamento de colunas.

**Solução definitiva aplicada (ADR-005):** Colunas físicas separadas por fluxo: `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`. [`server/diagnostic-source.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/diagnostic-source.ts) implementa dual-read com fallback V1 para projetos legados.

**Regra atual:** Projetos com `flowVersion = "v3"` usam exclusivamente colunas V3. Projetos com `flowVersion = "v1"` usam colunas V1 com fallback.

---

## 6. Erros Conhecidos Ativos

Erros identificados, documentados, mas ainda sem correção definitiva implementada.

---

### ERR-008 — Sobreposição de Perguntas QC-07 e QO-03 (Meios de Pagamento)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-008 |
| **Alias** | DECISÃO-001 |
| **Severidade** | P3 (UX confusa — mesma pergunta em dois questionários) |
| **Status** | ⚠️ ATIVO — Decisão pendente do PO |
| **Impacto** | Advogados podem responder a mesma pergunta duas vezes |
| **Documento** | [docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) |

**Sintoma observado:** A pergunta sobre meios de pagamento aparece em dois questionários distintos:
- **QC-07** (Questionário Corporativo): "Quais meios de pagamento a empresa utiliza?" — contexto de compliance fiscal corporativo.
- **QO-03** (Questionário Operacional): "Quais meios de pagamento a empresa aceita?" — contexto de operação e fluxo de caixa.

**Análise:** As perguntas têm propósitos distintos (compliance fiscal vs. operação), mas as opções de resposta são idênticas. O usuário percebe como duplicação.

**Soluções disponíveis:**

| Opção | Descrição | Impacto |
|---|---|---|
| **A — Manter ambas com prefill cruzado** (recomendada) | QC-07 pré-preenche com resposta de QO-03 | Mínimo — 2h de implementação |
| **B — Remover QC-07** | Eliminar a pergunta do Corporativo | Médio — revisar regras de risco que dependem de QC-07 |
| **C — Consolidar em seção única** | Criar seção "Meios de Pagamento" compartilhada | Alto — refatoração de 2 questionários |

**Solução paliativa:** Nenhuma necessária — o sistema funciona corretamente. O impacto é apenas de UX.

---

### ERR-009 — Projetos Legados Sem isEconomicGroup e taxCentralization

| Campo | Detalhe |
|---|---|
| **ID** | ERR-009 |
| **Alias** | MIGRAÇÃO-LEGADO-QC02 |
| **Severidade** | P2 (prefill QC-02 incompleto para projetos criados antes de 2026-03-24) |
| **Status** | ⚠️ ATIVO — Script de migração não executado |
| **Impacto** | Projetos legados mostram `prefill_fields_missing` no PrefillTrace para QC-02 |
| **Documento** | [docs/issues/ISSUE-001-prefill-contract-fase1-final.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/ISSUE-001-prefill-contract-fase1-final.md) |

**Sintoma observado:** Projetos criados antes de 2026-03-24 não têm os campos `isEconomicGroup` e `taxCentralization` no `companyProfile`. Ao abrir o Questionário Corporativo, os campos `qc02_grupo` e `qc02_centralizacao` não são pré-preenchidos.

**Causa raiz:** Os campos foram adicionados ao schema e ao formulário em 2026-03-24 (Sub-Sprint Prefill Contract). Projetos anteriores não passaram pelo novo formulário.

**Solução paliativa:** O sistema funciona normalmente — os campos simplesmente não são pré-preenchidos para projetos legados. O advogado preenche manualmente.

**Solução definitiva (script de migração):**
```sql
-- Preencher isEconomicGroup a partir de hasMultipleEstablishments
UPDATE projects
SET companyProfile = JSON_SET(
  companyProfile,
  '$.isEconomicGroup', JSON_EXTRACT(companyProfile, '$.taxComplexity.hasMultipleEstablishments'),
  '$.taxCentralization', 'nao_informado'
)
WHERE JSON_EXTRACT(companyProfile, '$.isEconomicGroup') IS NULL
  AND flowVersion = 'v3';
```

> **Atenção:** Executar o script apenas após validação em ambiente de staging. Fazer backup antes.

---

### ERR-010 — Erro TypeScript em shadowMode.ts (Cache Incremental)

| Campo | Detalhe |
|---|---|
| **ID** | ERR-010 |
| **Alias** | TS-SHADOWMODE-CACHE |
| **Severidade** | INFO (falso positivo — não afeta runtime) |
| **Status** | ⚠️ ATIVO — Ruído no watcher TypeScript |
| **Impacto** | Watcher TS reporta erro falso; `tsc --noEmit` confirma zero erros reais |

**Sintoma observado:** O watcher TypeScript (modo incremental) reporta erro em `server/runtime/shadowMode.ts` sobre `getDiagnosticReadMode` não exportada. O erro aparece no console do servidor durante o hot-reload.

**Causa raiz:** Cache incremental do TypeScript desatualizado. A função `getDiagnosticReadMode` **existe e é exportada** em [`server/diagnostic-source.ts`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/diagnostic-source.ts) (linha 55). O cache foi gerado antes de uma refatoração de imports e não foi invalidado.

**Solução paliativa:** Para silenciar o erro no watcher:
```bash
rm -rf /home/ubuntu/compliance-tributaria-v2/.tsbuildinfo
```
O próximo build recompilará do zero e o erro desaparecerá.

**Solução definitiva:** O erro desaparece automaticamente após `pnpm dev` (reinício limpo do servidor). Já foi resolvido na sessão atual via `webdev_restart_server`.

---

## 7. Riscos Arquiteturais Documentados

Riscos identificados nos ADRs que podem se tornar incidentes se não monitorados.

---

### RISCO-001 — Briefing como Ponto Único de Falha no Pipeline

**Origem:** [ADR-002](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-002-pipeline-diagnostico.md), Risco 2  
**Probabilidade:** Baixa (mitigada)  
**Impacto:** Alto — GAP analysis, Matriz de Riscos e Plano de Ação são todos derivados do Briefing

**Descrição:** Se `generateBriefing` falhar após 3 tentativas, todo o pipeline downstream (riscos, ações, briefing) para. O usuário fica preso sem conseguir avançar.

**Mitigação implementada:** `generateWithRetry` com 3 tentativas + backoff exponencial. Briefing de fallback determinístico (sem IA) implementado para quando todas as tentativas falham.

**Sintoma de incidente:** Usuário vê spinner infinito na tela de geração de briefing. Logs mostram `generateBriefing failed after 3 attempts`.

**Solução paliativa:** Verificar `OPENAI_API_KEY` (ver ERR-006). Se a chave estiver válida, aguardar 5 minutos e tentar novamente. Se persistir por mais de 15 minutos, o briefing de fallback deve ser acionado automaticamente.

---

### RISCO-002 — Variabilidade do Diagnóstico por Instabilidade do Modelo

**Origem:** [ADR-002](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-002-pipeline-diagnostico.md), Risco 3  
**Probabilidade:** Média  
**Impacto:** Médio — diagnósticos diferentes para o mesmo perfil em execuções distintas

**Descrição:** A qualidade do RAG, qualidade do prompt e estabilidade do modelo introduzem variabilidade. Dois projetos com perfis idênticos podem receber diagnósticos diferentes.

**Mitigação implementada:** Shadow Mode com baseline de 203 divergências esperadas documentadas. Divergências acima do baseline são alertas.

**Monitoramento:** [SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md)

---

### RISCO-003 — Inconsistência Composta Não Detectada no Perfil

**Origem:** [ADR-002](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-002-pipeline-diagnostico.md), Risco 1; [`docs/product/cpie-v2/produto/08-risk-model.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/08-risk-model.md)  
**Probabilidade:** Média  
**Impacto:** Alto — diagnóstico tributário incorreto para a realidade da empresa

**Descrição:** Campos individuais podem estar corretos mas a combinação ser impossível (ex: Simples Nacional + faturamento > R$4,8M). O Consistency Engine detecta inconsistências compostas, mas apenas as determinísticas. Inconsistências sutis podem passar.

**Mitigação implementada:** Consistency Engine com `hard_block` para inconsistências críticas e `soft_block_with_override` para inconsistências moderadas.

**Sintoma de incidente:** Projeto avança com perfil inconsistente → diagnóstico incorreto → advogado identifica erro no UAT.

**Solução paliativa:** Abrir o projeto, editar o perfil da empresa e corrigir a inconsistência. O sistema permitirá regenerar o diagnóstico.

---

## 8. Decisões Pendentes (Não Bloqueantes)

Decisões que precisam ser tomadas pelo PO mas não bloqueiam o UAT.

| ID | Decisão | Opções | Responsável | Prazo | Documento |
|---|---|---|---|---|---|
| **DEC-001** | Sobreposição QC-07 / QO-03 (meios de pagamento) | A: prefill cruzado / B: remover QC-07 / C: consolidar | PO | Pré-Sprint 2 | [POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) |
| **DEC-002** | Campo `qc02_obs` (observações QC-02) — pré-preenchível? | Manter sem prefill / Remover / Sugerir texto via IA | PO + Jurídico | Pós-UAT | [ISSUE-001](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/ISSUE-001-prefill-contract-fase1-final.md) |
| **DEC-003** | Migração de projetos legados (ERR-009) | Executar script SQL / Deixar sem migração | PO + DBA | Pós-UAT | [ISSUE-001](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/ISSUE-001-prefill-contract-fase1-final.md) |

---

## 9. Runbook de Incidentes Comuns

### INC-001 — Usuário não consegue avançar após confirmação de CNAEs

**Diagnóstico rápido:**
1. Verificar URL atual do usuário — deve ser `/questionario-corporativo-v2` (não `/questionario-v3`).
2. Se for `/questionario-v3`, o ERR-001 regrediu — verificar se o deploy está na versão correta (checkpoint [`bb4b0395`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/commit/bb4b0395) ou posterior).
3. Verificar `flowVersion` do projeto no banco: `SELECT flowVersion FROM projects WHERE id = ?` — deve ser `"v3"`.

**Solução paliativa:** Pedir ao usuário para acessar diretamente `/questionario-corporativo-v2?projectId=<ID>`.

---

### INC-002 — Briefing/Matriz/Plano não aparecem após geração

**Diagnóstico rápido:**
```sql
SELECT 
  id,
  flowVersion,
  briefingContentV3 IS NOT NULL as tem_briefing_v3,
  briefingContent IS NOT NULL as tem_briefing_v1
FROM projects WHERE id = ?;
```
Se `tem_briefing_v1 = true` e `tem_briefing_v3 = false`, o ERR-002 regrediu.

**Solução paliativa:** Regenerar o briefing — o sistema deve salvar nas colunas V3 corretamente.

---

### INC-003 — Campos não pré-preenchidos nos questionários

**Diagnóstico rápido:**
```sql
SELECT JSON_EXTRACT(companyProfile, '$.taxRegime') as regime,
       JSON_EXTRACT(companyProfile, '$.companySize') as porte,
       JSON_EXTRACT(companyProfile, '$.isEconomicGroup') as grupo,
       JSON_EXTRACT(companyProfile, '$.taxCentralization') as centralizacao
FROM projects WHERE id = ?;
```
Se `regime` e `porte` são `null`, o perfil não foi salvo corretamente.

**Solução paliativa:** Pedir ao usuário para editar e re-salvar o perfil da empresa.

---

### INC-004 — Descoberta de CNAEs falha ou retorna vazio

**Diagnóstico rápido:**
1. Executar `pnpm test -- openai-key-validation` — se falhar, a chave está inválida (ERR-006).
2. Verificar logs: `grep "invokeLLM\|discoverCnaes\|401\|invalid_api" .manus-logs/devserver.log`

**Solução paliativa:**
1. Verificar e reconfigurar `OPENAI_API_KEY` via painel de Secrets.
2. Se a chave estiver válida, aguardar 5 minutos (pode ser rate limit da OpenAI) e tentar novamente.

---

### INC-005 — Erro TypeScript no watcher (falso positivo)

**Diagnóstico rápido:**
1. Executar `npx tsc --noEmit` — se retornar 0 erros, é falso positivo (ERR-010).
2. Se retornar erros reais, investigar o arquivo indicado.

**Solução paliativa:**
```bash
rm -rf /home/ubuntu/compliance-tributaria-v2/.tsbuildinfo
# Reiniciar o servidor
```

---

## 10. Invariants do Sistema

Propriedades que **nunca devem ser violadas**. Se violadas, constituem incidente P0.

| ID | Invariant | Teste de Verificação | URL do Teste |
|---|---|---|---|
| **INV-001** | Todo projeto tem exatamente um `flowVersion` (`v1` ou `v3`) | `prefill-contract.test.ts` — BLOCO 1 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) |
| **INV-002** | `companyProfile` nunca chega ao frontend como string JSON | `prefill-contract.test.ts` — BLOCO 2 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) |
| **INV-003** | Builders de prefill nunca lançam exceção — retornam objeto vazio em caso de dados ausentes | `prefill-contract.test.ts` — BLOCO 4 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) |
| **INV-004** | `normalizeProject()` é aplicado em todos os pontos de retorno de projeto | `prefill-contract.test.ts` — BLOCO 5 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract.test.ts) |
| **INV-005** | Nenhum questionário tem lógica local de prefill — todos usam builders canônicos | `prefill-contract-v2.test.ts` — BLOCO 7 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/prefill-contract-v2.test.ts) |
| **INV-006** | Toda entrada de risco tem `id`, `category`, `probability`, `impact` e `description` | `invariants-606-607-608.test.ts` — INV-006 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/invariants-606-607-608.test.ts) |
| **INV-007** | Todo plano de ação tem `id`, `riskId`, `action`, `responsible` e `deadline` | `invariants-606-607-608.test.ts` — INV-007 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/invariants-606-607-608.test.ts) |
| **INV-008** | Todo briefing tem `projectId`, `content` e `generatedAt` | `invariants-606-607-608.test.ts` — INV-008 | [link](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/invariants-606-607-608.test.ts) |

**Como verificar todos os invariants:**
```bash
cd /home/ubuntu/compliance-tributaria-v2
npx vitest run server/prefill-contract.test.ts server/prefill-contract-v2.test.ts server/invariants-606-607-608.test.ts
# Esperado: 245/245 ✅
```

**Invariant Registry completo:** [docs/governance/invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md)

---

## 11. Histórico de Versões deste Documento

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| **1.0** | 2026-03-24 | Manus AI | Criação inicial — 10 erros catalogados (7 corrigidos, 3 ativos), 3 riscos arquiteturais, 3 decisões pendentes, 5 runbooks, 8 invariants |
| **2.0** | 2026-03-24 | Manus AI | Adição de Seção 3 (Mapa de Sprints com 12 checkpoints e commits GitHub), Seção 4 (Índice de 35 documentos com URLs diretas no GitHub), URLs GitHub em todos os erros, checkpoints e testes; incorporação dos documentos v2.00 (commit `c92d5337`, 120 arquivos .md, 80 documentos ativos em 10 categorias) |
| **2.1** | 2026-03-24 | Manus AI | Incorporação dos 4 documentos entregues pelo P.O. (`documentacao-projeto-plataforma-reforma-tributaria-v2.00.md/.docx`, `INDICE-DOCUMENTACAO-v2.00.docx`, `0-leia-me.docx`); nova Seção 4b com tabela de documentos do PO e URLs GitHub; atualização do Índice Mestre para v2.01 (93 documentos ativos, 13 novos, Categoria 5c adicionada) |

---

*Documento mantido pela equipe de engenharia. Atualizar sempre que um novo erro for identificado ou um erro ativo for resolvido. Template de issue: [.github/ISSUE_TEMPLATE/structural-fix.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/ISSUE_TEMPLATE/structural-fix.md)*
