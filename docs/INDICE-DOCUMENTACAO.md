# Índice Mestre de Documentação
**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 2.07 — 2026-03-26
> **Versão anterior:** 2.06 (commit `bc83f9b`, 2026-03-24)
> **Commit HEAD:** `3d4bd11` (branch `main`)
> **Total de documentos:** 135 arquivos Markdown (sem .docx — GitHub é o repositório oficial)
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2
> **Novos nesta versão:** GATE-CHECKLIST · Skills Manus + Claude · SNAPSHOT-SPRINT-98-B2 · HANDOFF-SESSAO-2026-03-26 · GUIA-PO-ROLLOUT-ENTRE-SESSOES · FRAMEWORK-GOVERNANCA (docs/governanca/)
>
> **📌 Acesso rápido para o P.O.:**
> - 🔴 [ERROS CONHECIDOS v2.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) — incidentes, runbooks, sprints
> - 🔴 [AUTOAUDITORIA v1.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md) — aprovado para UAT
> - 🔴 [ARQUITETURA P.O. v1.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/QUESTIONARIOS-ARQUITETURA-PO-v1.1.md) — visão executiva
> - 🔴 [RELATÓRIO GO/NO-GO](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) — decisão UAT
> - 🔴 [GUIA UAT ADVOGADOS v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md) — sessão com advogados
> - 🔴 [SNAPSHOT DA PLATAFORMA v2.00](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/snapshot-plataforma-reforma-tributaria-v2.00.md) — estado atual completo
> - ⭐ [BASELINE DO PRODUTO v1.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md) — **documento vivo** — estado técnico e de produto, atualizado a cada sprint
> - 🔴 [PRODUCT-LIFECYCLE.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/PRODUCT-LIFECYCLE.md) — navegação por ciclo de vida do produto

---

## Categoria 1 — Governança e Reconstrução (v3.0)

Documentos gerados a partir do `documentacao-para-rollback-rag-v1.00.docx`. São os **source of truth** para governança, reconstrução e execução do agente. **Leitura obrigatória antes de qualquer nova sprint.**

| Arquivo | Descrição | Audiência |
|---|---|---|
| [**Índice Mestre** (este doc)](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/INDICE-DOCUMENTACAO.md) | **Este documento** — índice mestre de 93 docs em 10 categorias | P.O. + Agente |
| [PO-GOVERNANCA-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/PO-GOVERNANCA-PIPELINE-v3.md) | Visão de P.O.: estado real, roadmap, critérios de produção, decisões de produto | P.O. + Orquestrador |
| [REBUILD-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/REBUILD-PIPELINE-v3.md) | Guia de reconstrução completa da pipeline em caso de desastre ou perda de contexto | Agente + P.O. |
| [MODELO-OPERACIONAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/MODELO-OPERACIONAL.md) | Modelo operacional da equipe: papéis (P.O., Orquestrador, Implementador, Consultor), fluxos de trabalho e protocolo de comunicação | P.O. + Orquestrador + Manus |
| [SKILL-MANUS-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/SKILL-MANUS-PIPELINE-v3.md) | Skill técnico permanente do agente: 11 módulos de governança, persistência, QA e compliance | Agente |

---

## Categoria 2 — Baseline e Status do Produto

O **BASELINE-PRODUTO.md** é o único documento vivo de estado do produto. Substitui todos os status reports pontuais anteriores. Deve ser atualizado a cada sprint concluída. Os demais documentos desta categoria são históricos imutáveis.

