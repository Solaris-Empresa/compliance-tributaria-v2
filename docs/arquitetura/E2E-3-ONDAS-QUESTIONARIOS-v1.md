# FLUXO E2E — AS 3 ONDAS DOS QUESTIONÁRIOS IA SOLARIS

**Versão:** 1.0
**Data:** 2026-03-30
**Autores:** Manus (implementador técnico) + Orquestrador (Claude — Anthropic)
**P.O.:** Uires Tapajós
**Status:** Documento de arquitetura — referência técnica completa

---

## Sumário Executivo

Este documento descreve o fluxo end-to-end (E2E) das 3 Ondas de questionários da plataforma IA SOLARIS, com foco exclusivo no pipeline de geração, coleta e uso dos questionários. Para cada onda, são detalhados: as entradas necessárias, as técnicas e ferramentas utilizadas, a justificativa de existência, as saídas produzidas, o schema das tabelas de persistência, a integração com o sistema RAG, os sprints de implementação, os PRs mergeados e a rastreabilidade completa.

---

## 1. VISÃO GERAL DO PIPELINE E2E

### 1.1 Diagrama de fluxo completo

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    FLUXO E2E — 3 ONDAS DE QUESTIONÁRIOS                  ║
╚══════════════════════════════════════════════════════════════════════════╝

[PROJETO CRIADO]
    │
    ▼
[Perfil da empresa: regime, porte, CNAEs confirmados]
    │
    │  status: cnaes_confirmados
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ONDA 1 — QUESTIONÁRIO SOLARIS                                           │
│  Rota: /questionario-solaris                                             │
│  Fonte: banco de dados (solaris_questions)                               │
│  Técnica: busca direta + filtro CNAE                                     │
│  Ferramenta: Drizzle ORM → TiDB Cloud                                    │
│  Saída: solaris_answers (SOL-001..012)                                   │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  status: onda1_solaris
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ONDA 2 — QUESTIONÁRIO IA GENERATIVA                                     │
│  Rota: /questionario-iagen                                               │
│  Fonte: LLM (geração dinâmica por perfil combinatório)                   │
│  Técnica: prompt combinatório + JSON Schema enforcement                  │
│  Ferramenta: OpenAI GPT-4.1 (30s timeout) + fallback hardcoded          │
│  Saída: iagen_answers (ia-gen-001..N, confidence_score)                  │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  status: onda2_iagen
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ONDA 3 — QUESTIONÁRIO REGULATÓRIO (3 sub-questionários)                 │
│  Rotas: /questionario-corporativo-v2 → /questionario-operacional         │
│         → /questionario-cnae (N vezes, 1 por CNAE)                      │
│  Fonte: RAG híbrido (corpus 2.078 chunks) + LLM                         │
│  Técnica: keyword LIKE + re-ranking LLM + prompt de auditoria            │
│  Ferramenta: ragDocuments (TiDB) + OpenAI GPT-4.1                       │
│  Saída: answers (tabela existente) + fonte="regulatorio"                 │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  status: diagnostico_cnae
    ▼
[DIAGNÓSTICO FINAL: briefing + matrizes de risco + plano de ação]
    │  (solaris_answers + iagen_answers + answers injetados nos prompts)
    ▼
[status: briefing → matriz_riscos → aprovado]
```

### 1.2 Tabela comparativa de alto nível

| Dimensão | Onda 1 | Onda 2 | Onda 3 |
|---|---|---|---|
| **Nome** | Questionário SOLARIS | Questionário IA Gen | Questionário Regulatório |
| **Rota** | `/questionario-solaris` | `/questionario-iagen` | `/questionario-corporativo-v2`, `/questionario-operacional`, `/questionario-cnae` |
| **Fonte técnica** | `solaris` | `ia_gen` | `regulatorio` |
| **Origem das perguntas** | Banco de dados (curado por advogados) | LLM (gerado on-the-fly) | RAG + LLM |
| **Personalização** | Por CNAE (filtro de prefixo) | Por perfil combinatório completo | Por CNAE (RAG) |
| **Depende de IA** | Não | Sim (GPT-4.1) | Sim (GPT-4.1 + RAG) |
| **Fallback** | N/A | 5 perguntas hardcoded | Corpus vazio → LLM sem contexto |
| **Tabela de perguntas** | `solaris_questions` | Gerada dinamicamente | `ragDocuments` |
| **Tabela de respostas** | `solaris_answers` | `iagen_answers` | `answers` (existente) |
| **Badge visual** | 🔵 Azul — "Equipe Jurídica SOLARIS" | 🟠 Laranja — "Perfil da empresa" | 🟢 Verde — "Legislação" |
| **Status ao concluir** | `onda1_solaris` | `onda2_iagen` | `diagnostico_cnae` |
| **Quantidade (5 CNAEs)** | 1 questionário | 1 questionário | 7 questionários |
| **Sprint** | K-1, K-2, K-3, K-4-A, K-4-B | K-4-A, K-4-C | Existente (pré-Sprint K) |

---

## 2. ONDA 1 — QUESTIONÁRIO DA EQUIPE JURÍDICA SOLARIS

### 2.1 Justificativa de existência

O sistema RAG (Onda 3) é excelente para o que está **explícito** nas leis. Mas compliance tributário real tem uma dimensão **implícita** — riscos que os advogados sabem que toda empresa deve verificar, mas que nenhuma lei descreve como "risco para a empresa X". O UAT de março/2026 com a equipe jurídica revelou esse gap: o Dr. José Rodrigues enviou duas matrizes de risco com 12 itens cada, e vários desses riscos não estavam em nenhum artigo de lei.

A Onda 1 é a resposta: perguntas curadas manualmente pela equipe SOLARIS, que capturam o conhecimento implícito acumulado em anos de prática tributária. É o **diferencial competitivo** da plataforma — nenhuma outra ferramenta de RAG legislativo tem isso.

### 2.2 Entradas

| Entrada | Origem | Tipo | Obrigatório |
|---|---|---|---|
| `projectId` | Parâmetro da rota | `int` | ✅ |
| `cnaeCode` | Projeto confirmado | `string` (ex: "4639-7/01") | ✅ |
| `userId` | Sessão autenticada (JWT) | `string` | ✅ |
| Perguntas ativas em `solaris_questions` | TiDB Cloud | Linhas do banco | ✅ (seed K-1) |

### 2.3 Técnicas e ferramentas

**Busca das perguntas:**

A função `getOnda1Questions(cnaeCode)` no `onda1Injector.ts` executa a seguinte lógica:

```
1. Normalizar CNAE: "4639-7/01" → "4639-7" (parte antes da "/")
2. Chamar getSolarisQuestions(cnaePrefix) via Drizzle ORM
3. Filtro:
   - cnae_groups IS NULL → pergunta universal (aparece para todos)
   - cnae_groups contém prefixo → aparece se CNAE do projeto bate
