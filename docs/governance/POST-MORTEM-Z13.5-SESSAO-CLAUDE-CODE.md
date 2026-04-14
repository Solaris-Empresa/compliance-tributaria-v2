# POST-MORTEM Sprint Z-13.5 — Sessao Claude Code
**Data:** 13/04/2026 | **Duracao:** ~3h | **Operador:** Uires Tapajos
**Repo:** [Solaris-Empresa/compliance-tributaria-v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2)
**HEAD inicial:** `37ce1c2` (main) | **HEAD final:** `a4f9eac` (chore/gate0-schema-validation)

---

## 1. Resumo Executivo

Sessao focada em 2 alertas pre-UAT do engine de riscos v4.
Identificou-se que o `project-profile-extractor.ts` falhava em
extrair campos do `operationProfile` por duas causas raiz independentes:

1. **B-Z13.5-001:** `safeParseObject`/`safeParseArray` nao lidavam com JSON ja parseado pelo driver
2. **B-Z13.5-002:** Nomes de campo em portugues (`tipoOperacao`) vs nomes reais em ingles (`operationType`)

Apos os fixes, foi criado um sistema de governanca (Gate 0) para prevenir
esta classe de bugs permanentemente.

---

## 2. Cronologia de PRs

| # | PR | Titulo | Status | Merge | Commit |
|---|---|---|---|---|---|
| 1 | [#506](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/506) | fix(z13.5): profile extraction handles pre-parsed JSON | MERGED | 2026-04-13T19:05 | `e74809c` |
| 2 | [#508](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/508) | fix(B-Z13.5-002): suporte dual-schema operationProfile | MERGED | 2026-04-13T20:31 | `eddee39` |
| 3 | [#509](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/509) | fix(z13.5): complete operationProfile field mapping | MERGED | 2026-04-13T20:52 | `fee71a0` |
| 4 | [#510](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/510) | chore(governance): Gate 0 + DATA_DICTIONARY + db-schema-validator | MERGED | 2026-04-13T20:52 | `a4f9eac` |
| 5 | [#511](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/511) | docs: ESTADO-ATUAL.md v5.8 — Sprint Z-13.5 ENCERRADA | MERGED | 2026-04-13T20:54 | — |

---

## 3. Bugs Corrigidos — Analise Detalhada

### 3.1 B-Z13.5-001 — safeParseObject/safeParseArray tipo de driver

**Arquivo:** `server/lib/project-profile-extractor.ts` linhas 69–98
**PR:** [#506](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/506)
**Commit:** `e74809c`

**Sintoma:** `opProfile.tipoOperacao` retornava `undefined` mesmo com JSON valido no banco.

**Causa raiz:** O driver mysql2/TiDB pode retornar colunas JSON como objetos
ja parseados (nao string). As funcoes `safeParseArray(raw: string | null)` e
`safeParseObject(raw: string | null)` chamavam `JSON.parse(object)` que lancava
excecao silenciosa, retornando `{}` ou `[]`.

**Fix:** Alterar assinatura para `raw: unknown` e verificar `Array.isArray(raw)` /
`typeof raw === "object"` antes de tentar `JSON.parse`.

```typescript
// ANTES (quebrado)
function safeParseObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// DEPOIS (corrigido)
function safeParseObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try { /* JSON.parse */ } catch { return {}; }
  }
  return {};
}
```

**Impacto:** Todos os campos de `operationProfile`, `confirmedCnaes`, e `product_answers`
ficavam vazios para projetos onde o driver retornava objetos ja parseados.

---

### 3.2 B-Z13.5-002 — Nomes de campo EN vs PT

**Arquivo:** `server/lib/project-profile-extractor.ts` linhas 160–195
**PRs:** [#508](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/508) + [#509](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/509)
**Commits:** `eddee39` + `fee71a0`

**Sintoma:** Titulos de riscos mostravam "nas operacoes de **geral**" em vez de "nas operacoes de **comercio**".
Inferencia normativa retornava `inferred: 0` (nenhuma oportunidade).

**Causa raiz:** O extractor lia `opProfile.tipoOperacao` (portugues), mas a UI grava
`opProfile.operationType` (ingles). Todos os campos de operationProfile estavam com
nomes errados:

| Extractor (errado) | Banco/UI (real) | Tipo UI |
|---|---|---|
| `tipoOperacao` | `operationType` | string |
| `multiestadual` | `multiState` | boolean |
| `tipoCliente` | `clientType` | string[] |
| `meiosPagamento` | `paymentMethods` | string[] |
| `intermediarios` | `hasIntermediaries` | boolean |

**Fix em 2 etapas:**
- **PR #508:** Mapeou `operationType`, `multiState`, `clientType` com fallback dual-schema
- **PR #509:** Completou com `paymentMethods`, `hasIntermediaries` + normalizacao `clientType`

```typescript
// Fix final — dual-schema com fallback EN → PT
const tipoOperacao =
  (opProfile.operationType as string)    // schema novo (UI)
  ?? (opProfile.tipoOperacao as string)  // schema legado (testes)
  ?? null;
```

**Impacto:**
- `tipoOperacao = null` → fallback "geral" em todos os titulos
- `productNcms = []` → `hasAlimentarCnae` false → zero inferencias normativas
- `meiosPagamento = null` → split_payment trigger nunca disparava

---

## 4. Arquivos Modificados — Mapa Completo

### 4.1 Codigo (runtime)

| Arquivo | PRs | Linhas alteradas | Descricao |
|---|---|---|---|
| `server/lib/project-profile-extractor.ts` | #506, #508, #509 | ~80 | safeParseObject/Array + dual-schema mapping |
| `server/lib/normative-inference.ts` | #506 | +7 | console.warn quando cnaes/NCMs vazios |

### 4.2 Testes

| Arquivo | PR | Testes |
|---|---|---|
| `server/lib/sprint-z13.5-engine-tests.test.ts` | #506 | 5 testes (C1–C5: risk_key, evidencias, severidade, RAG timeout, merge) |
| `server/lib/normative-inference.test.ts` | pre-existente | 2 testes (passando) |

### 4.3 Governanca (Gate 0)

| Arquivo | PR | Descricao |
|---|---|---|
| `docs/governance/DATA_DICTIONARY.md` | #510 | Dicionario de 60 campos, 8 tabelas, dual-schema EN/PT |
| `.claude/agents/db-schema-validator.md` | #510 | Agente read-only Gate 0 com protocolo de 8 passos |
| `CLAUDE.md` (secao Gate 0) | #510 | Regra obrigatoria pre-implementacao |

### 4.4 Scripts auxiliares

| Arquivo | PR | Descricao |
|---|---|---|
| `scripts/seed-test-gaps.mjs` | #508 | Seed de gaps para teste M3 |
| `scripts/test-m3-m5.mjs` | #508 | Script de teste M3/M5 |

---

## 5. Links Rapidos — GitHub

### Pull Requests
- **#506** — https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/506
- **#508** — https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/508
- **#509** — https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/509
- **#510** — https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/510
- **#511** — https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/511

### Arquivos-chave (links diretos para main)
- [project-profile-extractor.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/lib/project-profile-extractor.ts)
- [normative-inference.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/lib/normative-inference.ts)
- [risk-engine-v4.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/lib/risk-engine-v4.ts)
- [db-queries-risks-v4.ts](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/server/lib/db-queries-risks-v4.ts)
- [DATA_DICTIONARY.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md)
- [db-schema-validator.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.claude/agents/db-schema-validator.md)
- [CLAUDE.md (Gate 0)](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/CLAUDE.md#gate-0--verificacao-de-schema-obrigatorio)

### Branches
- `fix/z13.5-profile-extraction` — PR #506
- `fix/z13.5-operation-profile-fields` — PR #509
- `chore/gate0-schema-validation` — PR #510

---

## 6. DATA DICTIONARY — Referencia Rapida

O dicionario completo esta em [`docs/governance/DATA_DICTIONARY.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/governance/DATA_DICTIONARY.md).

### 6.1 operationProfile — Mapeamento dual-schema

Este e o mapeamento mais critico. A UI grava em ingles, projetos legados em portugues.
O extractor DEVE aceitar ambos com fallback EN → PT.

| Schema novo (UI) | Schema legado (PT) | Tipo |
|---|---|---|
| `operationType` | `tipoOperacao` | string |
| `multiState` | `multiestadual` | boolean |
| `clientType` | `tipoCliente` | string[] |
| `paymentMethods` | `meiosPagamento` | string[] |
| `hasIntermediaries` | `intermediarios` | boolean |

### 6.2 Armadilhas de nome (campos que NAO sao o que parecem)

| Voce pode assumir | Nome REAL | Tabela |
|---|---|---|
| `is_active` | `active` (tinyint) | regulatory_requirements_v3 |
| `is_active` | `active` (tinyint) | normative_product_rules |
| `is_active` | `status` ('ativo'/'inativo') | risk_categories |
| `content` ou `text` | `conteudo` | ragDocuments |
| `fonte` | `source` | project_gaps_v3 |

### 6.3 Aviso de tipo de driver

O driver mysql2/TiDB pode retornar JSON como:
- `string` → precisa de `JSON.parse()`
- `object`/`array` ja parseado → NAO usar `JSON.parse()`

**Regra:** Sempre usar `safeParseObject()` / `safeParseArray()` de
`server/lib/project-profile-extractor.ts`.

---

## 7. Gate 0 — Protocolo para Futuros Fixes

### Quando acionar

ANTES de qualquer implementacao que toca banco de dados.
Sem excecao — nem para fixes "simples".

### Quem faz o que

| Passo | Responsavel | Acao |
|---|---|---|
| 1 | **Orquestrador** | Consultar `docs/governance/DATA_DICTIONARY.md` |
| 2 | **Manus** | Se campo nao documentado: `SHOW FULL COLUMNS FROM [tabela]` + `SELECT JSON_KEYS([campo]) FROM [tabela] LIMIT 3` |
| 3 | **Orquestrador** | Confirmar nomes reais, atualizar DATA_DICTIONARY se necessario |
| 4 | **Claude Code** | Implementar somente com nomes confirmados |

### Agente automatizado

Arquivo: `.claude/agents/db-schema-validator.md`
Acionar quando um prompt mencionar tabelas, colunas, ou campos JSON.
O agente executa queries de leitura e reporta LIBERAR ou BLOQUEAR.

---

## 8. Verificacao — Bugs Prevenidos pelo Gate 0

| Bug | Sprint | Causa | Gate 0 preveniria? |
|---|---|---|---|
| B-Z13-001 | Z-13 | `is_active` → `active` (regulatory_requirements_v3) | SIM — documentado como "NAO is_active" |
| B-Z13-003 | Z-13 | `is_active` → `active` (normative_product_rules) | SIM — documentado como "NAO is_active" |
| B-Z13-004 | Z-13 | `risk_category_code` nao propagado | SIM — campo documentado |
| B-Z13.5-001 | Z-13.5 | safeParseObject tipo de driver | SIM — secao de aviso de driver |
| B-Z13.5-002 | Z-13.5 | `tipoOperacao` → `operationType` | SIM — dual-schema documentado |

**5 de 5 bugs cobertos pela governanca atual.**

---

## 9. Testes — Estado Pos-Fixes

| Suite | Resultado | Comando |
|---|---|---|
| tsc --noEmit | 0 erros | `pnpm check` |
| server/lib/ (unit) | 124/124 PASS | `npx vitest run server/lib/` |
| Z-13.5 engine (C1–C5) | 5/5 PASS | `npx vitest run server/lib/sprint-z13.5-engine-tests.test.ts` |
| normative-inference | 2/2 PASS | `npx vitest run server/lib/normative-inference.test.ts` |

### UAT Gate E — Status

O plano de UAT (T1–T6) foi preparado como Playwright spec em
`tests/e2e/uat-gate-e-z13.5.spec.ts` mas nao foi executado contra producao
porque o endpoint `auth.testLogin` esta bloqueado em prod (`E2E_TEST_MODE != true`).

**Para executar UAT pos-deploy:**
1. Garantir que PRs #509 e #510 estao deployados
2. Deletar riscos existentes do projeto 30382 (gerados com codigo antigo)
3. Regenerar riscos via "Gerar Riscos v4"
4. Verificar: titulos com "comercio" (nao "geral"), inferred >= 2

---

## 10. Licoes Aprendidas

### O que deu errado
1. **Campos assumidos sem verificar banco.** O extractor foi escrito com nomes PT
   sem consultar o schema real. Custou 2 PRs e ~2h de debug.
2. **Driver behavior nao documentado.** O mysql2 retorna JSON como object em vez de
   string em certos contextos. Nao havia documentacao sobre isso.
3. **Falta de UAT pre-merge.** Os fixes foram mergeados antes da validacao E2E completa.

### O que fizemos para prevenir
1. **DATA_DICTIONARY.md** — 60 campos documentados em 8 tabelas
2. **db-schema-validator.md** — Agente automatizado que verifica schema antes de codar
3. **Gate 0 no CLAUDE.md** — Regra obrigatoria com papeis definidos
4. **Secao de aviso de driver** — Documentacao sobre comportamento do mysql2/TiDB

### Recomendacao para futuras sprints
- Executar Gate 0 religiosamente, inclusive para "fixes simples"
- Atualizar DATA_DICTIONARY quando criar novas tabelas/campos
- Testar com projeto real (ID 30382) antes de fechar UAT
- Configurar E2E_TEST_MODE no staging para permitir testes automatizados
