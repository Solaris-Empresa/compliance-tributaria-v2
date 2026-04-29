# ADR-0031 — Imutabilidade do Snapshot do Perfil da Entidade

**Status:** APPROVED
**Data:** 2026-04-29
**Sprint:** M2 PR-A (`feat/m2-pr-a-schema-backend`)
**Decisor:** P.O. (REGRA-ORQ-12 sprint fast-track)

## Contexto

O Perfil da Entidade (M1 v3) é o snapshot canônico de classificação tributária de um projeto. Após confirmação pelo usuário, este snapshot vira a **fonte de verdade** consumida (em M3) por RAG, briefing, motor de riscos e plano de ação.

Para garantir auditoria reproducível, snapshots confirmados não podem ser sobrescritos. Mutações pós-confirmação devem ser explicitamente versionadas (ADR-0032), preservando o snapshot anterior.

## Decisão

`projects.archetype` é **write-once**:

1. Procedure `perfil.confirm(projectId)` rejeita HTTP **409 CONFLICT** se `archetype IS NOT NULL`.
2. Demais procedures (`perfil.build`, `perfil.get`) são read-only e idempotentes.
3. Mutação estrutural pós-confirmação exige incremento de `archetypeVersion` (ADR-0032) — fora do escopo do PR-A.
4. Sem hot-patch direto via SQL `UPDATE projects SET archetype = ...` em produção sem aprovação P.O.

## Consequências

**Positivas:**
- Auditoria preservada: snapshot consultável em qualquer momento via `perfil.get`.
- Hash determinístico (`archetypePerfilHash`) garantia de não-modificação.
- Suite oficial de testes pode validar idempotência.

**Negativas:**
- Re-confirmação requer fluxo explícito de versionamento (M3+).
- Erro humano na primeira confirmação não é recuperável sem rollback SQL.

## Rollback

Localizado (1 projeto):
```sql
UPDATE projects
SET archetype = NULL,
    archetypeVersion = NULL,
    archetypePerfilHash = NULL,
    archetypeRulesHash = NULL,
    archetypeConfirmedAt = NULL,
    archetypeConfirmedBy = NULL
WHERE id = ?;
```

Catastrófico (todas as colunas):
```sql
ALTER TABLE projects DROP COLUMN archetype;
ALTER TABLE projects DROP COLUMN archetypeVersion;
ALTER TABLE projects DROP COLUMN archetypePerfilHash;
ALTER TABLE projects DROP COLUMN archetypeRulesHash;
ALTER TABLE projects DROP COLUMN archetypeConfirmedAt;
ALTER TABLE projects DROP COLUMN archetypeConfirmedBy;
```

## Referências

- `docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json` (SPEC canônica)
- `server/routers/perfil.ts` (implementação)
- `server/lib/archetype/perfilHash.ts` (hash determinístico)
- ADR-0032 (versionamento — par com este ADR)
