# Documentação do Projeto — Plataforma de Compliance da Reforma Tributária

| Campo | Valor |
|---|---|
| **Versão** | 2.00 |
| **Data** | 23 de Março de 2026 |
| **Versão anterior** | 1.00 (commit `ce11698`, Sprint H, 21/03/2026) |
| **Commit HEAD** | `c92d5337` (branch `main`) |
| **Repositório** | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| **Domínio** | iasolaris.manus.space |
| **Status** | Em UAT — aguardando aprovação jurídica |

> **Sobre este documento:** A versão 1.00 foi gerada no commit `ce11698` (Sprint H, 21/03/2026) e inventariou os arquivos de documentação existentes até aquele momento. A versão 2.00 atualiza o inventário completo para o estado atual (`c92d5337`), incorporando 30+ commits, 8 ADRs, Shadow Mode, suite de validação automatizada (107/107), protocolo UAT, e todos os documentos gerados nas sprints v5.0 a v5.3.0.

---

## 1. Repositório GitHub

| Item | Valor |
|---|---|
| **Repositório principal** | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| **Branch ativa** | `main` — commit `c92d5337` (23/03/2026) |
| **Commit da v1.00** | `ce11698` (Sprint H, 21/03/2026) |
| **Commits desde v1.00** | 30+ commits |
| **Total de arquivos .md** | 120 (era ~65 na v1.00) |
| **Arquivos .docx** | 5 (novos desde v1.00) |
| **Histórico de commits** | /commits/main |

---

## 2. Arquivos na Raiz do Projeto

Os arquivos na raiz do projeto são documentos históricos de sprints anteriores (pré-v5.0). Foram preservados como registro histórico e não devem ser editados.

| Arquivo | Finalidade |
|---|---|
| `README.md` | Documentação técnica do template base (tRPC + Auth + DB) |
| `CHANGELOG.md` | Histórico de versões e mudanças |
| `BACKLOG.md` | Backlog de funcionalidades pendentes |
| `todo.md` | Lista de tarefas ativas por sprint (atualizado a cada checkpoint) |
| `TODO.md` / `TODO-MVP.md` | Versões anteriores do backlog |
| `PRD_COMPLETO_MVP_V2.md` | PRD completo do MVP v2 |
| `NOVOS_REQUISITOS_MVP.md` | Requisitos adicionais pós-MVP |
| `REQUISITOS-FUNCIONAIS-v2.md` | Requisitos funcionais v2 (histórico) |
| `REQUISITOS-FUNCIONAIS-v3.md` | Requisitos funcionais v3 (histórico) |
| `BASELINE.md` / `BASELINE-v2.1.md` / `baseline.md` | Baselines técnicas de versões anteriores |
| `SPRINT_RESUMO_FINAL.md` | Resumo consolidado das sprints |
| `SPRINT_V2_STATUS.md` | Status da Sprint v2 |
| `SPRINT_ORDEM_DEPENDENCIAS.md` | Ordem de dependências entre sprints |
| `TABELA_IMPLEMENTACAO_CORRIGIDA.md` | Tabela corrigida de implementação |
| `PROPOSTA-NOVO-FLUXO-V2.md` | Proposta do novo fluxo v2 |
| `MASTER-FRAMEWORK-v2.1.md` / `DEV-FRAMEWORK-v2.1.md` | Framework de desenvolvimento |
| `AUDIT-REPORT.md` / `AUDITORIA-BUGS-MELHORIAS.md` | Relatórios de auditoria |
| `KNOWN-ISSUES.md` / `erros-conhecidos.md` | Issues conhecidos |
| `LICOES-APRENDIDAS.md` | Lições aprendidas por sprint |
| `ROLLBACK.md` | Procedimento de rollback |
| `RELATORIO-DEBUGGING-BUGFIX.md` | Relatório de debugging |
| `BUG-ROOT-CAUSE-FOUND.md` / `BUG-TRANSICAO-ANALISE.md` | Análise de bugs críticos |
| `BUGS-E2E.md` / `BUGS-E2E-FOUND.md` / `BUGS_POS_CONCLUSAO.md` / `ANALISE-BUGS-E2E.md` | Bugs encontrados em E2E |
| `PLANO-TESTE-E2E.md` / `TESTE-E2E-FINAL.md` / `TESTE-IA-LLM.md` | Planos e resultados de testes |
| `QA-E2E-REPORT.md` / `RELATORIO-E2E-QA.md` / `RELATORIO-E2E-QA-FINAL.md` / `RELATORIO-FINAL-TESTES-E2E.md` / `RESUMO-TESTES-E2E.md` / `EVIDENCIAS-TESTE-E2E.md` | Relatórios QA E2E |
| `test-results-v1.0.txt` | Resultados de testes v1.0 |

