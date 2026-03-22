# Análise de Baseline — Questionários e RAG Regulatório
**Plataforma COMPLIANCE da Reforma Tributária**
**Data:** 22/03/2026 | **Versão:** 1.0 | **Status:** Aprovado para leitura

---

## 1. Resumo Executivo

Este documento mapeia o estado real (**AS-IS**) de todos os módulos de questionários da plataforma — Corporativo (QC), Operacional (QO) e Especializado por CNAE (QCNAE) — e do motor RAG regulatório, com base em leitura direta do código-fonte. Nenhuma suposição foi feita: todos os valores, regras e fluxos descritos aqui refletem o código em produção no checkpoint `d6fe9033`.

O diagnóstico revela que os três questionários estão funcionalmente implementados com persistência no banco, progressão sequencial bloqueada por gate, e integração com a máquina de estados do projeto. O RAG regulatório está operacional para a etapa de descoberta de CNAEs, mas **não está integrado** ao conteúdo das perguntas dos questionários Corporativo, Operacional e CNAE — que utilizam perguntas estáticas com marcadores `[PLACEHOLDER]`. Esta é a principal lacuna identificada.

---

## 2. Mapa de Módulos

| Módulo | Arquivo Frontend | Arquivo Backend | Status | Persistência |
|---|---|---|---|---|
| Questionário Corporativo v2 | `QuestionarioCorporativoV2.tsx` (394 linhas) | `routers/diagnostic.ts` | **Funcional** — perguntas estáticas com `[PLACEHOLDER]` | `projects.corporateAnswers` (JSON) |
| Questionário Operacional | `QuestionarioOperacional.tsx` (423 linhas) | `routers/diagnostic.ts` | **Funcional** — perguntas estáticas com `[PLACEHOLDER]` | `projects.operationalAnswers` (JSON) |
| Questionário Especializado CNAE | `QuestionarioCNAE.tsx` (~430 linhas) | `routers/diagnostic.ts` | **Funcional** — 5 seções estáticas (QCNAE-01..05) | `projects.cnaeAnswers` (JSON) |
| Questionário V3 (por CNAE, gerado por IA) | `QuestionarioV3.tsx` (1.526 linhas) | `routers-fluxo-v3.ts` | **Funcional** — perguntas geradas por IA com RAG | `questionnaireAnswersV3` (tabela dedicada) |
| DiagnosticoStepper | `DiagnosticoStepper.tsx` (443 linhas) | — | **Funcional** — estado local (não persiste no banco) | Apenas `useState` |
| Motor RAG | `rag-retriever.ts` (248 linhas) | `rag-corpus.ts` + `rag-corpus-lcs-novas.ts` | **Funcional** — usado na descoberta de CNAEs | `ragDocuments` (tabela) |

---

## 3. Fluxo AS-IS — Diagnóstico Sequencial (Corporativo → Operacional → CNAE)

### 3.1 Rota de Acesso

Os três questionários são acessíveis via rotas diretas registradas no `App.tsx`:

```
/projetos/:id/questionario-corporativo-v2   → QuestionarioCorporativoV2
/projetos/:id/questionario-operacional      → QuestionarioOperacional
/projetos/:id/questionario-cnae             → QuestionarioCNAE
/projetos/:id/diagnostico-stepper           → DiagnosticoStepper (orquestrador visual)
```

O `ProjetoDetalhesV2` também oferece acesso direto aos três questionários via botões na tela de detalhes do projeto, lendo `diagnosticStatus` do banco para determinar qual camada está disponível.

### 3.2 Máquina de Estados no Banco

O campo `diagnosticStatus` na tabela `projects` (tipo JSON) armazena o estado de cada camada:

```json
{
  "corporate": "not_started" | "in_progress" | "completed",
  "operational": "not_started" | "in_progress" | "completed",
  "cnae": "not_started" | "in_progress" | "completed"
}
```

O campo `currentStep` (int, default 1) e `currentStepName` (varchar, default `"perfil_empresa"`) na tabela `projects` controlam a etapa macro do projeto (1–9), mas **não são atualizados pelos questionários** — eles são atualizados pelo fluxo V3 (`routers-fluxo-v3.ts`).

### 3.3 Gate de Progressão Sequencial (Backend)

O endpoint `diagnostic.completeDiagnosticLayer` no `routers/diagnostic.ts` impõe a seguinte regra:

| Camada sendo completada | Pré-requisito obrigatório | Erro retornado se violado |
|---|---|---|
| `operational` | `corporate === "completed"` | `BAD_REQUEST: "O Diagnóstico Corporativo deve ser concluído antes de iniciar o Operacional."` |
| `cnae` | `operational === "completed"` | `BAD_REQUEST: "O Diagnóstico Operacional deve ser concluído antes de iniciar o CNAE."` |

