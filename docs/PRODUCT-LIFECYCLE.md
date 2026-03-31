# PRODUCT-LIFECYCLE.md
**IA SOLARIS — Navegação por Ciclo de Vida do Produto**

> **Versão:** 1.4 — 2026-03-31
> **Repositório:** https://github.com/Solaris-Empresa/compliance-tributaria-v2
> **Depende de:** [INDICE-DOCUMENTACAO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/INDICE-DOCUMENTACAO.md) · [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md)
> **Aprovador:** Product Owner Uires Tapajós
> **Última sprint concluída:** Sprint M (UAT E2E + BUG-UAT-02/03/05) — 2026-03-31 · HEAD `2f17184`  
> **PRs mergeados:** #254 (BUG-UAT-03 fix) · #256 (E2E Playwright + BUG-UAT-05 + auth.testLogin)  
> **Próxima sprint:** Sprint L — Issue #191 (G16 Upload CSV SOLARIS)  
> **Próxima revisão:** ao final da Sprint L

---

## Como usar este documento

Este não é um índice alfabético. É um **mapa de execução com autoridade de decisão**. Cada fase tem: objetivo claro · documentos obrigatórios · documentos de referência · critério de saída (gate) com aprovador e critério de bloqueio.

**Regra de uso:** Leia o que a sua fase exige. Avance **somente** quando o gate estiver satisfeito e o aprovador tiver confirmado. Gates sem aprovação são decorativos — não avance sem ela.

---

## Personas de Leitura Rápida

| Quem você é | Comece aqui |
|---|---|
| **P.O.** | Fase 6 (Release) → Fase 7 (Operação) → Fase 0 (Regulatório) → Fase 1 (próximo ciclo) |
| **Agente / Dev novo** | **Onboarding obrigatório abaixo** → Fase 4 (Implementação) → Fase 3 (Arquitetura) |
| **Orquestrador** | Fase 0 (Regulatório) → Fase 1 (Planejamento) → Fase 4 (Gate de saída) → Fase 6 (Release) |
| **QA / Auditor** | Fase 5 (Validação) → Fase 2 (ADRs) |
| **Advogado (UAT)** | Fase 5 — apenas documentos marcados `[UAT]` |
| **Incidente em produção** | Fluxo de Exceção — Incidentes (após Fase 7) |
| **Mudança legislativa urgente** | Fluxo de Exceção — Mudança Regulatória (após Fase 7) |

---

## Onboarding Obrigatório — Novo Agente

Execute nesta ordem sem pular etapas:

```
1. docs/governance/ESTADO-ATUAL.md                          → LEIA PRIMEIRO — estado real do repositório
2. docs/BASELINE-PRODUTO.md                                 → baseline v2.4 (Sprint M)
3. docs/HANDOFF-MANUS.md                                    → regras operacionais do Manus
4. docs/governance/HANDOFF-IMPLEMENTADOR.md                 → guia completo do implementador (v1.1)
5. docs/governance/GATE-CHECKLIST.md                        → gates obrigatórios
6. docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md → migração ativa
7. docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md    → Shadow Mode
8. docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md → validação
9. tests/e2e/README.md                                      → suites E2E Playwright CT-01/04/06/07/37 (Sprint M)
```

---

## Fase 0 — Atualização Regulatória

**Objetivo:** Garantir que o corpus de requisitos canônicos está atualizado antes de qualquer sprint. Este produto opera sobre legislação tributária em evolução — um produto tecnicamente correto pode estar juridicamente desatualizado.

**Quando entrar:** Antes de qualquer sprint. Obrigatório ao início de cada trimestre e sempre que houver notícia de mudança na LC 214/2025 ou LC 227/2025.

**Responsável:** P.O. + Equipe Jurídica

**Verificações obrigatórias:**