---

## 3. Pasta `docs/` — Documentação Ativa

### 3.1 Governança e Reconstrução (v3.0) — CRÍTICO

Documentos gerados a partir do `documentacao-para-rollback-rag-v1.00.docx`. São o **source of truth** para governança, reconstrução e execução do agente. Leitura obrigatória antes de qualquer nova sprint.

| Arquivo | Finalidade | Audiência |
|---|---|---|
| `docs/INDICE-DOCUMENTACAO.md` | Índice mestre de 65+ documentos em 9 categorias — ponto de entrada para onboarding | P.O. + Agente |
| `docs/PO-GOVERNANCA-PIPELINE-v3.md` | Visão de P.O.: estado real, roadmap, critérios de produção, decisões de produto | P.O. + Orquestrador |
| `docs/REBUILD-PIPELINE-v3.md` | Guia de reconstrução completa da pipeline em caso de desastre ou perda de contexto | Agente + P.O. |
| `docs/SKILL-MANUS-PIPELINE-v3.md` | Skill técnico permanente do agente: 11 módulos de governança, persistência, QA e compliance | Agente |

### 3.2 Playbooks e Guias de Desenvolvimento — ALTA PRIORIDADE

| Arquivo | Finalidade |
|---|---|
| `docs/PLAYBOOK-PLATAFORMA.md` | Playbook operacional da plataforma — regras mandatórias de desenvolvimento |
| `docs/SUPER-PROMPT-RECUPERACAO.md` | Super-prompt de recuperação de contexto |
| `docs/QA-HUMANO-v2.3.md` | Guia de QA humano v2.3 |
| `docs/DEPLOY-GUIDE.md` | Guia de deploy |
| `docs/OBSERVABILITY.md` | Observabilidade e monitoramento |
| `docs/IA_Levantamento_Inicial.md` | Levantamento inicial de IA |
| `docs/funcionalidade-planos-por-ramo.md` | Funcionalidade de planos por ramo |

### 3.3 Baselines e Status Reports

| Arquivo | Data | Finalidade |
|---|---|---|
| `docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md` | 23/03/2026 | Status report completo + baseline técnica (commit `40bf064`) |
| `docs/product/cpie-v2/produto/STATUS-BASELINE-PROPOSTA-TESTES.md` | 23/03/2026 | Status report pré-Shadow Mode + proposta UAT |
| `docs/BASELINE-v2.2.md` | — | Baseline técnica v2.2 |
| `docs/BaselineTecnica-v2.1.md` | — | Baseline técnica v2.1 |
| `docs/AUDITORIA-RECONCILIACAO-POS-v2.2.md` | — | Auditoria de reconciliação pós-v2.2 |
| `docs/SPRINT-STATUS-REPORT.md` | — | Histórico de status de sprints |

### 3.4 ADRs (Architecture Decision Records) — IMUTÁVEIS APÓS APROVAÇÃO

| ADR | Título | Status |
|---|---|---|
| `ADR-001-arquitetura-diagnostico.md` | Arquitetura do diagnóstico — fluxos V1 e V3 | ✅ Aprovado |
| `ADR-002-plano-implementacao-rollback.md` | Plano de implementação com rollback | ✅ Aprovado |
| `ADR-003-exaustao-de-riscos.md` | Exaustão de riscos — gap → risco determinístico | ✅ Aprovado |
| `ADR-004-fonte-de-verdade-diagnostico.md` | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| `ADR-005-isolamento-fisico-diagnostico.md` | Isolamento físico do diagnóstico — `getDiagnosticSource()` | ✅ Aprovado |
| `ADR-006-relatorio-validacao-pratica-adr005.md` | Relatório de validação prática do ADR-005 | ✅ Aprovado |
| `ADR-007-gate-limpeza-retrocesso.md` | Gate de limpeza no retrocesso — `cleanupOnRetrocesso()` | ✅ Aprovado |
| `ADR-008-F04-schema-migration-strategy.md` | Estratégia de migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| ADR-009 (ver relatório) | Shadow Mode — comparação background V1/V3 | ✅ Implementado |

