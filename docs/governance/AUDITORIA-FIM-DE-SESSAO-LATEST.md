# AUDITORIA-FIM-DE-SESSAO — LATEST

> Espelho do audit mais recente. Histórico completo em `docs/governance/audits/`.
> Mais recente: **v7.72** · 2026-06-12 · Sessão PDF-1 + Split View + LEGAL + CI.

→ Veja o arquivo completo: **[`audits/v7.72-2026-06-12-sessao-pdf1-split-view.md`](./audits/v7.72-2026-06-12-sessao-pdf1-split-view.md)**

---

## Resumo executivo (v7.72 — proposto pelo Claude Code, ratificação P.O. via merge)

```
VEREDITO DUAL (REGRA-ORQ-19 adendo):  PRODUTO 🟢  ·  PROCESSO 🟡

HEAD git:          ec523727  (origin/main = GitHub)
Deploy/checkpoint: eab433d7 (Manus-local = ec523727 + 3 arquivos NÃO-código)
PRs auditados:     10/10 MERGED ✓ (#1387 → #1400)
Issues fechadas:   7/7 ✓ (#873 #827 #1378 #1388 #1390 #1393 #1398)
Greps artefatos:   5/5 ✓
TypeScript:        0 erros (Claude Code local)
Unit tests:        84/84 nas suites tocadas ✓
Smoke HTTP:        4/4 200 (Manus)
Smoke UX:          6/6 PASS (7230001)

PRODUTO 🟢 — código deployado == código do main; todos os smokes verdes.
PROCESSO 🟡 — deploy roda de commit local eab433d7 à frente do GitHub (ec523727)
              por 3 arquivos não-código → bifurcação R-SYNC-01 benigna (tech-debt).
```

## Frentes da sessão

- **Cadeia LEGAL** (#1387/#1389/#1391) — mapa `categoria-artigos.ts` 100% alinhado ao DB.
- **P0s fechados** (#873 #827) — repositório sem P0 ativo.
- **CI hardening** (#1392/#1378) — branch protection + trigger `labeled`.
- **Cadeia PDF-1** (#1394/#1395/#1396/#1397) — PDF híbrido structured + recorte Metodologia · FASE 6 PASS.
- **Split View default ON** (#1399/#1398) — elimina fragilidade do secret build-time.
- **CALC-2** (#1400) — contador sidebar alinhado à aba.

## Destaque de governança — REGRA-ORQ-35 (6 estados stale interceptados)

LEGAL-3 (Art. 229→126) · BUG-827 (já resolvido por #1046) · CI-01 (nome de check) · FLAG-DEFAULT (1→2 gates, Lição #74) · CALC-2 (linha/símbolo) · auditoria (HEAD `eab433d7` não é commit git, REGRA-ORQ-25).

## PRs MERGED nesta sessão (10)

| # | Merge SHA | Frente |
|---|---|---|
| #1387 | `135513f9` | LEGAL-2 split_payment |
| #1389 | `dbf0d367` | LEGAL-3 (4 fallbacks) |
| #1391 | `41de52f7` | LEGAL-4 (3 residuais) |
| #1392 | `ff8eb45a` | CI-01 (#1378) |
| #1394 | `088bc978` | PDF-1 híbrido |
| #1395 | `8e035ef3` | PDF-1-FIX rótulos |
| #1396 | `cbde0c13` | status hint |
| #1397 | `f1a44288` | PDF-1-FIX-2 recorte |
| #1399 | `511fef20` | FLAG-DEFAULT-SPLIT (#1398) |
| #1400 | `ec523727` | CALC-2 |

## Tech-debt / próximos passos

- **R-SYNC-01 (P3):** alinhar deploy ao `origin/main` direto — eliminar bifurcação `eab433d7` ≠ `ec523727`.
- **Impactos no PDF (P3):** aba estática não consta no PDF (sem dado omitido) — decisão P.O. = não abrir issue.
- **#1282 (P3):** IS data-driven — próxima sprint.

---

**Histórico anterior:**
- v7.71 · 2026-05-30 · FEAT-SOL-UX-01 encerrada
- v7.70 · 2026-05-28 · Campanha NCM 2700001 + DIAG-COVERAGE-03
- v7.69 · 2026-05-26 · FASE 4 (12 PRs #1206-1217)
- v7.68 · 2026-05-20 · Sprint BUG-FIX
- v7.67 · 2026-05-12 · Sprint P2 encerramento
- v7.66 · 2026-05-07 · Sprint v2 Issue #1010
