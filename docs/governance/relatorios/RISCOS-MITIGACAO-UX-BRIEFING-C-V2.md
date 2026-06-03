# RISCOS & MITIGAÇÃO — UX-BRIEFING-C-V2 (Split View) · Issue #1344

**Data:** 2026-06-03 · **Autor:** Claude Code · **Triade ORQ-28 Artefato 3** · **PR:** #1354
**Status:** ANÁLISE — implementação bloqueada até `spec-aprovada` + despacho.

> Acompanha `AS-IS-TO-BE-UX-BRIEFING-C-V2-20260603.md` (v5), `DB-SPEC-UX-BRIEFING-C-V2.md` e `briefingAdapter.test.ts`.

## Matriz de riscos × mitigação × PR

| Risco | Prob. | Impacto | Mitigação | PR |
|---|---|---|---|---|
| **R1 — Fallback (98%) quebrado** | Alta | P0 | `if (result.mode === "legacy") return <LegacyBriefingView />` (contrato canônico do adapter — `{ mode: "legacy" }`, NÃO `null`) — **monolito completo**, não `<Streamdown>` parcial (N2-c) | PR-3 |
| **R2 — Regressão E2E z17 (7 testids)** | Média | P0 | Preservar os 7 `data-testid` listados no UX_DICTIONARY §11 + strings de seção | PR-2 |
| **R3 — Double-encoding (DP-19)** | Alta | P1 | `typeof bs === "string" ? JSON.parse(bs) : bs` no adapter; nunca `JSON.parse` sobre objeto (Lição #72) | PR-1 |
| **R4 — BUG-F4 `confidence_score` tipo errado** | Média | P1 | Ler como **OBJECT** `{nivel_confianca}` (não number) — DB-SPEC confirmado (`ai-schemas.ts:237`) | PR-1 |
| **R5 — Regressão MatrizesV3/PlanoAcaoV3** | Baixa | P0 | **Zero toque** em `MatrizesV3.tsx:293` e `PlanoAcaoV3.tsx:808` (briefingContent input read-only) no PR-0 | PR-0 |
| **R6 — `getRoundsSummary` suprimido** | Alta | P1 | `RoundsSummarySection` obrigatório no Split View — "Intensidade de Aprofundamento por CNAE" é elemento obrigatório (N1) | PR-2 |
| **R7 — Prefixo legado no `source_reference`** | Alta | P2 | `strip("Aplicação obrigatória: ")` no adapter para dados existentes (93 projetos; N2-b) | PR-1 |
| **R8 — Flag `legacy` não byte-idêntico** | Baixa | P0 | Smoke `flag=legacy` antes do merge do PR-5 (baseline do monolito) | PR-5 |

## Lacunas de verificação executável (a fechar antes do código de UI)
1. **Baseline "golden master"** do `/briefing-v3` atual (2 projetos: structured + NULL) — oráculo de não-regressão (R1/R8).
2. **`briefingAdapter.test.ts`** — skeleton entregue (Triade A2); transformar `it.todo`→`it` no PR-1.
3. **Shape sampling dos 93 projetos** (bundle Manus) — define os casos do adapter (R3/R4/R7).
4. **Strings assertadas pelo z17** (bundle Manus) — lista canônica a preservar (R2).

## Estratégia de rollback (4 níveis)
1. CI — tsc/testes vermelhos bloqueiam merge.
2. Flag — `BRIEFING_UI_VERSION=legacy` restaura o monolito instantaneamente.
3. Monolito preservado ≥1 sprint após F5.
4. `git revert` do PR-5 (flip) — barato (F0-F2 não tocam o default).

## Vinculadas
Issue #1344 · REGRA-ORQ-20/28/34 · DP-01/DP-19 · TK-1..5 · Lição #64/#65/#72/#87 · `UX_DICTIONARY.md §UX-BRIEFING-C-V2`.