4. Retornar perguntas no formato QuestionSchema com fonte="solaris"
```

**Ferramentas utilizadas:**

| Ferramenta | Papel | Versão/Config |
|---|---|---|
| **Drizzle ORM** | Query builder type-safe para TiDB | `drizzle-orm` |
| **TiDB Cloud** | Banco MySQL-compatible (serverless) | Região: us-east-1 |
| **tRPC** | Procedure `getOnda1Questions` (protectedProcedure) | tRPC 11 |
| **React** | Componente `QuestionarioSolaris.tsx` | React 19 |
| **Zod** | Validação de schema de entrada/saída | Zod 3 |

**Sem IA:** A Onda 1 é deliberadamente livre de IA. As perguntas são fixas, curadas por humanos, e servidas diretamente do banco. Isso garante consistência, auditabilidade e zero risco de alucinação.

### 2.4 As 12 perguntas do seed (SOL-001..SOL-012)

| Código | Pergunta | Área | Urgência | Risco mapeado | Legislação |
|---|---|---|---|---|---|
| **SOL-001** | "A empresa possui rotina de validação automática antes da NF-e para conferência de CFOP, CST, alíquota IBS/CBS?" | Contabilidade Fiscal | 🔴 Crítica | Confissão automática via NF-e mal emitida | LC 214/2025 |
| **SOL-002** | "Existe rotina diária de conferência da apuração assistida CGIBS para evitar confissão por inércia?" | Contabilidade Fiscal | 🔴 Crítica | Confissão por inércia — não agir = aceitar débito | LC 214/2025 |
| **SOL-003** | "A empresa tem SLA interno de correção fiscal com prazo máximo de D+2?" | Contabilidade Fiscal | 🟠 Alta | Acúmulo de débitos por ausência de prazo de correção | LC 214/2025 |
| **SOL-004** | "O ERP foi parametrizado e auditado para as novas regras IBS/CBS com trilha de auditoria?" | TI | 🔴 Crítica | Risco sistêmico de ERP mal parametrizado | LC 214/2025 |
| **SOL-005** | "Existe controle em tempo real dos débitos constituídos por confissão e monitoramento de dívida ativa?" | Jurídico | 🔴 Crítica | Dívida ativa não monitorada | LC 214/2025 |
| **SOL-006** | "A empresa avaliou necessidade de blindagem jurídica sobre a validade da confissão automática da LC 214?" | Jurídico | 🟠 Alta | Responsabilização por confissão sem contestação | LC 214/2025 |
| **SOL-007** | "Existe governança documentada com trilha de auditoria que demonstre diligência dos administradores?" | Jurídico | 🟠 Alta | Responsabilização pessoal de administradores | LC 214/2025 |
| **SOL-008** | "O cadastro NCM dos produtos está revisado para as novas alíquotas da LC 224/2026?" | Contabilidade Fiscal | 🟠 Alta — vigência 01/04 | Classificação NCM incorreta → alíquota errada | LC 224/2026 |
| **SOL-009** | "A estratégia de pricing foi revisada para absorver o fim de alíquota zero/isenções da LC 224?" | Negócio | 🟠 Alta | Impacto de margem por não repasse de custo tributário | LC 224/2026 |
| **SOL-010** | "O crédito não cumulativo foi recalculado considerando o limite de 90% imposto pela LC 224?" | Contabilidade Fiscal | 🟠 Alta | Perda de crédito por não observar limite da LC 224 | LC 224/2026 |
| **SOL-011** | "Existe planejamento de capital de giro para o impacto no fluxo de caixa da LC 224?" | Negócio | 🟠 Alta | Crise de caixa por não antecipação do impacto tributário | LC 224/2026 |
| **SOL-012** | "Os contratos com fornecedores foram revisados para absorver o efeito cadeia da LC 224?" | Negócio | 🟡 Média | Conflito contratual por cláusulas sem previsão tributária | LC 224/2026 |

### 2.5 Schema das tabelas

**Tabela `solaris_questions` — perguntas curadas (criada em K-1, migration `0056`):**

```sql
CREATE TABLE `solaris_questions` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `texto`           TEXT NOT NULL,              -- Texto da pergunta
  `categoria`       VARCHAR(100) NOT NULL,      -- contabilidade_fiscal / ti / juridico / negocio
  `cnae_groups`     JSON,                       -- NULL = universal; ["46","49"] = setorial
  `obrigatorio`     TINYINT NOT NULL DEFAULT 1, -- 1 = obrigatório
  `ativo`           TINYINT NOT NULL DEFAULT 1, -- 1 = ativo (soft delete)
  `observacao`      TEXT,                       -- objetivo_diagnostico
  `fonte`           VARCHAR(20) NOT NULL DEFAULT 'solaris',
  `criado_por_id`   INT,                        -- FK → users.id (advogado sênior)
  `criado_em`       BIGINT NOT NULL,            -- ms UTC
  `atualizado_em`   BIGINT,
  `upload_batch_id` VARCHAR(64),                -- rastreabilidade de lote CSV
  `codigo`          VARCHAR(10)                 -- SOL-001..SOL-NNN (adicionado K-4-A)
);
```

**Tabela `solaris_answers` — respostas do advogado (criada em K-4-A, migration `0058`):**

```sql
CREATE TABLE `solaris_answers` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `project_id`  INT NOT NULL REFERENCES projects(id),
  `question_id` INT NOT NULL REFERENCES solaris_questions(id),
  `codigo`      VARCHAR(10) NOT NULL,  -- SOL-001..012 (desnormalizado para auditoria)
  `resposta`    TEXT NOT NULL,         -- "Sim" / "Não" / texto livre
  `fonte`       VARCHAR(20) DEFAULT 'solaris',
  `created_at`  BIGINT NOT NULL,       -- ms UTC
  `updated_at`  BIGINT NOT NULL
  -- UNIQUE INDEX: (project_id, codigo) — impede resposta dupla
);
```

### 2.6 Saídas da Onda 1

| Saída | Destino | Formato | Uso posterior |
|---|---|---|---|
| Respostas persistidas | `solaris_answers` | Linhas SQL | Injetadas no prompt de `generateRiskMatrices` (K-4-D) |
| Status do projeto | `projects.status` | `'onda1_solaris'` | Libera acesso à Onda 2 |
| Log de auditoria | `project_status_log` | `from: cnaes_confirmados → to: onda1_solaris` | Rastreabilidade jurídica |
| Perguntas com badge | Frontend React | `fonte: "solaris"` | Badge 🔵 "Equipe Jurídica SOLARIS" |

### 2.7 Como a Onda 1 alimenta o diagnóstico final

As respostas de `solaris_answers` são injetadas no prompt de `generateRiskMatrices` via função `getOnda1AnswersForProject(projectId)`. A lógica é direta:

- Resposta **"NÃO"** em SOL-002 → risco crítico de confissão por inércia na matriz
- Resposta **"SIM"** em SOL-002 → risco mitigado ou ausente na matriz
- Todas as respostas aparecem no briefing como "riscos práticos identificados pela equipe jurídica SOLARIS"

### 2.8 Processo de alimentação do corpus SOLARIS (Sprint L)

```
[Advogado sênior redige perguntas em CSV]
    │
    ▼