### 3.5 Relatórios Técnicos e Auditorias

| Arquivo | Finalidade |
|---|---|
| `RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md` | **[NOVO]** Relatório completo Onda 1+2 — 107/107 testes |
| `RELATORIO-FINAL-SHADOW-MODE-ADR009.md` | Relatório técnico completo do Shadow Mode — 12 seções |
| `RELATORIO-ROLLBACK-DRILL-F04.md` | Validação determinística do rollback da F-04 — 6 etapas |
| `RELATORIO-AUDITORIA-SPRINT-FINAL.md` | Auditoria pós-sprint: Issues #54, #55, #59 |
| `RELATORIO-ONDA1-10-TESTES-2026-03-23.md` | **[NOVO]** Relatório Onda 1 — 75/75 testes |
| `RELATORIO-ONDA2-STRESS-2026-03-23.md` | **[NOVO]** Relatório Onda 2 — 32/32 testes de stress |
| `RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md` | Aprovação formal do Orquestrador com restrições |
| `RESPOSTA-AUDITORIA-POS-HANDOFF.md` | Validação técnica pós-handoff: Issues #54/#55 + ADR-008 |
| `ISSUES-pre-existentes-fora-escopo-F02.md` | Débitos técnicos pré-existentes fora do escopo da F-02 |
| `DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md` | **[NOVO]** Diagnóstico UAT-001 — fluxo de questionário |

### 3.6 Documentação de Produto — Especificação Funcional

| Arquivo | Finalidade |
|---|---|
| `docs/product/cpie-v2/produto/01-product-spec.md` | Especificação completa do produto |
| `docs/product/cpie-v2/produto/02-modelo-conceitual.md` | Modelo conceitual do sistema |
| `docs/product/cpie-v2/produto/03-decision-contract.md` | Contrato de decisões do produto |
| `docs/product/cpie-v2/produto/04-matriz-de-regras.md` | Matriz de regras de negócio |
| `docs/product/cpie-v2/produto/05-fluxo-e2e.md` | Fluxo end-to-end do usuário |
| `docs/product/cpie-v2/produto/06-ux-states.md` | Estados de UX e transições |
| `docs/product/cpie-v2/produto/07-ux-guidelines.md` | Diretrizes de UX |
| `docs/product/cpie-v2/produto/08-risk-model.md` | Modelo de risco do produto |
| `docs/product/cpie-v2/README.md` | README da documentação CPIE v2 |
| `docs/product/cpie-v2/baseline-questionarios-rag.md` | Baseline dos questionários RAG |
| `docs/product/cpie-v2/cenarios/09-matriz-de-cenarios.md` | Matriz de cenários de teste |

### 3.7 Documentos de Versão Atual (v5.x) — NOVOS DESDE v1.00

| Arquivo | Versão | Finalidade |
|---|---|---|
| `REQUISITOS-FUNCIONAIS-v6.md` + `.docx` | **v6.0** | 153 RFs em 24 seções — incorpora ADR-005 a ADR-008, Shadow Mode, Onda 1+2, UAT |
| `DOCUMENTACAO-IA-GENERATIVA-v5.md` + `.docx` | **v5.0** | 23 seções — pipeline completo, diagnóstico dual, Shadow Mode, suite de validação |
| `PLAYBOOK-DA-PLATAFORMA-v3.md` + `.docx` | **v3.0** | 15 seções — ADRs, Shadow Mode, Onda 1+2, UAT, padrões createPool e JSON nativo |
| `projeto-compliance-reforma-tributaria-v2.00.md` + `.docx` | **v2.00** | Documento de projeto atualizado — reposicionamento CNAE→requisitos regulatórios |
| `snapshot-plataforma-reforma-tributaria-v2.00.md` + `.docx` | **v2.00** | Snapshot operacional — auditoria v2.3 aprovada, evolução v2.3→v5.3.0 |
| `documentacao-projeto-plataforma-reforma-tributaria-v2.00.md` + `.docx` | **v2.00** | **Este documento** — inventário completo atualizado |