| Verificação | Documento de referência |
|---|---|
| Houve alteração na LC 214/2025 ou LC 227/2025 desde a última sprint? | [canonical-requirements.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/architecture/canonical-requirements.md) |
| Os 499 requisitos canônicos estão atualizados? | [canonical-requirements.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/architecture/canonical-requirements.md) |
| Alguma interpretação regulatória mudou que afete gaps ou riscos gerados? | [04-matriz-de-regras.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/04-matriz-de-regras.md) · [08-risk-model.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/08-risk-model.md) |

**Gate de saída — Fase 0**

> **Aprovador:** P.O.
> **Critério de bloqueio:** Mudança regulatória identificada sem ADR correspondente criado.
> **Escalação:** Se mudança urgente, acionar Fluxo de Exceção — Mudança Regulatória (ver abaixo).

- [ ] P.O. confirma: corpus regulatório está atual para esta sprint
- [ ] Se houve mudança: ADR de atualização regulatória criado antes de avançar para Fase 1

---

## Fase 1 — Descoberta e Requisitos

**Objetivo:** Entender o que precisa ser construído e por quê.

**Quando entrar:** Início de produto, nova feature ou expansão de escopo. Sempre após a Fase 0.

**Leitura obrigatória:**

| Documento | Descrição |
|---|---|
| [REQUISITOS-FUNCIONAIS-v6.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md) | 153 RFs em 24 seções — fonte de verdade dos requisitos |
| [canonical-requirements.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/architecture/canonical-requirements.md) | 499 requisitos canônicos |
| [projeto-compliance-reforma-tributaria-v2.00.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/projeto-compliance-reforma-tributaria-v2.00.md) | Escopo e posicionamento do produto |

**Referência:**

| Documento | Descrição |
|---|---|
| [01-product-spec.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/01-product-spec.md) | Especificação completa |
| [04-matriz-de-regras.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/04-matriz-de-regras.md) | Regras de negócio |
| [08-risk-model.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/08-risk-model.md) | Modelo de risco |
| [cnae-pipeline.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/architecture/cnae-pipeline.md) | Pipeline CNAE: discover/refine/confirm |

**Gate de saída — Fase 1**

> **Aprovador:** P.O.
> **Critério de bloqueio:** Escopo não documentado ou requisitos afetados não identificados.
> **Escalação:** P.O. decide se a sprint pode começar com escopo parcial ou deve aguardar clareza.

- [ ] Escopo da fase/sprint documentado e aprovado pelo P.O.
- [ ] Requisitos afetados identificados em REQUISITOS-FUNCIONAIS-v6
- [ ] Fase 0 concluída (corpus regulatório confirmado como atual)

---

## Fase 2 — Decisões de Arquitetura (ADRs)

**Objetivo:** Registrar e consultar decisões técnicas formais. ADRs são **imutáveis após aprovação**.

**Quando entrar:** Antes de qualquer mudança arquitetural. Consulta obrigatória antes de implementar.

**ADRs ativos:**

| ADR | Título resumido | Status |
|---|---|---|
| [ADR-001](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-001-arquitetura-diagnostico.md) | Arquitetura do diagnóstico (V1/V3) | ✅ Aprovado |
| [ADR-002](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-002-plano-implementacao-rollback.md) | Plano de implementação com rollback | ✅ Aprovado |
| [ADR-003](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-003-gap-risco-deterministico.md) | Gap → risco determinístico | ✅ Aprovado |
| [ADR-004](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-004-fonte-verdade-diagnostico.md) | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| [ADR-005](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-005-isolamento-fisico.md) | Isolamento físico — getDiagnosticSource() | ✅ Aprovado |
| [ADR-006](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-006-validacao-pratica-adr005.md) | Validação prática do ADR-005 | ✅ Aprovado |
| [ADR-007](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/adr/ADR-007-gate-limpeza-retrocesso.md) | Gate de limpeza no retrocesso | ✅ Aprovado |
| [ADR-008](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md) | Migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| [ADR-009](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md) | Shadow Mode — comparação background | ✅ Implementado |

**Gate de saída — Fase 2**

> **Aprovador:** Agente (técnico) + P.O. (impacto de produto)
> **Critério de bloqueio:** Decisão arquitetural nova implementada sem ADR correspondente.
> **Escalação:** Reverter a implementação e criar o ADR antes de prosseguir.

