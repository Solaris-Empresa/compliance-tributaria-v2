# SPEC F2+F4 — Painéis data-driven (sync-rag + E8/E9) · Classe B

> **Ref.:** Despacho 29/06 22h49 · Issue #1652 · despacho definitivo (#1653, PR) · **Classe B** (script novo + index.html).
> **Princípio:** o número do painel é **derivado por script + verificado contra o banco** — nunca escrito de memória (Lição #93, baliza 1).
> **🔴 Bloqueio:** a IMPLEMENTAÇÃO do número aguarda `SELECT COUNT(*) FROM ragDocuments` (Manus). A spec descreve o mecanismo.

## Gate 0 (verificado no repo)

- `ls server/rag-corpus-*.ts` = **16 arquivos** (corrigido de "17" — glob anterior casava 1 a mais; baliza 2).
- Nem todos são "leis": `rag-corpus-cgibs-template.ts` (template), `rag-corpus-ncm.ts` / `rag-corpus-nbs.ts` (tabelas NCM/NBS). → o count de **leis** ≠ nº de arquivos.
- Cada chunk = entrada com campo `conteudo:` (ex.: `lcs-novas.ts` 1254, `decreto12955.ts` 831). Campo `lei:` identifica o diploma.
- **Fonte de verdade do número exibido = banco** (`ragDocuments`, o corpus servido). O count build-time (`.ts`) é **aproximação** (lag de ingestão, templates não-ingeridos).

## AS-IS

| Item | Estado |
|---|---|
| Dashboard RAG (`GOVERNANCA-RAG-PO-COMPLETO.md` / `RASTREABILIDADE-RAG-PO.md`) | **hardcoded** "2.515 chunks / 13 leis (v5.0 abril)" — real ≈ 16.702/25 (v9.2) |
| Cockpit Seção 1 (score) | hardcoded no `index.html` |
| Cockpit Seção 9 (blockers) | hardcoded no `index.html` |

## TO-BE

### F2 — `docs/painel-po/sync-rag.mjs` (novo)
1. **Glob** `server/rag-corpus-*.ts` → conta `conteudo:` por arquivo (build-time chunks) e `lei:` distintos (leis).
2. **Distingue** legislação de tabela/template (lista de exclusão explícita: `cgibs-template`; flag para `ncm`/`nbs`).
3. **Cross-check de banco (Manus):** lê um campo `db_chunks` / `db_leis` (valor reportado pelo `SELECT COUNT(*) FROM ragDocuments`) — **fonte de verdade do número exibido**.
4. Emite `docs/painel-po/rag-manifest.json`: `{ build_chunks, build_leis, db_chunks, db_leis, drift: db-build, generated_at }`.
5. Atualiza os números no doc RAG **a partir do manifest** (sed/âncora `data-key`), substituindo o hardcode.
6. **Sinal de frescor:** se `drift ≠ 0` → painel mostra "ingestão pendente: ±N chunks".

### F4 — E8/E9 data-driven (`index.html`)
- **Seção 1 (score):** lê do `governance-manifest.json` (ou `rag-manifest.json`) via âncora `data-key`, igual ao padrão do `sync-baseline.mjs`. Zero hardcode.
- **Seção 9 (blockers):** gerado da lista real — `gh issue list --label P0,blocker --state open` → injetado via âncora. Zero hardcode.

## Arquivos tocados (PR único F2+F4)

| Arquivo | Mudança |
|---|---|
| `docs/painel-po/sync-rag.mjs` | **novo** — count + cross-check + escreve rag-manifest |
| `docs/painel-po/rag-manifest.json` | **novo** — gerado |
| `docs/painel-po/GOVERNANCA-RAG-PO-COMPLETO.md` · `RASTREABILIDADE-RAG-PO.md` | número via âncora (não hardcode) |
| `docs/painel-po/index.html` | Seção 1 + Seção 9 via `data-key` |
| `package.json` | script `cockpit:sync-rag` (opcional) |

## DoD

- `node docs/painel-po/sync-rag.mjs` roda sem erro · `rag-manifest.json` com `build_chunks`/`db_chunks`/`drift`.
- Número no doc RAG == `db_chunks` (do COUNT(*) do Manus) — **não** de memória.
- `ls server/rag-corpus-*.ts | wc -l` re-confirmado no PR (hoje 16).
- Seção 1/9 do `index.html` sem string de score/blocker hardcoded (grep == 0).
- tsc 0 (script .mjs não entra no tsc; validar por execução).

## Dependências / sequência

1. **Manus:** `SELECT COUNT(*) FROM ragDocuments` (+ `COUNT(DISTINCT lei)`) em produção → reporta `db_chunks`/`db_leis`. **Bloqueante do número.**
2. CC implementa F2+F4 (PR único) usando o número reportado.
3. Depois: **F1** (gate CI required) só após F2+F4 mergeados (senão valida contra dado errado).

## Não-implementar (escopo)

- ❌ F1 (gate CI) e F3 (cron) — fases seguintes, fora desta spec.
- ❌ Escrever qualquer número de chunks/leis **antes** do COUNT(*) do Manus.

## Vinculadas

#1652 · #1653 (despacho definitivo) · `sync-governance.mjs` · `sync-baseline.mjs` · [[Lição #93]] (número verificado) · [[Lição #128]] (gate enforçado) · REGRA-ORQ-24 (Classe B) · REGRA-ORQ-41 (impact-tree)
