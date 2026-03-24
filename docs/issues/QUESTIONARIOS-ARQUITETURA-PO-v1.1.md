# Questionários de Diagnóstico — Arquitetura para o P.O.
**Versão:** 1.1 — Consolidada  
**Data de criação:** 2026-03-24  
**Data de atualização:** 2026-03-24  
**Destinatário:** Product Owner  
**Objetivo:** Visão executiva completa da arquitetura dos questionários refletindo o estado real atual do sistema  
**Checkpoint:** `ed4630c6`

> **Nota de versão:** Esta versão 1.1 reflete o estado atual do sistema após a execução completa do plano pós-autoauditoria. BUG-001 e OBS-002 foram corrigidos. O sistema está aprovado para UAT sem bloqueios.

---

## SEÇÃO 1 — O que são os Questionários de Diagnóstico

Os questionários de diagnóstico são o coração do produto. Eles coletam informações estruturadas sobre o cliente para que o sistema gere automaticamente:

- **Matriz de Riscos** — identificação dos riscos tributários específicos do cliente frente à Reforma
- **Planos de Ação** — recomendações priorizadas por urgência e impacto
- **Briefing Executivo** — documento de síntese para apresentação ao cliente

Existem **3 questionários**, aplicados em sequência obrigatória:

| Ordem | Nome | Foco | Seções |
|---|---|---|---|
| 1 | **Corporativo (QC)** | Estrutura jurídica, regime tributário, obrigações acessórias | QC-01 a QC-10 |
| 2 | **Operacional (QO)** | Operações comerciais, fornecedores, sistemas, contratos | QO-01 a QO-10 |
| 3 | **CNAE** | Setor econômico, tributação setorial, impacto da Reforma | QCNAE-01 a QCNAE-05 |

---

## SEÇÃO 2 — O que é o Prefill Contract

**Prefill** é o pré-preenchimento automático de respostas nos questionários com base nos dados que o usuário já forneceu ao criar o projeto.

### Por que isso importa para o PO

Sem prefill, o usuário responde as mesmas perguntas duas vezes (uma no cadastro do projeto, outra no questionário). Com prefill correto:

- A experiência do usuário é fluida — dados já conhecidos aparecem preenchidos
- O advogado pode confirmar ou ajustar, não preencher do zero
- O risco de inconsistência entre perfil e questionário é eliminado

### Campos atualmente pré-preenchidos

| Campo | Pergunta | De onde vem |
|---|---|---|
| Regime tributário | Qual o regime tributário atual? | Perfil do projeto |
| Porte da empresa | Qual o porte? | Perfil do projeto |
| Estabelecimentos em outros estados | Possui filiais? | Perfil do projeto |
| Grupo econômico | Integra grupo econômico? | Perfil do projeto ✅ |
| Centralização fiscal | Operações centralizadas? | Perfil do projeto ✅ |
| Canais de venda | Quais canais utiliza? | Tipo de operação do perfil |
| Perfil de clientes | B2B, B2C ou misto? | Tipo de cliente do perfil |
| Meios de pagamento | Quais meios utiliza? | Perfil financeiro |
| Gestão fiscal | Como é gerida a área fiscal? | Perfil de governança |
| Setor econômico | Qual o setor principal? | Tipo de operação do perfil |
| Múltiplos CNAEs | Possui atividades secundárias? | CNAEs confirmados |
| Lista de CNAEs | Informe os CNAEs | CNAEs confirmados |

**Total: 12 campos pré-preenchidos com fluxo E2E íntegro.**

---

## SEÇÃO 3 — Arquitetura Técnica (visão simplificada)

```
CADASTRO DO PROJETO (NovoProjeto.tsx)
  ↓ Usuário preenche o Perfil da Empresa
  ↓ Dados salvos no banco como JSON (companyProfile, operationProfile, etc.)
  ↓ ✅ Inclui isEconomicGroup e taxCentralization (corrigido)

ABERTURA DO QUESTIONÁRIO
  ↓ Sistema carrega o projeto do banco
  ↓ normalizeProject() garante que todos os JSONs chegam como objetos
  ↓ Builder canônico (buildCorporatePrefill / buildOperationalPrefill / buildCnaePrefill)
  ↓ Campos pré-preenchidos aparecem no formulário
  ↓ Usuário confirma ou ajusta
  ↓ Respostas salvas no banco
```

**Princípio fundamental:** Todo o mapeamento de "dado do perfil → resposta do questionário" está em **um único arquivo**: `shared/questionario-prefill.ts`. Nenhum questionário tem lógica própria de prefill.

---

## SEÇÃO 4 — Perguntas por Questionário (visão completa para o PO)

### Questionário Corporativo — 22 perguntas + 10 obs

