# RAG Quality Gate — Governança Obrigatória de Corpus / Embeddings / Chunks

> **Audiência:** P.O. · Orquestrador · Implementador  
> **Versão:** v1.1 — 2026-04-04  
> **Status:** 🔴 OBRIGATÓRIO — todo PR de RAG passa por este gate antes do merge  
> **Princípio:** *PR que mexe em chunk não é aprovado por volume. É aprovado por recuperação.*

---

## 1. Escopo de aplicação

Todo PR que altere **qualquer** um dos itens abaixo entra automaticamente no gate:

| Escopo | Exemplos de arquivos |
|---|---|
| `ragDocuments` | schema, migrations, seed |
| Scripts de ingestão | `scripts/ingest-*.ts`, `scripts/chunk-*.ts` |
| Chunking | lógica de segmentação, tamanho de chunk, overlap |
| Embeddings | modelo, dimensão, batch size, normalização |
| `ragAdmin` | rotas de administração do corpus |
| Retrieval | `server/rag-retriever.ts`, re-ranking, keywords |
| Corpus RFC | qualquer RFC com label `rag:rfc` |
| Leis e anexos | LC 214, LC 224, EC 132, LC 227, LC 123, LC 87, LC 116, CG-IBS, RFB-CBS, Conv. ICMS |
| `anchor_id` | qualquer alteração de mapeamento ou geração |

**Regra de detecção automática:** o workflow `.github/workflows/rag-quality-gate.yml` detecta esses caminhos via `paths` filter e bloqueia o merge se o checklist não estiver preenchido.

---

## 2. Os 4 Gates de Qualidade

### Gate RAG-Q1 — Estrutural

Verifica a integridade física do corpus após a mudança.

| Critério | Limite | Bloqueante |
|---|---|---|
| Chunks com `anchor_id` | 100% | ✅ Sim |
| Chunks vazios (`text = ''`) | 0 | ✅ Sim |
| Chunks com `lei` incorreta | 0 | ✅ Sim |
| Duplicatas críticas (hash idêntico) | 0 | ✅ Sim |
| Chunks muito curtos (< 50 tokens) | ≤ 1% | ⚠️ Aviso |
| Chunks muito longos (> 1.500 tokens) | ≤ 2% | ⚠️ Aviso |

**Query SQL de referência:**

```sql
-- Integridade estrutural
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE anchor_id IS NULL OR anchor_id = '') AS sem_anchor_id,
  COUNT(*) FILTER (WHERE text IS NULL OR text = '') AS vazios,
  COUNT(*) FILTER (WHERE lei IS NULL) AS sem_lei,
  COUNT(*) FILTER (WHERE char_length(text) < 200) AS muito_curtos,
  COUNT(*) FILTER (WHERE char_length(text) > 6000) AS muito_longos
FROM rag_documents;

-- Duplicatas por hash de texto
SELECT md5(text) AS hash, COUNT(*) AS cnt
FROM rag_documents
GROUP BY hash
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
```

---

### Gate RAG-Q2 — Recuperação (Gold Set)

Verifica que o comportamento de recuperação não regrediu.

| Critério | Meta | Bloqueante |
|---|---|---|
| Recall top-5 no gold set | ≥ 90% | ✅ Sim (se crítico) |
| Recall top-10 nas queries críticas | 100% | ✅ Sim |
| Estabilidade pós-ingestão (reprocessamento idêntico) | sem regressão | ✅ Sim |
| Cobertura semântica (queries conceituais) | ≥ 80% | ⚠️ Aviso |

**Gold set mínimo (queries críticas obrigatórias):**

```
1. "crédito presumido no novo IBS"
2. "recolhimento por split payment"
3. "tratamento do Simples na transição"
4. "alíquota CBS sobre serviços financeiros"
5. "prazo de transição IBS LC 214"
6. "regime de caixa no Simples Nacional"
7. "benefício fiscal estadual na EC 132"
8. "não cumulatividade plena IBS"
```

**Formato do relatório de retrieval (por query):**

| Campo | Descrição |
|---|---|
| `query` | Texto da query |
| `chunk_esperado` | `anchor_id` do chunk correto |
| `posicao_recuperada` | 1–10 ou "não recuperado" |
| `score` | Similaridade coseno (0–1) |
| `lei` | LC 214 / LC 224 / etc. |
| `anchor_id` | Confirmação do chunk retornado |

---

### Gate RAG-Q3 — Visibilidade (Chunks Invisíveis)

Identifica chunks que existem no banco mas nunca entram em recuperação útil.

**Definição operacional de chunk invisível:**