| Arquivo | Data | Descrição |
|---|---|---|
| ⭐ [**BASELINE-PRODUTO.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md) | **2026-03-24** | **Documento vivo** — baseline unificada, atualizada a cada sprint. Substitui STATUS-REPORT-BASELINE e STATUS-BASELINE-PROPOSTA-TESTES |
| [BASELINE-v2.2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-v2.2.md) | — | Baseline técnica v2.2 (histórico) |
| [BaselineTecnica-v2.1.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BaselineTecnica-v2.1.md) | — | Baseline técnica v2.1 (histórico) |
| [SPRINT-STATUS-REPORT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/SPRINT-STATUS-REPORT.md) | — | Histórico de status de sprints |
| [AUDITORIA-RECONCILIACAO-POS-v2.2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/AUDITORIA-RECONCILIACAO-POS-v2.2.md) | — | Auditoria de reconciliação pós-v2.2 (histórico) |
| [STATUS-REPORT-BASELINE-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md) | 2026-03-23 | Histórico imutável — estado pré-Sub-Sprint Prefill (commit `0e1046c`) |

---

## Categoria 3 — ADRs (Architecture Decision Records)

Decisões arquiteturais formais do projeto. Cada ADR é imutável após aprovação.

| ADR | Título | Status |
|---|---|---|
| [`ADR-001`](./product/cpie-v2/produto/ADR-001-arquitetura-diagnostico.md) | Arquitetura do diagnóstico — fluxos V1 e V3 | ✅ Aprovado |
| [`ADR-002`](./product/cpie-v2/produto/ADR-002-plano-implementacao-rollback.md) | Plano de implementação com rollback | ✅ Aprovado |
| [`ADR-003`](./product/cpie-v2/produto/ADR-003-exaustao-de-riscos.md) | Exaustão de riscos — gap → risco determinístico | ✅ Aprovado |
| [`ADR-004`](./product/cpie-v2/produto/ADR-004-fonte-de-verdade-diagnostico.md) | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| [`ADR-005`](./product/cpie-v2/produto/ADR-005-isolamento-fisico-diagnostico.md) | Isolamento físico do diagnóstico — `getDiagnosticSource()` | ✅ Aprovado |
| [`ADR-006`](./product/cpie-v2/produto/ADR-006-relatorio-validacao-pratica-adr005.md) | Relatório de validação prática do ADR-005 | ✅ Aprovado |
| [`ADR-007`](./product/cpie-v2/produto/ADR-007-gate-limpeza-retrocesso.md) | Gate de limpeza no retrocesso — `cleanupOnRetrocesso()` | ✅ Aprovado |
| [`ADR-008`](./product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md) | Estratégia de migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| ADR-009 | Shadow Mode — comparação background V1/V3 | ✅ Implementado (ver relatório abaixo) |

---

## Categoria 4 — Relatórios Técnicos e Auditorias

| Arquivo | Descrição | Novo |
|---|---|---|
| [`RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md`](./product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md) | **Relatório completo Onda 1+2 — 107/107 testes, métricas de performance** | ✅ Novo |
| [`RELATORIO-ONDA1-10-TESTES-2026-03-23.md`](./product/cpie-v2/produto/RELATORIO-ONDA1-10-TESTES-2026-03-23.md) | Relatório Onda 1 — 75/75 testes | ✅ Novo |
| [`RELATORIO-ONDA2-STRESS-2026-03-23.md`](./product/cpie-v2/produto/RELATORIO-ONDA2-STRESS-2026-03-23.md) | Relatório Onda 2 — 32/32 testes de stress | ✅ Novo |
| [`RELATORIO-FINAL-SHADOW-MODE-ADR009.md`](./product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md) | Relatório técnico completo do Shadow Mode — 12 seções | — |
| [`RELATORIO-ROLLBACK-DRILL-F04.md`](./product/cpie-v2/produto/RELATORIO-ROLLBACK-DRILL-F04.md) | Validação determinística do rollback da F-04 — 6 etapas | — |
| [`RELATORIO-AUDITORIA-SPRINT-FINAL.md`](./product/cpie-v2/produto/RELATORIO-AUDITORIA-SPRINT-FINAL.md) | Auditoria pós-sprint: Issues #54, #55, #59 | — |
| [`RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md`](./product/cpie-v2/produto/RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md) | Aprovação formal do Orquestrador com restrições | — |
| [`RESPOSTA-AUDITORIA-POS-HANDOFF.md`](./product/cpie-v2/produto/RESPOSTA-AUDITORIA-POS-HANDOFF.md) | Validação técnica pós-handoff: Issues #54/#55 + ADR-008 | — |
| [`ISSUES-pre-existentes-fora-escopo-F02.md`](./product/cpie-v2/produto/ISSUES-pre-existentes-fora-escopo-F02.md) | Débitos técnicos pré-existentes fora do escopo da F-02 | — |
| [`DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md`](./product/cpie-v2/produto/DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md) | Diagnóstico UAT-001 — fluxo de questionário | ✅ Novo |

