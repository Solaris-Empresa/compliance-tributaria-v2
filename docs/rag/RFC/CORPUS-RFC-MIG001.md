# CORPUS-RFC-MIG001 — Deprecar source='rag'

Data: 2026-04-04
Tipo: Decisão de schema / Migration de enum
Severidade: P3 (baixo risco — 0 registros afetados)

## Problema
source='rag' nunca será usado. A Onda 3 usará source='engine'.
Manter o valor cria semântica confusa para futuros desenvolvedores.

## Análise do Schema Real

**Descoberta (2026-04-04):** o campo `source` em `project_gaps_v3` é `varchar(20) NOT NULL DEFAULT 'v1'`
— não um ENUM nativo MySQL. Portanto, o ALTER TABLE para remover 'rag' do enum **não se aplica**.

```sql
-- Schema real (banco TiDB Cloud)
`source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'v1'
```

## Impacto
- Registros afetados: 0 (dry-run confirmado)
- Risco: Nenhum — campo varchar aceita qualquer string
- ALTER TABLE: **NÃO NECESSÁRIO**

## Decisão
A deprecação de `source='rag'` é garantida por contrato de código:
1. `iagen-gap-analyzer.ts` usa `source='iagen'` (PR #295)
2. CNT-03 define `source='engine'` para Onda 3
3. Nenhum código insere `source='rag'` em `project_gaps_v3`

## Drizzle Schema — Atualização necessária
O campo `source` em `drizzle/schema.ts` deve ser atualizado para refletir
os valores canônicos aceitos. Isso é feito no Bloco C (engine) quando o
schema for expandido para suportar `source='engine'`.

## Dry-run
```sql
SELECT COUNT(*) FROM project_gaps_v3 WHERE source = 'rag';
-- Resultado: 0 ✅
```

## Status: EXECUTADO — 2026-04-04
Decisão: sem ALTER TABLE. Deprecação por contrato de código (CNT-03).
Aprovado: Orquestrador + P.O.
