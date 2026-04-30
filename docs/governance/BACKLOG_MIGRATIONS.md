# Backlog Migrations

> Documento criado em 2026-04-30 como parte do fechamento retroativo HOTFIX-P0.
> Referência: `docs/data-quality/mutation-log-enum-status-perfil-entidade-2026-04-30.json`

## P1 — Bloqueantes para próxima feature de schema

### 1. Resolver conflito `cpie_analysis_history` que faz `pnpm db:push` falhar

- **Origem:** Tabela `cpie_analysis_history` já existe em produção TiDB, mas Drizzle tenta recriá-la durante `db:push`.
- **Impacto:** Qualquer PR que altere `drizzle/schema.ts` não consegue aplicar migrations automaticamente. Resultado: ALTERs manuais em produção (3 incidentes acumulados).
- **Fix proposto:** Ou DROP + recriar via migration formal, ou marcar como existente no journal do Drizzle.
- **Urgência:** Sem resolver isso, próximo PR de schema vai gerar 4.o incidente do mesmo padrão.

### 2. Validar migrations retroativas em ambiente limpo (dev container novo)

- **Objetivo:** Confirmar que o `.sql` gerado em `drizzle/migrations/manual/2026-04-30-retro-enum-status-perfil-entidade-archetype-columns.sql` de fato reproduz o schema de produção quando executado do zero.
- **Método:** Subir container MySQL/TiDB limpo, aplicar todas as migrations Drizzle + manual, comparar `SHOW CREATE TABLE projects` com snapshot.

## P2 — Process-fix

### 3. REGRA-ORQ-19 PROPOSTA: PR com label `db:migration` exige smoke pós-merge

Todo PR com label `db:migration` deve incluir smoke pós-merge obrigatório:
1. Verificar schema produção match TS (`SHOW CREATE TABLE` vs `drizzle/schema.ts`)
2. Smoke `createProject` (ou caller principal da tabela afetada)
3. Bloqueia promoção deploy se smoke falhar

### 4. Drift Manus.space sandbox vs git `origin/main`

- **Sintoma:** 5 incidentes acumulados onde Manus reporta SHAs (e.g., `e1ffc00`) que não existem no git.
- **Origem:** Cherry-pick interno em sandbox, não pull `origin/main`.
- **Ação:** Investigar com Manus pipeline em sessão dedicada. Considerar hook pré-checkpoint que valida `git merge-base`.

## P3 — Bugs identificados na auditoria M2 (não bloqueantes)

### 5. BUG-4 (P2): `porte_empresa` não normalizado para valores esperados pelo engine

- **Descrição:** O adapter `buildSeedFromProject` não normaliza `porte_empresa` para os valores esperados pelo archetype engine.
- **Impacto:** Pode gerar dimensões incorretas para empresas com porte não-padrão.

### 6. BUG-5 (P3): `financeiro` operationType sempre resulta em `inconsistente` sem `subnatureza_setorial`

- **Descrição:** Quando `operationType = 'financeiro'`, o adapter não define `subnatureza_setorial`, resultando em archetype `inconsistente`.
- **Impacto:** Projetos do setor financeiro terão confiança reduzida.

### 7. BUG-6 (P3): NCM truncado passa pelo adapter sem validação de formato

- **Descrição:** NCMs com formato incorreto (e.g., truncados) passam pelo adapter sem validação.
- **Impacto:** Pode gerar matches incorretos no dataset NCM.

### 8. P3: ~57 mocks quebrados na suite de testes (import `./diagnostic-source`)

- **Descrição:** 19 arquivos de teste importam `./diagnostic-source` que não existe ou foi movido.
- **Impacto:** Suite de testes com cobertura reduzida.
- **Ação:** Sprint de manutenção para restaurar cobertura de testes.