[Upload via /admin/solaris-questions]
    │
    ▼
[Dry-run: sistema valida CSV e exibe preview]
    │
    ▼
[Advogado confirma → perguntas inseridas em solaris_questions]
    │
    ▼
[upload_batch_id registrado para rastreabilidade de lote]
```

**Schema do CSV (DEC-002, aprovado pelo P.O. em 2026-03-26):**

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| `titulo` | string | ✅ | "Validação fiscal pré-emissão NF-e" |
| `conteudo` | texto | ✅ | Fundamentação completa |
| `topicos` | texto | ✅ | "IBS, CBS, NF-e, confissão de dívida" |
| `cnaeGroups` | texto | ✅ | "01-96" (todos) ou "46,49" (setorial) |
| `lei` | fixo | ✅ | sempre "solaris" |
| `artigo` | string | ✅ | "SOL-001"..."SOL-012" |
| `area` | enum | ✅ | contabilidade_fiscal / negocio / ti / juridico |
| `severidade_base` | enum | ✅ | baixa / media / alta / critica |
| `vigencia_inicio` | data | ❌ | "2026-04-01" |

---

## 3. ONDA 2 — QUESTIONÁRIO IA GENERATIVA

### 3.1 Justificativa de existência

Certas combinações de características empresariais criam riscos que não existiriam isoladamente. Uma empresa com `Lucro Presumido + exportação + contrata Simples Nacional` tem um risco específico de creditamento CBS em cadeia exportadora que não está escrito em nenhuma lei (Onda 3 não captura) e que um escritório não necessariamente curou para todos os casos (Onda 1 não cobre). A Onda 2 resolve isso com geração combinatória dinâmica: a IA recebe o perfil completo da empresa e gera perguntas específicas para aquela combinação.

### 3.2 Entradas

| Entrada | Origem | Tipo | Obrigatório |
|---|---|---|---|
| `projectId` | Parâmetro da rota | `int` | ✅ |
| `regime` | `project.companyProfile.taxRegime` | enum | ✅ |
| `porte` | `project.companyProfile.companySize` | enum | ✅ |
| `cnaes` | `project.confirmedCnaes` | `string[]` | ✅ |
| `operacao_interestadual` | `project.operationProfile.multiState` | `boolean` | ✅ |
| `faz_exportacao` | `project.operationProfile.faz_exportacao` | `boolean` | ✅ |
| `contrata_simples_nacional` | `project.operationProfile.contrata_simples_nacional` | `boolean` | ✅ |
| `tem_ativo_imobilizado` | `project.operationProfile.tem_ativo_imobilizado` | `boolean` | ✅ |

**Parâmetros combinatórios — valores possíveis:**

| Parâmetro | Valores |
|---|---|
| Regime tributário | `simples_nacional` / `lucro_presumido` / `lucro_real` / `lucro_arbitrado` |
| Porte | `mei` / `micro` / `pequena` / `media` / `grande` |
| CNAE | Código específico (ex: "4639-7/01") |
| Operação interestadual | `true` / `false` |
| Faz exportação | `true` / `false` |
| Contrata Simples Nacional | `true` / `false` |
| Tem ativo imobilizado | `true` / `false` |

### 3.3 Técnicas e ferramentas

**Pipeline de geração:**

```
[Perfil da empresa extraído do banco]
    │
    ▼