### 3.8 UAT e Distribuição — NOVOS DESDE v1.00

| Arquivo | Finalidade |
|---|---|
| `GUIA-UAT-ADVOGADOS-v2.md` | Guia UAT v2 — 8 cenários, critérios de aceite, formulário de feedback, cronograma 4 dias |
| `GUIA-UAT-ADVOGADOS.md` | Guia UAT v1 (histórico) |
| `EMAIL-MODELO-CONVITE-UAT.md` | E-mail modelo de convite para advogados testadores |
| `SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md` | Baseline Shadow Monitor T=0 — protocolo de verificação 48-72h |

### 3.9 Arquitetura Técnica

| Arquivo | Finalidade |
|---|---|
| `docs/product/cpie-v2/tecnico/10-arquitetura-geral.md` | Arquitetura geral do sistema |
| `docs/product/cpie-v2/tecnico/11-pipeline-cpie-v2.md` | Pipeline CPIE v2 detalhada |
| `docs/product/cpie-v2/tecnico/12-contrato-de-apis.md` | Contrato de APIs tRPC |
| `docs/product/cpie-v2/tecnico/13-schema-banco.md` | Schema do banco de dados |
| `docs/product/cpie-v2/tecnico/14-single-source-of-truth.md` | Single source of truth — `getDiagnosticSource()` |
| `docs/product/cpie-v2/tecnico/15-fluxo-de-estado.md` | Fluxo de estado e state machine |
| `docs/product/cpie-v2/tecnico/16-regras-de-cta.md` | Regras de CTA (call to action) |
| `docs/architecture/canonical-requirements.md` | Requisitos canônicos (499 requisitos em 9 domínios) |
| `docs/architecture/cnae-pipeline.md` | Pipeline CNAE: discover/refine/confirm |
| `docs/architecture/question-mapping-engine.md` | Motor de mapeamento de perguntas |

### 3.10 Operação e Infraestrutura

| Arquivo | Finalidade |
|---|---|
| `docs/product/cpie-v2/operacao/17-plano-de-backup.md` | Plano de backup |
| `docs/product/cpie-v2/operacao/18-disaster-recovery.md` | Plano de disaster recovery |
| `docs/product/cpie-v2/operacao/19-versionamento-cpie.md` | Estratégia de versionamento |
| `docs/product/cpie-v2/operacao/20-rollback-plan.md` | Plano de rollback |
| `docs/product/cpie-v2/operacao/21-bootstrap-sistema.md` | Bootstrap do sistema |
| `docs/product/cpie-v2/operacao/22-metrica-ice.md` | Métrica ICE de priorização |
| `docs/product/cpie-v2/operacao/23-plano-de-testes-continuos.md` | Plano de testes contínuos |
| `docs/product/cpie-v2/operacao/24-data-governance.md` | Governança de dados |

### 3.11 Histórico de Sprints

| Arquivo | Finalidade |
|---|---|
| `docs/SPRINT-HISTORICO-MENU-QUESTIONARIOS.md` | Histórico da sprint de menu e questionários |
| `docs/sprints/sprint-regulatory-engine-v1.md` | Sprint do Regulatory Engine v1 |
| `docs/sprints/v6.0-baseline.md` | Baseline v6.0 |

---

## 4. Arquivos de Código — Estrutura Técnica Atual

### 4.1 Routers tRPC (server/routers/)

| Arquivo | Finalidade |
|---|---|
| `cpieRouter.ts` | Diagnóstico CPIE v1 (fluxo legado) |
| `cpieV2Router.ts` | Diagnóstico CPIE v2 (fluxo V3 com 499 requisitos canônicos) |
| `flowRouter.ts` | Orquestração do fluxo — state machine, persistência, retomada |
| `consistencyRouter.ts` | Consistency Engine — gate crítico/alto/médio/baixo |
| `gapRouter.ts` | Gap Engine — mapeamento requisito → gap |
| `riskRouter.ts` | Risk Engine — gap → risco determinístico |
| `diagnostic.ts` | Adaptador `getDiagnosticSource()` — roteamento V1/V3 |
| `shadowMode.ts` | Shadow Mode — comparação background e métricas de divergência |

