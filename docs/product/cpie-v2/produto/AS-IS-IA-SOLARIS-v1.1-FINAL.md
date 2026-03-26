# DOCUMENTAÇÃO AS-IS — IA SOLARIS v1.1 FINAL
## Plataforma de Compliance da Reforma Tributária Brasileira

| Campo | Valor |
|---|---|
| **Versão** | AS-IS v1.1 — Final e Fechada |
| **Data** | 2026-03-26 |
| **Autores** | Orquestrador (Claude — Anthropic) + verificação técnica Manus |
| **Status** | ✅ Aprovada — base formal para o TO-BE |
| **Repositório** | github.com/Solaris-Empresa/compliance-tributaria-v2 |
| **Produção** | https://iasolaris.manus.space |
| **Próxima revisão** | Após UAT round 2 com advogados |

---

## Sumário

1. [Pipeline de IA](#seção-1--pipeline-de-ia)
2. [Corpus RAG](#seção-2--corpus-rag)
3. [Questionários](#seção-3--questionários)
4. [Schemas Zod](#seção-4--schemas-zod)
5. [Prompts](#seção-5--prompts)
6. [Gaps Críticos Consolidados](#seção-6--gaps-críticos-consolidados)
7. [Arquitetura de Fontes — TO-BE Identificado](#seção-7--arquitetura-de-fontes--to-be-identificado)
8. [Invariants do Sistema](#seção-8--invariants-do-sistema)
9. [Tabela de Prioridades Estratégicas](#seção-9--tabela-de-prioridades-estratégicas)
10. [Decisões Pendentes do P.O.](#seção-10--decisões-pendentes-do-po)
11. [Estado do Repositório](#seção-11--estado-do-repositório)

---

## SEÇÃO 1 — PIPELINE DE IA

### 1.1 Visão Geral

O sistema usa GPT-4.1 em 7 pontos do fluxo, todos orquestrados em `server/routers-fluxo-v3.ts` (2.141 linhas). A função `generateWithRetry()` em `server/ai-helpers.ts` encapsula todas as chamadas com retry automático (padrão: 2 tentativas, 1s entre tentativas) e validação Zod na saída. O scoring de risco é determinístico — sem LLM.

### 1.2 Os 7 Pontos de Integração

---

#### Etapa 1 — `extractCnaes` (linha 116)

| Campo | Valor |
|---|---|
| Temperatura | 0.1 |
| RAG | Embeddings semânticos `text-embedding-3-small` — **não usa `ragDocuments`** |
| Timeout | 25.000ms |
| maxRetries | 1 (exceção ao padrão de 2) |
| Schema Zod saída | `CnaesResponseSchema`: `{ cnaes: [{ code, description, confidence (0-100), justification }] }` |
| Notificação | `notifyOwner()` acionado em qualquer falha ou timeout |

**Fallback em 3 níveis:**
1. `findSimilarCnaes()` — top-5 por similaridade de cosseno do cache em memória
2. `getFallbackCandidates(5)` — lista hardcoded se embeddings falharem
3. Re-lança erro original se nenhum candidato disponível

Quando fallback nível 1 ou 2 é acionado: banner amber exibido na UI informando o usuário.

---

#### Etapa 2 — `generateQuestions` (linha 502)

| Campo | Valor |
|---|---|
| Temperatura | 0.2 |
| RAG | `retrieveArticlesFast` — 5 artigos por CNAE, sem re-ranking |
| maxRetries | 2 (padrão) |
| Fallback | Retorna array vazio — non-fatal, não bloqueia o fluxo |
| Schema Zod saída | `QuestionsResponseSchema`: array com `id`, `texto`, `tipo`, `opcoes` |

Gera até 10 perguntas por CNAE com `objetivo_diagnostico`, `impacto_reforma`, `peso_risco` e `type`.

**Problema AS-IS:** fonte das perguntas não é rastreável. Todas vêm do LLM sem distinção regulatório / SOLARIS / ia_gen.

---

#### Etapa 3 — `generateBriefing` (linhas 908 e 1816)

| Campo | Valor |
|---|---|
| Temperatura | 0.2 |
| RAG | `retrieveArticles` com re-ranking LLM (T=0.0) — 7 artigos |
| maxRetries | 2 (padrão) |
| Fallback | Erro propagado ao frontend (operação crítica) |
| Schema Zod saída | `BriefingResponseSchema`: `diagnostico`, `gaps_identificados`, `oportunidades`, `recomendacoes_prioritarias`, `inconsistencias`, `confidence_score` |

**Dois endpoints coexistentes:**
- `generateBriefing` (L908) — fluxo direto
- `generateBriefingFromDiagnostic` (L1816) — wrapper que agrega as 3 camadas de diagnóstico (Corporativo, Operacional, CNAE) antes de chamar o briefing

Única etapa que usa `retrieveArticles` com re-ranking, garantindo maior precisão na seleção dos artigos.

**Problema AS-IS — G8:** `companyProfile` (regime, porte, faturamento, CNAEs confirmados, operação interestadual, meios de pagamento) **não é injetado de forma estruturada** no prompt. Briefing genérico, não personalizado pelo perfil real da empresa.

---

#### Etapa 4 — `generateRiskMatrices` (linha 1032)

| Campo | Valor |
|---|---|
| Temperatura | 0.2 |
| RAG | `retrieveArticlesFast` — **1 busca compartilhada para as 4 áreas**, topK=7 |
| maxRetries | 2 (padrão) |
| Paralelismo | `Promise.all` — 4 chamadas simultâneas (~45s vs ~3min sequencial) |
| Fallback | Erro propagado por área; áreas sem erro retornam resultado parcial |
| Schema Zod saída | `RisksResponseSchema`: `{ risks: Array<RiskItemSchema> }` — mín. 1, máx. 12 riscos por área |

**Problemas AS-IS:**
- **G7:** mesmo contexto RAG (7 artigos) injetado nas 4 áreas (Contabilidade e Fiscal, Negócio, TI, Jurídico) simultaneamente — riscos duplicados entre categorias
- **G8:** perfil da empresa não injetado — riscos genéricos
- Sem instrução mutuamente exclusiva por área no prompt

---

#### Etapa 5a — `generateActionPlan` (linha 1144)

| Campo | Valor |
|---|---|
| Temperatura | 0.15 |
| RAG | `retrieveArticlesFast` — **1 busca por área** (query: nome da área + CNAEs + top 3 riscos), topK=10 |
| maxRetries | 2 (padrão) |
| Paralelismo | `Promise.all` — 4 chamadas simultâneas |
| Fallback | Área sem riscos retorna `tasks: []` sem chamar LLM |
| Schema Zod saída | `TasksResponseSchema`: `{ tasks: Array<TaskItemSchema> }` — mín. 3, máx. 12 tarefas por área |

Esta é a etapa com o prompt mais rigoroso do pipeline: RAG específico por área (não compartilhado), briefing injetado como contexto adicional, e **10 regras CRÍTICAS** explícitas:

1. PROIBIDO tarefas genéricas sem especificação de objeto e impacto
2. OBRIGATÓRIO citar resposta específica do questionário em `objetivo_diagnostico`
3. OBRIGATÓRIO citar artigo específico em `evidencia_regulatoria`
4. OBRIGATÓRIO: `descricao` com mínimo 3 ações concretas numeradas
5. OBRIGATÓRIO: `responsavel_sugerido` com cargo específico
6. OBRIGATÓRIO: `prazo_sugerido` refletir severidade (crítico=30d, alto=60d, médio=90d)
7. Entre 4 e 10 tarefas por área, priorizadas por severidade
8. `cnae_origem`: CNAE específico que originou a tarefa
9. `gap_especifico`: gap de compliance em uma frase objetiva
10. `acao_concreta`: primeira ação imediata a executar

**Problema AS-IS — G10:** apesar das 10 regras no prompt, o schema Zod tem `acao_concreta` como campo **opcional**. O LLM pode ignorar a regra 10 sem que o schema rejeite o output.

---

#### Etapa 5b — `generateDecision` (linha 1435)

| Campo | Valor |
|---|---|
| Temperatura | 0.35 (maior — para "insight criativo") |
| RAG | `retrieveArticles` com re-ranking LLM — topK=5 |
| maxRetries | 2 (padrão) |
| Fallback | Erro propagado (operação crítica) |
| Schema Zod saída | `DecisaoResponseSchema`: `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `prioridade`, `proximos_passos`, `momento_wow`, `fundamentacao_legal` |

---

#### Scoring — `calculateGlobalScore` (`server/ai-helpers.ts`)

Sem LLM. Determinístico e auditável.

| Pesos por área | Severidade | Probabilidade |
|---|---|---|
| Contabilidade e Fiscal: **30%** | Crítica = 9 | Alta = 3 |
| Jurídico: **30%** | Alta = 6 | Média = 2 |
| Negócio: **25%** | Média = 3 | Baixa = 1 |
| TI: **15%** | Baixa = 1 | — |

Score por risco: `severidade_score × probabilidade_score`. Score global: média ponderada por área, normalizada 0–100.

---

## SEÇÃO 2 — CORPUS RAG

### 2.1 Tabela `ragDocuments` — corpus ativo

Única tabela consultada pelo `rag-retriever.ts`. Total atual: **1.241 chunks**.

| Campo `lei` | Chunks | Cobertura real | Problema |
|---|---|---|---|
| `lc214` | 779 | Artigos narrativos — **Anexos I, V, VII, IX, XII, XV completamente ausentes** | G4 |
| `lc227` | 434 | Parcial | Label errado: `"LC 227/2024"` → correto: `"LC 227/2026"` — G2 |
| `lc224` | 28 | Parcial (96 registros completos em `regulatory_articles` não usados) | Label `"LC224"` sem espaço/ano — G1; `cnaeGroups` inconsistentes no Art. 4º — G6 |
| `ec132` | **0** | **Completamente ausente** | 384 registros em `regulatory_articles` não migrados — G3 |
| `lc116`, `lc87`, demais | 0 | Ausentes | — |

**Campos da tabela:** `id`, `lei`, `artigo`, `titulo`, `conteudo`, `topicos`, `cnaeGroups`, `chunkIndex`

---

### 2.2 Tabela `regulatory_articles` — corpus estruturado **não usado pelo RAG**

Existe no banco mas **não é consultada** pelo `rag-retriever.ts`. Contém texto completo e hierarquizado.

| `source_id` | Registros | Estrutura |
|---|---|---|
| LC214-2025 | 3.676 | artigo + parágrafo + inciso como registros separados |
| LC227-**2026** | 1.622 | idem — confirma: LC 227 é de **2026** |
| EC132-2023 | 384 | idem |
| LC224-2025 | 96 | idem |
| **Total** | **5.778** | — |

**Schema:** `article_id` (varchar 128), `source_id` (varchar 64), `article_number` (varchar 128), `hierarchy_level` (artigo/paragrafo/inciso), `parent_id` (varchar 128), `full_text` (mediumtext 16MB), `article_type`, `position_order`, `version`, `created_at`

> **Observação crítica:** LC 214 Art. 45 e LC 224 Art. 4º estão **completos e corretos** nesta tabela. O problema não é ausência de conteúdo — é que a tabela não é usada pelo RAG ativo.

---

### 2.3 Motor `rag-retriever.ts` — Arquitetura V65

Dois modos de operação:

```
retrieveArticlesFast (sem re-ranking) — usado nas Etapas 2 e 4:
  1. extractCnaeGroups(cnaes) → 2 primeiros dígitos de cada CNAE
  2. extractKeywords(query)   → remove 34 stopwords → top 15 kw → usa top 8
  3. fetchCandidates()        → LIKE multi-termo:
       OR(titulo LIKE '%kw%', topicos LIKE '%kw%', conteudo LIKE '%kw%') por keyword
       + OR(cnaeGroups LIKE '%GG%') por grupo CNAE
       → LIMIT 20 candidatos → retorna top-N sem re-ranking

retrieveArticles (com re-ranking LLM) — usado nas Etapas 3 e 5b:
  1-3. Idêntico ao Fast
  4. rerankWithLLM() → LLM T=0.0 seleciona top-5 via índices JSON
     Fallback: primeiros topK candidatos se LLM falhar
  5. formatContextText() → formata para injeção no prompt com label da lei
```

---

### 2.4 Bugs ativos no `formatContextText` (linha ~110)

```typescript
// ESTADO ATUAL — com bugs:
const leiLabel = {
  lc214: "LC 214/2025",
  ec132: "EC 132/2023",
  lc227: "LC 227/2024",   // ← ERRADO — deveria ser "LC 227/2026" (G2)
  lc116: "LC 116/2003",
  lc87:  "LC 87/1996",
}[a.lei] ?? a.lei.toUpperCase();
// lc224: sem entrada → fallback "LC224" (sem espaço, sem ano) — G1
// solaris: sem entrada → a implementar
// ia_gen:  sem entrada → a implementar
```

**Estado correto após G1 + G2:**

```typescript
const leiLabel = {
  lc214:   "LC 214/2025",
  ec132:   "EC 132/2023",
  lc227:   "LC 227/2026",   // ← corrigido
  lc224:   "LC 224/2026",   // ← adicionado
  lc116:   "LC 116/2003",
  lc87:    "LC 87/1996",
  solaris: "Equipe Jurídica SOLARIS",        // ← a implementar
  ia_gen:  "Análise de Perfil — IA SOLARIS", // ← a implementar
}[a.lei] ?? a.lei.toUpperCase();
```

---

### 2.5 Causa raiz dos riscos ausentes no UAT

**LC 214 Art. 45 — confissão de dívida (id=65 na `ragDocuments`):**
Artigo presente e completo com §4º ("apuração implica confissão de dívida") e §5º. O campo `topicos` contém: `"CBS, IBS, contribuinte, crédito tributário, creditamento, não cumulatividade"`. **Não contém** `"confissão de dívida"`, `"apuração"` nem `"dívida ativa"`. A busca LIKE falha quando o briefing não menciona explicitamente esses termos. O artigo existe e está correto — é **invisível para o recuperador** por indexação incompleta dos tópicos. **Gap G5.**

**LC 224 Art. 4º — redução de benefícios (ids 789–794):**
6 chunks presentes. `cnaeGroups` inconsistentes: alguns cobrem `01-96`, outros apenas `10-33` (indústria) ou `64-66` (financeiro). Empresa de comércio atacadista (CNAE 46xx) ou transporte (49xx) — exatamente o perfil do UAT com os advogados — pode não recuperar **nenhum chunk** do artigo mais relevante para ela na LC 224. **Vigência: 01/04/2026.** **Gap G6.**

**Anexos LC 214 — NCM e regimes especiais:**
Completamente ausentes do corpus ativo. Os Anexos I, V, VII, IX, XII e XV definem as alíquotas diferenciadas por NCM — são onde a lei se torna operacional para empresas que comercializam bens físicos. Sem eles, riscos de classificação fiscal (NCM/cClassTrib), Cesta Básica Nacional, medicamentos, dispositivos médicos e insumos agropecuários **nunca aparecem** no diagnóstico. O NCM é pré-requisito estruturante da LC 214 desde jan/2026. **Gap G4.**

**EC 132/2023 — emenda constitucional:**
Zero chunks. Não gera requisitos operacionais diretos (é arcabouço constitucional), mas é fundamento de citação jurídica. Sua ausência significa que nenhum diagnóstico cita a EC 132 como evidência — mesmo quando o argumento jurídico requer o fundamento constitucional. **Gap G3.**

---

## SEÇÃO 3 — QUESTIONÁRIOS

### 3.1 Estrutura Atual

| Questionário | Código | Perguntas | Obs | Total campos |
|---|---|---|---|---|
| Corporativo | QC-01 a QC-10 | 22 | 10 | 32 |
| Operacional | QO-01 a QO-10 | 20 | 10 | 30 |
| CNAE | QCNAE-01 a QCNAE-05 | 15 | 5 | 20 |
| **Total** | — | **57** | **25** | **82** |

### 3.2 Prefill Contract (v1.1 — auditado e estável)

12 campos com fluxo E2E íntegro. 410 testes automatizados passando. BUG-001 e OBS-002 corrigidos. Centralizado em `shared/questionario-prefill.ts` (builders canônicos: `buildCorporatePrefill`, `buildOperationalPrefill`, `buildCnaePrefill`). **Este bloco é estável e não deve ser tocado.**

### 3.3 Fonte das Perguntas — AS-IS

Todas as 57 perguntas são geradas pelo LLM na Etapa 2 a partir do CNAE e contexto RAG. Não há distinção de origem entre perguntas regulatórias, de conhecimento especializado ou combinatórias de perfil. O advogado não sabe por que uma pergunta existe nem qual lei a fundamenta.

### 3.4 Arquitetura TO-BE — 3 Ondas (não implementada)

| Onda | Origem | Natureza | Fonte (`lei`) |
|---|---|---|---|
| 1ª | Equipe jurídica SOLARIS | Perguntas base curadas — revisadas por advogado sênior | `solaris` |
| 2ª | IA Gen combinatória | Geradas **on-the-fly** a partir dos parâmetros do perfil inicial — dinâmicas | `ia_gen` |
| 3ª | RAG regulatório | Funcionamento atual via `generateQuestions` | `lc214`, `lc224`, etc. |

As perguntas da 2ª onda são **dinâmicas e não estáticas**. Combinações do perfil inicial ativam perguntas que não existiriam isoladamente.

**Exemplo de gatilho combinatório:**
`faz_exportacao=true` + `contrata_simples_nacional=true` + `regime=lucro_presumido`
→ Pergunta específica sobre creditamento CBS em cadeia exportadora com prestadores do Simples.

### 3.5 Problema de UI — QC-09

Seção "Fiscalização, contencioso e compliance" com labels de engenharia `[QC-09-P1]`, `[QC-09-P2]`, `[QC-09-P3]` e texto `[PLACEHOLDER QC-09]` visíveis ao usuário final. Público 100% brasileiro, contexto jurídico formal. **Gap G13.**

---

## SEÇÃO 4 — SCHEMAS ZOD

### 4.1 Schema de Riscos — `RiskItemSchema` (`server/ai-schemas.ts`)

| Campo | Tipo | Obrigatório | Default | Problema |
|---|---|---|---|---|
| `id` | string | ✅ | — | — |
| `evento` | string | ✅ | — | — |
| `causa_raiz` | string | ❌ | `''` | Risco sem causa raiz identificada |
| `evidencia_regulatoria` | string | ❌ | `'Reforma Tributária — EC 132/2023'` | Default genérico — sem rastreabilidade real | **G9** |
| `probabilidade` | enum Baixa/Média/Alta | ✅ | `.catch("Média")` | — |
| `impacto` | enum Baixo/Médio/Alto | ✅ | `.catch("Médio")` | — |
| `severidade` | enum Baixa/Média/Alta/Crítica | ✅ | `.catch("Média")` | — |
| `severidade_score` | number 1–9 | ✅ | `.catch(4)` | — |
| `plano_acao` | string | ❌ | `''` | Sem atomicidade forçada — **G10** |
| `fonte_risco` | — | **Ausente** | — | Sem distinção regulatório/solaris/ia_gen — **G11** |
| `area` | — | **Ausente** | — | Área só existe no schema de ação, não no de risco |

### 4.2 Schema de Ações — `TaskItemSchema` (`server/ai-schemas.ts`)

| Campo | Tipo | Obrigatório | Default | Problema |
|---|---|---|---|---|
| `id` | string | ✅ | — | — |
| `titulo` | string min 10 | ✅ | — | — |
| `descricao` | string min 30 | ✅ | fallback genérico LC 214/2025 | Min 30 chars aceita texto genérico |
| `area` | enum contabilidade/negocio/ti/juridico | ✅ | `.catch("juridico")` | Label "Contabilidade" → "Contabilidade e Fiscal" (apenas visual) — **G14** |
| `prazo_sugerido` | enum 30/60/90 dias | ✅ | `.catch("60 dias")` | Não personalizável por severidade |
| `prioridade` | enum Alta/Média/Baixa | ✅ | `.catch("Média")` | — |
| `responsavel_sugerido` | string min 5 | ✅ | `"Equipe Tributária"` | — |
| `objetivo_diagnostico` | string min 15 | ✅ | fallback genérico | — |
| `evidencia_regulatoria` | string min 5 | ✅ | `"LC 214/2025"` | — |
| `cnae_origem` | string | ❌ | `''` | — |
| `gap_especifico` | string | ❌ | `''` | — |
| `acao_concreta` | string | ❌ | `''` | **Causa principal dos planos não atômicos — G10** |
| `criterio_de_conclusao` | — | **Ausente** | — | Ação não verificável |

> **Problema central:** as 10 regras CRÍTICAS do prompt do `generateActionPlan` exigem atomicidade, mas o schema Zod não as reforça — `acao_concreta` é opcional. O LLM pode ignorar as regras sem que o schema rejeite o output.

---

## SEÇÃO 5 — PROMPTS

### 5.1 `generateBriefing`

**Persona:** "Consultor Sênior de Compliance Tributário com 15 anos de experiência."
**Contexto injetado:** respostas do questionário em texto livre + 7 artigos RAG via `retrieveArticles`.

**Gap G8:** `companyProfile` **não é injetado de forma estruturada** no prompt. O LLM não recebe:
- Regime tributário (Simples Nacional / Lucro Presumido / Lucro Real)
- Porte da empresa e faturamento estimado
- CNAEs confirmados com códigos exatos
- Operação interestadual (sim/não)
- Meios de pagamento utilizados
- Se faz exportação / contrata prestadores Simples Nacional

Esses dados existem no banco em `companyProfile`, `operationProfile`, `financialProfile` e `confirmedCnaes`. Simplesmente não chegam ao prompt. Resultado: briefings idênticos para empresas com perfis completamente diferentes.

### 5.2 `generateRiskMatrices`

**Persona:** "Auditor de Riscos Regulatórios especializado na Reforma Tributária brasileira (LC 214/2025)."
**RAG:** `retrieveArticlesFast` — 1 busca compartilhada para as 4 áreas, topK=7.
**Regras no prompt:** causa_raiz obrigatória, evidencia_regulatoria obrigatória, severidade_score numérico, entre 5 e 10 riscos por área, nunca inventar artigos.

**Gaps:**
- **G7:** mesmo contexto legislativo (7 artigos) injetado nas 4 áreas simultaneamente
- **G8:** perfil da empresa ausente do prompt
- Sem instrução de exclusividade mútua entre categorias → riscos duplicados

### 5.3 `generateActionPlan`

**Persona:** "Gestor Sênior de Compliance — LC 214/2025, LC 224/2025, LC 227/2025."
**RAG:** `retrieveArticlesFast` — 1 busca por área (nome da área + CNAEs + top 3 riscos), topK=10.
**10 regras CRÍTICAS** — ver Seção 1.2 (Etapa 5a).
**Gap G10:** schema Zod não reforça as regras do prompt — `acao_concreta` é opcional, `criterio_de_conclusao` não existe.

---

## SEÇÃO 6 — GAPS CRÍTICOS CONSOLIDADOS

| ID | Gap | Impacto no produto | Arquivo | Fix | Risco |
|---|---|---|---|---|---|
| **G1** | Label `lc224` ausente no `formatContextText` | LLM recebe "LC224" sem espaço e sem ano | `rag-retriever.ts` L110 | 1 linha de código | Zero |
| **G2** | Label `lc227` com ano errado ("LC 227/2024") | Cita "LC 227/2024" — correto é "LC 227/2026" | `rag-retriever.ts` L108 | 1 linha de código | Zero |
| **G3** | EC 132 com 0 chunks no corpus ativo | Nunca citada como evidência regulatória | `ragDocuments` | Migração de `regulatory_articles` | Baixo |
| **G4** | Anexos I, V, VII, IX, XII, XV da LC 214 ausentes | Riscos de NCM/cesta básica/medicamentos/insumos nunca aparecem | `ragDocuments` | Ingestão dos Anexos | Baixo |
| **G5** | LC 214 Art. 45 com `topicos` incompletos | Art. 45 não recuperado — riscos de confissão de dívida ausentes | `ragDocuments` id=65 | 1 UPDATE SQL | Zero |
| **G6** | LC 224 Art. 4º com `cnaeGroups` inconsistentes | Comércio e transporte não recuperam o Art. 4º — **vigência 01/04/2026** | `ragDocuments` ids 789–794 | 6 UPDATEs SQL | Zero |
| **G7** | 1 RAG compartilhado para 4 áreas na Etapa 4 | Riscos duplicados entre categorias | `routers-fluxo-v3.ts` L1032 | RAG por área + prompt com escopo exclusivo | Médio |
| **G8** | `companyProfile` não injetado no briefing e nas matrizes | Diagnóstico genérico, não personalizado pelo perfil real | `routers-fluxo-v3.ts` L908 e L1032 | Injeção estruturada do perfil no prompt | Médio |
| **G9** | `evidencia_regulatoria` opcional com default genérico | Riscos sem rastreabilidade regulatória real | `ai-schemas.ts` | Tornar obrigatório + remover default genérico | Médio |
| **G10** | `acao_concreta` opcional no schema | Planos não atômicos — 10 regras do prompt sem enforcement no schema | `ai-schemas.ts` | Tornar obrigatório + adicionar `criterio_de_conclusao` | Médio |
| **G11** | Campo `fonte_risco` ausente no schema de riscos | Sem distinção regulatório/solaris/ia_gen | `ai-schemas.ts` | Campo novo no schema | Médio |
| **G12** | Valores `solaris` e `ia_gen` ausentes no campo `lei` | Ingestão SOLARIS e perguntas ia_gen não suportadas | `ragDocuments` + `rag-retriever.ts` | Novos valores VARCHAR + 2 labels no `formatContextText` | Zero |
| **G13** | Placeholder QC-09 visível ao usuário | Labels de engenharia em contexto jurídico formal | Frontend QC-09 | Remover placeholder e labels | Zero |
| **G14** | Label "Contabilidade" → "Contabilidade e Fiscal" | Pedido formal dos advogados no UAT | Frontend | 1 linha visual | Zero |
| **G15** | 3 ondas de perguntas não implementadas | Perguntas sem rastreabilidade de fonte | Questionários + `generateQuestions` | Arquitetura TO-BE | Alto |
| **G16** | Upload CSV de requisitos SOLARIS não existe | Equipe jurídica não consegue atualizar o corpus | Admin UI | Nova funcionalidade administrativa | Médio |

---

## SEÇÃO 7 — ARQUITETURA DE FONTES — TO-BE IDENTIFICADO

### 7.1 Princípio Fundamental

**Sem mudança estrutural.** O campo `lei` da tabela `ragDocuments` é `VARCHAR` — aceita novos valores sem `ALTER TABLE`. A distinção de fonte é implementada via novos valores no campo existente e novos labels no `formatContextText` de `rag-retriever.ts`.

### 7.2 As Três Fontes

**Fonte `regulatorio` — já existe**
- Valores: `lc214`, `lc227`, `lc224`, `ec132`, `lc116`, `lc87`, `cgibs`, `rfb`, `confaz`
- Recuperação: busca LIKE em `topicos`, `titulo`, `conteudo` e `cnaeGroups`
- Exibição no prompt: "LC 214/2025 Art. X", "LC 224/2026 Art. X"

**Fonte `solaris` — a criar**
- Novo valor no campo `lei`: `'solaris'`
- Origem: CSV carregado pela equipe jurídica SOLARIS via interface administrativa
- Ingestão: script converte CSV → registros em `ragDocuments` com `lei='solaris'`
- Recuperação: mesmo mecanismo LIKE existente
- Exibição: `"Equipe Jurídica SOLARIS"`
- Gate: revisão pelo advogado sênior antes da publicação no corpus

**Fonte `ia_gen` — a criar**
- Novo valor `'ia_gen'` apenas no `formatContextText`
- Gerado on-the-fly na 2ª onda de perguntas — **não persistido em `ragDocuments`**
- Parâmetros do perfil inicial como gatilho combinatório
- Exibição: `"Análise de Perfil — IA SOLARIS"`

### 7.3 Schema do CSV SOLARIS

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `titulo` | string | ✅ | Título do requisito em linguagem jurídica |
| `conteudo` | texto | ✅ | Fundamentação completa |
| `topicos` | texto | ✅ | Palavras-chave para busca LIKE (separadas por vírgula) |
| `cnaeGroups` | texto | ✅ | Grupos CNAE aplicáveis (ex: "46,49" ou "01-96" para todos os setores) |
| `lei` | string fixo | ✅ | Sempre `"solaris"` |
| `artigo` | string | ✅ | Identificador interno (ex: "SOL-001") |
| `area` | enum | ✅ | contabilidade_fiscal / negocio / ti / juridico |
| `severidade_base` | enum | ✅ | baixa / media / alta / critica |
| `vigencia_inicio` | date | ❌ | Quando o requisito passa a valer (opcional) |

### 7.4 Estratégia de Ingestão dos Anexos da LC 214

| Anexo | Conteúdo | Estratégia recomendada | Justificativa |
|---|---|---|---|
| I, V, VII | Listas de NCMs com tratamento diferenciado | **Chunk por grupo de produto** | Alta granularidade para busca LIKE por NCM específico |
| IX, XII, XV | Narrativos (insumos agropecuários, imóveis, financeiro) | **Chunk por Anexo completo** | Contexto narrativo funciona melhor como bloco |

---

## SEÇÃO 8 — INVARIANTS DO SISTEMA

| ID | Invariant | Testes | Status | Impacto de mudança |
|---|---|---|---|---|
| INV-001 | `campo_coletado → nunca_vazio` (Prefill) | `prefill-contract.test.ts` BLOCO 5 — 17 testes | ✅ Coberto | Mudança nos builders viola invariant |
| INV-002 | `api → nunca_string_json` | `prefill-contract.test.ts` BLOCO 2 — 8 testes | ✅ Coberto | Campo JSON novo = linha nova em `normalizeProject()` |
| INV-003 | `builder → fonte_única` (sem lógica local) | `prefill-contract.test.ts` BLOCOS 3, 9 | ✅ Coberto | Perguntas da 1ª onda não podem ter prefill local |
| INV-004 | `campo_sem_fonte → undefined` (não string vazia) | `prefill-contract.test.ts` BLOCOS 4, 6 | ✅ Coberto | Campos novos sem fonte devem retornar `undefined` |
| INV-005 | `pergunta_sem_fonte → inválida` | Revisão manual | ✅ Documentado | Toda pergunta nova precisa de fonte identificada |
| INV-006 | `risco_sem_origem → inválido` | ⚠️ **Testes não implementados** | ⚠️ Risco | G11 (`fonte_risco`) deve respeitar este invariant |
| INV-007 | `acao_sem_evidence → inválida` | ⚠️ **Testes não implementados** | ⚠️ Risco | G10 (`acao_concreta` obrigatório) deve respeitar |
| INV-008 | `briefing_sem_coverage → inválido` | ⚠️ **Testes não implementados** | ⚠️ Risco | G8 (injeção de perfil) não pode quebrar cobertura das 3 camadas |

> **Atenção:** INV-006, INV-007 e INV-008 estão documentados como invariants mas **sem cobertura automatizada**. Qualquer sprint que toque nos schemas Zod (G9, G10, G11) ou nos prompts (G7, G8) deve implementar os testes correspondentes antes do merge — ou o invariant existe apenas no papel.

---

## SEÇÃO 9 — TABELA DE PRIORIDADES ESTRATÉGICAS

Sequência aprovada pelo P.O. — do mais crítico para o mais simples:

| Ordem | Gap | O que é | Por que agora | Esforço | Risco |
|---|---|---|---|---|---|
| **1** | G5 | Corrigir `topicos` do LC 214 Art. 45 | Risco de confissão de dívida vigente desde jan/2026 — não aparece no diagnóstico | 1 UPDATE SQL | Zero |
| **2** | G6 | Corrigir `cnaeGroups` dos 6 chunks LC 224 Art. 4º | **Vigência 01/04/2026** — empresas de comércio e transporte não recebem o risco mais urgente | 6 UPDATEs SQL | Zero |
| **3** | G1 + G2 | Corrigir labels `lc224` e `lc227` no `formatContextText` | Toda geração de diagnóstico cita leis com referência malformada ou ano errado | 2 linhas de código | Zero |
| **4** | G8 | Injetar `companyProfile` estruturado no prompt do briefing | Briefing genérico é o problema de maior visibilidade para o advogado | Ajuste de prompt | Médio |
| **5** | G7 | RAG separado por área na Etapa 4 + escopo exclusivo no prompt | Riscos duplicados entre categorias — segundo maior problema no UAT | Ajuste de prompt + RAG | Médio |
| **6** | G9 + G10 | Tornar `evidencia_regulatoria` e `acao_concreta` obrigatórios no schema Zod | Sem isso, ajustes de prompt (ordens 4 e 5) podem ser ignorados pelo LLM | Schema + prompt | Médio |
| **7** | G4 | Ingerir Anexos I, V, VII, IX, XII, XV da LC 214 | Riscos de NCM, cesta básica, medicamentos — ausentes do corpus | Script de ingestão | Baixo |
| **8** | G3 | Migrar EC 132 de `regulatory_articles` → `ragDocuments` | Fundamento constitucional ausente das evidências regulatórias | Script de ingestão | Baixo |
| **9** | G12 + G16 | Valores `solaris`/`ia_gen` + upload CSV SOLARIS | Habilita a equipe jurídica a manter o corpus vivo | Nova funcionalidade admin | Médio |
| **10** | G11 + G15 | Campo `fonte_risco` + arquitetura das 3 ondas | Rastreabilidade completa de origem dos riscos e perguntas | Arquitetura | Alto |
| **11** | G13 | Remover placeholder QC-09 e labels de engenharia | Credibilidade da UI com o advogado | Frontend | Zero |
| **12** | G14 | Label "Contabilidade" → "Contabilidade e Fiscal" | Pedido dos advogados — cosmético | 1 linha frontend | Zero |

---

## SEÇÃO 10 — DECISÕES PENDENTES DO P.O.

### DEC-001 — Sequência de prioridades
✅ **Aprovada** — ver Seção 9.

### DEC-002 — Schema do CSV SOLARIS
Campos definidos na Seção 7.3. **Confirmar** se campos adicionais são necessários (`autor`, `revisado_por`, `data_revisao`) antes do Manus implementar o upload.

### DEC-003 — Estratégia de ingestão dos Anexos da LC 214
Recomendação técnica: Opção A para Anexos I, V, VII e Opção B para Anexos IX, XII, XV. **Confirmar** antes da Sprint C.

### DEC-004 — Gate de revisão do CSV SOLARIS
Definir fluxo: upload → validação automática de schema → aprovação manual pelo advogado sênior → publicação no RAG? Ou publicação direta com log de auditoria?

---

## SEÇÃO 11 — ESTADO DO REPOSITÓRIO

| Item | Estado |
|---|---|
| Testes automatizados | 410/410 ✅ |
| Branch protection | Ativa — ruleset `main-protection` ID 14328406 |
| Checks obrigatórios | Validate PR body / Guard critical / Migration discipline / Governance gate |
| `DIAGNOSTIC_READ_MODE` | `shadow` — **NÃO ativar `new` sem aprovação formal do UAT** |
| Migrations | 54 aplicadas |
| Cockpit P.O. | `docs/painel-po/index.html` — v1.0 |
| Handoff Manus | `docs/HANDOFF-MANUS.md` — PR #103 mergeado |
| INV-006, INV-007, INV-008 | ⚠️ Sem testes automatizados — débito técnico em issue #101 |

**Bloqueios ativos — não executar sem aprovação explícita do P.O.:**
- NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- NÃO executar F-04 Fase 3
- NÃO executar DROP COLUMN em colunas legadas

---

## Rodapé

| Campo | Valor |
|---|---|
| **Versão** | AS-IS v1.1 — Final e Fechada |
| **Data de fechamento** | 2026-03-26 |
| **Autores** | Orquestrador (Claude — Anthropic) + Manus (verificação técnica) |
| **Divergências pendentes** | Nenhuma — D1 (ano LC 227) resolvida: **LC 227/2026** ✅ |
| **Repositório** | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| **Produção** | https://iasolaris.manus.space |
| **Próxima ação** | Sprint A — ordens 1, 2 e 3 da tabela de prioridades |
