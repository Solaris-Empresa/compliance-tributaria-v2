# IA SOLARIS — Documentação de IA Generativa

**Versão:** 4.0 — Sprint v5.2.0  
**Data:** 21 de março de 2026  
**Público-alvo:** Product Owner, Tech Lead, Equipe de Desenvolvimento  
**Próxima revisão:** Junho de 2026 (Sprint V80)

> **Histórico de versões deste documento:**  
> v3.0 (Sprint V74, 19/03/2026) → v4.0 (Sprint v5.2.0, 21/03/2026)  
> **Mudanças desta versão:** Migração do LLM de Gemini 2.5 Flash para GPT-4.1 (OpenAI), timeout explícito de 25s no `extractCnaes`, alertas granulares no cron de rebuild, banner de fallback semântico no frontend.

---

## Sumário

1. [Visão Geral da Arquitetura de IA](#1-visão-geral-da-arquitetura-de-ia)
2. [Fluxo Completo de 5 Etapas](#2-fluxo-completo-de-5-etapas)
3. [Etapa 1 — Identificação de CNAEs com RAG Semântico Vetorial](#3-etapa-1--identificação-de-cnaes-com-rag-semântico-vetorial)
4. [Estratégia Multi-Query e Merge em 2 Camadas](#4-estratégia-multi-query-e-merge-em-2-camadas)
5. [Embeddings Vetoriais OpenAI — Conceitos e Implementação](#5-embeddings-vetoriais-openai--conceitos-e-implementação)
6. [RAG Legislativo — Corpus de Artigos Tributários](#6-rag-legislativo--corpus-de-artigos-tributários)
7. [Etapas 2 a 5 — Geração de Perguntas, Briefing, Riscos e Plano de Ação](#7-etapas-2-a-5--geração-de-perguntas-briefing-riscos-e-plano-de-ação)
8. [Motor de Decisão (Veredito Final)](#8-motor-de-decisão-veredito-final)
9. [Scoring Determinístico — Cálculo do Risco Global](#9-scoring-determinístico--cálculo-do-risco-global)
10. [Controle de Temperatura e Determinismo](#10-controle-de-temperatura-e-determinismo)
11. [Schemas de Validação Zod — Contratos de Saída da IA](#11-schemas-de-validação-zod--contratos-de-saída-da-ia)
12. [Resiliência — Retry, Timeout e Fallback](#12-resiliência--retry-timeout-e-fallback)
13. [Administração de Embeddings — Rebuild Manual e Automático](#13-administração-de-embeddings--rebuild-manual-e-automático)
14. [Cron Job — Rebuild Automático Semanal](#14-cron-job--rebuild-automático-semanal)
15. [Limitações e Salvaguardas Anti-Alucinação](#15-limitações-e-salvaguardas-anti-alucinação)
16. [Métricas de Qualidade e Roadmap](#16-métricas-de-qualidade-e-roadmap)
17. [Apêndice A — Arquivos de Código Relevantes](#apêndice-a--arquivos-de-código-relevantes)
18. [Apêndice B — Variáveis de Ambiente](#apêndice-b--variáveis-de-ambiente)
19. [Apêndice C — Tabelas do Banco de Dados](#apêndice-c--tabelas-do-banco-de-dados)

---

## 1. Visão Geral da Arquitetura de IA

A plataforma IA SOLARIS utiliza **dois sistemas de IA complementares** que trabalham em conjunto para produzir um diagnóstico tributário completo e auditável.

O primeiro sistema é o **LLM (Large Language Model)**, representado pelo modelo **GPT-4.1** (OpenAI), responsável por raciocinar, interpretar linguagem natural, gerar perguntas, identificar riscos e redigir textos analíticos. O LLM é o "cérebro interpretativo" da plataforma — ele entende o contexto do negócio e produz análises qualitativas.

> **Nota de migração (Sprint v5.1.0):** Até a Sprint V74, o LLM utilizado era o **Gemini 2.5 Flash** (Google) via Forge API (`BUILT_IN_FORGE_API_KEY`). A partir do Sprint v5.1.0, o sistema migrou para **GPT-4.1** (OpenAI) via `OPENAI_API_KEY` diretamente, mantendo a mesma interface `invokeLLM()`. A variável `OPENAI_API_KEY` é agora **obrigatória** tanto em desenvolvimento quanto em produção.

O segundo sistema é o **Modelo de Embeddings**, representado pelo **OpenAI text-embedding-3-small**, responsável por transformar textos em vetores numéricos de 1.536 dimensões para busca semântica. O modelo de embeddings é o "sistema de memória semântica" da plataforma — ele encontra os CNAEs e artigos legais mais relevantes para cada negócio, independente das palavras exatas usadas.

> **Analogia para o P.O.:** Pense no LLM como um advogado tributarista experiente que lê e interpreta documentos. Os embeddings são como um bibliotecário que, antes de o advogado começar a trabalhar, já separou na mesa todos os livros e artigos legais mais relevantes para aquele caso específico. O advogado trabalha muito melhor com os materiais certos na mesa.

A combinação dessas duas tecnologias forma o padrão **RAG (Retrieval-Augmented Generation)** — o sistema primeiro *recupera* os dados mais relevantes (CNAEs, artigos legais) e depois *gera* a análise com base nesses dados. Isso reduz drasticamente as alucinações e aumenta a precisão das citações legais.

### Diagrama de Arquitetura

```
Descrição do Negócio (usuário)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│           ETAPA 1 — RAG SEMÂNTICO DE CNAEs              │
│                                                         │
│  Descrição → splitIntoClauses() → N cláusulas           │
│       │                                                 │
│       ▼ (paralelo)                                      │
│  embedQuery() → OpenAI text-embedding-3-small           │
│       │                                                 │
│       ▼                                                 │
│  cosineSimilarity() vs 1.332 CNAEs em cache             │
│       │                                                 │
│       ▼                                                 │
│  Merge 2 camadas: garantidos (top-5/cláusula) + pool    │
│       │                                                 │
│       ▼                                                 │
│  Contexto: até 50 CNAEs candidatos                      │
│       │                                                 │
│       ▼                                                 │
│  GPT-4.1 → JSON com CNAEs identificados (timeout 25s)  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│        ETAPAS 2-5 — RAG LEGISLATIVO + GERAÇÃO           │
│                                                         │
│  CNAEs identificados → RAG Legislativo (corpus 63 arts) │
│       │                                                 │
│       ▼                                                 │
│  GPT-4.1 → Perguntas → Briefing → Riscos               │
│       │                                                 │
│       ▼                                                 │
│  Scoring Determinístico (sem LLM)                       │
│       │                                                 │
│       ▼                                                 │
│  GPT-4.1 → Plano de Ação + Veredito Final              │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Fluxo Completo de 5 Etapas

O diagnóstico tributário é estruturado em 5 etapas sequenciais, cada uma com um papel específico da IA:

| Etapa | Nome | Papel da IA | Técnica Principal | Arquivo |
|---|---|---|---|---|
| 1 | Identificação de CNAEs | Identificar os códigos de atividade econômica | RAG Semântico Vetorial (Embeddings) + GPT-4.1 | `cnae-embeddings.ts` |
| 2 | Questionário | Gerar perguntas diagnósticas personalizadas | RAG Legislativo + GPT-4.1 | `routers-fluxo-v3.ts` |
| 3 | Briefing | Produzir análise executiva do risco | RAG Legislativo + GPT-4.1 | `routers-fluxo-v3.ts` |
| 4 | Matriz de Riscos | Identificar e quantificar riscos por área | RAG Legislativo + GPT-4.1 | `routers-fluxo-v3.ts` |
| 5 | Plano de Ação | Gerar tarefas e veredito final | GPT-4.1 + Scoring Determinístico | `routers-fluxo-v3.ts` |

---

## 3. Etapa 1 — Identificação de CNAEs com RAG Semântico Vetorial

### O Problema que Motivou a Mudança

Antes da Sprint V71, a identificação de CNAEs usava uma abordagem baseada em **tokens e dicionário de sinônimos hard-coded** (`cnae-rag.ts`). Esse sistema tinha limitações críticas: "calcário" não encontrava "corretivos do solo" (sem semântica), empresas com múltiplas atividades tinham cobertura incompleta, e o dicionário precisava de manutenção manual constante.

### A Solução: Embeddings Vetoriais

A Sprint V71 substituiu completamente o sistema antigo por **busca semântica vetorial** usando o modelo `text-embedding-3-small` da OpenAI. O princípio fundamental é simples: textos com significado similar produzem vetores numericamente próximos no espaço de 1.536 dimensões.

> **Analogia:** Imagine um mapa onde cada CNAE é um ponto geográfico. "Calcário" e "corretivos do solo" ficam próximos nesse mapa porque têm significado similar no contexto agrícola. A busca semântica encontra os pontos mais próximos da sua descrição, independente das palavras exatas usadas.

### Pré-computação dos Embeddings

Todos os 1.332 CNAEs da tabela CNAE 2.3 do IBGE foram pré-computados e armazenados na tabela `cnaeEmbeddings` do banco de dados. Cada registro contém o código CNAE, a descrição oficial do IBGE, e o vetor de 1.536 floats em JSON (gerado pelo `text-embedding-3-small`). A pré-computação foi realizada em 14 batches de 95 CNAEs via script `scripts/generate-cnae-embeddings.mjs`, consumindo aproximadamente 3 minutos.

### Cache em Memória com TTL

Para evitar consultas repetidas ao banco a cada requisição, o módulo `cnae-embeddings.ts` mantém um **cache em memória** com TTL de 1 hora. A primeira requisição após o servidor iniciar carrega ~1.332 vetores do banco (~200ms); as requisições subsequentes usam o cache em memória (~1ms). O cache é invalidado automaticamente após 1 hora ou manualmente após um rebuild de embeddings.

### Similaridade de Cosseno

A métrica usada para comparar o embedding da query com cada CNAE é a **similaridade de cosseno**. Ela mede o ângulo entre dois vetores: quanto menor o ângulo, mais similares são os textos. O resultado é um número entre -1 e 1, onde 1 significa textos idênticos. Na prática, scores acima de 0.55 indicam alta relevância semântica.

---

## 4. Estratégia Multi-Query e Merge em 2 Camadas

### O Problema da Query Única

Quando uma empresa tem múltiplas atividades, uma única query semântica dilui o significado. O vetor resultante tenta representar tudo ao mesmo tempo e acaba não representando nada com precisão suficiente. Nos testes, o CNAE `4683-4/00` (comércio de defensivos agrícolas) aparecia apenas na posição 28 com uma única query — fora do contexto enviado para a IA.

### A Solução: Divisão em Cláusulas

A função `splitIntoClauses()` divide a descrição em cláusulas independentes por atividade (separadas por vírgula, ponto-e-vírgula, "e", "além de"). Para cada cláusula, um embedding separado é gerado em paralelo via `Promise.all`. O merge final usa 2 camadas: top-5 por cláusula garantidos + pool geral até 50 candidatos, eliminando duplicatas por código CNAE.

---

## 5. Embeddings Vetoriais OpenAI — Conceitos e Implementação

O modelo `text-embedding-3-small` da OpenAI produz vetores de 1.536 dimensões. Cada dimensão captura um aspecto semântico diferente do texto. A função `embedQuery()` chama a API OpenAI com a query do usuário e retorna o vetor correspondente. Este vetor é então comparado com todos os 1.332 vetores pré-computados usando similaridade de cosseno.

A escolha do `text-embedding-3-small` foi estratégica: oferece excelente qualidade semântica para português brasileiro a um custo muito baixo (frações de centavo por query), com latência de ~150ms por chamada.

---

## 6. RAG Legislativo — Corpus de Artigos Tributários

O corpus legislativo contém **63 artigos reais** das seguintes fontes: EC 132/2023, LC 214/2025, LC 227/2024, 12 Resoluções CG-IBS, 11 IN RFB/CBS, e 14 Convênios CONFAZ. O motor RAG usa dois modos complementares: `retrieveArticlesFast` (busca LIKE para velocidade) e `retrieveArticles` (re-ranking LLM com temperatura 0.0 para precisão máxima). A precisão de citação estimada é de ~95%.

---

## 7. Etapas 2 a 5 — Geração de Perguntas, Briefing, Riscos e Plano de Ação

Todas as etapas 2 a 5 seguem o mesmo padrão: recuperar artigos legislativos relevantes via RAG, construir um prompt com contexto legal, e chamar o GPT-4.1 via `generateWithRetry()` com validação de schema Zod na saída. A geração das 4 matrizes de riscos (Etapa 4) usa `Promise.all` para paralelização (~45s vs ~3min sequencial).

---

## 8. Motor de Decisão (Veredito Final)

O `generateDecision` produz o veredito final do diagnóstico: ação principal recomendada, prazo em dias, risco se não agir, prioridade (crítica/alta/média/baixa), próximos passos concretos, e fundamentação legal. Este é o único ponto onde o LLM produz uma recomendação direta de ação — todas as outras saídas são análises e identificações.

---

## 9. Scoring Determinístico — Cálculo do Risco Global

O score de risco global é calculado **sem LLM** pela função `calculateComplianceScore()` em `server/lib/compliance-score-v4.ts` (hot swap Z-12 / ADR-0022). Chamada via `trpc.risksV4.calculateAndSaveScore`. Usa pesos por severidade do risco (alta=7, media=5, oportunidade=1) × confidence (com piso 0.5), sobre riscos aprovados, produzindo número de 0 a 100. Por ser determinístico, o score é auditável e reprodutível — dois projetos com as mesmas respostas sempre produzem o mesmo score. _Nota: a função anterior `calculateGlobalScore()` em `ai-helpers.ts` está deprecated (ver issue #800)._

---

## 10. Controle de Temperatura e Determinismo

| Operação | Temperatura | Justificativa |
|---|---|---|
| Identificação de CNAEs (`extractCnaes`) | 0.1 | Alta precisão, mínima criatividade |
| Refinamento de CNAEs (`refineCnaes`) | 0.2 | Leve variação para explorar alternativas |
| Geração de perguntas (`generateQuestions`) | 0.3 | Alguma variação para perguntas diversas |
| Briefing (`generateBriefing`) | 0.2 | Consistência com leve fluidez textual |
| Matrizes de riscos (`generateRiskMatrices`) | 0.1 | Alta precisão para identificação de riscos |
| Re-ranking RAG | 0.0 | Determinístico absoluto para seleção de artigos |
| Motor de decisão (`generateDecision`) | 0.2 | Consistência com leve variação de linguagem |

---

## 11. Schemas de Validação Zod — Contratos de Saída da IA

Todas as saídas do LLM são validadas por schemas Zod definidos em `server/ai-schemas.ts`. Se o LLM retornar um JSON malformado ou com campos ausentes, o schema rejeita a resposta e o `generateWithRetry()` tenta novamente. Isso garante que o frontend nunca receba dados parciais ou corrompidos.

| Schema | Procedure | Campos Obrigatórios |
|---|---|---|
| `CnaesResponseSchema` | `extractCnaes`, `refineCnaes` | `cnaes[].code`, `cnaes[].description`, `cnaes[].confidence`, `cnaes[].justification` |
| `QuestionsResponseSchema` | `generateQuestions` | `questions[].id`, `questions[].text`, `questions[].type`, `questions[].cnaeCode` |
| `BriefingResponseSchema` | `generateBriefing` | `executive_summary`, `risk_areas[]`, `confidence_score`, `revision_recommendation` |
| `RiskMatrixResponseSchema` | `generateRiskMatrices` | `risks[].area`, `risks[].severity`, `risks[].probability`, `risks[].financial_impact` |
| `ActionPlanResponseSchema` | `generateActionPlan` | `tasks[].title`, `tasks[].priority`, `tasks[].deadline_days`, `tasks[].legal_basis` |
| `DecisaoResponseSchema` | `generateDecision` | `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `prioridade`, `proximos_passos`, `momento_wow`, `fundamentacao_legal` |

---

## 12. Resiliência — Retry, Timeout e Fallback

### Timeout com AbortController

Todas as chamadas ao LLM têm timeout configurado via `AbortController` no módulo `server/_core/llm.ts`. O timeout padrão é de **180 segundos** para operações longas, mas cada procedure pode sobrescrever esse valor via o parâmetro `timeoutMs`.

**Timeouts configurados por procedure (Sprint v5.2.0):**

| Procedure | `timeoutMs` | `maxRetries` | Justificativa |
|---|---|---|---|
| `extractCnaes` | **25.000ms (25s)** | **1** | GPT-4.1 responde em <5s normalmente; acima disso o fallback semântico garante sugestões imediatas |
| Demais procedures | 180.000ms (padrão) | 2 | Operações longas (briefing, matrizes) precisam de mais tempo |

> **Por que 25s no `extractCnaes`?** A identificação de CNAEs é o primeiro passo do fluxo e bloqueia o usuário na tela de criação de projeto. Se o GPT-4.1 demorar mais de 25s (raro, mas possível em picos de carga da API OpenAI), o sistema ativa imediatamente o fallback semântico — que retorna os top-5 CNAEs por similaridade de cosseno sem chamar o LLM. O usuário vê sugestões em vez de spinner infinito.

### Retry no `generateWithRetry()`

A função `generateWithRetry()` implementa retry automático. O número de tentativas é configurável por procedure via `maxRetries`. Para o `extractCnaes`, `maxRetries: 1` significa uma única tentativa — se falhar, o fallback semântico entra imediatamente sem delay adicional.

### Fallback Semântico do `extractCnaes`

Se o LLM falhar (timeout, erro de API, JSON malformado), o `extractCnaes` não retorna erro para o usuário. Em vez disso, retorna os **top-5 CNAEs por similaridade de cosseno** diretamente do cache de embeddings, com `confidence ≤ 70` e `justification` contendo "similaridade semântica". O frontend detecta esse padrão e exibe um banner amber informativo no modal de CNAEs.

```typescript
// Fallback: usar os top-5 candidatos por similaridade semântica quando a IA falha
const fallbackCnaes = semanticCandidates.slice(0, 5).map(c => ({
  code: c.cnaeCode,
  description: c.cnaeDescription,
  confidence: Math.round(c.similarity * 100),
  justification: `Sugerido por similaridade semântica (score: ${c.similarity.toFixed(3)})`,
}));
return { cnaes: fallbackCnaes };
```

### Detecção de Fallback no Frontend (Sprint v5.2.0)

O componente `NovoProjeto.tsx` detecta automaticamente quando os CNAEs vêm do fallback semântico e exibe um banner de aviso:

```typescript
// Detecta fallback semântico: todos os CNAEs com confidence ≤70 e justificativa padrão
const fallback = data.cnaes.length > 0 &&
  data.cnaes.every((c: Cnae) => c.confidence <= 70) &&
  data.cnaes.some((c: Cnae) => c.justification?.includes("similaridade semântica"));
setIsCnaeFallback(fallback);
```

Quando `isCnaeFallback === true`, o modal exibe:

> ⚠️ *A IA demorou mais que o esperado e usou **busca semântica** como alternativa. Revise as sugestões com atenção ou clique em **Pedir nova análise** para tentar novamente.*

### Monitoramento de Erros LLM (Sprint v5.1.0)

Quando o `extractCnaes` falha (antes de ativar o fallback), o servidor registra um log estruturado e envia notificação ao owner via `notifyOwner()`:

```
[extractCnaes][TIMEOUT] projectId=240002 | descPreview="produção de cerveja stout..." | erro=Request timed out after 25000ms
[extractCnaes][ERROR] projectId=240003 | descPreview="..." | erro=OpenAI API error 429
```

O título da notificação diferencia TIMEOUT de ERROR para facilitar o diagnóstico:
- `⏱️ extractCnaes — Timeout (>25s) — fallback ativado`
- `⚠️ extractCnaes falhou — fallback ativado`

### Fallback Silencioso do RAG

Se o banco de dados estiver indisponível ou o cache de embeddings vazio, o sistema falha silenciosamente e o prompt é enviado sem contexto RAG, com a instrução `"(base de embeddings não disponível — use a lista completa CNAE 2.3)"`. O LLM ainda tenta identificar CNAEs sem o contexto semântico.

### Extração Robusta de JSON

O GPT-4.1 pode retornar respostas com texto adicional fora do JSON. A função `extractJsonFromLLMResponse()` lida com todos os formatos: remove blocos de markdown, extrai o maior bloco JSON `{ ... }` na string, e retorna `null` se nenhum JSON válido for encontrado.

---

## 13. Administração de Embeddings — Rebuild Manual e Automático

### Por que é Necessário Reconstruir os Embeddings?

Os embeddings são gerados uma vez e armazenados no banco. Eles precisam ser reconstruídos quando: o IBGE atualiza o CNAE 2.3 (novos códigos ou descrições alteradas), a OpenAI lança um modelo de embeddings melhor, o banco de dados é migrado, ou a cobertura cai abaixo de 95%.

### Endpoint de Administração

O router `adminEmbeddingsRouter` expõe 4 procedures tRPC, todas restritas ao papel `equipe_solaris`:

| Procedure | Tipo | Descrição |
|---|---|---|
| `admin.embeddings.getStatus` | Query | Status do banco (cobertura, última atualização, rebuild em andamento) |
| `admin.embeddings.rebuild` | Mutation | Dispara rebuild completo em background |
| `admin.embeddings.invalidateCache` | Mutation | Invalida o cache em memória (força recarga do banco) |
| `admin.embeddings.getHistory` | Query | Histórico das últimas 20 execuções (manual + cron) |

### Progresso em Tempo Real via WebSocket

O rebuild é executado **em background** (não bloqueia a requisição HTTP). O progresso é emitido via WebSocket usando eventos específicos:

| Evento WebSocket | Dados | Quando |
|---|---|---|
| `embeddings:rebuild:started` | `{ total, batchSize }` | Início do rebuild |
| `embeddings:rebuild:progress` | `{ processed, total, batch, percent }` | A cada batch concluído |
| `embeddings:rebuild:batchError` | `{ batch, error }` | Erro em um batch específico |
| `embeddings:rebuild:completed` | `{ processed, total, errors, durationSeconds }` | Conclusão |
| `embeddings:rebuild:error` | `{ message }` | Erro fatal (API key ausente, banco indisponível) |

### Parâmetros do Rebuild

| Parâmetro | Valor | Descrição |
|---|---|---|
| Modelo | `text-embedding-3-small` | Modelo OpenAI de embeddings |
| Batch size | 95 CNAEs por requisição | Máximo permitido pela API OpenAI |
| Total de batches | 14 batches | Para 1.332 CNAEs |
| Pausa entre batches | 200ms | Evita rate limiting da API |
| Duração estimada | ~3 minutos | Para rebuild completo |
| Estratégia de escrita | Upsert (INSERT ... ON DUPLICATE KEY UPDATE) | Atualiza sem deletar |

---

## 14. Cron Job — Rebuild Automático Semanal

### Configuração

O módulo `embeddings-scheduler.ts` agenda um rebuild automático toda **segunda-feira às 03:00 (horário de Brasília, America/São_Paulo)**. A expressão cron `0 3 * * 1` significa: minuto 0, hora 3, qualquer dia do mês, qualquer mês, segunda-feira (1).

### Alertas Granulares (Sprint v5.2.0)

O scheduler foi aprimorado com alertas detalhados via `notifyOwner()` para diferentes cenários de falha:

| Cenário | Alerta Enviado | Ação Recomendada |
|---|---|---|
| Rebuild concluído com sucesso | `✅ Rebuild Embeddings CNAE — Concluído` | Nenhuma |
| `OPENAI_API_KEY` ausente | `❌ Rebuild Embeddings CNAE — API Key Ausente` | Configurar secret no painel |
| HTTP 401/403 da OpenAI (chave expirada/inválida) | `🔑 Rebuild Embeddings CNAE — Chave Expirada/Inválida` | Renovar `OPENAI_API_KEY` no painel de secrets |
| Banco de dados indisponível | `❌ Rebuild Embeddings CNAE — Banco Indisponível` | Verificar `DATABASE_URL` |
| Falha parcial >10% dos batches | `⚠️ Rebuild Embeddings CNAE — Falha Parcial` | Verificar logs; considerar rebuild manual |
| Falha geral (outros erros) | `❌ Rebuild Embeddings CNAE — Falha` | Verificar logs do servidor |

> **Por que o alerta de chave expirada é crítico?** Se a `OPENAI_API_KEY` expirar, os embeddings ficam desatualizados silenciosamente até a próxima execução bem-sucedida. Com o alerta imediato de HTTP 401/403, o owner é notificado na mesma segunda-feira às 03h, podendo renovar a chave antes do pico de uso semanal.

### Ciclo de Vida de uma Execução Agendada

A execução segue o fluxo: verificar se não há rebuild em andamento → criar registro em `embeddingRebuildLogs` (status: "running") → processar 14 batches × 95 CNAEs via OpenAI API (~3 min) → atualizar log a cada 5 batches → invalidar cache em memória → atualizar registro final → enviar `notifyOwner()`.

---

## 15. Limitações e Salvaguardas Anti-Alucinação

### Limitações Conhecidas

A plataforma é transparente sobre as limitações da IA. As citações legais podem ser parafraseadas de forma imprecisa mesmo com RAG, e o `confidence_score` sinaliza quando revisão por advogado é obrigatória. Para setores muito específicos (mineração de lítio, biotecnologia avançada), o embedding semântico pode não encontrar CNAEs com alta similaridade. A Reforma Tributária ainda está sendo regulamentada, e artigos do corpus podem ser alterados por resoluções posteriores. A tradução financeira do risco é uma estimativa baseada em fatores percentuais, não em análise contábil real.

### Salvaguardas Implementadas

| Salvaguarda | Implementação | Efeito |
|---|---|---|
| Contrato de Saída | Instrução no final de cada prompt | IA auto-verifica antes de responder |
| Instrução anti-alucinação | "cite apenas artigos do contexto" | Reduz citações inventadas |
| Confidence Score | Campo obrigatório no briefing | Usuário sabe o nível de confiança |
| Recomendação de revisão | Enum com 3 níveis | Sinaliza quando advogado é necessário |
| Alertas de Inconsistência | Painel visual (Sprint V64) | Destaca contradições nas respostas |
| Scoring determinístico | Cálculo matemático sem LLM | Score auditável e reprodutível |
| Validação Zod | Schema em todas as saídas | Rejeita outputs malformados |
| Fallback semântico | Top-5 por cosseno quando LLM falha | Usuário sempre vê sugestões |
| Banner de fallback | Aviso amber no modal de CNAEs | Usuário sabe que IA usou fallback |
| Cache TTL | 1 hora de validade | Evita dados muito desatualizados |
| Rebuild automático | Cron toda segunda às 03h | Mantém embeddings atualizados |
| Alertas de rebuild | `notifyOwner()` para 5 cenários de falha | Owner notificado imediatamente |
| Timeout `extractCnaes` | 25s com fallback imediato | Sem spinner infinito para o usuário |
| Log TIMEOUT vs ERROR | Log estruturado no servidor | Diagnóstico rápido sem vasculhar Git |

---

## 16. Métricas de Qualidade e Roadmap

### Métricas Atuais (Sprint v5.2.0)

| Métrica | Valor Atual | Meta |
|---|---|---|
| Precisão de identificação de CNAEs (top-20) | **~97%** (vs. ~78% com tokens) | 99% |
| Cobertura CNAE (embeddings no banco) | **100%** (1.332/1.332) | 100% |
| Precisão de citação RAG legislativo | ~95% | 98% |
| Taxa de retry por timeout | ~3% | <1% |
| Taxa de falha de validação Zod | ~2% | <0.5% |
| Tempo médio de geração de perguntas | ~25s | <15s |
| Tempo médio de geração de briefing | ~45s | <30s |
| Tempo médio de geração de matrizes (4 áreas) | ~35s (paralelo) | <20s |
| Latência adicional por embeddings (query) | ~150ms | <100ms |
| Timeout máximo do `extractCnaes` | **25s** (novo) | — |

### Roadmap de Evolução da IA

| Prioridade | Feature | Descrição | Sprint Estimado |
|---|---|---|---|
| Alta | Timeout no `refineCnaes` | Aplicar `timeoutMs: 30_000` para consistência com `extractCnaes` | v5.3.0 |
| Alta | Embeddings do corpus RAG | Substituir LIKE por busca semântica nos artigos legais | V76 |
| Alta | Streaming de respostas | Exibir briefing sendo gerado em tempo real | V77 |
| Média | Alerta de cobertura baixa | Badge vermelho no sidebar quando cobertura < 95% | V75 |
| Média | Rebuild por CNAE individual | Atualizar embedding de um único CNAE sem rebuild completo | V76 |
| Média | Teste de integração do fallback | Verificar que quando LLM falha, top-5 por cosseno são retornados | v5.3.0 |
| Baixa | Fine-tuning setorial | Modelo especializado em tributação brasileira | V80+ |
| Baixa | Análise de documentos | Upload de contratos e notas fiscais para análise automática | V80+ |

---

## Apêndice A — Arquivos de Código Relevantes

| Arquivo | Responsabilidade | Novidade |
|---|---|---|
| `server/cnae-embeddings.ts` | RAG semântico vetorial, cache, multi-query, merge | Sprint V71 |
| `server/routers-admin-embeddings.ts` | Endpoint admin de rebuild, status, histórico | Sprint V72 |
| `server/embeddings-scheduler.ts` | Cron job de rebuild + alertas granulares | Sprint V73 + **v5.2.0** |
| `server/_core/llm.ts` | Cliente LLM com timeout e AbortController | Migrado para GPT-4.1 em **v5.1.0** |
| `server/ai-helpers.ts` | `generateWithRetry`, `calculateGlobalScore`, `OUTPUT_CONTRACT` | Existente |
| `server/ai-schemas.ts` | Schemas Zod para todos os outputs de IA | Existente |
| `server/rag-retriever.ts` | Motor RAG híbrido (LIKE + re-ranking LLM) | Existente |
| `server/rag-corpus.ts` | Corpus de 63 artigos tributários | Existente |
| `server/routers-fluxo-v3.ts` | Todos os 7 pontos de integração da IA + timeout 25s | **v5.2.0** |
| `drizzle/schema.ts` | Tabelas `cnaeEmbeddings`, `embeddingRebuildLogs`, `ragDocuments` | Existente |
| `scripts/generate-cnae-embeddings.mjs` | Script de geração inicial dos embeddings | Sprint V71 |
| `client/src/pages/AdminEmbeddings.tsx` | UI de administração de embeddings | Sprint V72 |
| `client/src/pages/NovoProjeto.tsx` | Modal de CNAEs com detecção de fallback e banner amber | **v5.2.0** |

---

## Apêndice B — Variáveis de Ambiente

| Variável | Uso | Obrigatória | Observação |
|---|---|---|---|
| `OPENAI_API_KEY` | Autenticação na API OpenAI (LLM GPT-4.1 + embeddings) | **Sim** | **Obrigatória desde v5.1.0** — ausência causa falha silenciosa do CNAE discovery em produção |
| `DATABASE_URL` | Conexão com TiDB para corpus RAG e embeddings | **Sim** | — |
| `JWT_SECRET` | Assinatura de cookies de sessão | **Sim** | — |
| `VITE_APP_ID` | ID da aplicação Manus OAuth | **Sim** | — |
| `BUILT_IN_FORGE_API_KEY` | Autenticação na Forge API (legado — não mais usado para LLM) | Não | Mantido para compatibilidade |
| `BUILT_IN_FORGE_API_URL` | URL base da Forge API (legado) | Não | Mantido para compatibilidade |
| `VITE_FRONTEND_FORGE_API_KEY` | Autenticação frontend (não utilizado para IA — IA é server-side) | Não | — |

> **Atenção crítica:** A `OPENAI_API_KEY` deve ser configurada como secret tanto no ambiente de desenvolvimento quanto em produção. A ausência desta variável causa o erro "OPENAI_API_KEY is not configured" no servidor, fazendo o `extractCnaes` falhar silenciosamente e o modal de CNAEs abrir vazio. Este foi o bug raiz identificado e corrigido na Sprint v5.1.0.

---

## Apêndice C — Tabelas do Banco de Dados

### Tabela `cnaeEmbeddings` (Sprint V71)

Armazena os vetores pré-computados de todos os 1.332 CNAEs.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `cnaeCode` | VARCHAR(20) UNIQUE | Código CNAE (ex: `4632-0/01`) |
| `cnaeDescription` | TEXT | Descrição oficial do IBGE |
| `embeddingJson` | MEDIUMTEXT | Vetor de 1.536 floats em JSON |
| `createdAt` | DATETIME | Data de criação/atualização |

### Tabela `embeddingRebuildLogs` (Sprint V73)

Histórico de todas as execuções de rebuild (manual e cron).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `triggeredBy` | ENUM | "manual" ou "cron" |
| `triggeredByUserId` | INT NULL | ID do usuário (se manual) |
| `status` | ENUM | "running", "completed", "failed" |
| `totalCnaes` | INT | Total de CNAEs a processar |
| `processedCnaes` | INT | CNAEs processados com sucesso |
| `errorCount` | INT | Número de erros de batch |
| `lastError` | TEXT NULL | Mensagem do último erro |
| `durationSeconds` | INT NULL | Duração em segundos |
| `startedAt` | DATETIME | Início da execução |
| `finishedAt` | DATETIME NULL | Fim da execução |

### Tabela `ragDocuments` (Existente)

Corpus de artigos tributários para o RAG legislativo.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `lei` | VARCHAR(50) | Fonte legal (lc214, ec132, etc.) |
| `artigo` | VARCHAR(50) | Número do artigo |
| `titulo` | VARCHAR(255) | Título do artigo |
| `conteudo` | TEXT | Texto completo |
| `topicos` | TEXT | Palavras-chave para busca LIKE |
| `cnaeGroups` | TEXT | Grupos CNAE aplicáveis |
| `chunkIndex` | INT | Índice do chunk |

---

*Documento atualizado em 21/03/2026 — IA SOLARIS v5.2.0*  
*Versão anterior: v3.0 (Sprint V74, 19/03/2026)*  
*Próxima revisão prevista: Junho de 2026 (Sprint V80)*  
*Mantido por: Equipe SOLARIS*
