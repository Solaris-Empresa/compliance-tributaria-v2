# AS-IS / TO-BE — CSV-TEMPLATE-FIX-01 **B.2** (parser normativo)

> **Tema:** tornar `lei_ref`, `artigo_ref` e `mapping_review_status` setáveis via CSV de perguntas SOLARIS (Onda 1).
> **Data:** 2026-06-23 · **Classe:** B · **Metodologia:** SOLARIS-SPEC-FIRST v1.2 (REGRA-ORQ-41 + skill `impact-tree`).
> **Origem:** despacho CSV-TEMPLATE-FIX-01 (achados #2 e #3 da auditoria do template). D2 resolvida (obrigatorio fica hardcoded). D3 (`observacao`) permanece P3 backlog.
> **Relacionada (Lição #83):** Issue **#158 [OPEN]** "L-2: Template CSV e documentação para equipe jurídica" — referenciar, não duplicar.

---

## 1. Auto-auditoria das técnicas usadas

| Técnica | Aplicada | Evidência |
|---|---|---|
| ast-grep disponível | ✅ | v0.42.1 |
| knip disponível | ✅ | v6.14.2 (ts-prune dispara scan completo — evitado) |
| Grep readers/writers (T4) | ✅ | seções 3 e 6 |
| Grep INCLUINDO testes | ✅ | `solarisAdmin.upload.test.ts`, `crud.test.ts`, `csv-roundtrip.test.ts` (B.1) |
| Grep .md/.sql/.json/ADR | ✅ | só ADR-0010 (tangencial); contrato real = M3.7 Item 12 + REGRA-ORQ-29 |
| Snapshots `.snap` | ✅ | nenhum `.snap` contém os 3 alvos |
| Issues pré-existentes (gh) | ✅ | #158 (OPEN, relacionada), #940/#945 (CLOSED, infra), #946 (OPEN, curadoria jurídica) |
| LOC antes de classificar | ✅ | seção 5 |
| ADR + bump | ✅ | nenhum ADR governa → sem bump (seção 7) |

**Cobertura estimada: ~95%.** Pendência declarada (Pendente Manus, seção 9): caminho de leitura ativo `getOnda1Questions` vs `querySolarisByCnaes` confirmado por grep, mas a execução real (qual filtro dispara em produção) deve ser validada por SQL/runtime no Gate 0 (sem-empirismo — Manus).

---

## 2. Risco de regressão por gravidade

| Gravidade | Risco | Mitigação |
|---|---|---|
| 🔴 **Crítico** | CSV setar `mapping_review_status='approved_legal'` **bypassa o gate jurídico** (Lições #61/#103) — curador marca como aprovado sem revisão legal. | **Decisão P.O. obrigatória (seção 7, Nível 1):** restringir os valores aceitos via CSV. Recomendação: CSV aceita apenas `curated_internal`/`pending_legal`; `approved_legal` só via ação explícita (UI/fluxo legal). |
| 🟡 **Visível** | Pergunta com `lei_ref` setado passa a ser **filtrada por lei** (`solaris-query.ts:90`) — pode "sumir" do questionário se o projeto não tem aquela lei no `leiFilter`. Comportamento correto (REGRA-ORQ-29), mas inesperado para quem cura. | Legenda no template + DoD negativo discriminante (seção 7). |
| 🟡 **Visível** | Round-trip B.1 quebra se export não incluir os 3 novos campos → reimport os zera. | B.2 estende export + listQuestions SELECT (igual `gap_descricao` em B.1). |
| 🟢 **Cosmético** | Colisão de nomes `lei`/`lei_ref` e `artigo`/`artigo_ref` confunde o curador. | Legenda explícita: `lei`=fonte fixa `solaris`; `lei_ref`=lei normativa (lc214…). |

---

## 3. Consumers reais (quem LÊ os 3 alvos) — inventário canônico

| # | Consumer | `arquivo:linha` | Alvo | Criticidade |
|---|---|---|---|---|
| C1 | `getOnda1Questions` — gate `mapping_review_status IN ('curated_internal','approved_legal')` (exclui `pending_legal`) | `server/db.ts:1383-1388` | mapping_review_status | 🔴 crítico (gate jurídico) |
| C2 | `querySolarisByCnaes` — filtro `!q.leiRef \|\| leiFilter.includes(q.leiRef)` | `server/lib/solaris-query.ts:90` | leiRef | 🟡 |
| C3 | `tracked-question` — breadcrumb `leiRef + artigoRef` na fonte da pergunta | `server/lib/tracked-question.ts:188-198` | leiRef, artigoRef | 🟡 |
| C4 | `solaris-objetivo` — `artigoRef` injetado no prompt LLM do objetivo | `server/routers/solaris-objetivo.ts:73,90` | artigoRef | 🟡 |

Callers de C1: `onda1Injector.ts:110`, `routers-fluxo-v3.ts:1065`, `solaris-query.ts:58`. **Nenhum dos 3 alvos é dead-read** — todos têm consumo downstream verificado.

## 3b. Producers reais (quem ESCREVE os 3 alvos)

| Producer | `arquivo:linha` | Seta os 3 alvos hoje? |
|---|---|---|
| `uploadCsv` INSERT (raw SQL) | `server/routers/solarisAdmin.ts:479-495` | ❌ não |
| `uploadCsv` UPDATE (raw SQL, keyed `codigo`) | `server/routers/solarisAdmin.ts:457-475` | ❌ não |
| `createQuestion` INSERT | `server/routers/solarisAdmin.ts:635` | ❌ não |
| `updateQuestion` UPDATE | `server/routers/solarisAdmin.ts:578` | ❌ não |
| `createSolarisQuestion` (Drizzle `.values(data)`) | `server/db.ts:1274` | ⚠️ sim, SE caller passar (usado por seeds/migrations) |

**Conclusão (Lição #65):** as colunas existem (#940) e são consumidas (C1-C4), mas **nenhum writer de runtime via Admin/CSV as popula** → perguntas criadas via Admin/CSV nascem com `leiRef/artigoRef = NULL` e `mapping_review_status = 'curated_internal'` (default). O gate jurídico só atua sobre o que foi seedado `pending_legal` por migration. B.2 fecha essa lacuna no caminho CSV.

---

## 4. Árvore de impacto

```
CSV template + exportCsv (B.1)
   └─ CsvRowSchema (parser) ──────────────── +lei_ref +artigo_ref +mapping_review_status
        └─ uploadCsv INSERT/UPDATE ───────── grava nas 3 colunas (já existentes)
             └─ solaris_questions (DB) ────── lei_ref · artigo_ref · mapping_review_status
                  ├─ getOnda1Questions ────── C1: gate pending_legal (questionário)
                  │     └─ onda1Injector / routers-fluxo-v3 / querySolarisByCnaes
                  ├─ querySolarisByCnaes ──── C2: filtro por lei (leiRef)
                  ├─ tracked-question ─────── C3: breadcrumb da fonte
                  └─ solaris-objetivo ─────── C4: prompt LLM
   └─ listQuestions SELECT ───────────────── +3 colunas (surface p/ round-trip)
        └─ exportCsv (front) ──────────────── +3 colunas → round-trip identidade preservada
```

---

## 5. Cirurgia possível? (escopo)

**Escopo mínimo (recomendado):** CSV-only (parser + persistência + round-trip + template + testes). **NÃO** estender formulários UI create/edit (mantêm-se sem os 3 campos — gap consistente, documentado como follow-up).

**LOC estimado:** ~80-120 linhas em 4 arquivos:
- `server/routers/solarisAdmin.ts` (664 LOC) — schema (+3) + INSERT (+3) + UPDATE (+3) + SELECT (+3) + tipo retorno (+3) ≈ 40 LOC
- `client/src/pages/AdminSolarisQuestions.tsx` (1809 LOC) — interface (+3) + exportCsv (+3 cases) ≈ 12 LOC
- `client/public/template-solaris-questions.csv` — +3 colunas + legenda
- `server/solarisAdmin.csv-roundtrip.test.ts` — +casos (gate, leiRef, round-trip dos 3)

→ **Classe B** (≤500 LOC, ≤5 arquivos, sem migration). Confirma a classificação do despacho.

---

## 6. AS-IS (estado atual, com citações)

1. **Schema:** colunas `lei_ref` (`schema.ts:1756`), `artigo_ref` (`:1758`), `mapping_review_status` enum default `curated_internal` (`:1750`) **existem** (migrations #940/#945).
2. **Parser `CsvRowSchema`** (`solarisAdmin.ts:61-83`): NÃO tem os 3 campos. Coluna CSV `lei`→`fonte` (`:66`), `artigo`→`codigo` (`:67`) — nomes diferentes dos alvos.
3. **uploadCsv INSERT/UPDATE** (`:479`/`:457`): não gravam os 3 campos → INSERT usa defaults do schema (NULL/NULL/`curated_internal`).
4. **listQuestions SELECT** (`:240-244`): não retorna os 3 (após B.1, já retorna `gap_descricao`).
5. **exportCsv** (`AdminSolarisQuestions.tsx:627`, pós-B.1): 13 colunas, sem os 3.
6. **Consumo:** C1-C4 (seção 3) leem os campos, mas recebem default/NULL para tudo que vem de Admin/CSV.

## 7. TO-BE (com fases + bump ADR)

### Contrato do parser (CsvRowSchema — adições)
```
lei_ref:               z.string().optional()                       // → solaris_questions.lei_ref  (NULL se vazio)
artigo_ref:            z.string().optional()                       // → solaris_questions.artigo_ref (NULL se vazio)
mapping_review_status: z.enum([...]).optional()                    // → default 'curated_internal'
```
Template (16 colunas): `…,gap_descricao,taxRegimes,lei_ref,artigo_ref,mapping_review_status` (anexar ao fim — preserva ordem B.1).

### ✅ DECISÃO P.O. (Nível 1 — REGRA-ORQ-22) — RESOLVIDA 2026-06-23: **Opção A**
`mapping_review_status` via CSV aceita **apenas** `curated_internal` e `pending_legal`.
`approved_legal` é **rejeitado pelo parser** (erro de linha) — a aprovação legal exige ação
humana explícita fora do upload em lote. Preserva a intenção do gate (Lições #61/#103).

Contrato Zod resultante:
```
mapping_review_status: z.enum(["curated_internal", "pending_legal"]).optional()
// valor 'approved_legal' no CSV → safeParse falha → linha rejeitada com mensagem clara
```
Nota: o schema da coluna mantém os 3 valores (`schema.ts:1750`); a restrição é **só na borda CSV**.

### Fases
- **F0 — Gate 0 (Manus/SQL):** `SHOW COLUMNS FROM solaris_questions` confirma `lei_ref`/`artigo_ref`/`mapping_review_status` + valores reais do enum; confirmar caminho de leitura ativo (C1). **Sem migration.**
- **F1 — Parser + persistência:** `CsvRowSchema` (+3) → `uploadCsv` INSERT (+3 cols) + UPDATE (+3 cols). Aplicar Opção A no enum.
- **F2 — Round-trip:** `listQuestions` SELECT + tipo retorno (+3) → frontend interface (+3) → `exportCsv` (+3 cases).
- **F3 — Template + legenda:** +3 colunas + nota distinguindo `lei`≠`lei_ref`, `artigo`≠`artigo_ref` + semântica do gate.
- **F4 — Testes:** estender `csv-roundtrip.test.ts` (round-trip dos 3) + DoD negativo discriminante (abaixo).

### Bump ADR
Nenhum ADR governa os 3 campos (vieram de M3.7 Itens 3/12 — issues #940/#945, não ADR). **Sem bump.** B.2 **reforça** REGRA-ORQ-29 (rastreabilidade normativa determinística) — registrar no PR.

### DoD (REGRA-ORQ-44 + Lição #138/#139 — discriminante, em dado real, via SQL/Manus)
| Consumer | Positivo | Negativo discriminante | Neutro |
|---|---|---|---|
| C1 gate (`getOnda1Questions`) | pergunta `mapping_review_status='curated_internal'` → **aparece** | mesma pergunta com `='pending_legal'` → **NÃO aparece** | (default ausente no CSV → `curated_internal` → aparece) |
| C2 filtro lei (`querySolarisByCnaes`) | `lei_ref='lc214'` + projeto com lc214 → **aparece** | `lei_ref='lc999'` (fora do leiFilter) → **excluída** | `lei_ref` vazio/NULL → **preservada** (universal) |
| Round-trip | export→import preserva `lei_ref`/`artigo_ref`/`mapping_review_status` | — | vazios → NULL/default |

---

## 8. Auto-auditoria final (cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação com `arquivo:linha` | ✅ | seções 3/3b/6 |
| Grep incluindo testes | ✅ | suíte solarisAdmin |
| .sql/.md/.json/ADR | ✅ | ADR-0010 tangencial; contrato = M3.7/ORQ-29 |
| PDF/email | ✅ n/a | perguntas SOLARIS não vão a PDF por esses campos |
| Issues pré-existentes | ✅ | #158/#940/#945/#946 |
| ast-grep ≥3 padrões | ⚠️ parcial | usei rg estrutural; ast-grep disponível, não foi gargalo (campos são nomes simples) |
| Dead-read (knip) | ✅ | C1-C4 provam consumo — não dead-read |
| LOC antes de classe | ✅ | seção 5 |
| ADR + bump | ✅ | sem bump (justificado) |
| Writers/readers formal | ✅ | seções 3 e 3b |
| **Cobertura total** | **~95%** | pendência F0 (runtime) declarada |

---

## 9. Pendências para Manus / P.O.

1. ~~**🔴 P.O. — decisão Nível 1:** Opção A vs B para `mapping_review_status` via CSV.~~ ✅ **RESOLVIDA 2026-06-23: Opção A** (parser rejeita `approved_legal`).
2. **Manus — Gate 0 (F0):** `SHOW FULL COLUMNS FROM solaris_questions` (confirmar enum `mapping_review_status` + colunas) + confirmar reader ativo C1 por runtime. Sem-empirismo.
3. **Escopo follow-up (NÃO implementar em B.2):** formulários UI create/edit não recebem os 3 campos — gap consistente, candidato a issue separada.
4. **Issue #158 [OPEN]:** B.2 endereça parte do escopo ("template + doc para jurídico"); avaliar `Refs #158` no PR (não `Closes` — #158 é mais amplo).

---

### Vinculadas
REGRA-ORQ-29 (determinismo normativo) · REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-44 (DoD negativo) · REGRA-ORQ-22 (crítica Nível 1) · Lições #61 #65 #83 #103 #138 #139 · CSV-TEMPLATE-FIX-01 B.1 (PR #1546) · Issues #158 #940 #945
