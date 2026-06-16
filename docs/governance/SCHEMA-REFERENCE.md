# Schema Reference — tabelas críticas (verificado · Gate 0)

> Mantido por Claude Code. **Cada fato é verificável** em `drizzle/schema.ts` ou
> `drizzle/00NN_*.sql` (ou `DESCRIBE <tabela>` pelo Manus). Atualizar a cada migration.
> Vinculado a **REGRA-ORQ-45** (Gate 0 do emissor de despacho) + Gate 0 schema (database.md).
>
> Última verificação: 16/06/2026.

## normative_product_rules — `drizzle/0076_normative_product_rules.sql`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | int AUTO_INCREMENT PK | |
| `ncm_code` | varchar(20) NOT NULL | prefixo ou código exato |
| `regime` | varchar(64) NOT NULL | **NÃO é enum** — string livre |
| `legal_reference` | varchar(255) NOT NULL | **MÁX 255 chars** |
| `match_mode` | enum('exact','prefix') NOT NULL DEFAULT 'exact' | |
| `active` | tinyint(1) NOT NULL DEFAULT 1 | boolean 0/1; resolver usa `WHERE active=1` |
| `source_version` | varchar(64) NOT NULL DEFAULT 'LC214_2025' | rastreia o seed de origem |
| `created_at` | timestamp DEFAULT CURRENT_TIMESTAMP | |

- **NÃO existem:** `source_basis`, `status`, `description`.
- **Estado pendente** = sufixo `_pendente` no `regime` + `active=0` (não há coluna `status`).
- **Regimes em uso** (verificados nos seeds — lista NÃO exaustiva, `regime` é varchar livre):
  `aliquota_zero` · `aliquota_reduzida_60` · `aliquota_zero_bens_capital_agro` (#1275) ·
  `sem_beneficio` · e *_pendente: `cesta_basica_pendente`, `aliquota_reduzida_60_alimentos_pendente`,
  `tratamento_agropecuario_especifico_pendente`, `tratamento_bens_capital_agro_pendente`.
  ⚠️ `aliquota_reduzida_bens_capital` (citado em despacho v20) **não foi encontrado** — não usar sem verificar.

## ragDocuments — `drizzle/schema.ts`

- `anchor_id` varchar(255) **UNIQUE NOT NULL** (chave canônica de dedup — DEC-002).
- `cnaeGroups` varchar(500) NOT NULL DEFAULT `""` (vazio/`""` = universal; ver `belongsToUniversalPool`, Lição #101).

## solaris_questions — `drizzle/schema.ts`

- `mapping_review_status` ENUM: `curated_internal` | `pending_legal` | `approved_legal` (default `curated_internal`).
  - **NÃO existe** o valor `reclassified_po_approved`.
  - Exibida quando status ∈ {`curated_internal`, `approved_legal`} (`server/db.ts:1381`).
- `cnae_groups` (JSON): `null`/`[]` = universal; preenchido = condicional por prefixo (Lição #103).

## Branch protection (`main`) — required status checks · 16/06/2026

**Exigidos (5):** `Governance gate` · `Invariant Check (GOV-03b)` · `Migration discipline` · `scope-check` · `autoaudit`.

**NÃO exigidos** (declarados em workflows, mas ausentes do branch protection → não bloqueiam merge):
`TypeScript + Vitest` · `Run Unit Tests` · `Validate PR body` · `Issue vinculada` · `Spec completa` · `Pre-Close Checklist`.

→ Consequência (Lição #128): REGRA-ORQ-CI-01, ORQ-16 e ORQ-17 **não são enforçadas mecanicamente** hoje. Decisão do P.O. pendente (registrar como required OU declarar disciplina manual).