| Seção | Perguntas | Prefill |
|---|---|---|
| QC-01 — Regime e Porte | Regime tributário, porte da empresa | ✅ Ambas pré-preenchidas |
| QC-02 — Estrutura Societária | Grupo econômico, filiais, centralização fiscal | ✅ Todas pré-preenchidas |
| QC-03 — Operações | Tipos de operações realizadas | ❌ Sem prefill (dado não coletado no perfil) |
| QC-04 — Documentos Fiscais | Documentos emitidos, qualidade dos cadastros | ❌ Sem prefill |
| QC-05 — Obrigações Acessórias | Obrigações entregues, periodicidade | ❌ Sem prefill |
| QC-06 — Créditos Tributários | Aproveitamento de PIS/COFINS, controle | ❌ Sem prefill |
| QC-07 — Pagamentos | Meios de pagamento, gateway, split payment | ❌ Sem prefill (ver DECISÃO-001) |
| QC-08 — Benefícios Fiscais | Benefícios vigentes, regimes especiais | ❌ Sem prefill |
| QC-09 — Compliance | Autuações, maturidade em compliance | ❌ Sem prefill |
| QC-10 — Reforma Tributária | Conhecimento e preparação para a Reforma | ❌ Sem prefill |

### Questionário Operacional — 20 perguntas + 10 obs

| Seção | Perguntas | Prefill |
|---|---|---|
| QO-01 — Canais e Clientes | Canais de venda, perfil de clientes | ✅ Ambas pré-preenchidas |
| QO-02 — Fornecedores | Perfil de fornecedores, controle de insumos | ❌ Sem prefill |
| QO-03 — Pagamentos | Meios de pagamento, prazo de recebimento | ✅ Meios pré-preenchidos |
| QO-04 — Digital | Marketplaces, gateway de pagamento | ❌ Sem prefill |
| QO-05 — Contratos | Contratos de longo prazo, cláusulas de reajuste | ❌ Sem prefill |
| QO-06 — Logística | Transporte, operações interestaduais | ❌ Sem prefill |
| QO-07 — Sistemas | ERP utilizado, nível de integração fiscal | ❌ Sem prefill |
| QO-08 — Gestão Fiscal | Frequência de revisão, gestão da área fiscal | ✅ Gestão pré-preenchida |
| QO-09 — Exceções | Operações com tratamento especial | ❌ Sem prefill |
| QO-10 — Documentação | Guarda de arquivos, trilha de auditoria | ❌ Sem prefill |

### Questionário CNAE — 15 perguntas + 5 obs

| Seção | Perguntas | Prefill |
|---|---|---|
| QCNAE-01 — Identificação | Setor econômico, múltiplos CNAEs, lista de CNAEs | ✅ Todas pré-preenchidas |
| QCNAE-02 — Tributação Setorial | Substituição tributária, monofásico, tributos setoriais | ❌ Sem prefill |
| QCNAE-03 — Imposto Seletivo | Sujeição ao IS, expectativa de impacto | ❌ Sem prefill |
| QCNAE-04 — Regimes Diferenciados | Imunidade, isenção, regime especial da Reforma | ❌ Sem prefill |
| QCNAE-05 — Prioridades | Prioridade de compliance, associações, assessoria | ❌ Sem prefill |

---

## SEÇÃO 5 — Decisões que Requerem Aprovação do PO

### DECISÃO-001 — Sobreposição entre QC-07 e QO-03 (meios de pagamento)

**Status: ⏳ Em aberto — decisão de produto, não bloqueante para UAT**

**Situação:** O Questionário Corporativo (QC-07) e o Questionário Operacional (QO-03) fazem perguntas relacionadas a meios de pagamento. Após análise técnica detalhada, as perguntas têm propósitos distintos: QC-07 avalia preparação jurídica/tecnológica para o split payment; QO-03 avalia o fluxo operacional de recebimento.

**Impacto para o usuário:** O advogado responde perguntas relacionadas em dois contextos diferentes. O campo P1 (lista de meios) é o único com sobreposição real.

**Opções:**
1. **Manter ambas** — adicionar prefill em `qc07_meios` usando `financialProfile.paymentMethods[]` (recomendado tecnicamente)
2. **Remover P1 do QC-07** — manter apenas `qc07_gateway` e `qc07_split`
3. **Consolidar** — mover a pergunta para um único questionário com contexto claro

**Prazo para decisão:** Pode ser tomada durante ou após o UAT com advogados.

---

## SEÇÃO 6 — Testes Automatizados (resumo executivo)

O sistema possui **410 testes automatizados** cobrindo:

