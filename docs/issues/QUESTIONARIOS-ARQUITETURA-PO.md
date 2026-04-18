# Questionários de Diagnóstico — Arquitetura para o P.O.
**Versão:** 1.0  
**Data:** 2026-03-24  
**Destinatário:** Product Owner  
**Objetivo:** Visão executiva completa da arquitetura dos questionários, gaps identificados e decisões que requerem aprovação do PO  

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
| Grupo econômico | Integra grupo econômico? | Perfil do projeto (**BUG-001** — ver Seção 7) |
| Centralização fiscal | Operações centralizadas? | Perfil do projeto (**BUG-001** — ver Seção 7) |
| Canais de venda | Quais canais utiliza? | Tipo de operação do perfil |
| Perfil de clientes | B2B, B2C ou misto? | Tipo de cliente do perfil |
| Meios de pagamento | Quais meios utiliza? | Perfil financeiro |
| Gestão fiscal | Como é gerida a área fiscal? | Perfil de governança |
| Setor econômico | Qual o setor principal? | Tipo de operação do perfil |
| Múltiplos CNAEs | Possui atividades secundárias? | CNAEs confirmados |
| Lista de CNAEs | Informe os CNAEs | CNAEs confirmados |

---

## SEÇÃO 3 — Arquitetura Técnica (visão simplificada)

