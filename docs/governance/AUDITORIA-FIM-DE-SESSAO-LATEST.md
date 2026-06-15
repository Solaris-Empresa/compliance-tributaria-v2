# AUDITORIA-FIM-DE-SESSAO — LATEST

> Espelho do audit mais recente. Histórico completo em `docs/governance/audits/`.
> Mais recente: **v7.75** · 2026-06-14 · GATE-NCM-NBS #1219 — resolver cascata (grupo+específico) + fecha #827.

→ Veja o arquivo completo: **[`audits/v7.75-2026-06-14-gate-ncm-nbs-1219.md`](./audits/v7.75-2026-06-14-gate-ncm-nbs-1219.md)**

---

## Resumo executivo (v7.75 — proposto pelo Claude Code, ratificação P.O. via merge)

```
VEREDITO:  Implementação 🟢  ·  Ativação 🟡 (gated ENABLE_NCM_RESOLVER)

HEAD git:          332354a9
PRs auditados:     6/6 MERGED — F0 #1422 (20c3b497) · F1 #1424 (e716fd2b) ·
                   F2 #1426 (0577966b) · F5 #1428 (991efe8a) ·
                   F3 #1429 (bc94f910) · F4 #1431 (332354a9)
Issues:            #827 CLOSED (F3) · #1219 OPEN (veredito P.O.)
Greps artefatos:   ✓ ADR-0035 · resolver · #827 fix · DoD · seed (via git cat-file)
TypeScript:        0 erros
Tests #1219:       59/59 PASS (resolver 11 · #827 5 · DoD 7 · risk-elig 28 · gap 8)
TS+Vitest CI:      🟡 #1043 (infra DB/OAuth pré-existente — admin-override)
Smoke:             F1 6/6 prod · F5 seed prod (30 NCM/27 NBS) · F3 R2 gated (flag)

🟢 Implementação completa: ADR-0035 + resolver cascata + 4 matchers + #827 + DoD + curadoria.
🟡 Ativação: feature gated por ENABLE_NCM_RESOLVER (default off); smoke R2 pós-flip (P.O.).
```

## Frentes da sessão

- **GATE-NCM-NBS #1219** (F0→F5) — resolver único em cascata (específico→grupo→capítulo→fallback) para aceitar **grupos** NCM/NBS (demanda Dr. José), com reversão controlada do hotfix #859 e fechamento do #827 (IS falso-positivo sem NCM). 6 PRs, metodologia SPEC-FIRST (ORQ-43/44).

## Tech-debt declarado

- **F3.1** — `deriveObjetoFromNbs` → resolver (ripple async; F10 "robusto, não quebra").
- **Calibração confidence** (R4) — placeholders 0.98/0.80/0.60/0.30 → calibrar com dados reais.
- **Ativação `ENABLE_NCM_RESOLVER`** — decisão P.O. + smoke R2 prod.
- **Benefício de grupos** (8436/2306/2304/1006) — validação jurídica Dr. José (REGRA-ORQ-29; regimes `*_pendente`).
- **#1043** — ci-hygiene (TS+Vitest infra), OPEN.

## Lições/regras da sessão

- **Lição #123** — hotfix anti-truncado pode conflitar com feature de granularidade variável (reversão #859).
- Reaplicadas: #65 (sync/async core puro) · #74/#114 (premissa do despacho vs código — path, 6-vs-7 gates) · #92 (`cnae` filename → falso-positivo RAG gate) · #93 (`git cat-file` vs `git show` quirk) · REGRA-ORQ-29 (F5 sem benefício não-validado).

---

**Histórico anterior:**
- v7.74 · 2026-06-14 · SOLARIS-SPEC-FIRST v1.2 (ORQ-43/44 + Lição #122)
- v7.73 · 2026-06-13 · FEAT-GUIA-PRÁTICO + backlog jun13
- v7.72 · 2026-06-12 · PDF-1 + Split View + LEGAL + CI
- v7.71 · 2026-05-30 · FEAT-SOL-UX-01 encerrada
- v7.70 · 2026-05-28 · Campanha NCM 2700001 + DIAG-COVERAGE-03
- v7.69 · 2026-05-26 · FASE 4 (12 PRs #1206-1217)
- v7.68 · 2026-05-20 · Sprint BUG-FIX
- v7.67 · 2026-05-12 · Sprint P2 encerramento
