# ADR-0032 — Versionamento do Snapshot do Perfil da Entidade

**Status:** APPROVED
**Data:** 2026-04-29
**Sprint:** M2 PR-A (`feat/m2-pr-a-schema-backend`)
**Par:** ADR-0031 (imutabilidade)

## Contexto

Snapshots do Perfil da Entidade são imutáveis (ADR-0031). Mas o produto evoluirá: o engine M1 (`m1-v1.0.0` hoje) terá novos campos, novas regras de derivação, novos chapters NCM mapeados.

Precisa-se de uma estratégia explícita para diferenciar snapshots criados em versões diferentes do engine, e para sinalizar quando uma re-derivação é necessária.

## Decisão

Coluna `projects.archetypeVersion` semver `MAJOR.MINOR.PATCH`.

**PR-A inicial:** `v1.0.0`

**Bump rules:**
- **MAJOR:** breaking change na estrutura do snapshot (campo removido, mudança de tipo, mudança de semântica). Re-derivação obrigatória.
- **MINOR:** campo novo aditivo (sem invalidar snapshots anteriores). Re-derivação opcional.
- **PATCH:** correção de bug em derivação (ex.: chapter 02 ou 47 adicionado em `REGIME_TUPLE_TO_OBJETO_NCM`). Re-derivação recomendada.

**Persistência:**
- `archetypeVersion`: VARCHAR(20) nullable — preenchido por `perfil.confirm`.
- `archetypeRulesHash`: hash sha256 do `manifesto-v1.json` — bate byte-a-byte entre execuções da mesma `archetypeVersion`.
- `archetypePerfilHash`: hash sha256 canonical do snapshot expandido (project_id + cnpj + cnaes + dimensões).

**Migração entre versões (M3+):**
1. Bump `archetypeVersion` no engine.
2. `perfil.migrate(projectId, fromVersion, toVersion)` — procedure dedicada (não existe em PR-A).
3. Snapshot anterior preservado em `projects_archetype_history` (tabela criada em M3).

## Consequências

**Positivas:**
- Auditoria de versão por projeto.
- Detecção determinística de drift via `rules_hash` (mesma versão → mesmo hash).
- Caminho claro para evolução do engine sem quebrar snapshots existentes.

**Negativas:**
- Sem ferramentas de migração em PR-A — projeto confirmado em `v1.0.0` continua nessa versão até implementação manual.
- Histórico de mutações exige tabela auxiliar (M3+).

## Versão inicial (PR-A)

`MODEL_VERSION = "m1-v1.0.0"` (constante em `server/lib/archetype/versioning.ts`)
`archetypeVersion` persistido = `"v1.0.0"` (constante `ARCHETYPE_VERSION_INITIAL` em `server/routers/perfil.ts`)

## Referências

- ADR-0031 (imutabilidade — par)
- `docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json` (SPEC)
- `server/lib/archetype/versioning.ts` (constantes)
- `server/routers/perfil.ts` (uso)
- `tests/archetype-validation/RESULT-51-casos-brasil-v3.json` (baseline determinístico m1-v1.0.0)
