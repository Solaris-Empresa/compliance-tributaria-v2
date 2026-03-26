# CORPUS BASELINE — IA SOLARIS RAG

> **Versão:** v1.0
> **Data:** 2026-03-26
> **Commit HEAD no momento do inventário:** 0ad209b
> **Sprint de referência:** Sprint G (pré-execução)
> **Autor do inventário:** Manus AI
> **Aprovado por:** Uires Tapajós (P.O.)
>
> **Instrução de atualização:** a cada ingestão ou correção de corpus,
> incrementar a versão, registrar data/commit e atualizar as seções 1, 2 e 3.
> Nunca atualizar este arquivo sem um PR associado.

---

## 1. Totais

| Indicador                 | Valor        |
|---------------------------|-------------|
| Total de chunks           | 2.078        |
| Chunks com anchor_id      | 2.078 (100%) |
| Chunks sem anchor_id      | 0            |
| Leis ativas no corpus     | 4 (lc214, ec132, lc227, lc224) |
| Anomalias documentadas    | 2 (G-01, G-02) |
| Anomalias críticas (P0)   | 0            |

---

## 2. Distribuição por lei

| lei   | total_chunks | com_anchor_id | sem_anchor_id | id_min | id_max | status       |
|-------|-------------|----------------|----------------|--------|--------|--------------|
| lc214 | 1.598        | 1.598          | 0              | 1      | 30.839 | ⚠️ G-02: ids 617–779 com campo lei a validar |
| ec132 | 18           | 18             | 0              | 30.840 | 30.857 | ✅ Íntegro   |
| lc227 | 434          | 434            | 0              | 808    | 1.241  | ⚠️ G-01: id 811 fragmentado |
| lc224 | 28           | 28             | 0              | 780    | 807    | ✅ Íntegro   |

---

## 3. Anomalias documentadas

| ID   | ids afetados | lei   | problema                            | severidade | status         | RFC               |
|------|-------------|-------|-------------------------------------|------------|----------------|-------------------|
| G-01 | 811         | lc227 | chunkIndex=2 sem caput — conteúdo fragmentado (começa no meio de frase) | P2 — Médio | Pendente Sprint G | CORPUS-RFC-001.md |
| G-02 | 617–779     | lc214 | 163 chunks: campo `lei` possivelmente incorreto — a confirmar via diagnóstico | P1 — Alto  | Pendente Sprint G | CORPUS-RFC-002.md |

> **ATENÇÃO:** ids 780–807 (28 chunks, lei=lc224) foram auditados e estão **CORRETOS** — não são pendência.

---

## 4. Gold set de queries de referência

Ver: `docs/rag/gold-set-queries.sql`

Resultado esperado por query documentado no Momento 2 (pós-diagnóstico).

---

## 5. Histórico de versões

| Versão | Data       | Commit   | Descrição                                      |
|--------|------------|----------|------------------------------------------------|
| v1.0   | 2026-03-26 | 0ad209b  | Criação — primeiro inventário granular por lei |

---

*Documento vivo — fonte de verdade do estado do corpus RAG.*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
