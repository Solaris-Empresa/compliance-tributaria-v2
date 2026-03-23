# Documentação Técnica — IA Generativa e Motor de Diagnóstico
## Plataforma IA SOLARIS — Compliance Tributário

| Campo | Valor |
|---|---|
| **Versão** | 5.0 |
| **Data** | 23 de Março de 2026 |
| **Sprint de Referência** | v5.3.0 (versão atual em produção) |
| **Versão anterior** | v4.0 (IA SOLARIS v5.2.0, Sprint V74) |
| **Classificação** | Documento Técnico Interno |
| **Responsável** | Equipe SOLARIS |

> **Histórico de versões:**
> v1.0 (Sprint V60) → v2.0 (Sprint V69) → v3.0 (Sprint V74) → v4.0 (IA SOLARIS v5.2.0) → **v5.0 (Sprint v5.3.0, 23/03/2026)**
>
> **Mudanças desta versão:** Incorporação da arquitetura de diagnóstico dual V1/V3 (ADR-005), Shadow Mode com `getDiagnosticSource()`, gate de retrocesso com limpeza de dados (ADR-007), suite de validação automatizada Onda 1 + Onda 2 (107/107 ✅), protocolo UAT com advogados, métricas de performance atualizadas, roadmap revisado para Sprint V80+.

---

## Sumário

1. Visão Geral do Motor de IA
2. Arquitetura do Pipeline de IA
3. Modelo de Linguagem — GPT-4.1
4. Etapa 1 — Extração de CNAEs com Embeddings Semânticos
5. Cache de Embeddings e Busca por Similaridade de Cosseno
6. RAG Legislativo — Corpus de Artigos Tributários
7. Etapas 2 a 5 — Geração de Perguntas, Briefing, Riscos e Plano de Ação
8. Motor de Decisão (Veredito Final)
9. Scoring Determinístico — Cálculo do Risco Global
10. Controle de Temperatura e Determinismo
11. Schemas de Validação Zod — Contratos de Saída da IA
12. Resiliência — Retry, Timeout e Fallback
13. Administração de Embeddings — Rebuild Manual e Automático
14. Cron Job — Rebuild Automático Semanal
15. **Arquitetura de Diagnóstico Dual V1/V3 — ADR-005** *(novo v5.0)*
16. **Shadow Mode — Monitoramento de Divergências** *(novo v5.0)*
17. **Suite de Validação Automatizada — Onda 1 + Onda 2** *(novo v5.0)*
18. Limitações e Salvaguardas Anti-Alucinação
19. Métricas de Qualidade e Roadmap
20. Apêndice A — Arquivos de Código Relevantes
21. Apêndice B — Variáveis de Ambiente
22. Apêndice C — Tabelas do Banco de Dados
23. Apêndice D — ADRs e Decisões Arquiteturais *(novo v5.0)*

---

## 1. Visão Geral do Motor de IA

A plataforma IA SOLARIS utiliza inteligência artificial generativa em 7 pontos críticos do fluxo de diagnóstico tributário. O motor combina três tecnologias complementares: **GPT-4.1** (geração de texto e análise), **embeddings semânticos OpenAI** (busca vetorial de CNAEs) e **RAG legislativo** (recuperação de artigos tributários reais).

O design do motor prioriza três propriedades: **precisão** (citações legais reais, validação Zod, scoring determinístico), **resiliência** (timeout configurável por procedure, retry automático, fallback semântico) e **auditabilidade** (scoring reprodutível, log de auditoria, histórico de versões).

A versão 5.0 introduz uma quarta propriedade: **coexistência de motores**. O campo `flowVersion` em cada projeto determina qual motor de diagnóstico serve os dados — V1 (legado) ou V3 (novo) — permitindo migração gradual sem impacto nos 2.145 projetos existentes.

### Números-chave da plataforma (23/03/2026)

| Indicador | Valor |
|---|---|
| Projetos no banco | 2.145 |
| Usuários cadastrados | 1.497 |
| CNAEs com embedding | 1.332 / 1.332 (100%) |
| Documentos no corpus RAG | 1.241 |
| Testes automatizados | 107 / 107 ✅ |
| Divergências Shadow Mode | 274 (0 críticas) |
| Arquivos de teste | 102 |
| Tabelas no schema | 64 |

---

## 2. Arquitetura do Pipeline de IA

O pipeline de IA segue um fluxo sequencial de 5 etapas, cada uma com um ponto de integração distinto com o LLM:

```
Descrição do Negócio
        │
        ▼
[ETAPA 1] Extração de CNAEs
  ├─ splitIntoClauses() → cláusulas semânticas
  ├─ OpenAI Embeddings (text-embedding-3-small)
  ├─ Busca por cosseno no cache de 1.332 CNAEs
  ├─ Merge em 2 camadas (garantidos + globais)
  └─ GPT-4.1 → 2–6 CNAEs com confidence e justificativa
        │
        ▼
[ETAPA 2] Questionário Adaptativo
  ├─ RAG: 5 artigos por CNAE
  └─ GPT-4.1 → Perguntas com metadata diagnóstica
        │
        ▼
[ETAPA 3] Briefing de Compliance
  ├─ RAG: 7 artigos com re-ranking LLM (T=0.0)
  └─ GPT-4.1 → Briefing estruturado + confidence score
        │
        ▼
[ETAPA 4] Matrizes de Riscos
  ├─ RAG: 7 artigos por área
  ├─ 4 chamadas paralelas (Promise.all)
  └─ GPT-4.1 → Riscos por área (Contabilidade, Negócio, T.I., Jurídico)
        │
        ▼
[ETAPA 5] Plano de Ação + Decisão Executiva
  ├─ RAG: 7 artigos por área
  ├─ 4 chamadas paralelas (Promise.all)
  ├─ GPT-4.1 → Tarefas por área
  └─ GPT-4.1 (T=0.35) → Veredito executivo final
```

O **scoring determinístico** (`calculateGlobalScore`) é executado após a Etapa 4, sem envolver o LLM, produzindo um score de risco global auditável e reprodutível.

---

## 3. Modelo de Linguagem — GPT-4.1

A plataforma migrou do modelo `gpt-4o` para o **GPT-4.1** na Sprint v5.1.0. O GPT-4.1 oferece janela de contexto de 1M tokens, melhor seguimento de instruções e maior precisão em tarefas de análise jurídica estruturada.

Todas as chamadas ao LLM passam pelo helper `invokeLLM()` em `server/_core/llm.ts`, que encapsula:

- Autenticação via `OPENAI_API_KEY`
- Timeout configurável via `AbortController` (padrão: 180s)
- Retry automático via `generateWithRetry()` (padrão: 2 tentativas)
- Validação de schema Zod na saída de cada tentativa
- Log estruturado de erros com `projectId` e preview da descrição

O modelo é configurado como constante em `server/_core/llm.ts` e não deve ser alterado sem atualizar os schemas Zod, pois diferentes modelos podem produzir formatos de saída distintos.

---

## 4. Etapa 1 — Extração de CNAEs com Embeddings Semânticos

### Motivação

A versão 4.0 utilizava um sistema RAG baseado em busca LIKE (tokens hard-coded) para identificar CNAEs relevantes. A precisão era de ~78% em testes com casos reais. A versão 5.0 substitui essa abordagem por **busca semântica vetorial** com embeddings OpenAI, elevando a precisão para ~97%.

O problema central da abordagem anterior era a dependência de palavras-chave exatas: uma empresa que "fabrica cerveja artesanal" não era associada ao CNAE `1113-5/02` (Fabricação de cervejas e chopes) se a descrição usasse "produção de bebidas fermentadas". Com embeddings, a similaridade semântica captura essa equivalência.

### Pipeline da Etapa 1

A procedure `extractCnaes` em `server/routers-fluxo-v3.ts` executa o seguinte pipeline:

**Passo 1 — Divisão em Cláusulas Semânticas**

A função `splitIntoClauses()` divide a descrição do negócio em cláusulas independentes usando delimitadores naturais (`;`, ` e `, ` além de `, ` também `, `,`). Cada cláusula representa uma atividade distinta. Uma empresa com a descrição "produção de cerveja artesanal e distribuição para bares" é dividida em: `["produção de cerveja artesanal", "distribuição para bares"]`.

**Passo 2 — Embedding por Cláusula (Paralelo)**

Para cada cláusula, a função `getEmbedding()` chama a API OpenAI com o modelo `text-embedding-3-small` e retorna um vetor de 1.536 dimensões. As chamadas são executadas em paralelo via `Promise.all()` para minimizar latência.

**Passo 3 — Busca por Similaridade de Cosseno**

Para cada vetor de cláusula, a função `searchByCosine()` percorre o cache em memória dos 1.332 CNAEs e calcula a similaridade de cosseno com cada vetor CNAE armazenado. O resultado é uma lista de CNAEs ordenados por score (0 a 1).

**Passo 4 — Merge em 2 Camadas**

A função `mergeCandidates()` combina os resultados de todas as cláusulas em dois passos:
- **Camada 1 (Garantidos):** os top-5 CNAEs de cada cláusula são sempre incluídos no contexto, independente do score global. Isso garante que cada atividade da empresa tenha representação.
- **Camada 2 (Globais):** os CNAEs restantes são ordenados por score global e preenchem o contexto até o limite de 40 candidatos.

**Passo 5 — Formatação e Chamada ao LLM**

A função `formatCandidatesForPrompt()` formata os 40 candidatos como lista numerada com código, descrição e score de similaridade (%). O GPT-4.1 recebe esse contexto enriquecido e seleciona os 2–6 CNAEs mais relevantes, atribuindo `confidence` (0–100) e `justification` para cada um.

### Timeout e Fallback do `extractCnaes`