---

## Categoria 5 — Documentação de Versão Atual (v5.x) — NOVOS DESDE v1.00

Documentos gerados nas sprints v5.0 a v5.3.0. Todos disponíveis em `.md` e `.docx`.

| Arquivo | Versão | Descrição | Novo |
|---|---|---|---|
| [`REQUISITOS-FUNCIONAIS-v6.md`](./product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md) + [`.docx`](./product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.docx) | **v6.0** | 153 RFs em 24 seções — incorpora ADR-005 a ADR-008, Shadow Mode, Onda 1+2, UAT | ✅ Novo |
| [`DOCUMENTACAO-IA-GENERATIVA-v5.md`](./product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md) + [`.docx`](./product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.docx) | **v5.0** | 23 seções — pipeline completo, diagnóstico dual, Shadow Mode, suite de validação | ✅ Novo |
| [`PLAYBOOK-DA-PLATAFORMA-v3.md`](./product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md) + [`.docx`](./product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.docx) | **v3.0** | 15 seções — ADRs, Shadow Mode, Onda 1+2, UAT, padrões createPool e JSON nativo | ✅ Novo |
| [`projeto-compliance-reforma-tributaria-v2.00.md`](./product/cpie-v2/produto/projeto-compliance-reforma-tributaria-v2.00.md) + [`.docx`](./product/cpie-v2/produto/projeto-compliance-reforma-tributaria-v2.00.docx) | **v2.00** | Documento de projeto — reposicionamento CNAE→requisitos regulatórios, 499 requisitos | ✅ Novo |
| [`snapshot-plataforma-reforma-tributaria-v2.00.md`](./product/cpie-v2/produto/snapshot-plataforma-reforma-tributaria-v2.00.md) + [`.docx`](./product/cpie-v2/produto/snapshot-plataforma-reforma-tributaria-v2.00.docx) | **v2.00** | Snapshot operacional — auditoria v2.3 aprovada (14/14 gates), evolução v2.3→v5.3.0 | ✅ Novo |
| [`documentacao-projeto-plataforma-reforma-tributaria-v2.00.md`](./product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.md) + [`.docx`](./product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.docx) | **v2.00** | Inventário completo de documentação — 120 arquivos, 11 checkpoints, estado atual | ✅ Novo |
| [`INDICE-DOCUMENTACAO-v2.00.docx`](./INDICE-DOCUMENTACAO-v2.00.docx) | **v2.00** | Índice mestre em formato Word — 80 docs ativos em 10 categorias (commit `6a7237b`) | ✅ Novo PO |
| [`0-leia-me.docx`](./0-leia-me.docx) | **v2.00** | Nota de entrega do PO — links GitHub, resumo do que foi incorporado na v2.00 | ✅ Novo PO |

---

## Categoria 5c — Sub-Sprint Prefill Contract (2026-03-24) — NOVOS

Documentos gerados durante a Sub-Sprint Estrutural de Prefill Contract. Cobrem diagnóstico, governança, testes automatizados e validação E2E.