[Prompt combinatório montado com 7 parâmetros]
    │
    ▼
[OpenAI GPT-4.1 — temperatura 0.3, maxTokens 2.000]
    │  (timeout: 30 segundos)
    ├── Sucesso → perguntas JSON com confidence_score
    └── Falha/Timeout → fallback: 5 perguntas hardcoded (confidence_score = 0.5)
    │
    ▼
[Filtro de qualidade: confidence_score < 0.7 → descartado]
    │
    ▼
[Perguntas exibidas com badge 🟠 "Perfil da empresa"]
```

**Ferramentas utilizadas:**

| Ferramenta | Papel | Config |
|---|---|---|
| **OpenAI GPT-4.1** | Geração combinatória de perguntas | `temperature: 0.3`, `maxTokens: 2000` |
| **JSON Schema enforcement** | `response_format: json_schema` — garante output estruturado | `strict: true` |
| **tRPC** | Procedure `getOnda2Questions` (protectedProcedure) | tRPC 11 |
| **Zod** | Validação do output da IA | Schema `Onda2Question` |
| **React** | Componente `QuestionarioIaGen.tsx` | React 19 |

**Estrutura obrigatória do output da IA:**

```typescript
interface Onda2Question {
  id: string;                    // "ia-gen-001", "ia-gen-002"...
  texto: string;                 // a pergunta
  objetivo_diagnostico: string;  // o que essa pergunta diagnostica
  combinacao_gatilho: string;    // ex: "Lucro Presumido + exportação"
  fonte: 'ia_gen';               // fixo — imutável
  confidence_score: number;      // 0.0 a 1.0
}
```

**Fallback hardcoded (5 perguntas genéricas):**

| ID | Texto | Gatilho | confidence_score |
|---|---|---|---|
| ia-gen-001 | "A empresa possui operações com substituição tributária no contexto da Reforma Tributária?" | Qualquer regime | 0.5 |
| ia-gen-002 | "Qual o percentual estimado de receita sujeita ao IBS/CBS após a transição?" | Qualquer regime | 0.5 |
| ia-gen-003 | "A empresa tem créditos acumulados de PIS/COFINS que precisam ser aproveitados antes da transição?" | Lucro Real ou Presumido | 0.5 |
| ia-gen-004 | "Existem contratos de longo prazo que precisam de cláusulas de reequilíbrio tributário?" | Qualquer porte | 0.5 |
| ia-gen-005 | "A empresa possui benefícios fiscais estaduais que podem ser impactados pela unificação do ICMS no IBS?" | Operação interestadual | 0.5 |

**Exemplos de perguntas geradas por combinação real:**

| Combinação do perfil | Pergunta gerada |
|---|---|
| Lucro Presumido + exportação + contrata Simples | "Como está estruturado o creditamento de CBS na cadeia exportadora com prestadores do Simples Nacional?" |
| Lucro Real + operação interestadual | "Qual o impacto do diferencial de alíquota IBS nas operações interestaduais?" |
| Qualquer + CNAE alimentício | "Seus produtos estão classificados no Anexo I da LC 214 (alíquota zero)?" |
| Médio/Grande + ativo imobilizado | "A exclusão de bens do ativo imobilizado do regime de crédito IBS/CBS foi avaliada?" |
| Qualquer + contrata MEI/Simples | "Como será o tratamento CBS dos serviços de prestadores do Simples Nacional?" |

### 3.4 Schema das tabelas

**Tabela `iagen_answers` — respostas da Onda 2 (criada em K-4-A, migration `0058`):**

```sql
CREATE TABLE `iagen_answers` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `project_id`       INT NOT NULL REFERENCES projects(id),
  `question_text`    TEXT NOT NULL,          -- Texto completo da pergunta gerada
  `resposta`         TEXT NOT NULL,          -- Resposta do advogado
  `confidence_score` DECIMAL(3,2),           -- 0.00–1.00 (score da IA ao gerar)
  `fonte`            VARCHAR(20) DEFAULT 'ia_gen',
  `created_at`       BIGINT NOT NULL,        -- ms UTC
  `updated_at`       BIGINT NOT NULL
  -- INDEX: (project_id)
);
```

> **Nota de design:** Não há FK para uma tabela de perguntas porque as perguntas da Onda 2 são geradas dinamicamente e não persistidas. O `question_text` é desnormalizado diretamente na resposta para rastreabilidade.

### 3.5 Saídas da Onda 2

| Saída | Destino | Formato | Uso posterior |
|---|---|---|---|
| Respostas persistidas | `iagen_answers` | Linhas SQL | Injetadas no prompt de `generateBriefing` e `generateRiskMatrices` (K-4-D) |
| Status do projeto | `projects.status` | `'onda2_iagen'` | Libera acesso ao QC (Onda 3) |
| Log de auditoria | `project_status_log` | `from: onda1_solaris → to: onda2_iagen` | Rastreabilidade jurídica |
| Perguntas com badge | Frontend React | `fonte: "ia_gen"` | Badge 🟠 "Perfil da empresa" |

### 3.6 Como a Onda 2 alimenta o diagnóstico final

As respostas de `iagen_answers` são injetadas no contexto de `generateBriefing` e `generateRiskMatrices`. Apenas respostas com `confidence_score >= 0.7` são incluídas. Perguntas não respondidas ou respondidas com "Não se aplica" são filtradas. O briefing menciona a personalização da Onda 2 como "análise de perfil específico da empresa".

---

## 4. ONDA 3 — QUESTIONÁRIO REGULATÓRIO (RAG)

### 4.1 Justificativa de existência

A Onda 3 é o núcleo regulatório da plataforma — o que a legislação exige explicitamente desta empresa. É o funcionamento original do sistema, construído sobre um corpus RAG de 2.078 chunks das leis da Reforma Tributária. Cada pergunta gerada é rastreável até um artigo específico de lei.

### 4.2 Corpus RAG

| Lei | Chunks | Cobertura |
|---|---|---|
| LC 214/2025 (artigos) | 1.573 | IBS, CBS, confissão, regimes de transição |
| LC 214/2025 (Anexos NCM) | 819 | Cesta básica, medicamentos, insumos agropecuários |
| LC 227/2026 | 434 | Ajustes e complementações |
| LC 224/2026 | 28 | NCM, alíquotas, crédito 90% |
| EC 132/2023 | 18 | Fundamento constitucional |
| LC 123 (Simples Nacional) | 25 | Regime do Simples |
| **Total** | **2.078** | 100% com `anchor_id` |

### 4.3 Pipeline RAG híbrido

O sistema usa um RAG **híbrido** — não vetorial puro, mas combinando busca por keyword (LIKE) com re-ranking via LLM:

```
ETAPA 1 — Extração de keywords
    extractKeywords(contextQuery)
    → Remove stopwords PT-BR
    → Retorna top 15 palavras-chave do contexto