- [ ] Nenhuma decisão arquitetural nova tomada sem ADR correspondente
- [ ] ADR afetado consultado antes de qualquer alteração no componente

---

## Fase 3 — Arquitetura e Design

**Objetivo:** Entender como o sistema funciona antes de construir.

**Quando entrar:** Após ADRs relevantes consultados. Obrigatório para novos agentes antes da Fase 4.

**Leitura obrigatória:**

| Documento | Descrição |
|---|---|
| [10-arquitetura-geral.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/10-arquitetura-geral.md) | Visão geral do sistema |
| [11-pipeline-cpie-v2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/11-pipeline-cpie-v2.md) | Pipeline detalhada |
| [14-single-source-of-truth.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/14-single-source-of-truth.md) | getDiagnosticSource() (ADR-005) |
| [15-fluxo-de-estado.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/15-fluxo-de-estado.md) | State machine e fluxo de estados |

**Referência:**

| Documento | Descrição |
|---|---|
| [02-modelo-conceitual.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/02-modelo-conceitual.md) | Modelo conceitual |
| [12-contrato-de-apis.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/12-contrato-de-apis.md) | Contrato tRPC |
| [13-schema-banco.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/13-schema-banco.md) | Schema do banco |
| [question-mapping-engine.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/architecture/question-mapping-engine.md) | Motor de mapeamento de perguntas |
| [05-fluxo-e2e.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/05-fluxo-e2e.md) | Fluxo end-to-end do usuário |

**Gate de saída — Fase 3**

> **Aprovador:** Agente
> **Critério de bloqueio:** Componente afetado não mapeado na arquitetura geral.
> **Escalação:** Documentar o componente antes de implementar.

- [ ] Componente afetado pelo trabalho mapeado na arquitetura-geral
- [ ] Contrato de API e schema verificados antes de qualquer implementação

---

## Fase 4 — Implementação

**Objetivo:** Construir seguindo os padrões mandatórios da plataforma.

**Quando entrar:** Após Fases 0, 2 e 3 para o escopo da sprint.

**Leitura obrigatória:**

| Documento | Descrição |
|---|---|
| [PLAYBOOK-PLATAFORMA.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/PLAYBOOK-PLATAFORMA.md) | Regras mandatórias de desenvolvimento (leitura completa) |
| [SKILL-MANUS-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/SKILL-MANUS-PIPELINE-v3.md) | Skill técnico do agente: 11 módulos |
| [DOCUMENTACAO-IA-GENERATIVA-v5.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md) | Pipeline completa, diagnóstico dual |

**Governança da sprint:**

| Documento | Descrição |
|---|---|
| [PLAYRUN-TEMPLATE.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/playruns/PLAYRUN-TEMPLATE.md) | Template obrigatório para registrar execução |
| [invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) | 8 invariants (INV-001..INV-008) com comandos de verificação |
| [PO-GOVERNANCA-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/PO-GOVERNANCA-PIPELINE-v3.md) | Regras do P.O. e estado real |

**Gate de saída — Fase 4**

> **Aprovador:** Agente (técnico) + P.O. (QA humano de frontend — Regra 4 do Playbook) + Orquestrador (verificação independente via repositório real)
> **Critério de bloqueio:** Qualquer item do DoD não satisfeito. Testes abaixo de 100%. TypeScript com erros.
> **Escalação:** Nenhum item pode ser marcado como DONE sem satisfazer todos os critérios abaixo.

> **Verificação independente (Orquestrador):** Antes de aprovar o gate, o Orquestrador lê o repositório real e verifica: (1) commit existe com o conteúdo reportado; (2) testes passando no CI; (3) nenhum invariant violado. Report do Manus não substitui leitura direta do código.

- [ ] Código funcionando e TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Testes vitest escritos e passando (100%)
- [ ] Persistência validada no banco
- [ ] Evidência visual (screenshot ou log) — QA humano do P.O.
- [ ] Checkpoint salvo
- [ ] Playrun criado e preenchido ao final da sprint
- [ ] Todos os invariants verificados (comandos do invariant-registry)
- [ ] BASELINE-PRODUTO.md atualizado

