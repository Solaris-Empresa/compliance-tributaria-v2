# Template — Bateria N · progress.md

**Iniciada em:** AAAA-MM-DD HH:MM:SS
**Branch:** test/z20-XXX
**Executor:** Manus (background task)
**Status:** running | passed_partial | failed | completed
**Thresholds:** (preencher conforme bateria)

---

## 1. Unit tests (engine puro)

| Teste | Status | Timestamp | Evidência |
|---|---|---|---|
| (populado em tempo real pelo realtime-reporter) | — | — | — |

**Subtotal:** X PASS · Y FAIL · Z PENDING

---

## 2. Integration tests (DB + pipeline)

| Teste | Status | Timestamp | Evidência |
|---|---|---|---|
| (skipped se DATABASE_URL ausente) | — | — | — |

---

## 3. Aferição do projeto (10 critérios §13.5)

Ver `afericao-{projectId}.md` no mesmo diretório.

| # | Critério | Status | Planejado × Realizado |
|---|---|---|---|
| 1 | Todo risco tem origem | — | — |
| 2 | Categorias cobertas | — | — |
| 3 | Severidade determinística | — | — |
| 4 | RAG validation ≥50% | — | — |
| 5 | Breadcrumb 4 nós | — | — |
| 6 | Oportunidade sem plano | — | — |
| 7 | Unicidade por categoria | — | — |
| 8 | Score visível | — | — |
| 9 | Fonte primária consistente | — | — |
| 10 | Nenhuma categoria órfã | — | — |

---

## 4. Drift check (DB × código × RN)

Ver `drift-check.md` no mesmo diretório.

| Categoria | DB | Código | RN | Status |
|---|---|---|---|---|

---

## 5. E2E regression (21 bugs UAT Gate E)

Aplicar triagem do Bloco 9.1 da spec — apenas bugs "Playwright cobre" aqui.
Bugs "inspeção humana" ficam em `uat-human-checklist.md` para Bateria 4.

| Bug | CT | Status | Screenshot |
|---|---|---|---|

---

## Resumo

- **Total tests:** X PASS · Y FAIL · Z PENDING
- **Gaps encontrados:** N
- **Pronto para próxima bateria:** SIM / NÃO
- **Recomendação automática:** (texto baseado nos thresholds)

---

*Última atualização: TIMESTAMP (append pelo realtime-reporter)*