ETAPA 2 — Busca de candidatos (fetchCandidates)
    SELECT * FROM rag_documents
    WHERE titulo LIKE '%keyword%'
       OR topicos LIKE '%keyword%'
       OR conteudo LIKE '%keyword%'
       OR cnae_groups LIKE '%cnaeGroup%'
    LIMIT 20

ETAPA 3A — Re-ranking via LLM (retrieveArticles — com re-ranking)
    Prompt: "Selecione os 5 artigos mais relevantes para este contexto"
    LLM retorna índices ordenados por relevância
    → Usado em: generateBriefing, generateRiskMatrices (alta precisão)

ETAPA 3B — Sem re-ranking (retrieveArticlesFast — baixa latência)
    candidates.slice(0, topK)
    → Usado em: generateQuestions (velocidade > precisão)

ETAPA 4 — Formatação do contexto
    formatContextText(articles)
    → "**LC 214/2025 — Art. 45: Título**\nConteúdo..."
    → Injetado no prompt do LLM
```

**Ferramentas do pipeline RAG:**

| Ferramenta | Papel | Config |
|---|---|---|
| **TiDB Cloud** | Armazenamento do corpus (tabela `rag_documents`) | MySQL-compatible, serverless |
| **Drizzle ORM** | Queries LIKE multi-termo | `or(...conditions)` |
| **OpenAI GPT-4.1** | Re-ranking + geração de perguntas | `temperature: 0.0` (re-ranking), `0.2` (perguntas) |
| **rag-retriever.ts** | Módulo de recuperação | `retrieveArticles` / `retrieveArticlesFast` |

### 4.4 Geração de perguntas (generateQuestions)

O `generateQuestions` é a procedure tRPC central da Onda 3. Ela recebe o CNAE e gera perguntas via RAG + LLM:

```
ENTRADA:
  - projectId: int
  - cnaeCode: string (ex: "4639-7/01")
  - cnaeDescription: string
  - level: "nivel1" | "nivel2"
  - roundIndex?: int
  - previousAnswers?: {question, answer}[]

PIPELINE:
  1. retrieveArticlesFast(cnaes, contextQuery, topK=5)
     → ragCtx.contextText (artigos relevantes formatados)
  2. LLM prompt com:
     - System: auditor tributário + regras de rastreabilidade (G15)
     - User: CNAE + descrição + nível + contexto RAG
     - Output: QuestionSchema[] com fonte/requirement_id/source_reference
  3. injectOnda1IntoQuestions(cnaeCode, regulatoryQuestions)
     → Onda 1 injetada ANTES das perguntas regulatórias
     → Ordem final: [Onda 1: solaris] → [Onda 3: regulatorio/ia_gen]

SAÍDA:
  { questions: QuestionSchema[] }
  - fonte: "regulatorio" | "solaris" | "ia_gen"
  - requirement_id: "RF-045" | "SOL-001" | ""
  - source_reference: "LC 214/2025 Art. 9°" | "SOLARIS — Contabilidade Fiscal" | ""
