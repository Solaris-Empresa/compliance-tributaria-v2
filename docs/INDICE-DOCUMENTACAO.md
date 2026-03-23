# Índice Mestre de Documentação
**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 2.00 — 2026-03-23
> **Versão anterior:** 1.00 (commit `40bf064`, 65 documentos)
> **Commit HEAD:** `c92d5337` (branch `main`)
> **Total de documentos:** 120 arquivos Markdown + 7 arquivos .docx
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Categoria 1 — Governança e Reconstrução (v3.0)

Documentos gerados a partir do `documentacao-para-rollback-rag-v1.00.docx`. São os **source of truth** para governança, reconstrução e execução do agente. **Leitura obrigatória antes de qualquer nova sprint.**

| Arquivo | Descrição | Audiência |
|---|---|---|
| [`docs/INDICE-DOCUMENTACAO.md`](./INDICE-DOCUMENTACAO.md) | **Este documento** — índice mestre de 120 docs em 10 categorias | P.O. + Agente |
| [`docs/PO-GOVERNANCA-PIPELINE-v3.md`](./PO-GOVERNANCA-PIPELINE-v3.md) | Visão de P.O.: estado real, roadmap, critérios de produção, decisões de produto | P.O. + Orquestrador |
| [`docs/REBUILD-PIPELINE-v3.md`](./REBUILD-PIPELINE-v3.md) | Guia de reconstrução completa da pipeline em caso de desastre ou perda de contexto | Agente + P.O. |
| [`docs/SKILL-MANUS-PIPELINE-v3.md`](./SKILL-MANUS-PIPELINE-v3.md) | Skill técnico permanente do agente: 11 módulos de governança, persistência, QA e compliance | Agente |

---

## Categoria 2 — Status Reports e Baseline

Documentos de status e baseline técnica do projeto, gerados em marcos importantes.

| Arquivo | Data | Descrição |
|---|---|---|
| [`docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md`](./product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md) | 2026-03-23 | Status report completo + baseline técnica (commit `40bf064`) |
| [`docs/product/cpie-v2/produto/STATUS-BASELINE-PROPOSTA-TESTES.md`](./product/cpie-v2/produto/STATUS-BASELINE-PROPOSTA-TESTES.md) | 2026-03-23 | Status report pré-Shadow Mode + proposta UAT |
| [`docs/BASELINE-v2.2.md`](./BASELINE-v2.2.md) | — | Baseline técnica v2.2 |
| [`docs/BaselineTecnica-v2.1.md`](./BaselineTecnica-v2.1.md) | — | Baseline técnica v2.1 |
| [`docs/SPRINT-STATUS-REPORT.md`](./SPRINT-STATUS-REPORT.md) | — | Histórico de status de sprints |
| [`docs/AUDITORIA-RECONCILIACAO-POS-v2.2.md`](./AUDITORIA-RECONCILIACAO-POS-v2.2.md) | — | Auditoria de reconciliação pós-v2.2 |

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
| [`documentacao-projeto-plataforma-reforma-tributaria-v2.00.md`](./product/cpie-v2/produto/documentacao-projeto-plataforma-reforma-tributaria-v2.00.md) + `.docx` | **v2.00** | Inventário completo de documentação — 120 arquivos, 11 checkpoints, estado atual | ✅ Novo |

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

| Categoria | Qtd. Documentos | Prioridade de Leitura | Novos desde v1.00 |
|---|---|---|---|
| 1 — Governança e Reconstrução (v3.0) | 4 | 🔴 CRÍTICA — ler primeiro | 1 |
| 2 — Status Reports e Baseline | 6 | 🔴 CRÍTICA | 1 |
| 3 — ADRs | 9 | 🟠 ALTA | — |
| 4 — Relatórios e Auditorias | 10 | 🟠 ALTA | 4 |
| 5 — Documentação de Versão Atual (v5.x) | 6 | 🔴 CRÍTICA | 6 |
| 5b — Especificação de Produto | 12 | 🟡 MÉDIA | 1 |
| 6b — UAT e Distribuição | 3 | 🔴 CRÍTICA | 3 |
| 6 — Arquitetura Técnica | 10 | 🟡 MÉDIA | — |
| 7 — Operação e Infraestrutura | 10 | 🟢 BAIXA | — |
| 8 — Playbooks e Guias | 6 | 🟠 ALTA | — |
| 9 — Histórico de Sprints | 4 | 🟢 BAIXA | — |
| **Total** | **80** | — | **16 novos** |

> **Nota:** O total de 80 documentos neste índice representa os documentos ativos e relevantes. O repositório contém 120 arquivos `.md` no total, incluindo ~40 documentos históricos de sprints anteriores (pré-v5.0) na raiz do projeto.

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
| `INDICE-DOCUMENTACAO-v2.00.docx` | v2.00 |

---

## Ordem de Leitura Recomendada (Onboarding de Novo Agente)

1. **Este documento** (`docs/INDICE-DOCUMENTACAO.md`) — mapa completo de todos os documentos
2. `docs/PO-GOVERNANCA-PIPELINE-v3.md` — entender o estado e as regras do P.O.
3. `docs/SKILL-MANUS-PIPELINE-v3.md` — assumir o modo operacional correto
4. `docs/PLAYBOOK-PLATAFORMA.md` — regras mandatórias de desenvolvimento
5. `docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md` — estado atual
6. `docs/REBUILD-PIPELINE-v3.md` — se precisar reconstruir do zero
7. `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` — estratégia de migração ativa
8. `docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md` — Shadow Mode
9. `docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md` — suite de validação

---

*Atualizado em 2026-03-23 — Versão 2.00 | Commit HEAD: `c92d5337` | Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
*Versão anterior: 1.00 (commit `40bf064`, 65 documentos)*
