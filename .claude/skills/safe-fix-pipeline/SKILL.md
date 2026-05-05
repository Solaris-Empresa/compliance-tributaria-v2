---
description: "Full pipeline for fixing bugs in critical files: investigate → plan → implement → verify. Use before any Edit in pipeline-critical paths."
paths:
  - "server/lib/db-queries-*"
  - "server/routers/*"
  - "server/_core/trpc.ts"
---

# safe-fix-pipeline

Pipeline completo de 4 etapas para fix em arquivo crítico. Garante que cada bug em pipeline de dados passe por investigação, planejamento, implementação e verificação — bloqueando o atalho que produziu 4 fixes consecutivos errados em Sprint M3.10.

## Quando usar

Sempre que precisar editar:
- `server/lib/db-queries-*.ts`
- `server/routers/*.ts`
- `server/_core/trpc.ts`

Aplicável a bugfix, refactor, feature pequena, hotfix P0 (com adaptação).

## Argumento

`$ARGUMENTS` = arquivo-alvo + descrição curta do problema, ex:
- `/safe-fix-pipeline server/lib/db-queries-risks-v4.ts UI exibe 1 fonte quando há 3`

## Pipeline (4 etapas)

### Etapa 1 — INVESTIGATE

Invoque a skill `investigate-deep` no arquivo-alvo:

```
/investigate-deep <basename>
```

Ela produz `/tmp/investigate-${SID}-${BASE}.md` com 7 seções (purpose, imports, callers, tests, writers/readers, risks, plan, verification). Sem este arquivo, o hook `require-investigation.sh` bloqueia qualquer Edit em path crítico (exit 2).

**Saída obrigatória:** caminho do arquivo de evidência.

### Etapa 2 — PLAN

Com a evidência aberta, gere um **plano-diff** linha-a-linha. Estrutura:

```
ANTES (linhas X-Y):
  <trecho atual>

DEPOIS (linhas X-Y):
  <trecho novo>

JUSTIFICATIVA:
  - Vincular à evidência (seção Risks ou Writers/Readers)
  - Citar Lição/REGRA aplicável (#65 fluxo end-to-end, #66 spec sem dados, #67 try/catch graceful, #68 mono+JSON, etc)

EFEITOS DOWNSTREAM:
  - Quem consome o que esta função retorna?
  - Algum tipo/ENUM/schema correlato precisa atualizar junto? (Lição #64)
```

Anexar o plano como section adicional do arquivo de evidência ou como comment no PR.

### Etapa 3 — IMPLEMENT

Execute o Edit. O hook `require-investigation.sh` vai aceitar (evidence existe).

Regras inegociáveis:
1. **Um Edit = uma transformação coerente.** Não misture refactor + bugfix em uma operação.
2. **Atualize tipos correlatos no mesmo PR.** Se mudou retorno → atualize `type X` upstream. Se mudou ENUM → migration SQL (Lição #64).
3. **Não toque arquivos fora do plano.** Scope creep destrói rastreabilidade.

### Etapa 4 — VERIFY

Antes de commit:

| Verificação | Comando | Critério |
|-------------|---------|----------|
| TypeScript | `pnpm check` ou `npx tsc --noEmit` | Zero erros |
| Unit tests | `pnpm test:unit -- <basename sem .ts>` | PASS |
| Integration | `pnpm test -- <basename sem .ts>` (se aplica) | PASS |
| Format | `pnpm format` | Sem diff inesperado |
| DoD positivo | Query SQL/runtime que prova fix funcionou | Output esperado |
| **DoD negativo (REGRA-ORQ-34 Protocolo 3)** | Query SQL que DEVE retornar 0 linhas (estado proibido) | 0 linhas |

Se DoD negativo retornar > 0 linhas: **NÃO commitar.** Bug ainda presente.

Se a mudança é em pipeline de dados (REGRA-ORQ-34), também testar em **3 cenários ortogonais**:
1. Greenfield (projeto novo, criado após deploy do PR)
2. Pré-existente com estado válido
3. Edge case explícito do bug

## Hotfix P0 (REGRA-ORQ-11)

Para hotfix P0 onde investigação completa é inviável dentro do SLA:

- Etapa 1 (investigate) **mantida obrigatória** — produzir evidência mínima (5 min é o piso)
- Etapa 2 (plan) pode ser inline no PR body
- Etapa 4 (verify) DoD negativo **mantido obrigatório**

O hook não distingue P0 de não-P0; evidência é exigida em ambos.

## Vinculadas

- REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol
- REGRA-ORQ-28 — Triade de Garantia (test contracts)
- Skill: `investigate-deep` (Etapa 1)
- Hook: `.claude/hooks/require-investigation.sh`
- Lições #59, #65, #66, #67, #68 — pipeline de dados
- Post-mortem: `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`
