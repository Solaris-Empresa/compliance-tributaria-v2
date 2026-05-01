# BASELINE-PRODUTO — IA SOLARIS Compliance Tributária

Documento de baseline empírico do produto, atualizado a cada sprint significativa.

---

## Baseline Sprint M3 (2026-05-01)

**HEAD em produção:** `8dd0268` (pós-merge #898)
**Checkpoint Manus.space:** `89c4581e` (HANDOFF-MANUS v8.0)
**Versão:** v2.6 (pós PR-J refactor seedNormalizers + PR-FIX 1+2)
**M2_PERFIL_ENTIDADE_ENABLED:** `true` (global)

### Validações empíricas — Step 4 GO efetivo

- ✅ Smoke 6c financeiro SEM NBS (2026-04-30) — PASS 10/10 + 8/8
- ✅ M3-PROMPT-0-BIS Caminho B JWT (2026-04-30) — PASS HTTP 200
- ✅ Smoke regressivo PR-J Fase 2 (2026-05-01) — PASS 10/10 + 8/8
- ✅ `rules_hash` byte-a-byte: `4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272`

### PRs Sprint M3 mergeados

| # | Tipo | Conteúdo |
|---|---|---|
| #889 | docs(ci) | CI secrets gap analysis (Manus) |
| #890 | docs(governance) | LICOES_ARQUITETURAIS.md (#41-#45) |
| #891 | docs(governance) | cpie_analysis_history decision doc |
| #892 | docs(investigation) | PR-J Fase 1 pré-análise |
| #893 | test(pr-j) | Fase 2a snapshot behavior tests |
| #894 | refactor(pr-j) | Fase 2b extract seedNormalizers |
| #895 | test(risk-engine-v4) | SEVERITY_TABLE snapshot |
| #896 | test(ci) | graceful skip DB tests via CI_HAS_TEST_DB guard |
| #897 | docs(governance) | HANDOFF-MANUS v8.0 (Manus) |
| #898 | docs(governance) | handoff sessão 2026-05-01 + Lição #46 + PR-J ✅ |

### Métricas baseline

| Métrica | Valor |
|---|---|
| Total projects orgânicos | 985 |
| Total users | 16.537 |
| `ragDocuments` | 2.515 chunks LC 214/2025 (intactos) |
| `archetype_active` | 0 (cleanup pós-smoke) |
| Suite oficial | 60 cenários, 59 PASS / 0 FAIL / 1 BLOCKED |
| CI red recorrente | -78% reduzido (213 → 47 fails Run Unit Tests) |
| Baselines preservados | 178/178 (62 perfil-router + 7 outros + 10 seed-normalizers + 22 m1-monitor invariant + 14 risk-engine-v4 + 63 fixtures) |

### Próximo marco

**Marco 4 — M3 RAG consome arquétipo:**

1. PR-LISTCLIENTS-FIX (destrava cliente real)
2. M3-RAG-01 `retrieveArticles` aceita `PerfilDimensional` opcional
3. M3-RAG-02 `briefingEngine` lê `projects.archetype`
4. M3-RAG-03 `gap-engine` consome dimensões
5. M3-RAG-04 smoke E2E completo dimensional

### Fonte da verdade

- `docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md` (canonical, criado nesta sessão)
- `docs/governance/LICOES_ARQUITETURAIS.md` (Lições #41-#46)
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md` (handoff Claude Code)
- `docs/HANDOFF-MANUS.md` (handoff Manus operacional)