A procedure `extractCnaes` usa `timeoutMs: 25_000` (25 segundos) e `maxRetries: 1`. Se o GPT-4.1 não responder em 25s, o sistema ativa imediatamente o **fallback semântico**: retorna os top-5 CNAEs por similaridade de cosseno diretamente do cache, com `confidence ≤ 70` e `justification` contendo "similaridade semântica". O frontend detecta esse padrão e exibe um banner amber informativo no modal de CNAEs.

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

---

## 5. Cache de Embeddings e Busca por Similaridade de Cosseno

### Estrutura do Cache

O módulo `server/cnae-embeddings.ts` mantém um cache em memória dos 1.332 vetores CNAE. O cache é carregado do banco na primeira requisição e mantido por 1 hora (TTL). Após o TTL ou após um rebuild manual, o cache é invalidado e recarregado na próxima requisição.

```typescript
// Estrutura do item no cache
interface CnaeEmbeddingCache {
  cnaeCode: string;       // Ex: "4632-0/01"
  cnaeDescription: string; // Descrição oficial IBGE
  embedding: number[];    // Vetor de 1.536 floats
}
```

### Similaridade de Cosseno

A função `cosineSimilarity(a, b)` calcula o produto escalar normalizado entre dois vetores:

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}
```

Scores variam de 0 (sem similaridade semântica) a 1 (vetores idênticos). Não há threshold mínimo — todos os 1.332 CNAEs são ranqueados e os top-40 são enviados ao LLM.

### Latência

A busca por cosseno nos 1.332 CNAEs em memória adiciona ~150ms à latência da Etapa 1. Esse overhead é aceitável dado o ganho de precisão de 78% para 97%.

---

## 6. RAG Legislativo — Corpus de Artigos Tributários

O corpus legislativo contém **1.241 documentos reais** das seguintes fontes:

| Fonte | Documentos | Descrição |
|---|---|---|
| EC 132/2023 | ~180 | Emenda Constitucional da Reforma Tributária |
| LC 214/2025 | ~320 | Lei Complementar do IBS e CBS |
| LC 227/2024 | ~95 | Lei Complementar complementar |
| LC 116/2003 | ~85 | Lei do ISS |
| LC 87/1996 | ~70 | Lei Kandir (ICMS) |
| Resoluções CG-IBS | ~180 | 12 resoluções do Comitê Gestor |
| INs RFB/CBS | ~165 | 11 Instruções Normativas |
| Convênios CONFAZ | ~146 | 14 convênios estaduais |

O motor RAG usa dois modos complementares:

- **`retrieveArticlesFast`** — busca LIKE nos campos `topicos` e `cnaeGroups` da tabela `ragDocuments`. Sem re-ranking. Usado quando latência é prioritária (Etapas 2 e 5).
- **`retrieveArticles`** — busca LIKE seguida de re-ranking por LLM (temperatura 0.0). Usado quando precisão é prioritária (Etapas 3 e 4). O re-ranking determinístico garante que os artigos mais relevantes para o contexto específico do projeto sejam selecionados.

A precisão de citação estimada com RAG é de ~95%. Sem RAG, o LLM cita artigos com ~60% de precisão.

---

## 7. Etapas 2 a 5 — Geração de Perguntas, Briefing, Riscos e Plano de Ação

Todas as etapas 2 a 5 seguem o mesmo padrão arquitetural:

1. Recuperar artigos legislativos relevantes via RAG (5–7 artigos por chamada)
2. Construir um prompt com contexto legal + respostas anteriores + Contrato de Saída
3. Chamar o GPT-4.1 via `generateWithRetry()` com validação de schema Zod na saída
4. Persistir o resultado no banco via Drizzle ORM

**Etapa 2 — Geração de Perguntas:** A IA gera até 10 perguntas por CNAE com metadata diagnóstica completa (`objetivo_diagnostico`, `impacto_reforma`, `peso_risco`, `type`). O RAG injeta 5 artigos relevantes para o CNAE específico. Temperatura: 0.3 (alguma variação para perguntas diversas).

**Etapa 3 — Briefing de Compliance:** A IA consolida todas as respostas do questionário em um briefing estruturado com `nivel_risco_geral`, `resumo_executivo`, `principais_gaps`, `oportunidades`, `recomendacoes_prioritarias` e `confidence_score`. O RAG injeta 7 artigos com re-ranking LLM (temperatura 0.0). Temperatura do briefing: 0.2.

**Etapa 4 — Matrizes de Riscos:** A IA gera riscos por área (Contabilidade, Negócio, T.I., Jurídico) em 4 chamadas paralelas via `Promise.all()`. Cada risco tem `evento`, `causa_raiz`, `evidencia_regulatoria`, `probabilidade`, `impacto`, `severidade_score` (1–9) e `plano_acao`. Temperatura: 0.1 (alta precisão para identificação de riscos). Tempo total: ~35s (vs. ~3min sequencial).

**Etapa 5 — Plano de Ação:** A IA gera tarefas por área em 4 chamadas paralelas. Cada tarefa tem `titulo`, `descricao`, `area`, `prazo_sugerido`, `prioridade`, `responsavel_sugerido`, `objetivo_diagnostico` e `evidencia_regulatoria`. Temperatura: 0.2.

---

## 8. Motor de Decisão (Veredito Final)

O `generateDecision` produz o veredito executivo do diagnóstico após a aprovação do Plano de Ação. É o único ponto onde o LLM produz uma **recomendação direta de ação** — todas as outras saídas são análises e identificações.

O veredito contém:

| Campo | Descrição |
|---|---|
| `acao_principal` | A ação mais urgente que a empresa deve tomar |
| `prazo_dias` | Prazo recomendado em dias para a ação principal |
| `risco_se_nao_fazer` | Consequência estimada de não agir |
| `prioridade` | Enum: `critica` / `alta` / `media` / `baixa` |
| `proximos_passos` | Lista de 3–5 ações concretas e sequenciais |
| `momento_wow` | Insight diferenciado que surpreende o cliente |
| `fundamentacao_legal` | Artigos legais que fundamentam a recomendação |

Temperatura: 0.35 (leve variação para linguagem mais natural e personalizada). O RAG injeta 7 artigos com re-ranking para garantir fundamentação legal precisa.

---

## 9. Scoring Determinístico — Cálculo do Risco Global

O score de risco global é calculado **sem LLM** pela função `calculateGlobalScore()` em `server/ai-helpers.ts`. Por ser determinístico, o score é auditável e reprodutível — dois projetos com as mesmas respostas sempre produzem o mesmo score.

O cálculo usa:

- **Pesos por área de risco:** Contabilidade (30%), Jurídico (30%), Negócio (25%), T.I. (15%)
- **Severidade dos riscos:** Crítica=9, Alta=6, Média=3, Baixa=1
- **Probabilidade:** Alta=3, Média=2, Baixa=1
- **Score por risco:** `severidade_score × probabilidade_score`
- **Score global:** média ponderada por área, normalizada para 0–100

O resultado inclui:
- `score` (0–100)
- `nivel` (baixo/médio/alto/crítico)
- `impacto_estimado` (tradução financeira em R$, baseada em faixas percentuais do faturamento)
- `custo_inacao` (custo estimado de não agir nos próximos 12 meses)

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
| Motor de decisão (`generateDecision`) | 0.35 | Consistência com leve variação de linguagem |
| Scoring global | N/A | Determinístico — sem LLM |

---

## 11. Schemas de Validação Zod — Contratos de Saída da IA

Todas as saídas do LLM são validadas por schemas Zod definidos em `server/ai-schemas.ts`. Se o LLM retornar um JSON malformado ou com campos ausentes, o schema rejeita a resposta e o `generateWithRetry()` tenta novamente (até 2 vezes). Isso garante que o frontend nunca receba dados parciais ou corrompidos.

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

Todas as chamadas ao LLM têm timeout configurado via `AbortController` no módulo `server/_core/llm.ts`. O timeout padrão é de **180 segundos** para operações longas. A procedure `extractCnaes` usa timeout reduzido de **25 segundos** para garantir resposta rápida ao usuário.

| Procedure | `timeoutMs` | `maxRetries` | Justificativa |
|---|---|---|---|
| `extractCnaes` | **25.000ms (25s)** | **1** | GPT-4.1 responde em <5s normalmente; acima disso o fallback semântico garante sugestões imediatas |
| Demais procedures | 180.000ms (padrão) | 2 | Operações longas (briefing, matrizes) precisam de mais tempo |

> **Por que 25s no `extractCnaes`?** A identificação de CNAEs é o primeiro passo do fluxo e bloqueia o usuário na tela de criação de projeto. Se o GPT-4.1 demorar mais de 25s (raro, mas possível em picos de carga da API OpenAI), o sistema ativa imediatamente o fallback semântico — que retorna os top-5 CNAEs por similaridade de cosseno sem chamar o LLM. O usuário vê sugestões em vez de spinner infinito.

### Retry no `generateWithRetry()`

A função `generateWithRetry()` implementa retry automático com validação Zod em cada tentativa. Para o `extractCnaes`, `maxRetries: 1` significa uma única tentativa — se falhar, o fallback semântico entra imediatamente sem delay adicional.

### Fallback Semântico do `extractCnaes`

Se o LLM falhar (timeout, erro de API, JSON malformado), o `extractCnaes` não retorna erro para o usuário. Em vez disso, retorna os **top-5 CNAEs por similaridade de cosseno** diretamente do cache de embeddings, com `confidence ≤ 70` e `justification` contendo "similaridade semântica". O frontend detecta esse padrão e exibe um banner amber informativo no modal de CNAEs.

### Detecção de Fallback no Frontend

O componente `NovoProjeto.tsx` detecta automaticamente quando os CNAEs vêm do fallback semântico:

```typescript
// Detecta fallback semântico: todos os CNAEs com confidence ≤70 e justificativa padrão
const fallback = data.cnaes.length > 0 &&
  data.cnaes.every((c: Cnae) => c.confidence <= 70) &&
  data.cnaes.some((c: Cnae) => c.justification?.includes("similaridade semântica"));
