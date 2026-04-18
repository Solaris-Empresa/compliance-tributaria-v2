# Documento Técnico AS-IS — Plataforma IA Solaris
## Compliance da Reforma Tributária Brasileira

> **Versão:** AS-IS v1.0
> **Data:** 2026-03-26
> **Autor:** Orquestrador (Claude — Anthropic)
> **Compilado por:** Manus (Implementador Técnico)
> **Status:** Aprovado para uso como base do TO-BE
> **Próxima revisão:** Após UAT round 2 com advogados

---

## Sumário

1. [Pipeline de IA (AS-IS)](#seção-1--pipeline-de-ia-as-is)
2. [Corpus RAG (AS-IS)](#seção-2--corpus-rag-as-is)
3. [Questionários (AS-IS)](#seção-3--questionários-as-is)
4. [Schema Zod (AS-IS)](#seção-4--schema-zod-as-is)
5. [Prompts (AS-IS)](#seção-5--prompts-as-is)
6. [Gaps Críticos Consolidados](#seção-6--gaps-críticos-consolidados)
7. [Arquitetura de Fontes (TO-BE Identificado)](#seção-7--arquitetura-de-fontes-to-be-identificado)
8. [Invariants do Sistema](#seção-8--invariants-do-sistema)
9. [Decisões Pendentes do P.O.](#seção-9--decisões-pendentes-do-po)

---

## SEÇÃO 1 — PIPELINE DE IA (AS-IS)

O pipeline de IA da plataforma é composto por 7 pontos de integração com GPT-4.1 (OpenAI API), todos orquestrados via `server/routers-fluxo-v3.ts` (2.141 linhas). A função auxiliar `generateWithRetry` (`server/ai-helpers.ts`) encapsula todas as chamadas LLM com retry automático (padrão: 2 tentativas, aguarda 1s entre tentativas) e validação de schema Zod. O modelo padrão é GPT-4.1 em todas as etapas.

---

### Etapa 1 — `extractCnaes` (Identificação de CNAEs)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.extractCnaes` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linha 116 |
| **Temperatura** | 0.1 |
| **RAG** | Embeddings semânticos via `cnae-embeddings.ts` (text-embedding-3-small) — pré-filtra candidatos antes do LLM |
| **Schema Zod de saída** | `CnaesResponseSchema` — `{ cnaes: Array<{ code, description, confidence (0-100), justification }> }` |
| **Timeout** | 25.000 ms |
| **maxRetries** | 1 (exceção ao padrão de 2) |
| **Fallback** | Se LLM falhar ou timeout: `findSimilarCnaes()` (top-5 por cosseno semântico). Se embeddings também falharem: `getFallbackCandidates(5)` (lista hardcoded). Se nenhum candidato disponível: re-lança o erro original. |
| **Notificação** | `notifyOwner()` acionado em qualquer falha ou timeout |

A etapa usa o modelo de embeddings `text-embedding-3-small` para pré-selecionar CNAEs semanticamente similares à descrição do negócio antes de enviar ao GPT-4.1. O sistema de fallback em três níveis garante que o usuário nunca fique sem sugestão de CNAE.

---

### Etapa 2 — `generateQuestions` (Geração de Perguntas por CNAE)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.generateQuestions` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linha 502 |
| **Temperatura** | 0.2 (atualizado de 0.3 conforme header do arquivo) |
| **RAG** | `retrieveArticlesFast` — 5 artigos por CNAE, sem re-ranking LLM |
| **Schema Zod de saída** | `QuestionsResponseSchema` — array de perguntas com `id`, `texto`, `tipo`, `opcoes` |
| **Timeout** | Padrão `generateWithRetry` (sem override) |
| **maxRetries** | 2 (padrão) |
| **Fallback** | Retorna array vazio se LLM falhar (non-fatal — erro logado mas não propagado) |

Gera perguntas específicas para cada CNAE confirmado. O RAG injeta artigos relevantes para o setor antes da geração. Erros são tratados como non-fatal para não bloquear o fluxo do usuário.

---

### Etapa 3 — `generateBriefing` (Diagnóstico Consolidado)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.generateBriefing` / `fluxoV3.generateBriefingFromDiagnostic` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linhas 908 e 1816 |
| **Temperatura** | 0.2 |
| **RAG** | `retrieveArticles` (com re-ranking LLM) — 7 artigos, topK=7 |
| **Schema Zod de saída** | `BriefingResponseSchema` — inclui `diagnostico`, `gaps_identificados`, `oportunidades`, `recomendacoes_prioritarias`, `inconsistencias`, `confidence_score` |
| **Timeout** | Padrão `generateWithRetry` |
| **maxRetries** | 2 (padrão) |
| **Fallback** | Erro propagado ao frontend (operação crítica) |

É a única etapa que usa `retrieveArticles` (com re-ranking LLM a temperatura 0.0), garantindo maior precisão na seleção dos artigos. O wrapper `generateBriefingFromDiagnostic` (linha 1816) agrega as 3 camadas de diagnóstico (Corporativo, Operacional, CNAE) antes de chamar o `generateBriefing` existente.

---

### Etapa 4 — `generateRiskMatrices` (Matrizes de Risco — 4 Áreas)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.generateRiskMatrices` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linha 1032 |
| **Temperatura** | 0.2 (linha 1094) |
| **RAG** | `retrieveArticlesFast` — **1 busca compartilhada** para as 4 áreas, topK=7 |
| **Schema Zod de saída** | `RisksResponseSchema` — `{ risks: Array<RiskItemSchema> }`, mín. 1, máx. 12 riscos |
| **Timeout** | Padrão `generateWithRetry` |
| **maxRetries** | 2 (padrão) |
| **Paralelismo** | `Promise.all` — 4 chamadas paralelas simultâneas (reduz ~3min sequencial para ~45s) |
| **Fallback** | Erro propagado por área; áreas sem erro retornam resultado parcial |

**Gap ativo (G7):** O mesmo contexto RAG (7 artigos) é compartilhado entre Contabilidade, Negócio, TI e Jurídico. Isso pode resultar em riscos duplicados entre categorias, pois o LLM não recebe instrução de exclusividade mútua.

---

### Etapa 5a — `generateActionPlan` (Plano de Ação — 4 Áreas)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.generateActionPlan` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linha 1144 |
| **Temperatura** | 0.15 (linha 1271) |
| **RAG** | `retrieveArticlesFast` — **1 busca por área** (query inclui nome da área + top riscos), topK=10 |
| **Schema Zod de saída** | `TasksResponseSchema` — `{ tasks: Array<TaskItemSchema> }`, mín. 3, máx. 12 tarefas |
| **Timeout** | Padrão `generateWithRetry` |
| **maxRetries** | 2 (padrão) |
| **Paralelismo** | `Promise.all` — 4 chamadas paralelas simultâneas |
| **Fallback** | Área sem riscos retorna `tasks: []` sem chamar LLM |

Esta é a etapa mais refinada do pipeline: usa RAG específico por área (não compartilhado), injeta o briefing como contexto adicional, e tem as regras de prompt mais rigorosas (10 regras CRÍTICAS explícitas).

---

### Etapa 5b — `generateDecision` (Motor de Decisão)

| Campo | Valor |
|---|---|
| **Procedure** | `fluxoV3.generateDecision` |
| **Arquivo** | `server/routers-fluxo-v3.ts` linha 1435 |
| **Temperatura** | 0.35 (maior para "insight criativo") |
| **RAG** | `retrieveArticles` (com re-ranking LLM) — 5 artigos, topK=5 |
| **Schema Zod de saída** | `DecisaoResponseSchema` — `{ decisao_recomendada: DecisaoRecomendadaSchema }` com `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `prioridade`, `proximos_passos`, `momento_wow`, `fundamentacao_legal` |
| **Timeout** | Padrão `generateWithRetry` |
| **maxRetries** | 2 (padrão) |
| **Fallback** | Erro propagado (operação crítica) |

---

### Scoring — `calculateGlobalScore` (Determinístico)

| Campo | Valor |
|---|---|
| **Função** | `calculateGlobalScore` |
| **Arquivo** | `server/ai-helpers.ts` |
| **LLM** | Nenhum — cálculo 100% determinístico |
| **Pesos por área** | Contabilidade e Fiscal: 30% / Jurídico: 30% / Negócio: 25% / TI: 15% |
| **Pesos de severidade** | Crítica=9 / Alta=6 / Média=3 / Baixa=1 |
| **Pesos de probabilidade** | Alta=3 / Média=2 / Baixa=1 |

O scoring é calculado no servidor sem chamada LLM, garantindo determinismo e rastreabilidade. O resultado alimenta o `ScoringDataSchema` com `score_global` (0-100), `nivel` (baixo/medio/alto/critico), `impacto_estimado`, `custo_inacao` e contagem de riscos por severidade.

---

## SEÇÃO 2 — CORPUS RAG (AS-IS)

### 2.1 Tabela `ragDocuments` (Corpus Ativo)

Esta é a tabela consultada em tempo real pelo `rag-retriever.ts`. Contém 1.241 chunks ativos distribuídos entre três legislações.

| Lei (campo `lei`) | Chunks | Cobertura | Problema identificado |
|---|---|---|---|
| `lc214` | **779** | Artigos narrativos — Anexos I, V, VII, IX, XII, XV ausentes | Anexos não indexados (G4) |
| `lc227` | **434** | Parcial | Label com ano possivelmente incorreto: "LC 227/2024" (G2) |
| `lc224` | **28** | Parcial (96 registros em `regulatory_articles`) | Label "LC224" sem espaço e sem ano (G1); Art. 4º com `cnaeGroups` inconsistentes entre chunks (G6) |
| `ec132` | **0** | **Completamente ausente** | 384 registros em `regulatory_articles` não migrados para `ragDocuments` (G3) |
| `lc116`, `lc87`, `cgibs`, `rfb`, `confaz` | 0 | Ausentes | — |

**Campos da tabela:** `id`, `lei`, `artigo`, `titulo`, `conteudo`, `topicos`, `cnaeGroups`, `chunkIndex`.

---

### 2.2 Tabela `regulatory_articles` (Corpus Estruturado — NÃO usado pelo RAG)

Esta tabela contém o texto completo e hierárquico das legislações, mas **não é consultada** pelo `rag-retriever.ts`. Serve como fonte de verdade para consultas diretas e futuras migrações para `ragDocuments`.

| source_id | Registros | Hierarquia |
|---|---|---|
| `LC214-2025` | **3.676** | artigos + parágrafos + incisos |
| `LC227-2026` | **1.622** | artigos + parágrafos + incisos |
| `EC132-2023` | **384** | artigos + parágrafos + incisos |
| `LC224-2025` | **96** | artigos + parágrafos + incisos |

**Schema:** `article_id` (varchar 128), `source_id` (varchar 64), `article_number` (varchar 128), `hierarchy_level` (varchar 32: artigo/paragrafo/inciso), `parent_id` (varchar 128), `full_text` (mediumtext, até 16MB), `article_type` (varchar 32), `position_order` (int), `version` (varchar 32), `created_at` (datetime).

---

### 2.3 Arquitetura do `rag-retriever.ts` (Motor Híbrido V65)

O retriever opera em 5 estágios sequenciais:

**Estágio 1 — `extractCnaeGroups(cnaes)`:** Extrai os 2 primeiros dígitos de cada CNAE para filtro por grupo setorial (ex: CNAE `4711-3/01` → grupo `47`).

**Estágio 2 — `extractKeywords(contextQuery)`:** Remove stopwords (34 palavras) e retorna as top 15 palavras-chave do contexto. Apenas as top 8 são usadas nas queries LIKE.

**Estágio 3 — `fetchCandidates()`:** Executa query LIKE multi-termo no TiDB Cloud:
```
OR(like(titulo, '%kw%'), like(topicos, '%kw%'), like(conteudo, '%kw%'))
para cada keyword (top 8)
+ OR(like(cnaeGroups, '%GG%'))
para cada grupo CNAE (2 dígitos)
LIMIT 20 candidatos
```

**Estágio 4 — `rerankWithLLM()`** (apenas `retrieveArticles`): LLM a temperatura 0.0 seleciona os top-5 candidatos mais relevantes. Retorna índices JSON `{"indices": [0, 2, 5, 8, 12]}`. Fallback: primeiros topK candidatos se LLM falhar.

**Estágio 5 — `formatContextText()`:** Formata os artigos para injeção no prompt com label da lei. **Bug ativo:** o mapa de labels não contém entrada para `lc224`, resultando em exibição como `"LC224"` em vez de `"LC 224/2025"`.

---

### 2.4 Bugs Ativos no `formatContextText`

```typescript
// Estado atual (bugado):
const leiLabel = {
  lc214: "LC 214/2025",
  ec132: "EC 132/2023",
  lc227: "LC 227/2024",   // ← ano possivelmente incorreto (G2)
  lc116: "LC 116/2003",
  lc87:  "LC 87/1996",
}[a.lei] ?? a.lei.toUpperCase();
// lc224 não tem entrada → fallback: "LC224" (sem espaço, sem ano) — G1
```

---

### 2.5 Causa Raiz dos Riscos Ausentes no UAT

Quatro causas raiz distintas explicam por que artigos relevantes não aparecem nos diagnósticos:

**LC 214 Art. 45 (id=65 na `ragDocuments`):** O artigo está presente e completo (com §4º — "confissão de dívida" — e §5º). Porém, o campo `topicos` não contém os termos `"confissão de dívida"` nem `"apuração IBS CBS"`. A busca LIKE só o recupera quando o briefing da empresa menciona explicitamente esses termos. **Gap G5.**

**LC 224 Art. 4º (ids 789–794):** Os 6 chunks estão presentes, mas o campo `cnaeGroups` é inconsistente entre eles — alguns cobrem todos os setores (`01-96`), outros apenas setores específicos (`10-33` para indústria, `64-66` para financeiro). Uma empresa de comércio (CNAE `46xx`) ou transporte (`49xx`) pode não recuperar nenhum chunk. **Gap G6.**

**Anexos da LC 214:** Os Anexos I, V, VII, IX, XII e XV (que definem NCM, cesta básica, medicamentos, insumos agropecuários, serviços financeiros e imóveis) estão completamente ausentes do corpus ativo. Riscos relacionados a esses regimes especiais nunca aparecem nos diagnósticos. **Gap G4.**

**EC 132/2023:** Zero chunks em `ragDocuments`. A emenda constitucional que originou toda a reforma nunca é citada como evidência regulatória nos riscos e planos de ação. **Gap G3.**

---

## SEÇÃO 3 — QUESTIONÁRIOS (AS-IS)

### 3.1 Estrutura Atual

O diagnóstico utiliza 3 questionários em sequência obrigatória, totalizando 82 campos:

| Questionário | Código | Perguntas | Obs. | Total campos |
|---|---|---|---|---|
| Corporativo | QC-01 a QC-10 | 22 | 10 | 32 |
| Operacional | QO-01 a QO-10 | 20 | 10 | 30 |
| CNAE-específico | QCNAE-01 a QCNAE-05 | 15 | 5 | 20 |
| **Total** | | **57** | **25** | **82** |

---

### 3.2 Prefill Contract (v1.1 — Auditado)

O Prefill Contract garante que dados coletados no formulário de perfil da empresa (`PerfilEmpresaIntelligente`) sejam automaticamente propagados para os questionários, evitando que o usuário responda a mesma informação duas vezes. Após a correção dos bugs BUG-001 e OBS-002, o contrato está íntegro com 12 campos mapeados e 410 testes automatizados passando.

**Arquivo canônico:** `shared/questionario-prefill.ts` (builders `buildCorporatePrefill`, `buildOperationalPrefill`, `buildCnaePrefill`).

---

### 3.3 Fonte das Perguntas (AS-IS)

Todas as perguntas dos questionários são geradas pelo LLM (Etapa 2 — `generateQuestions`) a partir do CNAE e do contexto RAG. Não há distinção de fonte entre perguntas regulatórias, de conhecimento especializado ou combinatórias de perfil. Toda pergunta é tratada como "gerada por IA", sem rastreabilidade de origem.

---

### 3.4 Arquitetura TO-BE Identificada (Não Implementada)

O Orquestrador identificou uma arquitetura de 3 ondas de perguntas com fonte rastreável, ainda não implementada:

**1ª onda:** Perguntas curadas manualmente pela equipe jurídica SOLARIS — fonte `solaris`, revisadas por advogado sênior antes da publicação.

**2ª onda:** Perguntas geradas on-the-fly pela IA a partir de combinações de parâmetros do perfil inicial — fonte `ia_gen`, dinâmicas e não estáticas.

**3ª onda:** Perguntas regulatórias via RAG — funcionamento atual, fonte `regulatorio`.

---

### 3.5 Problema de UI Identificado no UAT

A pergunta QC-09 ("Fiscalização, contencioso e compliance") está marcada como "Conteúdo em desenvolvimento (Fase 5)" com labels de engenharia `[QC-09-P1]` e `[QC-09-P2]` visíveis ao usuário final. O público da plataforma é 100% brasileiro e o contexto é jurídico-tributário — labels de engenharia expostos são inaceitáveis neste contexto. **Gap G13.**

---

## SEÇÃO 4 — SCHEMA ZOD (AS-IS)

### 4.1 Schema de Riscos (`RisksResponseSchema`)

Arquivo: `server/ai-schemas.ts`

| Campo | Tipo | Obrigatório | Default | Problema |
|---|---|---|---|---|
| `id` | string | ✅ | — | — |
| `evento` | string | ✅ | — | — |
| `causa_raiz` | string | ❌ | `''` | Risco sem causa raiz identificada |
| `evidencia_regulatoria` | string | ❌ | `'Reforma Tributária — EC 132/2023'` | Default genérico → sem rastreabilidade real (G9) |
| `probabilidade` | enum Baixa/Média/Alta | ✅ | `.catch("Média")` | — |
| `impacto` | enum Baixo/Médio/Alto | ✅ | `.catch("Médio")` | — |
| `severidade` | enum Baixa/Média/Alta/Crítica | ✅ | `.catch("Média")` | — |
| `severidade_score` | number 1-9 | ✅ | `.catch(4)` | — |
| `plano_acao` | string | ❌ | `''` | Sem atomicidade forçada (G10) |
| `fonte_risco` | — | ❌ | **ausente** | Sem distinção regulatório/solaris/ia_gen (G11) |
| `area` | — | ❌ | **ausente** | Área só existe no schema de ação, não no de risco |

---

### 4.2 Schema de Ações (`TasksResponseSchema`)

Arquivo: `server/ai-schemas.ts`

| Campo | Tipo | Obrigatório | Default | Problema |
|---|---|---|---|---|
| `id` | string | ✅ | — | — |
| `titulo` | string (min 10) | ✅ | — | — |
| `descricao` | string (min 30) | ✅ | fallback LC 214/2025 | — |
| `area` | enum contabilidade/negocio/ti/juridico | ✅ | `.catch("juridico")` | Label visual "Contabilidade" vs "Contabilidade e Fiscal" (G14) |
| `prazo_sugerido` | enum 30/60/90 dias | ✅ | `.catch("60 dias")` | Sem personalização por severidade |
| `prioridade` | enum Alta/Média/Baixa | ✅ | `.catch("Média")` | — |
| `responsavel_sugerido` | string (min 5) | ✅ | `"Equipe Tributária"` | — |
| `objetivo_diagnostico` | string (min 15) | ✅ | fallback genérico | — |
| `evidencia_regulatoria` | string (min 5) | ✅ | `"LC 214/2025"` | — |
| `cnae_origem` | string | ❌ | `''` | — |
| `gap_especifico` | string | ❌ | `''` | — |
| `acao_concreta` | string | ❌ | `''` | Sem atomicidade forçada (G10) |
| `criterio_de_conclusao` | — | ❌ | **ausente** | Ação não verificável |

---

## SEÇÃO 5 — PROMPTS (AS-IS)

### 5.1 `generateBriefing`

**Persona do sistema:** "Consultor Sênior de Compliance Tributário com 15 anos de experiência."

**Contexto injetado:** Respostas do questionário em texto livre + contexto RAG (7 artigos via `retrieveArticles`).

**Gap identificado (G8):** O `companyProfile` (regime tributário, porte, faturamento, CNAEs confirmados, operação interestadual, meios de pagamento) não é injetado de forma estruturada no prompt. O briefing recebe as respostas do questionário mas não recebe o perfil da empresa como bloco separado e formatado. Resultado: briefings menos personalizados pelo perfil real da empresa.

---

### 5.2 `generateRiskMatrices`

**Persona do sistema:** "Auditor de Riscos Regulatórios especializado na Reforma Tributária brasileira (LC 214/2025)."

**RAG:** `retrieveArticlesFast` — 1 busca compartilhada para as 4 áreas, topK=7.

**Regras no prompt:** (1) causa_raiz obrigatória; (2) evidencia_regulatoria obrigatória; (3) severidade_score numérico; (4) entre 5 e 10 riscos por área; (5) nunca inventar artigos.

**Gaps identificados:**

- **G7:** O mesmo contexto legislativo (7 artigos) é injetado para Contabilidade, Negócio, TI e Jurídico simultaneamente. Sem instrução de exclusividade mútua, o LLM tende a gerar riscos similares em múltiplas categorias.
- **G8:** O perfil da empresa (regime, porte, faturamento) não é injetado no prompt de risco, resultando em riscos genéricos não personalizados.
- **Paralelismo:** 4 chamadas paralelas via `Promise.all` — reduz latência de ~3min para ~45s.

---

### 5.3 `generateActionPlan`

**Persona do sistema:** "Gestor Sênior de Compliance Tributário especializado na Reforma Tributária brasileira (LC 214/2025, LC 224/2025, LC 227/2025)."

**RAG:** `retrieveArticlesFast` — 1 busca por área (query inclui nome da área + CNAEs + top 3 riscos), topK=10.

**Regras no prompt (10 regras CRÍTICAS):**
1. PROIBIDO tarefas genéricas sem especificação de objeto e impacto
2. OBRIGATÓRIO citar resposta específica do questionário no campo `objetivo_diagnostico`
3. OBRIGATÓRIO citar artigo específico no campo `evidencia_regulatoria`
4. OBRIGATÓRIO: `descricao` com mínimo 3 ações concretas numeradas
5. OBRIGATÓRIO: `responsavel_sugerido` com cargo específico
6. OBRIGATÓRIO: `prazo_sugerido` refletir severidade (crítico=30d, alto=60d, médio=90d)
7. Entre 4 e 10 tarefas por área, priorizadas por severidade
8. `cnae_origem`: CNAE específico que originou a tarefa
9. `gap_especifico`: gap de compliance em uma frase objetiva
10. `acao_concreta`: primeira ação imediata a executar

Esta é a etapa com o prompt mais rigoroso do pipeline. O contexto RAG é específico por área (não compartilhado), e o briefing é injetado como contexto adicional.

---

## SEÇÃO 6 — GAPS CRÍTICOS CONSOLIDADOS

A tabela abaixo consolida todos os gaps identificados nas investigações de diagnóstico, com classificação por tipo de fix e risco de implementação.

| ID | Gap | Impacto | Localização | Fix | Risco |
|---|---|---|---|---|---|
| **G1** | Label `lc224` ausente no `formatContextText` | LLM recebe "LC224" sem espaço e sem ano | `server/rag-retriever.ts` ~L110 | 1 linha de código | Baixo |
| **G2** | Label `lc227` com ano possivelmente incorreto ("LC 227/2024") | Cita ano incorreto nos prompts | `server/rag-retriever.ts` ~L108 | 1 linha de código | Baixo |
| **G3** | EC 132/2023 com 0 chunks no corpus ativo | Nunca citada como evidência regulatória | Tabela `ragDocuments` | Migração de `regulatory_articles` → `ragDocuments` | Médio |
| **G4** | Anexos LC 214 ausentes do corpus | Riscos de NCM, cesta básica, medicamentos, insumos agropecuários nunca aparecem | Tabela `ragDocuments` | Ingestão dos Anexos I, V, VII, IX, XII, XV | Médio |
| **G5** | LC 214 Art. 45 com `topicos` incompletos | Não recuperado pela busca LIKE quando briefing não menciona "confissão de dívida" | `ragDocuments` id=65 | `UPDATE ragDocuments SET topicos = ... WHERE id = 65` | Baixo |
| **G6** | LC 224 Art. 4º com `cnaeGroups` inconsistentes entre chunks | Recuperação parcial por setor (empresas de comércio/transporte podem não recuperar nenhum chunk) | `ragDocuments` ids 789–794 | `UPDATE ragDocuments SET cnaeGroups = '01-96' WHERE id IN (789,790,791,792,793,794)` | Baixo |
| **G7** | 1 RAG compartilhado para 4 áreas de risco | Riscos duplicados entre categorias; sem contexto específico por área | `server/routers-fluxo-v3.ts` ~L1055 | RAG por área (4 buscas paralelas, como já feito no `generateActionPlan`) | Médio |
| **G8** | `companyProfile` não injetado de forma estruturada no briefing e nas matrizes | Briefing e riscos genéricos, não personalizados pelo perfil real | `server/routers-fluxo-v3.ts` `generateBriefing` e `generateRiskMatrices` | Ajuste de prompt (injetar bloco estruturado do perfil) | Médio |
| **G9** | `evidencia_regulatoria` opcional no schema de riscos com default genérico | Riscos sem rastreabilidade regulatória real | `server/ai-schemas.ts` `RiskItemSchema` | Tornar obrigatório + remover default genérico | Baixo |
| **G10** | `acao_concreta` opcional no schema de ações | Planos de ação não atômicos | `server/ai-schemas.ts` `TaskItemSchema` | Tornar obrigatório (min 20 chars) | Baixo |
| **G11** | Campo `fonte_risco` ausente no schema de riscos | Sem distinção entre risco regulatório, SOLARIS ou ia_gen | `server/ai-schemas.ts` `RiskItemSchema` | Adicionar campo `fonte_risco: enum('regulatorio', 'solaris', 'ia_gen')` | Baixo |
| **G12** | Valores `solaris` e `ia_gen` ausentes no campo `lei` da `ragDocuments` | Corpus SOLARIS e perguntas ia_gen não podem ser armazenados | Tabela `ragDocuments` schema | Novos valores no enum (sem ALTER TABLE — apenas inserção de novos registros) | Baixo |
| **G13** | Placeholder QC-09 visível ao usuário final | Labels de engenharia `[QC-09-P1]`, `[QC-09-P2]` expostos em contexto jurídico | Frontend — componente QC-09 | Remover placeholder ou implementar conteúdo | Baixo |
| **G14** | Label "Contabilidade" → "Contabilidade e Fiscal" | Pedido dos advogados — apenas visual | Frontend — labels de área | 1 linha visual | Baixo |
| **G15** | 3 ondas de perguntas não implementadas | Fonte de cada pergunta não rastreável | Arquitetura de questionários | Arquitetura TO-BE (ver Seção 7) | Alto |

---

## SEÇÃO 7 — ARQUITETURA DE FONTES (TO-BE IDENTIFICADO)

O Orquestrador identificou uma arquitetura de 3 fontes de requisitos que pode ser implementada sem mudança estrutural no schema existente. A tabela `ragDocuments` já possui o campo `lei` (enum) que pode receber novos valores.

### Fonte 1 — `regulatorio` (Já Existe)

Artigos das legislações federais (EC 132, LC 214, LC 224, LC 227, LC 116, LC 87). Já indexados em `ragDocuments` com os valores atuais do campo `lei`. Ingestão via scripts de migração a partir de `regulatory_articles`.

### Fonte 2 — `solaris` (Novo Valor)

Conhecimento especializado curado pela equipe jurídica SOLARIS. Ingerido via CSV com schema idêntico ao `ragDocuments`. Requer gate de revisão pelo advogado sênior antes da publicação.

**Schema do CSV de ingestão SOLARIS:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `titulo` | string | ✅ | Título do conhecimento |
| `conteudo` | string | ✅ | Conteúdo completo |
| `topicos` | string | ✅ | Palavras-chave para busca LIKE |
| `cnaeGroups` | string | ✅ | Grupos CNAE aplicáveis (ex: "01-96" para todos) |
| `lei` | `'solaris'` | ✅ | Fixo: `'solaris'` |
| `artigo` | string | ✅ | Identificador interno (ex: "SOL-001") |
| `area` | enum | ✅ | contabilidade/negocio/ti/juridico |
| `severidade_base` | enum | ✅ | Baixa/Média/Alta/Crítica |
| `vigencia_inicio` | date | ✅ | Data de início de vigência |

### Fonte 3 — `ia_gen` (Novo Valor)

Perguntas e contextos gerados on-the-fly na 2ª onda de perguntas. Parâmetros do perfil inicial (regime, porte, CNAEs, operação interestadual) como gatilho combinatório. **Não persistido em `ragDocuments`** — gerado dinamicamente e descartado após uso. O campo `lei = 'ia_gen'` identifica o contexto no prompt mas não requer armazenamento.

---

## SEÇÃO 8 — INVARIANTS DO SISTEMA

Os 8 invariants do sistema estão definidos em `docs/governance/invariant-registry.md` (versão 1.0, criado em 2026-03-24). Qualquer violação de invariant é automaticamente classificada como `structural-fix` e requer o processo completo de governança.

| ID | Nome (curto) | Grupo | Severidade | Status | Proteção | Impacto de mudança de schema |
|---|---|---|---|---|---|---|
| **INV-001** | `campo_coletado → nunca_vazio` | Prefill Contract | 🔴 CRÍTICO | ✅ Ativo | `prefill-contract.test.ts` BLOCO 5 (17 testes) | Qualquer mudança nos builders de prefill ou nos campos do formulário de perfil viola este invariant |
| **INV-002** | `api → nunca_string_json` | Prefill Contract | 🔴 CRÍTICO | ✅ Ativo | `prefill-contract.test.ts` BLOCO 2 (8 testes) | Qualquer novo campo JSON canônico deve ser adicionado ao `normalizeProject()` em `server/db.ts` |
| **INV-003** | `builder → fonte_única` | Prefill Contract | 🟠 ALTO | ✅ Ativo | `prefill-contract.test.ts` BLOCO 3, 9 | Proibido adicionar lógica de prefill em componentes de página — apenas em `shared/questionario-prefill.ts` |
| **INV-004** | `campo_sem_fonte → undefined` | Prefill Contract | 🟠 ALTO | ✅ Ativo | `prefill-contract.test.ts` BLOCO 4, 6 | Campos sem fonte no perfil DEVEM retornar `undefined`, nunca string vazia ou valor fabricado |
| **INV-005** | `pergunta_sem_fonte → invalida` | Diagnóstico | 🟠 ALTO | ✅ Ativo | Revisão manual | Toda nova pergunta adicionada aos questionários deve ter fonte identificada |
| **INV-006** | `risco_sem_origem → invalido` | Riscos | 🟠 ALTO | ✅ Ativo | Testes a implementar | A implementação do campo `fonte_risco` (G11) deve respeitar este invariant — nenhum risco sem origem rastreável |
| **INV-007** | `acao_sem_evidence → invalida` | Planos de Ação | 🟡 MÉDIO | ✅ Ativo | Testes a implementar | A adição do campo `evidence_required` (relacionado a G10) deve ser obrigatória no schema |
| **INV-008** | `briefing_sem_coverage → invalido` | Briefing | 🔴 CRÍTICO | ✅ Ativo | Testes a implementar | Qualquer mudança no fluxo de diagnóstico deve preservar a verificação de cobertura 100% das 3 camadas antes de gerar briefing |

**Observação sobre INV-006 e INV-007:** Ambos estão ativos como invariants documentados, mas os testes de proteção ainda não foram implementados (marcados como "a implementar" no registry). Isso representa um risco: os invariants existem como contrato mas não têm cobertura automatizada. Esta lacuna está catalogada na issue #101 (débito técnico).

---

## SEÇÃO 9 — DECISÕES PENDENTES DO P.O.

As decisões abaixo requerem aprovação do P.O. (Uires Tapajós) antes da próxima sprint de implementação.

### Decisão 1 — Sequência de Priorização dos Gaps

Os 15 gaps identificados têm diferentes perfis de risco e esforço. A sequência recomendada pelo Orquestrador é:

| Fase | Gaps | Justificativa | Risco |
|---|---|---|---|
| **Imediata** (1 PR) | G1, G2 | 2 linhas de código, sem risco, impacto imediato na qualidade dos prompts | Baixo |
| **Sprint 1** (1 PR) | G5, G6 | UPDATE SQL com rollback trivial; corrige recuperação de artigos críticos | Baixo |
| **Sprint 2** (1 PR) | G9, G10, G11 | Schema Zod + prompt; afeta qualidade de todos os diagnósticos futuros | Baixo-Médio |
| **Sprint 3** (1 PR) | G7, G8 | Refatoração de prompt; afeta todos os diagnósticos futuros | Médio |
| **Sprint 4** (1 PR) | G3, G4 | Ingestão de dados; requer script de migração e validação | Médio |
| **Sprint 5** (múltiplos PRs) | G13, G14, G15 | Frontend + arquitetura de 3 ondas | Alto |

**Pergunta para o P.O.:** Esta sequência está alinhada com as prioridades do produto? Há algum gap que deve ser antecipado ou postergado?

---

### Decisão 2 — Schema do CSV para Ingestão SOLARIS

O schema proposto na Seção 7 (Fonte 2) precisa de aprovação antes da implementação do upload. Os campos `severidade_base` e `vigencia_inicio` são novos e não existem no schema atual de `ragDocuments`.

**Pergunta para o P.O.:** O schema proposto está correto? Há campos adicionais necessários (ex: `autor`, `revisado_por`, `data_revisao`)?

---

### Decisão 3 — Estratégia de Ingestão dos Anexos da LC 214

Os Anexos I, V, VII, IX, XII e XV da LC 214/2025 estão ausentes do corpus ativo (Gap G4). Há duas estratégias de ingestão:

**Opção A — Chunk por artigo dos Anexos:** Cada item do Anexo (ex: cada NCM da cesta básica) vira um chunk separado. Resultado: alta granularidade, melhor precisão na busca LIKE. Custo: centenas de chunks adicionais.

**Opção B — Chunk por Anexo completo:** Cada Anexo vira 1 chunk. Resultado: menor granularidade, mas contexto mais completo por chunk. Risco: chunks muito longos podem ultrapassar o limite de contexto do LLM.

**Pergunta para o P.O.:** Qual estratégia aprovar? A recomendação técnica é a Opção A para os Anexos com listas de NCM (Anexos I, V, VII), e Opção B para os Anexos narrativos (Anexos IX, XII, XV).

---

## Rodapé

| Campo | Valor |
|---|---|
| **Versão** | AS-IS v1.0 |
| **Data** | 2026-03-26 |
| **Autor** | Orquestrador (Claude — Anthropic) |
| **Compilado por** | Manus (Implementador Técnico) |
| **Status** | Aprovado para uso como base do TO-BE |
| **Próxima revisão** | Após UAT round 2 com advogados |
| **Repositório** | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| **Produção** | https://iasolaris.manus.space |