| Arquivo | Tipo | Descrição | Novo |
|---|---|---|---|
| [ISSUE-001-prefill-contract-fase1-final.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/ISSUE-001-prefill-contract-fase1-final.md) | Issue Formal | ISSUE-001 — Fase 1 Final do Prefill Contract: matriz, decisões, 10 blocos de checklist, critérios de aceite | ✅ Novo |
| [AUTOAUDITORIA-QUESTIONARIOS.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS.md) | Auditoria | Autoauditoria v1.0 dos 3 questionários — 8 seções técnicas (DA-1..DA-5, gaps, decisões) | ✅ Novo |
| [**AUTOAUDITORIA-QUESTIONARIOS-v1.1.md** ⭐](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md) | Auditoria | **Última versão** — status atualizado pós-correções BUG-001 e OBS-002, GO para UAT | ✅ Novo |
| [QUESTIONARIOS-ARQUITETURA-PO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/QUESTIONARIOS-ARQUITETURA-PO.md) | Produto | Arquitetura dos questionários para o PO — 10 seções executivas, 82 campos mapeados | ✅ Novo |
| [**QUESTIONARIOS-ARQUITETURA-PO-v1.1.md** ⭐](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/QUESTIONARIOS-ARQUITETURA-PO-v1.1.md) | Produto | **Última versão** — checklist 100% aprovado, roadmap atualizado | ✅ Novo |
| [FASE2-E2E-VALIDATION-REPORT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/FASE2-E2E-VALIDATION-REPORT.md) | Validação | Relatório E2E Fase 2 — 10 cenários × 8 blocos, 132 testes, decisão GO/NO-GO | ✅ Novo |
| [POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) | Relatório | Relatório final pós-autoauditoria — BUG-001 + OBS-002 corrigidos, DECISÃO-001 documentada | ✅ Novo |
| [**ERROS-CONHECIDOS.md v2.1** ⭐](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) | Operacional | **Última versão** — 10 erros catalogados, runbooks, 8 invariants, Seção 4b com docs do P.O., URLs GitHub | ✅ Novo |
| [prefill-contract-sprint.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/prefill-contract-sprint.md) | Sprint | Documento formal da Sub-Sprint: Prefill Contract Matrix v1, Plano de Correção, Test Plan | ✅ Novo |
| [invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) | Governança | Invariant Registry — 8 invariants (INV-001..INV-008) com comandos de verificação | ✅ Novo |
| [2026-03-24-prefill-contract-sprint.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/evidence-packs/2026-03-24-prefill-contract-sprint.md) | Evidência | Evidence Pack canônico da sprint de Prefill Contract | ✅ Novo |

---

## Categoria 5b — Especificação de Produto

Documentos de especificação funcional e técnica do produto.

| Arquivo | Descrição |
|---|---|
| [`01-product-spec.md`](./product/cpie-v2/produto/01-product-spec.md) | Especificação completa do produto |
| [`02-modelo-conceitual.md`](./product/cpie-v2/produto/02-modelo-conceitual.md) | Modelo conceitual do sistema |
| [`03-decision-contract.md`](./product/cpie-v2/produto/03-decision-contract.md) | Contrato de decisões do produto |
| [`04-matriz-de-regras.md`](./product/cpie-v2/produto/04-matriz-de-regras.md) | Matriz de regras de negócio |
| [`05-fluxo-e2e.md`](./product/cpie-v2/produto/05-fluxo-e2e.md) | Fluxo end-to-end do usuário |
| [`06-ux-states.md`](./product/cpie-v2/produto/06-ux-states.md) | Estados de UX e transições |
| [`07-ux-guidelines.md`](./product/cpie-v2/produto/07-ux-guidelines.md) | Diretrizes de UX |
| [`08-risk-model.md`](./product/cpie-v2/produto/08-risk-model.md) | Modelo de risco do produto |
| [`GUIA-UAT-ADVOGADOS.md`](./product/cpie-v2/produto/GUIA-UAT-ADVOGADOS.md) | Guia UAT v1 (histórico) |
| [`docs/product/cpie-v2/README.md`](./product/cpie-v2/README.md) | README da documentação CPIE v2 |
| [`docs/product/cpie-v2/baseline-questionarios-rag.md`](./product/cpie-v2/baseline-questionarios-rag.md) | Baseline dos questionários RAG |
| [`docs/product/cpie-v2/cenarios/09-matriz-de-cenarios.md`](./product/cpie-v2/cenarios/09-matriz-de-cenarios.md) | Matriz de cenários de teste |

