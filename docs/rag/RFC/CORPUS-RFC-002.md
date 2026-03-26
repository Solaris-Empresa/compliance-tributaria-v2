# CORPUS-RFC-002 — Validação campo `lei` ids 617–779 (163 chunks)

| Campo            | Valor                          |
|------------------|--------------------------------|
| RFC              | 002                            |
| Data de criação  | 2026-03-26                     |
| Tipo             | Validação / Correção de campo  |
| Severidade       | P1 — Alto                      |
| Sprint           | G                              |
| Autor            | Manus AI                       |
| Aprovação P.O.   | [ ] Pendente                   |
| Status           | DRAFT — aguardando diagnóstico |

---

## Problema

163 chunks (ids 617–779) têm campo `lei = 'lc214'` mas o inventário indica que
podem pertencer a outras leis. A lei incorreta impede a recuperação correta por `rag-retriever.ts`.

> **ATENÇÃO:** ids 780–807 (28 chunks, lei=lc224) foram auditados e estão CORRETOS — não incluir nesta RFC.

---

## Diagnóstico obrigatório antes da execução

```sql
-- 1. Distribuição de artigos nesta faixa — identificar padrão
SELECT lei, artigo, titulo,
       COUNT(*) AS qtd,
       MIN(id) AS id_min,
       MAX(id) AS id_max
FROM ragDocuments
WHERE id BETWEEN 617 AND 779
GROUP BY lei, artigo, titulo
ORDER BY artigo
LIMIT 40;

-- 2. Amostra de 10 registros para inspeção manual
SELECT id, lei, artigo, titulo, chunkIndex, anchor_id, autor,
       LEFT(conteudo, 200) AS conteudo_inicio
FROM ragDocuments
WHERE id BETWEEN 617 AND 779
ORDER BY id
LIMIT 10;

-- 3. Verificar se valor atual é realmente 'lc214'
SELECT DISTINCT lei, COUNT(*) AS qtd
FROM ragDocuments
WHERE id BETWEEN 617 AND 779
GROUP BY lei;
```

**O resultado destas queries DEVE ser colado nesta RFC antes de qualquer UPDATE.**
O Orquestrador vai analisar os `artigo`/`titulo` e determinar a lei correta.

---

## SQL de execução (a preencher após diagnóstico)

```sql
-- DRY-RUN obrigatório primeiro:
SELECT COUNT(*) AS registros_afetados,
       lei AS lei_atual
FROM ragDocuments
WHERE id BETWEEN 617 AND 779
GROUP BY lei;
-- confirmar contagem: deve ser exatamente 163

-- Execução real (após aprovação do P.O.):
UPDATE ragDocuments
SET lei           = '[LEI_CORRETA — definida pelo Orquestrador]',
    autor         = 'correcao-rfc-002-sprint-g',
    data_revisao  = '2026-03-26'
WHERE id BETWEEN 617 AND 779
  AND lei = '[LEI_ATUAL — confirmada no dry-run]';
```

---

## SQL de rollback

```sql
UPDATE ragDocuments
SET lei = 'lc214',
    autor = '[autor_original]'
WHERE id BETWEEN 617 AND 779
  AND autor = 'correcao-rfc-002-sprint-g';
```

---

## Snapshot pré-execução

A ser preenchida pelo Manus antes de qualquer escrita no banco.

---

## Snapshot pós-execução

A ser preenchida pelo Manus após execução.

---

## Aprovações

- [ ] Orquestrador (Claude) — após análise do diagnóstico
- [ ] P.O. (Uires Tapajós) — antes do UPDATE no banco