setIsCnaeFallback(fallback);
```

Quando `isCnaeFallback === true`, o modal exibe:

> ⚠️ *A IA demorou mais que o esperado e usou **busca semântica** como alternativa. Revise as sugestões com atenção ou clique em **Pedir nova análise** para tentar novamente.*

### Monitoramento de Erros LLM

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

### Alertas Granulares

O scheduler envia alertas detalhados via `notifyOwner()` para diferentes cenários de falha:

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

## 15. Arquitetura de Diagnóstico Dual V1/V3 — ADR-005 *(novo v5.0)*

### Contexto e Motivação

A plataforma mantém dois motores de diagnóstico coexistentes para garantir compatibilidade retroativa com os 2.145 projetos existentes. O campo `flowVersion` na tabela `projects` determina qual motor serve cada projeto: `v1` para projetos legados, `v3` para projetos novos.

Antes da implementação do ADR-005 (Sprint v5.2.0), existiam **121 pontos de leitura direta** do diagnóstico espalhados pelo código, cada um com sua própria lógica de seleção de fonte. Isso tornava a migração V1→V3 arriscada e difícil de auditar.

### Adaptador `getDiagnosticSource()`

O adaptador centraliza todas as leituras do diagnóstico em um único ponto:

```typescript
// server/diagnostic-source.ts
export async function getDiagnosticSource(projectId: number): Promise<DiagnosticData> {
  const project = await db.getProjectById(projectId);
  if (project.flowVersion === 'v3') {
    return readFromV3Tables(project);
  }
  return readFromV1Tables(project);
}
```

O adaptador retorna um objeto `DiagnosticData` com campos normalizados que funcionam para ambos os fluxos, abstraindo as diferenças de schema entre V1 e V3.

### Fases de Implementação

| Fase | Sprint | Escopo | Testes |
|---|---|---|---|
| F-01 | v5.2.0 | Criação do `diagnostic-source.ts` + 75 testes unitários | 75 ✅ |
| F-02A | v5.2.0 | Migração do `routers-fluxo-v3.ts` (4 endpoints) | — |
| F-02B | v5.2.0 | Migração do `routers.ts` (3 endpoints V1) | — |
| F-02C | v5.2.0 | Migração do `flowStateMachine.ts` e `flowRouter.ts` | — |
| F-02D | v5.2.0 | Migração do `routers/diagnostic.ts` | — |
| F-03 | v5.2.0 | Gate de limpeza no retrocesso (`retrocesso-cleanup.ts`) | 46 ✅ |
| F-04 | v5.3.0 | Estratégia de migração de schema (ADR-008) | — |

### Gate de Limpeza no Retrocesso (F-03/ADR-007)

Ao retroceder da Etapa N para N-1, o sistema executa `cleanupOnRetrocesso()` que:

1. Identifica quais dados foram gerados pela IA na Etapa N (briefing, matrizes ou plano)
2. Remove esses dados do banco (não apenas marca como inativo — remove fisicamente)
3. Registra a operação em `projectAuditLog` com: `projectId`, `fromStep`, `toStep`, `cleanedData` (JSON), `userId`, `timestamp`
4. Exibe modal de confirmação ao usuário antes de executar

O gate é integrado diretamente no `saveStep` do `flowRouter.ts`, garantindo que qualquer retrocesso — seja via botão na UI ou via API direta — passe pela limpeza.

### Rollback Drill

O ADR-002 define o plano de rollback para o caso de falha da migração V1→V3:

1. Alterar `DIAGNOSTIC_READ_MODE` de `new` para `legacy` (sem deploy)
2. O adaptador `getDiagnosticSource()` volta a servir todos os projetos via V1
3. Tempo estimado de rollback: < 2 minutos (apenas mudança de variável de ambiente)

---

## 16. Shadow Mode — Monitoramento de Divergências *(novo v5.0)*

### Conceito

O Shadow Mode é o mecanismo de validação que executa os dois motores de diagnóstico em paralelo antes de ativar o modo `new`. Em modo `shadow`, o sistema:

1. Executa `getDiagnosticSource()` para V1 (fonte primária, retornada ao usuário)
2. Executa `getDiagnosticSource()` para V3 (fonte secundária, apenas para comparação)
3. Compara os resultados campo a campo
4. Registra divergências na tabela `diagnostic_shadow_divergences`

### Variável de Controle

A variável `DIAGNOSTIC_READ_MODE` controla o comportamento:

| Valor | Comportamento |
|---|---|
| `legacy` | Apenas V1. Modo padrão antes da migração |
| `shadow` | V1 + V3 em paralelo. V1 retornado ao usuário. Divergências registradas |
| `new` | Apenas V3. Modo pós-migração completa |

### Estado Atual do Shadow Mode (T=0, 23/03/2026)

| Indicador | Valor | Interpretação |
|---|---|---|
| Total de divergências | 274 | Todos do tipo "legado tem valor, nova é null" |
| Divergências críticas | 0 | Nenhum conflito real (ambos com valores diferentes) |
| Projetos afetados | 38 | Projetos pré-v2.1 com dados apenas no fluxo V1 |
| Campos monitorados | 3 | `briefingContent`, `riskMatricesData`, `actionPlansData` |
| Projetos UAT com divergência | 0 | Nenhum projeto UAT criado ainda |

Todas as 274 divergências são do padrão esperado: projetos criados antes da v2.1 têm dados no fluxo V1 mas não no V3. O adaptador `getDiagnosticSource()` os serve corretamente pelo fluxo V1.

### Critério de Ativação do Modo `new`

O modo `new` só deve ser ativado quando:

1. **0 divergências críticas** (tipo "ambos com valores diferentes")
2. **0 projetos UAT com divergência** (nenhum projeto criado no UAT apresenta divergência)
3. **Total de divergências ≤ 288** (5% acima do baseline de 274)
4. **UAT aprovado** (≥ 80% de aprovação nos 8 cenários, feedback jurídico positivo)

---

## 17. Suite de Validação Automatizada — Onda 1 + Onda 2 *(novo v5.0)*

### Visão Geral

A plataforma possui uma suite de validação automatizada com **107 testes** divididos em duas ondas, cobrindo os requisitos não-funcionais de carga, concorrência, retrocesso e integridade de dados. Todos os 107 testes passam em 100% das execuções.

### Onda 1 — Testes T01 a T10 (75 asserções)

A Onda 1 valida os requisitos funcionais básicos do fluxo V3 e do adaptador `getDiagnosticSource()`:

| Suite | Foco | Asserções |
|---|---|---|
| T01 | Criação de projetos em paralelo (10 simultâneos) | 8 |
| T02 | Race conditions de escrita (updates concorrentes) | 7 |
| T03 | Retrocesso simples (Etapa 3 → 2) | 8 |
| T04 | Persistência de progresso (fechar e reabrir) | 7 |
| T05 | Limpeza de dados no retrocesso (gate F-03) | 7 |
| T06 | Concorrência de leituras (30 simultâneas) | 8 |
| T07 | Integridade de dados (CNAEs e respostas) | 7 |
| T08 | Log de auditoria (retrocesso registrado) | 8 |
| T09 | Permissões por papel (cliente vs. equipe_solaris) | 7 |
| T10 | Rollback de dados corrompidos | 8 |

### Onda 2 — Testes T11 a T14 (32 asserções)

A Onda 2 valida os requisitos de carga extrema e retrocesso adversarial:

| Suite | Foco | Asserções | Tempo Medido |
|---|---|---|---|
| T11 | 50 projetos criados em paralelo, race conditions | 9 | 141ms (limite: 10s) |
| T12 | Integridade de CNAEs confirmados (JSON nativo mysql2) | 6 | 38ms |
| T13 | Respostas do questionário sem constraint única | 7 | 67ms |
| T14 | Retrocesso múltiplo acumulado, loop adversarial 10x | 10 | < 1s |

### Lições Técnicas da Onda 2

Durante a implementação da Onda 2, foram identificados e corrigidos três problemas técnicos relevantes:

**1. `createConnection` vs. `createPool`:** Os arquivos de teste originalmente usavam `createConnection` (conexão única), que conflitava quando múltiplos arquivos rodavam em paralelo no mesmo processo. A migração para `createPool` com conexões independentes por arquivo resolveu os conflitos de `afterAll`.

**2. Schema divergente:** Os testes foram escritos para um schema com colunas `flowVersion`, `revenueRange`, `operationTypes` que não existiam no banco de produção. Os testes foram adaptados para usar o schema real.

**3. JSON nativo do mysql2:** O driver mysql2 retorna colunas JSON como objetos JavaScript nativos (não como strings). Chamadas a `JSON.parse()` em valores já parseados causavam `"Unexpected end of JSON input"`. A correção usa `typeof value === 'string' ? JSON.parse(value) : value`.

---

## 18. Limitações e Salvaguardas Anti-Alucinação

A plataforma é transparente sobre as limitações da IA:

- As citações legais podem ser parafraseadas de forma imprecisa mesmo com RAG
- O `confidence_score` sinaliza quando revisão por advogado é obrigatória
- Para setores muito específicos (mineração de lítio, biotecnologia avançada), o embedding semântico pode não encontrar CNAEs com alta similaridade
- A Reforma Tributária ainda está sendo regulamentada — artigos do corpus podem ser alterados por resoluções posteriores
- A tradução financeira do risco é uma estimativa baseada em fatores percentuais, não em análise contábil real

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
| **Adaptador `getDiagnosticSource()`** | **Centraliza 121 leituras do diagnóstico** | **Migração V1→V3 auditável e reversível** |
| **Gate de retrocesso** | **`cleanupOnRetrocesso()` no `saveStep`** | **Dados órfãos eliminados automaticamente** |
| **Shadow Mode** | **Execução paralela V1/V3 com registro de divergências** | **Migração validada antes de ativar modo `new`** |

---

## 19. Métricas de Qualidade e Roadmap

### Métricas Atuais (Sprint v5.3.0)

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
| Timeout máximo do `extractCnaes` | **25s** | — |
| Testes automatizados passando | **107/107 (100%)** | 100% |
| Divergências Shadow Mode críticas | **0** | 0 |

### Roadmap de Evolução da IA

| Prioridade | Feature | Descrição | Sprint Estimado |
|---|---|---|---|
| Alta | Ativação do modo `new` | Após UAT aprovado (≥ 80% cenários, 0 divergências críticas) | v5.4.0 |
| Alta | Timeout no `refineCnaes` | Aplicar `timeoutMs: 30_000` para consistência com `extractCnaes` | v5.4.0 |
| Alta | Embeddings do corpus RAG | Substituir LIKE por busca semântica nos artigos legais | V76 |
| Alta | Streaming de respostas | Exibir briefing sendo gerado em tempo real | V77 |
| Média | Alerta de cobertura baixa | Badge vermelho no sidebar quando cobertura < 95% | V75 |
| Média | Rebuild por CNAE individual | Atualizar embedding de um único CNAE sem rebuild completo | V76 |
| Média | Teste de integração do fallback | Verificar que quando LLM falha, top-5 por cosseno são retornados | v5.4.0 |
| Baixa | Fine-tuning setorial | Modelo especializado em tributação brasileira | V80+ |
| Baixa | Análise de documentos | Upload de contratos e notas fiscais para análise automática | V80+ |

---

## Apêndice A — Arquivos de Código Relevantes

| Arquivo | Responsabilidade | Sprint |
|---|---|---|
| `server/cnae-embeddings.ts` | RAG semântico vetorial, cache, multi-query, merge | V71 |
| `server/routers-admin-embeddings.ts` | Endpoint admin de rebuild, status, histórico | V72 |
| `server/embeddings-scheduler.ts` | Cron job de rebuild + alertas granulares | V73 + v5.2.0 |
| `server/_core/llm.ts` | Cliente LLM com timeout e AbortController | v5.1.0 |
| `server/ai-helpers.ts` | `generateWithRetry`, `calculateGlobalScore`, `OUTPUT_CONTRACT` | Existente |
| `server/ai-schemas.ts` | Schemas Zod para todos os outputs de IA | Existente |
| `server/rag-retriever.ts` | Motor RAG híbrido (LIKE + re-ranking LLM) | Existente |
| `server/rag-corpus.ts` | Corpus de 1.241 documentos tributários | Existente |
| `server/routers-fluxo-v3.ts` | Todos os 7 pontos de integração da IA + timeout 25s | v5.2.0 |
| `drizzle/schema.ts` | Tabelas `cnaeEmbeddings`, `embeddingRebuildLogs`, `ragDocuments`, `diagnostic_shadow_divergences`, `projectAuditLog` | Existente + v5.2.0 |
| `scripts/generate-cnae-embeddings.mjs` | Script de geração inicial dos embeddings | V71 |
| `client/src/pages/AdminEmbeddings.tsx` | UI de administração de embeddings | V72 |
| `client/src/pages/NovoProjeto.tsx` | Modal de CNAEs com detecção de fallback e banner amber | v5.2.0 |
| **`server/diagnostic-source.ts`** | **Adaptador `getDiagnosticSource()` — centraliza 121 leituras** | **v5.2.0 (F-01)** |
| **`server/retrocesso-cleanup.ts`** | **Gate de limpeza de dados no retrocesso** | **v5.2.0 (F-03)** |
| **`server/routers/shadowMode.ts`** | **Endpoints do Shadow Monitor** | **v5.2.0** |
| **`server/onda1-t01-t05.test.ts`** | **Testes T01–T05 (37 asserções)** | **v5.3.0** |
| **`server/onda1-t06-t10.test.ts`** | **Testes T06–T10 (38 asserções)** | **v5.3.0** |
| **`server/onda2-t11-carga.test.ts`** | **Testes T11 — 50 projetos em paralelo** | **v5.3.0** |
| **`server/onda2-t12-t13.test.ts`** | **Testes T12–T13 — integridade de dados** | **v5.3.0** |
| **`server/onda2-t14-retrocesso.test.ts`** | **Testes T14 — retrocesso adversarial** | **v5.3.0** |

---

## Apêndice B — Variáveis de Ambiente

| Variável | Uso | Obrigatória | Observação |
|---|---|---|---|
| `OPENAI_API_KEY` | Autenticação na API OpenAI (LLM GPT-4.1 + embeddings) | **Sim** | Ausência causa falha silenciosa do CNAE discovery em produção |
| `DATABASE_URL` | Conexão com TiDB para corpus RAG e embeddings | **Sim** | — |
| `JWT_SECRET` | Assinatura de cookies de sessão | **Sim** | — |
| `VITE_APP_ID` | ID da aplicação Manus OAuth | **Sim** | — |
| `DIAGNOSTIC_READ_MODE` | Controle do motor de diagnóstico | **Sim** | Valores: `legacy`, `shadow`, `new`. Padrão: `legacy` |
| `BUILT_IN_FORGE_API_KEY` | Autenticação na Forge API (legado) | Não | Mantido para compatibilidade |
| `BUILT_IN_FORGE_API_URL` | URL base da Forge API (legado) | Não | Mantido para compatibilidade |
| `VITE_FRONTEND_FORGE_API_KEY` | Autenticação frontend (não utilizado para IA) | Não | — |

> **Atenção crítica:** A `OPENAI_API_KEY` deve ser configurada como secret tanto no ambiente de desenvolvimento quanto em produção. A ausência desta variável causa o erro "OPENAI_API_KEY is not configured" no servidor, fazendo o `extractCnaes` falhar silenciosamente e o modal de CNAEs abrir vazio.

> **Atenção:** `DIAGNOSTIC_READ_MODE` deve ser `legacy` ou `shadow` durante o UAT. Só deve ser alterado para `new` após aprovação formal do UAT com todos os critérios atendidos.

---

## Apêndice C — Tabelas do Banco de Dados

### Tabela `cnaeEmbeddings` (Sprint V71)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `cnaeCode` | VARCHAR(20) UNIQUE | Código CNAE (ex: `4632-0/01`) |
| `cnaeDescription` | TEXT | Descrição oficial do IBGE |
| `embeddingJson` | MEDIUMTEXT | Vetor de 1.536 floats em JSON |
| `createdAt` | DATETIME | Data de criação/atualização |

### Tabela `embeddingRebuildLogs` (Sprint V73)

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

### Tabela `diagnostic_shadow_divergences` *(novo v5.0)*

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `projectId` | INT | ID do projeto com divergência |
| `field_name` | VARCHAR(100) | Campo com divergência (ex: `briefingContent`) |
| `reason` | VARCHAR(255) | Tipo de divergência (ex: "legacy_has_value_new_is_null") |
| `legacyValue` | TEXT NULL | Valor do motor V1 (truncado para log) |
| `newValue` | TEXT NULL | Valor do motor V3 (truncado para log) |
| `createdAt` | DATETIME | Timestamp da divergência |

### Tabela `projectAuditLog` *(novo v5.0)*

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Identificador único |
| `projectId` | INT | ID do projeto |
| `action` | VARCHAR(100) | Ação executada (ex: "retrocesso_limpeza") |
| `fromStep` | VARCHAR(50) | Etapa de origem |
| `toStep` | VARCHAR(50) | Etapa de destino |
| `cleanedData` | JSON | Dados removidos (resumo) |
| `userId` | INT | ID do usuário que executou |
| `timestamp` | BIGINT | Timestamp UTC da operação |

### Tabela `ragDocuments` (Existente)

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

## Apêndice D — ADRs e Decisões Arquiteturais *(novo v5.0)*

A plataforma mantém 8 Architecture Decision Records (ADRs) que documentam as decisões técnicas mais relevantes:

| ADR | Título | Sprint | Status |
|---|---|---|---|
| ADR-001 | Arquitetura do Diagnóstico Tributário | v5.2.0 | Aprovado |
| ADR-002 | Plano de Implementação com Rollback | v5.2.0 | Aprovado |
| ADR-003 | Exaustão de Riscos (Matriz 20 riscos, 19 consumidores) | v5.2.0 | Aprovado |
| ADR-004 | Fonte de Verdade do Diagnóstico (7 decisões formais) | v5.2.0 | Aprovado |
| ADR-005 | Isolamento Físico das Fontes de Verdade | v5.2.0 | **Implementado** |
| ADR-006 | Relatório de Validação Prática do ADR-005 | v5.2.0 | Aprovado |
| ADR-007 | Gate de Limpeza de Dados no Retrocesso | v5.2.0 | **Implementado** |
| ADR-008 | Estratégia de Migração de Schema (F-04) | v5.3.0 | Em implementação |

Os ADRs estão disponíveis em `docs/product/cpie-v2/produto/ADR-00X-*.md` no repositório GitHub.

---

*Documento atualizado em 23/03/2026 — IA SOLARIS v5.0 (Sprint v5.3.0)*
*Versão anterior: v4.0 (IA SOLARIS v5.2.0, Sprint V74, 21/03/2026)*
*Próxima revisão prevista: Junho de 2026 (Sprint V80)*
*Mantido por: Equipe SOLARIS*
