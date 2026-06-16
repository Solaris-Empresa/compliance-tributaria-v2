# AUDITORIA-FIM-DE-SESSAO — LATEST

> Espelho do audit mais recente. Histórico completo em `docs/governance/audits/`.
> Mais recente: **v7.76** · 2026-06-16 · GATE-NCM-NBS (encerramento #1219/#1275/#1439) + GOV-FIXES.

→ Veja o arquivo completo: **[`audits/v7.76-2026-06-16-sessao-gov-fixes-gate-ncm-nbs.md`](./audits/v7.76-2026-06-16-sessao-gov-fixes-gate-ncm-nbs.md)**

---

## Resumo executivo (v7.76 — proposto pelo Claude Code, ratificação P.O. via merge)

```
VEREDITO DUAL:  Produto 🟡  ·  Processo 🟡   (sem 🔴 — encerrável)

HEAD git:          2b9fcf72
PRs mergeados:     13 (16/06) — Arco A GATE-NCM-NBS (9) + Arco B GOV-FIXES (4)
tsc:               0 erros
Unit tests:        PASS (server/lib + #1439b 8/8 + #1276 5/5)
Integração:        vermelha por #1043 (DB ausente) — NÃO é required check (Lição #128)
Greps artefatos:   REGRA-ORQ-45 ✓ · Lições #129/#130 ✓ · correção #128 ✓
                   class_a removido ✓ · validate-pr.yml labeled ✓ · SCHEMA-REFERENCE ✓

Produto 🟡:   cadeia normativa completa e rastreada por PDF (NCM 2301/23.01, cesta
              básica, 50 NCMs Art.197 I incl. tratores, reranker #1276, 1006.10
              sem_beneficio). Pendência: aplicação dos seeds tsx em prod + smoke E2E (Manus).

Processo 🟡:  Gate 0 pegou ~8 premissas erradas + 2 no-ops (#1276) + armadilha class_a
              (dogfooding). 6 Lições novas (#125-130). Débito exposto: validate-pr.yml
              quebrado ~2 meses (ORQ-16/17 inertes), enforce_admins=false, 1 dup (#1451).
              Auto-corretivo → não 🔴.

ABERTOS:      #1043 (CI) · #1462 (enforce_admins, indep. de #1043) · #1459 fase 2 (req. #1043)
PENDENTE MANUS: aplicar seeds + smoke E2E + checkpoint Manus.space vs 2b9fcf72
```

Detalhes, inventário completo de PRs e os 7 passos: ver o arquivo arquivado acima.