```

### 4.5 Schema da tabela `rag_documents`

```sql
CREATE TABLE `rag_documents` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `lei`         VARCHAR(50) NOT NULL,     -- 'lc214' | 'lc227' | 'lc224' | 'ec132' | 'lc123' | 'solaris'
  `artigo`      VARCHAR(100) NOT NULL,    -- "Art. 45" | "SOL-001"
  `titulo`      TEXT NOT NULL,            -- Título do artigo
  `conteudo`    TEXT NOT NULL,            -- Texto completo do artigo/chunk
  `topicos`     TEXT,                     -- Keywords para busca LIKE
  `cnae_groups` TEXT,                     -- Grupos CNAE aplicáveis
  `anchor_id`   VARCHAR(100),             -- ID único para rastreabilidade (100% preenchido)
  `created_at`  TIMESTAMP DEFAULT NOW()
);
```

### 4.6 Saídas da Onda 3

| Saída | Destino | Formato | Uso posterior |
|---|---|---|---|
| Perguntas geradas | Frontend (não persistidas) | `QuestionSchema[]` | Exibidas ao advogado |
| Respostas salvas | `answers` (tabela existente) | Linhas SQL | Base do diagnóstico |
| Status do projeto | `projects.status` | `diagnostico_corporativo` → `diagnostico_cnae` | Libera briefing |
| Log de auditoria | `project_status_log` | Transições de status | Rastreabilidade jurídica |

---

## 5. MÁQUINA DE ESTADOS — FLUXO COMPLETO

### 5.1 Diagrama de transições

```
rascunho
    │ (perfil + CNAEs confirmados)
    ▼
cnaes_confirmados
    │ (completeOnda1 — K-4-B)
    ▼
onda1_solaris ←──────────────────────────────────────────────────────────┐
    │ (completeOnda2 — K-4-C)                                            │
    ▼                                                                    │
onda2_iagen                                                              │
    │ (QC concluído)                                                     │
    ▼                                                                    │
diagnostico_corporativo                                                  │
    │ (QO concluído)                                                     │
    ▼                                                                    │
diagnostico_operacional                                                  │
    │ (QCNAE concluído)                                                  │
    ▼                                                                    │
diagnostico_cnae                                                         │
    │ (briefing gerado)                                                  │
    ▼                                                                    │
briefing ─── [retrocesso com invalidação] ───────────────────────────────┘
    │ (matrizes geradas)
    ▼
matriz_riscos
    │ (plano aprovado)
    ▼
aprovado
```

### 5.2 VALID_TRANSITIONS (flowStateMachine.ts — K-4-A)

```typescript
export const VALID_TRANSITIONS: Record<string, string[]> = {
  'rascunho':                ['consistencia_pendente'],
  'cnaes_confirmados':       ['onda1_solaris', 'consistencia_pendente'],
  'onda1_solaris':           ['onda2_iagen', 'rascunho'],
  'onda2_iagen':             ['diagnostico_corporativo'],
  'diagnostico_corporativo': ['diagnostico_operacional', 'onda2_iagen'],
  'diagnostico_operacional': ['diagnostico_cnae', 'diagnostico_corporativo'],
  'diagnostico_cnae':        ['briefing', 'diagnostico_operacional'],
  'briefing':                ['matriz_riscos', 'diagnostico_cnae'],
  'matriz_riscos':           ['aprovado', 'briefing'],
  'aprovado':                ['matriz_riscos'],
  // ... status legados mantidos para compatibilidade
};
```

### 5.3 Enforcement no backend

O backend valida cada transição via `assertValidTransition(from, to)` antes de qualquer UPDATE no campo `status`. O frontend nunca altera o `status` diretamente — apenas chama procedures tRPC que fazem a validação e o update atomicamente.

```typescript
// Exemplo — completeOnda1 (K-4-B):
assertValidTransition(project.status, 'onda1_solaris');
// Se inválido → TRPCError({ code: 'FORBIDDEN' })
// Se válido → UPDATE projects SET status = 'onda1_solaris'
//           → INSERT project_status_log (from, to, changedBy, reason)
```

---

## 6. RASTREABILIDADE COMPLETA — DA PERGUNTA AO PLANO DE AÇÃO

### 6.1 Cadeia de rastreabilidade

```
PERGUNTA
  ├── fonte: "solaris" | "ia_gen" | "regulatorio"
  ├── requirement_id: "SOL-001" | "ia-gen-001" | "RF-045"
  └── source_reference: "SOLARIS — Contabilidade Fiscal" | "LC 214/2025 Art. 45"
         │
         ▼
RESPOSTA
  ├── solaris_answers.codigo = "SOL-001"
  ├── iagen_answers.confidence_score = 0.85
  └── answers.fonte = "regulatorio"
         │
         ▼
RISCO (matriz)
  ├── fonte_risco_tipo: "solaris" | "ia_gen" | "regulatorio"
  ├── evidencia_regulatoria: "LC 214/2025 Art. 45 §4º"
  └── causa_raiz: "Ausência de rotina de conferência CGIBS"
         │
         ▼
AÇÃO (plano)
  ├── evidencia_regulatoria: "LC 214/2025 Art. 45"
  ├── acao_concreta: "Implementar rotina diária de conferência CGIBS até D+2"
  └── criterio_de_conclusao: "Relatório diário de conferência emitido e arquivado"
