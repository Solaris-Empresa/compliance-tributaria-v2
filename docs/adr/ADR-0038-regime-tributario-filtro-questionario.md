# ADR-0038 — Gate Regime Tributário no Questionário SOLARIS Onda 1

**Status:** Proposto (aprovado P.O. — despacho v89)
**Data:** 2026-06-18
**HEAD:** `9ab44e62`
**Solicitante:** Dr. José Swami Rodrigues
**Classe:** C (REGRA-ORQ-24) — cross-cutting, ADR obrigatório antes da implementação
**Relacionado:** #1282 (IS gate NCM/CNAE), #1510 (V-10-FALLBACK), ADR-0037 (gate deploy), Lição #137 (consolidação)

---

## Contexto

O questionário SOLARIS Onda 1 exibe perguntas **sem filtro por regime tributário** do projeto (`simples_nacional` / `lucro_presumido` / `lucro_real`). Perguntas que só se aplicam ao regime regular (ex.: crédito presumido, CBS regime regular) aparecem para Simples Nacional → ruído + falso positivo de relevância.

Solicitação: Dr. José Swami Rodrigues — filtrar perguntas por regime do projeto. O campo `projects.taxRegime` já é capturado (`NovoProjeto.tsx:283` → coluna `schema.ts:89`, 3 valores).

---

## Decisões

### D1 — Semântica CNAE × Regime: **AND com fallback** (D-C)
Pergunta exibida **somente se CNAE e regime casarem**. Fallback obrigatório — **3 estados**:

| Estado do CNAE | Tratamento |
|---|---|
| 1. Ausente (não informado) | fallback → considerar **apenas regime** |
| 2. Informado, resolve para categoria **genérica/fallback** (V-10-FALLBACK; ex.: NCM 8436 → `bens_mercadoria_geral`) | fallback → considerar **apenas regime** |
| 3. Informado e mapeado a categoria específica | **AND normal** — ambos devem casar |

> **Rationale:** cobertura CNAE é parcial (V-10-FALLBACK ativo, #1510). AND estrito sem fallback gera **falso negativo silencioso** — perguntas relevantes somem sem aviso. "Não-mapeado" (estados 1 e 2) = ignorar a dimensão CNAE. `tax_regimes = NULL` = universal (exibe p/ todos os regimes).

### D2 — MEI: **fora de escopo do produto v-atual** (D-B)
**NÃO é ausência de lei** — a LC 214/2025 reconhece MEI em múltiplos artigos: **pg. 7, 10, 14-15, 41, 43, 111, 114-115** (crédito presumido, transição, disposições específicas). A exclusão é **decisão de produto**, não normativa.
**Implicação de design:** `tax_regimes` deve ser **extensível** — usar `text[]` (ou JSON array), **não** ENUM hard-limitado a 3 valores. Adicionar MEI/Simples no futuro = popular dado, sem `ALTER ENUM`. Issue de backlog se o escopo expandir.

### D3 — Quem preenche `tax_regimes`
**P.O./jurídico via painel Admin.** Claude Code cria coluna + helper; Dr. José popula o conteúdo (decisão normativa — quais perguntas se aplicam a quais regimes — não é técnica).

### D4 — Nome do campo
**`tax_regimes`** — consistência com `cnae_groups`.

### D5 — Helper único (Lição #137)
**`filterSolarisByContext({cnae, regime})`** — fonte única consumida por C1/C3/C4. Evita o anti-padrão dos filtros duplicados (mesma lição do A-5 / category-eligibility).

---

## Consumers afetados

| # | Consumer | `arquivo:linha` | Criticidade |
|---|---|---|---|
| C1 | `db.getOnda1Questions` (exibição LIVE) | `server/db.ts:1391` | 🔴 |
| C2 | procedure `fluxoV3.getOnda1Questions` (lê `project.taxRegime` + passa) | `routers-fluxo-v3.ts:5000` | 🔴 |
| C3 | `db.getSolarisQuestions` (injector) | `server/db.ts:1285` | 🔴 |
| C4 | `onda1Injector.getOnda1Questions` (gap-check) | `onda1Injector.ts:55` | 🟡 |
| C5 | `querySolarisByCnaes` (morto p/ q_solaris — airbag) | `solaris-query.ts:79` | 🟢 não inflar escopo |

---

## Fases (F0–F6)

| Fase | Entregável | Bloqueante |
|---|---|---|
| F0 | ADR-0038 aprovado (este doc) | — |
| F1 | Migration: coluna `tax_regimes` (JSON array / extensível) em `solaris_questions` + backfill NULL | F0 |
| F2 | Helper `filterSolarisByContext({cnae, regime})` (D1 — 3 estados) + testes unitários | F1 |
| F3 | Aplicar helper em C1/C3/C4 | F2 |
| F4 | Procedure C2 (`routers-fluxo-v3`) — lê `project.taxRegime` + passa | F3 |
| F5 | Admin UI — Dr. José popula `tax_regimes` | F3 |
| F6 | Import CSV `tax_regimes` (consistência com `cnae_groups`) | F5 |

---

## Riscos

| Risco | Gravidade | Mitigação |
|---|---|---|
| `tax_regimes = NULL` somem com AND estrito | 🔴 Alto | D1: NULL = universal (exibe p/ todos) + backfill NULL na F1 |
| Cobertura CNAE baixa → fallback regime ativa p/ maioria | 🟡 Médio | esperado/documentado — melhora com #1510 (V-10) |
| MEI adicionado futuramente | 🟢 Baixo | campo extensível (D2) — sem `ALTER ENUM` |

---

## DoD mínimo

- [ ] `tsc 0` erros
- [ ] `grep "tax_regimes" server/db.ts` → ≥ 1 (coluna criada)
- [ ] `grep "filterSolarisByContext" server/lib/` → ≥ 1 (helper único)
- [ ] Teste: CNAE ausente → fallback regime (D1 estado 1)
- [ ] Teste: CNAE genérico/fallback → fallback regime (D1 estado 2, V-10)
- [ ] Teste: CNAE mapeado + regime → AND normal (D1 estado 3)
- [ ] `grep "MEI" docs/adr/ADR-0038*.md` → ≥ 1 (D2 documentado com páginas LC)

---

## Vinculadas
- AS-IS/TO-BE: `docs/governance/relatorios/AS-IS-TO-BE-REGIME-TRIBUTARIO-QUESTIONARIO.md`
- #1282 (IS data-driven) · #1510 (V-10-FALLBACK) · Lição #137 (helper único) · REGRA-ORQ-24/41/43/44
