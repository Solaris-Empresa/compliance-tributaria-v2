# INVESTIGAÇÃO CR-02 — cnaeGroups (Resposta ao DESPACHO-MANUS-1618)

**De:** Manus (Implementador)  
**Para:** Orquestrador  
**Data:** 2026-06-29  
**Protocolo:** Debug v2 — READ-ONLY total  
**Referência:** DESPACHO-MANUS-1618-INVESTIGACAO-CNAEGROUPS.md  

---

## Gate 0

### q1 — Caller runtime (arquivo + linha + trecho)

**Arquivo:** `server/rag-retriever.ts`

O motor usa **exclusivamente a coluna `cnaeGroups`** (camelCase) da tabela `ragDocuments`. Há dois callers distintos:

**Caller A — Pass 1 (keyword + CNAE LIKE):** `server/rag-retriever.ts:134–135`
```typescript
// linha 124: extrai grupos de 2 dígitos dos CNAEs do projeto
const cnaeGroups = extractCnaeGroups(cnaes);
// linha 134-135: LIKE sem boundary (usado no Pass 1 — keyword fetch)
const cnaeConditions = cnaeGroups.map(g =>
  like(ragDocuments.cnaeGroups, `%${g}%`)
);
```

**Caller B — Pass 2 (setorial CNAE-aware):** `server/rag-retriever.ts:364–379` — função `fetchSetorialCandidates`
```typescript
// Filtro cnaeGroups boundary-aware (linhas 364-379)
const cnaeBoundaryCond = or(
  ...cnaeGroups.flatMap((g) => [
    like(ragDocuments.cnaeGroups, `${g},%`),    // begin
    like(ragDocuments.cnaeGroups, `%,${g},%`),  // middle
    like(ragDocuments.cnaeGroups, `%,${g}`),    // end
    eq(ragDocuments.cnaeGroups, g),             // único
  ]),
  // RAG-1-FIX (#1375): pool universal = cnaeGroups IS NULL OR cnaeGroups = ''
  sql`(cnaeGroups IS NULL OR cnaeGroups = '')`,
);
```

**Função de pertencimento ao pool universal:** `server/rag-retriever.ts:314`
```typescript
export function belongsToUniversalPool(cnaeGroups: string | null | undefined): boolean {
  return cnaeGroups == null || cnaeGroups.trim() === "";
}
```

**Conclusão Q1:** O campo lido em runtime é `ragDocuments.cnaeGroups` (camelCase), que mapeia para a coluna `cnaeGroups` (varchar 500) na tabela `ragDocuments`. Não há snake_case em uso para `ragDocuments`. A coluna `cnae_groups` (snake_case, json) existe apenas em `solarisQuestions` (linha 1692 do schema), **não** em `ragDocuments`.

---

### q2 — Valor real no banco (output SELECT completo)

**Query executada:**
```sql
SELECT artigo, lei, cnaeGroups, LENGTH(cnaeGroups) AS len
FROM ragDocuments
WHERE lei IN ('lc214','decreto12955','resolucao_cgibs_6')
  AND (
    CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 252 AND 270
    OR CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 360 AND 372
  )
ORDER BY lei, artigo;
```

**Output literal — LC 214 (artigos 252–270):**

