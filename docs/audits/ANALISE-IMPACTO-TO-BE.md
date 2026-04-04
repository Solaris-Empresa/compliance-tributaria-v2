# Análise de Impacto — TO-BE IA SOLARIS

**Data:** 2026-04-02 | **HEAD:** `e5c16a4` | **Analista:** Manus AI  
**Escopo:** Implementação do Pipeline das 3 Ondas (Onda 3 — Engine RAG com NCM/Anexos)

---

## Resumo executivo

A implementação do TO-BE (Onda 3 com engine RAG + NCM/Anexos) é **tecnicamente viável**, mas apresenta **riscos médios-altos** em três camadas críticas: banco de dados (8.810 projetos legados sem NCM), corpus RAG (2.454 chunks sem embeddings vetoriais), e backend (2.473 linhas em `routers-fluxo-v3.ts` com risco de regressão nas Ondas 1 e 2).

**Maior risco:** Reprocessamento de embeddings de 2.454 chunks RAG após adicionar Anexos I–XI (estimativa: +3.000–5.000 chunks novos). O retriever atual não tem threshold de relevância configurado, o que pode degradar a qualidade das consultas.

**Maior benefício:** Diagnóstico por produto (NCM) em vez de CNAE genérico — diferencial competitivo real da IA SOLARIS. A arquitetura de três fontes de gap (`solaris` + `iagen` + `rag`) está pronta; o que falta é conteúdo normativo granular e o engine de mapeamento NCM → Anexo → Regime.

**Sequência recomendada:** Corpus primeiro (sem impacto em produção) → Schema/NCM (migration reversível) → Engine isolado (testes Q5) → Integração com feature flag.

---

## Impacto por camada

### Banco de dados

**Tabelas afetadas:** `projects`, `ragDocuments`, `project_gaps_v3`

| Tabela | Operação | Risco | Evidência |
|--------|----------|-------|-----------|
| `projects` | ADD COLUMN `principaisProdutos` JSON | **MÉDIO** | 8.810 projetos existentes ficarão com `NULL` — precisa backfill manual ou aceitar dados legados vazios |
| `ragDocuments` | ADD COLUMN `ncm` VARCHAR(20) | **BAIXO** | 2.454 chunks existentes ficarão com `NULL` — aceitável (apenas chunks novos dos Anexos terão NCM) |
| `ragDocuments` | ADD COLUMN `embedding` VECTOR(1536) | **ALTO** | Reprocessamento de 2.454 chunks + 3.000–5.000 novos (Anexos) = ~5.500–7.500 embeddings. Custo estimado: $0.50–$1.00 (OpenAI text-embedding-3-small) |
| `project_gaps_v3` | Nenhuma alteração | **ZERO** | Schema já suporta `source='rag'` desde Sprint D |

**Migrations necessárias:**

```sql
-- Migration 1: adicionar campo NCM ao perfil da empresa
ALTER TABLE projects 
  ADD COLUMN principaisProdutos JSON DEFAULT NULL
  COMMENT 'Array de {ncm, descricao, percentualReceita} — produtos principais da empresa';

-- Migration 2: adicionar coluna NCM e embedding ao corpus RAG
ALTER TABLE ragDocuments 
  ADD COLUMN ncm VARCHAR(20) DEFAULT NULL COMMENT 'NCM do produto (ex: 0101.21.00)',
  ADD COLUMN embedding VECTOR(1536) DEFAULT NULL COMMENT 'Embedding vetorial do chunk para busca semântica';

-- Migration 3: índice para busca por NCM
CREATE INDEX idx_rag_ncm ON ragDocuments(ncm);
```

**Risco de rollback:** BAIXO — todas as migrations são `ADD COLUMN` (reversíveis com `DROP COLUMN`). Não há `ALTER COLUMN` ou `DROP TABLE`.

**Evidências coletadas:**

```
PROJETOS_SEM_NCM: 8810 (100% dos projetos não têm principaisProdutos)
TOTAIS: {"total_projects":8810,"total_rag":2454}
CHUNKS_SEM_ANCHOR_ID: 0 (todos têm anchor_id — deduplicação OK)
```

---

### RAG / Corpus

**Estado atual:** 2.454 chunks em 10 leis, **sem embeddings vetoriais** (coluna `embedding` não existe na tabela). O retriever atual usa busca por palavra-chave (LIKE/REGEXP) em vez de busca semântica.

