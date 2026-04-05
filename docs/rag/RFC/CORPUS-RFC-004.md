# CORPUS-RFC-004 — Correção `autor` NULL: 376 chunks legados pré-Sprint G

| Campo | Valor |
|---|---|
| **ID** | CORPUS-RFC-004 |
| **Título** | Correção `autor` NULL — 376 chunks legados pré-Sprint G |
| **Status** | ✅ EXECUTED |
| **Sprint** | Sprint U |
| **PR** | fix/rag-rfc-004-autor-null |
| **Data** | 2026-04-05 |
| **Impacto** | GS-08 WARN → ✅ verde · confiabilidade 87.5% → **100%** |

---

## Causa Raiz

As ingestões realizadas antes do Sprint G (sprints A, B, C, D, E, F) não preenchiam o campo `autor` na tabela `ragDocuments`. O campo foi introduzido como requisito de rastreabilidade a partir do Sprint G, mas os chunks já existentes no banco permaneceram com `autor IS NULL`.

Isso causava o WARN no gold set query **GS-08 (ingestão rastreável)**, que verifica se todos os chunks possuem `autor` preenchido.

## Distribuição dos chunks afetados (dry-run confirmado)

| Lei | Chunks sem `autor` |
|---|---|
| `conv_icms` | 278 |
| `lc116` | 60 |
| `cg_ibs` | 26 |
| `rfb_cbs` | 7 |
| `lc87` | 5 |
| **TOTAL** | **376** |

## Fix executado

UPDATE por lote, uma lei por vez, com verificação de COUNT antes e depois de cada lote:

```sql
UPDATE ragDocuments
SET autor = 'legado-pre-sprint-g/conv_icms'
WHERE (autor IS NULL OR autor = '') AND lei = 'conv_icms';
-- Resultado: 278 rows afetadas | depois=0

UPDATE ragDocuments
SET autor = 'legado-pre-sprint-g/lc116'
WHERE (autor IS NULL OR autor = '') AND lei = 'lc116';
-- Resultado: 60 rows afetadas | depois=0

UPDATE ragDocuments
SET autor = 'legado-pre-sprint-g/cg_ibs'
WHERE (autor IS NULL OR autor = '') AND lei = 'cg_ibs';
-- Resultado: 26 rows afetadas | depois=0

UPDATE ragDocuments
SET autor = 'legado-pre-sprint-g/rfb_cbs'
WHERE (autor IS NULL OR autor = '') AND lei = 'rfb_cbs';
-- Resultado: 7 rows afetadas | depois=0

UPDATE ragDocuments
SET autor = 'legado-pre-sprint-g/lc87'
WHERE (autor IS NULL OR autor = '') AND lei = 'lc87';
-- Resultado: 5 rows afetadas | depois=0
```

**Total atualizado: 376 chunks.**

## Rollback

Caso necessário reverter, executar:

```sql
UPDATE ragDocuments
SET autor = NULL
WHERE autor LIKE 'legado-pre-sprint-g/%';
-- Afeta exatamente 376 rows
```

## Verificação final

```sql
SELECT COUNT(*) FROM ragDocuments WHERE autor IS NULL OR autor = '';
-- Resultado: 0 ✅
```

Gold set GS-08 status pós-fix: **✅ OK** (0 chunks sem autor)  
Confiabilidade: **8/8 = 100%** (acima da meta de 98%)

## Evidência JSON

```json
{
  "rfc": "CORPUS-RFC-004",
  "data": "2026-04-05",
  "sprint": "Sprint U",
  "head": "1c8e58c",
  "dry_run": {
    "total_sem_autor": 376,
    "distribuicao": {
      "conv_icms": 278,
      "lc116": 60,
      "cg_ibs": 26,
      "rfb_cbs": 7,
      "lc87": 5
    }
  },
  "update": {
    "total_afetado": 376,
    "lotes": 5,
    "erros": 0
  },
  "verificacao_final": {
    "chunks_sem_autor": 0,
    "gs08_status": "OK",
    "confiabilidade": "100%",
    "total_chunks": 2454,
    "chunks_com_autor": 2454
  },
  "rollback_sql": "UPDATE ragDocuments SET autor = NULL WHERE autor LIKE 'legado-pre-sprint-g/%'"
}
```
