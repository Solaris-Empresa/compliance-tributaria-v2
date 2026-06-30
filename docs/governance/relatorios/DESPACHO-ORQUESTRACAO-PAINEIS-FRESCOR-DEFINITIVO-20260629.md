# Despacho de Orquestração — Frescor definitivo dos painéis (PO + RAG)

> **Para:** Orquestrador · **De:** Claude Code · **Data:** 2026-06-29 · **HEAD:** `c72e6966`
> **Objetivo:** os dois painéis de **monitoramento** (Cockpit P.O. + Dashboard RAG) ficam **sempre atualizados por mecanismo**, não por disciplina. Issue de execução: #1652.

## 1. Diagnóstico (causa-raiz verificada)

| Painel | Estado | Por que drifta |
|---|---|---|
| **Cockpit P.O.** (`docs/painel-po/index.html` + `governance-manifest.json`) | `sync-governance.mjs` (governança) e `sync-baseline.mjs` (produto, `pnpm cockpit:sync`) **existem**, mas **sem gatilho** → rodados à mão → esquecidos | manual |
| **Dashboard RAG** (`GOVERNANCA-RAG-PO-COMPLETO.md` / `RASTREABILIDADE-RAG-PO.md`) | **NÃO é data-driven** — "2.515 chunks / 13 leis (v5.0 abril)" editado à mão; real ≈ **16.702 / 25 leis (v9.2)** | hardcode |
| **E8 / E9** (Seção 1 score · Seção 9 blockers no `index.html`) | hardcoded | manual |

**Princípio (Lição #128/#141):** sync/gate **declarado ≠ enforçado**. Monitoramento exige **frescor garantido mecanicamente**. Rodar o sync uma vez (feito hoje, PR #1651) **não** é a solução — é paliativo. A solução definitiva é **automação + gate de frescor**.

## 2. Solução definitiva — 4 fases

### F1 — Gate de frescor no CI (o enforcement) · **núcleo do definitivo**
Workflow `.github/workflows/validate-panels-fresh.yml` (tornar **required**), que em todo PR:
1. roda `node docs/painel-po/sync-governance.mjs` + `pnpm cockpit:sync` (+ `sync-rag.mjs` da F2);
2. `git diff --exit-code docs/painel-po/` → **FALHA se o commitado divergir do regenerado**.

→ Drift fica **impossível de mergear**: quem mexe na governança/baseline regenera o manifest no mesmo PR (mesmo padrão do `deploy-guard.cjs` #1536 / REGRA-ORQ-CI-01).

### F2 — `sync-rag.mjs` (tornar o Dashboard RAG data-driven)
Novo `docs/painel-po/sync-rag.mjs` que:
- **Conta o corpus build-time** (os 17 `server/rag-corpus-*.ts` → nº de chunks + nº de leis) — fonte git-acessível (CI roda);
- emite `rag-manifest.json` + atualiza os números no doc RAG (substitui o hardcode 2.515);
- **Cross-check de runtime (Manus):** `SELECT COUNT(*), COUNT(DISTINCT lei) FROM ragDocuments` periodicamente, para detectar **lag de ingestão** (build-time ≠ banco). Discrepância → alerta no painel.

### F3 — Regen agendado (auto-refresh sem commit gatilho)
GitHub Action `schedule` (cron semanal) que roda os 3 syncs e **abre PR** se algo mudou (ex.: nova lição/audit commitada fora de um PR de painel). Garante frescor mesmo sem PR que toque governança.

### F4 — E8/E9 data-driven (eliminar hardcode do `index.html`)
- **Seção 1 (score):** ler do `governance-manifest.json` (ou `rag-manifest.json`), não hardcode.
- **Seção 9 (blockers):** gerar da lista real de issues (`gh issue list --label blocker/P0`), não hardcode.

## 3. Sequência recomendada

```
F2 (sync-rag) ──┐
F4 (E8/E9 data) ─┼──► F1 (gate de frescor — required) ──► F3 (cron auto-refresh)
                 │     (F1 só vira required quando F2/F4 já tornaram tudo regenerável)
```
F1 é o coração; mas só pode ser **required** depois que F2/F4 tornarem RAG/Seções regeneráveis (senão o gate falha em coisa não-automatizável). Ordem: **F2 + F4 → F1 → F3**.

## 4. RACI / DoD

| Fase | R (implementa) | A (aprova) | Empírico (Manus) | DoD |
|---|---|---|---|---|
| F2 sync-rag | CC | P.O. | `COUNT(*) ragDocuments` (cross-check) | nº do doc RAG == corpus .ts == banco (±lag declarado) |
| F4 E8/E9 | CC | P.O. | — | Seção 1/9 vêm do manifest/issues, zero hardcode |
| F1 gate | CC | P.O. | — | PR com painel stale **falha**; required no branch protection |
| F3 cron | CC | P.O. | — | Action semanal abre PR se stale |

**DoD global:** mexer em governança/corpus **sem** regenerar o painel = **CI vermelho**. Painel nunca mais drifta silenciosamente.

## 5. Imediato (não espera o definitivo) — issue #1652

- ✅ Cockpit P.O.: manifest resincronizado hoje (PR #1651).
- 🔴 RAG doc: Manus confirma a **contagem real no banco** → CC atualiza o número (não de memória, Lição #93). Ponte até o F2.

## Vinculadas

- #1652 (execução) · #1609 (painel v10) · #1608 (corpus v9.2) · `sync-governance.mjs` · `sync-baseline.mjs` (`pnpm cockpit:sync`)
- REGRA-ORQ-CI-01 (gate verde pré-merge) · [[Lição #128]] (gate declarado ≠ enforçado) · [[Lição #141]] (artefato servido ≠ rótulo) · [[Lição #93]] (número verificado) · `deploy-guard.cjs` #1536 (padrão do gate)