---

## Categoria 6 — Arquitetura Técnica

| Arquivo | Descrição |
|---|---|
| [`10-arquitetura-geral.md`](./product/cpie-v2/tecnico/10-arquitetura-geral.md) | Arquitetura geral do sistema |
| [`11-pipeline-cpie-v2.md`](./product/cpie-v2/tecnico/11-pipeline-cpie-v2.md) | Pipeline CPIE v2 detalhada |
| [`12-contrato-de-apis.md`](./product/cpie-v2/tecnico/12-contrato-de-apis.md) | Contrato de APIs tRPC |
| [`13-schema-banco.md`](./product/cpie-v2/tecnico/13-schema-banco.md) | Schema do banco de dados |
| [`14-single-source-of-truth.md`](./product/cpie-v2/tecnico/14-single-source-of-truth.md) | Single source of truth — `getDiagnosticSource()` |
| [`15-fluxo-de-estado.md`](./product/cpie-v2/tecnico/15-fluxo-de-estado.md) | Fluxo de estado e state machine |
| [`16-regras-de-cta.md`](./product/cpie-v2/tecnico/16-regras-de-cta.md) | Regras de CTA (call to action) |
| [`docs/architecture/canonical-requirements.md`](./architecture/canonical-requirements.md) | Requisitos canônicos (499 requisitos) |
| [`docs/architecture/cnae-pipeline.md`](./architecture/cnae-pipeline.md) | Pipeline CNAE: discover/refine/confirm |
| [`docs/architecture/question-mapping-engine.md`](./architecture/question-mapping-engine.md) | Motor de mapeamento de perguntas |

---

## Categoria 7 — Operação e Infraestrutura

| Arquivo | Descrição |
|---|---|
| [`17-plano-de-backup.md`](./product/cpie-v2/operacao/17-plano-de-backup.md) | Plano de backup |
| [`18-disaster-recovery.md`](./product/cpie-v2/operacao/18-disaster-recovery.md) | Plano de disaster recovery |
| [`19-versionamento-cpie.md`](./product/cpie-v2/operacao/19-versionamento-cpie.md) | Estratégia de versionamento |
| [`20-rollback-plan.md`](./product/cpie-v2/operacao/20-rollback-plan.md) | Plano de rollback |
| [`21-bootstrap-sistema.md`](./product/cpie-v2/operacao/21-bootstrap-sistema.md) | Bootstrap do sistema |
| [`22-metrica-ice.md`](./product/cpie-v2/operacao/22-metrica-ice.md) | Métrica ICE de priorização |
| [`23-plano-de-testes-continuos.md`](./product/cpie-v2/operacao/23-plano-de-testes-continuos.md) | Plano de testes contínuos |
| [`24-data-governance.md`](./product/cpie-v2/operacao/24-data-governance.md) | Governança de dados |
| [`docs/OBSERVABILITY.md`](./OBSERVABILITY.md) | Observabilidade e monitoramento |
| [`docs/DEPLOY-GUIDE.md`](./DEPLOY-GUIDE.md) | Guia de deploy |

---

## Categoria 6b — UAT e Distribuição — NOVOS DESDE v1.00

| Arquivo | Descrição | Novo |
|---|---|---|
| [`GUIA-UAT-ADVOGADOS-v2.md`](./product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md) | Guia UAT v2 — 8 cenários, critérios de aceite, formulário de feedback, cronograma 4 dias | ✅ Novo |
| [`EMAIL-MODELO-CONVITE-UAT.md`](./product/cpie-v2/produto/EMAIL-MODELO-CONVITE-UAT.md) | E-mail modelo de convite para advogados testadores | ✅ Novo |
| [`SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md`](./product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md) | Baseline Shadow Monitor T=0 — protocolo de verificação 48-72h | ✅ Novo |

