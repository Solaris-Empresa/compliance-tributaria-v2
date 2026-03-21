# Arquitetura do Pipeline CNAE Discovery

> **Versão:** 5.6.0 — Atualizado em 2026-03-21  
> **Escopo:** Arquitetura técnica completa do pipeline de identificação automática de CNAEs por IA.

---

## Visão Geral

O pipeline CNAE Discovery converte a descrição textual de um negócio em códigos CNAE (Classificação Nacional de Atividades Econômicas — IBGE 2.3) usando uma combinação de busca semântica por embeddings e geração de linguagem natural com GPT-4.1.

O pipeline opera em dois modos:

| Modo | Trigger | Descrição |
|---|---|---|
| **`extractCnaes`** | Automático ao criar projeto | Extrai CNAEs da descrição inicial do negócio |
| **`refineCnaes`** | Botão "Pedir nova análise" | Refina CNAEs com base em feedback do usuário |

---

## Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                     CNAE Discovery Pipeline                      │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ Company      │    │ Semantic Context  │    │ GPT-4.1       │  │
│  │ Profile      │───▶│ Builder          │───▶│ (extractCnaes)│  │
│  │ (JSON)       │    │ (cnae-embeddings) │    │               │  │
│  └──────────────┘    └──────────────────┘    └───────┬───────┘  │
│                               │                      │          │
│                               ▼                      ▼          │
│                      ┌────────────────┐    ┌─────────────────┐  │
│                      │ Embedding Cache│    │ CNAE Response   │  │
│                      │ (Map in memory)│    │ (JSON + tracer) │  │
│                      │ 1332 × 1536dim │    └─────────────────┘  │
│                      └────────────────┘                         │
│                               │                                  │
│                               ▼                                  │
│                      ┌────────────────┐                         │
│                      │ TiDB (MySQL)   │                         │
│                      │ cnae_embeddings│                         │
│                      │ table          │                         │
│                      └────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo Detalhado — `extractCnaes`

### Etapa 1: Carregamento do Projeto

O procedimento tRPC `fluxoV3.extractCnaes` recebe `projectId` e carrega o projeto do banco de dados, incluindo `description`, `companyProfile` e `operationProfile`.

### Etapa 2: Construção do Contexto Semântico

A função `buildSemanticCnaeContext()` em `cnae-embeddings.ts` constrói um texto enriquecido combinando:

- Descrição do negócio (campo livre)
- Regime tributário (Simples Nacional, Lucro Presumido, Lucro Real)
- Porte da empresa (MEI, ME, EPP, Grande)
- Tipo de operação (produto/serviço/misto)
- Tipo de cliente (B2B/B2C/Governo)

Este contexto enriquecido melhora a precisão da busca semântica ao considerar o perfil completo da empresa.

### Etapa 3: Busca Semântica por Embeddings

O contexto é convertido em um vetor de 1.536 dimensões usando `text-embedding-3-small` (OpenAI). O vetor é comparado com os 1.332 embeddings pré-calculados em memória usando **similaridade de cosseno**. Os top-10 candidatos mais similares são selecionados como contexto para o LLM.

**Fórmula de similaridade de cosseno:**
```
similarity(A, B) = (A · B) / (‖A‖ × ‖B‖)
```

Valores próximos a 1.0 indicam alta similaridade semântica.

### Etapa 4: Chamada ao GPT-4.1

Os top-10 candidatos semânticos são enviados ao GPT-4.1 com um prompt estruturado solicitando:
- Seleção dos CNAEs mais relevantes (máximo 5)
- Justificativa para cada CNAE selecionado
- Score de relevância (0-100)

**Parâmetros da chamada:**
- `model`: GPT-4.1 (via `OPENAI_API_KEY`)
- `temperature`: 0.2 (respostas determinísticas)
- `timeoutMs`: 25.000ms (fallback ativado se exceder)
- `maxRetries`: 1

### Etapa 5: Fallback Semântico

Se o GPT-4.1 falhar (timeout, erro de rede, chave inválida), o pipeline ativa automaticamente o **fallback semântico**: retorna os top-5 candidatos da busca por embeddings diretamente, sem passar pelo LLM. O frontend exibe um banner amber informando que as sugestões são automáticas e devem ser revisadas.