O gate é verificado **no backend** — o frontend também verifica via `diagnosticStatus`, mas a proteção real está no servidor.

### 3.4 Salvamento de Respostas

Cada questionário oferece dois modos de salvamento:

- **Rascunho** (`updateDiagnosticStatus`): salva `status: "in_progress"` sem as respostas
- **Conclusão** (`completeDiagnosticLayer`): salva as respostas no campo JSON correspondente e avança o status para `"completed"`

Quando todas as três camadas estão `"completed"`, o backend automaticamente atualiza `projects.status` para `"diagnostico_cnae"`.

### 3.5 Conteúdo dos Questionários (Estado Atual)

#### Questionário Corporativo (QC-01..QC-10)
10 seções com perguntas estáticas. As seções QC-01 a QC-03 têm campos reais implementados (radio, checkbox, textarea). As seções QC-04 a QC-10 contêm `[PLACEHOLDER]` explícito no código, com a nota: *"Perguntas jurídicas finais serão inseridas na Fase 5 (pré-sprint RAG)."*

| Seção | Código | Campos implementados | Status |
|---|---|---|---|
| Identificação e enquadramento | QC-01 | 3 campos (regime, porte, obs) | Funcional |
| Estrutura societária | QC-02 | 4 campos (grupo, filiais, centralização, obs) | Funcional |
| Operações e incidência | QC-03 | 2 campos (tipos de operação, obs) | Funcional |
| Documentos fiscais e cadastro | QC-04 | Placeholder | **Pendente** |
| Créditos e aproveitamentos | QC-05 | Placeholder | **Pendente** |
| Obrigações acessórias | QC-06 | Placeholder | **Pendente** |
| Contencioso e passivos | QC-07 | Placeholder | **Pendente** |
| Planejamento tributário | QC-08 | Placeholder | **Pendente** |
| Impacto da Reforma Tributária | QC-09 | Placeholder | **Pendente** |
| Prioridades e próximos passos | QC-10 | Placeholder | **Pendente** |

#### Questionário Operacional (QO-01..QO-10)
Estrutura similar ao Corporativo — primeiras seções com campos reais, demais com `[PLACEHOLDER]`. Gate: exige `corporate === "completed"`.

#### Questionário Especializado por CNAE (QCNAE-01..QCNAE-05)
5 seções com campos reais implementados — este é o mais completo dos três. Gate: exige `operational === "completed"`.

| Seção | Código | Conteúdo |
|---|---|---|
| Identificação setorial | QCNAE-01 | CNAEs, quantidade de secundários |
| Tributação setorial específica | QCNAE-02 | ST, monofásico, tributos setoriais |
| IBS/CBS e Imposto Seletivo | QCNAE-03 | Impacto do IS, expectativa de carga |
| Regimes diferenciados | QCNAE-04 | Imunidades, isenções, regimes especiais |
| Estratégia e prioridades | QCNAE-05 | Prioridades, associações, assessoria |

---

## 4. Fluxo AS-IS — DiagnosticoStepper

O `DiagnosticoStepper` é um orquestrador visual com 8 etapas:

```
perfil → consistencia → cnaes_descoberta → cnaes_confirmacao →
diagnostico_corporativo → diagnostico_operacional → diagnostico_cnae →
[conclusão]
```

**Problema identificado:** o estado do stepper (`currentStep`, `completedSteps`) é armazenado apenas em `useState` — **não é persistido no banco**. Se o usuário fechar o browser ou navegar para outra página, o stepper reinicia do zero. O progresso real das camadas de diagnóstico está no banco (`diagnosticStatus`), mas o stepper não lê esse campo para se auto-inicializar.

---

## 5. Fluxo AS-IS — Questionário V3 (por CNAE, gerado por IA)

O `QuestionarioV3` é um módulo separado e mais avançado, acessível via `/projetos/:id/questionario-v3`. Ele:

1. Lê os CNAEs confirmados do projeto (`confirmedCnaes`)
2. Para cada CNAE, gera perguntas via IA (`fluxoV3.generateQuestions`) usando RAG regulatório
3. Salva cada resposta individualmente na tabela `questionnaireAnswersV3`
4. Persiste o progresso em `questionnaireProgressV3` e também em `localStorage` como cache local
5. Suporta dois níveis de profundidade: `nivel1` (perguntas gerais) e `nivel2` (aprofundamento)

Este módulo **não está integrado** ao fluxo dos três questionários estáticos — são fluxos paralelos e independentes.

---

