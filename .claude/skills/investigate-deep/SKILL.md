---
description: "Deep investigation before editing critical files. Reads full context, maps dependencies, documents findings to evidence file."
paths:
  - "server/lib/db-queries-*"
  - "server/routers/*"
  - "server/_core/trpc.ts"
---

# investigate-deep

Investigação obrigatória antes de Edit em arquivo crítico do pipeline. Sem esta investigação, o hook `require-investigation.sh` BLOQUEIA o Edit (exit 2).

## Quando usar

- Antes de editar `server/lib/db-queries-*.ts`
- Antes de editar `server/routers/*.ts`
- Antes de editar `server/_core/trpc.ts`

Caso canônico que motivou esta skill: Sprint M3.10 — 4 PRs consecutivos para o mesmo bug ("matriz mono-fonte") porque hipóteses foram implementadas sem rastrear `writers vs readers` upstream. Ver Lições #65/#66.

## Argumento

`$ARGUMENTS` deve ser o caminho ou basename do arquivo-alvo. Exemplos:
- `/investigate-deep server/lib/db-queries-risk-categories.ts`
- `/investigate-deep db-queries-risk-categories.ts`

## Procedimento

Execute na ordem. Não pule etapas — o hook só aceita evidência completa.

### 1. Resolver caminho absoluto e basename

```bash
TARGET="$ARGUMENTS"   # pode vir como caminho ou basename
# Se basename: localizar com Glob
# Se caminho: validar que existe
BASE=$(basename "$TARGET")
```

### 2. Recuperar session_id

```bash
SID=$(cat .claude/.investigate-cache/current-session.txt 2>/dev/null || echo "")
```

Se o arquivo não existir (sessão antiga ou bootstrap), faça uma tentativa de Edit no arquivo-alvo primeiro — o hook bloqueia mas escreve `session_id` como side-effect, depois retome esta skill.

### 3. Mapear contexto (4 dimensões)

Use **Read** para o arquivo completo, depois **Grep** para cada dimensão:

| Dimensão | Como mapear |
|----------|-------------|
| **Imports** | Read das primeiras ~40 linhas do arquivo — listar todos os `import` |
| **Callers** | `Grep` por `from .*<basename sem extensão>` em `server/` e `client/` |
| **Tests** | `Glob` por `**/<basename sem .ts>*.test.ts` e `**/<basename sem .ts>*.spec.ts` |
| **Schema** | Se toca tabela: `Grep` o nome da tabela em `drizzle/schema*.ts` |

### 4. Mapear writers vs readers (Lição #65)

Se a função consome ou produz dados de tabelas críticas (`project_gaps_v3`, `risks_v4`, `action_plans`, `tasks`):

- Liste **todas** as funções que ESCREVEM na tabela (com `source` ou discriminador)
- Liste **todas** as funções que LEEM da tabela (com filtro)
- Identifique escritas órfãs (writer sem reader correspondente)

Se a tabela for não-crítica para o caso, registrar `N/A`.

### 5. Escrever evidência

Crie o arquivo de evidência via **Write**. Path:

```
.claude/.investigate-cache/${SID}-${BASE}.md
```

Se `SID` vazio (bootstrap), use o fallback session-less:

```
.claude/.investigate-cache/${BASE}.md
```

**Importante:** o diretório `.claude/.investigate-cache/` é criado automaticamente pelo hook (mkdir -p idempotente). Está no `.gitignore`. NÃO usar `/tmp/` — em Windows Git Bash `/tmp` mapeia para `C:/Users/.../Temp` enquanto Node (Write tool) usa `D:\tmp`, paths divergentes (achado empírico Fase 3b).

Estrutura mínima do arquivo:

```markdown
# Investigation: <basename>

- **Target:** <caminho absoluto>
- **Session:** <session_id ou "session-less fallback">
- **Date:** <YYYY-MM-DD>

## Purpose
<1-2 frases — o que este arquivo faz>

## Imports
<lista>

## Callers
<lista — arquivo:linha>

## Tests
<lista — caminho do test file>

## Writers vs Readers (se aplica)
- Writers: <lista>
- Readers: <lista>
- Orphan writes: <lista ou "nenhuma">

## Risks
<áreas sensíveis: schema ENUM, queries TiDB com LIMIT, JSON multi-valor, etc>

## Plan
<o que vai mudar, em 2-3 bullets>

## Verification
<como confirmar pós-edit: tsc, testes, query SQL>
```

### 6. Confirmar evidência

Execute `ls -l .claude/.investigate-cache/*${BASE}*.md` para confirmar que o arquivo existe. O hook só permite Edit após esta confirmação.

## Importante

- **Não pule etapas.** O hook não detecta evidência rasa, mas você (orquestrador humano) sim — e o custo de uma Lição #65 é semanas.
- **Cada Edit em arquivo crítico** exige evidência **separada** (basename diferente = arquivo diferente).
- **Evidência expira na próxima sessão.** SessionStart atualiza `.claude/.investigate-cache/current-session.txt` com novo session_id, então arquivos `${SID_ANTIGO}-*.md` ficam órfãos automaticamente.

## Vinculadas

- REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol
- Lição #65 — Rastrear fluxo end-to-end
- Lição #66 — Spec sem dados é ilusão
- Hook: `.claude/hooks/require-investigation.sh`
- Skill complementar: `safe-fix-pipeline` (orquestra investigate → plan → implement → verify)
