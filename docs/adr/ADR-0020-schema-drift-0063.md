# ADR-0020 — Schema Drift: Migration 0063 (hash divergente)

**Data:** 2026-04-08
**Status:** Aceito
**Autor:** Manus (implementador técnico)
**Aprovado por:** Orquestrador (Claude)

---

## Contexto

Durante a auditoria do checkpoint `dc6185b2` (FIX_01+FIX_02+FIX_03), identificou-se que o arquivo `drizzle/0063_simple_shotgun.sql` estava presente no working tree local mas **não commitado no repositório** e com **hash divergente** do registro em `__drizzle_migrations`.

### Diagnóstico executado em 2026-04-08

| Check | Resultado |
|-------|-----------|
| `SELECT COUNT(*) FROM solaris_answers` | `97` — tabela existe com dados reais |
| Migration usa `IF NOT EXISTS` | ❌ Não — `CREATE TABLE` simples |
| Hash `1bf639f505823206...` em `__drizzle_migrations` | ✅ Registrado em 2026-03-30T10:22:17Z |
| Hash local do arquivo `0063_simple_shotgun.sql` | `95dacfe1112c94c6...` — **divergente** |
| Total de migrations no banco | 66 |
| Total de entries no journal local | 64 (0000–0063) |

### Tabelas criadas pela migration 0063 (todas já existem em produção)

| Tabela | Linhas em produção |
|--------|--------------------|
| `solaris_answers` | 97 |
| `solaris_questions` | 36 |
| `cpie_analysis_history` | 0 |
| `iagen_answers` | 36 |
| `project_status_log` | 1.738 |
| `rag_usage_log` | 0 (não existe — `CREATE TABLE` não executado para esta) |

---

## Causa Raiz

`pnpm db:push` foi executado diretamente em produção em sessões anteriores sem commit no repositório. O Drizzle aplicou o schema e registrou o hash da migration no banco (`__drizzle_migrations`), mas o arquivo SQL gerado localmente em sessão posterior teve conteúdo ligeiramente diferente, resultando em hash divergente.

---

## Decisão

**PR #415 fechado.** Não é seguro mergear a migration 0063 com hash divergente porque:

1. O Drizzle detectaria o hash local (`95dacfe1...`) como "não aplicado" e tentaria executar o SQL.
2. O SQL usa `CREATE TABLE` sem `IF NOT EXISTS` — falharia com `Table 'solaris_answers' already exists`.
3. O deploy seria interrompido com erro.

O schema em produção está **correto e completo**. A divergência é apenas de registro no repositório.

---

## Consequências

- O arquivo `drizzle/0063_simple_shotgun.sql` e a entrada correspondente em `drizzle/meta/_journal.json` foram **removidos do repositório** (branch `chore/schema-sync-0063` fechada sem merge).
- O journal local permanece em `0062_elite_dorian_gray` como última migration commitada.
- Qualquer nova alteração de schema deve gerar uma migration `0063` (ou superior) com `pnpm db:push` executado **localmente** e commitado **antes** de ir para produção.

---

## Lição de Governança

> **Regra obrigatória (Gate de Schema):** toda alteração de schema deve passar por migration commitada no repositório — **nunca `pnpm db:push` direto em produção**. O schema em produção deve sempre ser derivável do histórico de migrations no repositório.

Esta regra deve ser adicionada à Skill v4.11 e ao `docs/BASELINE-PRODUTO.md`.

---

## Referências

- PR #414 (FIX_01+FIX_02+FIX_03) — mergeado em main
- PR #415 (chore/schema-sync-0063) — fechado conforme esta ADR
- Checkpoint Manus `dc6185b2`