| artigo | lei | cnaeGroups | len |
|--------|-----|-----------|-----|
| Anexo XIV, item 252 | lc214 | `` | 0 |
| Anexo XIV, item 253 | lc214 | `` | 0 |
| Anexo XIV, item 254 | lc214 | `` | 0 |
| Anexo XIV, item 255 | lc214 | `` | 0 |
| Anexo XIV, item 256 | lc214 | `` | 0 |
| Anexo XIV, item 257 | lc214 | `` | 0 |
| Anexo XIV, item 258 | lc214 | `` | 0 |
| Anexo XIV, item 259 | lc214 | `` | 0 |
| Anexo XIV, item 260 | lc214 | `` | 0 |
| Anexo XIV, item 261 | lc214 | `` | 0 |
| Anexo XIV, item 262 | lc214 | `` | 0 |
| Anexo XIV, item 263 | lc214 | `` | 0 |
| Anexo XIV, item 264 | lc214 | `` | 0 |
| Anexo XIV, item 265 | lc214 | `` | 0 |
| Anexo XIV, item 266 | lc214 | `` | 0 |
| Anexo XIV, item 267 | lc214 | `` | 0 |
| Anexo XIV, item 268 | lc214 | `` | 0 |
| Anexo XIV, item 269 | lc214 | `` | 0 |
| Anexo XIV, item 270 | lc214 | `` | 0 |
| Art. 252 | lc214 | `64,65,66` | 8 |
| Art. 252 (parte 2) | lc214 | `41,42,43,68` | 11 |
| Art. 253 | lc214 | `41,42,43,68` | 11 |
| Art. 254 | lc214 | `41,42,43,68` | 11 |
| Art. 255 | lc214 | `41,42,43,68` | 11 |
| Art. 255 (parte 2) | lc214 | `64,65,66` | 8 |
| Art. 256 | lc214 | `41,42,43,68` | 11 |
| Art. 257 | lc214 | `41,42,43,68` | 11 |
| Art. 257 (parte 2) | lc214 | `41,42,43,68` | 11 |
| Art. 258 | lc214 | `41,42,43,68` | 11 |
| Art. 258 (parte 2) | lc214 | `64,65,66` | 8 |
| Art. 258 (parte 3) | lc214 | `64,65,66` | 8 |
| Art. 259 | lc214 | `41,42,43,68` | 11 |
| Art. 260 | lc214 | `41,42,43,68` | 11 |
| Art. 261 | lc214 | `41,42,43,68` | 11 |
| Art. 262 | lc214 | `64,65,66` | 8 |
| Art. 263 | lc214 | `41,42,43,68` | 11 |
| Art. 264 | lc214 | `01,02,03,05,...,96` (multi-setorial) | 254 |
| Art. 265 | lc214 | `41,42,43,68` | 11 |
| Art. 266 | lc214 | `10,11,...,33` (manufatura) | 71 |
| Art. 267 | lc214 | `01,02,03,05,...,96` (multi-setorial) | 254 |
| Art. 268 | lc214 | `01,02,03,05,...,96` (multi-setorial) | 254 |
| Art. 269 | lc214 | `41,42,43,68` | 11 |
| Art. 270 | lc214 | `41,42,43,68` | 11 |

**Output literal — Decreto 12.955 (artigos 360–372):**

| artigo | lei | cnaeGroups | len |
|--------|-----|-----------|-----|
| Art. 360 | decreto12955 | `` | 0 |
| Art. 360 (parte 2) | decreto12955 | `` | 0 |
| Art. 360 (parte 3) | decreto12955 | `` | 0 |
| Art. 361 | decreto12955 | `` | 0 |
| Art. 362 | decreto12955 | `` | 0 |
| Art. 363 | decreto12955 | `` | 0 |
| Art. 364 | decreto12955 | `` | 0 |
| Art. 364 (parte 2) | decreto12955 | `` | 0 |
| Art. 364 (parte 3) | decreto12955 | `` | 0 |
| Art. 365 | decreto12955 | `` | 0 |
| Art. 366 | decreto12955 | `` | 0 |
| Art. 366 (parte 2) | decreto12955 | `` | 0 |
| Art. 367 | decreto12955 | `` | 0 |
| Art. 368 | decreto12955 | `` | 0 |
| Art. 369 | decreto12955 | `` | 0 |
| Art. 370 | decreto12955 | `` | 0 |
| Art. 371 | decreto12955 | `` | 0 |
| Art. 372 | decreto12955 | `` | 0 |

**Output literal — Resolução CGIBS 6 (artigos 252–270 e 360–372):**