---

## Categoria 8 — Playbooks e Guias de Desenvolvimento

| Arquivo | Descrição |
|---|---|
| [`docs/PLAYBOOK-PLATAFORMA.md`](./PLAYBOOK-PLATAFORMA.md) | Playbook oficial de desenvolvimento — regras mandatórias |
| [`docs/SUPER-PROMPT-RECUPERACAO.md`](./SUPER-PROMPT-RECUPERACAO.md) | Super-prompt de recuperação de contexto |
| [`docs/DOCUMENTACAO-IA-GENERATIVA-v4.md`](./DOCUMENTACAO-IA-GENERATIVA-v4.md) | Documentação IA Generativa v4 (histórico — v5.0 em `docs/product/`) |
| [`docs/QA-HUMANO-v2.3.md`](./QA-HUMANO-v2.3.md) | Guia de QA humano v2.3 |
| [`docs/IA_Levantamento_Inicial.md`](./IA_Levantamento_Inicial.md) | Levantamento inicial da IA |
| [`docs/funcionalidade-planos-por-ramo.md`](./funcionalidade-planos-por-ramo.md) | Funcionalidade de planos por ramo |

---

## Categoria 9 — Histórico de Sprints

| Arquivo | Descrição |
|---|---|
| [`docs/SPRINT-HISTORICO-MENU-QUESTIONARIOS.md`](./SPRINT-HISTORICO-MENU-QUESTIONARIOS.md) | Histórico da sprint de menu e questionários |
| [`docs/sprints/sprint-regulatory-engine-v1.md`](./sprints/sprint-regulatory-engine-v1.md) | Sprint do Regulatory Engine v1 |
| [`docs/sprints/v6.0-baseline.md`](./sprints/v6.0-baseline.md) | Baseline v6.0 |
| [`docs/product/cpie-v2/cenarios/09-matriz-de-cenarios.md`](./product/cpie-v2/cenarios/09-matriz-de-cenarios.md) | Matriz de cenários de teste |

---

## Resumo por Categoria

| Categoria | Qtd. Documentos | Prioridade de Leitura | Novos desde v2.00 |
|---|---|---|---|
| 1 — Governança e Reconstrução (v3.0) | 5 | 🔴 CRÍTICA — ler primeiro | 1 (MODELO-OPERACIONAL.md) |
| 2 — Status Reports e Baseline | 6 | 🔴 CRÍTICA | — |
| 3 — ADRs | 9 | 🟠 ALTA | — |
| 4 — Relatórios e Auditorias | 10 | 🟠 ALTA | — |
| 5 — Documentação de Versão Atual (v5.x) | 8 | 🔴 CRÍTICA | 2 (INDICE-v2.00.docx, 0-leia-me.docx) |
| 5b — Especificação de Produto | 12 | 🟡 MÉDIA | — |
| 5c — Sub-Sprint Prefill Contract | 11 | 🔴 CRÍTICA | 11 (todos novos) |
| 6b — UAT e Distribuição | 3 | 🔴 CRÍTICA | — |
| 6 — Arquitetura Técnica | 10 | 🟡 MÉDIA | — |
| 7 — Operação e Infraestrutura | 10 | 🟢 BAIXA | — |
| 8 — Playbooks e Guias | 6 | 🟠 ALTA | — |
| 9 — Histórico de Sprints | 4 | 🟢 BAIXA | — |
| **10 — Playruns** | **2** | 🟠 ALTA | **2 (todos novos)** |
| **11 — Suporte ao Usuário** | **3** | 🔴 CRÍTICA | **3 (todos novos)** |
| **Total** | **99** | — | **19 novos** |

> **Nota:** O total de 80 documentos neste índice representa os documentos ativos e relevantes. O repositório contém 120 arquivos `.md` no total, incluindo ~40 documentos históricos de sprints anteriores (pré-v5.0) na raiz do projeto.

---

## Categoria 10 — Playruns