```
CADASTRO DO PROJETO (NovoProjeto.tsx)
  ↓ Usuário preenche o Perfil da Empresa
  ↓ Dados salvos no banco como JSON (companyProfile, operationProfile, etc.)

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
| QC-02 — Estrutura Societária | Grupo econômico, filiais, centralização fiscal | ✅ Todas pré-preenchidas (BUG-001 afeta grupo e centralização) |
| QC-03 — Operações | Tipos de operações realizadas | ❌ Sem prefill (dado não coletado no perfil) |
| QC-04 — Documentos Fiscais | Documentos emitidos, qualidade dos cadastros | ❌ Sem prefill |
| QC-05 — Obrigações Acessórias | Obrigações entregues, periodicidade | ❌ Sem prefill |
| QC-06 — Créditos Tributários | Aproveitamento de PIS/COFINS, controle | ❌ Sem prefill |
| QC-07 — Pagamentos | Meios de pagamento, gateway, split payment | ❌ Sem prefill (ver OBS-001) |
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

**Situação:** O Questionário Corporativo (QC-07) e o Questionário Operacional (QO-03) fazem a mesma pergunta sobre meios de pagamento, com as mesmas opções.

**Impacto para o usuário:** O advogado responde a mesma pergunta duas vezes.

**Opções:**
1. **Manter ambas** — se as perguntas têm propósitos distintos (QC-07 = visão fiscal/tributária; QO-03 = visão operacional/fluxo de caixa), manter e adicionar prefill em QC-07 usando `financialProfile.paymentMethods[]`
2. **Remover QC-07** — se a pergunta é redundante, remover do Corporativo
3. **Consolidar** — mover a pergunta para um único questionário com contexto claro

**Recomendação técnica:** Opção 1 (manter e adicionar prefill em QC-07), pois as perguntas têm contextos diferentes e o prefill elimina o atrito.

**Prazo para decisão:** Antes do UAT com advogados.

---

### DECISÃO-002 — Expansão do prefill para campos sem cobertura atual

**Situação:** 32 das 57 perguntas (56%) não têm prefill. Algumas poderiam ser pré-preenchidas se o formulário de perfil coletasse mais dados.

**Candidatos de alta prioridade para expansão:**
- `qc03_operacoes` — poderia derivar de `operationProfile.operationType`
- `qo06_interestadual` — poderia derivar de `operationProfile.multiState`
- `qo04_marketplace` — poderia derivar de `taxComplexity.usesMarketplace`

**Recomendação técnica:** Avaliar no UAT quais perguntas causam mais atrito e priorizar expansão de prefill nas próximas sprints.

**Prazo para decisão:** Após UAT.

---

## SEÇÃO 6 — Testes Automatizados (resumo executivo)

O sistema possui **377 testes automatizados** cobrindo:

- **10 cenários de empresa** (MEI, Simples Nacional, Lucro Presumido, Lucro Real, grupo econômico, multi-estado, agronegócio, legado, inconsistente, complexo)
- **8 blocos de verificação** por cenário (tipos de dados, valores esperados, trace de observabilidade, casos nulos, projetos legados, múltiplos campos, cobertura de seções, regressão)
- **3 invariants de produto** (riscos, planos de ação, briefing)

**Resultado:** 377/377 ✅ — nenhuma regressão.

Esses testes são executados automaticamente a cada mudança de código e bloqueiam o merge se qualquer teste falhar.

---

## SEÇÃO 7 — BUG-001 (Crítico — Requer Atenção do PO)

### Descrição para o PO

Ao criar um novo projeto, o usuário preenche a Seção 6.5 do perfil (Estrutura Societária) com informações sobre grupo econômico e centralização fiscal. Esses dados **são coletados** no formulário, mas **não são enviados** ao banco de dados por um erro de integração no código.

**Consequência visível:** Quando o advogado abre o Questionário Corporativo, os campos `qc02_grupo` (Integra grupo econômico?) e `qc02_centralizacao` (Operações fiscais centralizadas?) aparecem em branco, mesmo que o usuário tenha preenchido essas informações no perfil.

### Impacto no UAT

Durante a sessão de UAT com advogados, esses 2 campos aparecerão em branco. O advogado precisará preenchê-los manualmente. Isso não impede o uso do sistema, mas é inconsistente com a promessa de prefill.

### Correção

A correção é simples: 2 linhas de código no arquivo `NovoProjeto.tsx`. Pode ser aplicada em menos de 30 minutos.

**Recomendação:** Corrigir antes do UAT.

---

## SEÇÃO 8 — Roadmap de Evolução dos Questionários

### Sprint Atual (concluída)
- ✅ Contrato canônico de prefill implementado
- ✅ Normalização da API garantida
- ✅ Campos QC-02 (grupo econômico, centralização) adicionados ao perfil e builders
- ✅ 377 testes automatizados

### Próximas Sprints (sugestões para priorização)

| Item | Prioridade | Esforço | Impacto |
|---|---|---|---|
| Corrigir BUG-001 (persistência de isEconomicGroup/taxCentralization) | P0 | Baixo (30min) | Alto |
| Corrigir OBS-002 (banner de prefill usa colunas legadas) | P1 | Baixo (5min) | Médio |
| Decidir sobre sobreposição QC-07/QO-03 (DECISÃO-001) | P1 | Médio | Médio |
| Expandir prefill para qc03_operacoes e qo06_interestadual | P2 | Médio | Médio |
| Adicionar prefill para qo04_marketplace via taxComplexity | P2 | Baixo | Baixo |

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

---

## SEÇÃO 10 — Checklist de Aprovação do PO

Antes de autorizar o UAT com advogados, o PO deve confirmar:

- [ ] **BUG-001 corrigido** — campos `qc02_grupo` e `qc02_centralizacao` pré-preenchidos corretamente
- [ ] **DECISÃO-001 tomada** — definir se QC-07 e QO-03 são mantidos, consolidados ou um removido
- [ ] **OBS-002 corrigido** — banner de prefill usa path canônico (opcional, mas recomendado)
- [ ] **Cenários de UAT definidos** — pelo menos 2 perfis de empresa reais para teste (ex: Simples Nacional + Lucro Real com grupo econômico)
- [ ] **Critérios de aceite do UAT definidos** — o que os advogados precisam validar para o sistema ser considerado aprovado

---

*Documento produzido como parte da Sub-Sprint Estrutural de Prefill Contract — ISSUE-001*  
*Versão 1.0 — Para aprovação do P.O. antes do UAT*