**Impacto da adição dos Anexos I–XI:**

| Item | Antes | Depois (estimado) | Delta |
|------|-------|-------------------|-------|
| Chunks totais | 2.454 | ~5.500–7.500 | +3.000–5.000 (Anexos I–XI) |
| Leis cobertas | 10 | 10 (mesma LC 214) | 0 |
| Chunks com NCM explícito | 1.014 | ~4.500–6.000 | +3.500–5.000 (Anexos tabulados) |

**Reprocessamento de embeddings:**

- **Necessário:** SIM — o retriever precisa de embeddings para fazer busca semântica eficiente por NCM.
- **Custo estimado:** $0.50–$1.00 (OpenAI `text-embedding-3-small` a $0.00002/1K tokens, ~5.500 chunks × 200 tokens/chunk = 1.1M tokens).
- **Tempo estimado:** ~10–15 minutos (rate limit de 1M tokens/min no tier padrão).
- **Risco de degradação:** MÉDIO — se o threshold de relevância não for configurado, chunks dos Anexos podem poluir resultados de consultas não relacionadas a NCM.

**Evidências coletadas:**

```
COLUNAS_RAG: id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex, 
             createdAt, anchor_id, autor, revisado_por, data_revisao
             (embedding NÃO EXISTE — precisa ser criado)
```

**Threshold de relevância no retriever:**

```typescript
// server/rag-retriever.ts (linhas 27, 64, 217)
relevanceScore?: number;  // Existe no tipo, mas não é usado para filtrar
```

**Mitigação:** Adicionar `WHERE relevanceScore >= 0.7` no retriever após implementar embeddings.

---

### Backend

**Arquivos afetados:**

| Arquivo | Linhas | Impacto | Risco de regressão |
|---------|--------|---------|-------------------|
| `server/routers-fluxo-v3.ts` | 2.473 | **ALTO** — adicionar engine Onda 3 (`completeOnda3`) | MÉDIO-ALTO — risco de quebrar Ondas 1 e 2 |
| `server/rag-retriever.ts` | ~250 | **MÉDIO** — adicionar filtro por NCM e threshold de relevância | BAIXO — função isolada |
| `server/lib/iagen-gap-analyzer.ts` | ~150 | **BAIXO** — ler `principaisProdutos` do perfil | BAIXO — já lê `operationProfile` |
| `server/lib/solaris-gap-analyzer.ts` | N/A | **ZERO** — arquivo não existe | N/A |
| `server/routers/riskEngine.ts` | ~500 | **ZERO** — já suporta `source='rag'` | ZERO |
| `server/routers/briefingEngine.ts` | ~800 | **ZERO** — já lê gaps com `source` | ZERO |
| `server/routers/scoringEngine.ts` | ~350 | **ZERO** — já calcula score de gaps independente da fonte | ZERO |

**Testes que podem quebrar:**

```
Testes de integração que testam operationProfile: 0 arquivos encontrados
```

**Risco:** MÉDIO — não há testes de integração cobrindo o `operationProfile`. Qualquer alteração no parse do perfil pode quebrar silenciosamente.

**Evidências coletadas:**

```
=== operationProfile — onde é lido no backend ===
server/routers-fluxo-v3.ts:71:      operationProfile: z.object({...})
server/routers-fluxo-v3.ts:145:      const companyContext = (projectAny.companyProfile || projectAny.operationProfile) ? {...}
server/consistencyEngine.ts:158:    if (input.operationProfile?.multiState) {...}
server/diagnostic-consolidator.ts:338:  if (operationProfile) {...}
```

**Parse rígido do operationProfile nos analyzers:** NÃO ENCONTRADO — os analyzers (`iagen-gap-analyzer.ts`, `solaris-gap-analyzer.ts`) não fazem parse direto do `operationProfile`. O risco R1 (regressão por parse rígido) é **BAIXO**.

---

### Frontend

**Telas afetadas:**

