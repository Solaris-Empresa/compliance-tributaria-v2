# Governança do Corpus RAG — IA SOLARIS

> **Versão:** 1.4 | **Data:** 2026-04-13
> **Aprovado por:** Uires Tapajós (P.O.) — Sprint Z-13 ENCERRADA · Gate 7 PASS · HEAD 1ea5c64 · PRs #485–#497

---

## Regra de ouro

> Nenhum chunk vai ao banco sem snapshot antes.
> Nenhuma correção de corpus sem RFC aprovada.
> Nenhuma expansão sem gold set definido.

---

## 1. Obrigações por evento

| Evento                        | Obrigação                                                  |
|-------------------------------|------------------------------------------------------------|
| Ingestão nova (qualquer lei)  | Snapshot pré (CORPUS-BASELINE.md) + RFC + snapshot pós    |
| Correção de campo no banco    | RFC com dry-run obrigatório + aprovação P.O.               |
| Remoção de chunk              | RFC + justificativa jurídica + aprovação P.O.              |
| Nova lei no corpus            | Gold set definido antes da ingestão                        |
| Mudança legislativa ativa     | Revisão dos chunks afetados antes do próximo diagnóstico   |
| Sprint de negócio com RAG     | CORPUS-BASELINE.md atualizado no PR da sprint              |

---

## 2. Estrutura de artefatos

```
docs/rag/
  CORPUS-BASELINE.md       ← fonte de verdade do estado do corpus (documento vivo)
  RAG-GOVERNANCE.md        ← este documento
  gold-set-queries.sql     ← queries canônicas de validação de cobertura
  RFC/
    CORPUS-RFC-001.md      ← G-01: id 811 fragmentado
    CORPUS-RFC-002.md      ← G-02: ids 617–779 campo lei
    CORPUS-RFC-NNN.md      ← próximas RFCs (sequencial)
```

---

## 3. Métricas de qualidade obrigatórias (a cada ingestão)

| Métrica                          | Query de verificação                                                     | Meta     |
|----------------------------------|--------------------------------------------------------------------------|----------|
| Chunks sem anchor_id             | `SELECT COUNT(*) FROM ragDocuments WHERE anchor_id IS NULL`              | 0        |
| Chunks com lei inválida          | `SELECT lei, COUNT(*) FROM ragDocuments GROUP BY lei` — verificar contra enum | 0 fora do enum |
| Chunks fragmentados              | `SELECT id, lei, chunkIndex, LENGTH(conteudo) FROM ragDocuments WHERE LENGTH(conteudo) < 200` | Revisão manual |
| Cobertura por lei                | Gold set — ver `gold-set-queries.sql`                                    | 100%     |
| Dominância de fonte              | `SELECT lei, COUNT(*)*100.0/(SELECT COUNT(*) FROM ragDocuments) AS pct FROM ragDocuments GROUP BY lei` | lc214 < 70% (10 leis ativas) |

---

## 4. Classificação de incidentes

| Severidade | Definição                                       | Ação                                   |
|------------|-------------------------------------------------|----------------------------------------|
| P0 — Crítico | Lei ativa com 0 chunks em produção             | RFC emergencial + rollback imediato    |
| P1 — Alto   | Campo estrutural incorreto em faixa de ids      | RFC prioritária na sprint corrente     |
| P2 — Médio  | Chunk fragmentado ou topicos incompletos        | RFC na próxima sprint                  |
| P3 — Baixo  | Baixa cobertura CNAE em cnaeGroups              | Backlog de qualidade                   |

---

## 5. Rollback

Todo chunk ingerido por script deve ter `autor` preenchido com o identificador da sprint (ex: `ingestao-sprint-g-2026-03-26`). Isso permite rollback cirúrgico:

```sql
-- Rollback de uma ingestão inteira
DELETE FROM ragDocuments
WHERE autor = 'ingestao-sprint-g-2026-03-26';

-- Rollback de uma correção
UPDATE ragDocuments
SET lei = '[valor_anterior]'
WHERE id BETWEEN NNN AND NNN
  AND autor = '[autor_da_correcao]';
```

---

## 6. Referências

- CORPUS-BASELINE.md — estado atual do corpus
- ADR-010 — Arquitetura canônica de conteúdo diagnóstico
- scripts/corpus-utils.mjs — utilitários de ingestão
- scripts/migrate-anchor-id-legado.mjs — migração de anchor_id legado
