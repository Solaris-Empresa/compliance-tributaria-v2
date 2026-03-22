# CPIE v2 — Documentação de Governança

**Versão da documentação:** 1.0  
**Data:** 2026-03-22  
**Versão do motor:** `cpie-v2.0`  
**Status:** Aprovado pelo P.O.  
**Meta de confiabilidade:** ≥ 98% (ICE ≥ 98 em todas as regras)

---

## Resumo Executivo

O **CPIE v2** (Checklist de Perfil e Inconsistências Empresariais v2) é o subsistema de validação de coerência da Plataforma de Compliance da Reforma Tributária. Ele opera como uma camada de interceptação que analisa o perfil de uma empresa antes de qualquer diagnóstico tributário ser produzido, garantindo que dados contraditórios ou incoerentes não contaminem o resultado final.

O motor combina **14 regras determinísticas** (organizadas em três camadas: A, B e C) com **arbitragem por IA** para detectar inconsistências que as regras fixas não conseguem capturar. O resultado é uma decisão de três vias: bloqueio absoluto (`hard_block`), bloqueio com override (`soft_block_with_override`) ou aprovação (com ou sem ressalvas).

Esta documentação cobre 100% do escopo do CPIE v2: produto, cenários, arquitetura técnica e operação. É a fonte de verdade para qualquer decisão de manutenção, evolução ou auditoria do sistema.

---

## Índice Geral

### Produto

| # | Documento | Descrição |
|---|---|---|
| 01 | [product-spec.md](produto/01-product-spec.md) | Especificação completa do produto CPIE v2 |
| 02 | [modelo-conceitual.md](produto/02-modelo-conceitual.md) | Definição dos 3 scores, vetos, IA e inconsistências compostas |
| 03 | [decision-contract.md](produto/03-decision-contract.md) | Contrato formal de decisão — quando bloquear, quando aprovar |
| 04 | [matriz-de-regras.md](produto/04-matriz-de-regras.md) | Todas as 14 regras com IDs, severidades, vetos e fontes |
| 05 | [fluxo-e2e.md](produto/05-fluxo-e2e.md) | Fluxo end-to-end do usuário criando um projeto |
| 06 | [ux-states.md](produto/06-ux-states.md) | Estados de UX por decisão do gate |
| 07 | [ux-guidelines.md](produto/07-ux-guidelines.md) | Princípios de usabilidade, CTA, hierarquia visual |
| 08 | [risk-model.md](produto/08-risk-model.md) | Modelo de risco por tipo de inconsistência |

### Cenários

| # | Documento | Descrição |
|---|---|---|
| 09 | [matriz-de-cenarios.md](cenarios/09-matriz-de-cenarios.md) | 35 cenários rastreáveis com inputs e outputs esperados |

### Técnico

| # | Documento | Descrição |
|---|---|---|
| 10 | [arquitetura-geral.md](tecnico/10-arquitetura-geral.md) | Componentes, diagrama e fluxo de dados |
| 11 | [pipeline-cpie-v2.md](tecnico/11-pipeline-cpie-v2.md) | Detalhamento das 5 etapas do pipeline (E1–E5) |
| 12 | [contrato-de-apis.md](tecnico/12-contrato-de-apis.md) | Contratos completos de todos os endpoints tRPC |
| 13 | [schema-banco.md](tecnico/13-schema-banco.md) | Schema completo da tabela `consistency_checks` |
| 14 | [single-source-of-truth.md](tecnico/14-single-source-of-truth.md) | Thresholds, limites e constantes canônicas |
| 15 | [fluxo-de-estado.md](tecnico/15-fluxo-de-estado.md) | Máquina de estados do frontend |
| 16 | [regras-de-cta.md](tecnico/16-regras-de-cta.md) | CTAs por estado, textos e regras de habilitação |

### Operação

| # | Documento | Descrição |
|---|---|---|
| 17 | [plano-de-backup.md](operacao/17-plano-de-backup.md) | Estratégia de backup e verificação |
| 18 | [disaster-recovery.md](operacao/18-disaster-recovery.md) | RTO/RPO, cenários e runbooks de recuperação |
| 19 | [versionamento-cpie.md](operacao/19-versionamento-cpie.md) | Política de versionamento e critério de release |
| 20 | [rollback-plan.md](operacao/20-rollback-plan.md) | Quando e como fazer rollback |
| 21 | [bootstrap-sistema.md](operacao/21-bootstrap-sistema.md) | Guia de bootstrap do ambiente |
| 22 | [metrica-ice.md](operacao/22-metrica-ice.md) | Fórmula ICE, thresholds e gate de release |
| 23 | [plano-de-testes-continuos.md](operacao/23-plano-de-testes-continuos.md) | Scripts executáveis e integração no pipeline |
| 24 | [data-governance.md](operacao/24-data-governance.md) | Retenção, rastreabilidade, LGPD e auditoria |

---

## Evidências Obrigatórias

As seguintes evidências devem ser verificadas antes de qualquer release:

| Evidência | Como verificar | Status atual |
|---|---|---|
| 35 cenários da Matriz passando | `pnpm test -t "C-0"` | ✅ Verificado |
| TypeScript sem erros | `npx tsc --noEmit` | ✅ 0 erros |
| Cobertura ≥ 85% nas regras CPIE v2 | `pnpm test --coverage server/cpie-v2.test.ts` | ✅ 92 testes |
| Schema do banco aplicado | `pnpm db:push` | ✅ Aplicado |
| `mediumAcknowledged` no schema | `DESCRIBE consistency_checks` | ✅ Campo existe |
| Filtro de falsos positivos de porte ativo | Cenário C-016 passando | ✅ Verificado |
| Override de hard_block bloqueado | Cenário C-027 passando | ✅ Verificado |
| Aceite MEDIUM registrado no banco | Cenário C-028 passando | ✅ Verificado |