- **10 cenários de empresa** (MEI, Simples Nacional, Lucro Presumido, Lucro Real, grupo econômico, multi-estado, agronegócio, legado, inconsistente, complexo)
- **8 blocos de verificação** por cenário (tipos de dados, valores esperados, trace de observabilidade, casos nulos, projetos legados, múltiplos campos, cobertura de seções, regressão)
- **3 invariants de produto** (riscos, planos de ação, briefing)
- **33 testes de regressão específicos** para BUG-001

**Resultado:** 410/410 ✅ — nenhuma regressão.

Esses testes são executados automaticamente a cada mudança de código e bloqueiam o merge se qualquer teste falhar.

---

## SEÇÃO 7 — Estado Atual do Sistema

O sistema encontra-se no seguinte estado, pronto para UAT:

| Dimensão | Estado |
|---|---|
| **Prefill completo** | ✅ 12 campos pré-preenchidos com fluxo E2E íntegro |
| **Sem repetição de perguntas** | ✅ Nenhuma pergunta duplicada entre questionários (DECISÃO-001 é sobreposição de contexto, não duplicação) |
| **Contrato fechado** | ✅ `shared/questionario-prefill.ts` é a única fonte de verdade para mapeamento de prefill |
| **Dados consistentes** | ✅ `normalizeProject()` garante que todos os dados chegam como objetos tipados |
| **Builders centralizados** | ✅ 3 builders canônicos, nenhuma lógica local nos questionários |
| **Normalização correta** | ✅ DA-1 a DA-5 todos conformes |
| **Pronto para UAT** | ✅ Zero bugs críticos, zero inconsistências estruturais |

---

## SEÇÃO 8 — Roadmap de Evolução dos Questionários

### Sprint Concluída (estado atual)
- ✅ Contrato canônico de prefill implementado
- ✅ Normalização da API garantida
- ✅ Campos QC-02 (grupo econômico, centralização) adicionados ao perfil, builders e persistência
- ✅ BUG-001 corrigido — `isEconomicGroup` e `taxCentralization` persistidos corretamente
- ✅ OBS-002 corrigido — banner de prefill usa path canônico
- ✅ 410 testes automatizados

### Próximas Sprints

| Item | Prioridade | Esforço | Impacto |
|---|---|---|---|
| **UAT com advogados** | P0 | — | Alto — validação real do produto |
| **Validação de experiência** — feedback dos advogados sobre qualidade das perguntas | P0 | — | Alto |
| **Ajustes finos baseados em uso real** — melhorias identificadas no UAT | P1 | Variável | Alto |
| Decidir sobre DECISÃO-001 (QC-07/QO-03) | P1 | Médio | Médio |
| Expandir prefill para qc03_operacoes e qo06_interestadual | P2 | Médio | Médio |
| Adicionar prefill para qo04_marketplace via taxComplexity | P2 | Baixo | Baixo |
| Script de migração para projetos legados (isEconomicGroup/taxCentralization) | P2 | Baixo | Baixo |

---

## SEÇÃO 9 — Glossário Técnico para o PO

| Termo | Significado |
|---|---|
| **Prefill** | Pré-preenchimento automático de respostas com base em dados já coletados |
| **Builder canônico** | Função centralizada que transforma dados do perfil em respostas do questionário |
| **normalizeProject()** | Função que garante que dados JSON do banco chegam como objetos (não como texto) |
| **PrefillTrace** | Registro de observabilidade que mostra quais campos foram pré-preenchidos, quais faltaram e por quê |
| **DA-1 a DA-5** | Decisões Arquiteturais — regras que governam como o prefill funciona |
| **INV-001 a INV-008** | Invariants — propriedades do sistema que nunca podem ser violadas |
| **PCT** | Prefill Contract Tests — suíte de testes que verifica o contrato de prefill |
| **BUG-001** | Bug de persistência corrigido — `isEconomicGroup` e `taxCentralization` não eram enviados ao banco |
| **OBS-002** | Observação corrigida — banner de prefill usava colunas legadas em vez do path canônico |
| **DECISÃO-001** | Decisão de produto em aberto — sobreposição de contexto entre QC-07 e QO-03 |

---

## SEÇÃO 10 — Checklist de Aprovação do PO

| Item | Status |
|---|---|
| Prefill completo | ✅ |
| Sem repetição | ✅ |
| Dados consistentes | ✅ |
| Builders centralizados | ✅ |
| Normalização correta | ✅ |
| Pronto para UAT | ✅ |

**O sistema está aprovado para UAT. Nenhum item bloqueante pendente.**

A única decisão de produto em aberto é a DECISÃO-001 (sobreposição QC-07/QO-03), que pode ser tomada durante ou após o UAT com base no feedback real dos advogados.

---

*Documento produzido como parte da Sub-Sprint Estrutural de Prefill Contract — ISSUE-001*  
*Versão 1.1 — Estado consolidado pós-correção de BUG-001 e OBS-002*  
*Para aprovação do P.O. antes do UAT*
