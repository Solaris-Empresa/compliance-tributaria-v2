# ADR-0036 — Reranker NCM-aware (Opção A: instrução de aderência ao NCM no `rerankWithLLM`)

## Status: Aceito · 2026-06-16 · RERANKER-NCM-AWARE-01 #1468 · Classe B
## Relacionado: #1276, #1451 (filtragem por CNAE — distintos), #1473 (spec), ADR-0035 (resolver NCM/NBS)

---

## 1. Contexto

Auditoria **G1-T1 (16/06/2026)** observou **Art.140** (comunicação institucional à administração pública) e **Art.176** (contribuintes de combustíveis) sobrevivendo ao top-K do reranker para **NCM 8436** (máquinas agrícolas, CNAE 28) em Q.NCM.

Pipeline atual (`server/rag-retriever.ts:631-692`):

```
Pass1 genérico + Pass2 setorial CNAE-aware + Pass3 NCM-targeted
  → mergeAndDedup (~55) → filterByCnaeRelevance (#1276, membership estrito)
  → rerankWithJina (cross-encoder, ≤20) → rerankWithLLM (GPT-4.1, temp 0.0) → topK
```

`#1276`/`#1451` corrigiram a **filtragem determinística por `cnaeGroups`** — mas o **`rerankWithLLM`** (`rag-retriever.ts:521-579`) decide o top-K por **relevância semântica** sem instrução explícita de aderência ao NCM. O NCM do contribuinte **já está** no `contextQuery` (Pass3 o extrai via `extractNcmsFromContext:451`), e portanto já aparece no prompt em `CONTEXTO DA EMPRESA: ${query}` (`:535-536`) — mas o prompt **não instrui** o modelo a priorizar aderência ao NCM nem a penalizar setores não relacionados (`:533-544`). Esse é o gap que a filtragem por CNAE não cobre: relevância semântica residual.

> **Nota Gate 0 (REGRA-ORQ-45 / Lição #125):** o despacho v35 assumiu `buildRerankPrompt(chunks, query)` e um parâmetro `ncm` — **nenhum existe**. O prompt é inline em `rerankWithLLM` e não há `ncm` separado (vem no `query`). A implementação reflete o código real.

## 2. Decisão

**Opção A — instrução de aderência ao NCM no `rerankWithLLM`.** Aumentar o prompt do GPT-4.1 reranker (estágio onde o erro aparece, o top-K final) com uma instrução determinística-em-intenção:

- Extrair os NCMs do `query` via o helper existente `extractNcmsFromContext(query)` (reúso, sem duplicar regex — REGRA-ORQ-32).
- Quando houver NCM, injetar no prompt: *"Priorize artigos diretamente relacionados ao(s) NCM(s) {ncms} ou ao produto/setor correspondente. Penalize artigos de setores não relacionados ao NCM do contribuinte."*
- Manter `temperature: 0.0` (REGRA-ORQ-30).
- Para testabilidade, extrair a construção do prompt para função pura exportada `buildRerankPrompt(candidates, query, ncms)` (unit-test da injeção da instrução); o ranking real (top-3 exclui Art.140) é validado por integração/smoke.

**Escopo cirúrgico:** apenas `server/rag-retriever.ts` (rerankWithLLM/prompt) + testes. **Não** toca schema, migrations, `cnaeGroups`, corpus nem Jina.

**Degradação graciosa (Lição #67):** sem NCM no `query` → instrução omitida → comportamento idêntico ao atual. Falha do LLM → fallback `candidates.slice(0, topK)` (já existente, `:577`).

## 3. Consequências

**Positivas:** ataca o ponto exato (top-K final) sem nova infraestrutura/metadado; reversível (feature pode ser guard por flag); independente da curadoria de `cnaeGroups` (Lição #133) — defense-in-depth válido mesmo após a curadoria.

**Negativas / riscos:** não-determinístico (LLM pode ignorar a instrução) — por isso **Opção B fica registrada como contingência**; instrução de "penalizar setores não relacionados" exige anti-regressão para não derrubar artigo legítimo de outro NCM (test contract abaixo).

**Test contracts (da spec #1473 — REGRA-ORQ-28/44):**
- NEGATIVO: Art.140 **não** no top-3 para NCM 8436 (CNAE 28)
- NEGATIVO: Art.176 **não** no top-3 para NCM 8436 (CNAE 28)
- POSITIVO: Art.197 **no** top-3 para NCM 8436 (CNAE 28)
- ANTI-REGRESSÃO: Art.139 **no** top-3 para NCM de produto cultural (não penalizar globalmente)
- Unit (sem DB/LLM): `buildRerankPrompt` injeta a instrução com o NCM quando presente; omite quando ausente.

## 4. Alternativas consideradas

- **Opção B — score boost determinístico pós-rerank** (multiplicador para chunks que contêm o NCM literal). **Registrada como contingência** se a Opção A for insuficiente nos testes. Limitação: artigos genéricos não citam o NCM no texto.
- **Opção C — filtro pré-rerank por setor do NCM.** **Rejeitada:** amplia dependência de classificação de domínio (mapeamento NCM→setor/CNAE) — mesma família de problema que gerou o mis-tag de `cnaeGroups` em Art.140/176 (Lição #88/#133) e arrisca ocultar artigo legítimo.

## 5. Vinculadas

`server/rag-retriever.ts:451,521-579,631-692` · spec #1473 (`docs/specs/SPEC-RERANKER-NCM-AWARE-01-v1.md`) · #1468 · #1276 · #1451 · REGRA-ORQ-27/28/30/44 · Lições #67/#87/#88/#125/#133