### Etapa 6: Serialização e Resposta

Os CNAEs selecionados são serializados com código, descrição, justificativa e score de relevância. O `requestId` do tracer é incluído na resposta para correlação com logs.

---

## Modelo de Embeddings

| Parâmetro | Valor |
|---|---|
| Modelo | `text-embedding-3-small` |
| Dimensões | 1.536 |
| Métrica de similaridade | Cosseno |
| Total de CNAEs | 1.332 (IBGE 2.3) |
| Batch size (rebuild) | 95 CNAEs por chamada |
| Tempo de rebuild | ~3 minutos |

---

## Ciclo de Vida dos Embeddings

```
IBGE CNAE 2.3 (1332 códigos)
        │
        ▼
  text-embedding-3-small (OpenAI)
        │
        ▼
  TiDB: tabela cnae_embeddings
  (id, code, description, embedding BLOB 1536×float32)
        │
        ▼
  warmUpEmbeddingCache() no startup
        │
        ▼
  Map<string, Float32Array> em memória
  (carregado uma vez, reutilizado em todas as requisições)
        │
        ▼
  Rebuild automático: toda segunda-feira 03:00 BRT
  (embeddings-scheduler.ts → node-cron)
```

---

## Arquivos do Pipeline

| Arquivo | Responsabilidade |
|---|---|
| `server/cnae-embeddings.ts` | Cache em memória, busca semântica, warm-up, `buildSemanticCnaeContext` |
| `server/cnae-rag.ts` | Orquestração do RAG (Retrieval-Augmented Generation) |
| `server/routers-fluxo-v3.ts` | Procedures tRPC `extractCnaes` e `refineCnaes` com tracer |
| `server/tracer.ts` | Tracing estruturado por requisição (`requestId`, etapas, latências) |
| `server/cnae-health.ts` | Lógica do health check (`checkCnaeHealth`) |
| `server/cnae-pipeline-validator.ts` | Validação automática com 4 casos canônicos |
| `server/embeddings-scheduler.ts` | Cron job semanal de rebuild + validação pós-rebuild |
| `server/build-version.ts` | Metadados do build (versão, git hash, ambiente) |

---

## Tabela de Banco de Dados

### `cnae_embeddings`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Chave primária |
| `code` | VARCHAR(20) | Código CNAE (ex: `1113-5/02`) |
| `description` | TEXT | Descrição oficial IBGE |
| `embedding` | BLOB | Vetor Float32 de 1.536 dimensões |
| `created_at` | DATETIME | Data de criação do embedding |
| `updated_at` | DATETIME | Data da última atualização |

### `embedding_rebuild_logs`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Chave primária |
| `status` | ENUM | `completed`, `failed`, `partial` |
| `cnaes_processed` | INT | Quantidade de CNAEs processados |
| `errors` | INT | Quantidade de erros no batch |
| `duration_ms` | INT | Duração total em ms |
| `started_at` | DATETIME | Início do rebuild |
| `finished_at` | DATETIME | Fim do rebuild |

---

## Decisões de Arquitetura

**Por que embeddings em memória e não direto no banco?** A busca por similaridade de cosseno em 1.332 vetores de 1.536 dimensões requer operações de álgebra linear que são muito mais rápidas em memória (Map + Float32Array) do que em SQL. O banco é a fonte de verdade persistente; a memória é o cache de trabalho.

**Por que GPT-4.1 e não apenas embeddings?** Embeddings identificam candidatos semanticamente similares, mas não entendem contexto de negócio. O GPT-4.1 seleciona os CNAEs corretos considerando a combinação de atividades, regime tributário e porte — algo que a similaridade de cosseno não consegue capturar.

**Por que fallback semântico e não retornar erro?** A experiência do usuário é prioritária. Se o LLM falhar, o usuário ainda recebe sugestões (menos precisas) em vez de uma tela de erro. O banner amber informa que as sugestões devem ser revisadas.

**Por que `setImmediate` no warm-up?** O `server.listen` não deve ser bloqueado por operações de I/O. O `setImmediate` garante que o servidor já está aceitando conexões antes de iniciar o carregamento dos embeddings — se o warm-up falhar, o servidor continua funcionando (com cold start na primeira requisição).
