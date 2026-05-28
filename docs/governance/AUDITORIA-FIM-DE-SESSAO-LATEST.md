# AUDITORIA-FIM-DE-SESSAO — LATEST

> Espelho do audit mais recente. Histórico completo em `docs/governance/audits/`.
> Mais recente: **v7.70** · 2026-05-28 · Campanha NCM 2700001 + DIAG-COVERAGE-03.

→ Veja o arquivo completo: **[`audits/v7.70-2026-05-28-campanha-ncm-diag-cobertura.md`](./audits/v7.70-2026-05-28-campanha-ncm-diag-cobertura.md)**

---

## Resumo executivo (v7.70 — proposto pelo Claude Code, aguarda P.O.)

```
🟢 PROPOSTO — campanha NCM 2700001 + DIAG-COVERAGE-03 encerrados

HEAD:            11c4b61
PRs auditados:   10/10 MERGED ✓ (+ 2 dry-runs CLOSED por design)
Issues fechadas: 8/8 ✓
Issues abertas:  3 (residuais rastreados: #1275 NEW-CAT, #1276 reranker, #1277 P6 locação)
Greps:           10/10 ✓
TypeScript:      0 erros (Claude Code local)
Tests local:    49/49 ✓ + 8 skipped (dbDescribe — DB no Manus)
Tests c/ DB:    57/57 ✓ (Manus, 27/05 23:00, DIAG-COVERAGE-03)
HTTP prod:      _Manus completar_
Smoke UX:       4 smokes pontuais ✅ (D4 · D1-C · Cobertura Construtora · Cobertura Advogado)

BUGS ABERTOS:
  #1276 reranker injeta Art.139/128 sem aderência ao NCM (P3)
  #1277 regime_especifico_imoveis_locacao casa venda 6810-2/01 (P2, fix de dado)

BLOQUEADORES PRÓXIMA SPRINT:
  #1275 NEW-CAT — aguarda gate jurídico Dr. Swami (desbloqueia remoção do hardcode interino D1-C)
```

## Lições registradas nesta sessão

- **Lição #101** (`.claude/rules/governance.md:2738`) — boundary é por match-de-grupo (LIKE), não LENGTH; **casar o WHERE ≠ sobreviver ao LIMIT**. PR #1272.
- **Lição #107** (`.claude/rules/governance.md:2764`) — oráculo de cobertura é `shouldInjectCategory` sobre `risk_categories`, não o texto do `fetchDeterministicGrounding`. PR #1278.

## PRs MERGED nesta sessão (10)

| # | Título | Branch |
|---|--------|--------|
| #1259 | fix(rag): excluir Parte Geral LC 214 do pool de Q.NCM (D4-POOL) | `fix/d4-pool-exclude-parte-geral` |
| #1261 | fix(rag): normalizar confidence do reranker para [0,1] (COL-CONF) | `fix/col-conf-normalize-confidence` |
| #1263 | fix(product-questions): mensagem honesta no corpus_gap_setorial (COL-LABEL) | `fix/col-label-honest-message` |
| #1265 | docs(bugs): diagnóstico D3-JINA — Jina não-determinístico | `docs/d3-jina-diagnostico` |
| #1267 | db: artigo_pai em ragDocuments + link Art.620 (D2 PR-A) | `db/d2-artigo-pai-anexo-link` |
| #1269 | fix(rag): isSetorialArtigo por metadado artigo_pai (D2 PR-B) | `fix/d2-issetorial-artigo-pai` |
| #1271 | db: corrigir cnaeGroups Art.197 decreto/resolucao (D1-A) | `db/d1a-art197-grupos` |
| #1272 | docs(governance): registrar Lição #101 | `chore/licao-101-corrigida` |
| #1274 | fix(rag): injeção determinística Art. 197 no pool de Q.NCM (D1-C) | `fix/d1c-inject-art197` |
| #1278 | test(coverage): suite 57/57 cobertura CNAE/NCM + Lição #107 | `test/coverage-8-profiles` |

## Próximos passos

- **Próxima sprint:** atacar **#1277** (fix P6 locação — restringir `cnae_codes` a `6810-2/02`).
- **Aguarda jurídico:** **#1275** NEW-CAT (Dr. Swami — Q2/Q3/Q4/Q5/Q7).
- **Backlog:** **#1276** (reranker noise) · Lições #94–#102 pendentes em `governance.md` (pré-existente).

---

**Histórico anterior:**
- v7.69 · 2026-05-26 · FASE 4 (12 PRs #1206-1217)
- v7.68 · 2026-05-20 · Sprint BUG-FIX
- v7.67 · 2026-05-12 · Sprint P2 encerramento
- v7.66 · 2026-05-07 · Sprint v2 Issue #1010
- v7.65 · 2026-05-05 · End-of-session M3.10
