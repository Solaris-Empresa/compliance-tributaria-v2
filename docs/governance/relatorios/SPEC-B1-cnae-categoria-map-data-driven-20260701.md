# SPEC B1 — Inferência de risco data-driven (`cnae_categoria_map`)

**Issue:** #1663 · **Origem:** AS-IS/TO-BE #1661 (Eixo 1 / B1) · **HEAD:** 7aec5a2f
**Classe:** C (novo subsistema: schema + engine refactor) · **Método:** REGRA-ORQ-41 · Gate 0 com `arquivo:linha`
**Status:** spec para aprovação P.O. — **implementação NÃO iniciada** (SPEC-FIRST, Rule #3)

---

## Objetivo

Tirar a inferência de risco por setor do **código hardcoded** e colocá-la em **dados** (tabela `cnae_categoria_map`), para que **adicionar um setor novo = INSERT (curadoria)**, não PR de 5 arquivos.

## AS-IS (determinístico)

| Componente | Estado | Evidência |
|---|---|---|
| Regras CNAE→categoria | **hardcoded em TS** | `normative-inference.ts:269` (construção civil, 8+1 `makeInferredRisk`) · `:233-251` (regime imóveis) |
| CNAE→setor | **Sets hardcoded** | `regime-imoveis-eligibility.ts:62-63` (`CONSTRUCAO_IMOVEIS_PREFIXOS`) |
| severidade/urgência/artigo | **inline** no `makeInferredRisk` (não lê `risk_categories`) | `normative-inference.ts:262` ("SKIP SEVERITY_TABLE — passa inline") |
| Metadados da categoria | **já data-driven** em `risk_categories` | `schema.ts:1917-1930` (codigo, severidade, urgencia, tipo, artigo_base, escopo) |

→ Adicionar setor = PR em `Categoria` type + `normative-inference` + `eligibility` + `categoria-labels` + `PLANS` + migration (Lição #74/#137).

## TO-BE

Tabela **`cnae_categoria_map`** (`cnae_prefix → categoria_codigo`) + engine genérico que:
1. lê as linhas ativas do map;
2. casa `project.cnaes` contra `cnae_prefix` (por `match_mode`);
3. respeita `regime_scope` (ex.: exceto Simples Nacional);
4. para cada match → `makeInferredRisk(categoria)` puxando **severidade/urgência/artigo de `risk_categories`** (FK) — não mais inline.

→ Setor novo = **INSERT em `cnae_categoria_map`** (+ `risk_categories` se categoria nova) + curadoria. **Zero PR de código.**

## Escopo (o que migra vs o que fica código)

| Regra | Migra p/ tabela? | Motivo |
|---|---|---|
| Construção civil (269+) — 9 categorias | ✅ **sim** (1º caso, paridade) | CNAE→categoria puro |
| Regime imóveis oport./locação/risco (233-251) | ✅ sim | CNAE→categoria puro |
| aliquota_zero (197) | ❌ **fica código** | depende de **NCM** (`loadNormativeRules`) — não é só CNAE |
| split_payment (payment trigger) | ❌ fica código | depende de **meio de pagamento** — não é CNAE |
| atacadista+lucro_real (219) | 🟡 fase 2 | CNAE + regime (cabe no `regime_scope`, mas validar) |

## DB-SPEC — `cnae_categoria_map`

```sql
CREATE TABLE cnae_categoria_map (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  cnae_prefix      VARCHAR(16)  NOT NULL,          -- "41" (prefixo) | "6810-2/01" (subclasse)
  match_mode       ENUM('prefix','exact') NOT NULL DEFAULT 'prefix',
  categoria_codigo VARCHAR(64)  NOT NULL,          -- FK lógica → risk_categories.codigo
  condicional      TINYINT      NOT NULL DEFAULT 0,-- 1 = risco potencial (confidence menor + nota)
  confidence       DECIMAL(3,2) NOT NULL DEFAULT 0.85,
  regime_scope     VARCHAR(32)  NULL,              -- NULL=qualquer · 'exceto_simples_nacional'
  vigencia_inicio  DATE NULL,
  vigencia_fim     DATE NULL,                      -- NULL = indeterminada (padrão ADR-0025)
  ativo            TINYINT      NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cnae_cat (cnae_prefix, categoria_codigo)
);
-- DOWN: DROP TABLE cnae_categoria_map;
```
Seed inicial: as 9 categorias de construção civil (`41,42,43,68` → cada `risco_*`) + regime imóveis, replicando exatamente os `makeInferredRisk` atuais (confidence 0.85 universais / 0.55 condicionais).

## Engine (refactor)

- `normative-inference.ts`: substituir os blocos `if (isConstrucaoCivilImoveis) {...8 push...}` + regime imóveis por **um loop genérico** `applyCnaeCategoriaMap(profile, map)`.
- Ler map via repositório com **cache TTL 1h** (padrão `getRiskCategories`, ADR-0025).
- Metadata (severidade/urgência/artigo) de `risk_categories` via `getCategoryByCodigo`.
- `regime-imoveis-eligibility.ts`: os Sets deixam de ser a fonte — viram fallback ou são removidos após paridade.

## Rollout (REGRA-ORQ-20)

Feature flag **`ENABLE_DATADRIVEN_INFERENCE`** (default OFF):
1. OFF → engine hardcoded atual (inalterado).
2. Seed + engine novo atrás da flag.
3. **Paridade** (DoD abaixo) em staging.
4. Flip ON → validar em greenfield → remover código hardcoded (fase de limpeza).

## DoD — paridade (REGRA-ORQ-34)

- **Positivo:** projeto construção civil (CNAE 4120) gera **as MESMAS 9 categorias** com flag ON vs OFF (query `SELECT categoria FROM risks_v4 ... ORDER BY categoria` idêntica).
- **Negativo (discriminante):** projeto **não-construção** (ex.: 4711) **não** ganha nenhuma `risco_*` da tabela.
- **Data-driven prova:** adicionar um setor de teste **só por INSERT** em `cnae_categoria_map` (sem PR de código) gera o risco.
- tsc 0 · suíte verde · greenfield (ORQ-34 Protocolo 1).

## Riscos (REGRA-ORQ-20)

| Risco | Sev | Mitigação |
|---|---|---|
| Regressão (setor deixa de gerar risco) | 🔴 | flag + paridade query before/after · greenfield |
| Metadata divergente (inline vs risk_categories) | 🟠 | validar severidade/urgência/artigo == atual antes do flip |
| Cache stale do map | 🟡 | TTL 1h + invalidação no seed (padrão ADR-0025) |

## Decisões pendentes do P.O.

1. **Escopo confirmado?** migrar só CNAE-puro (construção civil + regime imóveis); NCM/payment ficam código.
2. **Rollout por feature flag** (recomendo) vs direto.
3. **Metadata source:** engine passa a ler severidade/urgência/artigo de `risk_categories` (DRY) — confirmar (é melhoria, mas muda os valores inline atuais → paridade cobre).

## Vinculadas

#1663 (B1) · AS-IS #1661 · REGRA-ORQ-24/41/34/20 · ADR-0025 (categorias configuráveis — precedente) · Lição #74/#137 (propagar a todos os consumers) · `normative-inference.ts:269` · `regime-imoveis-eligibility.ts:62` · `schema.ts:1917`