| artigo | lei | cnaeGroups | len |
|--------|-----|-----------|-----|
| Art. 252 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 253 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 254 | resolucao_cgibs_6 | `` | 0 |
| Art. 255 | resolucao_cgibs_6 | `` | 0 |
| Art. 256 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 256 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 257 | resolucao_cgibs_6 | `` | 0 |
| Art. 258 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 258 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 259 | resolucao_cgibs_6 | `` | 0 |
| Art. 260 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 261 | resolucao_cgibs_6 | `` | 0 |
| Art. 262 | resolucao_cgibs_6 | `` | 0 |
| Art. 263 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 264 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 265 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 265 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 266 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 267 | resolucao_cgibs_6 | `` | 0 |
| Art. 268 | resolucao_cgibs_6 | `64,65,66` | 8 |
| Art. 269 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 269 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 270 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 270 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 270 (parte 3) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 360 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 360 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 360 (parte 3) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 361 | resolucao_cgibs_6 | `` | 0 |
| Art. 362 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 363 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 364 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 364 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 364 (parte 3) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 365 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 366 | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 366 (parte 2) | resolucao_cgibs_6 | `01,02,03,10,11,12,23,46,47` | 26 |
| Art. 367 | resolucao_cgibs_6 | `` | 0 |
| Art. 368 | resolucao_cgibs_6 | `` | 0 |
| Art. 369 | resolucao_cgibs_6 | `` | 0 |
| Art. 370 | resolucao_cgibs_6 | `` | 0 |
| Art. 371 | resolucao_cgibs_6 | `` | 0 |
| Art. 372 | resolucao_cgibs_6 | `` | 0 |

---

### q3 — Coluna correta (DESCRIBE ragDocuments — colunas cnae)

**Query executada:** `DESCRIBE ragDocuments` (banco real, via mysql2)

**Output literal — colunas cnae:**
```
{"Field":"cnaeGroups","Type":"varchar(500)","Null":"NO","Key":"","Default":"","Extra":""}
```

**Todas as colunas de ragDocuments:**
```
id           | int
lei          | enum('lc214','lc227','lc224','lc123','ec132','lc116','lc87','conv_icms','cg_ibs','rfb_cbs','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3','decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7','resolucao_cgibs_4','resolucao_cgibs_5','nt_2025_002','nt_008_2026','resolucao_cgsn_140','moc_cte_v4','moc_mdfe_v3','tabela_ncm_completa','nbs_completa')
artigo       | varchar(300)
titulo       | varchar(500)
conteudo     | text
topicos      | text
cnaeGroups   | varchar(500)   ← ÚNICA coluna cnae em ragDocuments
chunkIndex   | int
createdAt    | timestamp
anchor_id    | varchar(255)
autor        | text
revisado_por | text
data_revisao | varchar(30)
artigo_pai   | varchar(300)
```

**Conclusão Q3:** Não há divergência camelCase × snake_case em `ragDocuments`. A tabela possui **uma única coluna cnae**: `cnaeGroups` (varchar 500, NOT NULL, DEFAULT ''). A coluna `cnae_groups` (snake_case, json) existe apenas em `solarisQuestions` (schema linha 1692), que é uma tabela diferente. **H2 é descartada** para `ragDocuments`.

---

### q4 — Teste de persistência real (SELECT pós-operação)

**GAP — sem teste:** Não existe nenhum teste que:
1. Exercite o roteamento setorial de construção civil (CNAE `41xx`) **contra banco real** via SELECT pós-operação em `ragDocuments.cnaeGroups`
2. Confirme que `fetchSetorialCandidates` retorna os artigos 252–270 da LC 214 para CNAE `4120-4/00`
3. Confirme que `fetchSetorialCandidates` retorna os artigos 360–372 do Decreto 12.955 para CNAE `4120-4/00`

O teste mais próximo é `server/integration/coverage-11-profiles.test.ts` (P1_CONSTRUTORA), que verifica categorias de risco via `riskCategories` + `shouldInjectCategory`, mas **não** verifica o conteúdo de `ragDocuments.cnaeGroups` via SELECT pós-operação. O teste `server/rag-retriever-cnae-filter.test.ts` usa mocks em memória (não banco real).