> ⚠️ **Lacuna ativa:** Não existe um `DEFINITION-OF-DONE.md` formal nem um `CONTRIBUTING.md`.
> Criar `docs/DEFINITION-OF-DONE.md` é ação de alta prioridade para o próximo ciclo.

---

## Fase 5 — Validação (QA, Testes, UAT)

**Objetivo:** Garantir confiabilidade antes de qualquer release.

**Quando entrar:** Após implementação. Antes de qualquer decisão go/no-go.

**Suíte de testes — estado atual:**

| Documento | Cobertura |
|---|---|
| [RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md) | 107/107 testes (Ondas 1+2) |
| [FASE2-E2E-VALIDATION-REPORT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/FASE2-E2E-VALIDATION-REPORT.md) | 132 testes E2E, 10 cenários × 8 blocos |
| [RELATORIO-FINAL-SHADOW-MODE-ADR009.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RELATORIO-FINAL-SHADOW-MODE-ADR009.md) | Shadow Mode completo |
| [tests/e2e/README.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/tests/e2e/README.md) | **Sprint M** — 5 suites Playwright: CT-01, CT-04, CT-06, CT-07, CT-37 |

**Autoauditoria e QA:**

| Documento | Descrição |
|---|---|
| [AUTOAUDITORIA-QUESTIONARIOS-v1.1.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/AUTOAUDITORIA-QUESTIONARIOS-v1.1.md) ⭐ | Última versão — GO para UAT |
| [POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) | BUG-001 + OBS-002 corrigidos |
| [QA-HUMANO-v2.3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/QA-HUMANO-v2.3.md) | Guia de QA humano |

**UAT com advogados `[UAT]`:**

| Documento | Descrição |
|---|---|
| [GUIA-UAT-ADVOGADOS-v2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md) `[UAT]` | 8 cenários, critérios de aceite, cronograma 4 dias |
| [SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md) | Baseline T=0, protocolo 48-72h |
| [EMAIL-MODELO-CONVITE-UAT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/EMAIL-MODELO-CONVITE-UAT.md) | Modelo de convite |

**Gate de saída — Fase 5**

> **Aprovador:** P.O. (decisão GO/NO-GO) + Equipe Jurídica (validação UAT)
> **Critério de bloqueio:** Qualquer teste obrigatório falhando. Qualquer BUG de severidade P0 ou P1 aberto. Shadow Monitor com divergências críticas acima do baseline.
> **Escalação:** NO-GO documentado em ERROS-CONHECIDOS com plano de correção e prazo.

- [ ] 100% testes obrigatórios passando
- [ ] Autoauditoria com status GO
- [ ] Shadow Monitor: divergências críticas = 0 (baseline: 203 divergências esperadas do tipo "legada tem valor, nova é null")
- [ ] Nenhum BUG aberto de severidade P0 ou P1
- [ ] UAT com advogados concluído e feedbacks documentados no Playrun

---

## Fase 6 — Release / Go-Live

**Objetivo:** Decidir e executar o release com rastreabilidade completa e janela de observação.

**Quando entrar:** Após gate da Fase 5 satisfeito e aprovado pelo P.O.

**Documentos de decisão:**

| Documento | Descrição |
|---|---|
| [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md) ⭐ | Estado atual do produto — atualizar antes do release |
| [POS-AUTOAUDITORIA-RELATORIO-FINAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/issues/POS-AUTOAUDITORIA-RELATORIO-FINAL.md) | Decisão formal GO/NO-GO |
| [snapshot-plataforma-reforma-tributaria-v2.00.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/snapshot-plataforma-reforma-tributaria-v2.00.md) | Snapshot operacional completo |

**Execução do release:**

| Documento | Descrição |
|---|---|
| [DEPLOY-GUIDE.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/DEPLOY-GUIDE.md) | Guia de deploy |
| [20-rollback-plan.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/20-rollback-plan.md) | Plano de rollback |
| [19-versionamento-cpie.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/19-versionamento-cpie.md) | Estratégia de versionamento |