Registros de execuções reais de playbooks. Cada Playrun documenta o que **aconteceu** durante uma sprint ou execução — etapas executadas, resultados mensurados, erros encontrados, desvios do playbook e lições aprendidas. São imutáveis após a sprint ser encerrada.

> **Diferença fundamental:** O Playbook diz *o que fazer*. O Playrun registra *o que aconteceu*.

| Arquivo | Data | Sprint | Status |
|---|---|---|---|
| ⭐ [**PLAYRUN-TEMPLATE.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/playruns/PLAYRUN-TEMPLATE.md) | — | Template padrão | Use este template para criar novos playruns |
| [**PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/playruns/PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md) | 2026-03-24 | Sub-Sprint Prefill Contract | ✅ CONCLUÍDO — 410/410 testes · 4 DAs · 8 invariants · BUG-001 corrigido |

---

## Categoria 11 — Suporte ao Usuário

Documentos voltados ao usuário final da plataforma (advogados tributaristas). Cobrem acesso, uso do fluxo completo, dúvidas frequentes e escalação de problemas. São documentos vivos — atualizados a cada sprint ou quando novos padrões de uso forem identificados.

| Arquivo | Descrição | Audiência |
|---|---|---|
| ⭐ [**MANUAL-USUARIO.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/suporte/MANUAL-USUARIO.md) | Manual completo: acesso, fluxo das 5 etapas, limites e comportamentos esperados | Advogados |
| [**FAQ.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/suporte/FAQ.md) | Perguntas frequentes: acesso, criação de projetos, geração de conteúdo, UAT | Advogados |
| [**ESCALACAO.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/suporte/ESCALACAO.md) | Fluxo de escalação P0→P3: autoconsulta, suporte interno, escalação urgente | Advogados + P.O. |

---

## Arquivos .docx Disponíveis para Download

| Arquivo | Versão |
|---|---|
| `REQUISITOS-FUNCIONAIS-v6.docx` | v6.0 |
| `DOCUMENTACAO-IA-GENERATIVA-v5.docx` | v5.0 |
| `PLAYBOOK-DA-PLATAFORMA-v3.docx` | v3.0 |
| `projeto-compliance-reforma-tributaria-v2.00.docx` | v2.00 |
| `snapshot-plataforma-reforma-tributaria-v2.00.docx` | v2.00 |
| `documentacao-projeto-plataforma-reforma-tributaria-v2.00.docx` | v2.00 |
| `AUTOAUDITORIA-QUESTIONARIOS-v1.1.docx` | v1.1 — Sprint Prefill Contract |
| `ERROS-CONHECIDOS-v2.0.docx` | v2.0 — Sprint Prefill Contract |
| `INDICE-DOCUMENTACAO-v2.00.docx` | v2.00 — entregue pelo PO |

---

## Ordem de Leitura Recomendada (Onboarding de Novo Agente)

1. **Este documento** (`docs/INDICE-DOCUMENTACAO.md`) — mapa completo de todos os documentos
2. `docs/PO-GOVERNANCA-PIPELINE-v3.md` — entender o estado e as regras do P.O.
   2b. `docs/MODELO-OPERACIONAL.md` — entender o modelo operacional da equipe (papéis, fluxos, protocolo)
3. `docs/SKILL-MANUS-PIPELINE-v3.md` — assumir o modo operacional correto
4. `docs/PLAYBOOK-PLATAFORMA.md` — regras mandatórias de desenvolvimento
5. `docs/BASELINE-PRODUTO.md` — estado atual do produto (documento vivo)
5b. `docs/playruns/PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md` — última sprint executada
6. `docs/REBUILD-PIPELINE-v3.md` — se precisar reconstruir do zero
7. `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` — estratégia de migração ativa
8. `docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md` — Shadow Mode
9. `docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md` — suite de validação

---

## Categoria 12 — Sprint 98% Confidence + Rollout B2 (2026-03-26)

Documentos gerados na Sprint 98% Confidence (B0/B1/B2) e no rollout pós-sessão 2026-03-26.