---

## ICE Atual (Resumo)

Atualizado em: 2026-03-22

| Regra | ICE | Status |
|---|---|---|
| A1 | 97.5 | ⚠️ Alerta |
| A2 | 95.5 | ⚠️ Alerta |
| A3 | 95.5 | ⚠️ Alerta |
| A4 | 97.5 | ⚠️ Alerta |
| B1 | 93.5 | ❌ Bloqueio |
| B1b | 93.5 | ❌ Bloqueio |
| B2 | 90.5 | ❌ Bloqueio |
| B3 | 89.5 | ❌ Bloqueio |
| B4 | 90.5 | ❌ Bloqueio |
| C1 | 95.5 | ⚠️ Alerta |
| C2 | 93.5 | ❌ Bloqueio |
| C3 | 93.5 | ❌ Bloqueio |

**Nota:** Os valores de ICE abaixo de 98 refletem a necessidade de melhoria nas mensagens de conflito (Clareza) e na experiência do usuário (UX). Os componentes Funcional e Fricção estão em 100% para todas as regras. O plano de melhoria de UX/Clareza será endereçado na próxima sprint.

**Meta:** ICE ≥ 98 em todas as regras para release em produção.

---

## Glossário

| Termo | Definição |
|---|---|
| **CPIE v2** | Checklist de Perfil e Inconsistências Empresariais v2 — motor de validação de coerência |
| **hard_block** | Bloqueio absoluto — não pode ser contornado por justificativa |
| **soft_block_with_override** | Bloqueio com possibilidade de override mediante justificativa ≥ 50 chars |
| **canProceed** | Boolean que indica se o perfil pode avançar para a criação do projeto |
| **blockType** | Tipo de bloqueio: `hard_block` ou `soft_block_with_override` |
| **overallLevel** | Nível geral de inconsistência: `none`, `low`, `medium`, `high`, `critical` |
| **consistencyScore** | Score de consistência interna do perfil (0–100) |
| **completenessScore** | Score de completude do formulário (0–100) |
| **diagnosticConfidence** | Confiança diagnóstica = consistencyScore × completenessScore / 100 |
| **deterministicVeto** | Teto do consistencyScore imposto pelas regras determinísticas |
| **effectiveAiVeto** | Teto do consistencyScore imposto pela IA (após filtros) |
| **aiVeto** | Veto bruto retornado pela IA antes dos filtros |
| **inferredProfile** | Perfil da empresa extraído da descrição livre pela IA |
| **inferenceConfidence** | Confiança da IA na extração do perfil inferido (0–100) |
| **Camada A** | Regras de incompatibilidade direta regime/porte/faturamento |
| **Camada B** | Regras de inconsistência entre descrição livre e campos estruturados |
| **Camada C** | Regras de inconsistência composta entre múltiplos campos estruturados |
| **acceptedRisk** | Campo no banco que indica que um override de soft_block foi realizado |
| **mediumAcknowledged** | Campo no banco que indica que o usuário confirmou ciência de conflitos MEDIUM |
| **ICE** | Índice de Confiabilidade de Execução — métrica de qualidade do motor |
| **RTO** | Recovery Time Objective — tempo máximo para restaurar o serviço |
| **RPO** | Recovery Point Objective — perda máxima de dados aceitável |
| **falso positivo** | Conflito gerado pelo sistema que não corresponde a uma inconsistência real |
| **falso negativo** | Inconsistência real não detectada pelo sistema |
| **B2G** | Business to Government — venda para órgãos públicos |
| **B2B** | Business to Business — venda para empresas |
| **B2C** | Business to Consumer — venda para pessoas físicas |
| **MEI** | Microempreendedor Individual — regime com limite de R$ 81.000/ano |
| **Simples Nacional** | Regime tributário simplificado com limite de R$ 4,8M/ano |
| **Lucro Presumido** | Regime tributário com limite de R$ 78M/ano |
| **Lucro Real** | Regime tributário sem limite de faturamento |
| **BNDES** | Banco Nacional de Desenvolvimento Econômico e Social — referência para classificação de porte |
| **Sebrae** | Serviço Brasileiro de Apoio às Micro e Pequenas Empresas — referência para classificação de porte |

---

## Rastreabilidade Cruzada

| Documento | Rastreia para |
|---|---|
| 03-decision-contract.md | 04-matriz-de-regras.md (regras), 14-SSoT.md (thresholds) |
| 04-matriz-de-regras.md | 09-matriz-de-cenarios.md (cenários), 14-SSoT.md (vetos) |
| 09-matriz-de-cenarios.md | 23-plano-de-testes.md (testes Vitest), 04-matriz-de-regras.md (regras) |
| 11-pipeline-cpie-v2.md | 14-SSoT.md (constantes), `server/cpie-v2.ts` (implementação) |
| 12-contrato-de-apis.md | 13-schema-banco.md (persistência), `server/routers/cpieV2Router.ts` |
| 14-SSoT.md | `server/cpie-v2.ts` (implementação canônica) |
| 22-metrica-ice.md | 09-matriz-de-cenarios.md (componente Funcional), 23-plano-de-testes.md |
| 23-plano-de-testes.md | 09-matriz-de-cenarios.md (IDs dos cenários), `server/cpie-v2.test.ts` |