**Janela de observação pós-release:**

| Critério | Valor | Ação |
|---|---|---|
| Shadow Mode mínimo antes de considerar estável | 48h | Monitorar divergências |
| Critério de rollback automático | > 5 divergências críticas em 24h | Executar rollback sem decisão humana |
| Critério de rollback manual | Qualquer incidente P0 nas primeiras 72h | P.O. decide rollback |
| Comunicação de mudança para usuários | Antes do deploy | ⚠️ Template pendente de criação |

**Gate de saída — Fase 6**

> **Aprovador:** P.O.
> **Critério de bloqueio:** GO/NO-GO não documentado. BASELINE-PRODUTO.md não atualizado. Snapshot não registrado. Janela de observação não iniciada.
> **Escalação:** Nenhum release sem aprovação explícita do P.O. documentada.

- [ ] GO/NO-GO documentado e aprovado pelo P.O.
- [ ] BASELINE-PRODUTO.md atualizado para nova versão
- [ ] Snapshot pós-release registrado com commit e checkpoint
- [ ] Janela de observação de 48h iniciada no Shadow Monitor
- [ ] Usuários afetados notificados (quando aplicável)

> ⚠️ **Lacunas ativas nesta fase:**
> - Não existe release notes template → criar `docs/templates/RELEASE-NOTES-TEMPLATE.md`
> - Não existe changelog estruturado por versão → criar `CHANGELOG.md` na raiz
> - Não existe processo de comunicação de mudança para usuários afetados

---

## Fase 7 — Operação

**Objetivo:** Manter o sistema estável em produção.

**Quando entrar:** Pós go-live. Consulta contínua durante operação.

**Monitoramento:**

| Documento | Descrição |
|---|---|
| [OBSERVABILITY.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/OBSERVABILITY.md) | Observabilidade e monitoramento |
| [SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md) | Protocolo de verificação contínua |

**Resiliência:**

| Documento | Descrição |
|---|---|
| [17-plano-de-backup.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/17-plano-de-backup.md) | Plano de backup |
| [18-disaster-recovery.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/18-disaster-recovery.md) | Plano de disaster recovery |
| [20-rollback-plan.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/20-rollback-plan.md) | Plano de rollback |

> ⚠️ **Lacuna ativa:** Não existem SLAs/SLOs definidos formalmente.
> Criar `docs/SLA-SLO.md` com acordos de nível de serviço por tipo de usuário.

---

## Fluxo de Exceção — Incidentes

**Objetivo:** Diagnosticar e corrigir problemas em produção com velocidade.

**Quando acionar:** Qualquer incidente em produção ou anomalia detectada no monitoramento. Pode ser acionado a partir de qualquer fase.

**Referência primária:**

| Documento | Descrição |
|---|---|
| [ERROS-CONHECIDOS.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) v2.1 ⭐ | 10 erros catalogados + runbooks + 8 invariants |
| [invariant-registry.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/invariant-registry.md) | INV-001..INV-008 com comandos de verificação |

**Diagnósticos:**

| Documento | Descrição |
|---|---|
| [DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DIAGNOSTICO-UAT-001-FLUXO-QUESTIONARIO.md) | Diagnóstico do fluxo de questionário |
| [ISSUES-pre-existentes-fora-escopo-F02.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/ISSUES-pre-existentes-fora-escopo-F02.md) | Débitos técnicos conhecidos |

**Gate de encerramento — Incidente**

> **Aprovador:** Agente (técnico) + P.O. (se P1 ou P0)
> **Critério de bloqueio:** Causa-raiz não identificada. Invariants não re-verificados.
> **Escalação:** Incidente P0 sem resolução em 1h → notificar P.O. imediatamente.

- [ ] Incidente documentado em ERROS-CONHECIDOS se recorrente
- [ ] Causa-raiz identificada e registrada
- [ ] Invariants re-verificados após correção (`npx vitest run server/prefill-contract.test.ts server/invariants-606-607-608.test.ts`)

