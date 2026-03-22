# ADR-001 — Decisão Arquitetural: Unificação do Diagnóstico Tributário
**Plataforma COMPLIANCE da Reforma Tributária**
**Data:** 22/03/2026 | **Versão:** 1.0 | **Status:** PROPOSTA — Aguardando aprovação do P.O.
**Autor:** Análise baseada em leitura direta do código-fonte (checkpoint `c1dac201`)

---

## 1. Contexto e Problema

A análise de baseline (`baseline-questionarios-rag.md`) identificou dois fluxos de diagnóstico paralelos e não integrados:

**Fluxo A — Diagnóstico Sequencial Estático** (`routers/diagnostic.ts`)
Três questionários em sequência obrigatória: Corporativo (QC) → Operacional (QO) → CNAE estático (QCNAE). As respostas são salvas em campos JSON na tabela `projects` (`corporateAnswers`, `operationalAnswers`, `cnaeAnswers`). O gate sequencial é imposto no backend. As seções QC-04..QC-10 e equivalentes do QO contêm `[PLACEHOLDER]` — conteúdo jurídico ainda não implementado.

**Fluxo B — Questionário V3 com IA + RAG** (`routers-fluxo-v3.ts`)
Perguntas geradas dinamicamente por IA para cada CNAE confirmado, com dois níveis de profundidade (`nivel1` e `nivel2`). As respostas são salvas na tabela dedicada `questionnaireAnswersV3`. O RAG regulatório (5.000+ artigos da LC 214/2025) é injetado no prompt de geração. O `generateBriefing` do Fluxo B **já usa RAG** e produz briefing estruturado com `confidence_score`, `gaps`, `inconsistencias` e citações regulatórias.

**O problema central** não é a existência de dois fluxos — é que eles **não compartilham dados** e **não têm uma rota canônica definida**. Um projeto pode ter respostas nos dois fluxos sem que nenhum sistema saiba disso.

A descoberta crítica da leitura do código é que o `diagnostic-consolidator.ts` (396 linhas) **já existe** e já foi implementado como adaptador: ele transforma as respostas do Fluxo A no formato `allAnswers[]` que o `generateBriefing` do Fluxo B aceita. O `generateBriefingFromDiagnostic` no `routers-fluxo-v3.ts` (linhas 1801–1960) já chama esse consolidador. Ou seja: **a ponte técnica entre os dois fluxos já existe no código** — falta apenas a decisão arquitetural sobre como usá-la.

---

## 2. Análise Comparativa dos Dois Fluxos

| Dimensão | Fluxo A (Estático) | Fluxo B (V3 + IA + RAG) |
|---|---|---|
| **Cobertura de conteúdo** | 3 seções reais + 7 placeholders (QC) | 100% gerado por IA — sem placeholders |
| **Contextualização regulatória** | Nenhuma | RAG com 5.000+ artigos LC 214/2025 |
| **Profundidade por CNAE** | Genérica (mesmas perguntas para todos) | Específica por CNAE (nivel1 + nivel2) |
| **Qualidade do briefing** | Básica — sem citações regulatórias | Estruturada com evidências, gaps e confidence score |
| **Persistência** | JSON em `projects` (3 campos) | Tabela dedicada `questionnaireAnswersV3` |
| **Rastreabilidade** | Baixa — JSON opaco | Alta — por CNAE, nível e índice de pergunta |
| **Manutenção** | Alta — cada pergunta exige deploy | Baixa — IA gera perguntas dinamicamente |
| **Gate sequencial** | Sim — backend impõe ordem | Não — qualquer CNAE pode ser respondido |
| **Estado do stepper** | Não persiste (apenas `useState`) | Persiste em `questionnaireProgressV3` + `localStorage` |
| **Completude atual** | ~30% (7 seções com placeholder) | 100% funcional |

---

## 3. Decisão Arquitetural

### 3.1 Fluxo Canônico

**O Fluxo B (Questionário V3 + IA + RAG) é o fluxo canônico do diagnóstico tributário.**

Esta decisão é fundamentada em três evidências do código:

Primeiro, o `generateBriefing` do Fluxo B já usa RAG com 7 artigos regulatórios contextualizados por CNAE, produzindo um briefing com `confidence_score`, `principais_gaps` com `evidencia_regulatoria` e `inconsistencias` detectadas automaticamente. O Fluxo A não tem nenhum desses atributos.