```

### 6.2 Campos de rastreabilidade por camada

| Camada | Campo | Onda 1 | Onda 2 | Onda 3 |
|---|---|---|---|---|
| Pergunta | `fonte` | `"solaris"` | `"ia_gen"` | `"regulatorio"` |
| Pergunta | `requirement_id` | `"SOL-001"` | `"ia-gen-001"` | `"RF-045"` |
| Pergunta | `source_reference` | `"SOLARIS — Contabilidade Fiscal"` | `"Lucro Presumido + exportação"` | `"LC 214/2025 Art. 45 §4º"` |
| Resposta | `codigo` | `"SOL-001"` | N/A (question_text) | N/A |
| Resposta | `confidence_score` | N/A | `0.85` | N/A |
| Risco | `fonte_risco_tipo` | `"solaris"` | `"ia_gen"` | `"regulatorio"` |
| Risco | `evidencia_regulatoria` | Referência SOLARIS | Perfil da empresa | Artigo de lei |
| Ação | `acao_concreta` | Ação específica | Ação específica | Ação específica |
| Ação | `criterio_de_conclusao` | Verificável | Verificável | Verificável |
| Auditoria | `project_status_log` | Transição registrada | Transição registrada | Transição registrada |

### 6.3 Tabela `project_status_log` — auditoria jurídica (K-4-E, migration `0059`)

```sql
CREATE TABLE `project_status_log` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `project_id`  INT NOT NULL REFERENCES projects(id),
  `from_status` TEXT,           -- NULL na criação do projeto
  `to_status`   TEXT NOT NULL,  -- status de destino
  `changed_by`  VARCHAR(255) NOT NULL,  -- user.id ou "system"
  `reason`      TEXT,           -- motivo da transição (opcional)
  `created_at`  TIMESTAMP NOT NULL DEFAULT NOW()
  -- INDEX: (project_id)
);
```

---

## 7. SPRINTS, PRs E RASTREABILIDADE DE IMPLEMENTAÇÃO

### 7.1 Mapa completo de sprints → PRs → tabelas

| Sprint | Escopo | PR | Data merge | Tabelas criadas/alteradas | Status |
|---|---|---|---|---|---|
| **K-1** | Tabela `solaris_questions` + seed SOL-001..012 + 12 testes | #159 | 2026-03-27 | `solaris_questions` (migration 0056) | ✅ |
| **K-2** | Pipeline Onda 1 no questionEngine — `onda1Injector.ts` | #162 | 2026-03-27 | — (lógica no router) | ✅ |
| **K-3** | Badge visual por onda + seed SOL-001..012 no DB | #171 | 2026-03-27 | `solaris_questions` (seed) | ✅ |
| **K-4-A** | Migrations: `codigo` em `solaris_questions`, `solaris_answers`, `iagen_answers`. `VALID_TRANSITIONS`. DiagnosticoStepper 8 etapas (visual). | #179 | 2026-03-28 | `solaris_answers`, `iagen_answers` (migration 0058); ALTER `solaris_questions` ADD `codigo`; ALTER `projects.status` enum | ✅ |
| **K-4-B** | `QuestionarioSolaris.tsx` + `completeOnda1` + fix transitions | #179, #180, #181 | 2026-03-28 | — (lógica no router) | ✅ |
| **K-4-C** | `QuestionarioIaGen.tsx` + `completeOnda2` + `getOnda2Questions` | #182 | 2026-03-28 | — (lógica no router) | ✅ |
| **K-4-D** | Wiring etapas 7-8 no stepper + fix T06.1 | #184 | 2026-03-28 | — (integração diagnóstico) | ✅ |
| **K-4-E** | `project_status_log` + limpeza Fluxo B (LEGACY_MODE) | #213 | 2026-03-29 | `project_status_log` (migration 0059) | ✅ |
| **L-1** | Tela upload CSV `/admin/solaris-questions` com dry-run | — | Pendente | — | ⏳ |
| **L-2** | Template CSV + guia para equipe jurídica | — | Pendente | — | ⏳ |

### 7.2 PRs de documentação e arquitetura relacionados

| PR | Título | Data | Escopo |
|---|---|---|---|
| #174 | `docs(arquitetura): FLUXO-3-ONDAS v1.1 — contrato de implementação` | 2026-03-28 | Contrato canônico das 3 ondas |
| #178 | `docs: BASELINE-PRODUTO v2.2 + HANDOFF-MANUS v2.2 — pós Sprint K K-4-A/K-4-B` | 2026-03-28 | Baseline pós-K-4-A/B |
| #215 | `docs(arquitetura): TABELA-3-ONDAS-QUESTIONARIO-v1` | 2026-03-30 | Referência canônica das 3 ondas |
| #216 | `docs(cockpit): atualizar MODO_CONFIG + FALLBACK + decisões 2026-03-29` | 2026-03-30 | Cockpit P.O. atualizado |

### 7.3 Issues relacionadas

| Issue | Título | Status |
|---|---|---|
| #153 | K-1: tabela solaris_questions | ✅ Fechada |
| #154 | K-2: Pipeline Onda 1 no questionEngine | ✅ Fechada |
| #155 | K-3: Badge visual por onda | ✅ Fechada |
| #156 | K-4: Onda 2 combinatória | ✅ Fechada |
| #157 | L-1: Tela upload CSV `/admin/solaris-questions` | ⏳ Aberta |
| #158 | L-2: Template CSV + guia equipe jurídica | ⏳ Aberta |
| #164 | Gate C-4: K-3 validation | ⏳ Aberta |
| #165 | Gate C-4: K-4 validation | ⏳ Aberta |
| #166 | Gate C-4: L-1 validation | ⏳ Aberta |

---

## 8. EVOLUÇÃO DO SCHEMA — LINHA DO TEMPO DAS MIGRATIONS

| Migration | Sprint | Data | O que criou/alterou |
|---|---|---|---|
| `0056_old_molten_man.sql` | K-1 | 2026-03-27 | CREATE TABLE `solaris_questions` (12 colunas) |
| `0057_odd_ink.sql` | K-4-A (prep) | 2026-03-28 | Rebuild `solaris_questions` (idempotente) |
| `0058_majestic_cassandra_nova.sql` | K-4-A | 2026-03-28 | CREATE TABLE `iagen_answers`; CREATE TABLE `solaris_answers`; ALTER `projects.status` enum (add `onda1_solaris`, `onda2_iagen`); ALTER `solaris_questions` ADD `codigo` |
| `0059_chunky_strong_guy.sql` | K-4-E | 2026-03-29 | CREATE TABLE `project_status_log`; CREATE INDEX `idx_project_status_log_project_id` |

---

## 9. VISÃO INTEGRADA — COMO AS 3 ONDAS CONVERGEM NO DIAGNÓSTICO

### 9.1 Fluxo de injeção no diagnóstico final

```
solaris_answers (Onda 1)
    │
    ├── getOnda1AnswersForProject(projectId)
    │       → formatOnda1Context(answers)
    │       → "Riscos práticos identificados pela equipe jurídica SOLARIS:"
    │         "SOL-002: NÃO → risco crítico de confissão por inércia"
    │
