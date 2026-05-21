# Smoke [SMOKE-B-FINAL-V2] — PR #1156 + #1157 (Frente B: injeção determinística)

**Data:** 2026-05-21 · **Commits:** #1156 (`3c98214c`) + #1157 (hotfix parse) · **Executor:** Manus (sandbox local + DB produção)

---

## Veredito

**PASS (local) — consumo provado; deploy em produção pendente.**

Primeira evidência real (≠ as 4 tentativas anteriores e ≠ análise estática) de que a cadeia funciona: o LLM **citou** os artigos do Decreto injetados.

## Bug encontrado e corrigido durante o smoke (#1157)

`Drizzle` retornou `normativeBundle` como **string crua** (não objeto). O helper `fetchDeterministicGrounding` acessava `.artigos_decreto` em string → `undefined` → injeção vazia. **Fix #1157** (pattern robusto Lição #72): `typeof raw === "string" ? JSON.parse(raw) : raw` — funciona para string (local) E objeto (prod), sem armadilha local≠prod. Validação: `fetchDeterministicGrounding("lucro_presumido")` → 30.032 chars (antes: 0).

## Critérios

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | Briefing cita ≥1 artigo do Decreto 12.955 | ✅ TRUE | 660001: `"Art. 28 a 31 do Decreto 12.955/2026"` |
| 2 | Artigo pertence à categoria do risco | ✅ TRUE | Art. 28-31 = split_payment |
| 3 | Projetos existentes não regridem | ✅ TRUE | LC 214 preservada, briefing normal |
| 4b | SN sem CGIBS 6 | ✅ TRUE | 120001 (SN): zero menções CGIBS/Art. 593-595 (skip funciona) |
| 4a | SN cita Decreto | ⚠️ PARCIAL | 120001 não citou (apesar de 25.655 chars injetados) |

## Ressalvas (auditadas)

- **R1 — Smoke é LOCAL** (dev server + DB prod), não a prod deployada (`iasolaris.manus.space`). Prod só atualiza após o **Publish**. Re-validar critério 1 em prod pós-deploy.
- **R2 — Critério 4a é COBERTURA, não nudge.** Os gaps de 120001 (alíquota zero / cadastro / obrigações acessórias) NÃO são split_payment/crédito — as 2 únicas categorias com `normative_bundle` curado. Sem Decreto relevante → ausência de citação é CORRETA. **"Reforçar nudge" não resolve** — o caminho é curar mais categorias (Lição #66). A diferença 660001(cita) vs 120001(não) é a **categoria do risco**, não SN-vs-LP.
- **R3 — Verificar critério 2:** confirmar que 660001 tem risco `split_payment` (`SELECT categoria FROM risks_v4 WHERE project_id=660001`) — descartar citação tangencial forçada pela injeção project-agnostic.
- **R4 — auditLog** falha com `ER_TRUNCATED_WRONG_VALUE_FOR_FIELD` no `userId` (pré-existente, não-bloqueante) → ticket separado.

## Cobertura honesta (Lição #66)

#1156+#1157 resolvem o BUG-FONTES **para as 2 categorias curadas** (split_payment, credito_presumido). Cobertura ampla (demais categorias citando Decreto/CGIBS) depende de curadoria jurídica futura. Não é fix universal.

## Vinculadas

- PRs #1156 / #1157 · #1149 / #1155 (histórico Frente B) · audit `smoke-pr-1143-frente-c.md` (Frente C) · Lições #87/#72/#66/#88/#90 · REGRA-ORQ-36 (investigação 5-técnicas que achou a causa raiz)