## 6. Fluxo AS-IS — Motor RAG Regulatório

### 6.1 Corpus

O corpus RAG é composto por dois arquivos:

| Arquivo | Linhas | Entradas (artigos/leis) |
|---|---|---|
| `rag-corpus.ts` | 632 | ~200 entradas (corpus base) |
| `rag-corpus-lcs-novas.ts` | 22.148 | ~4.800 entradas (LC 214/2025 e LCs novas) |

O corpus é carregado na tabela `ragDocuments` via seeding. A tabela tem campos: `lei`, `artigo`, `titulo`, `conteudo`, `topicos`, `cnaeGroups`.

### 6.2 Estratégia de Busca (V65)

O retriever usa busca **híbrida** em 4 etapas:

1. **Pré-filtro por grupo CNAE** — filtra por setor usando os 2 primeiros dígitos do CNAE
2. **Busca LIKE multi-termo** — busca nos campos `titulo`, `topicos` e `conteudo` com até 15 palavras-chave extraídas do contexto
3. **Re-ranking via LLM** — seleciona os top-5 mais relevantes (temperatura 0.0)
4. **Retorno formatado** — contexto injetado nos prompts de geração de perguntas

**Precisão esperada:** 88–93% (vs 70% do corpus estático anterior).

### 6.3 Onde o RAG é Usado

| Módulo | Usa RAG? | Endpoint |
|---|---|---|
| Descoberta de CNAEs (`extractCnaes`) | **Sim** | `fluxoV3.extractCnaes` |
| Refinamento de CNAEs (`refineCnaes`) | **Sim** | `fluxoV3.refineCnaes` |
| Questionário V3 — geração de perguntas | **Sim** | `fluxoV3.generateQuestions` |
| Questionário Corporativo v2 | **Não** | `diagnostic.completeDiagnosticLayer` |
| Questionário Operacional | **Não** | `diagnostic.completeDiagnosticLayer` |
| Questionário CNAE estático | **Não** | `diagnostic.completeDiagnosticLayer` |
| Geração de briefing pós-diagnóstico | **Não** | `diagnostic.generateBriefingFromDiagnostic` |

---

## 7. Gap Analysis

### GAP-01 — Perguntas Placeholder nos Questionários Corporativo e Operacional

**Severidade:** Alta | **Impacto:** Funcional

As seções QC-04 a QC-10 do Questionário Corporativo e as seções equivalentes do Operacional contêm `[PLACEHOLDER]` explícito no código, com nota de que as perguntas jurídicas finais serão inseridas na "Fase 5 (pré-sprint RAG)". O usuário que navegar para essas seções verá apenas um texto de placeholder sem campos de resposta.

**Ação necessária:** Definir e inserir as perguntas jurídicas finais para as 7 seções pendentes do QC e as seções equivalentes do QO.

---

### GAP-02 — DiagnosticoStepper sem Persistência de Estado

**Severidade:** Média | **Impacto:** UX

O stepper não persiste `currentStep` e `completedSteps` no banco. Ao recarregar a página, o usuário perde o progresso visual do stepper, mesmo que as camadas de diagnóstico estejam salvas no banco.

**Ação necessária:** Inicializar o stepper lendo `diagnosticStatus` do banco para reconstruir `completedSteps` ao montar o componente.

---

### GAP-03 — RAG não integrado aos Questionários Estáticos

**Severidade:** Média | **Impacto:** Qualidade do diagnóstico

Os questionários Corporativo, Operacional e CNAE estático usam perguntas fixas sem contextualização regulatória. O RAG está disponível e operacional, mas só é usado no Questionário V3 e na descoberta de CNAEs.

**Ação necessária:** Avaliar se os questionários estáticos devem ser substituídos pelo Questionário V3 (gerado por IA com RAG) ou se o RAG deve ser integrado à geração de contexto/dicas nas perguntas estáticas.

---

### GAP-04 — Dois Fluxos de Questionário Paralelos e Não Integrados

**Severidade:** Alta | **Impacto:** Arquitetural

Existem dois fluxos paralelos de questionário:
- **Fluxo A** (Diagnóstico Sequencial): QC → QO → QCNAE estático, com persistência em `projects.corporateAnswers/operationalAnswers/cnaeAnswers`
- **Fluxo B** (Questionário V3): perguntas por CNAE geradas por IA, com persistência em `questionnaireAnswersV3`

Os dois fluxos não se comunicam. O `generateBriefingFromDiagnostic` usa apenas o Fluxo A. O Fluxo B tem seu próprio pipeline de consolidação (`fluxoV3.consolidateAnswers`). Não há uma visão unificada das respostas.

