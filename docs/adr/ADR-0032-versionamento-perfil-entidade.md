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
- ADR-0033 (Identidade Fiscal Dual — MINOR aditivo aplicado em F3 do BUG-AGRO-CPF #1290)
- `docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json` (SPEC)
- `server/lib/archetype/versioning.ts` (constantes)
- `server/routers/perfil.ts` (uso)
- `tests/archetype-validation/RESULT-51-casos-brasil-v3.json` (baseline determinístico m1-v1.0.0)

---

## Adendo F3 BUG-AGRO-CPF (29/05/2026) — Aplicação concreta da regra MINOR aditivo

`PerfilSnapshotInput` (em `server/lib/archetype/perfilHash.ts`) ganhou em F3 três campos opcionais aditivos:

- `cpf?: string` — CPF do produtor rural PF (Art. 164 LC 214/2025)
- `taxIdType?: 'cnpj' | 'cpf'` — discriminador da identidade fiscal
- `taxId?: string` — valor unificado (CPF ou CNPJ) para distinção no canonical

`cnpj` tornou-se `cnpj?: string` (opcional).

**Por que continua `m1-v1.0.0` (sem MINOR bump explícito no semver):**

O `RULES_HASH` é calculado sobre o **manifesto de regras de derivação** (`docs/epic-830-rag-arquetipo/manifests/m1-v1.0.0.json`), não sobre o shape de `PerfilSnapshotInput`. F3 NÃO muda nenhuma regra de derivação — apenas adiciona campos opcionais ao input do hash do snapshot. O `RULES_HASH = "4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272"` permanece inalterado.

**Por que retrocompat byte-a-byte é preservada:**

`computePerfilHash` adiciona `taxIdType` e `taxId` ao canonical **condicionalmente**:

```typescript
if (input.taxIdType !== undefined) {
  canonical.taxIdType = input.taxIdType;
  canonical.taxId = effectiveTaxId;
}
```

Snapshots persistidos antes de F3 (sem `taxIdType` no input) produzem canonical idêntico ao histórico → hash byte-a-byte preservado. Cumpre estritamente §3 (MINOR = "sem invalidar snapshots anteriores").

Detalhamento técnico completo em ADR-0033 + caso canônico em `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md` §3.1.