| Tela | Arquivo | Impacto | Esforço estimado |
|------|---------|---------|------------------|
| Cadastro de Perfil | `NovoProjeto.tsx` | **MÉDIO** — adicionar campo "Principais Produtos" com NCM autocomplete | 4–6 horas |
| Questionário Operacional | `QuestionarioOperacional.tsx` | **BAIXO** — adicionar pergunta sobre NCM dos produtos | 2–3 horas |
| Matriz de Gaps | `compliance-v3/BriefingEngineView.tsx` | **BAIXO** — exibir badge de `source='rag'` nos gaps | 1–2 horas |
| Briefing | `compliance-v3/BriefingEngineView.tsx` | **ZERO** — já exibe gaps independente da fonte | 0 horas |
| Score CPIE | `compliance-v3/ScoreView.tsx` | **ZERO** — já calcula score de gaps independente da fonte | 0 horas |

**UX do advogado:**

- **Novo campo:** "Principais Produtos" no cadastro de perfil — input de NCM com autocomplete (API IBGE ou tabela local).
- **Nova pergunta:** "Quais são os 3 principais produtos/serviços da empresa (NCM)?" no Questionário Operacional.
- **Novo badge:** `[RAG]` nos gaps gerados pela Onda 3 (similar aos badges `[SOLARIS]` e `[IAGEN]` existentes).

**Evidências coletadas:**

```
=== Telas de cadastro/edição do perfil ===
client/src/pages/NovoProjeto.tsx
client/src/pages/QuestionarioOperacional.tsx

=== Onde CNAE é coletado na UI ===
client/src/pages/QuestionarioCNAE.tsx (existe — pode ser reutilizado como referência)
```

---

## Matriz de riscos

| ID | Risco | Evidência | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|---|
| **R1** | Regressão Ondas 1+2 por parse rígido do `operationProfile` | `grep "JSON.parse\|operationProfile\."` → 0 ocorrências nos analyzers | **BAIXA** | ALTO | Adicionar testes de integração cobrindo `operationProfile` antes de implementar Onda 3 |
| **R2** | Reprocessamento de embeddings (2.454 + 3.000–5.000 chunks) | `COLUNAS_RAG: ... (embedding NÃO EXISTE)` | **ALTA** | MÉDIO | Implementar em batch com retry + checkpoint a cada 500 chunks |
| **R3** | Migration TiDB em produção (8.810 projetos) | `TOTAIS: {"total_projects":8810}` | **MÉDIA** | MÉDIO | Testar migration em clone do banco antes de aplicar em produção |
| **R4** | Dados legados sem NCM (8.810 projetos) | `PROJETOS_SEM_NCM: 8810` | **ALTA** | BAIXO | Aceitar `NULL` em projetos legados — apenas novos projetos terão NCM |
| **R5** | Corpus degradado (chunks dos Anexos poluem consultas não relacionadas) | `relevanceScore?: number;` (existe mas não é usado para filtrar) | **MÉDIA** | MÉDIO | Adicionar `WHERE relevanceScore >= 0.7` no retriever |
| **R6** | Latência Onda 3 (consulta NCM → RAG → Anexo) | `timeoutMs: 25000` (timeout de 25s em `extractCnaes`) | **BAIXA** | BAIXO | Timeout já configurado — monitorar latência p95 após deploy |

---

## Sequência de implementação recomendada

### Fase 1 — Corpus (sem impacto em produção)

**Objetivo:** Adicionar Anexos I–XI ao corpus RAG sem alterar código ou banco.

1. **Obter Anexos I–XI tabulados** — solicitar ao Dr. Rodrigues ou extrair manualmente da LC 214/2025.
2. **Processar Anexos** — usar script `ingest-anexos-lc214-2025.mjs` (já existe em `scripts/`) para gerar JSON de entrada.
3. **Ingestão dry-run** — validar chunking e anchor_id antes de inserir no banco.
4. **Ingestão real** — inserir ~3.000–5.000 chunks no `ragDocuments` (sem embeddings ainda).

**Risco:** ZERO — não afeta produção (corpus RAG não é usado pela Onda 3 ainda).

---

### Fase 2 — Schema e campo NCM (migration)

**Objetivo:** Adicionar colunas `principaisProdutos`, `ncm` e `embedding` ao banco.

1. **Migration 1** — `ALTER TABLE projects ADD COLUMN principaisProdutos JSON`.
2. **Migration 2** — `ALTER TABLE ragDocuments ADD COLUMN ncm VARCHAR(20), ADD COLUMN embedding VECTOR(1536)`.
3. **Migration 3** — `CREATE INDEX idx_rag_ncm ON ragDocuments(ncm)`.
4. **Testar rollback** — validar que `DROP COLUMN` funciona em clone do banco.
5. **Aplicar em produção** — executar migrations no TiDB Cloud (downtime estimado: <1 minuto).