### 4.2 Suites de Teste Automatizado (server/)

| Arquivo | Onda | Asserções | Foco |
|---|---|---|---|
| `onda1-t01-t05.test.ts` | Onda 1 | 37 | Criação paralela, race conditions, retrocesso, persistência, limpeza |
| `onda1-t06-t10.test.ts` | Onda 1 | 38 | Leituras concorrentes, integridade, auditoria, permissões, rollback |
| `onda2-t11-carga.test.ts` | Onda 2 | 9 | 50 projetos em paralelo, race conditions extremas |
| `onda2-t12-t13.test.ts` | Onda 2 | 13 | Integridade de CNAEs e respostas, idempotência |
| `onda2-t14-retrocesso.test.ts` | Onda 2 | 10 | Retrocesso múltiplo acumulado, loop adversarial 10x |
| `auth.logout.test.ts` | — | — | Referência de teste de autenticação |

### 4.3 Schema do Banco (drizzle/schema.ts)

O schema atual contém **64 tabelas** organizadas em 6 grupos funcionais:

| Grupo | Tabelas Principais | Finalidade |
|---|---|---|
| Usuários e Auth | `users`, `sessions` | Autenticação OAuth + sessões |
| Projetos | `projects`, `projectAuditLog` | Projetos de compliance + auditoria de transições |
| Diagnóstico V1 | `diagnostics`, `diagnosticRisks`, `diagnosticGaps` | Fluxo legado |
| Diagnóstico V3 | `diagnosticsV3`, `diagnosticRisksV3`, `diagnosticGapsV3`, `questionnaireAnswersV3` | Fluxo novo com 499 requisitos canônicos |
| CNAE | `cnaes`, `cnaeEmbeddings`, `projectCnaes` | Motor CNAE com 1.332 embeddings |
| Shadow Mode | `diagnostic_shadow_divergences` | Monitoramento de divergências V1/V3 |

---

## 5. Estado Atual da Plataforma (23/03/2026)

### 5.1 Métricas de Produção

| Indicador | Valor |
|---|---|
| Projetos criados | 2.145 |
| Usuários cadastrados | 1.497 |
| Projetos em andamento | 139 |
| Projetos em avaliação | 46 |
| Projetos aprovados | 21 |
| CNAEs com embedding | 1.332 / 1.332 (100%) |
| Documentos no corpus RAG | 1.241 |
| Tabelas no schema | 64 |
| Testes automatizados | **107 / 107 ✅** |
| ADRs publicados | 8 (+ ADR-009 implementado) |
| Arquivos .md no repositório | 120 |
| Checkpoints de segurança | 11 |

### 5.2 Shadow Mode

| Indicador | Valor | Status |
|---|---|---|
| Total de divergências | 274 | Esperado (projetos pré-v2.1) |
| Divergências críticas | 0 | ✅ Seguro |
| Projetos UAT com divergência | 0 | ✅ Seguro |
| `DIAGNOSTIC_READ_MODE` atual | `shadow` | Monitoramento ativo |

### 5.3 Checkpoints de Segurança (Histórico)

| Versão | Commit | Descrição |
|---|---|---|
| v5.3.0 | `c92d5337` | Snapshot v2.00 + documentação completa |
| v5.3.0 | `c31a5b4e` | Projeto v2.00 + Playbook v3.0 |
| v5.3.0 | `0774db0c` | REQUISITOS-v6.0 + DOCUMENTACAO-IA-v5.0 |
| v5.3.0 | `3a49480b` | Kit distribuição UAT completo |
| v5.3.0 | `1f079c80` | Guia UAT v2 + Baseline Shadow Monitor |
| v5.3.0 | `270f5f78` | Relatório Onda 1+2 completo |
| v5.3.0 | `d19d193b` | Onda 2 completa — 32/32 |
| v5.2.0 | `f22af02` | Onda 1 completa — 75/75 |
| v5.1.0 | `d8c5d0f` | fix(UAT-002): dual-read V3/V1 |
| v5.0.0 | `5a62c27` | fix(UAT-001): navegação v2.1 |
| v4.5.0 | `0e1046c` | Preparação UAT — 3 entregáveis |

