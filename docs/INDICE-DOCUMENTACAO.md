# Índice Mestre de Documentação
**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 2026-03-23  
> **Commit HEAD:** `40bf064` (branch `main`)  
> **Total de documentos:** 60 arquivos Markdown  
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2

---

## Categoria 1 — Governança e Reconstrução (NOVO — v3.0)

Documentos gerados a partir do `documentacao-para-rollback-rag-v1.00.docx`. São os **source of truth** para governança, reconstrução e execução do agente.

| Arquivo | Descrição | Audiência |
|---|---|---|
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

---

## Categoria 3 — ADRs (Architecture Decision Records)

Decisões arquiteturais formais do projeto. Cada ADR é imutável após aprovação.

| ADR | Título | Status |
|---|---|---|
| [`ADR-001`](./product/cpie-v2/produto/ADR-001-arquitetura-diagnostico.md) | Arquitetura do diagnóstico — fluxos V1 e V3 | ✅ Aprovado |
| [`ADR-002`](./product/cpie-v2/produto/ADR-002-plano-implementacao-rollback.md) | Plano de implementação com rollback | ✅ Aprovado |
| [`ADR-003`](./product/cpie-v2/produto/ADR-003-exaustao-de-riscos.md) | Exaustão de riscos | ✅ Aprovado |
| [`ADR-004`](./product/cpie-v2/produto/ADR-004-fonte-de-verdade-diagnostico.md) | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| [`ADR-005`](./product/cpie-v2/produto/ADR-005-isolamento-fisico-diagnostico.md) | Isolamento físico do diagnóstico | ✅ Aprovado |
| [`ADR-006`](./product/cpie-v2/produto/ADR-006-relatorio-validacao-pratica-adr005.md) | Relatório de validação prática do ADR-005 | ✅ Aprovado |
| [`ADR-007`](./product/cpie-v2/produto/ADR-007-gate-limpeza-retrocesso.md) | Gate de limpeza no retrocesso | ✅ Aprovado |
| [`ADR-008`](./product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md) | Estratégia de migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| ADR-009 | Shadow Mode — comparação background | ✅ Implementado (ver relatório abaixo) |

---

## Categoria 4 — Relatórios Técnicos e Auditorias

| Arquivo | Descrição |
|---|---|
| [`RELATORIO-FINAL-SHADOW-MODE-ADR009.md`](./product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md) | Relatório técnico completo do Shadow Mode — 12 seções |
| [`RELATORIO-ROLLBACK-DRILL-F04.md`](./product/cpie-v2/produto/RELATORIO-ROLLBACK-DRILL-F04.md) | Validação determinística do rollback da F-04 — 6 etapas |
| [`RELATORIO-AUDITORIA-SPRINT-FINAL.md`](./product/cpie-v2/produto/RELATORIO-AUDITORIA-SPRINT-FINAL.md) | Auditoria pós-sprint: Issues #54, #55, #59 |
| [`RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md`](./product/cpie-v2/produto/RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md) | Aprovação formal do Orquestrador com restrições |
| [`RESPOSTA-AUDITORIA-POS-HANDOFF.md`](./product/cpie-v2/produto/RESPOSTA-AUDITORIA-POS-HANDOFF.md) | Validação técnica pós-handoff: Issues #54/#55 + ADR-008 |
| [`ISSUES-pre-existentes-fora-escopo-F02.md`](./product/cpie-v2/produto/ISSUES-pre-existentes-fora-escopo-F02.md) | Débitos técnicos pré-existentes fora do escopo da F-02 |
| [`AUDITORIA-RECONCILIACAO-POS-v2.2.md`](./AUDITORIA-RECONCILIACAO-POS-v2.2.md) | Auditoria de reconciliação pós-v2.2 |

---

## Categoria 5 — Especificação de Produto

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
| [`GUIA-UAT-ADVOGADOS.md`](./product/cpie-v2/produto/GUIA-UAT-ADVOGADOS.md) | 7 cenários de teste UAT para advogados |
| [`docs/product/cpie-v2/README.md`](./product/cpie-v2/README.md) | README da documentação CPIE v2 |
| [`docs/product/cpie-v2/baseline-questionarios-rag.md`](./product/cpie-v2/baseline-questionarios-rag.md) | Baseline dos questionários RAG |

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

## Categoria 8 — Playbooks e Guias de Desenvolvimento

| Arquivo | Descrição |
|---|---|
| [`docs/PLAYBOOK-PLATAFORMA.md`](./PLAYBOOK-PLATAFORMA.md) | Playbook oficial de desenvolvimento — regras mandatórias |
| [`docs/SUPER-PROMPT-RECUPERACAO.md`](./SUPER-PROMPT-RECUPERACAO.md) | Super-prompt de recuperação de contexto |
| [`docs/DOCUMENTACAO-IA-GENERATIVA-v4.md`](./DOCUMENTACAO-IA-GENERATIVA-v4.md) | Documentação IA Generativa v4 |
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

| Categoria | Qtd. Documentos | Prioridade de Leitura |
|---|---|---|
| 1 — Governança e Reconstrução (v3.0) | 3 | 🔴 CRÍTICA — ler primeiro |
| 2 — Status Reports e Baseline | 5 | 🔴 CRÍTICA |
| 3 — ADRs | 9 | 🟠 ALTA |
| 4 — Relatórios e Auditorias | 7 | 🟠 ALTA |
| 5 — Especificação de Produto | 11 | 🟡 MÉDIA |
| 6 — Arquitetura Técnica | 10 | 🟡 MÉDIA |
| 7 — Operação e Infraestrutura | 10 | 🟢 BAIXA |
| 8 — Playbooks e Guias | 6 | 🟠 ALTA |
| 9 — Histórico de Sprints | 4 | 🟢 BAIXA |
| **Total** | **65** | — |

---

## Ordem de Leitura Recomendada (Onboarding de Novo Agente)

1. `docs/PO-GOVERNANCA-PIPELINE-v3.md` — entender o estado e as regras do P.O.
2. `docs/SKILL-MANUS-PIPELINE-v3.md` — assumir o modo operacional correto
3. `docs/PLAYBOOK-PLATAFORMA.md` — regras mandatórias de desenvolvimento
4. `docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md` — estado atual
5. `docs/REBUILD-PIPELINE-v3.md` — se precisar reconstruir
6. `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` — estratégia de migração ativa
7. `docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md` — Shadow Mode

---

*Gerado em 2026-03-23 | Commit HEAD: `40bf064` | Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