Um chunk é considerado invisível se:
- Nunca aparece no top-k das queries do gold set
- Não aparece nas queries derivadas da mesma lei/tema
- Tem embedding válido, mas zero uso prático
- É sempre derrotado por chunks redundantes

| Critério | Limite | Bloqueante |
|---|---|---|
| Chunks invisíveis críticos | 0 | ✅ Sim |
| Chunks invisíveis não críticos | ≤ 5% do total | ⚠️ Aviso |
| Relatório de invisibilidade anexado | obrigatório | ✅ Sim |

**Sinais típicos de invisibilidade (para diagnóstico):**

- Chunk grande demais e genérico (> 1.200 tokens sem foco temático)
- Chunk pequeno demais sem contexto (< 80 tokens)
- Título/metadata fracos ou ausentes
- `anchor_id` correto, mas texto com ruído (OCR, formatação)
- Chunk duplicado canibalizando o original
- Anexo com segmentação ruim (tabelas partidas, listas fragmentadas)
- Embedding gerado sobre texto com ruído tipográfico

**Formato do relatório de invisibilidade:**

```
Chunks nunca recuperados: N
Chunks recuperados apenas 1 vez: N
Chunks críticos nunca recuperados: N (BLOQUEANTE se > 0)
```

---

### Gate RAG-Q4 — Explicabilidade

O PR deve ser autoexplicativo sobre o impacto semântico da mudança.

| Item obrigatório | Formato |
|---|---|
| Queries usadas no teste | lista |
| Chunks esperados por query | `anchor_id` |
| Chunks efetivamente recuperados | `anchor_id` + posição |
| Divergências encontradas | tabela comparativa |
| Conclusão | "sem regressão" ou "com regressão — justificativa" |

---

## 3. Evidências mínimas obrigatórias no PR body

Todo PR de escopo RAG deve incluir o seguinte bloco no corpo:

```markdown
## Gate RAG — Evidências de Qualidade

- [ ] Executei o gold set (RAG-Q2)
- [ ] Não houve regressão no recall crítico
- [ ] Verifiquei chunks invisíveis (RAG-Q3)
- [ ] Verifiquei duplicatas (RAG-Q1)
- [ ] Verifiquei `anchor_id` 100% (RAG-Q1)
- [ ] Anexei evidências neste PR

### Resultado

| Métrica | Valor |
|---|---|
| Chunks afetados | |
| Recall top-5 | |
| Recall top-10 | |
| Invisíveis críticos | |
| Duplicatas críticas | |
| Chunks sem anchor_id | |
| Conclusão | sem regressão / com regressão |
```

---

## 4. Regra de bloqueio

O PR **DEVE ser bloqueado** (não pode ser mergeado) se qualquer um dos itens abaixo for verdadeiro:

| Condição de bloqueio | Gate | Ação |
|---|---|---|
| Regressão no gold set crítico | RAG-Q2 | Bloquear — corrigir antes do merge |
| Chunks críticos invisíveis > 0 | RAG-Q3 | Bloquear — re-chunkar ou re-indexar |
| Duplicata crítica detectada | RAG-Q1 | Bloquear — deduplicar antes do merge |
| Chunk sem `anchor_id` | RAG-Q1 | Bloquear — corrigir mapeamento |
| Relatório de invisibilidade ausente | RAG-Q3 | Bloquear — anexar relatório |
| Gold set não executado | RAG-Q2 | Bloquear — executar e anexar |

---

## 5. Artefato de evidência padronizado

Cada PR de RAG deve criar o arquivo:

```
artifacts/rag-quality/<pr-number>/report.md
```

**Template do report.md:**

```markdown
# RAG Quality Report — PR #<número>

Data: YYYY-MM-DD
Autor: <nome>
Sprint: <sprint>
Corpus antes: <N> chunks
Corpus depois: <N> chunks

## RAG-Q1 — Estrutural
- Total chunks: N
- Sem anchor_id: 0
- Vazios: 0
- Duplicatas críticas: 0
- Status: ✅ PASSOU / ❌ BLOQUEADO

## RAG-Q2 — Recuperação
| Query | Chunk esperado | Posição | Score | Status |
|---|---|---|---|---|
| ... | ... | ... | ... | ✅/❌ |

Recall top-5: X%
Recall top-10: X%
Status: ✅ PASSOU / ❌ BLOQUEADO

## RAG-Q3 — Visibilidade
- Invisíveis críticos: 0
- Invisíveis não críticos: N (X%)
- Status: ✅ PASSOU / ❌ BLOQUEADO

## RAG-Q4 — Explicabilidade
Divergências: <nenhuma / lista>
Conclusão: sem regressão / com regressão

## Veredicto final
✅ APROVADO PARA MERGE / ❌ BLOQUEADO — <motivo>
```

