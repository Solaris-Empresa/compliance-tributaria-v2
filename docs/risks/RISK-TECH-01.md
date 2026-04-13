# RISK-TECH-01 — Busca RAG baseada em LIKE pode gerar falsos negativos

**ID:** RISK-TECH-01  
**Sprint:** Z-13.5  
**Status:** ABERTO  
**Severidade:** Média

## Causa

TiDB Cloud não suporta FULLTEXT index nativamente. A busca no corpus RAG (`ragDocuments.conteudo`) usa `LIKE '%termo%'` que:
- Não tem ranking de relevância
- Pode falhar com termos parciais ou acentuação diferente
- Performance O(n) em tabelas grandes

## Impacto

Um risco válido pode ser marcado como `rag_validated = false` (tinyint 0) mesmo quando a base legal existe no corpus. Isso reduz a confiança do risco em 25% (`confidence *= 0.75`) mas NÃO remove o risco.

## Mitigação atual

1. **Busca por artigo estruturado** (primária): `WHERE artigo LIKE '%Art. X%'`
2. **Fallback textual** por termos da categoria: `WHERE conteudo LIKE '%split payment%'`
3. Risco nunca é removido por falta de validação RAG — apenas reduz confidence

## Resolução futura

- Migrar para embedding search (OpenAI embeddings + cosine similarity)
- Ou migrar para PostgreSQL com `pg_trgm` para fuzzy matching
- Ou implementar FULLTEXT index quando TiDB suportar (roadmap TiDB 8.x)