Segundo, o `diagnostic-consolidator.ts` já foi construído para que o Fluxo A **alimente** o Fluxo B — não o contrário. O consolidador transforma `corporateAnswers` + `operationalAnswers` + `cnaeAnswers` em `allAnswers[]`, que é exatamente o formato de entrada do `generateBriefing`. Isso indica que a intenção arquitetural original era usar o Fluxo A como **camada de coleta estruturada** e o Fluxo B como **motor de análise**.

Terceiro, o Fluxo A tem 7 seções com `[PLACEHOLDER]` — implementá-las exigiria esforço equivalente a criar um novo questionário estático, enquanto o Fluxo B já gera perguntas específicas por CNAE dinamicamente.

### 3.2 Papel do Fluxo A

**O Fluxo A não será eliminado — será reposicionado como camada de contexto estruturado (Perfil da Empresa).**

As seções QC-01..QC-03 (Corporativo) e QO-01..QO-03 (Operacional) coletam dados estruturados de alta qualidade: regime tributário, porte, tipo jurídico, tipos de operação, escopo geográfico, marketplace, importação/exportação. Esses dados já alimentam o `companyContext` injetado no prompt de geração de CNAEs (`extractCnaes`) e podem enriquecer o prompt do `generateBriefing`.

As seções QC-04..QC-10 e equivalentes do QO com `[PLACEHOLDER]` **serão removidas** — não implementadas. O conteúdo jurídico que elas deveriam cobrir será capturado pelo Questionário V3 de forma contextualizada por CNAE.

---

## 4. Arquitetura Final — Fluxo Único

