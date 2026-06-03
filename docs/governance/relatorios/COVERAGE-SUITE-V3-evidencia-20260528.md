# RELATÓRIO DE EXECUÇÃO — COVERAGE-SUITE-V3 · PARCIAL (Bloco 1)

**Data/Hora:** 2026-05-28 11:31:26 UTC (PASSO 3 executado em 08:30:53 UTC)
**HEAD main:** `bb8a0e1bd465ac64a942dcf5f75a7a133a3e5f01`
**Executor:** Claude Code (Manus pendente para Bloco 2 / Campanha — credencial DATABASE_URL ausente nesta máquina)
**DATABASE_URL:** ❌ ausente no ambiente do Claude Code → **Regra #4 do despacho acionada** (Bloco 2 + Campanha NÃO executados)

---

## PASSO 1 — Sync + confirmação de HEAD

```text
HEAD: bb8a0e1bd465ac64a942dcf5f75a7a133a3e5f01

bb8a0e1 chore(governance): auditoria fim-de-sessão v7.70 (2026-05-28) — campanha NCM 2700001 + DIAG-COVERAGE-03 (#1279)
eba8086 test(coverage): expandir suite p/ 13 perfis + e2e-alignment (DIAG-COVERAGE-03 V3) (#1284)
11c4b61 test(coverage): suite 57/57 cobertura CNAE/NCM + Lição #107 (#1278)
e8407ff fix(rag): injecao deterministica Art. 197 no pool de Q.NCM (D1-C) (#1274)
3c596d5 docs(governance): registrar Licao #101 — boundary por match-de-grupo (#1272)
```

✅ **PR #1284 presente em main** (`eba8086`).

---

## PASSO 2 — TypeScript

```text
$ pnpm tsc --noEmit
(zero linhas de output)
exit code: 0
```

✅ **Resultado: 0 errors.**

---

## PASSO 3 — Bloco 1 (sem DB)

### Comando executado (e ressalva técnica)

```bash
pnpm vitest run \
  server/integration/coverage-11-profiles.test.ts \
  server/integration/e2e-alignment.test.ts \
  --reporter=verbose
```