**Ação necessária:** Definir qual fluxo é o canônico para o diagnóstico tributário e deprecar ou integrar o outro.

---

### GAP-05 — Geração de Briefing sem RAG

**Severidade:** Baixa | **Impacto:** Qualidade do output

O endpoint `diagnostic.generateBriefingFromDiagnostic` gera o briefing usando apenas as respostas consolidadas dos questionários, sem injetar contexto regulatório via RAG. O briefing pode ser genérico para setores com regulamentação específica.

**Ação necessária:** Integrar `retrieveArticles` ao prompt de geração de briefing, usando os CNAEs confirmados do projeto como filtro de busca.

---

## 8. Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R-01 | Usuário completa QC-01..QC-03 e não encontra perguntas nas seções QC-04..QC-10 — percepção de bug | Alta | Alto | Inserir perguntas reais (GAP-01) antes do lançamento para usuários finais |
| R-02 | Stepper reiniciando ao recarregar gera confusão e suporte desnecessário | Média | Médio | Corrigir persistência do stepper (GAP-02) |
| R-03 | Dois fluxos paralelos geram dados duplicados e inconsistentes no banco | Média | Alto | Definir fluxo canônico (GAP-04) antes de escalar usuários |
| R-04 | Corpus RAG desatualizado após publicação de novas regulamentações da Reforma | Baixa | Alto | Implementar pipeline de atualização do corpus (ver doc 19-versionamento-cpie.md) |
| R-05 | Perguntas estáticas do QCNAE não cobrem setores com regimes diferenciados específicos | Média | Médio | Integrar RAG ao QCNAE ou usar Questionário V3 como substituto (GAP-03) |

---

## 9. Fluxo TO-BE (Recomendado)

Com base nos gaps identificados, o fluxo recomendado para a próxima sprint é:

```
[Perfil Empresa + CPIE v2]
        ↓
[Consistência Gate]
        ↓
[Descoberta e Confirmação de CNAEs]  ← RAG ativo
        ↓
[Questionário V3 por CNAE]           ← RAG ativo, perguntas geradas por IA
        ↓
[Consolidação de Respostas]
        ↓
[Geração de Briefing com RAG]        ← RAG ativo (TO-BE)
        ↓
[Matriz de Riscos → Plano de Ação]
```

O Fluxo A (questionários estáticos QC/QO/QCNAE) deve ser **mantido como complemento opcional** para empresas que precisam de um diagnóstico estruturado por seção jurídica, mas o Fluxo B (Questionário V3) deve ser o canônico para o diagnóstico tributário principal.

---

## 10. Tabela de Endpoints — Diagnóstico

| Endpoint tRPC | Método | Autenticação | Descrição |
|---|---|---|---|
| `diagnostic.getDiagnosticStatus` | query | protectedProcedure | Retorna `diagnosticStatus` do projeto |
| `diagnostic.completeDiagnosticLayer` | mutation | protectedProcedure | Salva respostas e avança status da camada |
| `diagnostic.updateDiagnosticStatus` | mutation | protectedProcedure | Salva rascunho sem avançar status |
| `diagnostic.generateBriefingFromDiagnostic` | mutation | protectedProcedure | Gera briefing a partir das 3 camadas concluídas |
| `fluxoV3.generateQuestions` | mutation | protectedProcedure | Gera perguntas por CNAE via IA + RAG |
| `fluxoV3.saveAnswer` | mutation | protectedProcedure | Salva resposta individual em `questionnaireAnswersV3` |
| `fluxoV3.getProgress` | query | protectedProcedure | Retorna progresso e respostas salvas do Questionário V3 |
| `fluxoV3.consolidateAnswers` | mutation | protectedProcedure | Consolida todas as respostas e avança para briefing |

---

## 11. Conclusão

O sistema de diagnóstico está arquiteturalmente sólido: persistência no banco, gate sequencial no backend, e dois fluxos complementares (estático e IA). A principal lacuna é o conteúdo pendente nas seções `[PLACEHOLDER]` dos questionários estáticos e a falta de integração entre os dois fluxos. O RAG está operacional e pode ser estendido para cobrir a geração de briefing sem alterações arquiteturais significativas.

**Prioridade recomendada para próxima sprint:**
1. Inserir perguntas jurídicas reais nas seções QC-04..QC-10 (GAP-01) — bloqueador para usuários finais
2. Corrigir persistência do DiagnosticoStepper (GAP-02) — impacto direto na UX
3. Definir fluxo canônico e deprecar ou integrar o paralelo (GAP-04) — risco arquitetural

---

*Documento gerado por leitura direta do código-fonte. Checkpoint de referência: `d6fe9033`.*