---

## 6. Evolução desde a v1.00 (ce11698 → c92d5337)

A versão 1.00 deste documento (commit `ce11698`, Sprint H, 21/03/2026) inventariou os arquivos existentes até aquele momento. As principais adições desde então foram:

**Sprints v5.0 a v5.3.0 (21/03/2026 a 23/03/2026):**

1. **Shadow Mode completo** — Dashboard `/admin/shadow-monitor`, variável `DIAGNOSTIC_READ_MODE`, tabela `diagnostic_shadow_divergences`, 4 métricas em tempo real, gráfico de evolução 24h.

2. **Onda 1 de testes (75/75)** — 10 suites cobrindo criação paralela, race conditions, retrocesso, persistência, limpeza, leituras concorrentes, integridade, auditoria, permissões e rollback.

3. **Onda 2 de testes (32/32)** — 4 suites de stress: 50 projetos em paralelo (141ms), 35 inserts CNAE concorrentes (67ms), retrocesso múltiplo acumulado, loop adversarial 10x. 0 deadlocks.

4. **Correções UAT-001 e UAT-002** — Navegação quebrada após refatoração para 3 camadas de diagnóstico (UAT-001) e dual-read V3/V1 no `diagnostic-source` (UAT-002).

5. **Pacote de governança v3.0** — `PO-GOVERNANCA-PIPELINE-v3.md`, `REBUILD-PIPELINE-v3.md`, `SKILL-MANUS-PIPELINE-v3.md`, `INDICE-DOCUMENTACAO.md`.

6. **Kit UAT completo** — `GUIA-UAT-ADVOGADOS-v2.md` (8 cenários), `EMAIL-MODELO-CONVITE-UAT.md`, `SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md`.

7. **Documentação v5.x** — `REQUISITOS-FUNCIONAIS-v6.md`, `DOCUMENTACAO-IA-GENERATIVA-v5.md`, `PLAYBOOK-DA-PLATAFORMA-v3.md`, `projeto-compliance-reforma-tributaria-v2.00.md`, `snapshot-plataforma-reforma-tributaria-v2.00.md` — todos em `.md` e `.docx`.

---

## 7. Ordem de Leitura Recomendada (Onboarding de Novo Agente)

Para um novo agente ou desenvolvedor assumir o projeto com contexto completo, a ordem de leitura recomendada é:

1. `docs/INDICE-DOCUMENTACAO.md` — mapa completo de todos os documentos
2. `docs/PO-GOVERNANCA-PIPELINE-v3.md` — estado real e regras do P.O.
3. `docs/SKILL-MANUS-PIPELINE-v3.md` — modo operacional correto do agente
4. `docs/PLAYBOOK-PLATAFORMA.md` — regras mandatórias de desenvolvimento
5. `docs/product/cpie-v2/produto/STATUS-REPORT-BASELINE-2026-03-23.md` — estado atual
6. `docs/REBUILD-PIPELINE-v3.md` — se precisar reconstruir do zero
7. `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` — estratégia de migração ativa
8. `docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md` — Shadow Mode

---

## 8. Próximos Passos (Sprint v5.4.0)

| Prioridade | Item | Critério de Conclusão |
|---|---|---|
| **Crítica** | Aprovação do UAT | ≥ 80% de aprovação nos 8 cenários + 0 erros críticos de fluxo |
| **Crítica** | Ativar modo `new` | Após aprovação UAT — alterar `DIAGNOSTIC_READ_MODE=new` |
| **Alta** | F-04 Schema Migration | Consolidar dados V1 em V3 (ADR-008) |
| **Alta** | Radar de compliance | Score por domínio + visualização (Fase 2 do projeto) |
| **Média** | Limpar projetos de teste | `DELETE FROM projects WHERE name LIKE '[ONDA%]'` |
| **Baixa** | Corrigir log do health check | `tsc --watch` interno mostra erro stale do `tsbuildinfo` |

---

*Documento atualizado em 23/03/2026 — IA SOLARIS Compliance Tributária*
*Versão anterior: v1.00 (commit `ce11698`, Sprint H, 21/03/2026)*
*Próxima atualização: Após aprovação do UAT (26/03/2026)*