**Risco:** MÉDIO — 8.810 projetos ficarão com `principaisProdutos = NULL`. Aceitar dados legados vazios ou fazer backfill manual.

---

### Fase 3 — Engine Onda 3 (novo código)

**Objetivo:** Implementar engine de mapeamento NCM → Anexo → Regime → gap isolado do fluxo principal.

1. **Criar `server/lib/rag-gap-engine.ts`** — função `analyzeRagGaps(projectId, clientId)` que:
   - Lê `principaisProdutos` do perfil da empresa.
   - Para cada NCM, consulta o RAG retriever com filtro `WHERE ncm = ?`.
   - Mapeia Anexo → Regime → Alíquota.
   - Gera gaps com `source='rag'` e insere em `project_gaps_v3`.
2. **Adicionar threshold de relevância** — `WHERE relevanceScore >= 0.7` no `rag-retriever.ts`.
3. **Gerar embeddings** — processar 2.454 + 3.000–5.000 chunks em batch (checkpoint a cada 500).
4. **Testes Q5** — criar `server/integration/onda3-rag-engine.test.ts` cobrindo:
   - Projeto com NCM válido → gaps `source='rag'` gerados.
   - Projeto sem NCM → nenhum gap `source='rag'`.
   - NCM não encontrado no corpus → nenhum gap `source='rag'`.

**Risco:** BAIXO — engine isolado, sem integração com Ondas 1 e 2.

---

### Fase 4 — Integração e testes

**Objetivo:** Integrar engine Onda 3 ao fluxo principal com feature flag.

1. **Adicionar `completeOnda3` ao `routers-fluxo-v3.ts`** — chamar `analyzeRagGaps` após `approveActionPlan`.
2. **Feature flag** — `FEATURE_FLAGS.g18_onda3_rag_engine = false` (desabilitado por padrão).
3. **Testes E2E** — criar projeto novo, completar Ondas 1 e 2, ativar flag, executar Onda 3, verificar gaps `source='rag'`.
4. **Rollout gradual** — ativar flag para 10% dos projetos novos, monitorar latência p95 e taxa de erro.
5. **Rollout completo** — ativar flag para 100% após 7 dias sem incidentes.

**Risco:** MÉDIO — integração com fluxo principal pode causar regressão nas Ondas 1 e 2. Mitigação: feature flag + rollout gradual.

---

## O que NÃO pode ser feito sem aprovação do P.O.

1. **Executar migrations em produção** — `ALTER TABLE` em 8.810 projetos requer aprovação explícita.
2. **Reprocessar embeddings de 2.454 chunks** — custo de $0.50–$1.00 (OpenAI) + 10–15 minutos de processamento.
3. **Ativar feature flag `g18_onda3_rag_engine` em produção** — pode impactar latência e taxa de erro.
4. **Fazer backfill de `principaisProdutos` em projetos legados** — operação de dados em 8.810 registros.

---

## Dependências externas bloqueantes

1. **Anexos I–XI da LC 214/2025 tabulados** — fornecedor: Dr. José Rodrigues ou extração manual.
   - Formato esperado: JSON com `{ anexo, ncm, descricao, regime, aliquota, referencia_legal }`.
   - Prazo estimado: 3–5 dias úteis.

2. **LC 87/1996 compilada** — fornecedor: Planalto (inacessível pela rede do servidor, precisa ser enviada manualmente).
   - Formato esperado: PDF com todas as alterações até 2025.
   - Prazo estimado: 1–2 dias úteis.

3. **IN 2.121/2022 (PIS/COFINS)** — fornecedor: Receita Federal.
   - Formato esperado: PDF oficial.
   - Prazo estimado: 1 dia útil.

4. **Script de ingestão de Anexos** — **JÁ EXISTE** em `scripts/ingest-anexos-lc214-2025.mjs`.
   - Parser de PDF/tabelas: `pdfkit`, `jspdf`, `jspdf-autotable` (já instalados no `package.json`).

5. **APIs externas impactadas:** NENHUMA — o sistema não depende de APIs externas para o corpus RAG.

---

**Fim do relatório.**