**Documentos de suporte ao usuário final** (criados em 2026-03-24):
- [`docs/suporte/FAQ.md`](./suporte/FAQ.md) — perguntas frequentes
- [`docs/suporte/MANUAL-USUARIO.md`](./suporte/MANUAL-USUARIO.md) — guia de uso
- [`docs/suporte/ESCALACAO.md`](./suporte/ESCALACAO.md) — fluxo de escalação P0→P3

---

## Fluxo de Exceção — Mudança Regulatória Urgente

**Objetivo:** Responder a mudanças na LC 214/2025 ou LC 227/2025 que invalidam parte do corpus de 499 requisitos.

**Quando acionar:** Nova lei, decreto ou interpretação oficial que afeta os requisitos canônicos. Pode ser acionado a partir de qualquer fase.

**Responsável:** P.O. + Equipe Jurídica

**Ações obrigatórias (nesta ordem):**

1. Suspender UAT se em andamento — não coletar feedback com corpus desatualizado
2. Criar ADR de atualização regulatória com escopo da mudança
3. Atualizar `canonical-requirements.md` com os requisitos afetados
4. Re-executar testes de regressão para verificar impacto
5. Atualizar `BASELINE-PRODUTO.md` com a mudança regulatória
6. Notificar usuários afetados com nota técnica
7. Retomar UAT com corpus atualizado

> **Critério de urgência:** Mudança interpretativa (pode aguardar próxima sprint) vs. nova lei com vigência imediata (acionar imediatamente).

---

## Fase 8 — Evolução Contínua

**Objetivo:** Aprender com cada ciclo e melhorar sistematicamente. Fechar o ciclo e abrir o próximo.

**Quando entrar:** Após encerramento de sprint ou release. Antes de planejar o próximo ciclo (retorna à Fase 0).

**Registro de execução:**

| Documento | Descrição |
|---|---|
| [PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/playruns/PLAYRUN-001-SUB-SPRINT-PREFILL-CONTRACT.md) ⭐ | Última sprint executada |
| [PLAYRUN-TEMPLATE.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/playruns/PLAYRUN-TEMPLATE.md) | Template para novos playruns |

**Histórico:**

| Documento | Descrição |
|---|---|
| [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md) | Histórico de estado do produto por sprint |
| [SPRINT-HISTORICO-MENU-QUESTIONARIOS.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/SPRINT-HISTORICO-MENU-QUESTIONARIOS.md) | Histórico de sprints de menus |

**Gate de saída — Fase 8**

> **Aprovador:** P.O.
> **Critério de bloqueio:** Playrun não encerrado. BASELINE-PRODUTO.md não atualizado.
> **Escalação:** Nenhum novo ciclo começa sem o Playrun da sprint anterior estar CONCLUÍDO.

- [ ] Playrun da sprint encerrado e marcado como CONCLUÍDO
- [ ] Lições aprendidas registradas no Playrun
- [ ] BASELINE-PRODUTO.md atualizado com métricas da sprint
- [ ] Próximo ciclo planejado (retornar à Fase 0)

---

## Documentos de Governança Transversal

Estes documentos atravessam todas as fases. Devem estar acessíveis a qualquer momento.

| Documento | Quando usar |
|---|---|
| [INDICE-DOCUMENTACAO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/INDICE-DOCUMENTACAO.md) | Localizar qualquer documento |
| [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md) ⭐ | Estado atual — referência viva |
| [PO-GOVERNANCA-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/PO-GOVERNANCA-PIPELINE-v3.md) | Regras e estado do P.O. |
| [REBUILD-PIPELINE-v3.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/REBUILD-PIPELINE-v3.md) | Reconstrução em caso de desastre |
| [ERROS-CONHECIDOS.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) v2.1 | Incidentes e invariants |
| [AUDITORIA-RECONCILIACAO-POS-v2.2.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/AUDITORIA-RECONCILIACAO-POS-v2.2.md) | Auditoria de reconciliação |

---

## Lacunas Documentais — Backlog Priorizado

