# CORPUS-RFC-005 — Ingestão LC 87/1996 (Lei Kandir)

| Campo | Valor |
|---|---|
| **ID** | CORPUS-RFC-005 |
| **Título** | Ingestão LC 87/1996 (Lei Kandir) — 55 chunks novos |
| **Status** | EXECUTED |
| **Sprint** | Sprint V / PV-03 |
| **PR** | #326 |
| **Data** | 2026-04-05 |
| **Autor** | ingestao-sprint-v-pv03 |
| **Aprovador** | utapajos (P.O.) |

---

## Contexto

A LC 87/1996 ("Lei Kandir") é a lei complementar que regula o ICMS — o imposto que será substituído pelo IBS/CBS na Reforma Tributária (LC 214/2025). Sua cobertura no corpus RAG é essencial para:

1. **Perguntas de transição:** "Como era o ICMS antes? O que muda com o IBS?"
2. **Créditos acumulados:** Art. 20–26 (crédito ICMS) vs. não-cumulatividade IBS/CBS
3. **Substituição tributária:** Arts. 6–10 — regime que persiste durante a transição
4. **Base de cálculo:** Art. 13 (ICMS por dentro) vs. Art. 11 LC 214 (IBS/CBS por fora)

Antes desta RFC, o corpus tinha apenas **5 chunks legados** (pré-Sprint G) cobrindo apenas a ementa e o Art. 20 parcialmente.

---

## Dry-run

```
Chunks no JSON: 55
Grupos obrigatórios: 8/8 ✅
Unicidade anchor_id: 55/55 ✅
Colisões com legados: 0 ✅
```

---

## Execução

```sql
-- Q6 SELECT antes:
SELECT COUNT(*) FROM ragDocuments WHERE lei = 'lc87';
-- Resultado: 5 (chunks legados)

-- INSERT: 55 novos chunks via UPSERT (anchor_id UNIQUE)
-- Autor: 'ingestao-sprint-v-pv03'
-- cnaeGroups: 'COM,IND,SER,AGR' (LC 87 é transversal)

-- Q6 SELECT depois:
SELECT COUNT(*) FROM ragDocuments WHERE lei = 'lc87';
-- Resultado: 60 ✅

SELECT COUNT(*) FROM ragDocuments;
-- Resultado: 2.509 (era 2.454) ✅
```

---

## Evidência JSON

```json
{
  "rfc": "CORPUS-RFC-005",
  "sprint": "Sprint V / PV-03",
  "lei": "lc87",
  "chunks_antes": 5,
  "chunks_inseridos": 55,
  "chunks_depois": 60,
  "corpus_total_antes": 2454,
  "corpus_total_depois": 2509,
  "grupos_cobertos": [
    "fato-gerador-icms",
    "nao-incidencia-icms",
    "base-calculo-icms",
    "aliquotas-icms",
    "nao-cumulatividade-icms",
    "credito-icms",
    "credito-icms-ativo-permanente",
    "credito-icms-exportacao",
    "credito-icms-uso-consumo",
    "substituicao-tributaria",
    "substituicao-tributaria-interestad",
    "local-operacao-icms",
    "base-calculo-substituicao",
    "restituicao-substituicao",
    "obrigacoes-acessorias-icms",
    "fiscalizacao-icms",
    "transicao-icms",
    "competencia-icms",
    "contribuinte-icms",
    "responsabilidade-tributaria",
    "disposicoes-finais",
    "vigencia-anexo-kandir"
  ],
  "artigos_cobertos": "Art. 1 a Art. 36 (exceto revogados e Anexo Kandir)",
  "excluido": "Anexo Kandir (tabelas de compensação financeira 1996-2004) — dados históricos irrelevantes para compliance tributário atual",
  "gold_set_impacto": "Nenhum — GS-01 a GS-08 não testam lc87 diretamente",
  "confiabilidade_esperada": "100% (sem alteração nos gold set queries)"
}
```

---

## Rollback

```sql
-- Remover apenas os 55 chunks novos (preservar os 5 legados)
DELETE FROM ragDocuments
WHERE lei = 'lc87'
  AND autor = 'ingestao-sprint-v-pv03';

-- Verificar:
SELECT COUNT(*) FROM ragDocuments WHERE lei = 'lc87';
-- Esperado: 5 (apenas os legados)
```

---

## Restrição de uso

> **ATENÇÃO:** Os chunks da LC 87/1996 são para **RAG contextual APENAS**.
> NÃO devem ser usados no engine determinístico (`ncm-dataset.json` / `nbs-dataset.json`).
> O engine determinístico usa exclusivamente a LC 214/2025 como base normativa.