**Registro de gap:** `GAP-Q4 — sem teste de persistência setorial para construção civil (CNAE 41xx) contra ragDocuments.cnaeGroups em banco real`.

---

## Hipótese confirmada

**H1 — Snapshot divergente: CONFIRMADA**

As evidências literais do DOC2 (PR #1617) e a conclusão da Seção 4 do mesmo documento foram extraídas de **fontes diferentes**:

- **DOC2 §1 (evidências literais):** extraídas de `chunks-lc214.json` e `chunks-decreto.json` — arquivos temporários gerados por uma query anterior que incluía artigos de **todas as leis** no range numérico 252–270, sem filtrar pelo campo `artigo` exato. O REGEXP_SUBSTR retornou tanto `Art. 252` quanto `Anexo XIV, item 252`, misturando dois conjuntos distintos.

- **DOC2 §4 (gap "vazio para todos"):** derivado de uma query que inspecionou os chunks do Decreto 12.955 (Arts. 360–372), onde `cnaeGroups = ''` para **todos os 18 chunks**. Essa afirmação foi incorretamente generalizada para todos os artigos dos 3 diplomas.

**Evidência que confirma H1:**
- LC 214 `Art. 252` (parte 2): `cnaeGroups = "41,42,43,68"` ✅ — preenchido corretamente
- LC 214 `Art. 253` até `Art. 270` (exceto 255p2, 258p2, 258p3, 262): `cnaeGroups = "41,42,43,68"` ✅
- **Decreto 12.955 `Art. 360` até `Art. 372`:** `cnaeGroups = ""` para **todos os 18 chunks** ✅ — este é o gap real, mas restrito ao Decreto

**H2 (coluna trocada) — DESCARTADA:** `ragDocuments` tem apenas `cnaeGroups` (camelCase). Não há `cnae_groups` nessa tabela.

**H3 (runtime ≠ tabela inspecionada) — DESCARTADA:** O motor lê diretamente `ragDocuments.cnaeGroups` via Drizzle ORM (`like(ragDocuments.cnaeGroups, ...)`). Não há join, view ou config intermediária.

---

## Causa-raiz comprovada

A contradição no DOC2 (PR #1617) foi causada por **H1 — Snapshot divergente**: a query de evidências do §1 capturou artigos com `cnaeGroups` preenchido (LC 214 `Art. 252–270`), enquanto a conclusão do §4 foi extraída de uma query diferente que inspecionou apenas o Decreto 12.955 (Arts. 360–372), onde `cnaeGroups = ''` para todos os 18 chunks. A generalização "vazio para todos os 3 diplomas" foi incorreta.

**Estado real no banco (verdade em runtime):**

| Diploma | Artigos | cnaeGroups | Status |
|---------|---------|-----------|--------|
| LC 214 | Art. 252–270 (exceto 252, 255p2, 258p2/p3, 262, 264, 266, 267, 268) | `41,42,43,68` | ✅ Correto |
| LC 214 | Art. 252, 255p2, 258p2/p3, 262 | `64,65,66` (financeiro) | ⚠️ Setorial errado |
| LC 214 | Art. 264, 267, 268 | multi-setorial (len=254) | ⚠️ Disposição geral — não tocar |
| LC 214 | Art. 266 | `10,11,...,33` (manufatura) | ⚠️ Setorial errado |
| LC 214 | Anexo XIV, itens 252–270 | `` | ⚠️ Vazio — pool universal (aceitável para Anexo) |
| **Decreto 12.955** | **Art. 360–372 (todos os 18 chunks)** | **`` (vazio)** | **❌ Gap real — entra no pool universal** |
| Resolução CGIBS 6 | Art. 252–270, 360–372 (maioria) | `01,02,03,10,11,12,23,46,47` | ⚠️ Setorial errado (agro/alimentos, não construção civil) |
| Resolução CGIBS 6 | Art. 254, 255, 257, 259, 261, 262, 267, 361, 367–372 | `` | ⚠️ Vazio — pool universal |

---

## Recomendação de fix

### Fix necessário: UPDATE seletivo no Decreto 12.955 (Art. 360–372)

O único gap real confirmado é `decreto12955` Arts. 360–372: todos os 18 chunks têm `cnaeGroups = ''`, o que os coloca no **pool universal** (`belongsToUniversalPool = true`). Isso significa que eles são recuperados para **qualquer CNAE**, diluindo a relevância setorial para construção civil.

**Cláusula WHERE proposta (sem sobrescrever valores existentes):**
```sql
UPDATE ragDocuments
SET cnaeGroups = '41,42,43,68'
WHERE lei = 'decreto12955'
  AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 360 AND 372
  AND (cnaeGroups IS NULL OR cnaeGroups = '');
-- Afeta: 18 chunks (Art. 360 a Art. 372 + partes)
-- Não toca: qualquer chunk com cnaeGroups já preenchido
```

### Artigos que NÃO devem ser tocados (decisão Dr. José)

Os artigos abaixo têm semântica multi-setorial e sua classificação requer decisão do Dr. José antes de qualquer UPDATE:

| Artigo | Lei | cnaeGroups atual | Motivo |
|--------|-----|-----------------|--------|
| Art. 252 | lc214 | `64,65,66` | Parte financeira da LC 214 — pode ser intencional |
| Art. 255 (parte 2) | lc214 | `64,65,66` | Idem |
| Art. 258 (parte 2/3) | lc214 | `64,65,66` | Idem |
| Art. 262 | lc214 | `64,65,66` | Disposição geral com aplicação financeira |
| Art. 264 | lc214 | multi-setorial (len=254) | Disposição geral — intencional |
| Art. 266 | lc214 | `10,11,...,33` (manufatura) | Pode ser erro de classificação — Dr. José decide |
| Art. 267 | lc214 | multi-setorial (len=254) | Disposição geral — não tocar |
| Art. 268 | lc214 | multi-setorial (len=254) | Disposição geral — não tocar |
| Resolução CGIBS 6 | todos | `01,02,03,10,11,12,23,46,47` | Agro/alimentos — pode ser erro de ingestão |

### Fix secundário (opcional — decisão P.O.)

A Resolução CGIBS 6 (Arts. 252–270 e 360–372) tem `cnaeGroups = "01,02,03,10,11,12,23,46,47"` (agro/alimentos), o que é provavelmente um erro de ingestão. Se confirmado pelo Dr. José, o fix seria:
```sql
UPDATE ragDocuments
SET cnaeGroups = '41,42,43,68'
WHERE lei = 'resolucao_cgibs_6'
  AND CAST(REGEXP_SUBSTR(artigo, '[0-9]+') AS UNSIGNED) BETWEEN 252 AND 372
  AND cnaeGroups = '01,02,03,10,11,12,23,46,47';
-- Afeta: ~30 chunks
```

---

## Resultado

**CAUSA-RAIZ COMPROVADA**

A contradição no DOC2 (PR #1617) foi causada por H1 (snapshot divergente): a conclusão "cnaeGroups vazio para todos" foi incorretamente generalizada a partir de uma query que inspecionou apenas o Decreto 12.955. O gap real é **restrito ao Decreto 12.955 (18 chunks, Arts. 360–372, cnaeGroups = '')**.

A LC 214 (Arts. 252–270) tem `cnaeGroups = "41,42,43,68"` corretamente preenchido para os artigos principais de construção civil. O dataset não é o problema para LC 214. O problema real é o Decreto 12.955.

**Decisão de UPDATE:** aguarda aprovação do P.O. (Uires) para o Decreto 12.955 e do Dr. José para os artigos multi-setoriais e da Resolução CGIBS 6.

---

*Investigação executada por Manus (Implementador IA SOLARIS) em 2026-06-29. READ-ONLY total — nenhum UPDATE/INSERT/DELETE executado. Base: código-fonte `main` HEAD + banco de produção (READ-ONLY).*