**Ressalva técnica (anomalia do despacho):** o despacho exige `--forceExit` como obrigatório. **Esta flag não existe no vitest 2.1.9** — é flag específica do Jest. Tentativa de uso retorna `CACError: Unknown option --forceExit`. Flags equivalentes no vitest 2.1.9 são `--pool`, `--isolate`, `--teardownTimeout` — nenhuma é equivalente direta. Detalhes na seção "Anomalias" abaixo. **Sem `--forceExit`, o Bloco 1 (sem DB) completou normalmente em 3.11s sem travamento** — o travamento descrito no despacho seria específico do Bloco 2 (pool MySQL TiDB, issue #1043), não do Bloco 1.

### Output literal — tail da execução

```text
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T01 soja NCM 1201.90.00 + CNAE 0115-6/00 (PID 960015): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T02 milho NCM 1005.90.10 + CNAE 0111-3/02 (PID 960016): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T03 café NCM 0901.21.00 + CNAE 1081-3/02 (PID 960017): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T04 diesel NCM 2710.19.21 transportadora 4930-2/02 (PID 960018): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T06 gasolina NCM 2710.12.59 distribuidora 4681-8/01 (PID 960021): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T08 cerveja NCM 2203.00.00 distribuidora 4635-4/02 (PID 960023): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T09 medicamentos NCM 3004.90.99 + CNAE 2121-1/01 (PID 960024): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — shouldInjectArt197 (cenários do evidence-13-full.json) > T13 TI sem NCM + CNAE 6201-5/01 (PID 960028): false
✓ server/integration/e2e-alignment.test.ts > E2E × Gates — pending_vigency (T01 confirma Arts. 245-250 via Decreto) > produtor_rural_credito (vigência 2027-01-01) NÃO injeta para 0115-6/00 em 2026-05-28
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P3 (2833-0/00 + NCM 8436.99.00) → shouldInjectArt197 = true
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P1 (4120-4/00, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P2 (6911-7/00, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P4 (4639-7/01, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P5 (4921-3/00, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P6 (6810-2/01, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P7 (6201-5/01, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P8 (8650-0/01, sem NCM 8436) → shouldInjectArt197 = false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P1 construtora (4120-4/00) → risco=true, oportunidade=true, locação=false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P6 imobiliária (6810-2/01) → oportunidade=true, locação=false (venda, não aluguel)
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 — gates hardcoded por perfil (PURO, sem DB) > P2 advogado (6911) e P7 TI (6201) → nenhum gate de imóveis
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M3 — pending_vigency bloqueia injeção (hard block) > CNAE 0115-6/00 (P9 soja) + categoria com vigência 2027-01-01 em 2026-05-28 → false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M3 — pending_vigency bloqueia injeção (hard block) > CNAE 0115-6/00 (P9 soja) + categoria universal com vigência 2026-04-30 → true
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > soja NCM 1201.90.00 + CNAE 0115-6/00: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > milho NCM 1005.90.10 + CNAE 0111-3/02: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > café NCM 0901.21.00 + CNAE 1081-3/02: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > diesel NCM 2710.19.21 + CNAE 4930-2/02: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > gasolina NCM 2710.12.59 + CNAE 4681-8/01: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > cerveja NCM 2203.00.00 + CNAE 4635-4/02: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M4 — shouldInjectArt197 negativos (NCM real dos 13 cenários E2E Manus) > medicamentos NCM 3004.90.99 + CNAE 2121-1/01: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M5 — shouldInjectArt197 positivos (família NCM 8436 + CNAE grupo 28) > NCM 8436.99.00 + CNAE 2833-0/00: true (caso canônico D1-C)
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M5 — shouldInjectArt197 positivos (família NCM 8436 + CNAE grupo 28) > NCM 8436.10.00 + CNAE 2833-0/00: true (plantio)
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M5 — shouldInjectArt197 positivos (família NCM 8436 + CNAE grupo 28) > NCM 8436.99.00 + CNAE atacadista 4639-7/01: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M5 — shouldInjectArt197 positivos (família NCM 8436 + CNAE grupo 28) > NCM 8436.99.00 + CNAE transportadora 4930-2/02: false
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M6 — GAPS documentados como regressão (snapshot textual) > GAP-COOPERATIVA: zero categorias cooperativa em risk_categories (confirmado Manus 28/05)
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M6 — GAPS documentados como regressão (snapshot textual) > GAP #1219: NBS 1.0401.11.00 (frete) sem filtro setorial (1.237 chunks NBS universais)
✓ server/integration/coverage-11-profiles.test.ts > BLOCO 1 / M6 — GAPS documentados como regressão (snapshot textual) > GAP-IS-CATEGORIA: imposto_seletivo não tem categoria data-driven (hardcode em risk-eligibility-is-ncm-cnae.ts)

 Test Files  2 passed (2)
      Tests  36 passed | 13 skipped (49)
   Start at  08:30:53
   Duration  3.11s (transform 486ms, setup 0ms, collect 4.03s, tests 15ms, environment 0ms, prepare 852ms)
```

✅ **Resultado: 36 passed | 13 skipped | 0 failed · Duration 3.11s**

Os **13 skipped** são o Bloco 2 (`dbDescribe`) — não rodam sem `DATABASE_URL`. Os **36 passed** distribuem-se:
- `e2e-alignment.test.ts`: **9 PASS** (8 shouldInjectArt197 + 1 pending_vigency)
- `coverage-11-profiles.test.ts` Bloco 1: **27 PASS** (8 art197 + 3 imóveis + 2 M3 + 7 M4 + 4 M5 + 3 M6)

---

## PASSO 4 — Bloco 2 com DATABASE_URL

❌ **NÃO EXECUTADO — Regra #4 do despacho.**

```text
$ if [ -n "$DATABASE_URL" ]; then echo set; else echo unset; fi
unset
```

A credencial **não foi fornecida** ao ambiente do Claude Code (RACI: "Manus: fornece DATABASE_URL antes de iniciar"). Não foi propagada via env var nem arquivo `.env`.

**Ação requerida do Manus:** rodar o Passo 4 conforme despacho:

```bash
DATABASE_URL="<TiDB SOLARIS>" pnpm vitest run \
  server/integration/coverage-11-profiles.test.ts \
  server/integration/e2e-alignment.test.ts \
  --reporter=verbose
```

(Sem `--forceExit` — flag inexistente; ver Anomalias. Para o caso #1043 do pool MySQL: alternativa é envolver com `timeout 120s` no shell ou matar o processo após X segundos pós-`Test Files X passed`.)

Esperado pós-execução do Manus: **49 passed | 0 skipped | 0 failed**.

---

## PASSO 5 — Campanha NCM (7 arquivos) com DATABASE_URL

❌ **NÃO EXECUTADO — Regra #4 do despacho** (mesmo motivo do Passo 4).

Manifesto dos 7 arquivos da campanha NCM (verificados via `ls`):

```text
✓ server/integration/coverage-11-profiles.test.ts   (40 testes)
✓ server/integration/e2e-alignment.test.ts          (9 testes)
✓ server/lib/deterministic-grounding.test.ts        (18 testes)
✓ server/lib/art197-injection.test.ts               (5 testes)
✓ server/lib/portaria-grounding.test.ts             (4 testes)
✓ server/rag-retriever-d2-detector.test.ts          (6 testes)
✓ server/rag-retriever-d4-pool.test.ts              (5 testes)
                                              Total = 87 testes
```

Todos os 7 arquivos esperados pelo despacho **existem em `main`**.

Esperado pós-execução do Manus: **87 passed | 0 skipped | 0 failed** (com DB).

---

## Scorecard Final (parcial — aguarda Manus para Bloco 2 + Campanha)

| Métrica                  | Esperado    | Obtido                        | Status |
|--------------------------|-------------|-------------------------------|--------|
| TSC errors               | 0           | **0**                         | ✅     |
| Bloco 1 sem DB           | 36 PASS     | **36 PASS · 13 SKIPPED**      | ✅     |
| Bloco 2 com DB           | 49 PASS     | NÃO EXECUTADO (DATABASE_URL)  | ⏳     |
| Campanha NCM total       | ≥ 87        | NÃO EXECUTADO (DATABASE_URL)  | ⏳     |
| FAIL em qualquer step    | 0           | **0**                         | ✅     |

---

## Perfis dbDescribe — Resultado individual (P1–P13)

Todos os 13 perfis estão em **SKIPPED** (Bloco 2 não executa sem DB). `must_include` / `must_exclude` / `SOLARIS` esperados ficam declarados aqui para que o Manus possa comparar com a execução com DB:

| Perfil | CNAE       | `must_include` esperado            | `must_exclude` esperado            | SOLARIS | Resultado |
|--------|------------|------------------------------------|------------------------------------|---------|-----------|
| P1  Construtora        | 4120-4/00 | 7 cats (univ + imóveis + reabilitação) | 2 cats (produtor_rural, reduzida_30) | 16 | SKIPPED |
| P2  Advogado           | 6911-7/00 | 5 cats (univ + reduzida_30)         | 3 cats (imóveis, produtor_rural, 269/270) | 12 | SKIPPED |
| P3  Fab. Máquinas      | 2833-0/00 | 3 cats (split, confissao, aliquota_zero) | 3 cats (reduzida_30, imóveis, produtor_rural) | 12 | SKIPPED |
| P4  Atacadista         | 4639-7/01 | 3 cats (split, confissao, credito_presumido) | 2 cats (imóveis, produtor_rural) | 15 | SKIPPED |
| P5  Transp. Coletivo   | 4921-3/00 | 3 cats (split, confissao, transporte) | 2 cats (imóveis, produtor_rural) | 12 | SKIPPED |
| P6  Imobiliária        | 6810-2/01 | 3 cats (split, confissao, **imoveis_locacao** — bug #1277) | 2 cats (produtor_rural, reduzida_30) | 12 | SKIPPED |
| P7  TI/SaaS            | 6201-5/01 | 2 cats (split, confissao)           | 3 cats (reduzida_30, imóveis, produtor_rural) | 12 | SKIPPED |
| P8  Saúde              | 8650-0/01 | 3 cats (split, confissao, reduzida_30) | 2 cats (produtor_rural, imóveis) | 12 | SKIPPED |
| P9  Soja               | 0115-6/00 | **12 cats** (11 universais + produtor_rural) | 6 cats setoriais não-aplicáveis | 12 | SKIPPED |
| P10 Cooperativa Milho  | 0111-3/02 | **12 cats** (idêntico a P9 — GAP #1280 cooperativa ausente) | 6 cats setoriais não-aplicáveis | 12 | SKIPPED |
| P11 Transp. Carga      | 4930-2/02 | **11 cats** universais APENAS (GAP #1281) | 7 cats (incl. transporte — categoria existe mas 4930-2 fora) | 12 | SKIPPED |
| P12 Combustíveis       | 4681-8/01 | **11 cats** universais APENAS (GAP #1282 IS) | 7 cats setoriais não-aplicáveis | 12 | SKIPPED |
| P13 Bebidas            | 4635-4/02 | **11 cats** universais APENAS (GAPs #1282 IS + #1283 SOL-subclasse) | 6 cats setoriais | 12 (não 15) | SKIPPED |

---

## Gaps documentados — comportamento esperado em runtime

| Gap            | Issue  | Esperado (JSDoc)                                            | Runtime (Bloco 1 puro)         | Bloco 2 (Manus) |
|----------------|--------|-------------------------------------------------------------|--------------------------------|-----------------|
| GAP-COOPERATIVA   | #1280  | 12 cats em P10 (sem `regime_cooperativas`)                  | ✅ M6 snapshot=0 confirmado em runtime | ⏳ pendente |
| GAP-TRANSPORTE    | #1281  | 11 cats em P11 (sem `regime_diferenciado_transporte`)       | ⏳ depende do Bloco 2          | ⏳ pendente |
| GAP-IS-CATEGORIA  | #1282  | 11 cats em P12/P13 (sem `imposto_seletivo`)                 | ✅ M6 snapshot=false confirmado em runtime | ⏳ pendente |
| GAP-SOL-SUBCLASSE | #1283  | P13 = 12 perguntas SOLARIS (não 15)                          | ⏳ depende do Bloco 2          | ⏳ pendente |
| GAP #1219         | #1219  | NBS 1.0401.11.00 sem filtro setorial                         | ✅ M6 snapshot=false confirmado em runtime | n/a (não Bloco 2) |

Os **3 testes M6 do Bloco 1 puro confirmaram em runtime** o estado dos snapshots textuais (zero categorias cooperativa; IS sem categoria; NBS sem filtro setorial). Quando o gap for resolvido (e.g. NEW-COOPERATIVA mergeada), o M6 correspondente **deve falhar** intencionalmente para forçar atualização do `must_include` do perfil.

---

## Anomalias

### 1. Flag `--forceExit` exigida pelo despacho não existe no vitest 2.1.9

**Output literal do erro ao tentar:**

```text
file:///D:/rag--uires/.../vitest/dist/chunks/cac.CB_9Zo9Q.js:403
          throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
                ^
CACError: Unknown option `--forceExit`
    at Command.checkUnknownOptions (...)
```

**Causa:** `--forceExit` é flag do **Jest**, não do vitest. Vitest 2.1.9 oferece (via `npx vitest --help`):

- `--isolate` (default true)
- `--pool <pool>` (default `threads`)
- `--poolOptions <options>`
- `--teardownTimeout <timeout>` (default 10000)

**Nenhuma é equivalente direta** a `--forceExit`.

**Impacto na execução de hoje:** zero — Bloco 1 (sem DB) completou em 3.11s sem travamento (pool MySQL não está envolvido). O travamento descrito no despacho é específico do **Bloco 2 com pool TiDB Cloud (issue #1043 / driver mysql2)** — não do Bloco 1.

**Mitigações possíveis para o Manus rodar Bloco 2:**
1. `timeout 120s pnpm vitest run ...` (Git Bash / Linux) — mata o processo após X segundos pós-término dos testes.
2. Configurar `pool: 'forks'` + `poolOptions: { forks: { singleFork: true } }` em `vitest.config.ts` (workers em processo separado que termina ao final).
3. Adicionar `afterAll(async () => { await db.$client.end?.(); })` em setup global para fechar o pool explicitamente.
4. `process.exit(0)` no `globalTeardown` (mais agressivo, último recurso).

**Recomendação:** comunicar ao Manus que o flag `--forceExit` deve ser **removido do despacho** (não existe). Para mitigar #1043 no Bloco 2, usar a opção (1) `timeout 120s` no shell.

### 2. `DATABASE_URL` ausente no ambiente do Claude Code

Conforme RACI declarada do despacho, **Manus deve fornecer DATABASE_URL antes de iniciar**. Credencial não foi propagada para o ambiente do Claude Code (sem `.env` carregado, sem env var na sessão). Regra #4 do despacho acionada: Passos 1-3 executados (verde), Passos 4-5 NÃO executados.

### Outras observações

- Arquivos da campanha NCM e seus contadores conferem com o esperado pelo despacho.
- Working tree em `main`: limpo (untracked pré-existentes fora do escopo: `reports/battery-current/`, `scripts/backfill-risks-artigo-base-fix.ts`).
- Warnings `git fetch worktree Permission denied` (issue #1241 SUG-14) — não afetam funcionalidade.

---

## Resumo executivo

```text
🟡 PARCIAL — Bloco 1 (sem DB) 100% verde, Bloco 2 e Campanha aguardam Manus

HEAD:                bb8a0e1
TSC errors:          0
Bloco 1 sem DB:      36 PASS · 13 SKIPPED · 0 FAIL (3.11s)
Bloco 2 com DB:      ⏳ pendente Manus (DATABASE_URL ausente)
Campanha NCM 87:     ⏳ pendente Manus (DATABASE_URL ausente)

Achados que o Manus PRECISA validar com DB:
  - 13 perfis do Bloco 2 → must_include / must_exclude / SOLARIS qMin-qMax
  - GAP-TRANSPORTE em P11 (categoria existe sem 4930-2 nos cnae_codes)
  - GAP-SOL-SUBCLASSE em P13 (qMin=12 confirmado vs 15 do despacho original)

Anomalias técnicas:
  - Flag --forceExit do despacho NÃO existe em vitest 2.1.9 (é Jest)
  - DATABASE_URL ausente no ambiente Claude Code (Regra #4 do despacho)
```

---

**Próximos passos sugeridos:**
1. Manus rodar Passo 4 (Bloco 2) com `DATABASE_URL` + `timeout 120s` (substituindo `--forceExit`).
2. Manus rodar Passo 5 (Campanha NCM 87 testes).
3. Manus atualizar este relatório com os outputs literais dos Passos 4-5.
4. Despacho do P.O. para evolução das 4 issues NEW (#1280-#1283) e/ou da residual #1277 (P6 locação — recomendação do audit v7.70).