iagen_answers (Onda 2)
    │
    ├── getOnda2AnswersForProject(projectId)
    │       → filtrar confidence_score >= 0.7
    │       → formatOnda2Context(answers)
    │       → "Análise de perfil específico da empresa:"
    │         "Creditamento CBS em cadeia exportadora com Simples Nacional"
    │
answers (Onda 3)
    │
    └── Contexto regulatório existente
            → "Base legislativa: LC 214/2025 Art. 45..."
                │
                ▼
        [generateBriefing — prompt unificado]
        [generateRiskMatrices — prompt unificado]
        [generateActionPlan — prompt unificado]
                │
                ▼
        DIAGNÓSTICO FINAL
        ├── Briefing: riscos práticos + perfil + base legal
        ├── Matriz de riscos: fonte_risco_tipo por onda
        └── Plano de ação: ação_concreta + criterio_de_conclusao
```

### 9.2 Critérios de validação do diagnóstico integrado (K-4-D)

| Critério | Como verificar |
|---|---|
| Onda 1 influencia riscos | Empresa com "NÃO" em SOL-002 recebe risco crítico de confissão por inércia |
| Onda 1 mitiga riscos | Empresa com "SIM" em SOL-002 não recebe o risco ou recebe como baixo |
| Onda 2 personaliza briefing | Briefing menciona características específicas da empresa (regime + CNAEs + operação) |
| Onda 3 fundamenta legalmente | Cada risco tem `evidencia_regulatoria` com artigo específico |
| Rastreabilidade completa | `fonte_risco_tipo` preenchido em todos os riscos da matriz |

---

## 10. RESUMO EXECUTIVO — PARA O P.O.

### O que foi construído

A plataforma IA SOLARIS agora possui um sistema de questionários em 3 camadas que cobre as 3 dimensões de um compliance tributário completo:

A **Onda 1** captura o que os advogados do escritório sabem — 12 perguntas curadas manualmente, cobrindo os riscos práticos mais críticos da Reforma Tributária (confissão por inércia, ERP mal parametrizado, NCM incorreto). Essas perguntas são servidas diretamente do banco, sem IA, garantindo consistência e auditabilidade.

A **Onda 2** captura o que é único desta empresa — perguntas geradas dinamicamente pela IA combinando 7 parâmetros do perfil (regime, porte, CNAE, exportação, etc.). Uma empresa exportadora que contrata Simples recebe perguntas que uma empresa local não recebe. Há fallback automático se a IA falhar.

A **Onda 3** captura o que a lei exige — o sistema RAG existente, com 2.078 chunks das leis da Reforma Tributária, gerando perguntas rastreáveis até o artigo específico.

### O que ainda está pendente

As Sprints L-1 e L-2 (tela de upload CSV e template para a equipe jurídica) ainda estão abertas. Após L-1, o Dr. José Rodrigues poderá adicionar novas matrizes de risco diretamente pela interface, sem depender de programação.

### Estado atual do produto

| Componente | Status |
|---|---|
| Tabela `solaris_questions` + seed SOL-001..012 | ✅ Produção |
| Pipeline Onda 1 no questionEngine | ✅ Produção |
| Badge visual por onda | ✅ Produção |
| Tela `QuestionarioSolaris.tsx` | ✅ Produção |
| Tela `QuestionarioIaGen.tsx` | ✅ Produção |
| Tabelas `solaris_answers` + `iagen_answers` | ✅ Produção |
| `project_status_log` (auditoria jurídica) | ✅ Produção |
| Integração Onda 1+2 no diagnóstico (K-4-D) | ✅ Produção (wiring etapas 7-8) |
| Tela upload CSV `/admin/solaris-questions` (L-1) | ⏳ Sprint L |
| Template CSV + guia equipe jurídica (L-2) | ⏳ Sprint L |

---

*Documento criado em 2026-03-30*
*IA SOLARIS — Compliance Tributário da Reforma Tributária*
*P.O.: Uires Tapajós | Orquestrador: Claude (Anthropic) | Implementador: Manus*