| Arquivo | Descrição | Status |
|---|---|---|
| [⭐ **FRAMEWORK-GOVERNANCA-IA-SOLARIS.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/FRAMEWORK-GOVERNANCA-IA-SOLARIS.md) | **Framework de Governança v1.0** — Gates 0–3, falhas identificadas, riscos do implementador, skills e mecanismos de persistência | ✅ Ativo |
| [⭐ **FRAMEWORK-GOVERNANCA-IA-SOLARIS.md** (docs/governanca/)](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governanca/FRAMEWORK-GOVERNANCA-IA-SOLARIS.md) | **Framework de Governança v1.0** — cópia canônica em `docs/governanca/` | ✅ Novo |
| [⭐ **GATE-CHECKLIST.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/GATE-CHECKLIST.md) | Gates 0–3 de controle de qualidade — executar antes de qualquer sprint | ✅ Ativo |
| [⭐ **HANDOFF-MANUS.md v1.6**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/HANDOFF-MANUS.md) | Handoff para o Manus — estado pós-B2, próximas sprints, bloqueios | ✅ Ativo |
| [**HANDOFF-SESSAO-2026-03-26.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/handoffs/HANDOFF-SESSAO-2026-03-26.md) | Handoff de sessão — como retomar no próximo chat | ✅ Novo |
| [**SNAPSHOT-SPRINT-98-B2.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/SNAPSHOT-SPRINT-98-B2.md) | Snapshot imutável do estado pós-Sprint 98% B2 | ✅ Novo |
| [⭐ **GUIA-PO-ROLLOUT-ENTRE-SESSOES.md**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/guias/GUIA-PO-ROLLOUT-ENTRE-SESSOES.md) | **Guia do P.O.** — rollout entre sessões, skills, ciclo de sprints | ✅ Novo |
| [**SKILL solaris-orquestracao (Manus)**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.manus/skills/solaris-orquestracao/SKILL.md) | Skill operacional do Manus — checklist, commits, bloqueios, pós-sprint | ✅ Novo |
| [**SKILL solaris-contexto (Claude)**](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/skills/solaris-contexto/SKILL.md) | Skill de contexto do Orquestrador — Gate 0, estado do produto, governança | ✅ Novo |
| [ADR-010](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-010-content-architecture-98.md) | Arquitetura Canônica de Conteúdo Diagnóstico | ✅ Aprovado |
| [MATRIZ-CANONICA-INPUTS-OUTPUTS v1.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md) | Matriz canônica de inputs/outputs das engines | ✅ Aprovada |
| [MATRIZ-RASTREABILIDADE v1.1](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md) | Cadeia req→pergunta→gap→risco→ação — INV-001..INV-008 | ✅ Aprovada |

---

*Atualizado em 2026-03-26 — Versão 2.07 | Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
*Versão anterior: 2.06 (commit `bc83f9b`, 2026-03-24) — MODELO-OPERACIONAL.md v1.0 + Categoria 11 Suporte ao Usuário + PRODUCT-LIFECYCLE.md v1.0*
*Versão anterior: 2.05 (commit `bc83f9b`, 2026-03-24) — Categoria 11 Suporte ao Usuário + PRODUCT-LIFECYCLE.md v1.0*
*Versão anterior: 2.04 (commit `52c677b`, 2026-03-24) — PRODUCT-LIFECYCLE.md v1.0 + Playruns + limpeza de token*
*Versão anterior: 2.03 (commit `a086ee3`, 2026-03-24) — link quebrado removido*
*Versão anterior: 2.02 (commit `9e25ead`, 93 documentos, 2026-03-24) — BASELINE-PRODUTO.md criado*
*Versão anterior: 2.01 (commit `c3b39da`, 93 documentos, 2026-03-24)*
*Versão anterior: 2.00 (commit `c92d5337`, 80 documentos, 2026-03-23)*
*Versão anterior: 1.00 (commit `40bf064`, 65 documentos, 2026-03-21)*