---

## 6. Critérios de avaliação de embeddings

> Você não mede embedding "olhando o vetor". Você mede pelo **comportamento de recuperação**.

### A. Recall no gold set

Para um conjunto de queries de referência, o sistema deve recuperar os chunks esperados no top-k:
- top-5 contém o chunk correto em **≥ 90%** das queries
- top-10 contém o chunk correto em **100%** das queries críticas

### B. Similaridade intra-lei e intra-artigo

Chunks do mesmo artigo/tema devem ficar semanticamente próximos; chunks de temas diferentes não devem colapsar.

**Sinais ruins:**
- Artigos diferentes com embeddings quase idênticos (distância coseno < 0,05)
- Chunks de anexos muito diversos com distância quase zero

### C. Estabilidade pós-ingestão

Se o corpus for reprocessado sem alterar o texto, o comportamento de recuperação não pode piorar. Qualquer regressão indica instabilidade no pipeline de embedding.

### D. Cobertura semântica

Queries conceituais devem recuperar chunks corretos mesmo sem citar artigo explicitamente. Exemplos:
- "crédito presumido no novo IBS" → deve recuperar art. 28–35 da LC 214
- "recolhimento por split payment" → deve recuperar art. 47–52 da LC 214
- "tratamento do Simples na transição" → deve recuperar LC 123 + LC 214 arts. de transição

### E. Taxa de chunk morto

Se muitos chunks nunca aparecem em busca controlada, ou estão mal chunkados, ou mal rotulados, ou o embedding está ruim. Meta: taxa de chunks mortos ≤ 5% do corpus total.

---

## 7. Referências cruzadas

| Documento | Localização |
|---|---|
| Corpus Baseline | `docs/rag/CORPUS-BASELINE.md` |
| Processo RAG | `docs/rag/RAG-PROCESSO.md` |
| Governança RAG P.O. | `docs/painel-po/GOVERNANCA-RAG-PO-COMPLETO.md` |
| Rastreabilidade RAG P.O. | `docs/painel-po/RASTREABILIDADE-RAG-PO.md` |
| PR template RAG | `.github/PULL_REQUEST_TEMPLATE/rag-pr.md` |
| GitHub Action gate | `.github/workflows/rag-quality-gate.yml` |
| Skill Orquestrador | `docs/skills/SKILL-CONTEXTO.md` |
| Skill Implementador | `docs/skills/SKILL-ORQUESTRACAO.md` |

---

## 8. Telemetria de uso (L-RAG-01 — implementado 2026-03-30)

> A partir do PR #235, toda execução de `retrieveArticles` registra automaticamente
> os chunks recuperados na tabela `rag_usage_log` de forma **async non-blocking**.
> Isso habilita os gates Q2 e Q3 com dados reais de produção.

### 8.1 Endpoints disponíveis

| Endpoint tRPC | Uso no gate |
|---|---|
| `ragAdmin.getChunkUsageStats` | Score de cobertura: `coverage_pct = unique_chunks_used / total_chunks * 100` |
| `ragAdmin.getTopChunks` | Validar Q2: chunks do gold set devem aparecer no top-20 |
| `ragAdmin.getUnusedChunks` | Gate Q3: `total_invisible` deve ser 0 para chunks críticos |
| `ragAdmin.getUsageByLei` | Cobertura por lei: nenhuma lei deve ter 0 uso |

### 8.2 Integração obrigatória nos gates

- **Gate Q3:** a partir de agora, o relatório de invisibilidade DEVE incluir o resultado de
  `getUnusedChunks` para PRs que toquem o retriever ou o schema.
- **Gate Q2:** o recall do gold set pode ser validado cruzando `getTopChunks` com os
  `anchor_id` esperados por query.
- **Score de uso real:** meta ≥ 60% de cobertura ao final da Sprint T.

---

*Documento criado em 2026-03-30. Atualizado em 2026-04-05 (Milestone 1 — Decision Kernel). Mantido pelo Orquestrador (Claude) e implementado pelo Manus.*  
*Aprovação de mudanças neste documento: P.O. Uires Tapajós.*

---

## 9. Estado atual (2026-04-05) — Baseline v3.3

- HEAD: `dad90ec`
- Testes: 1.470 · 0 falhas · 0 erros TS
- CI: 12 workflows · CODEOWNERS: 15 entradas
- Milestone 1 Decision Kernel: CONCLUÍDO ✅ (PRs #302–#315)
- Decision Kernel: `source='engine'` ativo em `project_gaps_v3`
- Datasets NCM/NBS: 5/6 casos confirmados (Dr. Rodrigues, 2026-04-05)
