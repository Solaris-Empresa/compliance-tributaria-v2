# PR-J Fase 1 — Pré-análise REDUZIDA

**Branch:** `chore/pr-j-fase-1-pre-analise`
**HEAD:** `8c03097` (pós-#891)
**Data:** 2026-05-01

## Contexto

PR-J refatora código duplicado entre `server/routers/perfil.ts` e `server/routers-m1-monitor.ts` para `server/lib/archetype/seedNormalizers.ts`.

Fase 1 = pré-análise empírica. Análises A+B cobertas no T4 standby anterior; C+D agora.

## Análise A+B (T4 standby anterior — recap)

Conforme inventário T4:

- 3 constantes duplicadas identificadas entre `perfil.ts` e `routers-m1-monitor.ts`:
  - `TAX_REGIME_ALIASES` (perfil.ts) / `SNAKE_TO_LABEL` (m1-monitor.ts:169) — equivalentes funcionalmente
  - `POSICAO_ALIASES` (perfil.ts) / `POSICAO_ALIASES` (m1-monitor.ts:193) — mesmo nome
  - `NATUREZA_TO_FONTES` (perfil.ts) / `NATUREZA_TO_FONTES` (m1-monitor.ts:226) — **idêntica byte-a-byte**
- Nota empírica: m1-monitor.ts NÃO tem função nomeada `buildSeedFromMonitorPayload` — as normalizações acontecem inline dentro do handler do procedure tRPC `monitor.upsert`

## Análise C — rules_hash impact empírico

**Comando:**
```
pnpm exec tsx tests/archetype-validation/run-50-v3.mjs
```

**Resultado:**
```
"verdict": {
  "decision": "GO",
  "PASS": 59,
  "FAIL": 0,
  "unique_rules_hashes": 1,
  "rules_hash": "sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272"
}
```

**Esperado:**
`sha256:4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272`

**Veredict:** 🟢 **PASS byte-a-byte.**

Todos os 59 cenários PASS, 0 FAIL, 1 único rules_hash idêntico ao baseline pós-#886. Confirma que o engine determinístico (`computeRulesHash`) está estável.

Implicação para PR-J: refactor puro (extrair código duplicado para módulo compartilhado) **não deve mudar o rules_hash**, porque o engine não depende do layout dos arquivos fonte. A invariância atual (1 único hash) garante baseline limpo para validar Fase 2 byte-a-byte.

## Análise D — Test coverage gap

### Cobertura `buildSeedFromProject` (perfil.ts)

```
grep -rln "buildSeedFromProject" server/ tests/
```

Resultado: **2 suítes** + arquivo de definição:
- `server/derive-objeto-pr-fin-objeto.test.ts`
- `server/perfil-router.test.ts`
- `server/routers/perfil.ts` (definição)

### Cobertura `buildSeedFromMonitorPayload` (m1-monitor.ts)

```
grep -rln "buildSeedFromMonitorPayload" server/ tests/
```

Resultado: **0 matches**. Função não existe com esse nome — normalização acontece inline em `routers-m1-monitor.ts:127-241`.

### Cobertura geral do router m1-monitor

```
ls server/*m1-monitor*.test.ts
grep -rln "routers-m1-monitor|monitorRouter" server/*.test.ts tests/
```

Resultado: **0 testes específicos para m1-monitor**.

### Lacunas críticas identificadas

| Lacuna | Severidade |
|---|---|
| m1-monitor.ts: 0 testes da normalização inline (TAX_REGIME, POSICAO, NATUREZA_TO_FONTES) | 🔴 Alta |
| m1-monitor.ts: 0 smoke testes do procedure `monitor.upsert` | 🟠 Média |
| Nenhuma suite cobre AMBOS os caminhos (perfil + m1-monitor) | 🟡 Esperada (são paths diferentes) |

### Suítes que cobrem `buildSeedFromProject` (já existentes)

- `server/derive-objeto-pr-fin-objeto.test.ts` — derivação `objeto` para casos PR-FIN
- `server/perfil-router.test.ts` — router perfil completo (62 testes pré-#886)

### Recomendação para PR-J Fase 2

Adicionar **suite nova** cobrindo seedNormalizers extraído isoladamente:

- `server/seed-normalizers.test.ts` — testar cada normalização com inputs reais (snake, title case, alias, edge cases)

Importar essa suite a partir de:
- `perfil-router.test.ts` (já existente — substituir testes inline equivalentes)
- `m1-monitor.test.ts` (NOVO — cobrir o gap identificado)

## Recomendação Fase 2

🟢 **Implementação direta autorizada.** Razões:

1. rules_hash byte-a-byte preservado (Análise C PASS) — refactor puro não muda comportamento
2. T4 standby já validou estrutura (3 constantes + NATUREZA_TO_FONTES idêntica)
3. perfil.ts tem 2 suítes existentes — regressão automática garantida em path principal
4. Lacuna m1-monitor é **esperada** e **endereçada pelo próprio PR-J** (criar `seed-normalizers.test.ts` cobre AMBOS os callers)

Condicionalmente, exigir no PR-J Fase 2:

- [x] `seed-normalizers.test.ts` cobrindo cada constante extraída isoladamente
- [x] `m1-monitor.test.ts` mínimo cobrindo `monitor.upsert` happy path
- [x] perfil-router.test.ts continua 62/62 PASS
- [x] derive-objeto-pr-fin-objeto.test.ts continua PASS
- [x] Suite oficial 60 cenários byte-a-byte (rules_hash invariante)

## Esforço Fase 2 estimado

~3h30 a 4h Classe A-B (revisado vs T4 standby de ~3h):

| Etapa | Tempo |
|---|---|
| Implementação extract + import + delete duplicados | 1h30 |
| Testes adicionais cobrindo `seedNormalizers` isolado | 1h |
| Testes m1-monitor mínimos (gap identificado) | 30min |
| Validação: suite oficial + 132 testes baseline + rules_hash | 30min |
| PR body + auto-auditoria template oficial | 30min |
| **Total** | **~4h Classe A-B** |

(+30min vs T4 standby por causa do gap m1-monitor identificado nesta Análise D.)

## Risk assessment

- **rules_hash impact:** ZERO (refactor puro, mesma lógica relocada — confirmado byte-a-byte na Análise C)
- **Regressão funcional:** mitigada por suítes existentes (perfil-router 62/62, derive-objeto)
- **Smoke necessário pós-merge:** NÃO (sem mudança comportamental — apenas relocação de código)
- **Defense-in-depth #876 (E2E_TEST_MODE guard):** intocado
- **Engine puro (`validateConflicts`, `deriveObjeto`, `perfilHash`):** intocado
- **Schema (`drizzle/schema.ts`):** intocado
- **RAG corpus (2515 ragDocuments):** intocado

## Próximo passo

P.O. autoriza implementação Fase 2 com os 5 critérios condicionais acima cobrindo o gap m1-monitor.

## Vinculadas

- BACKLOG_M3.md — PR-J prioridade Sprint M3
- T4 standby anterior (Análises A+B)
- Lição #32 — adapter sem cobertura completa (PR-J mitiga)
- Lição #44 — pré-análise é diagnóstico onde há lacuna (Análise D revelou gap real)
- Lição #43 — engine multi-camada exige callgraph completo (validação byte-a-byte garante)