| Prioridade | Arquivo a criar | Fase | Motivo |
|---|---|---|---|
| ✅ Resolvido | `docs/suporte/FAQ.md` | Exceção: Incidentes | Criado em 2026-03-24 |
| ✅ Resolvido | `docs/suporte/MANUAL-USUARIO.md` | Exceção: Incidentes | Criado em 2026-03-24 |
| ✅ Resolvido | `docs/suporte/ESCALACAO.md` | Exceção: Incidentes | Criado em 2026-03-24 |
| 🔴 Alta | Sprint de Governança (CI/CD) | 0 — Pré-sprint | **P0 obrigatório antes de qualquer sprint de produto** — PR governance + changed-files-guard + migration-guard + test-suite. Fecha o ciclo de verificação automática identificado como lacuna crítica. |
| ✅ Resolvido | `CHANGELOG.md` | 6 — Release | Criado em 2026-03-31 (Sprint M) |
| 🟠 Média | `docs/templates/RELEASE-NOTES-TEMPLATE.md` | 6 — Release | Sem padrão de comunicação de release |
| ✅ Resolvido | `docs/DEFINITION-OF-DONE.md` | 4 — Implementação | Criado em 2026-03-29 (Sprint K) |
| 🟡 Baixa | `docs/SLA-SLO.md` | 7 — Operação | Sem acordos de nível de serviço formais |
| 🟡 Baixa | `CONTRIBUTING.md` | 4 — Implementação | Sem guia de contribuição ao repositório |

---

## Como Atualizar Este Documento

Este documento deve ser atualizado quando:

1. Uma nova fase for adicionada ou removida do ciclo de vida
2. Um novo tipo de release for introduzido (ex.: hotfix, patch regulatório)
3. Um ADR mudar o comportamento de uma fase
4. Um Playrun revelar que um gate está mal calibrado
5. Uma lacuna do backlog for resolvida

**Responsável pela atualização:** P.O.

**Processo:** PR com diff do documento + aprovação do P.O. antes do merge. Atualizar a versão no cabeçalho e registrar no histórico abaixo.

---

## Histórico de Versões

| Versão | Data | Autor | Mudanças |
|---|---|---|---|
| **1.0** | 2026-03-24 | Manus AI | Criação — 8 fases + 2 fluxos de exceção · Gates com aprovador e critério de bloqueio · Fase 0 Regulatória · Janela de observação pós-release · Backlog de lacunas priorizado |
| **1.1** | 2026-03-24 | Manus AI | 3 inconsistências corrigidas (Orquestrador): (1) lacunas de suporte já marcadas como Resolvido no backlog e no Fluxo de Exceção; (2) link quebrado DOCUMENTACAO-IA-GENERATIVA-v5.md corrigido para path real; (3) versão atualizada para 1.1 com histórico. DECISÃO-001 registrada no BASELINE-PRODUTO.md v1.1 (commit `612d140`). |
| **1.2** | 2026-03-24 | Manus AI (prompt Orquestrador) | Orquestrador adicionado como persona na tabela de leitura rápida · Gate Fase 4 com verificação independente obrigatória · Sprint de Governança adicionada como P0 no backlog · MODELO-OPERACIONAL.md criado como artefato de governança |
| **1.3** | 2026-03-29 | Manus AI | Sprint K concluída (K-4-A a K-4-D) · DEFINITION-OF-DONE.md criado · HEAD `5d7ad7d` |
| **1.4** | 2026-03-31 | Manus AI | Sprint M concluída · PRs #254 (BUG-UAT-03) e #256 (E2E Playwright + BUG-UAT-05) mergeados · auth.testLogin implementado · SOL-013/014 removidos do corpus · suites E2E CT-01/04/06/07/37 adicionadas · CHANGELOG.md criado · HEAD `2f17184` |

---

*PRODUCT-LIFECYCLE.md — IA Solaris v1.4 · 2026-03-31*
*Próxima revisão: ao final da Sprint L ou release*
*Aprovador: P.O. Uires Tapajós*
