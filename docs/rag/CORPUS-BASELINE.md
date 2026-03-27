# CORPUS BASELINE — IA SOLARIS RAG

> **Versão:** v1.1
> **Data:** 2026-03-26
> **Commit HEAD no momento do inventário:** [commit do PR]
> **Sprint de referência:** Sprint G (pós-execução — RFC-001 + RFC-002)
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
| Leis ativas no corpus     | 5 (lc214, ec132, lc227, lc224, lc123) |
| Anomalias documentadas    | 0 ✅ Sprint G concluída |
| Anomalias críticas (P0)   | 0            |

---

## 2. Distribuição por lei

| lei   | total_chunks | com_anchor_id | sem_anchor_id | id_min | id_max | status       |
|-------|-------------|----------------|----------------|--------|--------|--------------|
| lc214 | 1.573        | 1.573          | 0              | 1      | 30.839 | ✅ Íntegro |
| ec132 | 18           | 18             | 0              | 30.840 | 30.857 | ✅ Íntegro |
| lc227 | 434          | 434            | 0              | 808    | 1.241  | ✅ RFC-001 executada · id 810 fusionado |
| lc224 | 28           | 28             | 0              | 780    | 807    | ✅ Íntegro |
| lc123 | 25           | 25             | 0              | 664    | 722    | ✅ RFC-002 executada · novo |

---

## 3. Anomalias documentadas

| ID   | ids afetados | lei   | problema                            | severidade | status         | RFC               |
|------|-------------|-------|-------------------------------------|------------|----------------|-------------------|
| G-01 | 810–811     | lc227 | Chunk fragmentado — Art. 2 partes 2+3 | P2 | ✅ Corrigido Sprint G · 2026-03-26 | CORPUS-RFC-001.md |
| G-02 | 617–779     | lc123 | 25 chunks com campo lei=lc214 incorreto | P1 | ✅ Corrigido Sprint G · 2026-03-26 | CORPUS-RFC-002.md |

> **NOTA:** ids 780–807 (28 chunks, lei=lc224) auditados e **CORRETOS** — não foram pendência.

---

## 4. Gold set de queries de referência

Ver: `docs/rag/gold-set-queries.sql`

Resultado esperado por query documentado no Momento 2 (pós-diagnóstico).

---

## 5. Histórico de versões

| Versão | Data       | Commit   | Descrição                                      |
|--------|------------|----------|------------------------------------------------|
| v1.0   | 2026-03-26 | 0ad209b  | Criação — primeiro inventário granular por lei |
| v1.1   | 2026-03-26 | [commit do PR] | RFC-001: fusão chunks 810+811 (lc227) · RFC-002: 25 chunks migrados para lc123 · gold set 8/8 verde · confiabilidade 100% |

---

*Documento vivo — fonte de verdade do estado do corpus RAG.*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