```
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 1 — PERFIL DA EMPRESA                                    │
│  NovoProjeto.tsx + CPIE v2                                      │
│  Campos: nome, descrição, regime, porte, tipo jurídico          │
│  Gate: CPIE v2 (hard_block / soft_block / canProceed)           │
│  Persiste: projects (campos diretos + companyProfile JSON)      │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 2 — CONTEXTO OPERACIONAL  [Fluxo A — reposicionado]     │
│  QuestionarioCorporativoV2 (QC-01..QC-03) +                    │
│  QuestionarioOperacional (QO-01..QO-03)                         │
│  Objetivo: enriquecer o companyContext para geração de CNAEs   │
│  Gate: opcional — pode ser pulado se perfil já é suficiente     │
│  Persiste: projects.companyProfile + operationProfile (JSON)   │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 3 — DESCOBERTA E CONFIRMAÇÃO DE CNAEs                    │
│  fluxoV3.extractCnaes + fluxoV3.refineCnaes                    │
│  RAG ativo: filtra artigos por setor (2 primeiros dígitos CNAE) │
│  Persiste: projects.confirmedCnaes (JSON)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 4 — DIAGNÓSTICO ESPECIALIZADO  [Fluxo B — canônico]     │
│  QuestionarioV3.tsx                                             │
│  Para cada CNAE confirmado:                                     │
│    nivel1: 5 perguntas geradas por IA com RAG                  │
│    nivel2: 3 perguntas de aprofundamento (se necessário)       │
│  RAG ativo: 5.000+ artigos LC 214/2025 contextualizados        │
│  Persiste: questionnaireAnswersV3 (tabela dedicada)            │
│  Gate: todos os CNAEs nivel1 concluídos                        │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 5 — BRIEFING DE COMPLIANCE                               │
│  fluxoV3.generateBriefing                                       │
│  Entrada: questionnaireAnswersV3 + companyProfile +             │
│           operationProfile + RAG (7 artigos por CNAE)          │
│  Saída: briefingContent (markdown) + briefingStructured (JSON) │
│  Campos: nivel_risco_geral, principais_gaps, inconsistencias,  │
│          confidence_score, evidencias_regulatorias              │
│  Persiste: projects.briefingContent + briefingStructured       │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 6 — MATRIZ DE RISCOS                                     │
│  fluxoV3.generateRiskMatrices                                   │
│  Entrada: briefingStructured + confirmedCnaes                  │
│  Persiste: projects.riskMatricesData (JSON)                    │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ETAPA 7 — PLANO DE AÇÃO                                        │
│  fluxoV3.generateActionPlan                                     │
│  Entrada: riskMatricesData + briefingStructured                │
│  Persiste: projects.actionPlansData (JSON)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Modelo de Dados

### 5.1 Fonte Única de Verdade por Etapa

| Etapa | Tabela/Campo | Tipo | Responsável |
|---|---|---|---|
| Perfil da empresa | `projects` (campos diretos) | Colunas tipadas | `NovoProjeto.tsx` |
| Contexto operacional | `projects.companyProfile` + `operationProfile` | JSON | `QuestionarioCorporativoV2` + `QuestionarioOperacional` |
| CNAEs confirmados | `projects.confirmedCnaes` | JSON | `fluxoV3.confirmCnaes` |
| Respostas do diagnóstico | `questionnaireAnswersV3` | Tabela dedicada | `QuestionarioV3.tsx` |
| Progresso do questionário | `questionnaireProgressV3` | Tabela dedicada | `QuestionarioV3.tsx` |
| Cache de perguntas geradas | `questionnaireQuestionsCache` | Tabela dedicada | `fluxoV3.generateQuestions` |
| Briefing | `projects.briefingContent` + `briefingStructured` | Text + JSON | `fluxoV3.generateBriefing` |
| Matriz de riscos | `projects.riskMatricesData` | JSON | `fluxoV3.generateRiskMatrices` |
| Plano de ação | `projects.actionPlansData` | JSON | `fluxoV3.generateActionPlan` |

### 5.2 Campos a Deprecar

Os campos `projects.corporateAnswers`, `projects.operationalAnswers` e `projects.cnaeAnswers` serão mantidos no schema por compatibilidade com projetos existentes, mas **não serão mais escritos** por novos fluxos. O `diagnosticStatus` também será mantido para projetos legados. Nenhuma migração destrutiva é necessária.

### 5.3 Como Evitar Duplicidade

A regra é simples: **`questionnaireAnswersV3` é a única fonte de respostas do diagnóstico**. O `diagnostic-consolidator.ts` continuará existindo como adaptador de leitura para projetos legados (que têm dados em `corporateAnswers`/`operationalAnswers`/`cnaeAnswers`), mas não será mais o caminho de escrita.

---

## 6. Briefing e GAP Analysis

### 6.1 Fonte do Briefing

O `generateBriefing` do `routers-fluxo-v3.ts` é a única função que gera briefing. Ela recebe:

1. `allAnswers[]` — respostas do `questionnaireAnswersV3` agrupadas por CNAE
2. `companyProfile` + `operationProfile` — contexto estruturado do Fluxo A (Etapa 2)
3. Contexto RAG — 7 artigos recuperados por `retrieveArticles` filtrados pelos CNAEs confirmados

### 6.2 Fonte do GAP Analysis

O GAP analysis é gerado **dentro do briefing** — o campo `principais_gaps` do `BriefingStructuredSchema` contém cada gap com `causa_raiz`, `evidencia_regulatoria` e `urgencia`. Não há um endpoint separado de GAP analysis — ele é um subproduto do briefing.

### 6.3 Garantia de Consistência

A consistência é garantida porque **todos os outputs derivam da mesma fonte**: `questionnaireAnswersV3` → `generateBriefing` → `briefingStructured` → `generateRiskMatrices` → `riskMatricesData` → `generateActionPlan`. Nenhuma etapa lê de uma fonte diferente das anteriores.

---

## 7. Tratamento dos Placeholders

As seções QC-04..QC-10 do Questionário Corporativo e as equivalentes do Questionário Operacional **serão removidas da UI** — não implementadas. A decisão é baseada em três argumentos:

Primeiro, o conteúdo que essas seções deveriam cobrir (documentos fiscais, créditos, obrigações acessórias, contencioso, planejamento tributário, impacto da Reforma, prioridades) é exatamente o que o Questionário V3 cobre de forma contextualizada por CNAE — com a vantagem de que as perguntas são geradas com base nos artigos regulatórios relevantes para o setor específico da empresa.

Segundo, implementar 7 seções de perguntas jurídicas estáticas exigiria curadoria especializada e revisão jurídica contínua a cada atualização regulatória. O Questionário V3 é auto-atualizável via corpus RAG.

Terceiro, manter seções com `[PLACEHOLDER]` visível na UI é um risco de credibilidade com usuários finais.

**Ação concreta:** remover as seções QC-04..QC-10 do `QuestionarioCorporativoV2.tsx` e as equivalentes do `QuestionarioOperacional.tsx`, mantendo apenas QC-01..QC-03 e QO-01..QO-03 como formulário de contexto operacional (Etapa 2 da nova arquitetura).

---

## 8. Riscos por Abordagem

### 8.1 Riscos da Arquitetura Proposta (Fluxo B canônico)

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Qualidade das perguntas geradas por IA varia por CNAE pouco representado no corpus | Média | Médio | Monitorar `confidence_score` e adicionar artigos ao corpus para CNAEs com baixa cobertura |
| Latência na geração de perguntas (5–15s por CNAE) afeta UX | Alta | Médio | Cache em `questionnaireQuestionsCache` já implementado — reutiliza perguntas geradas |
| Usuário abandona o questionário no meio (muitos CNAEs) | Média | Alto | Persistência em `questionnaireAnswersV3` + `localStorage` já implementada — retomada automática |
| Corpus RAG desatualizado após novas regulamentações | Baixa | Alto | Pipeline de atualização do corpus (doc 19-versionamento-cpie.md) |
| Projetos legados com dados em `corporateAnswers`/`operationalAnswers` ficam sem briefing | Baixa | Médio | `diagnostic-consolidator.ts` mantido como adaptador de leitura para projetos legados |

### 8.2 Riscos de Manter o Fluxo A como Canônico (alternativa rejeitada)

| Risco | Probabilidade | Impacto |
|---|---|---|
| 7 seções com placeholder chegam a usuários finais | Alta | Crítico |
| Briefing sem RAG produz recomendações genéricas sem citação regulatória | Alta | Alto |
| Manutenção manual de perguntas jurídicas a cada atualização da Reforma | Alta | Alto |
| Dois modelos de dados paralelos continuam existindo indefinidamente | Alta | Alto |

### 8.3 Riscos de Eliminar o Fluxo A Completamente (alternativa rejeitada)

| Risco | Probabilidade | Impacto |
|---|---|---|
| Perda do contexto estruturado (regime, porte, tipo jurídico) que enriquece o `companyContext` | Alta | Médio |
| Projetos legados com dados em `corporateAnswers` ficam sem suporte | Média | Médio |
| Regressão no `extractCnaes` que usa `companyProfile` para filtrar CNAEs relevantes | Alta | Alto |

---

## 9. Decisão sobre Placeholders — Resumo

| Seção | Decisão | Justificativa |
|---|---|---|
| QC-01..QC-03 (Corporativo) | **Manter** como Etapa 2 | Dados estruturados de alta qualidade para `companyContext` |
| QC-04..QC-10 (Corporativo) | **Remover** da UI | Conteúdo coberto pelo Questionário V3 com RAG |
| QO-01..QO-03 (Operacional) | **Manter** como Etapa 2 | Dados operacionais essenciais para `companyContext` |
| QO-04..QO-10 (Operacional) | **Remover** da UI | Conteúdo coberto pelo Questionário V3 com RAG |
| QCNAE-01..QCNAE-05 (CNAE estático) | **Deprecar** | Substituído pelo Questionário V3 por CNAE |
| Questionário V3 (nivel1 + nivel2) | **Canônico** | Perguntas por IA com RAG, persistência dedicada |

---

## 10. Impacto no Produto — Resumo Executivo

A arquitetura proposta não é uma reescrita — é uma **reorganização do que já existe**. O `diagnostic-consolidator.ts`, o `generateBriefingFromDiagnostic` e o `questionnaireAnswersV3` já foram construídos. A decisão aqui é formalizar o Fluxo B como canônico, reposicionar o Fluxo A como camada de contexto, e remover os placeholders que representam risco de credibilidade.

O resultado esperado é um diagnóstico tributário com:

- Perguntas específicas por CNAE, geradas com base em artigos regulatórios reais
- Briefing com citações da LC 214/2025 e `confidence_score` declarado
- Rastreabilidade completa de cada resposta (por CNAE, nível e índice)
- Zero placeholders visíveis ao usuário final
- Manutenção simplificada — atualizações regulatórias refletem no corpus RAG, não em código

---

## 11. Próximos Passos (Pós-Aprovação)

| Ordem | Ação | Esforço estimado | Risco |
|---|---|---|---|
| 1 | Remover seções QC-04..QC-10 e QO-04..QO-10 da UI | Baixo | Baixo |
| 2 | Deprecar QCNAE estático — redirecionar para Questionário V3 | Baixo | Baixo |
| 3 | Corrigir persistência do DiagnosticoStepper (GAP-02) | Baixo | Baixo |
| 4 | Integrar `companyProfile` + `operationProfile` como contexto adicional no `generateBriefing` | Médio | Baixo |
| 5 | Adicionar monitoramento de `confidence_score` no Dashboard CPIE | Médio | Baixo |

---

*Este documento é uma PROPOSTA arquitetural. Nenhum código foi alterado. Aguarda aprovação do P.O. antes de qualquer implementação.*

*Referências de código: `server/routers/diagnostic.ts`, `server/routers-fluxo-v3.ts`, `server/diagnostic-consolidator.ts`, `drizzle/schema.ts`, `client/src/pages/QuestionarioCorporativoV2.tsx`, `client/src/pages/QuestionarioV3.tsx`*
