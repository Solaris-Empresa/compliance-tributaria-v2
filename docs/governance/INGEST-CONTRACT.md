# INGEST-CONTRACT — Contrato de Dados de Ingestão

**Versão:** 1.0 | **Data:** 19/05/2026 | **Origem:** Lição #79 (incidente anchor_id/autor)

## REGRA-INGEST-01

Todo script de ingestão que execute INSERT em `ragDocuments` DEVE popular obrigatoriamente:

| Campo | Formato | Exemplo |
|---|---|---|
| `anchor_id` | `{lei}-{artigo_slug}-id{id}` | `lc214-art-138-id4521` |
| `autor` | `{pipeline}-{sprint}-{data}` | `ingestao-onda2-manus-19mai2026` |
| `conteudo` | Entre 10 e 5.000 chars | — |

## Como usar

```typescript
import { validateChunkBeforeInsert, generateAnchorId } from '../server/lib/ingest-validator';

// Antes de cada INSERT:
const chunk = {
  lei: 'lc214',
  artigo: 'Art. 138',
  conteudo: texto,
  anchor_id: generateAnchorId('lc214', 'Art. 138', id),
  autor: 'ingestao-onda3-manus-19mai2026',
};
validateChunkBeforeInsert(chunk); // lança Error se inválido
await db.insert(ragDocuments).values(chunk);
```

## Por que existe esta regra

Os campos `anchor_id` e `autor` são usados pelos Gold Sets GS-01, GS-07 e GS-08
para calcular o confidence score do corpus. Chunks sem esses campos reduzem o
score e causam falhas silenciosas detectadas apenas na auditoria.

**Incidente de origem:** 19/05/2026 — 12.577 chunks (78% do corpus) sem anchor_id/autor.
Causa: scripts ad-hoc não conheciam o contrato do Gold Set.

## Enforcement

- **Build-time:** `validateChunkBeforeInsert()` lança exceção antes do INSERT
- **CI:** step `validate-ingest-scripts` em `.github/workflows/rag-quality-gate.yml`
- **Schema:** `anchor_id` e `autor` são NOT NULL (migration pós-fix de dados)
